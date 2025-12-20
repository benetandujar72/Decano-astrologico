"""
Endpoints para la demo interactiva con IA
"""
from fastapi import APIRouter, HTTPException, Body, Depends, Query
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timedelta
from typing import Optional
from bson import ObjectId

from app.models.demo_chat import (
    DemoSession, 
    StartDemoRequest, 
    ChatDemoRequest, 
    DemoMessage, 
    MessageRole,
    DemoStep
)
from app.services.demo_ai_service import demo_ai_service
from app.api.endpoints.auth import get_current_user, get_optional_user, require_admin
from app.services.ephemeris import calcular_carta_completa

router = APIRouter()


def _is_anonymous_user_id(user_id: Optional[str]) -> bool:
    return not user_id or user_id == "anonymous"


def _ensure_session_access(session: DemoSession, current_user: Optional[dict]):
    """Permite acceso anónimo solo a sesiones anónimas; sesiones con owner requieren auth + ownership."""
    session_user_id = session.user_id
    if _is_anonymous_user_id(session_user_id):
        return

    if not current_user:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    current_user_id = str(current_user.get("_id"))
    if current_user_id != str(session_user_id) and current_user.get("role") != "admin":
        raise HTTPException(status_code=404, detail="Sesión no encontrada")


async def _find_session_data(session_id: str):
    """Busca una sesión por session_id, o por _id para compatibilidad.

    Motivo: existen sesiones legacy sin `session_id` guardado; el perfil
    debe poder operar con IDs estables.
    """
    session_data = await demo_sessions_collection.find_one({"session_id": session_id})
    if session_data:
        return session_data

    # Compat: permitir usar el ObjectId como identificador
    if ObjectId.is_valid(session_id):
        return await demo_sessions_collection.find_one({"_id": ObjectId(session_id)})

    # Compat: permitir `demo_<objectid>`
    if session_id.startswith("demo_"):
        maybe_oid = session_id[5:]
        if ObjectId.is_valid(maybe_oid):
            return await demo_sessions_collection.find_one({"_id": ObjectId(maybe_oid)})

    return None


async def _normalize_session_id_in_doc(session_data: dict) -> dict:
    """Asegura que el documento tenga `session_id` estable.

    Si falta, lo rellena con el string del `_id` (compatibilidad).
    """
    if session_data is None:
        return session_data

    if not session_data.get("session_id"):
        oid = session_data.get("_id")
        if oid is not None:
            session_data["session_id"] = str(oid)
            try:
                await demo_sessions_collection.update_one(
                    {"_id": oid},
                    {"$set": {"session_id": session_data["session_id"]}},
                )
            except Exception:
                # No bloquear por error de backfill
                pass
    return session_data

# MongoDB Configuration
MONGODB_URL = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI") or "mongodb://localhost:27017"
mongodb_options = {
    "serverSelectionTimeoutMS": 5000,
    "connectTimeoutMS": 10000,
}
if "mongodb+srv://" in MONGODB_URL or "mongodb.net" in MONGODB_URL:
    mongodb_options.update({"tls": True, "tlsAllowInvalidCertificates": True})

client = AsyncIOMotorClient(MONGODB_URL, **mongodb_options)
db = client.fraktal
demo_sessions_collection = db.demo_sessions

