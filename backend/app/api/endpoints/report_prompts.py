"""
Endpoints para gestión de prompts
"""
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime
from typing import Optional
import os
from dotenv import load_dotenv

from app.models.report_prompts import (
    PromptCreate,
    PromptUpdate,
    PromptResponse,
    PromptResolveRequest,
    PromptResolveResponse,
    PromptVariable,
    SafetySettings
)
from app.services.prompt_orchestrator import prompt_orchestrator
from app.api.endpoints.auth import get_current_user, MONGODB_URL, mongodb_options

load_dotenv()

router = APIRouter()

# MongoDB client
client = AsyncIOMotorClient(MONGODB_URL, **mongodb_options)
db = client[os.getenv("MONGODB_DB_NAME", "astrology_db")]
prompts_collection = db["prompts"]
report_types_collection = db["report_types"]
users_collection = db["users"]


def check_prompt_edit_permission(current_user: dict, is_default: bool = False):
    """Verificar si el usuario puede editar prompts"""
    role = current_user.get("role", "user")

    # Admins siempre pueden editar
    if role in ["admin", "superadmin"]:
        return True

    # Usuarios premium pueden editar sus propios prompts (no defaults)
    if not is_default:
        subscription = current_user.get("subscription", {})
        plan = subscription.get("plan", "free")
        if plan in ["premium", "enterprise"]:
            return True

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You don't have permission to edit prompts. Requires Premium plan or Admin role."
    )


def prompt_doc_to_response(doc: dict, user_id: str, user_role: str) -> PromptResponse:
    """Convertir documento MongoDB a PromptResponse"""
    is_admin = user_role in ["admin", "superadmin"]
    customized_by_user = doc.get("customized_by") and str(doc["customized_by"]) == user_id

    can_edit = is_admin or customized_by_user

    return PromptResponse(
        id=str(doc["_id"]),
        report_type_id=str(doc["report_type_id"]) if doc.get("report_type_id") else "",
        version=doc.get("version", 1),
        system_instruction=doc.get("system_instruction", ""),
        user_prompt_template=doc.get("user_prompt_template", ""),
        variables=[PromptVariable(**v) for v in doc.get("variables", [])],
        llm_provider=doc.get("llm_provider", "gemini"),
        model=doc.get("model", "gemini-3-pro-preview"),
        temperature=doc.get("temperature", 0.7),
        max_tokens=doc.get("max_tokens", 8000),
        safety_settings=SafetySettings(**doc.get("safety_settings", {})),
        is_default=doc.get("is_default", False),
        is_active=doc.get("is_active", True),
        customized_by=str(doc["customized_by"]) if doc.get("customized_by") else None,
        created_at=doc.get("created_at", datetime.utcnow()),
        updated_at=doc.get("updated_at", datetime.utcnow()),
        can_edit=can_edit
    )


@router.get("", response_model=dict)
async def list_prompts(
    current_user: dict = Depends(get_current_user)
):
    """
    Listar todos los prompts disponibles (para admin de WordPress)

    Retorna prompts por defecto y personalizados del usuario
    """
    user_id = str(current_user["_id"])
    user_role = current_user.get("role", "user")

    # Obtener prompts activos: defaults + personalizados del usuario
    filter_query = {
        "is_active": True,
        "$or": [
            {"is_default": True},
            {"customized_by": ObjectId(user_id)}
        ]
    }

    cursor = prompts_collection.find(filter_query).sort("created_at", -1)
    docs = await cursor.to_list(length=100)

    prompts = []
    for doc in docs:
        # Obtener nombre del tipo de informe si existe
        report_type_name = None
        report_type_code = None
        if doc.get("report_type_id"):
            report_type = await report_types_collection.find_one(
                {"_id": doc["report_type_id"]}
            )
            if report_type:
                report_type_name = report_type.get("name", "")
                report_type_code = report_type.get("code", "")

        prompt_response = prompt_doc_to_response(doc, user_id, user_role)

        # Calcular tokens estimados (aproximación: 1 token ~ 4 caracteres)
        system_text = doc.get("system_instruction", "")
        user_text = doc.get("user_prompt_template", "")
        estimated_tokens = (len(system_text) + len(user_text)) // 4

        # Campos adicionales para compatibilidad con WordPress admin
        prompts.append({
            **prompt_response.model_dump(),
            "report_type_name": report_type_name,
            "report_type_code": report_type_code,
            # Campos esperados por WordPress
            "module_name": report_type_name or "General",
            "module_id": report_type_code or str(doc["_id"]),
            "prompt_text": system_text[:200] + "..." if len(system_text) > 200 else system_text,
            "estimated_tokens": estimated_tokens
        })

    return {
        "prompts": prompts,
        "total": len(prompts)
    }


