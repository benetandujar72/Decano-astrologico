"""
Modelos para tipos de informe personalizables
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from bson import ObjectId


class ModuleDefinition(BaseModel):
    """Definición de un módulo dentro de un tipo de informe"""
    id: str = Field(..., description="ID único del módulo (ej: modulo_1)")
    name: str = Field(..., description="Nombre descriptivo del módulo")
    required: bool = Field(default=True, description="Si el módulo es obligatorio")
    estimated_duration_sec: int = Field(default=240, description="Duración estimada en segundos")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "modulo_1",
                "name": "Introducción y Mapa Natal",
                "required": True,
                "estimated_duration_sec": 300
            }
        }


class ReportTypeCreate(BaseModel):
    """Schema para crear un nuevo tipo de informe"""
    code: str = Field(..., description="Código único (slug) del tipo de informe")
    name: str = Field(..., description="Nombre del tipo de informe")
    description: str = Field(..., description="Descripción del tipo de informe")
    icon: str = Field(default="📄", description="Icono/emoji representativo")
    folder_path: str = Field(..., description="Ruta a la carpeta de prompts")
    category: Literal["individual", "infantil", "sistemico", "clinico"] = Field(
        ...,
        description="Categoría del informe"
    )
    available_modules: List[ModuleDefinition] = Field(
        default_factory=list,
        description="Módulos disponibles para este tipo de informe"
    )
    min_plan_required: Literal["free", "premium", "enterprise"] = Field(
        default="free",
        description="Plan mínimo requerido para acceder"
    )
    is_active: bool = Field(default=True, description="Si el tipo está activo")
    is_beta: bool = Field(default=False, description="Si está en fase beta")

    class Config:
        json_schema_extra = {
            "example": {
                "code": "01_individual_adulto",
                "name": "Informe Individual Adulto",
                "description": "Análisis astrológico completo para adultos",
                "icon": "👤",
                "folder_path": "prompts/01_individual_adulto",
                "category": "individual",
                "min_plan_required": "free",
                "available_modules": [
                    {
                        "id": "modulo_1",
                        "name": "Introducción y Mapa Natal",
                        "required": True,
                        "estimated_duration_sec": 300
                    }
                ]
            }
        }


class ReportTypeUpdate(BaseModel):
    """Schema para actualizar un tipo de informe"""
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    folder_path: Optional[str] = None
    available_modules: Optional[List[ModuleDefinition]] = None
    min_plan_required: Optional[Literal["free", "premium", "enterprise"]] = None
    is_active: Optional[bool] = None
    is_beta: Optional[bool] = None


class ReportTypeResponse(BaseModel):
    """Schema de respuesta para tipo de informe"""
    id: str = Field(..., description="ID del tipo de informe")
    code: str
    name: str
    description: str
    icon: str
    category: str
    folder_path: str
    min_plan_required: str
    is_active: bool
    is_beta: bool
    available_modules: List[ModuleDefinition]
    default_prompt_id: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    version: int = Field(default=1, description="Versión del tipo de informe")

    # Campos calculados para el usuario actual
    can_access: bool = Field(default=False, description="Si el usuario puede acceder")
    has_default_template: bool = Field(default=False, description="Si tiene plantilla por defecto")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "507f1f77bcf86cd799439011",
                "code": "01_individual_adulto",
                "name": "Informe Individual Adulto",
                "description": "Análisis astrológico completo para adultos",
                "icon": "👤",
                "category": "individual",
                "folder_path": "prompts/01_individual_adulto",
                "min_plan_required": "free",
                "is_active": True,
                "is_beta": False,
                "can_access": True,
                "has_default_template": True
            }
        }


class ReportTypesListResponse(BaseModel):
    """Schema de respuesta para listado de tipos de informe"""
    report_types: List[ReportTypeResponse]
    total: int

    class Config:
        json_schema_extra = {
            "example": {
                "report_types": [],
                "total": 4
            }
        }
