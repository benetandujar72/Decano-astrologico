"""
Endpoints para cálculo de efemérides y carta astral
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
from app.api.endpoints.auth import get_current_user
from app.services.ephemeris import calcular_carta_completa, formato_texto_carta
import sys

router = APIRouter()


class ChartRequest(BaseModel):
    """Datos de entrada para calcular carta astral"""
    fecha: str = Field(..., description="Fecha de nacimiento (YYYY-MM-DD)", example="1990-01-15")
    hora: str = Field(..., description="Hora de nacimiento (HH:MM)", example="14:30")
    latitud: float = Field(..., description="Latitud del lugar", example=40.4168, ge=-90, le=90)
    longitud: float = Field(..., description="Longitud del lugar", example=-3.7038, ge=-180, le=180)
    zona_horaria: str = Field(
        default="UTC",
        description="Zona horaria (ej: Europe/Madrid, America/Mexico_City)",
        example="Europe/Madrid"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "fecha": "1990-01-15",
                "hora": "14:30",
                "latitud": 40.4168,
                "longitud": -3.7038,
                "zona_horaria": "Europe/Madrid"
            }
        }


@router.post("/calculate")
async def calculate_chart(
    request: ChartRequest,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Calcula la carta astral completa con efemérides precisas
    Usa Swiss Ephemeris para máxima precisión astronómica
    """
    try:
        print(f"[EPHEMERIS] Calculando carta para: {request.fecha} {request.hora}", file=sys.stderr)
        print(f"[EPHEMERIS] Ubicación: Lat {request.latitud}, Lon {request.longitud}", file=sys.stderr)
        print(f"[EPHEMERIS] Zona horaria: {request.zona_horaria}", file=sys.stderr)
        
        # Calcular carta completa
        carta = calcular_carta_completa(
            fecha=request.fecha,
            hora=request.hora,
            latitud=request.latitud,
            longitud=request.longitud,
            zona_horaria=request.zona_horaria
        )
        
        print(f"[EPHEMERIS] ✅ Carta calculada exitosamente", file=sys.stderr)
        
        return {
            "success": True,
            "data": carta,
            "texto_legible": formato_texto_carta(carta)
        }
        
    except ValueError as e:
        print(f"[EPHEMERIS] ❌ Error de validación: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Datos inválidos: {str(e)}"
        )
    except Exception as e:
        print(f"[EPHEMERIS] ❌ Error calculando carta: {type(e).__name__}: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculando carta astral: {str(e)}"
        )


@router.get("/test")
async def test_ephemeris(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Endpoint de prueba con datos de ejemplo
    Útil para verificar que el servicio funciona correctamente
    """
    try:
        # Datos de prueba: 11 de Agosto de 1932, 17:00 en Morón (España)
        carta = calcular_carta_completa(
            fecha="1932-08-11",
            hora="17:00",
            latitud=37.1215,
            longitud=-5.4560,
            zona_horaria="Europe/Madrid"
        )
        
        return {
            "success": True,
            "message": "Servicio de efemérides funcionando correctamente",
            "data": carta,
            "texto_legible": formato_texto_carta(carta)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en test: {str(e)}"
        )

