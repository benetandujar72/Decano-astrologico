"""
Endpoints para geocodificación de lugares
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from app.api.endpoints.auth import get_current_user
from app.services.geolocation_service import geocodificar_lugar
import sys

router = APIRouter()


class GeocodeRequest(BaseModel):
    """Request para geocodificar un lugar"""
    place: str = Field(..., description="Nombre del lugar a geocodificar", example="Madrid, España")
    
    class Config:
        json_schema_extra = {
            "example": {
                "place": "Madrid, España"
            }
        }


@router.post("/geocode")
async def geocode_place(
    request: GeocodeRequest,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Geocodifica un nombre de lugar a coordenadas geográficas.
    
    Convierte texto como "Madrid, España" a coordenadas (lat, lon) y detecta la zona horaria.
    
    Args:
        request: Contiene el nombre del lugar en texto
    
    Returns:
        {
            "success": True,
            "lat": float,
            "lon": float,
            "nombre": str,
            "timezone": str,
            "pais": Optional[str],
            "ciudad": Optional[str]
        }
    
    Raises:
        HTTPException: Si el lugar no se encuentra o hay error en la API
    """
    try:
        print(f"[GEOLOCATION] Geocodificando lugar: {request.place}", file=sys.stderr)
        
        resultado = geocodificar_lugar(request.place)
        
        print(f"[GEOLOCATION] ✅ Geocodificado exitosamente: {resultado['nombre']}", file=sys.stderr)
        
        return {
            "success": True,
            **resultado
        }
        
    except ValueError as e:
        print(f"[GEOLOCATION] ❌ Error de validación: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except RuntimeError as e:
        print(f"[GEOLOCATION] ❌ Error de configuración: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        print(f"[GEOLOCATION] ❌ Error inesperado: {type(e).__name__}: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error geocodificando lugar: {str(e)}"
        )

