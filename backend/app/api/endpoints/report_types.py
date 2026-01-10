"""
Endpoints para gestión de tipos de informe
"""
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime
from typing import List, Optional
import os
from dotenv import load_dotenv

from app.models.report_types import (
    ReportTypeCreate,
    ReportTypeUpdate,
    ReportTypeResponse,
    ReportTypesListResponse,
    ModuleDefinition
)
from app.models.report_prompts import PromptCreate, PromptResponse
from app.api.endpoints.auth import get_current_user, MONGODB_URL, mongodb_options

load_dotenv()

router = APIRouter()

# MongoDB client
client = AsyncIOMotorClient(MONGODB_URL, **mongodb_options)
db = client[os.getenv("MONGODB_DB_NAME", "astrology_db")]
report_types_collection = db["report_types"]
prompts_collection = db["prompts"]
users_collection = db["users"]


def check_admin_permission(current_user: dict):
    """Verificar si el usuario es admin"""
    if current_user.get("role") not in ["admin", "superadmin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can perform this action"
        )


def check_plan_access(user_plan: str, required_plan: str) -> bool:
    """Verificar si el plan del usuario cumple con el requerido"""
    plan_hierarchy = {
        "free": 1,
        "premium": 2,
        "enterprise": 3
    }
    return plan_hierarchy.get(user_plan, 0) >= plan_hierarchy.get(required_plan, 0)


async def get_user_plan(user_id: str) -> str:
    """Obtener el plan del usuario"""
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        return "free"
    subscription = user.get("subscription", {})
    return subscription.get("plan", "free")


def report_type_doc_to_response(
    doc: dict,
    can_access: bool = False,
    has_default_template: bool = False
) -> ReportTypeResponse:
    """Convertir documento MongoDB a ReportTypeResponse"""
    return ReportTypeResponse(
        id=str(doc["_id"]),
        code=doc["code"],
        name=doc["name"],
        description=doc.get("description", ""),
        icon=doc.get("icon", "📄"),
        category=doc["category"],
        folder_path=doc.get("folder_path", ""),
        min_plan_required=doc.get("min_plan_required", "free"),
        is_active=doc.get("is_active", True),
        is_beta=doc.get("is_beta", False),
        available_modules=[
            ModuleDefinition(**m) for m in doc.get("available_modules", [])
        ],
        default_prompt_id=str(doc["default_prompt_id"]) if doc.get("default_prompt_id") else None,
        created_by=str(doc["created_by"]) if doc.get("created_by") else None,
        created_at=doc.get("created_at", datetime.utcnow()),
        updated_at=doc.get("updated_at", datetime.utcnow()),
        version=doc.get("version", 1),
        can_access=can_access,
        has_default_template=has_default_template
    )