@router.get("/{report_type_id}", response_model=PromptResponse)
async def get_prompt(
    report_type_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtener el prompt activo para un tipo de informe

    Retorna el prompt personalizado del usuario si existe,
    sino el prompt por defecto
    """
    if not ObjectId.is_valid(report_type_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid report type ID"
        )

    user_id = str(current_user["_id"])
    user_role = current_user.get("role", "user")

    # Intentar obtener prompt personalizado del usuario
    custom_prompt = await prompts_collection.find_one(
        {
            "report_type_id": ObjectId(report_type_id),
            "customized_by": ObjectId(user_id),
            "is_active": True
        },
        sort=[("version", -1)]
    )

    if custom_prompt:
        return prompt_doc_to_response(custom_prompt, user_id, user_role)

    # Obtener prompt por defecto
    default_prompt = await prompts_collection.find_one(
        {
            "report_type_id": ObjectId(report_type_id),
            "is_default": True,
            "is_active": True
        },
        sort=[("version", -1)]
    )

    if not default_prompt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No prompt found for this report type"
        )

    return prompt_doc_to_response(default_prompt, user_id, user_role)


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_prompt(
    prompt: PromptCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Crear un nuevo prompt personalizado (Premium/Admin)

    Si is_default=True, requiere permisos de admin
    """
    user_id = str(current_user["_id"])
    user_role = current_user.get("role", "user")

    # Verificar permisos
    check_prompt_edit_permission(current_user, prompt.is_default)

    # Solo admins pueden crear prompts default
    if prompt.is_default and user_role not in ["admin", "superadmin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create default prompts"
        )

    # Verificar que el tipo de informe existe
    if not ObjectId.is_valid(prompt.report_type_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid report type ID"
        )

    report_type = await report_types_collection.find_one(
        {"_id": ObjectId(prompt.report_type_id)}
    )
    if not report_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report type not found"
        )

    # Si es default, desactivar el anterior
    if prompt.is_default:
        await prompts_collection.update_many(
            {
                "report_type_id": ObjectId(prompt.report_type_id),
                "is_default": True
            },
            {"$set": {"is_active": False}}
        )

    # Crear prompt
    prompt_data = prompt.model_dump()
    prompt_data.update({
        "report_type_id": ObjectId(prompt.report_type_id),
        "version": 1,
        "is_active": True,
        "customized_by": None if prompt.is_default else ObjectId(user_id),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    })

    result = await prompts_collection.insert_one(prompt_data)

    # Actualizar default_prompt_id en report_type si es default
    if prompt.is_default:
        await report_types_collection.update_one(
            {"_id": ObjectId(prompt.report_type_id)},
            {"$set": {"default_prompt_id": result.inserted_id}}
        )

    return {
        "prompt_id": str(result.inserted_id),
        "message": "Prompt created successfully"
    }


@router.put("/{prompt_id}", response_model=dict)
async def update_prompt(
    prompt_id: str,
    prompt: PromptUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Actualizar un prompt (crea nueva versión)

    Solo puede editar:
    - Admins: cualquier prompt
    - Premium: sus propios prompts personalizados
    """
    if not ObjectId.is_valid(prompt_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid prompt ID"
        )

    user_id = str(current_user["_id"])
    user_role = current_user.get("role", "user")

    # Obtener prompt existente
    existing = await prompts_collection.find_one({"_id": ObjectId(prompt_id)})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prompt not found"
        )

    # Verificar permisos
    is_default = existing.get("is_default", False)
    check_prompt_edit_permission(current_user, is_default)

    # Verificar ownership si no es admin
    if user_role not in ["admin", "superadmin"]:
        customized_by = existing.get("customized_by")
        if not customized_by or str(customized_by) != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't own this prompt"
            )

    # Preparar actualización
    update_data = {k: v for k, v in prompt.model_dump().items() if v is not None}
    if "change_reason" in update_data:
        del update_data["change_reason"]  # No se guarda en el documento

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )

    # Guardar versión anterior en historial (opcional, implementar si se necesita)
    # await prompt_history_collection.insert_one({
    #     "prompt_id": ObjectId(prompt_id),
    #     "version": existing.get("version", 1),
    #     "content": existing,
    #     "changed_by": ObjectId(user_id),
    #     "changed_at": datetime.utcnow(),
    #     "change_reason": prompt.change_reason or "Updated"
    # })

    # Actualizar con nueva versión
    update_data["version"] = existing.get("version", 1) + 1
    update_data["updated_at"] = datetime.utcnow()

    await prompts_collection.update_one(
        {"_id": ObjectId(prompt_id)},
        {"$set": update_data}
    )

    return {
        "message": "Prompt updated successfully (new version created)",
        "version": update_data["version"]
    }


@router.post("/resolve", response_model=PromptResolveResponse)
async def resolve_prompt(
    request: PromptResolveRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Resolver un prompt con variables inyectadas

    Utiliza el PromptOrchestrator para:
    1. Determinar qué prompt usar (custom vs default)
    2. Aplicar modificaciones de template
    3. Inyectar variables
    4. Aplicar guardrails

    Retorna el prompt listo para ejecutar en el LLM
    """
    user_id = str(current_user["_id"])

    try:
        result = await prompt_orchestrator.resolve_prompt(
            report_type_id=request.report_type_id,
            user_id=user_id,
            template_id=request.template_id,
            variables=request.variables
        )

        return PromptResolveResponse(**result)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error resolving prompt: {str(e)}"
        )
