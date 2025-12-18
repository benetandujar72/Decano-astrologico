"""
Endpoints para servicios profesionales de Jon Landeta
"""
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from typing import List, Optional
import os
from dotenv import load_dotenv

from app.api.endpoints.auth import get_current_user, require_admin
from app.models.jon_lanbeta_services import (
    ProfessionalService,
    ServiceType,
    ServiceCategory,
    PROFESSIONAL_SERVICES_CATALOG
)
from app.models.booking import (
    ServiceBooking,
    BookingStatus,
    PaymentStatus,
    CreateBookingRequest,
    UpdateBookingRequest,
    CancelBookingRequest,
    BookingStats
)
from app.services.subscription_permissions import require_professional_services_access

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
bookings_collection = db.service_bookings
users_collection = db.users
subscriptions_collection = db.subscriptions


@router.get("/catalog")
async def get_services_catalog(
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene el catálogo de servicios profesionales disponibles.
    El administrador siempre tiene acceso completo a todos los servicios.

    Args:
        category: Filtrar por categoría (consultation, training, therapy)

    Returns:
        Lista de servicios disponibles con precios aplicando descuento del plan
    """
    try:
        user_id = str(current_user.get("_id"))
        user_role = current_user.get("role", "user")
        is_admin = (user_role == "admin")

        # Descuento depende del plan, pero el acceso NO se bloquea
        plan, discount = await require_professional_services_access(user_id)

        # Si es admin, puede tener descuentos adicionales o ilimitados
        if is_admin:
            # El admin siempre tiene acceso completo, podemos darle el mejor descuento
            discount = max(discount, 20)  # Al menos 20% de descuento para admin

        # Obtener estado de suscripción (solo informativo)
        subscription = await subscriptions_collection.find_one({"user_id": user_id})
        subscription_tier = (subscription or {}).get("tier", "free")
        subscription_status = (subscription or {}).get("status", "inactive")
        subscription_end_date = (subscription or {}).get("end_date")

        services_list = []
        for service_key, service in PROFESSIONAL_SERVICES_CATALOG.items():
            if category and service.category.value != category:
                continue

            service_dict = service.dict()

            # Calcular precio con descuento
            if discount > 0 and service.base_price > 0:
                discounted_price = service.base_price * (1 - discount / 100)
                service_dict["discounted_price"] = round(discounted_price, 2)
                service_dict["savings"] = round(service.base_price - discounted_price, 2)
                service_dict["discount_percentage"] = discount

            services_list.append(service_dict)

        return {
            "services": services_list,
            "has_access": True,
            "discount": discount,
            "plan_name": plan.name,
            "subscription_tier": subscription_tier,
            "subscription_status": subscription_status,
            "subscription_end_date": subscription_end_date,
            "is_admin": is_admin,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error en get_services_catalog: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener catálogo: {str(e)}"
        )


@router.post("/book")
async def create_booking(
    request: CreateBookingRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Crea una nueva reserva de servicio profesional.

    Args:
        request: Datos de la reserva

    Returns:
        ServiceBooking creada (pendiente de pago)
    """
    try:
        user_id = str(current_user.get("_id"))
        user_email = current_user.get("email")
        user_name = current_user.get("username")

        # Descuento depende del plan, pero el acceso NO se bloquea
        plan, discount = await require_professional_services_access(user_id)

        # Obtener servicio del catálogo
        service = PROFESSIONAL_SERVICES_CATALOG.get(request.service_id)
        if not service:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Servicio no encontrado"
            )

        # Calcular precio final con descuento
        final_price = service.base_price
        if discount > 0:
            final_price = service.base_price * (1 - discount / 100)

        # Crear reserva
        booking = ServiceBooking(
            user_id=user_id,
            service_id=request.service_id,
            service_name=service.name,
            service_type=service.service_type.value,
            status=BookingStatus.PENDING_PAYMENT,
            payment_status=PaymentStatus.PENDING,
            scheduled_date=request.preferred_date,
            scheduled_time=request.preferred_time,
            duration_minutes=service.duration_minutes,
            location=service.location,
            platform=service.platform,
            base_price=service.base_price,
            discount_applied=float(discount),
            final_price=round(final_price, 2),
            currency=service.currency,
            user_notes=request.user_notes,
            user_email=user_email,
            user_name=user_name,
            user_phone=request.user_phone
        )

        # Guardar en BD
        booking_dict = booking.dict()
        await bookings_collection.insert_one(booking_dict)

        booking_dict.pop("_id", None)

        print(f"✅ Reserva creada: {booking.booking_id} para usuario {user_id}")

        # Crear sesión de pago con Stripe
        try:
            import stripe
            from app.services.stripe_service import create_stripe_customer
            from motor.motor_asyncio import AsyncIOMotorClient
            
            stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
            
            # Obtener colección de suscripciones
            MONGODB_URL = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI") or "mongodb://localhost:27017"
            mongodb_options = {
                "serverSelectionTimeoutMS": 5000,
                "connectTimeoutMS": 10000,
            }
            if "mongodb+srv://" in MONGODB_URL or "mongodb.net" in MONGODB_URL:
                mongodb_options.update({"tls": True, "tlsAllowInvalidCertificates": True})
            
            temp_client = AsyncIOMotorClient(MONGODB_URL, **mongodb_options)
            temp_db = temp_client.fraktal
            
            # Verificar si usuario tiene customer en Stripe
            subscription = await temp_db.subscriptions.find_one({"user_id": user_id})
            stripe_customer_id = subscription.get("stripe_customer_id") if subscription else None
            
            # Crear customer si no existe
            if not stripe_customer_id:
                stripe_customer_id = await create_stripe_customer(user_email, user_id, user_name)
                if subscription:
                    await temp_db.subscriptions.update_one(
                        {"user_id": user_id},
                        {"$set": {"stripe_customer_id": stripe_customer_id}}
                    )
            
            # Convertir precio a céntimos
            price_cents = int(final_price * 100)
            
            # Crear Checkout Session para pago único
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                customer=stripe_customer_id,
                line_items=[{
                    "price_data": {
                        "currency": "eur",
                        "unit_amount": price_cents,
                        "product_data": {
                            "name": service.name,
                            "description": service.description[:500] if service.description else f"Servicio profesional: {service.name}"
                        }
                    },
                    "quantity": 1
                }],
                mode="payment",  # Pago único, no suscripción
                success_url=f"{os.getenv('STRIPE_SUCCESS_URL', 'http://localhost:5173')}/booking-success?session_id={{CHECKOUT_SESSION_ID}}&booking_id={booking.booking_id}",
                cancel_url=f"{os.getenv('STRIPE_CANCEL_URL', 'http://localhost:5173')}/professional-services",
                metadata={
                    "user_id": user_id,
                    "booking_id": booking.booking_id,
                    "service_id": request.service_id,
                    "service_type": "professional_service"
                },
                client_reference_id=booking.booking_id
            )
            
            # Actualizar reserva con session_id
            await bookings_collection.update_one(
                {"booking_id": booking.booking_id},
                {"$set": {"stripe_session_id": checkout_session.id}}
            )
            
            return {
                "booking": booking_dict,
                "checkout_url": checkout_session.url,
                "session_id": checkout_session.id,
                "next_step": "payment",
                "message": "Reserva creada. Redirigiendo al pago..."
            }
            
        except Exception as stripe_error:
            print(f"⚠️ Error creando sesión de Stripe: {stripe_error}")
            # Si falla Stripe, retornar reserva sin checkout_url (el admin puede procesar manualmente)
            return {
                "booking": booking_dict,
                "next_step": "payment",
                "message": "Reserva creada. El pago se procesará manualmente.",
                "error": "No se pudo crear sesión de pago automática"
            }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error en create_booking: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear reserva: {str(e)}"
        )


