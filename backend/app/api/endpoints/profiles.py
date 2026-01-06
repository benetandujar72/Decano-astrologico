"""
Endpoints para gestión de perfiles guardados (personas) para informes sistémicos.

Permite al usuario guardar y reutilizar datos de nacimiento (sin guardar texto de informes).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import Optional, List
from bson import ObjectId
from datetime import datetime
import os
import uuid

from app.api.endpoints.auth import get_current_user

router = APIRouter()

# MongoDB
MONGODB_URL = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI") or "mongodb://localhost:27017"
mongodb_options = {
    "serverSelectionTimeoutMS": 5000,
    "connectTimeoutMS": 10000,
}
if "mongodb+srv://" in MONGODB_URL or "mongodb.net" in MONGODB_URL:
    mongodb_options.update({"tls": True, "tlsAllowInvalidCertificates": True})

client = AsyncIOMotorClient(MONGODB_URL, **mongodb_options)
db = client.fraktal
profiles_collection = db.user_profiles


class ProfileUpsert(BaseModel):
    profile_id: Optional[str] = Field(default=None, description="ID del perfil (si se quiere actualizar)")
    name: str = Field(..., description="Nombre de la persona")
    birth_date: str = Field(..., description="Fecha de nacimiento YYYY-MM-DD")
    birth_time: str = Field(..., description="Hora de nacimiento HH:MM")
    birth_place: str = Field(..., description="Lugar de nacimiento (texto o coords)")


class ProfileOut(BaseModel):
    profile_id: str
    name: str
    birth_date: str
    birth_time: str
    birth_place: str
    created_at: str
    updated_at: str


@router.get("/my")
async def get_my_profiles(
    include_deleted: bool = False,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("_id")
    if isinstance(user_id, ObjectId):
        user_id = str(user_id)
    user_id = str(user_id)

    q: dict = {"user_id": user_id}
    if not include_deleted:
        q["deleted_at"] = {"$exists": False}

    cursor = profiles_collection.find(q).sort("updated_at", -1).limit(250)
    items: List[dict] = []
    async for p in cursor:
        items.append(
            {
                "profile_id": p.get("profile_id") or str(p.get("_id")),
                "name": p.get("name", ""),
                "birth_date": p.get("birth_date", ""),
                "birth_time": p.get("birth_time", ""),
                "birth_place": p.get("birth_place", ""),
                "created_at": p.get("created_at", ""),
                "updated_at": p.get("updated_at", ""),
            }
        )
    return {"profiles": items}


@router.post("/")
async def upsert_profile(
    payload: ProfileUpsert,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("_id")
    if isinstance(user_id, ObjectId):
        user_id = str(user_id)
    user_id = str(user_id)

    now = datetime.utcnow().isoformat()
    profile_id = (payload.profile_id or "").strip() or str(uuid.uuid4())

    doc = {
        "user_id": user_id,
        "profile_id": profile_id,
        "name": payload.name.strip(),
        "birth_date": payload.birth_date.strip(),
        "birth_time": payload.birth_time.strip(),
        "birth_place": payload.birth_place.strip(),
        "updated_at": now,
    }

    # Si existe, update. Si no, insert.
    existing = await profiles_collection.find_one({"user_id": user_id, "profile_id": profile_id})
    if existing:
        await profiles_collection.update_one({"_id": existing["_id"]}, {"$set": doc})
        out = {**existing, **doc}
    else:
        doc["created_at"] = now
        await profiles_collection.insert_one(doc)
        out = doc

    return {
        "profile": {
            "profile_id": out.get("profile_id", profile_id),
            "name": out.get("name", ""),
            "birth_date": out.get("birth_date", ""),
            "birth_time": out.get("birth_time", ""),
            "birth_place": out.get("birth_place", ""),
            "created_at": out.get("created_at", now),
            "updated_at": out.get("updated_at", now),
        }
    }


@router.delete("/{profile_id}")
async def delete_profile(
    profile_id: str,
    hard: bool = False,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("_id")
    if isinstance(user_id, ObjectId):
        user_id = str(user_id)
    user_id = str(user_id)

    doc = await profiles_collection.find_one({"user_id": user_id, "profile_id": profile_id})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil no encontrado")

    if hard:
        await profiles_collection.delete_one({"_id": doc["_id"]})
        return {"ok": True, "deleted": "hard", "profile_id": profile_id}

    await profiles_collection.update_one(
        {"_id": doc["_id"]},
        {"$set": {"deleted_at": datetime.utcnow().isoformat()}},
    )
    return {"ok": True, "deleted": "soft", "profile_id": profile_id}