@router.get("", response_model=ReportTypesListResponse)
async def list_report_types(
    category: Optional[str] = None,
    include_beta: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """
    Listar tipos de informe disponibles

    - **category**: Filtrar por categoría (opcional)
    - **include_beta**: Incluir tipos beta (default: false)
    """
    user_id = str(current_user["_id"])
    user_plan = await get_user_plan(user_id)
    is_admin = current_user.get("role") in ["admin", "superadmin"]

    # Construir filtro
    filter_query = {"is_active": True}
    if category:
        filter_query["category"] = category
    if not include_beta and not is_admin:
        filter_query["is_beta"] = False

    # Buscar tipos de informe
    cursor = report_types_collection.find(filter_query).sort("created_at", -1)
    docs = await cursor.to_list(length=100)

    # Convertir a respuestas
    report_types = []
    for doc in docs:
        required_plan = doc.get("min_plan_required", "free")
        can_access = is_admin or check_plan_access(user_plan, required_plan)

        # TODO: Verificar si tiene plantilla por defecto
        has_default_template = False

        report_types.append(
            report_type_doc_to_response(doc, can_access, has_default_template)
        )

    return ReportTypesListResponse(
        report_types=report_types,
        total=len(report_types)
    )


@router.get("/{report_type_id}", response_model=ReportTypeResponse)
async def get_report_type(
    report_type_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener un tipo de informe específico"""
    if not ObjectId.is_valid(report_type_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid report type ID"
        )

    doc = await report_types_collection.find_one({"_id": ObjectId(report_type_id)})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report type not found"
        )

    user_plan = await get_user_plan(str(current_user["_id"]))
    is_admin = current_user.get("role") in ["admin", "superadmin"]

    required_plan = doc.get("min_plan_required", "free")
    can_access = is_admin or check_plan_access(user_plan, required_plan)

    return report_type_doc_to_response(doc, can_access, False)


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_report_type(
    report_type: ReportTypeCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Crear un nuevo tipo de informe (solo admin)

    También crea un prompt por defecto asociado
    """
    check_admin_permission(current_user)

    # Verificar que no exista el código
    existing = await report_types_collection.find_one({"code": report_type.code})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Report type with code '{report_type.code}' already exists"
        )

    # Crear prompt por defecto
    default_prompt_data = {
        "report_type_id": None,  # Se actualiza después
        "version": 1,
        "system_instruction": f"Eres un astrólogo profesional especializado en {report_type.name}.",
        "user_prompt_template": "Genera un informe de tipo {report_type} para {nombre} basado en su carta natal: {carta_data}",
        "variables": [
            {"name": "nombre", "type": "string", "required": True},
            {"name": "carta_data", "type": "object", "required": True},
            {"name": "report_type", "type": "string", "required": False}
        ],
        "llm_provider": "gemini",
        "model": "gemini-3-pro-preview",
        "temperature": 0.7,
        "max_tokens": 8000,
        "safety_settings": {
            "harm_category_harassment": "BLOCK_MEDIUM_AND_ABOVE",
            "harm_category_hate_speech": "BLOCK_MEDIUM_AND_ABOVE",
            "harm_category_sexually_explicit": "BLOCK_MEDIUM_AND_ABOVE",
            "harm_category_dangerous_content": "BLOCK_MEDIUM_AND_ABOVE"
        },
        "is_default": True,
        "is_active": True,
        "customized_by": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    prompt_result = await prompts_collection.insert_one(default_prompt_data)
    prompt_id = prompt_result.inserted_id

    # Actualizar prompt con report_type_id
    await prompts_collection.update_one(
        {"_id": prompt_id},
        {"$set": {"report_type_id": None}}  # Se actualiza después
    )

    # Crear tipo de informe
    report_type_data = report_type.model_dump()
    report_type_data.update({
        "default_prompt_id": prompt_id,
        "created_by": ObjectId(current_user["_id"]),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "version": 1
    })

    result = await report_types_collection.insert_one(report_type_data)

    # Actualizar prompt con report_type_id correcto
    await prompts_collection.update_one(
        {"_id": prompt_id},
        {"$set": {"report_type_id": result.inserted_id}}
    )

    return {
        "report_type_id": str(result.inserted_id),
        "prompt_id": str(prompt_id),
        "message": "Report type created successfully"
    }


@router.put("/{report_type_id}", response_model=dict)
async def update_report_type(
    report_type_id: str,
    report_type: ReportTypeUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Actualizar un tipo de informe (solo admin)"""
    check_admin_permission(current_user)

    if not ObjectId.is_valid(report_type_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid report type ID"
        )

    # Verificar que existe
    existing = await report_types_collection.find_one({"_id": ObjectId(report_type_id)})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report type not found"
        )

    # Preparar actualización (solo campos no None)
    update_data = {k: v for k, v in report_type.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )

    update_data["updated_at"] = datetime.utcnow()
    update_data["version"] = existing.get("version", 1) + 1

    # Actualizar
    await report_types_collection.update_one(
        {"_id": ObjectId(report_type_id)},
        {"$set": update_data}
    )

    return {
        "message": "Report type updated successfully",
        "version": update_data["version"]
    }


@router.delete("/{report_type_id}", response_model=dict)
async def delete_report_type(
    report_type_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Eliminar (archivar) un tipo de informe (solo admin)

    No se elimina físicamente, solo se marca como inactivo
    """
    check_admin_permission(current_user)

    if not ObjectId.is_valid(report_type_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid report type ID"
        )

    # Verificar que existe
    existing = await report_types_collection.find_one({"_id": ObjectId(report_type_id)})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report type not found"
        )

    # TODO: Verificar que no hay sesiones activas

    # Marcar como inactivo
    await report_types_collection.update_one(
        {"_id": ObjectId(report_type_id)},
        {
            "$set": {
                "is_active": False,
                "updated_at": datetime.utcnow()
            }
        }
    )

    return {
        "message": "Report type archived successfully"
    }
