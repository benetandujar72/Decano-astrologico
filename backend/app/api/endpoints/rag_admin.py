"""
Admin endpoints para gestionar el RAG Router:
report_type -> prompt_type -> docs_version/docs_topic
"""
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import os

from app.api.endpoints.auth import get_current_user


router = APIRouter()

MONGODB_URL = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI") or "mongodb://localhost:27017"
mongodb_options = {"serverSelectionTimeoutMS": 5000, "connectTimeoutMS": 10000}
if "mongodb+srv://" in MONGODB_URL or "mongodb.net" in MONGODB_URL:
    mongodb_options.update({"tls": True, "tlsAllowInvalidCertificates": True})
client = AsyncIOMotorClient(MONGODB_URL, **mongodb_options)
db = client.fraktal
rag_mappings = db.rag_mappings


class RagMappingUpsert(BaseModel):
    report_type: str = Field(..., description="individual|pareja|familiar|equipo|infantil|adultos|profesional")
    prompt_type: str = Field(..., description="tipo de prompt especializado (specialized_prompts.type)")
    docs_topic: str = Field(default="", description="topic legacy para aislar RAG (adultos/infantil/...)")
    docs_topics: Optional[List[str]] = Field(default=None, description="topics/folders para aislar RAG (multi-topic)")
    docs_version: str = Field(default="", description="versión de docs en Atlas (DOCS_VERSION)")


def _require_admin(user: dict) -> None:
    if user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")


@router.get("/rag-mappings")
async def list_rag_mappings(current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)
    out = []
    cursor = rag_mappings.find({}, projection={"_id": 0}).sort("report_type", 1)
    async for d in cursor:
        out.append(d)
    return {"mappings": out, "total": len(out)}


@router.put("/rag-mappings")
async def upsert_rag_mapping(body: RagMappingUpsert, current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)
    rt = (body.report_type or "").lower().strip()
    if rt not in {"individual", "pareja", "familiar", "equipo", "infantil", "adultos", "profesional"}:
        raise HTTPException(status_code=400, detail="report_type inválido")
    pt = (body.prompt_type or "").lower().strip()
    if not pt:
        raise HTTPException(status_code=400, detail="prompt_type requerido")
    topics: List[str] = []
    if isinstance(body.docs_topics, list) and body.docs_topics:
        topics = [str(t).strip() for t in body.docs_topics if str(t).strip()]
    if not topics:
        topic = (body.docs_topic or "").strip()
        if not topic:
            raise HTTPException(status_code=400, detail="docs_topic o docs_topics requerido")
        topics = [topic]
    topics = [t.replace("\\", "/").lower().strip() for t in topics if t]
    topic = topics[0]

    docs_version = (body.docs_version or os.getenv("DOCS_VERSION", "default")).strip()
    doc = {
        "report_type": rt,
        "prompt_type": pt,
        "docs_topic": topic,
        "docs_topics": topics,
        "docs_version": docs_version,
        "updated_at": datetime.utcnow().isoformat(),
        "updated_by": current_user.get("username") or "admin",
    }
    await rag_mappings.update_one({"report_type": rt}, {"$set": doc}, upsert=True)
    return {"ok": True, "mapping": doc}


