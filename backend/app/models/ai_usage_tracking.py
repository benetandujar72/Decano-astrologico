"""
Modelos para tracking de uso de IA y tokens
Sistema de trazabilidad forense para gasto de IA
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum

class AIActionType(str, Enum):
    """Tipos de acciones que consumen tokens"""
    REPORT_MODULE_GENERATION = "report_module_generation"
    FULL_REPORT_GENERATION = "full_report_generation"
    EXPERT_CHAT = "expert_chat"
    DEMO_CHAT = "demo_chat"
    WELCOME_MESSAGE = "welcome_message"

class AIUsageRecord(BaseModel):
    """Registro de uso de IA con trazabilidad completa"""
    user_id: str = Field(..., description="ID del usuario que realizó la acción")
    user_name: str = Field(..., description="Nombre del usuario")
    action_type: AIActionType = Field(..., description="Tipo de acción realizada")
    model_used: str = Field(..., description="Modelo de IA utilizado")
    
    # Información de tokens
    prompt_tokens: int = Field(..., description="Tokens del prompt")
    response_tokens: int = Field(..., description="Tokens de la respuesta")
    total_tokens: int = Field(..., description="Total de tokens consumidos")
    
    # Información de costo (estimado)
    estimated_cost_usd: float = Field(..., description="Costo estimado en USD")
    
    # Contexto de la acción
    session_id: Optional[str] = Field(None, description="ID de sesión si aplica")
    module_id: Optional[str] = Field(None, description="ID del módulo si es generación de informe")
    chart_id: Optional[str] = Field(None, description="ID de la carta astral si aplica")
    
    # Metadatos adicionales
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Metadatos adicionales")
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Fecha y hora de la acción")
    
    # Trazabilidad forense
    ip_address: Optional[str] = Field(None, description="IP del usuario (si disponible)")
    user_agent: Optional[str] = Field(None, description="User agent del navegador")
    request_id: Optional[str] = Field(None, description="ID único de la solicitud para trazabilidad")

class AIUsageStats(BaseModel):
    """Estadísticas agregadas de uso de IA"""
    total_actions: int = Field(..., description="Total de acciones realizadas")
    total_tokens: int = Field(..., description="Total de tokens consumidos")
    total_cost_usd: float = Field(..., description="Costo total estimado en USD")
    by_action_type: Dict[str, Dict[str, Any]] = Field(default_factory=dict, description="Estadísticas por tipo de acción")
    by_user: Dict[str, Dict[str, Any]] = Field(default_factory=dict, description="Estadísticas por usuario")
    by_date: Dict[str, Dict[str, Any]] = Field(default_factory=dict, description="Estadísticas por fecha")
