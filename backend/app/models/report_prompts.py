"""
Modelos para prompts vinculados a tipos de informe
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Literal, Dict, Any
from datetime import datetime


class PromptVariable(BaseModel):
    """Definición de una variable del prompt"""
    name: str = Field(..., description="Nombre de la variable (ej: nombre)")
    type: Literal["string", "number", "date", "object", "boolean"] = Field(
        ...,
        description="Tipo de dato"
    )
    required: bool = Field(default=True, description="Si es obligatoria")
    description: Optional[str] = Field(None, description="Descripción de la variable")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "nombre",
                "type": "string",
                "required": True,
                "description": "Nombre completo de la persona"
            }
        }


class SafetySettings(BaseModel):
    """Configuración de seguridad del LLM"""
    harm_category_harassment: Literal[
        "BLOCK_NONE",
        "BLOCK_LOW_AND_ABOVE",
        "BLOCK_MEDIUM_AND_ABOVE",
        "BLOCK_ONLY_HIGH"
    ] = Field(default="BLOCK_MEDIUM_AND_ABOVE")

    harm_category_hate_speech: Literal[
        "BLOCK_NONE",
        "BLOCK_LOW_AND_ABOVE",
        "BLOCK_MEDIUM_AND_ABOVE",
        "BLOCK_ONLY_HIGH"
    ] = Field(default="BLOCK_MEDIUM_AND_ABOVE")

    harm_category_sexually_explicit: Literal[
        "BLOCK_NONE",
        "BLOCK_LOW_AND_ABOVE",
        "BLOCK_MEDIUM_AND_ABOVE",
        "BLOCK_ONLY_HIGH"
    ] = Field(default="BLOCK_MEDIUM_AND_ABOVE")

    harm_category_dangerous_content: Literal[
        "BLOCK_NONE",
        "BLOCK_LOW_AND_ABOVE",
        "BLOCK_MEDIUM_AND_ABOVE",
        "BLOCK_ONLY_HIGH"
    ] = Field(default="BLOCK_MEDIUM_AND_ABOVE")


class PromptCreate(BaseModel):
    """Schema para crear un prompt"""
    report_type_id: str = Field(..., description="ID del tipo de informe asociado")
    system_instruction: str = Field(..., min_length=10, description="Instrucción del sistema")
    user_prompt_template: str = Field(
        ...,
        min_length=10,
        description="Template del prompt del usuario con variables"
    )
    variables: List[PromptVariable] = Field(
        default_factory=list,
        description="Variables disponibles en el prompt"
    )
    llm_provider: Literal["gemini", "openai", "claude"] = Field(
        default="gemini",
        description="Proveedor del LLM"
    )
    model: str = Field(
        default="gemini-3-pro-preview",
        description="Modelo específico"
    )
    temperature: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Temperatura del modelo"
    )
    max_tokens: int = Field(
        default=8000,
        ge=100,
        le=32000,
        description="Máximo de tokens"
    )
    safety_settings: SafetySettings = Field(
        default_factory=SafetySettings,
        description="Configuración de seguridad"
    )
    is_default: bool = Field(
        default=True,
        description="Si es el prompt por defecto"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "report_type_id": "507f1f77bcf86cd799439011",
                "system_instruction": "Eres un astrólogo profesional...",
                "user_prompt_template": "Genera un informe para {nombre}, nacido el {fecha_nacimiento}...",
                "variables": [
                    {
                        "name": "nombre",
                        "type": "string",
                        "required": True
                    }
                ],
                "model": "gemini-3-pro-preview",
                "temperature": 0.7
            }
        }


class PromptUpdate(BaseModel):
    """Schema para actualizar un prompt"""
    system_instruction: Optional[str] = Field(None, min_length=10)
    user_prompt_template: Optional[str] = Field(None, min_length=10)
    variables: Optional[List[PromptVariable]] = None
    model: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=0.0, le=1.0)
    max_tokens: Optional[int] = Field(None, ge=100, le=32000)
    safety_settings: Optional[SafetySettings] = None
    is_active: Optional[bool] = None
    change_reason: Optional[str] = Field(
        None,
        description="Motivo del cambio (para versionado)"
    )


class PromptResponse(BaseModel):
    """Schema de respuesta para prompt"""
    id: str = Field(..., description="ID del prompt")
    report_type_id: str
    version: int = Field(default=1, description="Versión del prompt")
    system_instruction: str
    user_prompt_template: str
    variables: List[PromptVariable]
    llm_provider: str
    model: str
    temperature: float
    max_tokens: int
    safety_settings: SafetySettings
    is_default: bool
    is_active: bool
    customized_by: Optional[str] = Field(
        None,
        description="ID del usuario que lo personalizó (null si es default)"
    )
    created_at: datetime
    updated_at: datetime
    can_edit: bool = Field(
        default=False,
        description="Si el usuario actual puede editarlo"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "id": "507f1f77bcf86cd799439013",
                "report_type_id": "507f1f77bcf86cd799439011",
                "version": 3,
                "system_instruction": "Eres un astrólogo profesional...",
                "user_prompt_template": "Genera un informe...",
                "is_default": True,
                "is_active": True,
                "can_edit": False
            }
        }


class PromptResolveRequest(BaseModel):
    """Request para resolver un prompt con variables"""
    report_type_id: str
    template_id: Optional[str] = None
    variables: Dict[str, Any] = Field(
        default_factory=dict,
        description="Variables para inyectar en el prompt"
    )


class PromptResolveResponse(BaseModel):
    """Respuesta con prompt resuelto listo para ejecutar"""
    prompt_id: str
    version: int
    system_instruction: str
    user_prompt: str  # Ya con variables inyectadas
    llm_config: Dict[str, Any] = Field(
        default_factory=dict,
        description="Configuración del LLM"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "prompt_id": "507f1f77bcf86cd799439013",
                "version": 3,
                "system_instruction": "Eres un astrólogo profesional...",
                "user_prompt": "Genera un informe para Juan Pérez...",
                "llm_config": {
                    "model": "gemini-3-pro-preview",
                    "temperature": 0.7,
                    "max_tokens": 8000
                }
            }
        }
