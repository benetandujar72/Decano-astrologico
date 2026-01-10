"""
Endpoints para gestión de plantillas de informes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime
from typing import List, Optional
import os
from dotenv import load_dotenv

from app.models.report_templates import (
    TemplateCreate,
    TemplateUpdate,
    TemplateResponse,
    TemplatesListResponse,
    BrandingConfig,
    ContentConfig,
    AdvancedConfig
)
from app.api.endpoints.auth import get_current_user, MONGODB_URL, mongodb_options

load_dotenv()

router = APIRouter()

# MongoDB client
client = AsyncIOMotorClient(MONGODB_URL, **mongodb_options)
db = client[os.getenv("MONGODB_DB_NAME", "astrology_db")]
templates_collection = db["templates"]
report_types_collection = db["report_types"]
users_collection = db["users"]

# Plan limits
PLAN_LIMITS = {
    "free": {
        "max_templates": 0,
        "can_create_templates": False,
        "can_use_custom_branding": False,
        "can_use_advanced": False
    },
    "premium": {
        "max_templates": 5,
        "can_create_templates": True,
        "can_use_custom_branding": True,
        "can_use_advanced": False
    },
    "enterprise": {
        "max_templates": -1,  # unlimited
        "can_create_templates": True,
        "can_use_custom_branding": True,
        "can_use_advanced": True
    }
}


async def get_user_plan(user_id: str) -> str:
    """Obtener el plan del usuario"""
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        return "free"
    subscription = user.get("subscription", {})
    return subscription.get("plan", "free")


async def check_template_limit(user_id: str, user_plan: str):
    """Verificar si el usuario puede crear más plantillas"""
    limits = PLAN_LIMITS.get(user_plan, PLAN_LIMITS["free"])

    if not limits["can_create_templates"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your plan does not allow creating custom templates. Upgrade to Premium."
        )

    max_templates = limits["max_templates"]
    if max_templates == -1:  # unlimited
        return

    count = await templates_collection.count_documents({
        "owner_id": ObjectId(user_id),
        "is_deleted": False
    })

    if count >= max_templates:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Template limit reached ({max_templates}). Upgrade your plan to create more."
        )


def template_doc_to_response(doc: dict) -> TemplateResponse:
    """Convertir documento MongoDB a TemplateResponse"""
    return TemplateResponse(
        id=str(doc["_id"]),
        name=doc["name"],
        report_type_id=str(doc["report_type_id"]),
        report_type_name=doc.get("report_type_name"),
        owner_id=str(doc["owner_id"]),
        is_public=doc.get("is_public", False),
        is_default=doc.get("is_default", False),
        branding=BrandingConfig(**doc.get("branding", {})),
        content=ContentConfig(**doc.get("content", {})),
        advanced=AdvancedConfig(**doc.get("advanced", {})) if doc.get("advanced") else None,
        usage_count=doc.get("usage_count", 0),
        last_used_at=doc.get("last_used_at"),
        created_at=doc.get("created_at", datetime.utcnow()),
        updated_at=doc.get("updated_at", datetime.utcnow()),
        is_deleted=doc.get("is_deleted", False),
        preview_image_url=doc.get("preview_image_url")
    )


@router.get("", response_model=TemplatesListResponse)
async def list_templates(
    report_type_id: Optional[str] = None,
    include_public: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """
    Listar plantillas del usuario o públicas

    - **report_type_id**: Filtrar por tipo de informe (opcional)
    - **include_public**: Incluir plantillas públicas (default: true)
    """
    user_id = str(current_user["_id"])
    user_plan = await get_user_plan(user_id)
    limits = PLAN_LIMITS.get(user_plan, PLAN_LIMITS["free"])

    # Construir filtro
    filter_query = {
        "is_deleted": False,
        "$or": [
            {"owner_id": ObjectId(user_id)}
        ]
    }

    if include_public:
        filter_query["$or"].append({"is_public": True})

    if report_type_id:
        if not ObjectId.is_valid(report_type_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid report type ID"
            )
        filter_query["report_type_id"] = ObjectId(report_type_id)

    # Buscar plantillas
    cursor = templates_collection.find(filter_query).sort("created_at", -1)
    docs = await cursor.to_list(length=100)

    # Enriquecer con nombre del tipo de informe
    templates = []
    for doc in docs:
        report_type = await report_types_collection.find_one(
            {"_id": doc["report_type_id"]}
        )
        doc["report_type_name"] = report_type.get("name") if report_type else None
        templates.append(template_doc_to_response(doc))

    return TemplatesListResponse(
        templates=templates,
        total=len(templates),
        user_limit=limits["max_templates"]
    )


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener una plantilla específica"""
    if not ObjectId.is_valid(template_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid template ID"
        )

    doc = await templates_collection.find_one({"_id": ObjectId(template_id)})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    user_id = str(current_user["_id"])

    # Verificar acceso
    if not doc.get("is_public", False) and str(doc["owner_id"]) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this template"
        )

    # Enriquecer con nombre del tipo de informe
    report_type = await report_types_collection.find_one(
        {"_id": doc["report_type_id"]}
    )
    doc["report_type_name"] = report_type.get("name") if report_type else None

    return template_doc_to_response(doc)


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_template(
    template: TemplateCreate,
    current_user: dict = Depends(get_current_user)
):
    """Crear una nueva plantilla"""
    user_id = str(current_user["_id"])
    user_plan = await get_user_plan(user_id)
    limits = PLAN_LIMITS.get(user_plan, PLAN_LIMITS["free"])

    # Verificar límites
    await check_template_limit(user_id, user_plan)

    # Verificar permisos de branding personalizado
    if not limits["can_use_custom_branding"]:
        # Resetear a valores por defecto
        template.branding = BrandingConfig()

    # Verificar permisos avanzados
    if not limits["can_use_advanced"]:
        template.advanced = AdvancedConfig()

    # Verificar que el tipo de informe existe
    if not ObjectId.is_valid(template.report_type_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid report type ID"
        )

    report_type = await report_types_collection.find_one(
        {"_id": ObjectId(template.report_type_id)}
    )
    if not report_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report type not found"
        )

    # Crear plantilla
    template_data = template.model_dump()
    template_data.update({
        "report_type_id": ObjectId(template.report_type_id),
        "owner_id": ObjectId(user_id),
        "is_default": False,
        "usage_count": 0,
        "last_used_at": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "is_deleted": False,
        "preview_image_url": None
    })

    result = await templates_collection.insert_one(template_data)

    return {
        "template_id": str(result.inserted_id),
        "message": "Template created successfully"
    }


