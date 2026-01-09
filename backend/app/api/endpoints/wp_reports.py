"""
Endpoints para integración WordPress (frontend) -> Motor Fractal (backend).

Autenticación: HMAC (ver `app.security.wp_hmac`).
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime
import os
import re

from app.security.wp_hmac import verify_wp_hmac
from app.services.full_report_service import full_report_service
from app.services.report_generators import generate_report


router = APIRouter()

# MongoDB
MONGODB_URL = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI") or "mongodb://localhost:27017"
mongodb_options = {"serverSelectionTimeoutMS": 5000, "connectTimeoutMS": 10000}
if "mongodb+srv://" in MONGODB_URL or "mongodb.net" in MONGODB_URL:
    mongodb_options.update({"tls": True, "tlsAllowInvalidCertificates": True})
client = AsyncIOMotorClient(MONGODB_URL, **mongodb_options)
db = client.fraktal
report_sessions_collection = db.report_generation_sessions
users_collection = db.users
orders_collection = db.wp_orders


class WPStartReportRequest(BaseModel):
    wp_user_id: str = Field(..., description="ID del usuario en WordPress")
    email: Optional[str] = Field(None, description="Email del usuario (si está disponible)")
    display_name: Optional[str] = Field(None, description="Nombre visible en WP")
    carta_data: dict = Field(..., description="Carta completa (salida de /charts/generate)")
    nombre: str = Field(default="", description="Nombre consultante (para portada)")
    report_mode: str = Field(default="full", description="full|light")


class WPOrderPaidRequest(BaseModel):
    wp_user_id: str = Field(..., description="ID del usuario en WordPress")
    order_id: str = Field(..., description="ID del pedido WooCommerce")
    product_id: Optional[str] = Field(None, description="ID del producto comprado")
    total: Optional[float] = Field(None, description="Total pagado")
    currency: Optional[str] = Field(None, description="Moneda")
    email: Optional[str] = Field(None, description="Email del comprador")


def _safe_slug(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"\s+", "_", s)
    s = re.sub(r"[^a-z0-9_\-]+", "", s)
    return s.strip("_") or "informe"


def _birth_stamp(carta: Dict[str, Any]) -> str:
    datos = (carta or {}).get("datos_entrada") or {}
    fecha = str(datos.get("fecha") or datos.get("fecha_local") or "").strip()
    hora = str(datos.get("hora") or datos.get("hora_local") or "").strip()
    ddmmyyyy = ""
    if re.match(r"^\d{4}-\d{2}-\d{2}$", fecha):
        y, m, d = fecha.split("-")
        ddmmyyyy = f"{d}{m}{y}"
    elif re.match(r"^\d{2}/\d{2}/\d{4}$", fecha):
        d, m, y = fecha.split("/")
        ddmmyyyy = f"{d}{m}{y}"
    hhmm = re.sub(r"[^0-9]", "", hora)[:4]
    return f"{ddmmyyyy}{hhmm}" if ddmmyyyy or hhmm else datetime.utcnow().strftime("%Y%m%d%H%M")


def _clean_module_text(txt: str) -> str:
    if not txt:
        return ""
    m = re.search(r"confirmaci[oó]n requerida\s*:", txt, flags=re.IGNORECASE)
    if m:
        txt = txt[: m.start()].rstrip()
    m2 = re.search(r"\n##\s*m[óo]dulo\s+\d", txt, flags=re.IGNORECASE)
    if m2:
        txt = txt[: m2.start()].rstrip()
    return txt.strip()


async def _get_or_create_backend_user(*, wp_user_id: str, email: Optional[str], display_name: Optional[str]) -> Dict[str, Any]:
    wp_user_id = str(wp_user_id)
    user = await users_collection.find_one({"wp_user_id": wp_user_id})
    if user:
        return user

    username = (email or "").strip() or f"wp:{wp_user_id}"
    new_user = {
        "username": username,
        "email": (email or username).strip(),
        "full_name": (display_name or "").strip(),
        "role": "user",
        "wp_user_id": wp_user_id,
        "created_at": datetime.utcnow().isoformat(),
    }
    result = await users_collection.insert_one(new_user)
    new_user["_id"] = result.inserted_id
    return new_user


@router.post("/report/start")
async def wp_start_report(
    payload: WPStartReportRequest,
    auth: Dict[str, Any] = Depends(verify_wp_hmac),
):
    """Crea sesión (paso a paso) para WordPress."""
    header_wp_user_id = str(auth.get("wp_user_id"))
    if str(payload.wp_user_id) != header_wp_user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="wp_user_id no coincide con header")

    report_mode = (payload.report_mode or "full").lower().strip()
    if report_mode not in {"full", "light"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="report_mode no válido. Usa: full | light")

    user = await _get_or_create_backend_user(
        wp_user_id=header_wp_user_id,
        email=payload.email,
        display_name=payload.display_name or payload.nombre,
    )
    backend_user_id = str(user.get("_id"))
    user_name = payload.nombre or user.get("full_name") or user.get("username") or "Consultante"

    sections = full_report_service._get_sections_definition(report_mode=report_mode)
    modules_list = [{"id": s["id"], "title": s["title"], "expected_min_chars": s["expected_min_chars"]} for s in sections]

    session_data = {
        "user_id": backend_user_id,
        "wp_user_id": header_wp_user_id,
        "user_name": user_name,
        "carta_data": payload.carta_data,
        "report_mode": report_mode,
        "chart_facts": full_report_service.build_chart_facts(payload.carta_data),
        "generated_modules": {},
        "module_runs": {},
        "current_module_index": 0,
        "status": "in_progress",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    result = await report_sessions_collection.insert_one(session_data)
    session_id = str(result.inserted_id)

    return {
        "session_id": session_id,
        "total_modules": len(modules_list),
        "modules": modules_list,
        "current_module": modules_list[0] if modules_list else None,
    }


@router.post("/report/queue-full")
async def wp_queue_full_report(
    payload: WPStartReportRequest,
    auth: Dict[str, Any] = Depends(verify_wp_hmac),
):
    """Crea sesión y encola generación completa (batch) para WordPress."""
    # Reutiliza el endpoint existente de reports: aquí lo replicamos para no depender de JWT.
    import asyncio
    import uuid
    from app.api.endpoints.reports import _run_full_report_job  # import local para evitar ciclos

    header_wp_user_id = str(auth.get("wp_user_id"))
    if str(payload.wp_user_id) != header_wp_user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="wp_user_id no coincide con header")

    report_mode = (payload.report_mode or "full").lower().strip()
    if report_mode not in {"full", "light"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="report_mode no válido. Usa: full | light")

    user = await _get_or_create_backend_user(
        wp_user_id=header_wp_user_id,
        email=payload.email,
        display_name=payload.display_name or payload.nombre,
    )
    backend_user_id = str(user.get("_id"))
    user_name = payload.nombre or user.get("full_name") or user.get("username") or "Consultante"

    sections = full_report_service._get_sections_definition(report_mode=report_mode)
    modules_list = [{"id": s["id"], "title": s["title"], "expected_min_chars": s["expected_min_chars"]} for s in sections]

    job_id = str(uuid.uuid4())
    session_data = {
        "user_id": backend_user_id,
        "wp_user_id": header_wp_user_id,
        "user_name": user_name,
        "carta_data": payload.carta_data,
        "report_mode": report_mode,
        "chart_facts": full_report_service.build_chart_facts(payload.carta_data),
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

    asyncio.create_task(_run_full_report_job(session_id, backend_user_id, job_id))

    return {
        "session_id": session_id,
        "job_id": job_id,
        "total_modules": len(modules_list),
        "modules": modules_list,
        "status": "queued",
    }


@router.get("/report/status/{session_id}")
async def wp_get_status(
    session_id: str,
    auth: Dict[str, Any] = Depends(verify_wp_hmac),
):
    """Devuelve status de generación para WordPress (validando ownership por wp_user_id)."""
    from app.api.endpoints.reports import get_generation_status  # reutilizar respuesta

    wp_user_id = str(auth.get("wp_user_id"))
    try:
        session = await report_sessions_collection.find_one({"_id": ObjectId(session_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    if str(session.get("wp_user_id") or "") != wp_user_id:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta sesión")

    # Reutilizamos la lógica del endpoint existente creando un current_user “fake” dueño
    current_user = {"_id": session.get("user_id"), "role": "user"}
    return await get_generation_status(session_id=session_id, current_user=current_user)


@router.get("/report/my-sessions")
async def wp_list_sessions(
    limit: int = 50,
    auth: Dict[str, Any] = Depends(verify_wp_hmac),
):
    wp_user_id = str(auth.get("wp_user_id"))
    limit = max(1, min(int(limit or 50), 200))
    cursor = report_sessions_collection.find(
        {"wp_user_id": wp_user_id, "deleted_at": {"$exists": False}},
        projection={
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


@router.get("/report/download-pdf/{session_id}")
async def wp_download_pdf(
    session_id: str,
    auth: Dict[str, Any] = Depends(verify_wp_hmac),
):
    """Descarga PDF de una sesión para WordPress (ownership por wp_user_id)."""
    wp_user_id = str(auth.get("wp_user_id"))
    try:
        session = await report_sessions_collection.find_one({"_id": ObjectId(session_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    if str(session.get("wp_user_id") or "") != wp_user_id:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta sesión")

    carta_data = session.get("carta_data") or {}
    user_name = session.get("user_name") or "usuario"

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
                parts.append(f"## {s['title']}\n\n{_clean_module_text(str(content))}\n\n---\n\n")
        full_report = _clean_module_text("\n".join(parts))
    else:
        full_report = _clean_module_text(str(full_report))

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


@router.post("/woocommerce/order-paid")
async def wp_woocommerce_order_paid(
    payload: WPOrderPaidRequest,
    auth: Dict[str, Any] = Depends(verify_wp_hmac),
):
    """
    Llamado desde WordPress cuando un pedido WooCommerce se marca como completed.
    Guarda un registro simple en Mongo para auditoría / futura lógica de entitlements.
    """
    header_wp_user_id = str(auth.get("wp_user_id"))
    if str(payload.wp_user_id) != header_wp_user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="wp_user_id no coincide con header")

    doc = {
        "wp_user_id": header_wp_user_id,
        "order_id": str(payload.order_id),
        "product_id": str(payload.product_id or ""),
        "total": payload.total,
        "currency": payload.currency,
        "email": payload.email,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    await orders_collection.update_one(
        {"order_id": doc["order_id"]},
        {"$set": doc},
        upsert=True,
    )
    return {"ok": True, "order_id": doc["order_id"]}


