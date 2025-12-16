"""
Endpoints para sistema de consultas con experto IA
"""
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from typing import List, Optional
import os
from dotenv import load_dotenv

from app.api.endpoints.auth import get_current_user, require_admin
from app.models.expert_consultation import (
    ExpertConsultation,
    ChatMessage,
    MessageRole,
    ConsultationStatus,
    StartConsultationRequest,
    SendMessageRequest,
    ConsultationUsageStats
)
from app.services.subscription_permissions import (
    require_expert_consultation_quota,
    check_expert_consultation_quota
)
from app.services.ai_expert_service import get_ai_response, get_welcome_message

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
consultations_collection = db.expert_consultations
charts_collection = db.charts
users_collection = db.users


@router.get("/usage-stats")
async def get_consultation_usage_stats(
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene estadísticas de uso de consultas con experto para el usuario actual.

    Returns:
        ConsultationUsageStats con información de cuota y uso
    """
    try:
        user_id = str(current_user.get("_id"))

        # Verificar cuota
        can_create, current_count, limit = await check_expert_consultation_quota(user_id)

        # Obtener tier del usuario
        from app.services.subscription_permissions import get_user_subscription_tier
        tier = await get_user_subscription_tier(user_id)

        # Calcular consultas restantes
        remaining = -1 if limit == -1 else max(0, limit - current_count)

        stats = ConsultationUsageStats(
            user_id=user_id,
            tier=tier.value,
            consultations_this_month=current_count,
            consultations_limit=limit,
            remaining_consultations=remaining,
            can_create_consultation=can_create
        )

        return stats.dict()

    except Exception as e:
        print(f"❌ Error en get_consultation_usage_stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener estadísticas: {str(e)}"
        )


@router.post("/start")
async def start_consultation(
    request: StartConsultationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Inicia una nueva consulta con el experto IA.

    Args:
        request: Datos iniciales de la consulta

    Returns:
        ExpertConsultation creada con mensaje de bienvenida
    """
    try:
        user_id = str(current_user.get("_id"))

        # Verificar permisos y cuota
        await require_expert_consultation_quota(user_id)

        # Obtener contenido del informe si se proporciona chart_id
        report_content = request.report_content
        if request.chart_id and not report_content:
            chart = await charts_collection.find_one({"chart_id": request.chart_id})
            if chart:
                report_content = chart.get("analysis", {}).get("content", "")

        # Crear consulta
        consultation = ExpertConsultation(
            user_id=user_id,
            chart_id=request.chart_id,
            report_content=report_content,
            status=ConsultationStatus.ACTIVE
        )

        # Mensaje de bienvenida del experto
        username = current_user.get("username", "")
        welcome_msg = await get_welcome_message(username)

        welcome_message = ChatMessage(
            role=MessageRole.ASSISTANT,
            content=welcome_msg
        )

        consultation.messages.append(welcome_message)
        consultation.total_messages = 1
        consultation.ai_messages_count = 1

        # Si hay pregunta inicial, procesarla
        if request.initial_question:
            # Agregar pregunta del usuario
            user_message = ChatMessage(
                role=MessageRole.USER,
                content=request.initial_question
            )
            consultation.messages.append(user_message)
            consultation.user_messages_count += 1
            consultation.total_messages += 1

            # Obtener respuesta del experto IA
            conversation_history = [
                {"role": "assistant", "content": welcome_msg},
                {"role": "user", "content": request.initial_question}
            ]

            ai_response = await get_ai_response(
                request.initial_question,
                conversation_history,
                report_content
            )

            # Agregar respuesta del experto
            ai_message = ChatMessage(
                role=MessageRole.ASSISTANT,
                content=ai_response
            )
            consultation.messages.append(ai_message)
            consultation.ai_messages_count += 1
            consultation.total_messages += 1

        # Guardar en BD
        consultation_dict = consultation.dict()
        await consultations_collection.insert_one(consultation_dict)

        # Limpiar _id de MongoDB para respuesta
        consultation_dict.pop("_id", None)

        print(f"✅ Consulta iniciada: {consultation.consultation_id} para usuario {user_id}")

        return consultation_dict

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error en start_consultation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al iniciar consulta: {str(e)}"
        )


