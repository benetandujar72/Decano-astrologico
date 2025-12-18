"""
Modelos de suscripción y pagos
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from enum import Enum


class SubscriptionTier(str, Enum):
    """Niveles de suscripción"""
    FREE = "free"
    PRO = "pro"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


class PaymentMethod(str, Enum):
    """Métodos de pago"""
    CARD = "card"              # Tarjeta (Stripe)
    PAYPAL = "paypal"          # PayPal
    BIZUM = "bizum"            # Bizum (España)
    REVOLUT = "revolut"        # Revolut
    BANK_TRANSFER = "bank_transfer"  # Transferencia


class PaymentStatus(str, Enum):
    """Estados de pago"""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"


class SubscriptionPlan(BaseModel):
    """Plan de suscripción"""
    tier: SubscriptionTier
    name: str
    price_monthly: float
    price_yearly: float
    features: list[str]
    max_charts: int  # -1 = ilimitado
    max_storage_mb: int
    can_export_pdf: bool
    can_export_docx: bool
    can_export_html: bool
    can_use_advanced_techniques: bool  # Tránsitos, Progresiones, etc.
    can_use_synastry: bool  # Sinastría
    can_use_solar_return: bool  # Revolución Solar
    can_customize_prompts: bool
    priority_support: bool

    # Nuevos privilegios para sistema de expertos y servicios profesionales
    can_access_expert_chat: bool  # Acceso a chat con experto IA
    expert_consultations_per_month: int  # Número de consultas mensuales con experto IA (-1 = ilimitado)
    can_access_professional_services: bool  # Acceso a servicios de Jon Landeta
    professional_services_discount: int  # Porcentaje de descuento en servicios profesionales (0-100)

    # Capacitación y formación
    can_access_training: bool  # Acceso a programas de capacitación
    training_credits_per_year: int  # Créditos de capacitación por año (-1 = ilimitado, 0 = sin acceso)
    can_contact_jon_landeta: bool  # Puede contactar directamente con Jon Landeta
    
    class Config:
        json_schema_extra = {
            "example": {
                "tier": "pro",
                "name": "Plan Profesional",
                "price_monthly": 19.99,
                "price_yearly": 199.99,
                "features": [
                    "Cartas natales ilimitadas",
                    "Exportación PDF/DOCX/HTML",
                    "Tránsitos y Progresiones",
                    "Soporte prioritario",
                    "1 consulta con experto IA por mes"
                ],
                "max_charts": -1,
                "max_storage_mb": 5000,
                "can_export_pdf": True,
                "can_export_docx": True,
                "can_export_html": True,
                "can_use_advanced_techniques": True,
                "can_use_synastry": True,
                "can_use_solar_return": True,
                "can_customize_prompts": False,
                "priority_support": True,
                "can_access_expert_chat": True,
                "expert_consultations_per_month": 1,
                "can_access_professional_services": False,
                "professional_services_discount": 0,
                "can_access_training": False,
                "training_credits_per_year": 0,
                "can_contact_jon_landeta": True
            }
        }


class UserSubscription(BaseModel):
    """Suscripción de usuario"""
    user_id: str
    tier: SubscriptionTier
    status: Literal["active", "cancelled", "expired", "trial"]
    start_date: str  # ISO format
    end_date: str  # ISO format
    auto_renew: bool
    payment_method: Optional[PaymentMethod] = None
    last_payment_date: Optional[str] = None
    next_billing_date: Optional[str] = None
    trial_end_date: Optional[str] = None

    # Integración con Stripe
    stripe_customer_id: Optional[str] = None  # ID del customer en Stripe (cus_...)
    stripe_subscription_id: Optional[str] = None  # ID de la suscripción en Stripe (sub_...)
    stripe_session_id: Optional[str] = None  # ID de la última sesión de checkout (cs_...)
    payment_status: Literal["pending", "completed", "failed"] = "pending"
    billing_cycle: Literal["monthly", "yearly"] = "monthly"


class Payment(BaseModel):
    """Registro de pago"""
    payment_id: str = Field(default_factory=lambda: str(datetime.now().timestamp()))
    user_id: str
    amount: float
    currency: str = "EUR"
    method: PaymentMethod
    status: PaymentStatus
    description: str
    invoice_id: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    completed_at: Optional[str] = None
    
    # Detalles específicos del método
    stripe_payment_intent_id: Optional[str] = None
    paypal_order_id: Optional[str] = None
    bizum_reference: Optional[str] = None
    revolut_transaction_id: Optional[str] = None
    bank_transfer_reference: Optional[str] = None


class Invoice(BaseModel):
    """Factura"""
    invoice_id: str = Field(default_factory=lambda: f"INV-{int(datetime.now().timestamp())}")
    invoice_number: str  # Número secuencial: 2024-001, 2024-002, etc.
    user_id: str
    
    # Datos del cliente
    client_name: str
    client_email: str
    client_address: Optional[str] = None
    client_tax_id: Optional[str] = None  # NIF/CIF
    
    # Datos de la factura
    issue_date: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    due_date: Optional[str] = None
    
    # Líneas de factura
    items: list[dict]  # [{"description": "...", "quantity": 1, "price": 19.99, "tax": 21}]
    
    # Totales
    subtotal: float
    tax_amount: float
    total: float
    
    # Estado
    status: Literal["draft", "sent", "paid", "overdue", "cancelled"]
    paid_date: Optional[str] = None
    payment_id: Optional[str] = None
    
    # Notas
    notes: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "invoice_number": "2024-001",
                "user_id": "user_123",
                "client_name": "Juan Pérez",
                "client_email": "juan@example.com",
                "items": [
                    {
                        "description": "Suscripción Pro - Mensual",
                        "quantity": 1,
                        "price": 19.99,
                        "tax": 21
                    }
                ],
                "subtotal": 19.99,
                "tax_amount": 4.20,
                "total": 24.19,
                "status": "sent"
            }
        }


class Quote(BaseModel):
    """Presupuesto"""
    quote_id: str = Field(default_factory=lambda: f"QUO-{int(datetime.now().timestamp())}")
    quote_number: str
    user_id: str
    
    # Datos del cliente
    client_name: str
    client_email: str
    client_company: Optional[str] = None
    
    # Datos del presupuesto
    issue_date: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    valid_until: str  # Fecha de validez
    
    # Líneas del presupuesto
    items: list[dict]
    
    # Totales
    subtotal: float
    tax_amount: float
    total: float
    
    # Estado
    status: Literal["draft", "sent", "accepted", "rejected", "expired"]
    
    # Conversión a factura
    converted_to_invoice: bool = False
    invoice_id: Optional[str] = None
    
    # Notas
    terms: Optional[str] = None
    notes: Optional[str] = None


# Planes predefinidos
SUBSCRIPTION_PLANS = {
    SubscriptionTier.FREE: SubscriptionPlan(
        tier=SubscriptionTier.FREE,
        name="Plan Gratuito",
        price_monthly=0.00,
        price_yearly=0.00,
        features=[
            "5 cartas natales por mes",
            "Exportación PDF",
            "Exportación HTML básica",
            "Análisis estándar",
            "Almacenamiento 500MB",
            "Contacto con Jon Landeta"
        ],
        max_charts=5,
        max_storage_mb=500,
        can_export_pdf=True,
        can_export_docx=False,
        can_export_html=True,
        can_use_advanced_techniques=False,
        can_use_synastry=False,
        can_use_solar_return=False,
        can_customize_prompts=False,
        priority_support=False,
        can_access_expert_chat=False,
        expert_consultations_per_month=0,
        can_access_professional_services=False,
        professional_services_discount=0,
        can_access_training=False,
        training_credits_per_year=0,
        can_contact_jon_landeta=True  # Todos pueden contactar con Jon
    ),
    
    SubscriptionTier.PRO: SubscriptionPlan(
        tier=SubscriptionTier.PRO,
        name="Plan Profesional",
        price_monthly=19.99,
        price_yearly=199.99,  # 2 meses gratis
        features=[
            "Cartas natales ilimitadas",
            "Exportación PDF/DOCX/HTML",
            "Tránsitos y Progresiones",
            "Revolución Solar",
            "Almacenamiento 5GB",
            "Soporte prioritario",
            "1 consulta con experto IA por mes",
            "Contacto con Jon Landeta",
            "1 crédito de capacitación anual"
        ],
        max_charts=-1,  # Ilimitado
        max_storage_mb=5000,
        can_export_pdf=True,
        can_export_docx=True,
        can_export_html=True,
        can_use_advanced_techniques=True,
        can_use_synastry=True,
        can_use_solar_return=True,
        can_customize_prompts=False,
        priority_support=True,
        can_access_expert_chat=True,
        expert_consultations_per_month=1,
        can_access_professional_services=False,
        professional_services_discount=0,
        can_access_training=True,
        training_credits_per_year=1,
        can_contact_jon_landeta=True
    ),
    
    SubscriptionTier.PREMIUM: SubscriptionPlan(
        tier=SubscriptionTier.PREMIUM,
        name="Plan Premium",
        price_monthly=49.99,
        price_yearly=499.99,  # 2 meses gratis
        features=[
            "Todo del Plan Pro",
            "Sinastría y Compuestas",
            "Direcciones Primarias",
            "Prompts personalizados",
            "Análisis 3D interactivo",
            "Almacenamiento 20GB",
            "Soporte 24/7",
            "API privada",
            "3 consultas con experto IA por mes",
            "Acceso a servicios de Jon Landeta",
            "10% descuento en servicios profesionales",
            "Contacto con Jon Landeta",
            "3 créditos de capacitación anuales"
        ],
        max_charts=-1,
        max_storage_mb=20000,
        can_export_pdf=True,
        can_export_docx=True,
        can_export_html=True,
        can_use_advanced_techniques=True,
        can_use_synastry=True,
        can_use_solar_return=True,
        can_customize_prompts=True,
        priority_support=True,
        can_access_expert_chat=True,
        expert_consultations_per_month=3,
        can_access_professional_services=True,
        professional_services_discount=10,
        can_access_training=True,
        training_credits_per_year=3,
        can_contact_jon_landeta=True
    ),
    
    SubscriptionTier.ENTERPRISE: SubscriptionPlan(
        tier=SubscriptionTier.ENTERPRISE,
        name="Plan Empresarial",
        price_monthly=199.99,
        price_yearly=1999.99,
        features=[
            "Todo del Plan Premium",
            "Usuarios ilimitados",
            "Marca personalizada",
            "Servidor dedicado",
            "SLA 99.9%",
            "Gestor de cuenta",
            "Integraciones personalizadas",
            "Formación incluida",
            "Consultas ilimitadas con experto IA",
            "Acceso prioritario a Jon Landeta",
            "20% descuento en servicios profesionales",
            "Contacto directo con Jon Landeta",
            "Capacitación ilimitada"
        ],
        max_charts=-1,
        max_storage_mb=-1,  # Ilimitado
        can_export_pdf=True,
        can_export_docx=True,
        can_export_html=True,
        can_use_advanced_techniques=True,
        can_use_synastry=True,
        can_use_solar_return=True,
        can_customize_prompts=True,
        priority_support=True,
        can_access_expert_chat=True,
        expert_consultations_per_month=-1,  # Ilimitado
        can_access_professional_services=True,
        professional_services_discount=20,
        can_access_training=True,
        training_credits_per_year=-1,  # Ilimitado
        can_contact_jon_landeta=True
    )
}

