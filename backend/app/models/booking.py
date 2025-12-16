"""
Modelos para sistema de reservas de servicios profesionales
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from enum import Enum


class BookingStatus(str, Enum):
    """Estados de una reserva"""
    PENDING_PAYMENT = "pending_payment"    # Pendiente de pago
    CONFIRMED = "confirmed"                # Confirmada y pagada
    PENDING_SCHEDULING = "pending_scheduling"  # Pendiente de agendar fecha/hora
    SCHEDULED = "scheduled"                # Agendada con fecha y hora
    COMPLETED = "completed"                # Completada
    CANCELLED = "cancelled"                # Cancelada
    NO_SHOW = "no_show"                   # Usuario no se presentó


class PaymentStatus(str, Enum):
    """Estados de pago de una reserva"""
    PENDING = "pending"
    PAID = "paid"
    REFUNDED = "refunded"
    FAILED = "failed"


class ServiceBooking(BaseModel):
    """Reserva de un servicio profesional"""
    booking_id: str = Field(default_factory=lambda: f"bkg_{int(datetime.utcnow().timestamp()*1000)}")

    # Información del usuario y servicio
    user_id: str
    service_id: str
    service_name: str  # Nombre del servicio (para histórico)
    service_type: str  # Tipo de servicio

    # Estado de la reserva
    status: BookingStatus = BookingStatus.PENDING_PAYMENT
    payment_status: PaymentStatus = PaymentStatus.PENDING

    # Programación
    scheduled_date: Optional[str] = None  # Fecha programada (ISO format)
    scheduled_time: Optional[str] = None  # Hora programada
    timezone: str = "Europe/Madrid"
    duration_minutes: int

    # Ubicación/Plataforma
    location: Optional[str] = None      # Para servicios presenciales
    platform: Optional[str] = None      # Para servicios online
    meeting_link: Optional[str] = None  # Link de la videollamada (generado al confirmar)

    # Pago
    base_price: float
    discount_applied: float = 0.0  # Descuento aplicado (porcentaje)
    final_price: float  # Precio final a pagar
    currency: str = "EUR"
    payment_method: Optional[str] = None
    stripe_payment_intent_id: Optional[str] = None
    stripe_session_id: Optional[str] = None

    # Información adicional
    user_notes: Optional[str] = None  # Notas del usuario
    admin_notes: Optional[str] = None  # Notas internas del administrador

    # Datos del usuario (para email/contacto)
    user_email: str
    user_name: str
    user_phone: Optional[str] = None

    # Fechas de control
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    confirmed_at: Optional[str] = None
    completed_at: Optional[str] = None
    cancelled_at: Optional[str] = None
    cancellation_reason: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "booking_id": "bkg_1234567890",
                "user_id": "user_123",
                "service_id": "srv_online_60",
                "service_name": "Consulta Online (60 min)",
                "service_type": "online_consultation",
                "status": "scheduled",
                "payment_status": "paid",
                "scheduled_date": "2024-02-15",
                "scheduled_time": "15:00",
                "timezone": "Europe/Madrid",
                "duration_minutes": 60,
                "platform": "Zoom",
                "meeting_link": "https://zoom.us/j/123456789",
                "base_price": 150.00,
                "discount_applied": 10.0,
                "final_price": 135.00,
                "currency": "EUR",
                "user_email": "usuario@ejemplo.com",
                "user_name": "Juan Pérez",
                "user_notes": "Interesado en conocer mi vocación profesional",
                "created_at": "2024-01-15T10:00:00Z"
            }
        }


class CreateBookingRequest(BaseModel):
    """Request para crear una nueva reserva"""
    service_id: str
    user_notes: Optional[str] = None
    preferred_date: Optional[str] = None  # Fecha preferida (opcional)
    preferred_time: Optional[str] = None  # Hora preferida (opcional)
    user_phone: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "service_id": "srv_online_60",
                "user_notes": "Me gustaría enfocarme en mi carta solar",
                "preferred_date": "2024-02-15",
                "preferred_time": "15:00",
                "user_phone": "+34 666 777 888"
            }
        }


class UpdateBookingRequest(BaseModel):
    """Request para actualizar una reserva (admin)"""
    status: Optional[BookingStatus] = None
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    meeting_link: Optional[str] = None
    admin_notes: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "status": "scheduled",
                "scheduled_date": "2024-02-15",
                "scheduled_time": "15:00",
                "meeting_link": "https://zoom.us/j/123456789",
                "admin_notes": "Cliente confirmó disponibilidad"
            }
        }


class CancelBookingRequest(BaseModel):
    """Request para cancelar una reserva"""
    reason: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "reason": "Incompatibilidad de horarios"
            }
        }


class BookingStats(BaseModel):
    """Estadísticas de reservas"""
    total_bookings: int
    pending_payment: int
    confirmed: int
    scheduled: int
    completed: int
    cancelled: int
    total_revenue: float
    upcoming_bookings: int

    class Config:
        json_schema_extra = {
            "example": {
                "total_bookings": 45,
                "pending_payment": 3,
                "confirmed": 5,
                "scheduled": 8,
                "completed": 25,
                "cancelled": 4,
                "total_revenue": 5250.00,
                "upcoming_bookings": 13
            }
        }