@router.put("/{template_id}", response_model=dict)
async def update_template(
    template_id: str,
    template: TemplateUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Actualizar una plantilla"""
    if not ObjectId.is_valid(template_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid template ID"
        )

    user_id = str(current_user["_id"])
    user_plan = await get_user_plan(user_id)
    limits = PLAN_LIMITS.get(user_plan, PLAN_LIMITS["free"])

    # Verificar que existe
    existing = await templates_collection.find_one({"_id": ObjectId(template_id)})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    # Verificar ownership
    if str(existing["owner_id"]) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't own this template"
        )

    # Preparar actualización
    update_data = {k: v for k, v in template.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )

    # Verificar permisos de branding
    if "branding" in update_data and not limits["can_use_custom_branding"]:
        del update_data["branding"]

    # Verificar permisos avanzados
    if "advanced" in update_data and not limits["can_use_advanced"]:
        del update_data["advanced"]

    update_data["updated_at"] = datetime.utcnow()

    # Actualizar
    await templates_collection.update_one(
        {"_id": ObjectId(template_id)},
        {"$set": update_data}
    )

    return {
        "message": "Template updated successfully",
        "template_id": template_id
    }


@router.post("/{template_id}/clone", response_model=dict, status_code=status.HTTP_201_CREATED)
async def clone_template(
    template_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Clonar una plantilla"""
    if not ObjectId.is_valid(template_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid template ID"
        )

    user_id = str(current_user["_id"])
    user_plan = await get_user_plan(user_id)

    # Verificar límites
    await check_template_limit(user_id, user_plan)

    # Obtener plantilla original
    original = await templates_collection.find_one({"_id": ObjectId(template_id)})
    if not original:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    # Verificar acceso
    if not original.get("is_public", False) and str(original["owner_id"]) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this template"
        )

    # Clonar
    cloned_data = dict(original)
    del cloned_data["_id"]
    cloned_data.update({
        "name": f"{original['name']} (Copia)",
        "owner_id": ObjectId(user_id),
        "is_public": False,
        "is_default": False,
        "usage_count": 0,
        "last_used_at": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "preview_image_url": None
    })

    result = await templates_collection.insert_one(cloned_data)

    return {
        "template_id": str(result.inserted_id),
        "message": "Template cloned successfully"
    }


@router.delete("/{template_id}", response_model=dict)
async def delete_template(
    template_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Eliminar una plantilla (soft delete)"""
    if not ObjectId.is_valid(template_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid template ID"
        )

    user_id = str(current_user["_id"])

    # Verificar que existe
    existing = await templates_collection.find_one({"_id": ObjectId(template_id)})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    # Verificar ownership
    if str(existing["owner_id"]) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't own this template"
        )

    # No permitir eliminar plantillas por defecto
    if existing.get("is_default", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete default templates"
        )

    # Soft delete
    await templates_collection.update_one(
        {"_id": ObjectId(template_id)},
        {
            "$set": {
                "is_deleted": True,
                "deleted_at": datetime.utcnow()
            }
        }
    )

    return {
        "message": "Template deleted successfully"
    }
