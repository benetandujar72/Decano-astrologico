"""
Modelos para preferencias de usuario
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class UserPreferences(BaseModel):
    """Preferencias personales del usuario"""
    # Identificador
    user_id: str

    # Preferencias de interfaz
    idioma: str = "es"  # "es", "en", "ca"
    tema_visual: str = "dark"  # "dark", "light", "auto"

    # Preferencias de formato
    formato_fecha: str = "DD/MM/YYYY"  # "DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"
    formato_hora: str = "24h"  # "12h", "24h"
    timezone_preferida: str = "UTC"  # Zona horaria por defecto para visualización

    # Preferencias astrológicas
    sistema_casas: str = "Placidus"  # "Placidus", "Koch", "Equal", "Whole Sign"
    mostrar_segundos_angulos: bool = True  # Mostrar segundos en posiciones
    mostrar_aspectos: bool = True
    orbe_aspectos: float = 8.0  # Grados de orbe por defecto

    # Preferencias de cálculo
    usar_nodo_norte_verdadero: bool = True  # vs Nodo Norte Medio
    incluir_quiron: bool = True
    incluir_asteroides: bool = False
    incluir_partes_arabes: bool = True

    # Notificaciones
    notificaciones_email: bool = True
    notificaciones_transitos: bool = False

    # Privacidad
    cartas_publicas_por_defecto: bool = False
    compartir_estadisticas: bool = True

    # Metadatos
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "507f1f77bcf86cd799439011",
                "idioma": "es",
                "tema_visual": "dark",
                "timezone_preferida": "Europe/Madrid",
                "sistema_casas": "Placidus",
                "mostrar_segundos_angulos": True,
                "orbe_aspectos": 8.0
            }
        }


class NotificationSettings(BaseModel):
    """Configuración de notificaciones"""
    user_id: str

    # Tipos de notificaciones
    transitos_importantes: bool = False  # Luna Nueva, Eclipses, etc.
    retrogradaciones: bool = False
    cumpleanos_solar: bool = True  # Aviso en retorno solar
    lunas_llenas: bool = False

    # Canales
    via_email: bool = True
    via_push: bool = False
    via_sms: bool = False

    # Frecuencia
    resumen_semanal: bool = False
    resumen_mensual: bool = False

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "507f1f77bcf86cd799439011",
                "transitos_importantes": True,
                "cumpleanos_solar": True,
                "via_email": True,
                "resumen_semanal": True
            }
        }