@router.get("/my-bookings")
async def get_my_bookings(
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene todas las reservas del usuario actual.

    Args:
        status_filter: Filtrar por estado
        skip: Offset para paginación
        limit: Límite de resultados

    Returns:
        Lista de reservas del usuario
    """
    try:
        user_id = str(current_user.get("_id"))

        # Construir query
        query = {"user_id": user_id}
        if status_filter:
            query["status"] = status_filter

        # Obtener reservas ordenadas por fecha (más reciente primero)
        bookings_cursor = bookings_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        bookings = await bookings_cursor.to_list(length=limit)

        # Limpiar _id
        for booking in bookings:
            booking.pop("_id", None)

        # Contar total
        total = await bookings_collection.count_documents(query)

        return {
            "bookings": bookings,
            "total": total,
            "skip": skip,
            "limit": limit
        }

    except Exception as e:
        print(f"❌ Error en get_my_bookings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener reservas: {str(e)}"
        )


@router.get("/bookings/{booking_id}")
async def get_booking_details(
    booking_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene detalles de una reserva específica.

    Args:
        booking_id: ID de la reserva

    Returns:
        ServiceBooking
    """
    try:
        user_id = str(current_user.get("_id"))

        booking = await bookings_collection.find_one({
            "booking_id": booking_id,
            "user_id": user_id
        })

        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reserva no encontrada"
            )

        booking.pop("_id", None)

        return booking

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error en get_booking_details: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener reserva: {str(e)}"
        )


