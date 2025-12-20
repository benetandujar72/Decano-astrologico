"""
Endpoints para la demo interactiva con IA
"""
from fastapi import APIRouter, HTTPException, Body, Depends
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime
from typing import Optional

from app.models.demo_chat import (
    DemoSession, 
    StartDemoRequest, 
    ChatDemoRequest, 
    DemoMessage, 
    MessageRole,
    DemoStep
)
from app.services.demo_ai_service import demo_ai_service
from app.api.endpoints.auth import get_current_user

router = APIRouter()

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
async def start_demo_session(request: StartDemoRequest):
    """Inicia una nueva sesión de demo"""
    
    # Crear nueva sesión
    session = DemoSession(
        user_id=request.user_id or "anonymous", 
        chart_data=request.chart_data,
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
async def chat_demo(request: ChatDemoRequest):
    """Envía un mensaje a la sesión de demo"""
    
    # Recuperar sesión
    session_data = await demo_sessions_collection.find_one({"session_id": request.session_id})
    if not session_data:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    
    session = DemoSession(**session_data)
    
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
async def get_session_history(session_id: str):
    """Obtiene el historial de una sesión"""
    session_data = await demo_sessions_collection.find_one({"session_id": session_id})
    if not session_data:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    
    return DemoSession(**session_data)

from fastapi.responses import StreamingResponse
from app.services.report_generators import ReportGenerator
from io import BytesIO

@router.get("/pdf/{session_id}")
async def generate_demo_pdf(session_id: str):
    """Genera un PDF a partir de una sesión de demo"""
    session_data = await demo_sessions_collection.find_one({"session_id": session_id})
    if not session_data:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    
    session = DemoSession(**session_data)
    
    # Compilar el reporte desde los mensajes o el campo generated_report
    report_text = ""
    for step, text in session.generated_report.items():
        report_text += f"\n\n{text}"
        
    if not report_text:
        # Fallback a mensajes si no hay reporte estructurado
        report_text = "\n\n".join([m.content for m in session.messages if m.role == MessageRole.ASSISTANT])

    # Generar PDF
    try:
        generator = ReportGenerator(
            carta_data=session.chart_data,
            analysis_text=report_text,
            nombre=session.chart_data.get("name", "Visitante")
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
    sessions = await cursor.to_list(length=100)
    return sessions