@router.post("/{consultation_id}/message")
async def send_message(
    consultation_id: str,
    request: SendMessageRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Envía un mensaje en una consulta activa y obtiene respuesta del experto IA.

    Args:
        consultation_id: ID de la consulta
        request: Mensaje del usuario

    Returns:
        Consulta actualizada con el nuevo mensaje y respuesta
    """
    try:
        user_id = str(current_user.get("_id"))

        # Obtener consulta
        consultation = await consultations_collection.find_one({
            "consultation_id": consultation_id,
            "user_id": user_id
        })

        if not consultation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Consulta no encontrada"
            )

        # Verificar que esté activa
        if consultation.get("status") != ConsultationStatus.ACTIVE.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Esta consulta ya no está activa"
            )

        # Agregar mensaje del usuario
        user_message = ChatMessage(
            role=MessageRole.USER,
            content=request.message
        )

        # Construir historial de conversación para la IA
        messages_history = consultation.get("messages", [])
        conversation_history = [
            {
                "role": msg["role"],
                "content": msg["content"]
            }
            for msg in messages_history
        ]

        # Obtener respuesta del experto IA
        report_content = consultation.get("report_content")
        ai_response = await get_ai_response(
            request.message,
            conversation_history,
            report_content
        )

        # Crear mensaje de respuesta
        ai_message = ChatMessage(
            role=MessageRole.ASSISTANT,
            content=ai_response
        )

        # Actualizar consulta
        new_messages = [user_message.dict(), ai_message.dict()]

        update_result = await consultations_collection.update_one(
            {"consultation_id": consultation_id},
            {
                "$push": {"messages": {"$each": new_messages}},
                "$inc": {
                    "total_messages": 2,
                    "user_messages_count": 1,
                    "ai_messages_count": 1
                },
                "$set": {"updated_at": datetime.utcnow().isoformat()}
            }
        )

        if update_result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al actualizar consulta"
            )

        # Obtener consulta actualizada
        updated_consultation = await consultations_collection.find_one({
            "consultation_id": consultation_id
        })

        updated_consultation.pop("_id", None)

        print(f"✅ Mensaje enviado en consulta {consultation_id}")

        return updated_consultation

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error en send_message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al enviar mensaje: {str(e)}"
        )


@router.get("/{consultation_id}/history")
async def get_consultation_history(
    consultation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene el historial completo de una consulta.

    Args:
        consultation_id: ID de la consulta

    Returns:
        ExpertConsultation con todo el historial
    """
    try:
        user_id = str(current_user.get("_id"))

        consultation = await consultations_collection.find_one({
            "consultation_id": consultation_id,
            "user_id": user_id
        })

        if not consultation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Consulta no encontrada"
            )

        consultation.pop("_id", None)

        return consultation

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error en get_consultation_history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener historial: {str(e)}"
        )


@router.get("/my-consultations")
async def get_my_consultations(
    skip: int = 0,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene todas las consultas del usuario actual.

    Args:
        skip: Offset para paginación
        limit: Límite de resultados

    Returns:
        Lista de consultas del usuario
    """
    try:
        user_id = str(current_user.get("_id"))

        # Obtener consultas ordenadas por fecha (más reciente primero)
        consultations_cursor = consultations_collection.find(
            {"user_id": user_id}
        ).sort("created_at", -1).skip(skip).limit(limit)

        consultations = await consultations_cursor.to_list(length=limit)

        # Limpiar _id
        for consultation in consultations:
            consultation.pop("_id", None)

        # Contar total
        total = await consultations_collection.count_documents({"user_id": user_id})

        return {
            "consultations": consultations,
            "total": total,
            "skip": skip,
            "limit": limit
        }

    except Exception as e:
        print(f"❌ Error en get_my_consultations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener consultas: {str(e)}"
        )


@router.post("/{consultation_id}/complete")
async def complete_consultation(
    consultation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Marca una consulta como completada.

    Args:
        consultation_id: ID de la consulta

    Returns:
        Consulta actualizada
    """
    try:
        user_id = str(current_user.get("_id"))

        result = await consultations_collection.update_one(
            {
                "consultation_id": consultation_id,
                "user_id": user_id
            },
            {
                "$set": {
                    "status": ConsultationStatus.COMPLETED.value,
                    "completed_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                }
            }
        )

        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Consulta no encontrada"
            )

        consultation = await consultations_collection.find_one({
            "consultation_id": consultation_id
        })

        consultation.pop("_id", None)

        print(f"✅ Consulta completada: {consultation_id}")

        return consultation

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error en complete_consultation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al completar consulta: {str(e)}"
        )


