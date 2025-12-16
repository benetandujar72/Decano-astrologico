"""
Modelos para sistema de consultas con experto IA
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from enum import Enum


class ConsultationStatus(str, Enum):
    """Estados de una consulta"""
    ACTIVE = "active"          # Consulta en curso
    COMPLETED = "completed"    # Consulta finalizada
    CANCELLED = "cancelled"    # Cancelada por el usuario


class MessageRole(str, Enum):
    """Roles en la conversación"""
    USER = "user"              # Mensaje del usuario
    ASSISTANT = "assistant"    # Respuesta del experto IA
    SYSTEM = "system"          # Mensaje del sistema


class ChatMessage(BaseModel):
    """Mensaje individual en una consulta"""
    message_id: str = Field(default_factory=lambda: f"msg_{int(datetime.utcnow().timestamp()*1000)}")
    role: MessageRole
    content: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

    class Config:
        json_schema_extra = {
            "example": {
                "message_id": "msg_1234567890",
                "role": "user",
                "content": "¿Qué significa tener Venus en Casa 7?",
                "timestamp": "2024-01-15T10:30:00Z"
            }
        }


class ExpertConsultation(BaseModel):
    """Consulta completa con experto IA"""
    consultation_id: str = Field(default_factory=lambda: f"cons_{int(datetime.utcnow().timestamp()*1000)}")
    user_id: str
    chart_id: Optional[str] = None  # ID de la carta asociada (si aplica)
    report_content: Optional[str] = None  # Contenido del informe para contexto

    status: ConsultationStatus = ConsultationStatus.ACTIVE
    messages: list[ChatMessage] = []

    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    completed_at: Optional[str] = None

    # Metadata
    total_messages: int = 0
    user_messages_count: int = 0
    ai_messages_count: int = 0

    class Config:
        json_schema_extra = {
            "example": {
                "consultation_id": "cons_1234567890",
                "user_id": "user_123",
                "chart_id": "chart_456",
                "status": "active",
                "messages": [
                    {
                        "message_id": "msg_1",
                        "role": "user",
                        "content": "¿Puedes explicarme más sobre mi Luna en Piscis?",
                        "timestamp": "2024-01-15T10:30:00Z"
                    },
                    {
                        "message_id": "msg_2",
                        "role": "assistant",
                        "content": "Tu Luna en Piscis indica una gran sensibilidad emocional...",
                        "timestamp": "2024-01-15T10:30:15Z"
                    }
                ],
                "created_at": "2024-01-15T10:30:00Z",
                "total_messages": 2
            }
        }


class StartConsultationRequest(BaseModel):
    """Request para iniciar una consulta"""
    chart_id: Optional[str] = None
    report_content: Optional[str] = None
    initial_question: str  # Primera pregunta del usuario

    class Config:
        json_schema_extra = {
            "example": {
                "chart_id": "chart_456",
                "report_content": "Análisis de carta natal...",
                "initial_question": "¿Qué significa tener Sol en Casa 10?"
            }
        }


class SendMessageRequest(BaseModel):
    """Request para enviar un mensaje"""
    message: str

    class Config:
        json_schema_extra = {
            "example": {
                "message": "¿Y qué aspectos tiene mi Sol?"
            }
        }


class ConsultationUsageStats(BaseModel):
    """Estadísticas de uso de consultas para un usuario"""
    user_id: str
    tier: str
    consultations_this_month: int
    consultations_limit: int  # -1 = ilimitado
    remaining_consultations: int  # -1 = ilimitado
    can_create_consultation: bool

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user_123",
                "tier": "pro",
                "consultations_this_month": 0,
                "consultations_limit": 1,
                "remaining_consultations": 1,
                "can_create_consultation": True
            }
        }
