"""
Endpoints para generación de informes astrológicos en múltiples formatos
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel, Field
from typing import Optional, Any, Dict
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
import asyncio
import uuid
import re

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

def _clean_generated_text(txt: str, *, keep_module_headings: bool = True) -> str:
    """
    Limpia texto generado por la IA para uso en informe:
    - elimina bloques de \"CONFIRMACIÓN REQUERIDA\"
    - opcionalmente evita que un módulo contenga otro (\"## MÓDULO X\") por concatenación accidental
      (NO debe usarse al ensamblar el informe completo, o se truncará en el MÓDULO 1).
    """
    if not txt:
        return ""
    m = re.search(r"confirmaci[oó]n requerida\s*:", txt, flags=re.IGNORECASE)
    if m:
        txt = txt[: m.start()].rstrip()
    if not keep_module_headings:
        m2 = re.search(r"\n##\s*m[óo]dulo\s+\d", txt, flags=re.IGNORECASE)
        if m2:
            txt = txt[: m2.start()].rstrip()
    return txt.strip()


class ReportRequest(BaseModel):
    """Datos para generar informe"""
    carta_data: dict = Field(..., description="Datos completos de la carta astral")
    format: str = Field(..., description="Formato del informe: pdf, docx, markdown, html", example="pdf")
    analysis_text: Optional[str] = Field(None, description="Texto del análisis psico-astrológico")
    report_mode: str = Field(default="full", description="Modo del informe: full (exhaustivo ~30 págs) | light (ligero 6–8 págs)", example="full")
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
    report_mode: str = Field(default="full", description="Modo del informe: full (exhaustivo ~30 págs) | light (ligero 6–8 págs)", example="full")

class QueueFullReportRequest(BaseModel):
    """Inicia y encola la generación completa del informe (todos los módulos)"""
    carta_data: dict = Field(..., description="Datos completos de la carta astral")
    nombre: str = Field(default="", description="Nombre del consultante")
    report_mode: str = Field(default="full", description="Modo del informe: full (exhaustivo ~30 págs) | light (ligero 6–8 págs)", example="full")


class GenerateModuleRequest(BaseModel):
    """Genera un módulo específico del informe"""
    session_id: str = Field(..., description="ID de la sesión de generación")
    module_id: str = Field(..., description="ID del módulo a generar")

async def _set_module_run_fields(session_id: str, module_id: str, fields: Dict[str, Any]) -> None:
    """Actualiza campos del estado de ejecución de un módulo en Mongo."""
    await report_sessions_collection.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {f"module_runs.{module_id}.{k}": v for k, v in fields.items()}}
    )

async def _push_module_step(session_id: str, module_id: str, step: str, ok: bool = True, note: Optional[str] = None, meta: Optional[Dict[str, Any]] = None) -> None:
    """Agrega un paso de progreso (forense) al módulo."""
    step_doc: Dict[str, Any] = {
        "step": step,
        "ok": ok,
        "at": datetime.utcnow().isoformat(),
    }
    if note:
        step_doc["note"] = note
    if meta:
        step_doc["meta"] = meta
    await report_sessions_collection.update_one(
        {"_id": ObjectId(session_id)},
        {"$push": {f"module_runs.{module_id}.steps": step_doc},
         "$set": {f"module_runs.{module_id}.updated_at": datetime.utcnow().isoformat()}}
    )

async def _run_module_job(session_id: str, module_id: str, user_id: str) -> None:
    """Job asíncrono: genera un módulo sin mantener la conexión HTTP abierta."""
    try:
        session = await report_sessions_collection.find_one({"_id": ObjectId(session_id)})
        if not session:
            return
        if str(session.get("user_id")) != user_id:
            return

        report_mode = (session.get("report_mode") or "full").lower().strip()
        sections = full_report_service._get_sections_definition(report_mode=report_mode)
        module_index = next((i for i, s in enumerate(sections) if s["id"] == module_id), -1)
        if module_index == -1:
            await _set_module_run_fields(session_id, module_id, {"status": "error", "error": "Módulo no encontrado"})
            return

        await _set_module_run_fields(session_id, module_id, {
            "status": "running",
            "started_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "error": None,
        })
        await _push_module_step(session_id, module_id, "job_started", True)
        # Guardar el índice del módulo que se está ejecutando (para UI en tiempo real)
        try:
            await report_sessions_collection.update_one(
                {"_id": ObjectId(session_id)},
                {"$set": {"current_module_index": module_index, "updated_at": datetime.utcnow().isoformat()}},
            )
        except Exception:
            pass

        previous_modules = list(session.get("generated_modules", {}).keys())

        # Hook de progreso desde el generador
        async def progress_cb(step: str, meta: Optional[Dict[str, Any]] = None) -> None:
            await _push_module_step(session_id, module_id, step, True, meta=meta)

        # Ejecutar con timeout alto (la clave es NO mantener HTTP abierto)
        # Aumentado a 40 minutos para módulos complejos que pueden tardar más
        content, is_last, usage_metadata = await asyncio.wait_for(
            full_report_service.generate_single_module(
                session["carta_data"],
                session["user_name"],
                module_id,
                report_mode,
                previous_modules,
                progress_cb=progress_cb,
                chart_facts=session.get("chart_facts"),
            ),
            timeout=60 * 40,  # 40 minutos por módulo como job (aumentado de 20)
        )

        # Guardar módulo generado (limpio para PDF/UI)
        # Aquí sí queremos evitar concatenaciones accidentales de otros módulos.
        content = _clean_generated_text(str(content), keep_module_headings=False)
        generated_modules = session.get("generated_modules", {})
        generated_modules[module_id] = {
            "content": content,
            "generated_at": datetime.utcnow().isoformat(),
            "length": len(content),
        }

        update_data: Dict[str, Any] = {
            "generated_modules": generated_modules,
            "current_module_index": module_index + 1,
            "updated_at": datetime.utcnow().isoformat(),
        }

        if is_last:
            update_data["status"] = "completed"
            all_content = []
            for s in sections:
                if s["id"] in generated_modules:
                    module_data = generated_modules[s["id"]]
                    if isinstance(module_data, dict) and "content" in module_data:
                        all_content.append(f"## {s['title']}\n\n{_clean_generated_text(str(module_data['content']))}\n\n---\n\n")
                    elif isinstance(module_data, str):
                        all_content.append(f"## {s['title']}\n\n{_clean_generated_text(str(module_data))}\n\n---\n\n")
            # En el informe completo NO debemos truncar por encabezados de módulo
            update_data["full_report"] = _clean_generated_text("\n".join(all_content), keep_module_headings=True)
            update_data["full_report_length"] = len(update_data["full_report"])

        await report_sessions_collection.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": update_data},
        )

        # Marcar job como completado
        await _set_module_run_fields(session_id, module_id, {
            "status": "done",
            "length": len(content),
            "done_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        })
        await _push_module_step(session_id, module_id, "job_done", True, meta={"length": len(content)})

        # Registrar uso de IA (no bloquea el job si falla)
        try:
            from app.models.ai_usage_tracking import AIActionType
            from app.services.ai_usage_tracker import track_ai_usage

            await track_ai_usage(
                user_id=user_id,
                user_name=session["user_name"],
                action_type=AIActionType.REPORT_MODULE_GENERATION,
                model_used=full_report_service.ai_service.current_model,
                prompt_tokens=usage_metadata.get("prompt_token_count", 0),
                response_tokens=usage_metadata.get("candidates_token_count", 0),
                total_tokens=usage_metadata.get("total_token_count", 0),
                session_id=session_id,
                module_id=module_id,
                metadata={
                    "content_length": len(content),
                    "attempts": usage_metadata.get("attempts", 1),
                    "module_title": next((s["title"] for s in sections if s["id"] == module_id), "Unknown"),
                },
            )
        except Exception as track_err:
            await _push_module_step(session_id, module_id, "ai_usage_track_failed", False, note=str(track_err))

    except asyncio.TimeoutError:
        await _set_module_run_fields(session_id, module_id, {
            "status": "error",
            "error": "Timeout generando módulo (job). El módulo tardó más de 40 minutos. Puedes intentar regenerarlo.",
            "updated_at": datetime.utcnow().isoformat(),
        })
        await _push_module_step(session_id, module_id, "timeout", False)
    except Exception as e:
        await _set_module_run_fields(session_id, module_id, {
            "status": "error",
            "error": f"{type(e).__name__}: {str(e)}",
            "updated_at": datetime.utcnow().isoformat(),
        })
        await _push_module_step(session_id, module_id, "exception", False, note=f"{type(e).__name__}: {str(e)}")


async def _run_full_report_job(session_id: str, user_id: str, job_id: str) -> None:
    """
    Job batch asíncrono: genera TODOS los módulos en orden, con checkpoints en Mongo.
    Reutiliza la misma lógica de `_run_module_job` para mantener rigor, validaciones y trazabilidad.
    """
    try:
        # Marcar batch como running
        await report_sessions_collection.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {
                "batch_job": {
                    "job_id": job_id,
                    "status": "running",
                    "started_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                    "error": None,
                },
                "updated_at": datetime.utcnow().isoformat(),
            }}
        )

        # Fijar el modo del informe a nivel de sesión (default: full/exhaustivo)
        session0 = await report_sessions_collection.find_one({"_id": ObjectId(session_id)})
        report_mode = ((session0 or {}).get("report_mode") or "full").lower().strip()
        sections = full_report_service._get_sections_definition(report_mode=report_mode)

        for section in sections:
            module_id = section["id"]

            # Releer sesión para ver progreso real
            session = await report_sessions_collection.find_one({"_id": ObjectId(session_id)})
            if not session:
                return
            if str(session.get("user_id")) != user_id:
                return

            # Si ya está generado, saltar
            generated_modules = session.get("generated_modules", {}) or {}
            if module_id in generated_modules:
                continue

            # Lanzar y esperar el job del módulo (secuencial)
            await _run_module_job(session_id, module_id, user_id)

            # Si falló, cortar el batch
            session_after = await report_sessions_collection.find_one({"_id": ObjectId(session_id)})
            if not session_after:
                return
            run_info = (session_after.get("module_runs", {}) or {}).get(module_id, {}) or {}
            if run_info.get("status") == "error":
                err = run_info.get("error") or "Error desconocido"
                await report_sessions_collection.update_one(
                    {"_id": ObjectId(session_id)},
                    {"$set": {
                        "status": "error",
                        "updated_at": datetime.utcnow().isoformat(),
                        "batch_job.status": "error",
                        "batch_job.error": err,
                        "batch_job.updated_at": datetime.utcnow().isoformat(),
                    }}
                )
                return

        # Si llegamos aquí, todo OK (el último módulo ya habrá marcado completed)
        await report_sessions_collection.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {
                "batch_job.status": "done",
                "batch_job.done_at": datetime.utcnow().isoformat(),
                "batch_job.updated_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }}
        )

    except Exception as e:
        # Nunca dejar el batch sin marcar (observabilidad)
        try:
            await report_sessions_collection.update_one(
                {"_id": ObjectId(session_id)},
                {"$set": {
                    "status": "error",
                    "updated_at": datetime.utcnow().isoformat(),
                    "batch_job.status": "error",
                    "batch_job.error": f"{type(e).__name__}: {str(e)}",
                    "batch_job.updated_at": datetime.utcnow().isoformat(),
                }}
            )
        except Exception:
            pass


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
                report_mode = (request.report_mode or "full").lower().strip()
                if report_mode not in {"full", "light"}:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="report_mode no válido. Usa: full | light")

                print(f"[REPORTS] 🤖 Texto de análisis no provisto. Iniciando generación automática ({report_mode})...", file=sys.stderr)
                user_name = request.nombre or current_user.get('full_name') or current_user.get('username') or "Consultante"
                final_analysis_text = await full_report_service.generate_full_report(request.carta_data, user_name, report_mode=report_mode)
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
    report_mode = (request.report_mode or "full").lower().strip()
    if report_mode not in {"full", "light"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="report_mode no válido. Usa: full | light")
    
    # Obtener lista de módulos
    sections = full_report_service._get_sections_definition(report_mode=report_mode)
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
        "report_mode": report_mode,
        # Facts compactos para reducir tokens/latencia (reutilizable por módulo)
        "chart_facts": full_report_service.build_chart_facts(request.carta_data),
        "generated_modules": {},
        "module_runs": {},
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


@router.post("/queue-full-report")
async def queue_full_report(
    request: QueueFullReportRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Inicia una sesión y encola la generación COMPLETA del informe (todos los módulos) en background.
    Devuelve rápido `session_id` + `job_id` para que el frontend haga polling de estado.
    """
    user_id = str(current_user.get("_id"))
    user_name = request.nombre or current_user.get('full_name') or current_user.get('username') or "Consultante"

    report_mode = (request.report_mode or "full").lower().strip()
    if report_mode not in {"full", "light"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="report_mode no válido. Usa: full | light")

    sections = full_report_service._get_sections_definition(report_mode=report_mode)
    modules_list = [{"id": s["id"], "title": s["title"], "expected_min_chars": s["expected_min_chars"]} for s in sections]

    job_id = str(uuid.uuid4())

    session_data = {
        "user_id": user_id,
        "user_name": user_name,
        "carta_data": request.carta_data,
        "report_mode": report_mode,
        # Facts compactos para reducir tokens/latencia (reutilizable por módulo)
        "chart_facts": full_report_service.build_chart_facts(request.carta_data),
        "generated_modules": {},
        "module_runs": {},
        "current_module_index": 0,
        "status": "in_progress",
        "batch_job": {
            "job_id": job_id,
            "status": "queued",
            "queued_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "error": None,
        },
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }

    result = await report_sessions_collection.insert_one(session_data)
    session_id = str(result.inserted_id)

    # Lanzar batch job
    asyncio.create_task(_run_full_report_job(session_id, user_id, job_id))

    return {
        "session_id": session_id,
        "job_id": job_id,
        "total_modules": len(modules_list),
        "modules": modules_list,
        "status": "queued",
    }

@router.post("/queue-module")
async def queue_module(
    request: GenerateModuleRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Encola (inicia) la generación de un módulo como job en background.
    Responde rápido para evitar Pending/timeout del navegador/proxy.
    """
    user_id = str(current_user.get("_id"))

    try:
        session = await report_sessions_collection.find_one({"_id": ObjectId(request.session_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    if str(session.get("user_id")) != user_id:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta sesión")

    report_mode = ((session.get("report_mode") or "full") if isinstance(session, dict) else "full").lower().strip()
    sections = full_report_service._get_sections_definition(report_mode=report_mode)
    module_index = next((i for i, s in enumerate(sections) if s["id"] == request.module_id), -1)
    if module_index == -1:
        raise HTTPException(status_code=400, detail=f"Módulo {request.module_id} no encontrado")

    # Verificar que módulos previos estén generados
    if module_index > 0:
        previous_modules = [s["id"] for s in sections[:module_index]]
        generated = session.get("generated_modules", {})
        missing = [m for m in previous_modules if m not in generated]
        if missing:
            raise HTTPException(status_code=400, detail=f"Debes generar primero los módulos anteriores: {', '.join(missing)}")

    # Si ya generado, devolver estado inmediato
    if request.module_id in session.get("generated_modules", {}):
        module_data = session["generated_modules"][request.module_id]
        length = module_data.get("length", 0) if isinstance(module_data, dict) else len(str(module_data))
        return {"session_id": request.session_id, "module_id": request.module_id, "status": "done", "length": length}

    # Evitar duplicar jobs si ya está en running/queued
    # Pero permitir reintento si está en error (especialmente después de timeout)
    module_runs = session.get("module_runs", {}) or {}
    current_run = module_runs.get(request.module_id, {}) if isinstance(module_runs, dict) else {}
    current_status = current_run.get("status")
    if current_status in {"queued", "running"}:
        return {"session_id": request.session_id, "module_id": request.module_id, "status": current_status}
    # Si está en error, permitir reintento limpiando el estado anterior
    if current_status == "error":
        # Limpiar el estado de error para permitir reintento
        await _set_module_run_fields(request.session_id, request.module_id, {
            "status": None,
            "error": None,
            "updated_at": datetime.utcnow().isoformat(),
        })

    # Marcar como queued y lanzar tarea
    await _set_module_run_fields(request.session_id, request.module_id, {
        "status": "queued",
        "queued_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "steps": [],
        "error": None,
    })
    await _push_module_step(request.session_id, request.module_id, "queued", True)

    asyncio.create_task(_run_module_job(request.session_id, request.module_id, user_id))

    return {"session_id": request.session_id, "module_id": request.module_id, "status": "queued"}

@router.get("/module-status/{session_id}/{module_id}")
async def get_module_status(
    session_id: str,
    module_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Devuelve el estado de un módulo (y el contenido si ya está generado)."""
    user_id = str(current_user.get("_id"))
    try:
        session = await report_sessions_collection.find_one({"_id": ObjectId(session_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    if str(session.get("user_id")) != user_id:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta sesión")

    module_runs = session.get("module_runs", {}) or {}
    run_info = module_runs.get(module_id, {}) if isinstance(module_runs, dict) else {}

    # Si ya está generado, incluir contenido
    generated_modules = session.get("generated_modules", {}) or {}
    if module_id in generated_modules:
        module_data = generated_modules[module_id]
        content = module_data.get("content") if isinstance(module_data, dict) else str(module_data)
        length = module_data.get("length", len(content)) if isinstance(module_data, dict) else len(content)
        return {
            "session_id": session_id,
            "module_id": module_id,
            "status": "done",
            "length": length,
            "content": content,
            "run": run_info,
        }

    return {
        "session_id": session_id,
        "module_id": module_id,
        "status": run_info.get("status", "not_started"),
        "error": run_info.get("error"),
        "run": run_info,
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
        print(f"[REPORTS] 🚀 Iniciando generación de módulo {request.module_id} para sesión {request.session_id}", file=sys.stderr)
        previous_modules = list(session.get("generated_modules", {}).keys())
        
        # Agregar timeout para evitar que se quede colgado
        import asyncio
        from app.models.ai_usage_tracking import AIUsageRecord, AIActionType
        from app.services.ai_usage_tracker import track_ai_usage
        
        try:
            content, is_last, usage_metadata = await asyncio.wait_for(
                full_report_service.generate_single_module(
                    session["carta_data"],
                    session["user_name"],
                    request.module_id,
                    previous_modules,
                    chart_facts=session.get("chart_facts"),
                ),
                timeout=600.0  # 10 minutos máximo por módulo
            )
            print(f"[REPORTS] ✅ Módulo {request.module_id} generado exitosamente. Longitud: {len(content)} caracteres", file=sys.stderr)
            
            # Registrar uso de IA
            try:
                await track_ai_usage(
                    user_id=user_id,
                    user_name=session["user_name"],
                    action_type=AIActionType.REPORT_MODULE_GENERATION,
                    model_used=full_report_service.ai_service.current_model,
                    prompt_tokens=usage_metadata.get('prompt_token_count', 0),
                    response_tokens=usage_metadata.get('candidates_token_count', 0),
                    total_tokens=usage_metadata.get('total_token_count', 0),
                    session_id=request.session_id,
                    module_id=request.module_id,
                    metadata={
                        'content_length': len(content),
                        'attempts': usage_metadata.get('attempts', 1),
                        'module_title': next((s['title'] for s in full_report_service._get_sections_definition() if s['id'] == request.module_id), 'Unknown')
                    }
                )
            except Exception as track_err:
                print(f"[REPORTS] ⚠️ Error registrando uso de IA (continuando): {track_err}", file=sys.stderr)
        except asyncio.TimeoutError:
            print(f"[REPORTS] ❌ Timeout generando módulo {request.module_id} (más de 10 minutos)", file=sys.stderr)
            raise HTTPException(
                status_code=500,
                detail=f"La generación del módulo tardó demasiado tiempo. Por favor intenta regenerar este módulo."
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
        
    except HTTPException:
        # Re-lanzar HTTPExceptions sin modificar
        raise
    except Exception as e:
        print(f"[REPORTS] ❌ Error generando módulo {request.module_id}: {type(e).__name__}: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        error_detail = str(e)
        if "timeout" in error_detail.lower() or "timed out" in error_detail.lower():
            error_detail = "La generación tardó demasiado tiempo. Por favor intenta regenerar este módulo."
        elif "api" in error_detail.lower() or "key" in error_detail.lower():
            error_detail = "Error de configuración de la API de IA. Contacta al administrador."
        raise HTTPException(
            status_code=500,
            detail=f"Error generando módulo {request.module_id}: {error_detail}"
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
    
    is_admin = (current_user.get("role") == "admin")
    if (not is_admin) and str(session.get("user_id")) != user_id:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta sesión")

    report_mode = (session.get("report_mode") or "full").lower().strip()
    sections = full_report_service._get_sections_definition(report_mode=report_mode)
    generated_modules = session.get("generated_modules", {})
    batch_job = session.get("batch_job") or {}
    module_runs = session.get("module_runs") or {}
    
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

    # Resumen de ejecuciones por módulo (para depurar sin volcar todo el trace)
    module_runs_summary = {}
    try:
        for mid in [s["id"] for s in sections]:
            run = (module_runs.get(mid) or {}) if isinstance(module_runs, dict) else {}
            if not isinstance(run, dict):
                continue
            # último step (si existe) para UI
            last_step = None
            try:
                steps = run.get("steps") or []
                if isinstance(steps, list) and steps:
                    last = steps[-1] if isinstance(steps[-1], dict) else None
                    if last and isinstance(last.get("step"), str):
                        last_step = last.get("step")
            except Exception:
                last_step = None
            module_runs_summary[mid] = {
                "status": run.get("status"),
                "error": run.get("error"),
                "updated_at": run.get("updated_at"),
                "last_step": last_step,
            }
    except Exception:
        module_runs_summary = {}

    # Error “principal” para UX (si existe)
    top_error = None
    if isinstance(batch_job, dict) and batch_job.get("status") == "error":
        top_error = batch_job.get("error")
    if not top_error and session.get("status") == "error":
        top_error = session.get("error") or session.get("detail")

    # módulo actual para UI
    # Índice reportado por la sesión (puede quedar desfasado si algún write falla)
    current_module_index = int(session.get("current_module_index", 0) or 0)

    # Derivar índice real a partir de módulos generados (más fiable para UI)
    try:
        generated_ids = set((session.get("generated_modules", {}) or {}).keys())
        derived_index = 0
        for i, s in enumerate(sections):
            if s["id"] not in generated_ids:
                derived_index = i
                break
        else:
            derived_index = len(sections)
        # Si el derivado es mayor que el guardado, preferir el derivado
        if derived_index > current_module_index:
            current_module_index = derived_index
    except Exception:
        pass
    current_module_id = None
    current_module_title = None
    if 0 <= current_module_index < len(sections):
        current_module_id = sections[current_module_index]["id"]
        current_module_title = sections[current_module_index]["title"]

    return {
        "session_id": session_id,
        "status": session.get("status", "in_progress"),
        "error": top_error,
        "report_mode": report_mode,
        "current_module_index": current_module_index,
        "current_module_id": current_module_id,
        "current_module_title": current_module_title,
        "total_modules": len(sections),
        "modules": modules_status,
        "has_full_report": bool(session.get("full_report")),
        "batch_job": {
            "job_id": batch_job.get("job_id") if isinstance(batch_job, dict) else None,
            "status": batch_job.get("status") if isinstance(batch_job, dict) else None,
            "error": batch_job.get("error") if isinstance(batch_job, dict) else None,
            "updated_at": batch_job.get("updated_at") if isinstance(batch_job, dict) else None,
        } if batch_job else None,
        "module_runs_summary": module_runs_summary,
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
    
    is_admin = (current_user.get("role") == "admin")
    if (not is_admin) and str(session.get("user_id")) != user_id:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta sesión")

    def _clean_module_text(txt: str) -> str:
        if not txt:
            return ""
        # Cortar al primer "CONFIRMACIÓN REQUERIDA" (evita prompts interactivos y concatenaciones)
        m = re.search(r"confirmaci[oó]n requerida\\s*:", txt, flags=re.IGNORECASE)
        if m:
            txt = txt[: m.start()].rstrip()
        # Evitar que un módulo incluya accidentalmente otro (p.ej. '## MÓDULO 3')
        m2 = re.search(r"\\n##\\s*m[óo]dulo\\s+\\d", txt, flags=re.IGNORECASE)
        if m2:
            txt = txt[: m2.start()].rstrip()
        return txt.strip()
    
    # Si ya está en la sesión, retornarlo
    if "full_report" in session and session["full_report"]:
        cleaned = _clean_module_text(str(session["full_report"]))
        return {
            "full_report": cleaned,
            "total_length": len(cleaned),
            "status": session.get("status", "completed")
        }
    
    # Si no está, construir desde módulos generados
    generated_modules = session.get("generated_modules", {})
    if not generated_modules:
        raise HTTPException(status_code=400, detail="No hay módulos generados aún")
    
    report_mode = (session.get("report_mode") or "full").lower().strip()
    sections = full_report_service._get_sections_definition(report_mode=report_mode)
    all_content = []
    
    for s in sections:
        if s['id'] in generated_modules:
            module_data = generated_modules[s['id']]
            if isinstance(module_data, dict) and 'content' in module_data:
                all_content.append(f"## {s['title']}\n\n{_clean_module_text(str(module_data['content']))}\n\n---\n\n")
            elif isinstance(module_data, str):
                all_content.append(f"## {s['title']}\n\n{_clean_module_text(str(module_data))}\n\n---\n\n")
    
    full_report = "\n".join(all_content)
    full_report = _clean_module_text(full_report)
    
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


@router.get("/download-pdf/{session_id}")
async def download_pdf_from_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Genera y descarga el PDF final de una sesión (on-demand) usando `full_report` o ensamblando módulos.
    Permisos: dueño o admin.
    """
    user_id = str(current_user.get("_id"))
    is_admin = (current_user.get("role") == "admin")

    try:
        session = await report_sessions_collection.find_one({"_id": ObjectId(session_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    if (not is_admin) and str(session.get("user_id")) != user_id:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta sesión")

    def _safe_slug(s: str) -> str:
        s = (s or "").strip().lower()
        s = re.sub(r"\\s+", "_", s)
        s = re.sub(r"[^a-z0-9_\\-]+", "", s)
        return s.strip("_") or "informe"

    def _birth_stamp(carta: Dict[str, Any]) -> str:
        datos = (carta or {}).get("datos_entrada") or {}
        fecha = str(datos.get("fecha") or datos.get("fecha_local") or "").strip()
        hora = str(datos.get("hora") or datos.get("hora_local") or "").strip()
        # Fecha: YYYY-MM-DD o DD/MM/YYYY -> DDMMYYYY
        ddmmyyyy = ""
        if re.match(r"^\\d{4}-\\d{2}-\\d{2}$", fecha):
            y, m, d = fecha.split("-")
            ddmmyyyy = f"{d}{m}{y}"
        elif re.match(r"^\\d{2}/\\d{2}/\\d{4}$", fecha):
            d, m, y = fecha.split("/")
            ddmmyyyy = f"{d}{m}{y}"
        # Hora: HH:MM -> HHMM
        hhmm = re.sub(r"[^0-9]", "", hora)[:4]
        return f"{ddmmyyyy}{hhmm}" if ddmmyyyy or hhmm else datetime.utcnow().strftime("%Y%m%d%H%M")

    def _clean_module_text(txt: str) -> str:
        if not txt:
            return ""
        m = re.search(r"confirmaci[oó]n requerida\\s*:", txt, flags=re.IGNORECASE)
        if m:
            txt = txt[: m.start()].rstrip()
        m2 = re.search(r"\\n##\\s*m[óo]dulo\\s+\\d", txt, flags=re.IGNORECASE)
        if m2:
            txt = txt[: m2.start()].rstrip()
        return txt.strip()

    carta_data = session.get("carta_data") or {}
    user_name = session.get("user_name") or current_user.get("username") or "usuario"

    full_report = session.get("full_report")
    if not full_report:
        generated_modules = session.get("generated_modules", {}) or {}
        if not generated_modules:
            raise HTTPException(status_code=400, detail="No hay módulos generados aún")
        report_mode = (session.get("report_mode") or "full").lower().strip()
        sections = full_report_service._get_sections_definition(report_mode=report_mode)
        parts = []
        for s in sections:
            if s["id"] in generated_modules:
                md = generated_modules[s["id"]]
                content = md.get("content") if isinstance(md, dict) else str(md)
                parts.append(f"## {s['title']}\\n\\n{_clean_module_text(str(content))}\\n\\n---\\n\\n")
        full_report = _clean_module_text("\\n".join(parts))
    else:
        full_report = _clean_module_text(str(full_report))

    # Generar PDF con el generador existente
    try:
        pdf_buffer = generate_report(carta_data, "pdf", analysis_text=str(full_report), nombre=str(user_name))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando PDF: {type(e).__name__}: {str(e)}")

    try:
        from io import BytesIO
        if isinstance(pdf_buffer, BytesIO):
            pdf_buffer.seek(0)
    except Exception:
        pass

    filename = f"{_safe_slug(str(user_name))}_{_birth_stamp(carta_data)}.pdf"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(pdf_buffer, media_type="application/pdf", headers=headers)


@router.get("/my-sessions")
async def list_my_report_sessions(
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
):
    """Lista sesiones de informe del usuario (guardadas en report_generation_sessions)."""
    user_id = str(current_user.get("_id"))
    limit = max(1, min(int(limit or 50), 200))
    cursor = report_sessions_collection.find(
        {"user_id": user_id, "deleted_at": {"$exists": False}},
        projection={
            "user_id": 1,
            "user_name": 1,
            "status": 1,
            "report_mode": 1,
            "created_at": 1,
            "updated_at": 1,
            "full_report_length": 1,
            "batch_job": 1,
        },
    ).sort("created_at", -1).limit(limit)
    out = []
    async for s in cursor:
        out.append(
            {
                "session_id": str(s.get("_id")),
                "user_name": s.get("user_name") or "",
                "status": s.get("status") or "",
                "report_mode": s.get("report_mode") or "full",
                "created_at": s.get("created_at") or "",
                "updated_at": s.get("updated_at") or "",
                "full_report_length": int(s.get("full_report_length") or 0),
                "batch_status": (s.get("batch_job") or {}).get("status") if isinstance(s.get("batch_job"), dict) else None,
            }
        )
    return {"sessions": out, "total": len(out)}


@router.get("/admin/sessions")
async def list_all_report_sessions(
    limit: int = 100,
    include_deleted: bool = False,
    current_user: dict = Depends(get_current_user),
):
    """Admin: lista sesiones de informe de todos los usuarios."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Se requieren permisos de administrador")
    limit = max(1, min(int(limit or 100), 500))
    q: Dict[str, Any] = {}
    if not include_deleted:
        q["deleted_at"] = {"$exists": False}
    cursor = report_sessions_collection.find(
        q,
        projection={
            "user_id": 1,
            "user_name": 1,
            "status": 1,
            "report_mode": 1,
            "created_at": 1,
            "updated_at": 1,
            "full_report_length": 1,
            "batch_job": 1,
        },
    ).sort("created_at", -1).limit(limit)
    out = []
    async for s in cursor:
        out.append(
            {
                "session_id": str(s.get("_id")),
                "user_id": str(s.get("user_id") or ""),
                "user_name": s.get("user_name") or "",
                "status": s.get("status") or "",
                "report_mode": s.get("report_mode") or "full",
                "created_at": s.get("created_at") or "",
                "updated_at": s.get("updated_at") or "",
                "full_report_length": int(s.get("full_report_length") or 0),
                "batch_status": (s.get("batch_job") or {}).get("status") if isinstance(s.get("batch_job"), dict) else None,
            }
        )
    return {"sessions": out, "total": len(out)}


@router.delete("/session/{session_id}")
async def soft_delete_report_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Soft delete de una sesión de informe (dueño o admin)."""
    user_id = str(current_user.get("_id"))
    is_admin = (current_user.get("role") == "admin")
    try:
        session = await report_sessions_collection.find_one({"_id": ObjectId(session_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    if (not is_admin) and str(session.get("user_id")) != user_id:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta sesión")
    await report_sessions_collection.update_one(
        {"_id": ObjectId(session_id)},
        {"$set": {"deleted_at": datetime.utcnow().isoformat(), "deleted_by": user_id}},
    )
    return {"deleted": True, "session_id": session_id}

