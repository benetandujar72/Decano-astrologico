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

load_dotenv()

router = APIRouter()

# Cliente MongoDB (compat: MONGODB_URL o MONGODB_URI)
MONGODB_URL = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI") or "mongodb://localhost:27017"
client = AsyncIOMotorClient(MONGODB_URL)
db = client.fraktal
prompts_collection = db.system_prompts

class PromptUpdate(BaseModel):
    content: str

@router.get("/prompt")
async def get_system_prompt(current_user: dict = Depends(get_current_user)) -> dict:
    """Obtiene el prompt del sistema activo"""
    prompt = await prompts_collection.find_one({"active": True})
    
    if not prompt:
        # Retornar prompt por defecto si no hay uno en la BD
        return {
            "id": None,
            "active": True,
            "content": "",
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
    # Verificar que el usuario es admin
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update system prompts"
        )
    
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
    
    return {
        "id": str(result.inserted_id),
        "active": True,
        "content": prompt_data.content,
        "updated_at": new_prompt["updated_at"]
    }