@router.post("/start", response_model=DemoSession)
async def start_demo_session(
    request: StartDemoRequest,
    current_user: Optional[dict] = Depends(get_optional_user),
):
    """Inicia una nueva sesión de demo"""

    chart_data = request.chart_data or {}
    
    # Calcular carta completa si faltan datos astrológicos
    if "planetas" not in chart_data:
        try:
            # Extraer datos necesarios
            fecha = chart_data.get("birth_date")
            hora = chart_data.get("birth_time", "12:00")
            lat = float(chart_data.get("latitude", 0))
            lon = float(chart_data.get("longitude", 0))
            
            # Calcular carta completa
            full_chart = calcular_carta_completa(
                fecha=fecha,
                hora=hora,
                latitud=lat,
                longitud=lon
            )
            
            # Fusionar con datos existentes (preservando nombre, lugar, etc.)
            chart_data.update(full_chart)
            
            # Asegurar que el nombre esté en datos_entrada también
            if "name" in chart_data:
                chart_data["datos_entrada"]["nombre"] = chart_data["name"]
                
        except Exception as e:
            print(f"Error calculando carta astral: {e}")
            # Continuar con datos básicos si falla el cálculo
            pass

    # Determinar owner real (no confiar en user_id del cliente si hay auth)
    owner_user_id: Optional[str]
    if current_user:
        owner_user_id = str(current_user.get("_id"))
    else:
        owner_user_id = request.user_id or "anonymous"

    # Crear nueva sesión
    session = DemoSession(
        user_id=owner_user_id,
        chart_data=chart_data,
        current_step=DemoStep.INITIAL
    )
    
    # Mensaje inicial de bienvenida
    welcome_msg = DemoMessage(
        role=MessageRole.ASSISTANT,
        content="¡Hola! Soy tu asistente astrológico personal. He analizado tu carta natal y estoy listo para guiarte a través de un viaje de autodescubrimiento. Empezaremos analizando tu estructura energética base (Elementos y Modalidades). Ten en cuenta que el análisis puede tardar unos minutos. ¡Gracias por tu paciencia! ¿Estás listo para comenzar?",
        step=DemoStep.INITIAL
    )
    session.messages.append(welcome_msg)
    
    # Guardar en DB
    await demo_sessions_collection.insert_one(session.model_dump())
    
    return session

