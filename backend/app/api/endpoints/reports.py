"""
Endpoints para generación de informes astrológicos en múltiples formatos
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel, Field
from typing import Optional
from app.api.endpoints.auth import get_current_user
from app.services.report_generators import generate_report
from app.services.subscription_permissions import require_feature
from app.services.full_report_service import full_report_service
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime
import os
from dotenv import load_dotenv
import sys

load_dotenv()

# MongoDB para sesiones de generación
MONGODB_URL = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI") or "mongodb://localhost:27017"
mongodb_options = {
    "serverSelectionTimeoutMS": 5000,
    "connectTimeoutMS": 10000,
}
if "mongodb+srv://" in MONGODB_URL or "mongodb.net" in MONGODB_URL:
    mongodb_options.update({"tls": True, "tlsAllowInvalidCertificates": True})

client = AsyncIOMotorClient(MONGODB_URL, **mongodb_options)
db = client.fraktal
report_sessions_collection = db.report_generation_sessions

router = APIRouter()


class ReportRequest(BaseModel):
    """Datos para generar informe"""
    carta_data: dict = Field(..., description="Datos completos de la carta astral")
    format: str = Field(..., description="Formato del informe: pdf, docx, markdown, html", example="pdf")
    analysis_text: Optional[str] = Field(None, description="Texto del análisis psico-astrológico")
    nombre: str = Field(default="", description="Nombre del consultante (para portada)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "carta_data": {
                    "datos_entrada": {
                        "fecha": "1990-01-15",
                        "hora": "14:30",
                        "latitud": 40.4168,
                        "longitud": -3.7038,
                        "zona_horaria": "Europe/Madrid"
                    },
                    "planetas": {},
                    "casas": [],
                    "angulos": {}
                },
                "format": "pdf",
                "analysis_text": "Análisis detallado..."
            }
        }


class StartReportGenerationRequest(BaseModel):
    """Inicia una sesión de generación de informe paso a paso"""
    carta_data: dict = Field(..., description="Datos completos de la carta astral")
    nombre: str = Field(default="", description="Nombre del consultante")


class GenerateModuleRequest(BaseModel):
    """Genera un módulo específico del informe"""
    session_id: str = Field(..., description="ID de la sesión de generación")
    module_id: str = Field(..., description="ID del módulo a generar")


@router.post("/generate")
async def generate_report_endpoint(
    request: ReportRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Genera un informe astrológico en el formato especificado
    
    Formatos soportados:
    - pdf: Documento PDF profesional
    - docx: Documento Word editable
    - markdown: Formato Markdown
    - html: Página web con estilos
    """
    try:
        format_lower = request.format.lower()
        
        print(f"[REPORTS] Generando informe en formato: {format_lower}", file=sys.stderr)
        print(f"[REPORTS] Usuario: {current_user.get('username', 'unknown')}", file=sys.stderr)
        
        # Validar formato
        valid_formats = ['pdf', 'docx', 'doc', 'markdown', 'md', 'html', 'web']
        if format_lower not in valid_formats:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Formato no válido. Use: {', '.join(valid_formats)}"
            )
        
        # Verificar permisos según formato
        user_id = str(current_user.get("_id"))
        try:
            if format_lower == 'pdf':
                await require_feature(user_id, "export_pdf")
            elif format_lower in ['docx', 'doc']:
                await require_feature(user_id, "export_docx")
            elif format_lower in ['html', 'web']:
                await require_feature(user_id, "export_html")
            # markdown/md siempre disponible
        except HTTPException as perm_error:
            print(f"[REPORTS] ❌ Error de permisos: {perm_error.detail}", file=sys.stderr)
            raise perm_error
        except Exception as perm_e:
            print(f"[REPORTS] ⚠️ Error verificando permisos (continuando): {perm_e}", file=sys.stderr)
            # Continuar si hay error verificando permisos (puede ser que el usuario no tenga suscripción)
        
        # Validar que carta_data tenga la estructura mínima necesaria
        if not request.carta_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="carta_data es requerido"
            )
            
        # [MODIFICACIÓN] Generación automática de texto si no viene en el request
        # Esto permite generar el informe completo de 25-30 páginas
        final_analysis_text = request.analysis_text
        if not final_analysis_text:
            try:
                print("[REPORTS] 🤖 Texto de análisis no provisto. Iniciando generación automática FULL (25+ págs)...", file=sys.stderr)
                user_name = request.nombre or current_user.get('full_name') or current_user.get('username') or "Consultante"
                final_analysis_text = await full_report_service.generate_full_report(request.carta_data, user_name)
                print(f"[REPORTS] ✅ Generación automática completada. Longitud: {len(final_analysis_text)} caracteres.", file=sys.stderr)
            except Exception as e:
                print(f"[REPORTS] ❌ Error en generación automática: {e}", file=sys.stderr)
                # Fallback básico si falla la generación
                final_analysis_text = "# Error en Generación Automática\n\nDisculpe, hubo un problema generando el análisis en tiempo real. Por favor intente más tarde."
        
        # Generar informe (con portada si hay nombre)
        try:
            report_content = generate_report(
                carta_data=request.carta_data,
                format=format_lower,
                analysis_text=final_analysis_text,
                nombre=request.nombre
            )
        except ImportError as import_err:
            print(f"[REPORTS] ❌ Error de dependencias: {import_err}", file=sys.stderr)
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail=f"El formato {format_lower} requiere dependencias adicionales. Contacte al administrador. Error: {str(import_err)}"
            )
        except ValueError as val_err:
            print(f"[REPORTS] ❌ Error de validación: {val_err}", file=sys.stderr)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(val_err)
            )
        except Exception as gen_err:
            print(f"[REPORTS] ❌ Error en generación: {type(gen_err).__name__}: {gen_err}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error generando informe en formato {format_lower}: {str(gen_err)}"
            )
        
        # Determinar tipo MIME y nombre de archivo
        if format_lower == 'pdf':
            media_type = 'application/pdf'
            extension = 'pdf'
        elif format_lower in ['docx', 'doc']:
            media_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            extension = 'docx'
        elif format_lower in ['markdown', 'md']:
            media_type = 'text/markdown'
            extension = 'md'
        elif format_lower in ['html', 'web']:
            media_type = 'text/html'
            extension = 'html'
        else:
            media_type = 'text/plain'
            extension = 'txt'
        
        # Generar nombre de archivo
        datos = request.carta_data.get('datos_entrada', {})
        fecha = datos.get('fecha', 'fecha').replace('-', '') if datos.get('fecha') else 'fecha'
        filename = f"carta_astral_{fecha}.{extension}"
        
        print(f"[REPORTS] ✅ Informe generado: {filename}", file=sys.stderr)
        
        # Para PDF y DOCX, retornar como stream
        if format_lower in ['pdf', 'docx', 'doc']:
            # Asegurar que report_content sea un BytesIO
            if isinstance(report_content, str):
                # Si es string, convertir a bytes
                report_content = report_content.encode('utf-8')
            elif hasattr(report_content, 'read'):
                # Si es BytesIO, está bien
                pass
            else:
                # Si es bytes, convertir a BytesIO
                from io import BytesIO
                buffer = BytesIO(report_content)
                report_content = buffer
            
            return StreamingResponse(
                report_content,
                media_type=media_type,
                headers={
                    'Content-Disposition': f'attachment; filename="{filename}"'
                }
            )
        else:
            # Para HTML y Markdown, retornar como texto
            if isinstance(report_content, bytes):
                report_content = report_content.decode('utf-8')
            
            return Response(
                content=report_content,
                media_type=media_type,
                headers={
                    'Content-Disposition': f'inline; filename="{filename}"'
                }
            )
        
    except HTTPException:
        # Re-lanzar HTTPExceptions sin modificar
        raise
    except Exception as e:
        print(f"[REPORTS] ❌ Error inesperado: {type(e).__name__}: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generando informe: {str(e)}"
        )


