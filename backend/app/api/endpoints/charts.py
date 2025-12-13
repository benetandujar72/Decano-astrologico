"""
Endpoints para gestión de cartas astrológicas
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from app.api.endpoints.auth import get_current_user

load_dotenv()

router = APIRouter()

# Cliente MongoDB
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGODB_URL)
db = client.fraktal
charts_collection = db.charts

class ChartCreate(BaseModel):
    name: str
    date: str
    time: str
    place: str

@router.get("/")
async def get_charts(current_user: dict = Depends(get_current_user)) -> List[dict]:
    """Obtiene todas las cartas del usuario actual"""
    user_id = current_user.get("_id")
    if isinstance(user_id, ObjectId):
        user_id = str(user_id)
    
    cursor = charts_collection.find({"user_id": user_id})
    charts = []
    async for chart in cursor:
        chart["id"] = str(chart["_id"])
        chart["user_id"] = str(chart.get("user_id", ""))
        del chart["_id"]
        charts.append(chart)
    
    return charts

@router.post("/")
async def save_chart(
    chart_data: ChartCreate,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Guarda una nueva carta"""
    user_id = current_user.get("_id")
    if isinstance(user_id, ObjectId):
        user_id = str(user_id)
    
    chart = {
        "user_id": user_id,
        "name": chart_data.name,
        "date": chart_data.date,
        "time": chart_data.time,
        "place": chart_data.place,
        "timestamp": int(datetime.utcnow().timestamp() * 1000)
    }
    
    result = await charts_collection.insert_one(chart)
    chart["id"] = str(result.inserted_id)
    chart["user_id"] = str(chart["user_id"])
    del chart["_id"]
    
    return chart

@router.delete("/{chart_id}")
async def delete_chart(
    chart_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Elimina una carta"""
    user_id = current_user.get("_id")
    if isinstance(user_id, ObjectId):
        user_id = str(user_id)
    
    # Verificar que la carta pertenece al usuario
    chart = await charts_collection.find_one({"_id": ObjectId(chart_id)})
    if not chart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chart not found"
        )
    
    if str(chart.get("user_id")) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this chart"
        )
    
    await charts_collection.delete_one({"_id": ObjectId(chart_id)})
    return {"message": "Chart deleted successfully"}