@router.post("/chat", response_model=DemoSession)
async def chat_demo(
    request: ChatDemoRequest,
    current_user: Optional[dict] = Depends(get_optional_user),
):
    """Envía un mensaje a la sesión de demo"""
    
    # Recuperar sesión
    session_data = await _find_session_data(request.session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    session_data = await _normalize_session_id_in_doc(session_data)
    session = DemoSession(**session_data)
    _ensure_session_access(session, current_user)
    
    # Agregar mensaje del usuario
    user_msg = DemoMessage(
        role=MessageRole.USER,
        content=request.message,
        step=session.current_step
    )
    session.messages.append(user_msg)
    
    # Procesar con IA
    try:
        ai_response_text = await demo_ai_service.process_step(
            session, 
            request.message, 
            request.next_step
        )
    except Exception as e:
        print(f"Error en demo_ai_service: {e}")
        ai_response_text = "Lo siento, ha ocurrido un error interno al procesar tu mensaje. Por favor intenta de nuevo."
    
    # Agregar respuesta de IA
    ai_msg = DemoMessage(
        role=MessageRole.ASSISTANT,
        content=ai_response_text,
        step=session.current_step
    )
    session.messages.append(ai_msg)
    
    # Actualizar informe generado si es un paso de análisis
    if session.current_step != DemoStep.INITIAL and session.current_step != DemoStep.COMPLETED:
        session.generated_report[session.current_step.value] = ai_response_text
        
    session.updated_at = datetime.utcnow().isoformat()
    
    # Guardar cambios
    await demo_sessions_collection.replace_one(
        {"session_id": session.session_id},
        session.model_dump()
    )
    
    return session

@router.get("/history/{session_id}", response_model=DemoSession)
async def get_session_history(
    session_id: str,
    current_user: Optional[dict] = Depends(get_optional_user),
):
    """Obtiene el historial de una sesión"""
    session_data = await _find_session_data(session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    session_data = await _normalize_session_id_in_doc(session_data)
    session = DemoSession(**session_data)
    _ensure_session_access(session, current_user)
    return session

from fastapi.responses import StreamingResponse
from app.services.report_generators import ReportGenerator
from io import BytesIO

@router.get("/pdf/{session_id}")
async def generate_demo_pdf(
    session_id: str,
    current_user: Optional[dict] = Depends(get_optional_user),
):
    """Genera un PDF a partir de una sesión de demo"""
    session_data = await _find_session_data(session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    session_data = await _normalize_session_id_in_doc(session_data)
    session = DemoSession(**session_data)
    _ensure_session_access(session, current_user)
    
    # Compilar el reporte desde los mensajes o el campo generated_report
    report_text = ""
    for step, text in session.generated_report.items():
        report_text += f"\n\n{text}"
        
    if not report_text:
        # Fallback a mensajes si no hay reporte estructurado
        report_text = "\n\n".join([m.content for m in session.messages if m.role == MessageRole.ASSISTANT])

    # Generar PDF
    try:
        chart_data = session.chart_data
        
        # RECALCULAR SI FALTAN DATOS (Fix para sesiones antiguas o incompletas)
        if chart_data and ("planetas" not in chart_data or "datos_entrada" not in chart_data):
            try:
                print(f"Recalculando datos astrológicos para PDF (sesión {session_id})...")
                from app.services.ephemeris import calcular_carta_completa
                
                fecha = chart_data.get("birth_date")
                hora = chart_data.get("birth_time", "12:00")
                # Manejar lat/lon que pueden venir como strings
                lat = float(chart_data.get("latitude", 0))
                lon = float(chart_data.get("longitude", 0))
                
                if fecha:
                    full_chart = calcular_carta_completa(fecha, hora, lat, lon)
                    chart_data.update(full_chart)
                    
                    # Asegurar nombre en datos_entrada
                    if "name" in chart_data:
                        if "datos_entrada" not in chart_data:
                            chart_data["datos_entrada"] = {}
                        chart_data["datos_entrada"]["nombre"] = chart_data["name"]
            except Exception as calc_err:
                print(f"Error recalculando carta en PDF: {calc_err}")
                import traceback
                traceback.print_exc()

        generator = ReportGenerator(
            carta_data=chart_data,
            analysis_text=report_text,
            nombre=chart_data.get("name", "Visitante")
        )
        
        # Usar generate_pdf en lugar de create_pdf si ese es el nombre correcto en la clase
        # En report_generators.py definimos generate_pdf
        pdf_buffer = generator.generate_pdf() 
        pdf_buffer.seek(0)
        
        return StreamingResponse(
            pdf_buffer, 
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=demo_report_{session_id}.pdf"}
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")

@router.get("/my-sessions")
async def get_my_demo_sessions(current_user: dict = Depends(get_current_user)):
    """Obtiene las sesiones de demo del usuario actual"""
    user_id = str(current_user.get("_id"))
    # Buscar sesiones donde user_id coincida
    cursor = demo_sessions_collection.find({"user_id": user_id}).sort("created_at", -1)
    sessions_data = await cursor.to_list(length=100)
    
    sessions = []
    for s_data in sessions_data:
        s_data = await _normalize_session_id_in_doc(s_data)
        session = DemoSession(**s_data)
        # Si hay mensajes o reporte, asumimos que se puede generar PDF
        if session.messages or session.generated_report:
            session.pdf_generated = True
        sessions.append(session)
        
    return sessions


@router.get("/session/{session_id}", response_model=DemoSession)
async def get_demo_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Obtiene una sesión (incluyendo chat) si pertenece al usuario actual."""
    session_data = await _find_session_data(session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    session_data = await _normalize_session_id_in_doc(session_data)
    session = DemoSession(**session_data)
    _ensure_session_access(session, current_user)
    return session


@router.delete("/session/{session_id}")
async def delete_demo_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Elimina una sesión de demo del usuario. Al borrar la sesión, también desaparece su PDF."""
    session_data = await _find_session_data(session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    session_data = await _normalize_session_id_in_doc(session_data)
    session = DemoSession(**session_data)
    _ensure_session_access(session, current_user)

    # Borrar por session_id si existe, y fallback a _id
    delete_filter = {"session_id": session.session_id}
    if ObjectId.is_valid(session_id):
        delete_filter = {"$or": [delete_filter, {"_id": ObjectId(session_id)}]}

    res = await demo_sessions_collection.delete_one(delete_filter)
    return {"deleted": res.deleted_count == 1}


@router.delete("/purge")
async def purge_demo_sessions(
    older_than_days: int = Query(..., ge=1, le=3650),
    only_anonymous: bool = Query(True),
    admin: dict = Depends(require_admin),
):
    """Elimina sesiones antiguas (admin-only). Por defecto, solo borra sesiones anónimas."""
    cutoff_dt = datetime.utcnow() - timedelta(days=older_than_days)
    cutoff = cutoff_dt.isoformat()

    base_filter = {"created_at": {"$lt": cutoff}}
    if only_anonymous:
        base_filter["$or"] = [
            {"user_id": {"$exists": False}},
            {"user_id": None},
            {"user_id": ""},
            {"user_id": "anonymous"},
        ]

    res = await demo_sessions_collection.delete_many(base_filter)
    return {"deleted_count": res.deleted_count, "older_than_days": older_than_days, "only_anonymous": only_anonymous}
