"""
Endpoints para gestión de suscripciones y pagos
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
from typing import List, Optional
import os
from dotenv import load_dotenv
from app.api.endpoints.auth import get_current_user, require_admin
from app.models.subscription import (
    SubscriptionTier, SubscriptionPlan, UserSubscription,
    Payment, PaymentMethod, PaymentStatus,
    SUBSCRIPTION_PLANS
)
from app.services.stripe_service import (
    create_checkout_session, verify_webhook_signature, handle_checkout_completed,
    get_payment_status, create_stripe_customer, format_price_for_stripe
)
from pydantic import BaseModel

load_dotenv()

router = APIRouter()

# MongoDB
MONGODB_URL = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI") or "mongodb://localhost:27017"
mongodb_options = {
    "serverSelectionTimeoutMS": 5000,
    "connectTimeoutMS": 10000,
}
if "mongodb+srv://" in MONGODB_URL or "mongodb.net" in MONGODB_URL:
    mongodb_options.update({"tls": True, "tlsAllowInvalidCertificates": True})

client = AsyncIOMotorClient(MONGODB_URL, **mongodb_options)
db = client.fraktal
subscriptions_collection = db.user_subscriptions
payments_collection = db.payments


class SubscribeRequest(BaseModel):
    tier: SubscriptionTier
    billing_period: str = "monthly"  # monthly or yearly
    payment_method: PaymentMethod
    auto_renew: bool = True


class CancelSubscriptionRequest(BaseModel):
    reason: str = ""


@router.get("/plans")
async def get_subscription_plans():
    """Obtiene todos los planes de suscripción disponibles"""
    plans = []
    for tier, plan in SUBSCRIPTION_PLANS.items():
        plans.append(plan.dict())
    
    return {"plans": plans}


@router.get("/my-subscription")
async def get_my_subscription(current_user: dict = Depends(get_current_user)):
    """Obtiene la suscripción actual del usuario"""
    user_id = str(current_user.get("_id"))
    
    subscription = await subscriptions_collection.find_one({"user_id": user_id})
    
    if not subscription:
        # Usuario nuevo, crear suscripción FREE
        free_subscription = UserSubscription(
            user_id=user_id,
            tier=SubscriptionTier.FREE,
            status="active",
            start_date=datetime.utcnow().isoformat(),
            end_date=(datetime.utcnow() + timedelta(days=36500)).isoformat(),  # 100 años
            auto_renew=False
        )
        
        await subscriptions_collection.insert_one(free_subscription.dict())
        subscription = free_subscription.dict()
    
    # Añadir detalles del plan
    tier = subscription.get("tier", "free")
    plan = SUBSCRIPTION_PLANS.get(SubscriptionTier(tier))
    
    return {
        "subscription": subscription,
        "plan": plan.dict() if plan else None
    }


@router.post("/subscribe")
async def subscribe(
    request: SubscribeRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Crea o actualiza una suscripción
    En producción, esto integraría con Stripe/PayPal/Bizum
    """
    user_id = str(current_user.get("_id"))
    
    # Verificar que el plan existe
    plan = SUBSCRIPTION_PLANS.get(request.tier)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Plan de suscripción no válido"
        )
    
    # Calcular precio
    price = plan.price_yearly if request.billing_period == "yearly" else plan.price_monthly
    
    if price == 0 and request.tier != SubscriptionTier.FREE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este plan requiere pago"
        )
    
    # Crear registro de pago (simulado)
    payment = Payment(
        user_id=user_id,
        amount=price,
        currency="EUR",
        method=request.payment_method,
        status=PaymentStatus.PENDING,
        description=f"Suscripción {plan.name} - {request.billing_period}"
    )
    
    # En producción, aquí iría la integración con el proveedor de pago
    # Por ahora, simulamos pago exitoso
    payment.status = PaymentStatus.COMPLETED
    payment.completed_at = datetime.utcnow().isoformat()
    
    payment_result = await payments_collection.insert_one(payment.dict())
    payment_id = str(payment_result.inserted_id)
    
    # Calcular fechas
    start_date = datetime.utcnow()
    if request.billing_period == "yearly":
        end_date = start_date + timedelta(days=365)
        next_billing = end_date
    else:
        end_date = start_date + timedelta(days=30)
        next_billing = end_date
    
    # Crear o actualizar suscripción
    subscription = UserSubscription(
        user_id=user_id,
        tier=request.tier,
        status="active",
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat(),
        auto_renew=request.auto_renew,
        payment_method=request.payment_method,
        last_payment_date=datetime.utcnow().isoformat(),
        next_billing_date=next_billing.isoformat()
    )
    
    await subscriptions_collection.update_one(
        {"user_id": user_id},
        {"$set": subscription.dict()},
        upsert=True
    )
    
    return {
        "success": True,
        "message": f"Suscripción a {plan.name} activada exitosamente",
        "subscription": subscription.dict(),
        "payment_id": payment_id
    }


