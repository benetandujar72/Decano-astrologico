"""
Servicio de integración con Stripe para procesamiento de pagos y suscripciones.

Este servicio maneja:
1. Creación de Checkout Sessions para pagos
2. Verificación de webhooks de Stripe
3. Gestión de customers de Stripe
4. Procesamiento de eventos de pago

Seguridad:
- Nunca almacena datos de tarjetas (Stripe lo hace)
- Verifica firmas de webhooks
- Usa modo test para desarrollo
"""
import stripe
import os
from typing import Dict, Optional, Tuple
from datetime import datetime, timedelta
import hmac
import hashlib

# Configurar Stripe con la clave secreta
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# URLs de redireccionamiento
SUCCESS_URL = os.getenv("STRIPE_SUCCESS_URL", "http://localhost:5173/subscription-success")
CANCEL_URL = os.getenv("STRIPE_CANCEL_URL", "http://localhost:5173/plans")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")


async def create_stripe_customer(user_email: str, user_id: str, username: str) -> str:
    """
    Crea un customer en Stripe para asociar pagos al usuario.

    Args:
        user_email: Email del usuario
        user_id: ID del usuario en MongoDB
        username: Nombre de usuario

    Returns:
        ID del customer en Stripe (cus_...)

    Raises:
        stripe.error.StripeError: Si falla la creación
    """
    try:
        customer = stripe.Customer.create(
            email=user_email,
            metadata={
                "user_id": user_id,
                "username": username
            },
            description=f"Usuario FRAKTAL: {username}"
        )
        return customer.id
    except stripe.error.StripeError as e:
        print(f"❌ Error creando Stripe customer: {e}")
        raise


async def create_checkout_session(
    user_id: str,
    user_email: str,
    plan_id: str,
    plan_name: str,
    price_cents: int,
    billing_cycle: str = "monthly",
    stripe_customer_id: Optional[str] = None
) -> Tuple[str, str]:
    """
    Crea una sesión de Stripe Checkout para procesar el pago.

    Args:
        user_id: ID del usuario en MongoDB
        user_email: Email del usuario
        plan_id: ID del plan (free, pro, premium, enterprise)
        plan_name: Nombre del plan para mostrar
        price_cents: Precio en céntimos (ej: 1999 para 19.99€)
        billing_cycle: "monthly" o "yearly"
        stripe_customer_id: ID del customer en Stripe (opcional, se crea si no existe)

    Returns:
        Tupla (checkout_url, session_id)

    Raises:
        stripe.error.StripeError: Si falla la creación de la sesión

    Ejemplo:
        >>> url, session_id = await create_checkout_session(
        ...     user_id="user123",
        ...     user_email="usuario@example.com",
        ...     plan_id="pro",
        ...     plan_name="Plan PRO",
        ...     price_cents=1999,
        ...     billing_cycle="monthly"
        ... )
        >>> print(url)
        'https://checkout.stripe.com/c/pay/cs_test_...'
    """
    try:
        # Determinar frecuencia de facturación
        interval = "month" if billing_cycle == "monthly" else "year"

        # Crear line items para el checkout
        line_items = [
            {
                "price_data": {
                    "currency": "eur",
                    "unit_amount": price_cents,
                    "recurring": {
                        "interval": interval
                    },
                    "product_data": {
                        "name": f"Suscripción {plan_name}",
                        "description": f"Plan {plan_name} - Facturación {billing_cycle}",
                        "metadata": {
                            "plan_id": plan_id
                        }
                    }
                },
                "quantity": 1
            }
        ]

        # Parámetros de la sesión
        session_params = {
            "payment_method_types": ["card"],
            "line_items": line_items,
            "mode": "subscription",
            "success_url": f"{SUCCESS_URL}?session_id={{CHECKOUT_SESSION_ID}}",
            "cancel_url": CANCEL_URL,
            "client_reference_id": user_id,  # Para identificar usuario en webhook
            "metadata": {
                "user_id": user_id,
                "plan_id": plan_id,
                "billing_cycle": billing_cycle
            },
            "subscription_data": {
                "metadata": {
                    "user_id": user_id,
                    "plan_id": plan_id
                }
            }
        }

        # Si existe customer, usarlo; si no, Stripe creará uno
        if stripe_customer_id:
            session_params["customer"] = stripe_customer_id
        else:
            session_params["customer_email"] = user_email

        # Crear sesión
        checkout_session = stripe.checkout.Session.create(**session_params)

        return checkout_session.url, checkout_session.id

    except stripe.error.StripeError as e:
        print(f"❌ Error creando Checkout Session: {e}")
        raise


