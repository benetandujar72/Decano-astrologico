"""
Servicio para tracking de uso de IA y cálculo de costos
Sistema de trazabilidad forense
"""
import os
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from app.models.ai_usage_tracking import AIUsageRecord, AIActionType
from dotenv import load_dotenv

load_dotenv()

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
ai_usage_collection = db.ai_usage_records

# Precios estimados por token (USD) - Actualizar según precios reales de Gemini
# Estos son precios aproximados, ajustar según modelo usado
PRICING = {
    "gemini-3-pro-preview": {
        "input": 0.00000125,  # $1.25 por 1M tokens de entrada
        "output": 0.000005,   # $5 por 1M tokens de salida
    },
    "gemini-2.5-pro": {
        "input": 0.00000125,
        "output": 0.000005,
    },
    "default": {
        "input": 0.00000125,
        "output": 0.000005,
    }
}

def calculate_cost(model: str, prompt_tokens: int, response_tokens: int) -> float:
    """Calcula el costo estimado en USD"""
    pricing = PRICING.get(model, PRICING["default"])
    input_cost = (prompt_tokens / 1_000_000) * pricing["input"]
    output_cost = (response_tokens / 1_000_000) * pricing["output"]
    return input_cost + output_cost

async def track_ai_usage(
    user_id: str,
    user_name: str,
    action_type: AIActionType,
    model_used: str,
    prompt_tokens: int,
    response_tokens: int,
    total_tokens: int,
    session_id: Optional[str] = None,
    module_id: Optional[str] = None,
    chart_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    request_id: Optional[str] = None
) -> str:
    """
    Registra el uso de IA con trazabilidad completa
    
    Returns:
        ID del registro creado
    """
    estimated_cost = calculate_cost(model_used, prompt_tokens, response_tokens)
    
    record = AIUsageRecord(
        user_id=user_id,
        user_name=user_name,
        action_type=action_type,
        model_used=model_used,
        prompt_tokens=prompt_tokens,
        response_tokens=response_tokens,
        total_tokens=total_tokens,
        estimated_cost_usd=estimated_cost,
        session_id=session_id,
        module_id=module_id,
        chart_id=chart_id,
        metadata=metadata or {},
        ip_address=ip_address,
        user_agent=user_agent,
        request_id=request_id or str(ObjectId()),
        created_at=datetime.utcnow()
    )
    
    result = await ai_usage_collection.insert_one(record.model_dump())
    return str(result.inserted_id)

async def get_usage_stats(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    user_id: Optional[str] = None,
    action_type: Optional[AIActionType] = None
) -> Dict[str, Any]:
    """Obtiene estadísticas agregadas de uso de IA"""
    query = {}
    
    if start_date or end_date:
        query["created_at"] = {}
        if start_date:
            query["created_at"]["$gte"] = start_date
        if end_date:
            query["created_at"]["$lte"] = end_date
    
    if user_id:
        query["user_id"] = user_id
    
    if action_type:
        query["action_type"] = action_type.value
    
    # Agregaciones
    pipeline = [
        {"$match": query},
        {
            "$group": {
                "_id": None,
                "total_actions": {"$sum": 1},
                "total_tokens": {"$sum": "$total_tokens"},
                "total_cost": {"$sum": "$estimated_cost_usd"},
                "by_action_type": {
                    "$push": {
                        "type": "$action_type",
                        "tokens": "$total_tokens",
                        "cost": "$estimated_cost_usd"
                    }
                },
                "by_user": {
                    "$push": {
                        "user_id": "$user_id",
                        "user_name": "$user_name",
                        "tokens": "$total_tokens",
                        "cost": "$estimated_cost_usd"
                    }
                }
            }
        }
    ]
    
    result = await ai_usage_collection.aggregate(pipeline).to_list(length=1)
    
    if not result or not result[0]:
        return {
            "total_actions": 0,
            "total_tokens": 0,
            "total_cost_usd": 0.0,
            "by_action_type": {},
            "by_user": {},
            "by_date": {}
        }
    
    stats = result[0]
    
    # Procesar estadísticas por tipo de acción
    by_action_type = {}
    for item in stats.get("by_action_type", []):
        action = item["type"]
        if action not in by_action_type:
            by_action_type[action] = {"count": 0, "tokens": 0, "cost": 0.0}
        by_action_type[action]["count"] += 1
        by_action_type[action]["tokens"] += item["tokens"]
        by_action_type[action]["cost"] += item["cost"]
    
    # Procesar estadísticas por usuario
    by_user = {}
    for item in stats.get("by_user", []):
        uid = item["user_id"]
        if uid not in by_user:
            by_user[uid] = {
                "user_name": item["user_name"],
                "count": 0,
                "tokens": 0,
                "cost": 0.0
            }
        by_user[uid]["count"] += 1
        by_user[uid]["tokens"] += item["tokens"]
        by_user[uid]["cost"] += item["cost"]
    
    # Estadísticas por fecha
    date_pipeline = [
        {"$match": query},
        {
            "$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "count": {"$sum": 1},
                "tokens": {"$sum": "$total_tokens"},
                "cost": {"$sum": "$estimated_cost_usd"}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    date_results = await ai_usage_collection.aggregate(date_pipeline).to_list(length=None)
    by_date = {item["_id"]: {"count": item["count"], "tokens": item["tokens"], "cost": item["cost"]} for item in date_results}
    
    return {
        "total_actions": stats.get("total_actions", 0),
        "total_tokens": stats.get("total_tokens", 0),
        "total_cost_usd": round(stats.get("total_cost", 0.0), 6),
        "by_action_type": by_action_type,
        "by_user": by_user,
        "by_date": by_date
    }

async def get_usage_history(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    user_id: Optional[str] = None,
    action_type: Optional[AIActionType] = None,
    limit: int = 100,
    skip: int = 0
) -> list:
    """Obtiene el historial de uso de IA con trazabilidad completa"""
    query = {}
    
    if start_date or end_date:
        query["created_at"] = {}
        if start_date:
            query["created_at"]["$gte"] = start_date
        if end_date:
            query["created_at"]["$lte"] = end_date
    
    if user_id:
        query["user_id"] = user_id
    
    if action_type:
        query["action_type"] = action_type.value
    
    cursor = ai_usage_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
    records = await cursor.to_list(length=limit)
    
    return records