@router.post("/cancel")
async def cancel_subscription(
    request: CancelSubscriptionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Cancela la suscripción del usuario"""
    user_id = str(current_user.get("_id"))
    
    subscription = await subscriptions_collection.find_one({"user_id": user_id})
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró suscripción activa"
        )
    
    if subscription.get("tier") == "free":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La suscripción gratuita no se puede cancelar"
        )
    
    # Actualizar suscripción
    await subscriptions_collection.update_one(
        {"user_id": user_id},
        {"$set": {
            "status": "cancelled",
            "auto_renew": False,
            "cancellation_date": datetime.utcnow().isoformat(),
            "cancellation_reason": request.reason
        }}
    )
    
    return {
        "success": True,
        "message": "Suscripción cancelada. Seguirás teniendo acceso hasta el final del período pagado."
    }


@router.get("/payments")
async def get_my_payments(current_user: dict = Depends(get_current_user)):
    """Obtiene el historial de pagos del usuario"""
    user_id = str(current_user.get("_id"))
    
    payments_cursor = payments_collection.find({"user_id": user_id}).sort("created_at", -1)
    payments = await payments_cursor.to_list(length=100)
    
    # Convertir ObjectId a string
    for payment in payments:
        payment["_id"] = str(payment["_id"])
    
    return {"payments": payments}


@router.get("/usage")
async def get_usage_stats(current_user: dict = Depends(get_current_user)):
    """Obtiene estadísticas de uso del usuario"""
    user_id = str(current_user.get("_id"))
    
    # Obtener suscripción
    subscription = await subscriptions_collection.find_one({"user_id": user_id})
    if not subscription:
        tier = SubscriptionTier.FREE
    else:
        tier = SubscriptionTier(subscription.get("tier", "free"))
    
    plan = SUBSCRIPTION_PLANS.get(tier)
    
    # Obtener uso actual
    charts_collection = db.charts
    charts_count = await charts_collection.count_documents({"user_id": user_id})
    
    # Calcular almacenamiento (simplificado)
    storage_used_mb = charts_count * 0.5  # Aproximado
    
    return {
        "tier": tier.value,
        "plan_name": plan.name if plan else "Desconocido",
        "charts_count": charts_count,
        "charts_limit": plan.max_charts if plan else 5,
        "storage_used_mb": round(storage_used_mb, 2),
        "storage_limit_mb": plan.max_storage_mb if plan else 500,
        "percentage_used": round((charts_count / plan.max_charts * 100) if plan and plan.max_charts > 0 else 0, 1)
    }


# ========== NUEVOS ENDPOINTS STRIPE ==========


class CreateCheckoutRequest(BaseModel):
    """Request para crear sesión de checkout"""
    plan_id: str  # free, pro, premium, enterprise
    billing_cycle: str = "monthly"  # monthly o yearly


@router.post("/create-checkout")
async def create_checkout(
    request: CreateCheckoutRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Crea una sesión de Stripe Checkout para procesar el pago.

    Flujo:
    1. Valida que el plan existe
    2. Crea (o usa existing) Stripe customer
    3. Crea Checkout Session
    4. Retorna URL para redirigir al usuario

    Returns:
        {
            "checkout_url": str,
            "session_id": str
        }
    """
    try:
        # Validar plan
        plan_id = request.plan_id
        if plan_id == "free":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El plan FREE no requiere pago"
            )

        # Obtener plan de SUBSCRIPTION_PLANS
        tier_map = {
            "pro": SubscriptionTier.PRO,
            "premium": SubscriptionTier.PREMIUM,
            "enterprise": SubscriptionTier.ENTERPRISE
        }

        if plan_id not in tier_map:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Plan inválido: {plan_id}"
            )

        tier = tier_map[plan_id]
        plan = SUBSCRIPTION_PLANS[tier]

        # Validar billing_cycle
        if request.billing_cycle not in ["monthly", "yearly"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="billing_cycle debe ser 'monthly' o 'yearly'"
            )

        # Calcular precio
        price_euros = plan.price_monthly if request.billing_cycle == "monthly" else plan.price_yearly
        price_cents = format_price_for_stripe(price_euros)

        # Obtener datos del usuario
        user_id = str(current_user.get("_id"))
        user_email = current_user.get("email")
        username = current_user.get("username")

        # Verificar si usuario ya tiene Stripe customer ID
        subscription = await subscriptions_collection.find_one({"user_id": user_id})
        stripe_customer_id = subscription.get("stripe_customer_id") if subscription else None

        # Si no tiene, crear customer
        if not stripe_customer_id:
            stripe_customer_id = await create_stripe_customer(user_email, user_id, username)

            # Actualizar suscripción con customer_id
            if subscription:
                await subscriptions_collection.update_one(
                    {"user_id": user_id},
                    {"$set": {"stripe_customer_id": stripe_customer_id}}
                )

        # Crear Checkout Session
        checkout_url, session_id = await create_checkout_session(
            user_id=user_id,
            user_email=user_email,
            plan_id=plan_id,
            plan_name=plan.name,
            price_cents=price_cents,
            billing_cycle=request.billing_cycle,
            stripe_customer_id=stripe_customer_id
        )

        # Guardar session_id en BD para tracking
        await subscriptions_collection.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "stripe_session_id": session_id,
                    "payment_status": "pending"
                }
            },
            upsert=True
        )

        return {
            "checkout_url": checkout_url,
            "session_id": session_id
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error en create_checkout: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creando sesión de pago: {str(e)}"
        )


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Webhook de Stripe para recibir eventos de pago.

    Eventos manejados:
    - checkout.session.completed: Pago exitoso
    - invoice.paid: Renovación de suscripción
    - customer.subscription.deleted: Suscripción cancelada

    Seguridad:
    - Verifica firma del webhook usando STRIPE_WEBHOOK_SECRET
    """
    try:
        # Obtener payload y signature
        payload = await request.body()
        signature = request.headers.get("stripe-signature")

        if not signature:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing Stripe-Signature header"
            )

        # Verificar firma
        if not verify_webhook_signature(payload, signature):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid signature"
            )

        # Parsear evento
        import json
        event = json.loads(payload)
        event_type = event.get("type")

        print(f"📨 Webhook recibido: {event_type}")

        # Manejar evento: checkout.session.completed
        if event_type == "checkout.session.completed":
            session = event.get("data", {}).get("object", {})
            payment_data = await handle_checkout_completed(session)

            user_id = payment_data.get("user_id")
            if not user_id:
                print("⚠️ No se pudo identificar user_id en webhook")
                return {"status": "no_user_id"}

            # Actualizar suscripción en MongoDB
            update_data = {
                "tier": payment_data.get("plan_id"),
                "status": "active",
                "start_date": payment_data.get("start_date").isoformat(),
                "end_date": payment_data.get("end_date").isoformat(),
                "auto_renew": True,
                "payment_method": "card",
                "last_payment_date": payment_data.get("start_date").isoformat(),
                "next_billing_date": payment_data.get("end_date").isoformat(),
                "stripe_customer_id": payment_data.get("stripe_customer_id"),
                "stripe_subscription_id": payment_data.get("stripe_subscription_id"),
                "stripe_session_id": payment_data.get("stripe_session_id"),
                "payment_status": "completed",
                "billing_cycle": payment_data.get("billing_cycle")
            }

            await subscriptions_collection.update_one(
                {"user_id": user_id},
                {"$set": update_data},
                upsert=True
            )

            # Registrar pago en historial
            payment_record = Payment(
                user_id=user_id,
                amount=payment_data.get("amount_paid"),
                currency=payment_data.get("currency", "eur").upper(),
                method=PaymentMethod.CARD,
                status=PaymentStatus.COMPLETED,
                description=f"Suscripción {payment_data.get('plan_id')} - {payment_data.get('billing_cycle')}",
                stripe_payment_intent_id=payment_data.get("stripe_subscription_id"),
                completed_at=datetime.utcnow().isoformat()
            )

            await payments_collection.insert_one(payment_record.dict())

            print(f"✅ Suscripción activada para user {user_id}: {payment_data.get('plan_id')}")

        return {"status": "success"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error en webhook: {e}")
        # No lanzar error para que Stripe no reintente
        return {"status": "error", "message": str(e)}


@router.get("/check-payment/{session_id}")
async def check_payment(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Verifica el estado de un pago (para polling desde frontend).

    Args:
        session_id: ID de la Checkout Session

    Returns:
        {
            "status": "pending" | "completed" | "failed",
            "subscription": Optional[dict]  # Si está completado
        }

    Uso:
        Frontend hace polling cada 3 segundos después de iniciar pago
        hasta que status sea "completed" o "failed"
    """
    try:
        # Obtener estado desde Stripe
        payment_status_data = await get_payment_status(session_id)
        status_value = payment_status_data.get("status")

        response = {
            "status": status_value,
            "payment_status": payment_status_data.get("payment_status")
        }

        # Si está completado, retornar suscripción actualizada
        if status_value == "completed":
            user_id = str(current_user.get("_id"))
            subscription = await subscriptions_collection.find_one({"user_id": user_id})

            if subscription:
                subscription.pop("_id", None)
                response["subscription"] = subscription

        return response

    except Exception as e:
        print(f"❌ Error en check_payment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error verificando pago: {str(e)}"
        )


