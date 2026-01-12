"""
Endpoint de geocodificación para obtener coordenadas desde nombre de ciudad
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import httpx
import logging
from app.core.security import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


class GeocodeRequest(BaseModel):
    """Request para geocodificación"""
    city: str
    country: Optional[str] = None
    state: Optional[str] = None


class GeocodeResponse(BaseModel):
    """Response con coordenadas y detalles del lugar"""
    latitude: float
    longitude: float
    formatted_address: str
    city: str
    country: str
    timezone: str
    display_name: str


async def get_timezone_from_coords(lat: float, lon: float) -> str:
    """
    Obtener timezone desde coordenadas usando TimeZoneDB API
    Alternativa gratuita: usar cálculo aproximado por longitud
    """
    # Cálculo aproximado: cada 15 grados de longitud = 1 hora
    # UTC offset = longitude / 15
    utc_offset = round(lon / 15)

    # Formato timezone string
    if utc_offset >= 0:
        timezone = f"UTC+{utc_offset}"
    else:
        timezone = f"UTC{utc_offset}"

    return timezone


@router.post("/geocode", response_model=GeocodeResponse)
async def geocode_location(
    request: GeocodeRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Geocodificar un lugar (ciudad/país) a coordenadas geográficas

    Usa Nominatim (OpenStreetMap) - servicio gratuito sin API key

    Args:
        request: Datos del lugar a geocodificar
        current_user: Usuario autenticado

    Returns:
        Coordenadas, dirección formateada y timezone

    Raises:
        HTTPException: Si no se encuentra el lugar o hay error en la API
    """
    try:
        # Construir query string
        query_parts = [request.city]
        if request.state:
            query_parts.append(request.state)
        if request.country:
            query_parts.append(request.country)

        query = ", ".join(query_parts)

        logger.info(f"Geocodificando: {query} para usuario {current_user.get('user_id')}")

        # Llamar a Nominatim API
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={
                    "q": query,
                    "format": "json",
                    "limit": 1,
                    "addressdetails": 1
                },
                headers={
                    "User-Agent": "Decano-Astrologico/1.0 (contact@programafraktal.com)"
                },
                timeout=10.0
            )

            if response.status_code != 200:
                logger.error(f"Error en Nominatim API: {response.status_code}")
                raise HTTPException(
                    status_code=502,
                    detail="Error al contactar servicio de geocodificación"
                )

            data = response.json()

            if not data or len(data) == 0:
                logger.warning(f"No se encontró ubicación para: {query}")
                raise HTTPException(
                    status_code=404,
                    detail=f"No se encontró la ubicación: {query}"
                )

            # Primer resultado
            result = data[0]

            lat = float(result["lat"])
            lon = float(result["lon"])
            display_name = result.get("display_name", query)

            # Extraer detalles de la dirección
            address = result.get("address", {})
            city = (
                address.get("city") or
                address.get("town") or
                address.get("village") or
                request.city
            )
            country = address.get("country", request.country or "")

            # Obtener timezone
            timezone = await get_timezone_from_coords(lat, lon)

            logger.info(f"Geocodificación exitosa: {lat}, {lon} - {display_name}")

            return GeocodeResponse(
                latitude=lat,
                longitude=lon,
                formatted_address=display_name,
                city=city,
                country=country,
                timezone=timezone,
                display_name=display_name
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error inesperado en geocodificación: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al procesar la geocodificación: {str(e)}"
        )


@router.get("/geocode/reverse", response_model=GeocodeResponse)
async def reverse_geocode(
    lat: float,
    lon: float,
    current_user: dict = Depends(get_current_user)
):
    """
    Geocodificación inversa: obtener lugar desde coordenadas

    Args:
        lat: Latitud
        lon: Longitud
        current_user: Usuario autenticado

    Returns:
        Información del lugar
    """
    try:
        logger.info(f"Geocodificación inversa: {lat}, {lon}")

        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={
                    "lat": lat,
                    "lon": lon,
                    "format": "json",
                    "addressdetails": 1
                },
                headers={
                    "User-Agent": "Decano-Astrologico/1.0 (contact@programafraktal.com)"
                },
                timeout=10.0
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=502,
                    detail="Error en servicio de geocodificación inversa"
                )

            data = response.json()

            address = data.get("address", {})
            display_name = data.get("display_name", f"{lat}, {lon}")

            city = (
                address.get("city") or
                address.get("town") or
                address.get("village") or
                "Unknown"
            )
            country = address.get("country", "Unknown")

            timezone = await get_timezone_from_coords(lat, lon)

            return GeocodeResponse(
                latitude=lat,
                longitude=lon,
                formatted_address=display_name,
                city=city,
                country=country,
                timezone=timezone,
                display_name=display_name
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en geocodificación inversa: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error: {str(e)}"
        )
