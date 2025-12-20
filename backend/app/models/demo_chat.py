"""
Modelos para el sistema de demo interactiva con IA (Gemini)
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class DemoStep(str, Enum):
    """Pasos del proceso de generación de informe demo"""
    INITIAL = "initial"                  # Inicio, saludo
    DATA_COLLECTION = "data_collection"  # Recolección de datos (si no se pasaron)
    ELEMENTS = "elements"                # Balance de elementos
    PLANETS = "planets"                  # Análisis planetario
    ASPECTS = "aspects"                  # Sistema de aspectos
    HOUSES = "houses"                    # Casas y ejes
    SYNTHESIS = "synthesis"              # Síntesis transpersonal
    COMPLETED = "completed"              # Finalizado

class MessageRole(str, Enum):
    """Roles en la conversación"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

class DemoMessage(BaseModel):
    """Mensaje en la sesión de demo"""
    message_id: str = Field(default_factory=lambda: f"msg_{int(datetime.utcnow().timestamp()*1000)}")
    role: MessageRole
    content: str
    step: DemoStep  # En qué paso se generó este mensaje
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class DemoSession(BaseModel):
    """Sesión de demo interactiva"""
    session_id: str = Field(default_factory=lambda: f"demo_{int(datetime.utcnow().timestamp()*1000)}")
    user_id: Optional[str] = None  # Puede ser anónimo al principio
    
    # Datos de la carta (si se tienen)
    chart_data: Optional[Dict[str, Any]] = None
    
    # Estado actual
    current_step: DemoStep = DemoStep.INITIAL
    messages: List[DemoMessage] = []
    
    # Informe generado progresivamente
    generated_report: Dict[str, str] = {}  # step -> content
    
    # Flag virtual para el frontend
    pdf_generated: bool = False

    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    is_active: bool = True

class StartDemoRequest(BaseModel):
    """Request para iniciar demo"""
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    birth_date: Optional[str] = None
    birth_time: Optional[str] = None
    birth_place: Optional[str] = None
    # Opcionalmente pasar datos ya calculados si el frontend ya los tiene
    chart_data: Optional[Dict[str, Any]] = None

class ChatDemoRequest(BaseModel):
    """Request para enviar mensaje en demo"""
    session_id: str
    message: str
    next_step: bool = False  # Si true, fuerza avanzar al siguiente paso
