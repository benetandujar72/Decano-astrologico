"""
Modelos de datos para cartas astrológicas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class PlanetPosition(BaseModel):
    """Posición de un planeta en la carta astral"""
    nombre: str
    longitud_ecliptica: float
    latitud_ecliptica: float
    signo: str
    grados: int
    minutos: int
    segundos: int
    casa: int
    retrogrado: bool
    velocidad: float


class HouseData(BaseModel):
    """Datos de una casa astrológica"""
    numero: int
    cuspide_longitud: float
    signo: str
    grados: int
    minutos: int
    segundos: int


class AspectData(BaseModel):
    """Aspecto entre dos planetas"""
    planeta1: str
    planeta2: str
    tipo_aspecto: str  # "Conjunción", "Trígono", "Cuadratura", etc.
    angulo: float
    orbe: float
    aplicativo: bool


class ChartMetadata(BaseModel):
    """Metadatos de la carta astral"""
    # Datos de entrada del usuario
    nombre: str
    fecha_local: str  # "1972-05-27"
    hora_local: str   # "08:00"

    # Ubicación geográfica
    latitud: float
    longitud: float
    lugar_nombre: Optional[str] = None  # "Morón de la Frontera, Sevilla"

    # Información de zona horaria
    zona_horaria: str  # "Europe/Madrid"
    offset_utc: str    # "+01:00" o "+02:00"
    offset_utc_legible: str  # "UTC+01:00"
    dst_activo: bool   # True si es horario de verano

    # Conversión UTC
    fecha_utc: str  # "1972-05-27 07:00:00 UTC"
    hora_local_completa: str  # "1972-05-27 08:00:00"

    # Metadatos de cálculo
    version_calculo: str = "1.0"
    motor_efemerides: str = "Swiss Ephemeris 2.10.3"
    precision_segundos: bool = True


class ChartCalculation(BaseModel):
    """Datos calculados de la carta astral"""
    # Planetas
    planetas: List[Dict[str, Any]]  # Posiciones planetarias completas

    # Casas
    sistema_casas: str = "Placidus"
    ascendente: Dict[str, Any]
    medio_cielo: Dict[str, Any]
    casas: List[Dict[str, Any]]

    # Aspectos (opcional)
    aspectos: Optional[List[Dict[str, Any]]] = []

    # Balance elemental
    balance_elementos: Optional[Dict[str, int]] = None
    balance_modalidades: Optional[Dict[str, int]] = None


class AstrologicalChart(BaseModel):
    """Modelo completo de una carta astral guardada"""
    # Identificadores
    user_id: str
    chart_id: Optional[str] = None  # Se asigna al guardar en MongoDB

    # Metadatos de tiempo y ubicación
    metadata: ChartMetadata

    # Cálculos astronómicos
    calculation: ChartCalculation

    # Análisis IA (opcional)
    analisis_ia: Optional[Dict[str, Any]] = None

    # Metadatos de sistema
    timestamp_creacion: datetime = Field(default_factory=datetime.utcnow)
    timestamp_modificacion: Optional[datetime] = None

    # Etiquetas y categorización
    tags: List[str] = []
    es_favorito: bool = False
    notas: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "507f1f77bcf86cd799439011",
                "metadata": {
                    "nombre": "Juan Pérez",
                    "fecha_local": "1972-05-27",
                    "hora_local": "08:00",
                    "latitud": 37.1215,
                    "longitud": -5.4560,
                    "zona_horaria": "Europe/Madrid",
                    "offset_utc": "+01:00",
                    "offset_utc_legible": "UTC+01:00",
                    "dst_activo": False,
                    "fecha_utc": "1972-05-27 07:00:00 UTC",
                    "hora_local_completa": "1972-05-27 08:00:00"
                },
                "calculation": {
                    "planetas": [],
                    "sistema_casas": "Placidus",
                    "ascendente": {},
                    "medio_cielo": {},
                    "casas": []
                },
                "tags": ["natal", "cliente"],
                "es_favorito": False
            }
        }


class ChartCreate(BaseModel):
    """Datos para crear una nueva carta (entrada de API)"""
    nombre: str
    fecha: str  # "YYYY-MM-DD"
    hora: str   # "HH:MM"
    latitud: float
    longitud: float
    zona_horaria: Optional[str] = None  # Se detecta automáticamente si no se provee
    lugar_nombre: Optional[str] = None
    tags: List[str] = []


class ChartUpdate(BaseModel):
    """Datos para actualizar una carta existente"""
    nombre: Optional[str] = None
    tags: Optional[List[str]] = None
    es_favorito: Optional[bool] = None
    notas: Optional[str] = None
