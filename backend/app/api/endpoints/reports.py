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
import sys

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