def verify_webhook_signature(payload: bytes, signature: str) -> bool:
    """
    Verifica la firma de un webhook de Stripe para seguridad.

    Args:
        payload: Cuerpo de la petición (bytes)
        signature: Header 'Stripe-Signature'

    Returns:
        True si la firma es válida, False si no

    Ejemplo:
        >>> is_valid = verify_webhook_signature(request.body, request.headers["Stripe-Signature"])
        >>> if not is_valid:
        ...     return {"error": "Invalid signature"}
    """
    if not WEBHOOK_SECRET:
        print("⚠️ STRIPE_WEBHOOK_SECRET no configurado - aceptando todos los webhooks (INSEGURO)")
        return True  # En desarrollo sin webhook secret

    try:
        stripe.Webhook.construct_event(
            payload, signature, WEBHOOK_SECRET
        )
        return True
    except stripe.error.SignatureVerificationError as e:
        print(f"❌ Firma de webhook inválida: {e}")
        return False
    except Exception as e:
        print(f"❌ Error verificando webhook: {e}")
        return False


def parse_webhook_event(payload: bytes, signature: str) -> Optional[Dict]:
    """
    Parsea y verifica un evento de webhook de Stripe.

    Args:
        payload: Cuerpo de la petición (bytes)
        signature: Header 'Stripe-Signature'

    Returns:
        Evento parseado o None si falla la verificación

    Eventos principales:
        - checkout.session.completed: Pago completado
        - invoice.paid: Renovación de suscripción
        - customer.subscription.deleted: Suscripción cancelada
    """
    if not WEBHOOK_SECRET:
        # Sin webhook secret, parsear JSON directamente (SOLO DESARROLLO)
        import json
        return json.loads(payload)

    try:
        event = stripe.Webhook.construct_event(
            payload, signature, WEBHOOK_SECRET
        )
        return event
    except Exception as e:
        print(f"❌ Error parseando webhook: {e}")
        return None


async def handle_checkout_completed(session: Dict) -> Dict:
    """
    Procesa el evento de checkout completado.

    Extrae información del pago exitoso para actualizar la suscripción del usuario.

    Args:
        session: Objeto de Stripe Checkout Session

    Returns:
        Dict con datos para actualizar MongoDB:
        {
            "user_id": str,
            "plan_id": str,
            "billing_cycle": str,
            "stripe_customer_id": str,
            "stripe_subscription_id": str,
            "stripe_session_id": str,
            "payment_status": "completed",
            "start_date": datetime,
            "end_date": datetime
        }
    """
    # Extraer metadata
    user_id = session.get("client_reference_id") or session.get("metadata", {}).get("user_id")
    plan_id = session.get("metadata", {}).get("plan_id")
    billing_cycle = session.get("metadata", {}).get("billing_cycle", "monthly")

    # Obtener IDs de Stripe
    stripe_customer_id = session.get("customer")
    stripe_subscription_id = session.get("subscription")
    stripe_session_id = session.get("id")

    # Calcular fechas de suscripción
    start_date = datetime.utcnow()
    if billing_cycle == "monthly":
        end_date = start_date + timedelta(days=30)
    else:  # yearly
        end_date = start_date + timedelta(days=365)

    return {
        "user_id": user_id,
        "plan_id": plan_id,
        "billing_cycle": billing_cycle,
        "stripe_customer_id": stripe_customer_id,
        "stripe_subscription_id": stripe_subscription_id,
        "stripe_session_id": stripe_session_id,
        "payment_status": "completed",
        "start_date": start_date,
        "end_date": end_date,
        "amount_paid": session.get("amount_total", 0) / 100,  # Convertir de centavos a euros
        "currency": session.get("currency", "eur")
    }