# ========== ENDPOINTS DE ADMINISTRACIÓN ==========


@router.get("/admin/subscribers")
async def get_all_subscribers(
    skip: int = 0,
    limit: int = 50,
    tier_filter: Optional[str] = None,
    status_filter: Optional[str] = None,
    admin: dict = Depends(require_admin)
):
    """
    Obtiene lista de todos los suscriptores (solo admin).

    Args:
        skip: Offset para paginación
        limit: Límite de resultados
        tier_filter: Filtrar por tier (free, pro, premium, enterprise)
        status_filter: Filtrar por status (active, cancelled, expired)

    Returns:
        {
            "subscribers": [{
                "user_id": str,
                "username": str,
                "email": str,
                "tier": str,
                "status": str,
                "start_date": str,
                "end_date": str,
                "billing_cycle": str,
                "payment_status": str,
                "stripe_customer_id": str
            }],
            "total": int,
            "page": int,
            "total_pages": int
        }
    """
    try:
        # Construir filtro
        filter_query = {}
        if tier_filter:
            filter_query["tier"] = tier_filter
        if status_filter:
            filter_query["status"] = status_filter

        # Contar total
        total = await subscriptions_collection.count_documents(filter_query)

        # Obtener suscripciones
        subscriptions_cursor = subscriptions_collection.find(filter_query).skip(skip).limit(limit)
        subscriptions = await subscriptions_cursor.to_list(length=limit)

        # Obtener info de usuarios
        users_collection = db.users
        enriched_subscribers = []

        for sub in subscriptions:
            user = await users_collection.find_one({"_id": sub.get("user_id")})

            enriched_subscribers.append({
                "user_id": sub.get("user_id"),
                "username": user.get("username") if user else "Desconocido",
                "email": user.get("email") if user else "No disponible",
                "tier": sub.get("tier"),
                "status": sub.get("status"),
                "start_date": sub.get("start_date"),
                "end_date": sub.get("end_date"),
                "billing_cycle": sub.get("billing_cycle", "monthly"),
                "payment_status": sub.get("payment_status", "N/A"),
                "stripe_customer_id": sub.get("stripe_customer_id"),
                "stripe_subscription_id": sub.get("stripe_subscription_id"),
                "auto_renew": sub.get("auto_renew", False),
                "next_billing_date": sub.get("next_billing_date")
            })

        return {
            "subscribers": enriched_subscribers,
            "total": total,
            "page": (skip // limit) + 1,
            "total_pages": (total + limit - 1) // limit
        }

    except Exception as e:
        print(f"❌ Error en get_all_subscribers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo suscriptores: {str(e)}"
        )


@router.get("/admin/payments")
async def get_all_payments(
    skip: int = 0,
    limit: int = 50,
    user_id: Optional[str] = None,
    admin: dict = Depends(require_admin)
):
    """
    Obtiene historial completo de pagos (solo admin).

    Args:
        skip: Offset para paginación
        limit: Límite de resultados
        user_id: Filtrar por user_id específico

    Returns:
        {
            "payments": [{...}],
            "total": int
        }
    """
    try:
        # Construir filtro
        filter_query = {}
        if user_id:
            filter_query["user_id"] = user_id

        # Contar total
        total = await payments_collection.count_documents(filter_query)

        # Obtener pagos (ordenados por fecha desc)
        payments_cursor = payments_collection.find(filter_query).sort("created_at", -1).skip(skip).limit(limit)
        payments = await payments_cursor.to_list(length=limit)

        # Remover _id de MongoDB
        for payment in payments:
            payment.pop("_id", None)

        return {
            "payments": payments,
            "total": total,
            "page": (skip // limit) + 1,
            "total_pages": (total + limit - 1) // limit
        }

    except Exception as e:
        print(f"❌ Error en get_all_payments: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo pagos: {str(e)}"
        )


@router.get("/admin/revenue-stats")
async def get_revenue_stats(admin: dict = Depends(require_admin)):
    """
    Obtiene estadísticas de ingresos (solo admin).

    Returns:
        {
            "total_subscribers": int,
            "active_subscribers": int,
            "subscribers_by_tier": {
                "free": int,
                "pro": int,
                "premium": int,
                "enterprise": int
            },
            "monthly_revenue": float,
            "yearly_revenue": float,
            "total_payments": int,
            "total_revenue_all_time": float
        }
    """
    try:
        # Total suscriptores
        total_subscribers = await subscriptions_collection.count_documents({})
        active_subscribers = await subscriptions_collection.count_documents({"status": "active"})

        # Suscriptores por tier
        subscribers_by_tier = {}
        for tier in ["free", "pro", "premium", "enterprise"]:
            count = await subscriptions_collection.count_documents({"tier": tier, "status": "active"})
            subscribers_by_tier[tier] = count

        # Calcular ingresos mensuales estimados
        monthly_revenue = 0.0
        yearly_revenue = 0.0

        for tier, plan in SUBSCRIPTION_PLANS.items():
            if tier == SubscriptionTier.FREE:
                continue

            # Contar suscriptores activos de este tier
            monthly_subs = await subscriptions_collection.count_documents({
                "tier": tier.value,
                "status": "active",
                "billing_cycle": "monthly"
            })
            yearly_subs = await subscriptions_collection.count_documents({
                "tier": tier.value,
                "status": "active",
                "billing_cycle": "yearly"
            })

            monthly_revenue += monthly_subs * plan.price_monthly
            yearly_revenue += (yearly_subs * plan.price_yearly) / 12  # Convertir a mensual

        # Total de pagos completados
        total_payments = await payments_collection.count_documents({"status": "completed"})

        # Ingresos totales históricos
        pipeline = [
            {"$match": {"status": "completed"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        result = await payments_collection.aggregate(pipeline).to_list(1)
        total_revenue_all_time = result[0]["total"] if result else 0.0

        return {
            "total_subscribers": total_subscribers,
            "active_subscribers": active_subscribers,
            "subscribers_by_tier": subscribers_by_tier,
            "monthly_revenue": round(monthly_revenue + yearly_revenue, 2),
            "yearly_revenue": round((monthly_revenue + yearly_revenue) * 12, 2),
            "total_payments": total_payments,
            "total_revenue_all_time": round(total_revenue_all_time, 2)
        }

    except Exception as e:
        print(f"❌ Error en get_revenue_stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo estadísticas: {str(e)}"
        )