@router.get("/formats")
async def get_available_formats(current_user: dict = Depends(get_current_user)):
    """
    Retorna los formatos de informe disponibles con sus descripciones
    """
    return {
        "formats": [
            {
                "id": "web",
                "name": "Web / HTML",
                "description": "Página web con estilos visuales",
                "icon": "🌐",
                "available": True
            },
            {
                "id": "pdf",
                "name": "PDF",
                "description": "Documento PDF profesional",
                "icon": "📄",
                "available": True
            },
            {
                "id": "docx",
                "name": "Word (DOCX)",
                "description": "Documento Word editable",
                "icon": "📝",
                "available": True
            },
            {
                "id": "markdown",
                "name": "Markdown",
                "description": "Formato Markdown para edición",
                "icon": "📋",
                "available": True
            }
        ]
    }


@router.post("/start-generation")
async def start_report_generation(
    request: StartReportGenerationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Inicia una sesión de generación de informe paso a paso.
    Retorna el ID de sesión y la lista de módulos disponibles.
    """
    user_id = str(current_user.get("_id"))
    user_name = request.nombre or current_user.get('full_name') or current_user.get('username') or "Consultante"
    
    # Obtener lista de módulos
    sections = full_report_service._get_sections_definition()
    modules_list = [
        {
            "id": s["id"],
            "title": s["title"],
            "expected_min_chars": s["expected_min_chars"]
        }
        for s in sections
    ]
    
    # Crear sesión
    session_data = {
        "user_id": user_id,
        "user_name": user_name,
        "carta_data": request.carta_data,
        "generated_modules": {},
        "current_module_index": 0,
        "status": "in_progress",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }
    
    result = await report_sessions_collection.insert_one(session_data)
    session_id = str(result.inserted_id)
    
    return {
        "session_id": session_id,
        "total_modules": len(modules_list),
        "modules": modules_list,
        "current_module": modules_list[0] if modules_list else None
    }


@router.post("/generate-module")
async def generate_module(
    request: GenerateModuleRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Genera un módulo específico del informe.
    Requiere que el módulo anterior haya sido generado (excepto el primero).
    """
    user_id = str(current_user.get("_id"))
    
    # Buscar sesión
    try:
        session = await report_sessions_collection.find_one({"_id": ObjectId(request.session_id)})
    except:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    
    # Verificar que el usuario es el dueño
    if str(session.get("user_id")) != user_id:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta sesión")
    
    # Obtener módulos
    sections = full_report_service._get_sections_definition()
    module_index = next((i for i, s in enumerate(sections) if s['id'] == request.module_id), -1)
    
    if module_index == -1:
        raise HTTPException(status_code=400, detail=f"Módulo {request.module_id} no encontrado")
    
    # Verificar que los módulos anteriores estén generados (excepto el primero)
    if module_index > 0:
        previous_modules = [s['id'] for s in sections[:module_index]]
        generated = session.get("generated_modules", {})
        missing = [m for m in previous_modules if m not in generated]
        if missing:
            raise HTTPException(
                status_code=400, 
                detail=f"Debes generar primero los módulos anteriores: {', '.join(missing)}"
            )
    
    # Generar módulo
    try:
        previous_modules = list(session.get("generated_modules", {}).keys())
        content, is_last = await full_report_service.generate_single_module(
            session["carta_data"],
            session["user_name"],
            request.module_id,
            previous_modules
        )
        
        # Guardar módulo generado
        generated_modules = session.get("generated_modules", {})
        generated_modules[request.module_id] = {
            "content": content,
            "generated_at": datetime.utcnow().isoformat(),
            "length": len(content)
        }
        
        # Actualizar sesión
        update_data = {
            "generated_modules": generated_modules,
            "current_module_index": module_index + 1,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        if is_last:
            update_data["status"] = "completed"
            # Generar informe completo desde todos los módulos generados
            all_content = []
            for s in sections:
                if s['id'] in generated_modules:
                    module_data = generated_modules[s['id']]
                    if isinstance(module_data, dict) and 'content' in module_data:
                        all_content.append(f"## {s['title']}\n\n{module_data['content']}\n\n---\n\n")
                    elif isinstance(module_data, str):
                        all_content.append(f"## {s['title']}\n\n{module_data}\n\n---\n\n")
            update_data["full_report"] = "\n".join(all_content)
            update_data["full_report_length"] = len(update_data["full_report"])
        
        await report_sessions_collection.update_one(
            {"_id": ObjectId(request.session_id)},
            {"$set": update_data}
        )
        
        # Obtener siguiente módulo
        next_module = None
        if not is_last and module_index + 1 < len(sections):
            next_section = sections[module_index + 1]
            next_module = {
                "id": next_section["id"],
                "title": next_section["title"],
                "expected_min_chars": next_section["expected_min_chars"]
            }
        
        return {
            "module_id": request.module_id,
            "content": content,
            "length": len(content),
            "is_last": is_last,
            "next_module": next_module,
            "progress": {
                "current": module_index + 1,
                "total": len(sections)
            }
        }
        
    except Exception as e:
        print(f"[REPORTS] ❌ Error generando módulo {request.module_id}: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        raise HTTPException(
            status_code=500,
            detail=f"Error generando módulo: {str(e)}"
        )


@router.get("/generation-status/{session_id}")
async def get_generation_status(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtiene el estado de una sesión de generación"""
    user_id = str(current_user.get("_id"))
    
    try:
        session = await report_sessions_collection.find_one({"_id": ObjectId(session_id)})
    except:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    
    if str(session.get("user_id")) != user_id:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta sesión")
    
    sections = full_report_service._get_sections_definition()
    generated_modules = session.get("generated_modules", {})
    
    modules_status = []
    for i, s in enumerate(sections):
        is_generated = s['id'] in generated_modules
        module_data = generated_modules.get(s['id'], {})
        modules_status.append({
            "id": s['id'],
            "title": s['title'],
            "is_generated": is_generated,
            "length": module_data.get('length', 0) if isinstance(module_data, dict) else (len(module_data) if isinstance(module_data, str) else 0)
        })
    
    return {
        "session_id": session_id,
        "status": session.get("status", "in_progress"),
        "current_module_index": session.get("current_module_index", 0),
        "total_modules": len(sections),
        "modules": modules_status,
        "has_full_report": "full_report" in session and session.get("full_report")
    }


@router.get("/generation-full-report/{session_id}")
async def get_full_report_from_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtiene el informe completo generado de una sesión"""
    user_id = str(current_user.get("_id"))
    
    try:
        session = await report_sessions_collection.find_one({"_id": ObjectId(session_id)})
    except:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    
    if str(session.get("user_id")) != user_id:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta sesión")
    
    # Si ya está en la sesión, retornarlo
    if "full_report" in session and session["full_report"]:
        return {
            "full_report": session["full_report"],
            "total_length": len(session["full_report"]),
            "status": session.get("status", "completed")
        }
    
    # Si no está, construir desde módulos generados
    generated_modules = session.get("generated_modules", {})
    if not generated_modules:
        raise HTTPException(status_code=400, detail="No hay módulos generados aún")
    
    sections = full_report_service._get_sections_definition()
    all_content = []
    
    for s in sections:
        if s['id'] in generated_modules:
            module_data = generated_modules[s['id']]
            if isinstance(module_data, dict) and 'content' in module_data:
                all_content.append(f"## {s['title']}\n\n{module_data['content']}\n\n---\n\n")
            elif isinstance(module_data, str):
                all_content.append(f"## {s['title']}\n\n{module_data}\n\n---\n\n")
    
    full_report = "\n".join(all_content)
    
    # Guardar en sesión
    await report_sessions_collection.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {
            "full_report": full_report,
            "full_report_length": len(full_report),
            "status": "completed"
        }}
    )
    
    return {
        "full_report": full_report,
        "total_length": len(full_report),
        "status": "completed"
    }

