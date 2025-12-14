"""
Endpoints para configuración del sistema (prompts)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime
import os
from dotenv import load_dotenv
from app.api.endpoints.auth import get_current_user
from pydantic import BaseModel
from app.models.prompts import SpecializedPrompt, PromptType, DEFAULT_PROMPTS
from typing import List, Optional

load_dotenv()

router = APIRouter()

# Cliente MongoDB con opciones SSL configuradas
MONGODB_URL = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI") or "mongodb://localhost:27017"

# Opciones para MongoDB Atlas con SSL/TLS
mongodb_options = {
    "serverSelectionTimeoutMS": 5000,
    "connectTimeoutMS": 10000,
    "socketTimeoutMS": 10000,
    "maxPoolSize": 10,
    "minPoolSize": 1,
}

# Si es MongoDB Atlas (contiene mongodb+srv o mongodb.net), agregar opciones SSL
if "mongodb+srv://" in MONGODB_URL or "mongodb.net" in MONGODB_URL:
    mongodb_options.update({
        "tls": True,
        "tlsAllowInvalidCertificates": True,
    })

client = AsyncIOMotorClient(MONGODB_URL, **mongodb_options)
db = client.fraktal
prompts_collection = db.system_prompts
specialized_prompts_collection = db.specialized_prompts

class PromptUpdate(BaseModel):
    content: str

    class Config:
        # Permitir prompts muy largos (hasta 500KB ~ 500,000 caracteres)
        str_max_length = 500000

@router.get("/prompt")
async def get_system_prompt(current_user: dict = Depends(get_current_user)) -> dict:
    """Obtiene el prompt del sistema activo"""
    prompt = await prompts_collection.find_one({"active": True})
    
    if not prompt:
        # Retornar prompt por defecto si no hay uno en la BD
        from app.models.default_prompt import DEFAULT_SYSTEM_PROMPT
        return {
            "id": None,
            "active": True,
            "content": DEFAULT_SYSTEM_PROMPT,
            "updated_at": datetime.utcnow().isoformat()
        }
    
    return {
        "id": str(prompt["_id"]),
        "active": prompt.get("active", True),
        "content": prompt.get("content", ""),
        "updated_at": prompt.get("updated_at", datetime.utcnow().isoformat())
    }

@router.post("/prompt")
async def update_system_prompt(
    prompt_data: PromptUpdate,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Actualiza el prompt del sistema (solo admin)"""
    import sys

    # Verificar que el usuario es admin
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update system prompts"
        )

    # Log del tamaño del prompt
    prompt_size = len(prompt_data.content)
    print(f"[CONFIG] Updating system prompt. Size: {prompt_size} characters ({prompt_size/1024:.2f} KB)", file=sys.stderr)

    try:
        # Desactivar todos los prompts anteriores
        await prompts_collection.update_many(
            {"active": True},
            {"$set": {"active": False}}
        )

        # Crear nuevo prompt activo
        new_prompt = {
            "active": True,
            "content": prompt_data.content,
            "updated_at": datetime.utcnow().isoformat(),
            "updated_by": current_user.get("username", "unknown")
        }

        result = await prompts_collection.insert_one(new_prompt)
        print(f"[CONFIG] System prompt updated successfully. ID: {result.inserted_id}", file=sys.stderr)

        # IMPORTANTE: Devolver el contenido COMPLETO porque se usa en Gemini
        return {
            "id": str(result.inserted_id),
            "active": True,
            "content": prompt_data.content,  # Completo para usar en análisis
            "updated_at": new_prompt["updated_at"],
            "size": len(prompt_data.content),
            "success": True
        }
    except Exception as e:
        print(f"[CONFIG] ERROR updating prompt: {type(e).__name__}: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating system prompt: {str(e)}"
        )


# ========================================
# SPECIALIZED PROMPTS ENDPOINTS
# ========================================