@router.post("/bookings/{booking_id}/cancel")
async def cancel_booking(
    booking_id: str,
    request: CancelBookingRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Cancela una reserva.

    Args:
        booking_id: ID de la reserva
        request: Razón de cancelación

    Returns:
        Mensaje de confirmación
    """
    try:
        user_id = str(current_user.get("_id"))

        # Verificar que la reserva existe y pertenece al usuario
        booking = await bookings_collection.find_one({
            "booking_id": booking_id,
            "user_id": user_id
        })

        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reserva no encontrada"
            )

        # Verificar que no esté ya completada
        if booking.get("status") == BookingStatus.COMPLETED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede cancelar una reserva completada"
            )

        # Actualizar estado
        result = await bookings_collection.update_one(
            {"booking_id": booking_id},
            {
                "$set": {
                    "status": BookingStatus.CANCELLED.value,
                    "cancelled_at": datetime.utcnow().isoformat(),
                    "cancellation_reason": request.reason,
                    "updated_at": datetime.utcnow().isoformat()
                }
            }
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al cancelar reserva"
            )

        print(f"✅ Reserva cancelada: {booking_id}")

        # En producción, aquí se procesaría el reembolso si aplica

        return {
            "success": True,
            "message": "Reserva cancelada correctamente",
            "booking_id": booking_id
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error en cancel_booking: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al cancelar reserva: {str(e)}"
        )


# ========== ENDPOINTS DE ADMINISTRACIÓN ==========


@router.get("/admin/bookings")
async def get_all_bookings_admin(
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    admin: dict = Depends(require_admin)
):
    """
    Obtiene todas las reservas (solo admin).

    Args:
        status_filter: Filtrar por estado
        skip: Offset
        limit: Límite

    Returns:
        Lista de todas las reservas
    """
    try:
        query = {}
        if status_filter:
            query["status"] = status_filter

        bookings_cursor = bookings_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        bookings = await bookings_cursor.to_list(length=limit)

        for booking in bookings:
            booking.pop("_id", None)

        total = await bookings_collection.count_documents(query)

        return {
            "bookings": bookings,
            "total": total,
            "skip": skip,
            "limit": limit,
            "page": (skip // limit) + 1,
            "total_pages": (total + limit - 1) // limit
        }

    except Exception as e:
        print(f"❌ Error en get_all_bookings_admin: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener reservas: {str(e)}"
        )


@router.put("/admin/bookings/{booking_id}")
async def update_booking_admin(
    booking_id: str,
    request: UpdateBookingRequest,
    admin: dict = Depends(require_admin)
):
    """
    Actualiza una reserva (solo admin).

    Args:
        booking_id: ID de la reserva
        request: Datos a actualizar

    Returns:
        Reserva actualizada
    """
    try:
        update_data = {}

        if request.status is not None:
            update_data["status"] = request.status.value
            if request.status == BookingStatus.CONFIRMED:
                update_data["confirmed_at"] = datetime.utcnow().isoformat()
            elif request.status == BookingStatus.COMPLETED:
                update_data["completed_at"] = datetime.utcnow().isoformat()

        if request.scheduled_date:
            update_data["scheduled_date"] = request.scheduled_date

        if request.scheduled_time:
            update_data["scheduled_time"] = request.scheduled_time

        if request.meeting_link:
            update_data["meeting_link"] = request.meeting_link

        if request.admin_notes:
            update_data["admin_notes"] = request.admin_notes

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No hay datos para actualizar"
            )

        update_data["updated_at"] = datetime.utcnow().isoformat()

        result = await bookings_collection.update_one(
            {"booking_id": booking_id},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reserva no encontrada"
            )

        # Obtener reserva actualizada
        booking = await bookings_collection.find_one({"booking_id": booking_id})
        booking.pop("_id", None)

        print(f"✅ Reserva actualizada por admin: {booking_id}")

        return booking

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error en update_booking_admin: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar reserva: {str(e)}"
        )


@router.get("/admin/stats")
async def get_booking_stats_admin(
    admin: dict = Depends(require_admin)
):
    """
    Obtiene estadísticas de reservas (solo admin).

    Returns:
        BookingStats con métricas generales
    """
    try:
        # Contar por estados
        total_bookings = await bookings_collection.count_documents({})
        pending_payment = await bookings_collection.count_documents({"status": BookingStatus.PENDING_PAYMENT.value})
        confirmed = await bookings_collection.count_documents({"status": BookingStatus.CONFIRMED.value})
        scheduled = await bookings_collection.count_documents({"status": BookingStatus.SCHEDULED.value})
        completed = await bookings_collection.count_documents({"status": BookingStatus.COMPLETED.value})
        cancelled = await bookings_collection.count_documents({"status": BookingStatus.CANCELLED.value})

        # Calcular ingresos totales
        pipeline = [
            {"$match": {"payment_status": PaymentStatus.PAID.value}},
            {"$group": {"_id": None, "total": {"$sum": "$final_price"}}}
        ]
        revenue_result = await bookings_collection.aggregate(pipeline).to_list(1)
        total_revenue = revenue_result[0]["total"] if revenue_result else 0.0

        # Contar próximas reservas
        now = datetime.utcnow().isoformat()
        upcoming_bookings = await bookings_collection.count_documents({
            "status": {"$in": [BookingStatus.CONFIRMED.value, BookingStatus.SCHEDULED.value]},
            "scheduled_date": {"$gte": now}
        })

        stats = BookingStats(
            total_bookings=total_bookings,
            pending_payment=pending_payment,
            confirmed=confirmed,
            scheduled=scheduled,
            completed=completed,
            cancelled=cancelled,
            total_revenue=round(total_revenue, 2),
            upcoming_bookings=upcoming_bookings
        )

        return stats.dict()

    except Exception as e:
        print(f"❌ Error en get_booking_stats_admin: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener estadísticas: {str(e)}"
        )


@router.get("/admin/bookings/user/{user_id}")
async def get_user_bookings_admin(
    user_id: str,
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = None,
    admin: dict = Depends(require_admin)
):
    """
    Obtiene todas las reservas de un usuario específico (solo admin).

    Args:
        user_id: ID del usuario
        skip: Offset para paginación
        limit: Límite de resultados
        status_filter: Filtrar por estado (opcional)

    Returns:
        Lista de reservas del usuario
    """
    try:
        # Construir query
        query = {"user_id": user_id}
        if status_filter:
            query["status"] = status_filter

        # Obtener reservas ordenadas por fecha (más reciente primero)
        bookings_cursor = bookings_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
        bookings = await bookings_cursor.to_list(length=limit)

        # Limpiar _id
        for booking in bookings:
            booking.pop("_id", None)

        # Contar total
        total = await bookings_collection.count_documents(query)

        return {
            "bookings": bookings,
            "total": total,
            "skip": skip,
            "limit": limit,
            "page": (skip // limit) + 1,
            "total_pages": (total + limit - 1) // limit
        }

    except Exception as e:
        print(f"❌ Error en get_user_bookings_admin: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener reservas: {str(e)}"
        )
