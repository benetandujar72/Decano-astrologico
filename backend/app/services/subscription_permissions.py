"""
Servicio para verificar permisos de suscripción y control de acceso
"""
from typing import Optional
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClient
import os
from app.models.subscription import SubscriptionTier, SUBSCRIPTION_PLANS, SubscriptionPlan

# Cliente MongoDB
MONGODB_URL = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI") or "mongodb://localhost:27017"
client = AsyncIOMotorClient(MONGODB_URL)
db = client.fraktal
subscriptions_collection = db.subscriptions
charts_collection = db.charts


async def get_user_subscription_tier(user_id: str) -> SubscriptionTier:
    """
    Obtiene el tier de suscripción del usuario.
    Si no tiene suscripción, retorna FREE.
    """
    subscription = await subscriptions_collection.find_one({"user_id": user_id})
    if not subscription:
        return SubscriptionTier.FREE
    
    tier_str = subscription.get("tier", "free")
    try:
        return SubscriptionTier(tier_str)
    except ValueError:
        return SubscriptionTier.FREE


async def get_user_plan(user_id: str) -> SubscriptionPlan:
    """
    Obtiene el plan completo del usuario.
    """
    tier = await get_user_subscription_tier(user_id)
    return SUBSCRIPTION_PLANS[tier]


async def check_chart_limit(user_id: str) -> tuple[bool, int, int]:
    """
    Verifica si el usuario puede crear más cartas.
    
    Returns:
        (can_create: bool, current_count: int, limit: int)
    """
    plan = await get_user_plan(user_id)
    
    # Si es ilimitado (-1), siempre puede crear
    if plan.max_charts == -1:
        return (True, 0, -1)
    
    # Contar cartas del usuario
    count = await charts_collection.count_documents({"user_id": user_id})
    
    can_create = count < plan.max_charts
    return (can_create, count, plan.max_charts)


async def require_feature(
    user_id: str,
    feature: str,
    error_message: Optional[str] = None
) -> SubscriptionPlan:
    """
    Verifica que el usuario tenga acceso a una funcionalidad específica.
    
    Args:
        user_id: ID del usuario
        feature: Nombre de la funcionalidad a verificar
            - "export_pdf"
            - "export_docx"
            - "export_html"
            - "advanced_techniques"
            - "synastry"
            - "solar_return"
            - "customize_prompts"
    
    Returns:
        SubscriptionPlan del usuario
    
    Raises:
        HTTPException si no tiene acceso
    """
    plan = await get_user_plan(user_id)
    
    feature_map = {
        "export_pdf": plan.can_export_pdf,
        "export_docx": plan.can_export_docx,
        "export_html": plan.can_export_html,
        "advanced_techniques": plan.can_use_advanced_techniques,
        "synastry": plan.can_use_synastry,
        "solar_return": plan.can_use_solar_return,
        "customize_prompts": plan.can_customize_prompts,
    }
    
    if feature not in feature_map:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Funcionalidad desconocida: {feature}"
        )
    
    has_access = feature_map[feature]
    
    if not has_access:
        plan_name = plan.name
        error_msg = error_message or f"Esta funcionalidad requiere un plan superior. Tu plan actual ({plan_name}) no incluye esta característica."
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=error_msg
        )
    
    return plan


async def require_chart_quota(user_id: str) -> None:
    """
    Verifica que el usuario tenga cuota disponible para crear una carta.

    Raises:
        HTTPException si no tiene cuota disponible
    """
    can_create, current_count, limit = await check_chart_limit(user_id)

    if not can_create:
        plan = await get_user_plan(user_id)
        error_msg = f"Has alcanzado el límite de cartas de tu plan ({plan.name}). Has creado {current_count} de {limit} cartas permitidas. Actualiza tu plan para crear más cartas."
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=error_msg
        )


async def check_expert_consultation_quota(user_id: str) -> tuple[bool, int, int]:
    """
    Verifica si el usuario puede crear más consultas con experto este mes.

    Returns:
        (can_create: bool, current_count: int, limit: int)
    """
    plan = await get_user_plan(user_id)

    # Si no tiene acceso al chat con experto
    if not plan.can_access_expert_chat:
        return (False, 0, 0)

    # Si es ilimitado (-1), siempre puede crear
    if plan.expert_consultations_per_month == -1:
        return (True, 0, -1)

    # Contar consultas del mes actual
    from datetime import datetime
    from motor.motor_asyncio import AsyncIOMotorClient
    import os

    MONGODB_URL = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI") or "mongodb://localhost:27017"
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client.fraktal
    consultations_collection = db.expert_consultations

    # Calcular inicio del mes actual
    now = datetime.utcnow()
    start_of_month = datetime(now.year, now.month, 1)

    count = await consultations_collection.count_documents({
        "user_id": user_id,
        "created_at": {"$gte": start_of_month.isoformat()}
    })

    can_create = count < plan.expert_consultations_per_month
    return (can_create, count, plan.expert_consultations_per_month)


async def require_expert_consultation_quota(user_id: str) -> SubscriptionPlan:
    """
    Verifica que el usuario tenga cuota disponible para consultas con experto.

    Returns:
        SubscriptionPlan del usuario

    Raises:
        HTTPException si no tiene acceso o ha alcanzado el límite
    """
    plan = await get_user_plan(user_id)

    # Verificar acceso básico
    if not plan.can_access_expert_chat:
        error_msg = f"Tu plan actual ({plan.name}) no incluye acceso al chat con experto IA. Actualiza tu plan a PRO o superior para acceder a esta funcionalidad."
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=error_msg
        )

    # Verificar cuota
    can_create, current_count, limit = await check_expert_consultation_quota(user_id)

    if not can_create:
        error_msg = f"Has alcanzado el límite de consultas con experto de tu plan ({plan.name}). Has usado {current_count} de {limit} consultas este mes. Actualiza tu plan para obtener más consultas."
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=error_msg
        )

    return plan


async def require_professional_services_access(user_id: str) -> tuple[SubscriptionPlan, int]:
    """
    Verifica que el usuario tenga acceso a servicios profesionales de Jon Landeta.

    Returns:
        (SubscriptionPlan del usuario, descuento aplicable en porcentaje)

    Raises:
        HTTPException si no tiene acceso
    """
    plan = await get_user_plan(user_id)

    if not plan.can_access_professional_services:
        error_msg = f"Tu plan actual ({plan.name}) no incluye acceso a servicios profesionales de Jon Landeta. Actualiza tu plan a PREMIUM o superior para acceder."
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=error_msg
        )

    return (plan, plan.professional_services_discount)

