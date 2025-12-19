"""
Endpoints para gestión de cartas astrológicas
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from app.api.endpoints.auth import get_current_user
from app.services.subscription_permissions import require_chart_quota
from app.services.ephemeris import calcular_carta_completa

load_dotenv()

router = APIRouter()

# Cliente MongoDB (compat: MONGODB_URL o MONGODB_URI)
MONGODB_URL = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI") or "mongodb://localhost:27017"
client = AsyncIOMotorClient(MONGODB_URL)
db = client.fraktal
charts_collection = db.charts

class ChartCreate(BaseModel):
    name: str
    date: str
    time: str
    place: str

class ChartGenerate(BaseModel):
    name: str
    birth_date: str
    birth_time: str
    birth_place: str
    latitude: str
    longitude: str
    is_demo: Optional[bool] = False

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
    
    # Verificar límite de cartas según plan
    await require_chart_quota(user_id)
    
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

@router.post("/generate")
async def generate_chart(chart_data: ChartGenerate):
    """
    Genera una carta natal completa con cálculos de efemérides.
    Endpoint público que NO requiere autenticación (para demos).

    Args:
        chart_data: Datos de nacimiento (nombre, fecha, hora, lugar, coordenadas)

    Returns:
        Dict con planetas, casas, ángulos y datos de entrada
    """
    try:
        # Convertir coordenadas a float
        latitude = float(chart_data.latitude)
        longitude = float(chart_data.longitude)

        # Calcular carta natal completa usando Swiss Ephemeris
        carta_completa = calcular_carta_completa(
            fecha=chart_data.birth_date,
            hora=chart_data.birth_time,
            latitud=latitude,
            longitud=longitude
        )

        # Formatear respuesta para el frontend
        # Convertir posiciones de planetas a formato esperado
        planets = []
        for nombre, data in carta_completa['planetas'].items():
            planets.append({
                'name': nombre,
                'sign': data['signo'],
                'degree': f"{data['grados']}°{data['minutos']:02d}'",
                'house': str(data.get('casa', 1)),
                'retrograde': data.get('retrogrado', False),
                'longitude': data['longitud']
            })

        # Formatear casas
        houses = []
        for casa_data in carta_completa['casas']:
            houses.append({
                'house': casa_data['numero'],
                'sign': casa_data['signo'],
                'degree': f"{casa_data['grados']}°{casa_data['minutos']:02d}'",
                'longitude': casa_data['cuspide']
            })

        # Respuesta final
        return {
            'success': True,
            'is_demo': chart_data.is_demo,
            'name': chart_data.name,
            'birth_date': chart_data.birth_date,
            'birth_time': chart_data.birth_time,
            'birth_place': chart_data.birth_place,
            'latitude': latitude,
            'longitude': longitude,
            'timezone': carta_completa['datos_entrada']['zona_horaria'],
            'planets': planets,
            'houses': houses,
            'angles': {
                'ascendant': {
                    'sign': carta_completa['angulos']['ascendente']['signo'],
                    'degree': f"{carta_completa['angulos']['ascendente']['grados']}°{carta_completa['angulos']['ascendente']['minutos']:02d}'",
                    'longitude': carta_completa['angulos']['ascendente']['longitud']
                },
                'midheaven': {
                    'sign': carta_completa['angulos']['medio_cielo']['signo'],
                    'degree': f"{carta_completa['angulos']['medio_cielo']['grados']}°{carta_completa['angulos']['medio_cielo']['minutos']:02d}'",
                    'longitude': carta_completa['angulos']['medio_cielo']['longitud']
                },
                'part_of_fortune': carta_completa['angulos']['parte_fortuna']
            },
            'raw_data': carta_completa  # Datos completos para debugging
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Coordenadas inválidas: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar carta natal: {str(e)}"
        )

