"""
Modelos para gestión de sesiones de usuario
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timedelta


class UserSession(BaseModel):
    """Sesión activa de un usuario (para auditoría y control)"""
    # Identificadores
    user_id: str
    session_id: str  # Hash único del JWT
    token_hash: str  # Hash del token para validación

    # Información de sesión
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    last_activity: datetime = Field(default_factory=datetime.utcnow)

    # Información del cliente
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    device_type: Optional[str] = None  # "desktop", "mobile", "tablet"
    browser: Optional[str] = None

    # Estado
    is_active: bool = True
    logout_at: Optional[datetime] = None

    # Metadatos
    login_method: str = "password"  # "password", "oauth", "magic_link"

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "507f1f77bcf86cd799439011",
                "session_id": "sess_abc123xyz",
                "token_hash": "sha256hash...",
                "expires_at": "2025-01-14T12:00:00Z",
                "ip_address": "192.168.1.1",
                "user_agent": "Mozilla/5.0...",
                "device_type": "desktop",
                "browser": "Chrome",
                "is_active": True,
                "login_method": "password"
            }
        }


def create_session_expiry(hours: int = 24) -> datetime:
    """Crea fecha de expiración de sesión"""
    return datetime.utcnow() + timedelta(hours=hours)