async def get_payment_status(session_id: str) -> Dict:
    """
    Obtiene el estado de una sesión de pago (para polling desde frontend).

    Args:
        session_id: ID de la Checkout Session

    Returns:
        Dict con estado:
        {
            "status": "pending" | "completed" | "failed",
            "payment_status": str,
            "subscription_id": Optional[str]
        }

    Ejemplo:
        >>> status = await get_payment_status("cs_test_123...")
        >>> if status["status"] == "completed":
        ...     print("Pago confirmado!")
    """
    try:
        session = stripe.checkout.Session.retrieve(session_id)

        # Mapear payment_status de Stripe a nuestro formato
        payment_status = session.get("payment_status")
        status_map = {
            "paid": "completed",
            "unpaid": "pending",
            "no_payment_required": "completed"
        }

        return {
            "status": status_map.get(payment_status, "pending"),
            "payment_status": payment_status,
            "subscription_id": session.get("subscription")
        }
    except stripe.error.StripeError as e:
        print(f"❌ Error obteniendo estado de pago: {e}")
        return {
            "status": "failed",
            "payment_status": "error",
            "subscription_id": None
        }


async def cancel_stripe_subscription(subscription_id: str) -> bool:
    """
    Cancela una suscripción en Stripe.

    Args:
        subscription_id: ID de la suscripción en Stripe (sub_...)

    Returns:
        True si se canceló exitosamente, False si falló

    Nota:
        La suscripción se cancela al final del período actual (no inmediatamente)
    """
    try:
        stripe.Subscription.modify(
            subscription_id,
            cancel_at_period_end=True
        )
        print(f"✅ Suscripción {subscription_id} marcada para cancelación")
        return True
    except stripe.error.StripeError as e:
        print(f"❌ Error cancelando suscripción: {e}")
        return False


async def get_upcoming_invoice(customer_id: str) -> Optional[Dict]:
    """
    Obtiene la próxima factura de un customer (para mostrar próximo pago).

    Args:
        customer_id: ID del customer en Stripe (cus_...)

    Returns:
        Dict con información de la factura o None si no hay próxima factura
        {
            "amount": float,
            "currency": str,
            "next_payment_date": datetime
        }
    """
    try:
        invoice = stripe.Invoice.upcoming(customer=customer_id)
        return {
            "amount": invoice.get("amount_due", 0) / 100,
            "currency": invoice.get("currency", "eur"),
            "next_payment_date": datetime.fromtimestamp(invoice.get("next_payment_attempt", 0))
        }
    except stripe.error.StripeError as e:
        print(f"ℹ️ No hay próxima factura: {e}")
        return None


# Funciones de utilidad

def format_price_for_stripe(price_euros: float) -> int:
    """
    Convierte un precio en euros a centavos para Stripe.

    Args:
        price_euros: Precio en euros (ej: 19.99)

    Returns:
        Precio en centavos (ej: 1999)
    """
    return int(price_euros * 100)


def is_test_mode() -> bool:
    """
    Verifica si Stripe está en modo test.

    Returns:
        True si está en modo test, False si es producción
    """
    api_key = os.getenv("STRIPE_SECRET_KEY", "")
    return api_key.startswith("sk_test_")


def get_stripe_dashboard_url(object_id: str) -> str:
    """
    Genera URL al dashboard de Stripe para un objeto.

    Args:
        object_id: ID del objeto (customer, subscription, payment, etc.)

    Returns:
        URL al dashboard de Stripe

    Ejemplo:
        >>> url = get_stripe_dashboard_url("cus_123...")
        >>> print(url)
        'https://dashboard.stripe.com/test/customers/cus_123...'
    """
    env = "test" if is_test_mode() else ""
    base_url = f"https://dashboard.stripe.com/{env}"

    # Determinar tipo de objeto por prefijo
    if object_id.startswith("cus_"):
        return f"{base_url}/customers/{object_id}"
    elif object_id.startswith("sub_"):
        return f"{base_url}/subscriptions/{object_id}"
    elif object_id.startswith("pi_"):
        return f"{base_url}/payments/{object_id}"
    elif object_id.startswith("cs_"):
        return f"{base_url}/checkout/sessions/{object_id}"
    else:
        return base_url