@router.get("/prompts/specialized", response_model=List[dict])
async def get_specialized_prompts(
    current_user: dict = Depends(get_current_user)
) -> List[dict]:
    """Obtiene todos los prompts especializados disponibles"""
    import sys

    try:
        prompts = []
        cursor = specialized_prompts_collection.find({})

        async for prompt in cursor:
            prompts.append({
                "id": str(prompt["_id"]),
                "prompt_id": prompt.get("prompt_id"),
                "name": prompt.get("name"),
                "type": prompt.get("type"),
                "description": prompt.get("description"),
                "content": prompt.get("content"),
                "house_system": prompt.get("house_system", "placidus"),
                "orb_config": prompt.get("orb_config"),
                "is_public": prompt.get("is_public", False),
                "is_default": prompt.get("is_default", False),
                "created_by": prompt.get("created_by"),
                "created_at": prompt.get("created_at"),
                "usage_count": prompt.get("usage_count", 0),
                "rating": prompt.get("rating", 0.0)
            })

        print(f"[CONFIG] Retrieved {len(prompts)} specialized prompts", file=sys.stderr)
        return prompts

    except Exception as e:
        print(f"[CONFIG] ERROR retrieving specialized prompts: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving specialized prompts: {str(e)}"
        )


@router.get("/prompts/specialized/{prompt_type}")
async def get_specialized_prompt_by_type(
    prompt_type: str,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Obtiene un prompt especializado por tipo"""
    import sys

    try:
        # Buscar primero un prompt personalizado del usuario
        prompt = await specialized_prompts_collection.find_one({
            "type": prompt_type,
            "$or": [
                {"created_by": current_user.get("username")},
                {"is_public": True},
                {"is_default": True}
            ]
        }, sort=[("is_default", -1), ("rating", -1)])

        if prompt:
            return {
                "id": str(prompt["_id"]),
                "prompt_id": prompt.get("prompt_id"),
                "name": prompt.get("name"),
                "type": prompt.get("type"),
                "description": prompt.get("description"),
                "content": prompt.get("content"),
                "house_system": prompt.get("house_system", "placidus"),
                "orb_config": prompt.get("orb_config"),
                "is_default": prompt.get("is_default", False),
                "created_by": prompt.get("created_by")
            }

        # Si no existe, retornar el prompt por defecto del código
        if prompt_type in DEFAULT_PROMPTS:
            content = DEFAULT_PROMPTS[prompt_type]
        else:
            # Para tipos sin default, crear un prompt genérico
            content = f"""⚠️ SYSTEM PROMPT: {prompt_type.replace('_', ' ').upper()} (FRAKTAL v2.0)

**ROL:** Analista Astrológico Especializado
**ENFOQUE:** {prompt_type.replace('_', ' ').title()}

### PROTOCOLO DE ANÁLISIS:

1. **CONTEXTO**
   - Tipo de análisis: {prompt_type.replace('_', ' ')}
   - Enfoque profesional y técnico
   - Interpretación basada en técnicas astrológicas clásicas

2. **METODOLOGÍA**
   - Análisis de posiciones planetarias
   - Interpretación de aspectos
   - Síntesis de casas astrológicas
   - Relación con carta natal base

3. **RESULTADOS**
   - Descripción clara y estructurada
   - Sin predicciones genéricas
   - Enfoque práctico y aplicable

**ESTILO:** Profesional, técnico, sistémico.
**IDIOMA:** Español
"""

        return {
            "id": None,
            "prompt_id": f"default_{prompt_type}",
            "name": f"Prompt {prompt_type.replace('_', ' ').title()}",
            "type": prompt_type,
            "description": f"Prompt predefinido para {prompt_type.replace('_', ' ')}",
            "content": content,
            "house_system": "placidus",
            "orb_config": None,
            "is_default": True,
            "created_by": "system"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[CONFIG] ERROR retrieving prompt {prompt_type}: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving prompt: {str(e)}"
        )


@router.post("/prompts/specialized")
async def create_specialized_prompt(
    prompt: SpecializedPrompt,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Crea un prompt especializado (requiere plan Premium o superior)"""
    import sys
    from app.services.subscription_permissions import require_feature
    
    user_id = str(current_user.get("_id"))
    await require_feature(
        user_id, 
        "customize_prompts",
        "La personalización de prompts requiere un plan Premium o superior."
    )

    try:
        # Preparar documento para MongoDB
        prompt_dict = prompt.model_dump()
        prompt_dict["created_by"] = current_user.get("username", "unknown")
        prompt_dict["created_at"] = datetime.utcnow().isoformat()

        # Insertar en la base de datos
        result = await specialized_prompts_collection.insert_one(prompt_dict)

        print(f"[CONFIG] Created specialized prompt '{prompt.name}' (type: {prompt.type}). ID: {result.inserted_id}", file=sys.stderr)

        return {
            "id": str(result.inserted_id),
            "prompt_id": prompt.prompt_id,
            "name": prompt.name,
            "type": prompt.type,
            "success": True
        }

    except Exception as e:
        print(f"[CONFIG] ERROR creating specialized prompt: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating specialized prompt: {str(e)}"
        )


@router.put("/prompts/specialized/{prompt_id}")
async def update_specialized_prompt(
    prompt_id: str,
    prompt: SpecializedPrompt,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Actualiza un prompt especializado existente (solo admin o creador)"""
    import sys

    try:
        # Buscar el prompt existente
        existing_prompt = await specialized_prompts_collection.find_one({"_id": ObjectId(prompt_id)})

        if not existing_prompt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Prompt with id '{prompt_id}' not found"
            )

        # Verificar permisos: admin o creador del prompt
        user_id = str(current_user.get("_id"))
        from app.services.subscription_permissions import require_feature
        await require_feature(
            user_id, 
            "customize_prompts",
            "La personalización de prompts requiere un plan Premium o superior."
        )
        
        if current_user.get("role") != "admin" and existing_prompt.get("created_by") != current_user.get("username"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own prompts"
            )

        # Actualizar el prompt
        prompt_dict = prompt.model_dump(exclude={"prompt_id", "created_by", "created_at"})
        prompt_dict["updated_at"] = datetime.utcnow().isoformat()
        prompt_dict["updated_by"] = current_user.get("username", "unknown")

        await specialized_prompts_collection.update_one(
            {"_id": ObjectId(prompt_id)},
            {"$set": prompt_dict}
        )

        print(f"[CONFIG] Updated specialized prompt '{prompt.name}' (ID: {prompt_id})", file=sys.stderr)

        return {
            "id": prompt_id,
            "name": prompt.name,
            "type": prompt.type,
            "success": True
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[CONFIG] ERROR updating specialized prompt: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating specialized prompt: {str(e)}"
        )


@router.delete("/prompts/specialized/{prompt_id}")
async def delete_specialized_prompt(
    prompt_id: str,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Elimina un prompt especializado (solo admin o creador)"""
    import sys

    try:
        # Buscar el prompt existente
        existing_prompt = await specialized_prompts_collection.find_one({"_id": ObjectId(prompt_id)})

        if not existing_prompt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Prompt with id '{prompt_id}' not found"
            )

        # Verificar permisos: admin o creador del prompt
        user_id = str(current_user.get("_id"))
        from app.services.subscription_permissions import require_feature
        await require_feature(
            user_id, 
            "customize_prompts",
            "La personalización de prompts requiere un plan Premium o superior."
        )
        
        if current_user.get("role") != "admin" and existing_prompt.get("created_by") != current_user.get("username"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own prompts"
            )

        # No permitir eliminar prompts por defecto
        if existing_prompt.get("is_default", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete default prompts"
            )

        # Eliminar el prompt
        await specialized_prompts_collection.delete_one({"_id": ObjectId(prompt_id)})

        print(f"[CONFIG] Deleted specialized prompt (ID: {prompt_id})", file=sys.stderr)

        return {
            "id": prompt_id,
            "success": True,
            "message": "Prompt deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[CONFIG] ERROR deleting specialized prompt: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting specialized prompt: {str(e)}"
        )


@router.post("/prompts/specialized/{prompt_id}/use")
async def increment_prompt_usage(
    prompt_id: str,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Incrementa el contador de uso de un prompt especializado"""
    import sys

    try:
        result = await specialized_prompts_collection.update_one(
            {"_id": ObjectId(prompt_id)},
            {"$inc": {"usage_count": 1}}
        )

        if result.modified_count == 0:
            print(f"[CONFIG] WARNING: Prompt {prompt_id} not found for usage increment", file=sys.stderr)

        return {"success": True}

    except Exception as e:
        # No fallar si hay error, solo loguear
        print(f"[CONFIG] ERROR incrementing prompt usage: {e}", file=sys.stderr)
        return {"success": False}

