"""
Modelos para servicios profesionales de Jon Landeta
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from enum import Enum


class ServiceType(str, Enum):
    """Tipos de servicios profesionales disponibles"""
    PHONE_CONSULTATION = "phone_consultation"          # Consulta telefónica
    ONLINE_CONSULTATION = "online_consultation"        # Consulta online (Zoom/Meet)
    IN_PERSON_CONSULTATION = "in_person_consultation"  # Consulta presencial
    TRAINING_PROGRAM = "training_program"              # Programa de formación
    THERAPY_SESSION = "therapy_session"                # Sesión de terapia/coaching
    CHART_REPORT = "chart_report"                      # Carta personalizada (informe)


class ServiceCategory(str, Enum):
    """Categorías de servicios"""
    CONSULTATION = "consultation"  # Consultas individuales
    TRAINING = "training"          # Formación y cursos
    THERAPY = "therapy"            # Terapia y coaching


class ProfessionalService(BaseModel):
    """Servicio profesional ofrecido"""
    service_id: str = Field(default_factory=lambda: f"srv_{int(datetime.utcnow().timestamp()*1000)}")

    name: str
    description: str
    service_type: ServiceType
    category: ServiceCategory

    # Detalles del servicio
    duration_minutes: int
    base_price: float  # Precio base en euros
    currency: str = "EUR"

    # Disponibilidad
    is_available: bool = True
    max_bookings_per_month: int = -1  # -1 = ilimitado

    # Información adicional
    prerequisites: Optional[list[str]] = None  # Requisitos previos
    includes: Optional[list[str]] = None       # Qué incluye el servicio
    location: Optional[str] = None             # Para servicios presenciales
    platform: Optional[str] = None             # Para servicios online (Zoom, Google Meet, etc.)

    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

    class Config:
        json_schema_extra = {
            "example": {
                "service_id": "srv_1234567890",
                "name": "Consulta Astrológica Online",
                "description": "Sesión personalizada de análisis astrológico con Jon Landeta via Zoom",
                "service_type": "online_consultation",
                "category": "consultation",
                "duration_minutes": 60,
                "base_price": 150.00,
                "currency": "EUR",
                "is_available": True,
                "includes": [
                    "Análisis completo de carta natal",
                    "Recomendaciones personalizadas",
                    "Grabación de la sesión",
                    "Informe por escrito (PDF)"
                ],
                "platform": "Zoom"
            }
        }


# Catálogo de servicios predefinidos
PROFESSIONAL_SERVICES_CATALOG = {
    "phone_consultation_60": ProfessionalService(
        service_id="srv_phone_60",
        name="Consulta Telefónica (60 min)",
        description="Consulta astrológica personalizada por teléfono con Jon Landeta",
        service_type=ServiceType.PHONE_CONSULTATION,
        category=ServiceCategory.CONSULTATION,
        duration_minutes=60,
        base_price=120.00,
        includes=[
            "Análisis de carta natal o tema específico",
            "Recomendaciones personalizadas",
            "Seguimiento por email (7 días)"
        ]
    ),

    "online_consultation_60": ProfessionalService(
        service_id="srv_online_60",
        name="Consulta Online (60 min)",
        description="Sesión de análisis astrológico vía videollamada (Zoom/Google Meet)",
        service_type=ServiceType.ONLINE_CONSULTATION,
        category=ServiceCategory.CONSULTATION,
        duration_minutes=60,
        base_price=150.00,
        platform="Zoom / Google Meet",
        includes=[
            "Análisis completo de carta natal",
            "Visualización compartida de gráficos",
            "Grabación de la sesión",
            "Informe resumen (PDF)",
            "Seguimiento por email (14 días)"
        ]
    ),

    "in_person_consultation_90": ProfessionalService(
        service_id="srv_in_person_90",
        name="Consulta Presencial (90 min)",
        description="Sesión presencial de análisis astrológico profundo",
        service_type=ServiceType.IN_PERSON_CONSULTATION,
        category=ServiceCategory.CONSULTATION,
        duration_minutes=90,
        base_price=250.00,
        location="Barcelona, España (a convenir)",
        includes=[
            "Análisis astrológico completo",
            "Material impreso de tu carta natal",
            "Ejercicios prácticos",
            "Informe detallado (PDF)",
            "Seguimiento personalizado (30 días)"
        ]
    ),

    "training_foundation": ProfessionalService(
        service_id="srv_training_foundation",
        name="Programa de Formación - Nivel Fundamentos",
        description="Curso intensivo de fundamentos de astrología (metodología Jon Landeta)",
        service_type=ServiceType.TRAINING_PROGRAM,
        category=ServiceCategory.TRAINING,
        duration_minutes=1200,  # 20 horas
        base_price=890.00,
        platform="Online + Materiales",
        includes=[
            "20 horas de formación en vivo",
            "Material didáctico completo",
            "Acceso a plataforma de aprendizaje",
            "Certificado de finalización",
            "Grupo privado de estudiantes",
            "3 meses de mentoría"
        ],
        prerequisites=[
            "Interés genuino en astrología",
            "Compromiso de asistencia"
        ]
    ),

    "therapy_session": ProfessionalService(
        service_id="srv_therapy_60",
        name="Sesión de Terapia/Coaching (60 min)",
        description="Sesión de terapia integrando astrología psicológica y coaching",
        service_type=ServiceType.THERAPY_SESSION,
        category=ServiceCategory.THERAPY,
        duration_minutes=60,
        base_price=180.00,
        platform="Online o Presencial",
        includes=[
            "Sesión terapéutica personalizada",
            "Enfoque astrológico-psicológico",
            "Ejercicios y herramientas prácticas",
            "Plan de acción personalizado",
            "Seguimiento entre sesiones"
        ]
    ),

    "personalized_chart_report": ProfessionalService(
        service_id="srv_chart_report",
        name="Carta Personalizada (Informe PDF)",
        description="Informe escrito y personalizado a partir de tu carta natal, con enfoque astrológico-psicológico",
        service_type=ServiceType.CHART_REPORT,
        category=ServiceCategory.CONSULTATION,
        duration_minutes=45,
        base_price=99.00,
        includes=[
            "Informe en PDF con lectura personalizada",
            "Puntos clave y recomendaciones prácticas",
            "Entrega digital (plazo a convenir)",
        ]
    )
}
