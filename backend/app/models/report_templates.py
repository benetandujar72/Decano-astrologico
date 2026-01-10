"""
Modelos para plantillas de informes personalizables
"""
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List, Literal
from datetime import datetime


class TypographyConfig(BaseModel):
    """Configuración de tipografía"""
    font_family: str = Field(
        default="Merriweather",
        description="Familia de fuente"
    )
    font_size_base: int = Field(
        default=12,
        ge=8,
        le=24,
        description="Tamaño base en pt"
    )
    font_color_primary: str = Field(
        default="#1e293b",
        description="Color primario (hex)"
    )
    font_color_secondary: str = Field(
        default="#64748b",
        description="Color secundario (hex)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "font_family": "Merriweather",
                "font_size_base": 12,
                "font_color_primary": "#1e293b",
                "font_color_secondary": "#64748b"
            }
        }


class ColorScheme(BaseModel):
    """Esquema de colores"""
    primary: str = Field(default="#4f46e5", description="Color primario (hex)")
    secondary: str = Field(default="#f59e0b", description="Color secundario (hex)")
    background: str = Field(default="#ffffff", description="Color de fondo (hex)")

    class Config:
        json_schema_extra = {
            "example": {
                "primary": "#4f46e5",
                "secondary": "#f59e0b",
                "background": "#ffffff"
            }
        }


class BrandingConfig(BaseModel):
    """Configuración de branding"""
    logo_url: Optional[str] = Field(default=None, description="URL del logo")
    logo_size: Literal["small", "medium", "large"] = Field(
        default="medium",
        description="Tamaño del logo"
    )
    logo_position: Literal["top-left", "top-center", "top-right"] = Field(
        default="top-center",
        description="Posición del logo"
    )
    title: str = Field(
        default="Informe Astrológico Personal",
        description="Título del informe"
    )
    title_auto_generate: bool = Field(
        default=True,
        description="Generar título automáticamente con variables"
    )
    typography: TypographyConfig = Field(
        default_factory=TypographyConfig,
        description="Configuración de tipografía"
    )
    color_scheme: ColorScheme = Field(
        default_factory=ColorScheme,
        description="Esquema de colores"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "logo_url": "https://storage.example.com/logo.png",
                "logo_size": "medium",
                "logo_position": "top-center",
                "title": "Informe Astrológico Personal",
                "title_auto_generate": False
            }
        }


class ContentConfig(BaseModel):
    """Configuración de contenido"""
    header_image_url: Optional[str] = Field(
        default=None,
        description="URL de imagen de encabezado"
    )
    footer_text: str = Field(
        default="© 2026 Fraktal Astrology",
        description="Texto del pie de página"
    )
    modules_to_print: List[str] = Field(
        default_factory=lambda: ["modulo_1"],
        description="IDs de módulos a incluir"
    )
    report_mode: Literal["resumen", "completo", "exhaustivo"] = Field(
        default="completo",
        description="Modo del informe"
    )
    include_chart_images: bool = Field(default=True, description="Incluir imágenes de carta")
    include_aspects_table: bool = Field(default=True, description="Incluir tabla de aspectos")
    include_planetary_table: bool = Field(default=True, description="Incluir tabla planetaria")
    language: str = Field(default="es", description="Idioma (ISO 639-1)")
    page_size: Literal["A4", "Letter"] = Field(default="A4", description="Tamaño de página")
    page_orientation: Literal["portrait", "landscape"] = Field(
        default="portrait",
        description="Orientación de página"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "modules_to_print": ["modulo_1", "modulo_2_fundamentos"],
                "report_mode": "completo",
                "include_chart_images": True,
                "language": "es",
                "page_size": "A4"
            }
        }


class AdvancedConfig(BaseModel):
    """Configuración avanzada (premium/enterprise)"""
    custom_css: Optional[str] = Field(
        default=None,
        description="CSS personalizado"
    )
    watermark_text: Optional[str] = Field(
        default=None,
        description="Texto de marca de agua"
    )
    encryption_enabled: bool = Field(
        default=False,
        description="Habilitar encriptación PDF"
    )
    password_protected: bool = Field(
        default=False,
        description="Proteger con contraseña"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "watermark_text": "BORRADOR",
                "encryption_enabled": False,
                "password_protected": False
            }
        }


class TemplateCreate(BaseModel):
    """Schema para crear una plantilla"""
    name: str = Field(..., min_length=1, max_length=100, description="Nombre de la plantilla")
    report_type_id: str = Field(..., description="ID del tipo de informe asociado")
    is_public: bool = Field(default=False, description="Compartir públicamente")
    branding: BrandingConfig = Field(default_factory=BrandingConfig)
    content: ContentConfig = Field(default_factory=ContentConfig)
    advanced: AdvancedConfig = Field(default_factory=AdvancedConfig)

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Mi Plantilla Personalizada",
                "report_type_id": "507f1f77bcf86cd799439011",
                "is_public": False,
                "branding": {
                    "title": "Informe Astrológico Personal"
                },
                "content": {
                    "modules_to_print": ["modulo_1", "modulo_2_fundamentos"],
                    "report_mode": "completo"
                }
            }
        }


class TemplateUpdate(BaseModel):
    """Schema para actualizar una plantilla"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    is_public: Optional[bool] = None
    branding: Optional[BrandingConfig] = None
    content: Optional[ContentConfig] = None
    advanced: Optional[AdvancedConfig] = None


class TemplateResponse(BaseModel):
    """Schema de respuesta para plantilla"""
    id: str = Field(..., description="ID de la plantilla")
    name: str
    report_type_id: str
    report_type_name: Optional[str] = None
    owner_id: str
    is_public: bool
    is_default: bool
    branding: BrandingConfig
    content: ContentConfig
    advanced: Optional[AdvancedConfig] = None
    usage_count: int = Field(default=0, description="Veces que se ha usado")
    last_used_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    is_deleted: bool = Field(default=False)
    preview_image_url: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "id": "507f1f77bcf86cd799439014",
                "name": "Mi Plantilla Personalizada",
                "report_type_id": "507f1f77bcf86cd799439011",
                "report_type_name": "Individual Adulto",
                "owner_id": "507f1f77bcf86cd799439001",
                "is_public": False,
                "is_default": False,
                "usage_count": 5,
                "created_at": "2026-01-10T00:00:00Z"
            }
        }


class TemplatesListResponse(BaseModel):
    """Schema de respuesta para listado de plantillas"""
    templates: List[TemplateResponse]
    total: int
    user_limit: int = Field(default=5, description="Límite de plantillas según plan")

    class Config:
        json_schema_extra = {
            "example": {
                "templates": [],
                "total": 3,
                "user_limit": 5
            }
        }
