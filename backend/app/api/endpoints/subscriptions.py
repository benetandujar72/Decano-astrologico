"""
Endpoints para gestión de suscripciones y pagos
"""
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
from typing import List
import os
from dotenv import load_dotenv
from app.api.endpoints.auth import get_current_user
from app.models.subscription import (
    SubscriptionTier, SubscriptionPlan, UserSubscription,
    Payment, PaymentMethod, PaymentStatus,
    SUBSCRIPTION_PLANS
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