@router.delete("/{consultation_id}")
async def cancel_consultation(
    consultation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Cancela una consulta activa.

    Args:
        consultation_id: ID de la consulta

    Returns:
        Mensaje de confirmación
    """
    try:
        user_id = str(current_user.get("_id"))

        result = await consultations_collection.update_one(
            {
                "consultation_id": consultation_id,
                "user_id": user_id,
                "status": ConsultationStatus.ACTIVE.value
            },
            {
                "$set": {
                    "status": ConsultationStatus.CANCELLED.value,
                    "updated_at": datetime.utcnow().isoformat()
                }
            }
        )

        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Consulta no encontrada o ya no está activa"
            )

        print(f"✅ Consulta cancelada: {consultation_id}")

        return {
            "success": True,
            "message": "Consulta cancelada correctamente"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error en cancel_consultation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al cancelar consulta: {str(e)}"
        )


# ========== ENDPOINTS DE ADMINISTRACIÓN ==========


@router.get("/admin/user/{user_id}")
async def get_user_consultations_admin(
    user_id: str,
    skip: int = 0,
    limit: int = 50,
    admin: dict = Depends(require_admin)
):
    """
    Obtiene todas las consultas de un usuario específico (solo admin).

    Args:
        user_id: ID del usuario
        skip: Offset para paginación
        limit: Límite de resultados

    Returns:
        Lista de consultas del usuario
    """
    try:
        # Obtener consultas ordenadas por fecha (más reciente primero)
        consultations_cursor = consultations_collection.find(
            {"user_id": user_id}
        ).sort("created_at", -1).skip(skip).limit(limit)

        consultations = await consultations_cursor.to_list(length=limit)

        # Limpiar _id
        for consultation in consultations:
            consultation.pop("_id", None)

        # Contar total
        total = await consultations_collection.count_documents({"user_id": user_id})

        return {
            "consultations": consultations,
            "total": total,
            "skip": skip,
            "limit": limit,
            "page": (skip // limit) + 1,
            "total_pages": (total + limit - 1) // limit
        }

    except Exception as e:
        print(f"❌ Error en get_user_consultations_admin: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener consultas: {str(e)}"
        )


@router.get("/admin/all")
async def get_all_consultations_admin(
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = None,
    admin: dict = Depends(require_admin)
):
    """
    Obtiene todas las consultas del sistema (solo admin).

    Args:
        skip: Offset para paginación
        limit: Límite de resultados
        status_filter: Filtrar por estado (opcional)

    Returns:
        Lista de todas las consultas
    """
    try:
        query = {}
        if status_filter:
            query["status"] = status_filter

        # Obtener consultas ordenadas por fecha (más reciente primero)
        consultations_cursor = consultations_collection.find(
            query
        ).sort("created_at", -1).skip(skip).limit(limit)

        consultations = await consultations_cursor.to_list(length=limit)

        # Limpiar _id
        for consultation in consultations:
            consultation.pop("_id", None)

        # Contar total
        total = await consultations_collection.count_documents(query)

        return {
            "consultations": consultations,
            "total": total,
            "skip": skip,
            "limit": limit,
            "page": (skip // limit) + 1,
            "total_pages": (total + limit - 1) // limit
        }

    except Exception as e:
        print(f"❌ Error en get_all_consultations_admin: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener consultas: {str(e)}"
        )
