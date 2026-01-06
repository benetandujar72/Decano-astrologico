"""
Panel de administración completo
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
from typing import List, Optional
import os
import re
import uuid
import asyncio
import glob
from dotenv import load_dotenv
from app.api.endpoints.auth import get_current_user, get_password_hash
from app.models.subscription import Invoice, Quote, SubscriptionTier, UserSubscription
from app.models.ai_usage_tracking import AIActionType
from app.services.ai_usage_tracker import get_usage_stats, get_usage_history
from pydantic import BaseModel
from typing import Dict, Any

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
users_collection = db.users
subscriptions_collection = db.user_subscriptions
payments_collection = db.payments
invoices_collection = db.invoices
quotes_collection = db.quotes
demo_sessions_collection = db.demo_sessions
ai_usage_collection = db.ai_usage_records
doc_ingest_jobs_collection = db.documentation_ingest_jobs
doc_sources_collection = db.documentation_sources
doc_chunks_collection = db.documentation_chunks
doc_module_contexts_collection = db.documentation_module_contexts


def require_admin(current_user: dict = Depends(get_current_user)):
    """Middleware para verificar permisos de admin"""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren permisos de administrador"
        )
    return current_user


# ==================== DOCS DIAGNÓSTICO (ATLAS/BD) ====================

@router.get("/docs/topics")
async def docs_topics(
    version: Optional[str] = Query(None, description="Versión lógica de docs (ej: atlas_v1). Si se omite, usa DOCS_VERSION."),
    limit: int = Query(300, description="Máximo de topics a devolver."),
    admin: dict = Depends(require_admin),
):
    """
    Devuelve los topics disponibles en `documentation_chunks` para una versión.
    Útil para diagnosticar errores de RAG strict_topic (ej: profesional/infantil sin ingesta).
    """
    v = (version or os.getenv("DOCS_VERSION") or "").strip()
    if not v:
        raise HTTPException(status_code=400, detail="Falta version y DOCS_VERSION no está configurada.")

    topics = await doc_chunks_collection.distinct("topic", {"version": v})
    topics = [t for t in topics if isinstance(t, str) and t.strip()]
    topics = sorted(set([t.replace("\\", "/").lower().strip() for t in topics]))
    if limit and len(topics) > int(limit):
        topics = topics[: int(limit)]
    return {"version": v, "topics": topics, "count": len(topics)}


@router.get("/docs/topic-counts")
async def docs_topic_counts(
    version: Optional[str] = Query(None, description="Versión lógica de docs (ej: atlas_v1). Si se omite, usa DOCS_VERSION."),
    prefix: Optional[str] = Query(None, description="Filtrar por prefijo (ej: 00_core_astrologia)."),
    limit: int = Query(200, description="Máximo de filas."),
    admin: dict = Depends(require_admin),
):
    """
    Devuelve conteos por topic en `documentation_chunks` para una versión.
    """
    v = (version or os.getenv("DOCS_VERSION") or "").strip()
    if not v:
        raise HTTPException(status_code=400, detail="Falta version y DOCS_VERSION no está configurada.")

    match: Dict[str, Any] = {"version": v}
    if prefix and prefix.strip():
        # match exact or nested topics
        px = prefix.replace("\\", "/").lower().strip()
        match["$or"] = [{"topic": px}, {"topic": {"$regex": f"^{re.escape(px)}/"}}]

    pipeline: List[Dict[str, Any]] = [
        {"$match": match},
        {"$group": {"_id": "$topic", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": int(limit)},
    ]
    rows = []
    async for r in doc_chunks_collection.aggregate(pipeline, allowDiskUse=False):
        topic = r.get("_id")
        if not isinstance(topic, str):
            continue
        rows.append({"topic": topic, "count": int(r.get("count") or 0)})
    return {"version": v, "rows": rows, "returned": len(rows)}


# ==================== DOCUMENTACIÓN (INGESTA A BD) ====================

class DocsIngestRequest(BaseModel):
    version: Optional[str] = None  # si no se indica, se usa DOCS_VERSION o una versión auto
    docs_path: Optional[str] = None  # si no se indica, se usa DOCS_PATH o el default del script
    db_name: str = "fraktal"
    chunk_size: int = 1400
    overlap: int = 250
    start_index: int = 0
    max_files: Optional[int] = None
    timeout_s: int = 120
    continue_on_error: bool = True


@router.post("/docs/ingest")
async def ingest_docs_to_db(
    request: DocsIngestRequest,
    admin: dict = Depends(require_admin),
):
    """
    Lanza una ingesta de PDFs -> MongoDB SIN necesidad de Shell en Render.
    Se ejecuta en background y devuelve job_id para polling.
    """
    mongo_url = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI")
    if not mongo_url:
        raise HTTPException(status_code=500, detail="Falta MONGODB_URI/MONGODB_URL en el servidor")

    job_id = str(uuid.uuid4())
    version = (request.version or os.getenv("DOCS_VERSION") or f"prod_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}").strip()
    docs_path = (request.docs_path or os.getenv("DOCS_PATH") or "").strip() or None

    job_doc = {
        "job_id": job_id,
        "status": "queued",
        "version": version,
        "docs_path": docs_path,
        "db_name": request.db_name,
        "chunk_size": request.chunk_size,
        "overlap": request.overlap,
        "start_index": request.start_index,
        "max_files": request.max_files,
        "timeout_s": request.timeout_s,
        "continue_on_error": request.continue_on_error,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "created_by": admin.get("username") or admin.get("email"),
        "error": None,
        "result": None,
    }
    await doc_ingest_jobs_collection.insert_one(job_doc)

    async def _run() -> None:
        await doc_ingest_jobs_collection.update_one(
            {"job_id": job_id},
            {"$set": {"status": "running", "updated_at": datetime.utcnow().isoformat()}},
        )
        try:
            from app.scripts.ingest_documentation import run_ingest

            # Ejecutar en thread para no bloquear el event loop
            result = await asyncio.to_thread(
                run_ingest,
                mongo_url=mongo_url,
                db_name=request.db_name,
                docs_path=docs_path or os.getenv("DOCS_PATH") or "/app/documentacion",
                version=version,
                chunk_size=request.chunk_size,
                overlap=request.overlap,
                job_id=job_id,
                start_index=request.start_index,
                max_files=request.max_files,
                timeout_s=request.timeout_s,
                continue_on_error=request.continue_on_error,
            )
            await doc_ingest_jobs_collection.update_one(
                {"job_id": job_id},
                {"$set": {"status": "done", "result": result, "updated_at": datetime.utcnow().isoformat(), "done_at": datetime.utcnow().isoformat()}},
            )
        except Exception as e:
            await doc_ingest_jobs_collection.update_one(
                {"job_id": job_id},
                {"$set": {"status": "error", "error": f"{type(e).__name__}: {str(e)}", "updated_at": datetime.utcnow().isoformat()}},
            )

    asyncio.create_task(_run())

    return {"job_id": job_id, "status": "queued", "version": version}


@router.get("/docs/ingest-status/{job_id}")
async def get_docs_ingest_status(job_id: str, admin: dict = Depends(require_admin)):
    job = await doc_ingest_jobs_collection.find_one({"job_id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    return job


@router.get("/docs/fs-check")
async def docs_fs_check(
    path: str = Query("/app/documentacion", description="Ruta a comprobar dentro del contenedor (recomendado: /app/documentacion)"),
    admin: dict = Depends(require_admin),
):
    """
    Diagnóstico sin shell: comprueba si existe una carpeta y cuántos PDFs contiene.
    Solo admin.
    """
    # Hardening básico: solo permitir inspección bajo rutas conocidas para evitar traversal arbitrario
    norm = (path or "").strip() or "/app/documentacion"
    allowed_prefixes = ("/app", "/opt/render/project/src")
    if not norm.startswith(allowed_prefixes):
        raise HTTPException(
            status_code=400,
            detail="Ruta no permitida. Usa una ruta que empiece por /app o /opt/render/project/src",
        )

    exists = os.path.exists(norm)
    is_dir = os.path.isdir(norm)
    pdfs = sorted(glob.glob(os.path.join(norm, "*.pdf"))) if exists and is_dir else []

    # Muestra acotada para no devolver payload enorme
    sample = [os.path.basename(p) for p in pdfs[:25]]

    return {
        "path": norm,
        "exists": exists,
        "is_dir": is_dir,
        "pdf_count": len(pdfs),
        "pdf_sample": sample,
    }


@router.get("/docs/fs-ls")
async def docs_fs_ls(
    path: str = Query("/app", description="Ruta a listar dentro del contenedor (por defecto /app)"),
    admin: dict = Depends(require_admin),
):
    """
    Diagnóstico sin shell: lista entradas (archivos/carpetas) de una ruta del contenedor.
    Solo admin.
    """
    norm = (path or "").strip() or "/app"
    # Permitimos /app y también /opt/render/project/src para casos donde Render no copia a /app
    allowed_prefixes = ("/app", "/opt/render/project/src")
    if not norm.startswith(allowed_prefixes):
        raise HTTPException(status_code=400, detail="Ruta no permitida. Usa /app o /opt/render/project/src")

    exists = os.path.exists(norm)
    is_dir = os.path.isdir(norm)
    entries = []
    if exists and is_dir:
        try:
            for name in sorted(os.listdir(norm))[:200]:
                full = os.path.join(norm, name)
                entries.append(
                    {
                        "name": name,
                        "is_dir": os.path.isdir(full),
                        "is_file": os.path.isfile(full),
                    }
                )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error listando ruta: {type(e).__name__}: {str(e)}")

    return {
        "path": norm,
        "exists": exists,
        "is_dir": is_dir,
        "entries": entries,
        "cwd": os.getcwd(),
    }


@router.get("/docs/db-stats")
async def docs_db_stats(
    version: str = Query(..., description="Versión de documentación (DOCS_VERSION), ej: prod_v1"),
    admin: dict = Depends(require_admin),
):
    """
    Diagnóstico sin shell: devuelve conteos en Mongo para una versión de documentación.
    Si esto es > 0, la ingesta ya está en BD aunque el job aparezca 'running'.
    """
    ver = (version or "").strip()
    if not ver:
        raise HTTPException(status_code=400, detail="version es requerida")

    sources = await doc_sources_collection.count_documents({"version": ver})
    chunks = await doc_chunks_collection.count_documents({"version": ver})
    module_contexts = await doc_module_contexts_collection.count_documents({"version": ver})

    return {
        "version": ver,
        "counts": {
            "documentation_sources": sources,
            "documentation_chunks": chunks,
            "documentation_module_contexts": module_contexts,
        },
    }


@router.get("/docs/retrieval-test")
async def docs_retrieval_test(
    module_id: str = Query("modulo_2_fundamentos", description="Module id (e.g. modulo_2_aspectos)"),
    max_chars: int = Query(8000, ge=1000, le=20000),
    admin: dict = Depends(require_admin),
):
    """
    Prueba rápida (sin PDFs): construye contexto para un módulo usando el modo de documentación actual.
    Devuelve solo métricas y un preview, NO el contexto completo.
    """
    from app.services.documentation_service import documentation_service

    try:
        ctx = documentation_service.get_context_for_module(module_id, max_chars=int(max_chars))
        preview = ctx[:1200]
        return {
            "ok": True,
            "module_id": module_id,
            "docs_version": documentation_service.docs_version,
            "docs_retrieval_mode": os.getenv("DOCS_RETRIEVAL_MODE", ""),
            "atlas_vector_index": os.getenv("ATLAS_VECTOR_INDEX", ""),
            "atlas_vector_path": os.getenv("ATLAS_VECTOR_PATH", ""),
            "atlas_vector_stage": os.getenv("ATLAS_VECTOR_STAGE", ""),
            "context_chars": len(ctx),
            "preview": preview,
        }
    except Exception as e:
        # Devolver error real (admin-only) para depuración sin shell
        raise HTTPException(
            status_code=500,
            detail={
                "ok": False,
                "error_type": type(e).__name__,
                "error": str(e),
                "docs_version": getattr(documentation_service, "docs_version", None),
                "docs_retrieval_mode": os.getenv("DOCS_RETRIEVAL_MODE", ""),
                "atlas_vector_index": os.getenv("ATLAS_VECTOR_INDEX", ""),
                "atlas_vector_path": os.getenv("ATLAS_VECTOR_PATH", ""),
                "atlas_vector_stage": os.getenv("ATLAS_VECTOR_STAGE", ""),
            },
        )


# ==================== GESTIÓN DE USUARIOS ====================

@router.get("/users")
async def get_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    search: Optional[str] = None,
    role: Optional[str] = Query(None, regex="^(user|admin)$"),
    active: Optional[bool] = None,
    sort_by: str = Query("created_at", regex="^(username|email|created_at|role)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    admin: dict = Depends(require_admin)
):
    """Lista todos los usuarios con filtros avanzados (solo admin)"""
    import sys

    query = {}

    # Filtro de búsqueda
    if search:
        query["$or"] = [
            {"username": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]

    # Filtro por rol
    if role:
        query["role"] = role

    # Filtro por estado activo
    if active is not None:
        query["active"] = active

    # Orden
    sort_direction = 1 if sort_order == "asc" else -1

    print(f"[ADMIN] Listando usuarios: query={query}, skip={skip}, limit={limit}, sort={sort_by}:{sort_order}", file=sys.stderr)

    # Obtener usuarios - Asegurar que no haya duplicados por email
    users_cursor = users_collection.find(query).sort(sort_by, sort_direction)
    all_users = await users_cursor.to_list(length=None)
    
    # Eliminar duplicados por email (mantener el más reciente por fecha de creación)
    seen_emails = {}
    seen_ids = set()
    unique_users = []
    
    # Primero, ordenar por fecha de creación descendente para mantener los más recientes
    all_users_sorted = sorted(
        all_users,
        key=lambda x: x.get("created_at", ""),
        reverse=True
    )
    
    for user in all_users_sorted:
        user_id = str(user.get("_id", ""))
        email = (user.get("email", "") or "").lower().strip()
        
        # Si ya vimos este ID, saltarlo
        if user_id in seen_ids:
            continue
        seen_ids.add(user_id)
        
        # Si tiene email y ya lo vimos, saltarlo (duplicado)
        if email and email in seen_emails:
            print(f"[ADMIN] Usuario duplicado detectado: {email} (ID: {user_id}), saltando...", file=sys.stderr)
            continue
        
        # Añadir a lista única
        if email:
            seen_emails[email] = user
        unique_users.append(user)
    
    # Aplicar paginación después de eliminar duplicados
    total = len(unique_users)
    users = unique_users[skip:skip + limit]
    
    # Obtener suscripciones para todos los usuarios
    user_ids = [str(user["_id"]) for user in users]
    subscriptions = {}
    if user_ids:
        subs_cursor = subscriptions_collection.find({"user_id": {"$in": user_ids}})
        subs_list = await subs_cursor.to_list(length=None)
        for sub in subs_list:
            subscriptions[sub.get("user_id")] = sub

    # Limpiar datos sensibles y añadir información de suscripción
    for user in users:
        user_id = str(user["_id"])
        user["_id"] = user_id
        user.pop("hashed_password", None)
        
        # Añadir información de suscripción
        subscription = subscriptions.get(user_id)
        if subscription:
            user["subscription"] = {
                "tier": subscription.get("tier", "free"),
                "status": subscription.get("status", "inactive"),
                "start_date": subscription.get("start_date"),
                "end_date": subscription.get("end_date"),
                "billing_cycle": subscription.get("billing_cycle")
            }
        else:
            user["subscription"] = {
                "tier": "free",
                "status": "inactive"
            }

    total_pages = (total + limit - 1) // limit  # Ceiling division
    current_page = (skip // limit) + 1

    print(f"[ADMIN] Encontrados {total} usuarios, página {current_page}/{total_pages}", file=sys.stderr)

    return {
        "users": users,
        "total": total,
        "skip": skip,
        "limit": limit,
        "page": current_page,
        "total_pages": total_pages,
        "has_next": skip + limit < total,
        "has_prev": skip > 0
    }


@router.get("/users/{user_id}")
async def get_user_details(
    user_id: str,
    admin: dict = Depends(require_admin)
):
    """
    Obtiene detalles completos de un usuario (SOLO ADMIN)
    
    IMPORTANTE: Este endpoint solo es accesible por administradores.
    Los usuarios normales NO pueden acceder a datos de otros usuarios.
    """
    from bson import ObjectId
    import sys
    import traceback
    
    try:
        # Verificar que el usuario autenticado es admin
        if admin.get("role") != "admin":
            print(f"[ADMIN] Intento de acceso no autorizado por usuario {admin.get('email')}", file=sys.stderr)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Se requieren permisos de administrador"
            )
        
        print(f"[ADMIN] Obteniendo detalles de usuario {user_id} por admin {admin.get('email')}", file=sys.stderr)
        
        # Intentar buscar por ObjectId primero
        user = None
        try:
            if len(user_id) == 24:  # ObjectId tiene 24 caracteres hexadecimales
                user = await users_collection.find_one({"_id": ObjectId(user_id)})
        except Exception as e:
            print(f"[ADMIN] Error buscando por ObjectId: {e}", file=sys.stderr)
        
        # Si no se encuentra, buscar por email
        if not user:
            user = await users_collection.find_one({"email": user_id})
        
        if not user:
            print(f"[ADMIN] Usuario {user_id} no encontrado", file=sys.stderr)
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        user_id_str = str(user["_id"])
        user.pop("hashed_password", None)
        
        # Suscripción - con manejo de errores
        subscription_dict = None
        try:
            subscription = await subscriptions_collection.find_one({"user_id": user_id_str})
            if not subscription:
                # Intentar buscar por email también
                subscription = await subscriptions_collection.find_one({"user_id": user.get("email")})
            
            if subscription:
                subscription_dict = {
                    "tier": subscription.get("tier", "free"),
                    "status": subscription.get("status", "inactive"),
                    "start_date": subscription.get("start_date"),
                    "end_date": subscription.get("end_date"),
                    "billing_cycle": subscription.get("billing_cycle"),
                    "auto_renew": subscription.get("auto_renew", False)
                }
                if subscription.get("_id"):
                    subscription_dict["_id"] = str(subscription["_id"])
        except Exception as e:
            print(f"[ADMIN] Error obteniendo suscripción: {e}", file=sys.stderr)
        
        # Cartas - con manejo de errores
        charts_count = 0
        try:
            charts_count = await db.charts.count_documents({"user_id": user_id_str})
        except Exception as e:
            print(f"[ADMIN] Error contando cartas: {e}", file=sys.stderr)
        
        # Pagos - con manejo de errores
        payments = []
        try:
            payments_cursor = payments_collection.find({"user_id": user_id_str}).limit(10)
            payments = await payments_cursor.to_list(length=10)
            for payment in payments:
                payment["_id"] = str(payment["_id"])
        except Exception as e:
            print(f"[ADMIN] Error obteniendo pagos: {e}", file=sys.stderr)
        
        # Consultas con experto IA - con manejo de errores
        consultations_count = 0
        try:
            consultations_count = await db.expert_consultations.count_documents({"user_id": user_id_str})
        except Exception as e:
            print(f"[ADMIN] Error contando consultas: {e}", file=sys.stderr)
        
        # Reservas de servicios - con manejo de errores
        bookings_count = 0
        try:
            bookings_count = await db.service_bookings.count_documents({"user_id": user_id_str})
        except Exception as e:
            print(f"[ADMIN] Error contando reservas: {e}", file=sys.stderr)
        
        result = {
            "_id": user_id_str,
            "username": user.get("username", ""),
            "email": user.get("email", ""),
            "role": user.get("role", "user"),
            "active": user.get("active", True),
            "created_at": user.get("created_at", ""),
            "subscription": subscription_dict,
            "charts_count": charts_count,
            "consultations_count": consultations_count,
            "bookings_count": bookings_count,
            "recent_payments": payments
        }
        
        print(f"[ADMIN] Detalles de usuario {user_id_str} obtenidos exitosamente", file=sys.stderr)
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ADMIN] Error inesperado en get_user_details: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener detalles del usuario: {str(e)}"
        )


@router.get("/users/{user_id}/charts")
async def get_user_charts(
    user_id: str,
    admin: dict = Depends(require_admin)
):
    """Obtiene todas las cartas de un usuario específico (solo admin)"""
    from bson import ObjectId
    import sys
    
    if admin.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren permisos de administrador"
        )
    
    # Buscar usuario
    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
    except:
        user = await users_collection.find_one({"email": user_id})
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    user_id_str = str(user["_id"])
    
    # Obtener cartas
    # Excluir borradas por defecto (soft delete)
    charts_cursor = db.charts.find({"user_id": user_id_str, "deleted_at": {"$exists": False}}).sort("timestamp", -1)
    charts = await charts_cursor.to_list(length=100)
    
    for chart in charts:
        chart["_id"] = str(chart["_id"])
        chart["chart_id"] = chart.get("chart_id") or str(chart["_id"])
    
    return {"charts": charts, "total": len(charts)}


@router.get("/users/{user_id}/demo-sessions")
async def get_user_demo_sessions(
    user_id: str,
    limit: int = Query(50, ge=1, le=200),
    admin: dict = Depends(require_admin),
):
    """Lista sesiones de demo de un usuario (solo admin)."""
    from bson import ObjectId

    # Normalizar user_id (ObjectId o email)
    user = None
    try:
        if ObjectId.is_valid(user_id):
            user = await users_collection.find_one({"_id": ObjectId(user_id)})
    except Exception:
        user = None
    if not user:
        user = await users_collection.find_one({"email": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user_id_str = str(user["_id"])

    cursor = demo_sessions_collection.find({"user_id": user_id_str}).sort("created_at", -1).limit(limit)
    sessions = await cursor.to_list(length=limit)
    result = []
    for s in sessions:
        sid = s.get("session_id") or str(s.get("_id"))
        cd = s.get("chart_data") or {}
        result.append(
            {
                "session_id": sid,
                "created_at": s.get("created_at", ""),
                "updated_at": s.get("updated_at", ""),
                "current_step": s.get("current_step", ""),
                "name": cd.get("name") or cd.get("datos_entrada", {}).get("nombre") or "",
                "birth_date": cd.get("birth_date") or cd.get("datos_entrada", {}).get("fecha") or "",
            }
        )

    return {"sessions": result, "total": len(result)}


@router.get("/users/{user_id}/demo-sessions/{session_id}")
async def get_user_demo_session_detail(
    user_id: str,
    session_id: str,
    admin: dict = Depends(require_admin),
):
    """Obtiene detalle completo de una demo (mensajes + informe) para un usuario (solo admin)."""
    from bson import ObjectId

    # Normalizar user_id
    user = None
    try:
        if ObjectId.is_valid(user_id):
            user = await users_collection.find_one({"_id": ObjectId(user_id)})
    except Exception:
        user = None
    if not user:
        user = await users_collection.find_one({"email": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user_id_str = str(user["_id"])

    # Buscar sesión por session_id o por _id (compat)
    session = await demo_sessions_collection.find_one({"session_id": session_id, "user_id": user_id_str})
    if not session:
        if ObjectId.is_valid(session_id):
            session = await demo_sessions_collection.find_one({"_id": ObjectId(session_id), "user_id": user_id_str})
    if not session:
        if session_id.startswith("demo_"):
            maybe_oid = session_id[5:]
            if ObjectId.is_valid(maybe_oid):
                session = await demo_sessions_collection.find_one({"_id": ObjectId(maybe_oid), "user_id": user_id_str})
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    # Normalizar ids
    if session.get("_id") is not None:
        session["_id"] = str(session["_id"])
    if not session.get("session_id"):
        session["session_id"] = session.get("_id")

    return session


class UpdateUserRequest(BaseModel):
    role: Optional[str] = None
    active: Optional[bool] = None


class FullUpdateUserRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    active: Optional[bool] = None


class CreateUserRequest(BaseModel):
    username: str
    email: str
    password: str
    role: str = "user"


class ResetPasswordRequest(BaseModel):
    new_password: str


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    request: UpdateUserRequest,
    admin: dict = Depends(require_admin)
):
    """Actualiza un usuario parcialmente (solo role y active)"""
    from bson import ObjectId
    import sys
    import traceback

    try:
        # Verificar permisos
        if admin.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Se requieren permisos de administrador"
            )

        # Buscar usuario
        user = None
        try:
            if len(user_id) == 24:  # ObjectId tiene 24 caracteres hexadecimales
                user = await users_collection.find_one({"_id": ObjectId(user_id)})
        except Exception as e:
            print(f"[ADMIN] Error buscando por ObjectId: {e}", file=sys.stderr)
        
        if not user:
            user = await users_collection.find_one({"email": user_id})

        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        user_id_obj = user["_id"]
        update_data = {}
        
        if request.role is not None:
            if request.role not in ["user", "admin"]:
                raise HTTPException(status_code=400, detail="Rol inválido. Debe ser 'user' o 'admin'")
            update_data["role"] = request.role

        if request.active is not None:
            update_data["active"] = request.active

        if not update_data:
            raise HTTPException(status_code=400, detail="Sin cambios para actualizar")

        print(f"[ADMIN] Actualizando usuario {user_id} ({user.get('email')}): {update_data}", file=sys.stderr)

        result = await users_collection.update_one(
            {"_id": user_id_obj},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        # Log de auditoría
        try:
            await db.audit_logs.insert_one({
                "action": "update_user",
                "target_user_id": str(user_id_obj),
                "target_username": user.get("username"),
                "admin_user": admin.get("username"),
                "admin_email": admin.get("email"),
                "timestamp": datetime.utcnow().isoformat(),
                "changes": update_data
            })
        except Exception as e:
            print(f"[ADMIN] Error guardando log de auditoría: {e}", file=sys.stderr)

        # Obtener usuario actualizado
        updated_user = await users_collection.find_one({"_id": user_id_obj})
        if not updated_user:
            raise HTTPException(status_code=404, detail="Error al obtener usuario actualizado")
        
        updated_user["_id"] = str(updated_user["_id"])
        updated_user.pop("hashed_password", None)

        return {
            "success": True,
            "message": "Usuario actualizado correctamente",
            "user": updated_user
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ADMIN] Error inesperado en update_user: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar usuario: {str(e)}"
        )


@router.put("/users/{user_id}")
async def full_update_user(
    user_id: str,
    request: FullUpdateUserRequest,
    admin: dict = Depends(require_admin)
):
    """Actualiza un usuario completamente"""
    from bson import ObjectId
    import sys
    import traceback

    try:
        # Verificar que el usuario autenticado es admin
        if admin.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Se requieren permisos de administrador"
            )

        # Buscar usuario - intentar por ObjectId primero
        user = None
        try:
            if len(user_id) == 24:  # ObjectId tiene 24 caracteres hexadecimales
                user = await users_collection.find_one({"_id": ObjectId(user_id)})
        except Exception as e:
            print(f"[ADMIN] Error buscando por ObjectId: {e}", file=sys.stderr)
        
        # Si no se encuentra, buscar por email
        if not user:
            user = await users_collection.find_one({"email": user_id})
        
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        user_id_obj = user["_id"]
        update_data = {}

        if request.username is not None:
            # Verificar que el username no esté en uso por otro usuario
            existing = await users_collection.find_one({
                "username": request.username,
                "_id": {"$ne": user_id_obj}
            })
            if existing:
                raise HTTPException(status_code=400, detail="Nombre de usuario ya existe")
            update_data["username"] = request.username

        if request.email is not None:
            # Verificar que el email no esté en uso por otro usuario
            existing = await users_collection.find_one({
                "email": request.email,
                "_id": {"$ne": user_id_obj}
            })
            if existing:
                raise HTTPException(status_code=400, detail="Email ya existe")
            update_data["email"] = request.email

        if request.role is not None:
            if request.role not in ["user", "admin"]:
                raise HTTPException(status_code=400, detail="Rol inválido. Debe ser 'user' o 'admin'")
            update_data["role"] = request.role

        if request.active is not None:
            update_data["active"] = request.active

        if not update_data:
            raise HTTPException(status_code=400, detail="Sin cambios para actualizar")

        print(f"[ADMIN] Actualizando usuario {user_id} ({user.get('email')}): {update_data}", file=sys.stderr)

        result = await users_collection.update_one(
            {"_id": user_id_obj},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        # Log de auditoría
        try:
            await db.audit_logs.insert_one({
                "action": "update_user",
                "target_user_id": str(user_id_obj),
                "target_username": user.get("username"),
                "admin_user": admin.get("username"),
                "admin_email": admin.get("email"),
                "timestamp": datetime.utcnow().isoformat(),
                "changes": update_data
            })
        except Exception as e:
            print(f"[ADMIN] Error guardando log de auditoría: {e}", file=sys.stderr)

        print(f"[ADMIN] Usuario {user_id} actualizado exitosamente", file=sys.stderr)

        # Obtener usuario actualizado para devolverlo
        updated_user = await users_collection.find_one({"_id": user_id_obj})
        if not updated_user:
            raise HTTPException(status_code=404, detail="Error al obtener usuario actualizado")
        
        updated_user["_id"] = str(updated_user["_id"])
        updated_user.pop("hashed_password", None)

        return {
            "success": True,
            "message": "Usuario actualizado correctamente",
            "user": updated_user
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ADMIN] Error inesperado en full_update_user: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al actualizar usuario: {str(e)}"
        )


@router.post("/users")
async def create_user(
    request: CreateUserRequest,
    admin: dict = Depends(require_admin)
):
    """Crea un nuevo usuario (solo admin)"""
    import sys

    # Verificar que username y email no existan
    existing_username = await users_collection.find_one({"username": request.username})
    if existing_username:
        raise HTTPException(status_code=400, detail="Nombre de usuario ya existe")

    existing_email = await users_collection.find_one({"email": request.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email ya existe")

    if request.role not in ["user", "admin"]:
        raise HTTPException(status_code=400, detail="Rol inválido")

    # Crear usuario (bcrypt_sha256; evita límite 72 bytes de bcrypt)
    hashed_password = get_password_hash(request.password)

    new_user = {
        "username": request.username,
        "email": request.email,
        "hashed_password": hashed_password,
        "role": request.role,
        "active": True,
        "created_at": datetime.utcnow().isoformat()
    }

    print(f"[ADMIN] Creando nuevo usuario: {request.username} ({request.email})", file=sys.stderr)

    result = await users_collection.insert_one(new_user)

    print(f"[ADMIN] Usuario creado exitosamente. ID: {result.inserted_id}", file=sys.stderr)

    return {
        "success": True,
        "message": "Usuario creado correctamente",
        "user_id": str(result.inserted_id),
        "username": request.username,
        "email": request.email,
        "role": request.role
    }


@router.post("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: str,
    request: ResetPasswordRequest,
    admin: dict = Depends(require_admin)
):
    """Resetea la contraseña de un usuario (solo admin)"""
    from bson import ObjectId
    import sys

    # Verificar que el usuario existe
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Hash de la nueva contraseña (bcrypt_sha256; evita límite 72 bytes de bcrypt)
    hashed_password = get_password_hash(request.new_password)

    print(f"[ADMIN] Reseteando contraseña para usuario {user_id} ({user.get('username', 'unknown')})", file=sys.stderr)

    # Actualizar contraseña
    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"hashed_password": hashed_password}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Error al resetear contraseña")

    # Log de auditoría
    await db.audit_logs.insert_one({
        "action": "password_reset",
        "target_user_id": user_id,
        "target_username": user.get("username"),
        "admin_user": admin.get("username"),
        "admin_email": admin.get("email"),
        "timestamp": datetime.utcnow().isoformat(),
        "details": "Password reset by admin"
    })

    print(f"[ADMIN] Contraseña reseteada exitosamente para {user_id}", file=sys.stderr)

    return {
        "success": True,
        "message": "Contraseña reseteada correctamente",
        "username": user.get("username")
    }


@router.post("/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: str,
    admin: dict = Depends(require_admin)
):
    """Activa o desactiva un usuario sin eliminarlo (solo admin)"""
    from bson import ObjectId
    import sys

    # Verificar que el usuario existe
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # No permitir desactivar el propio usuario admin
    if str(user["_id"]) == admin.get("user_id") or user["email"] == admin.get("email"):
        raise HTTPException(status_code=400, detail="No puedes desactivar tu propio usuario")

    # Toggle active status
    new_active_status = not user.get("active", True)

    print(f"[ADMIN] Cambiando estado de usuario {user_id} a {'activo' if new_active_status else 'inactivo'}", file=sys.stderr)

    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"active": new_active_status}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Error al cambiar estado del usuario")

    # Log de auditoría
    await db.audit_logs.insert_one({
        "action": "toggle_active",
        "target_user_id": user_id,
        "target_username": user.get("username"),
        "admin_user": admin.get("username"),
        "admin_email": admin.get("email"),
        "timestamp": datetime.utcnow().isoformat(),
        "details": f"User {'activated' if new_active_status else 'deactivated'}",
        "new_status": new_active_status
    })

    print(f"[ADMIN] Usuario {user_id} ahora está {'activo' if new_active_status else 'inactivo'}", file=sys.stderr)

    return {
        "success": True,
        "message": f"Usuario {'activado' if new_active_status else 'desactivado'} correctamente",
        "username": user.get("username"),
        "active": new_active_status
    }


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    admin: dict = Depends(require_admin)
):
    """Elimina un usuario permanentemente (solo admin)"""
    from bson import ObjectId
    import sys

    # Verificar que el usuario existe
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # No permitir eliminar el propio usuario admin
    if str(user["_id"]) == admin.get("user_id") or user["email"] == admin.get("email"):
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propio usuario")

    print(f"[ADMIN] Eliminando usuario {user_id} ({user.get('username', 'unknown')})", file=sys.stderr)

    # Eliminar usuario
    result = await users_collection.delete_one({"_id": ObjectId(user_id)})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Error al eliminar usuario")

    # También eliminar suscripciones, cartas y pagos relacionados
    await subscriptions_collection.delete_many({"user_id": user_id})
    await db.charts.delete_many({"user_id": user_id})
    await payments_collection.delete_many({"user_id": user_id})

    # Log de auditoría
    await db.audit_logs.insert_one({
        "action": "delete_user",
        "target_user_id": user_id,
        "target_username": user.get("username"),
        "target_email": user.get("email"),
        "admin_user": admin.get("username"),
        "admin_email": admin.get("email"),
        "timestamp": datetime.utcnow().isoformat(),
        "details": "User permanently deleted with all related data"
    })

    print(f"[ADMIN] Usuario {user_id} y sus datos relacionados eliminados exitosamente", file=sys.stderr)

    return {
        "success": True,
        "message": "Usuario eliminado correctamente",
        "deleted_user": user.get("username", "unknown")
    }


# ==================== LOGS DE AUDITORÍA ====================

@router.get("/audit-logs")
async def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    action: Optional[str] = None,
    target_user_id: Optional[str] = None,
    admin: dict = Depends(require_admin)
):
    """Obtiene logs de auditoría de acciones administrativas"""
    import sys

    query = {}

    if action:
        query["action"] = action

    if target_user_id:
        query["target_user_id"] = target_user_id

    print(f"[ADMIN] Consultando logs de auditoría: query={query}", file=sys.stderr)

    # Obtener logs ordenados por fecha descendente
    logs_cursor = db.audit_logs.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    logs = await logs_cursor.to_list(length=limit)
    total = await db.audit_logs.count_documents(query)

    # Convertir ObjectId a string
    for log in logs:
        log["_id"] = str(log["_id"])

    total_pages = (total + limit - 1) // limit
    current_page = (skip // limit) + 1

    print(f"[ADMIN] Encontrados {total} logs de auditoría, página {current_page}/{total_pages}", file=sys.stderr)

    return {
        "logs": logs,
        "total": total,
        "page": current_page,
        "total_pages": total_pages,
        "has_next": skip + limit < total,
        "has_prev": skip > 0
    }


@router.get("/audit-logs/user/{user_id}")
async def get_user_audit_logs(
    user_id: str,
    admin: dict = Depends(require_admin)
):
    """Obtiene el historial de cambios de un usuario específico"""
    import sys

    print(f"[ADMIN] Consultando historial de auditoría para usuario {user_id}", file=sys.stderr)

    # Obtener todos los logs relacionados con este usuario
    logs_cursor = db.audit_logs.find({"target_user_id": user_id}).sort("timestamp", -1)
    logs = await logs_cursor.to_list(length=100)

    for log in logs:
        log["_id"] = str(log["_id"])

    print(f"[ADMIN] Encontrados {len(logs)} logs para usuario {user_id}", file=sys.stderr)

    return {
        "user_id": user_id,
        "logs": logs,
        "total": len(logs)
    }


# ==================== GESTIÓN DE SUSCRIPCIONES ====================

@router.get("/subscriptions/stats")
async def get_subscription_stats(admin: dict = Depends(require_admin)):
    """Estadísticas de suscripciones"""
    pipeline = [
        {"$group": {
            "_id": "$tier",
            "count": {"$sum": 1},
            "active": {"$sum": {"$cond": [{"$eq": ["$status", "active"]}, 1, 0]}}
        }}
    ]
    
    stats = await subscriptions_collection.aggregate(pipeline).to_list(length=10)
    
    return {"subscription_stats": stats}


@router.post("/subscriptions/{user_id}/upgrade")
async def admin_upgrade_subscription(
    user_id: str,
    tier: SubscriptionTier,
    admin: dict = Depends(require_admin)
):
    """Admin puede cambiar suscripción de un usuario"""
    subscription = UserSubscription(
        user_id=user_id,
        tier=tier,
        status="active",
        start_date=datetime.utcnow().isoformat(),
        end_date=(datetime.utcnow() + timedelta(days=365)).isoformat(),
        auto_renew=True
    )
    
    await subscriptions_collection.update_one(
        {"user_id": user_id},
        {"$set": subscription.dict()},
        upsert=True
    )
    
    return {"success": True, "message": f"Suscripción actualizada a {tier.value}"}


# ==================== GESTIÓN DE FACTURAS ====================

@router.get("/invoices")
async def get_all_invoices(
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = None,
    admin: dict = Depends(require_admin)
):
    """Lista todas las facturas"""
    query = {}
    if status_filter:
        query["status"] = status_filter
    
    invoices_cursor = invoices_collection.find(query).sort("issue_date", -1).skip(skip).limit(limit)
    invoices = await invoices_cursor.to_list(length=limit)
    
    for invoice in invoices:
        invoice["_id"] = str(invoice["_id"])
    
    return {"invoices": invoices}


@router.post("/invoices")
async def create_invoice(
    invoice: Invoice,
    admin: dict = Depends(require_admin)
):
    """Crea una factura"""
    # Generar número de factura
    year = datetime.now().year
    count = await invoices_collection.count_documents({
        "invoice_number": {"$regex": f"^{year}-"}
    })
    invoice.invoice_number = f"{year}-{count + 1:03d}"
    
    result = await invoices_collection.insert_one(invoice.dict())
    
    return {
        "success": True,
        "invoice_id": str(result.inserted_id),
        "invoice_number": invoice.invoice_number
    }


@router.get("/invoices/{invoice_id}")
async def get_invoice(
    invoice_id: str,
    admin: dict = Depends(require_admin)
):
    """Obtiene una factura específica"""
    from bson import ObjectId
    
    invoice = await invoices_collection.find_one({"_id": ObjectId(invoice_id)})
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    
    invoice["_id"] = str(invoice["_id"])
    return invoice


# ==================== GESTIÓN DE PRESUPUESTOS ====================

@router.get("/quotes")
async def get_all_quotes(admin: dict = Depends(require_admin)):
    """Lista todos los presupuestos"""
    quotes_cursor = quotes_collection.find().sort("issue_date", -1)
    quotes = await quotes_cursor.to_list(length=100)
    
    for quote in quotes:
        quote["_id"] = str(quote["_id"])
    
    return {"quotes": quotes}


@router.post("/quotes")
async def create_quote(
    quote: Quote,
    admin: dict = Depends(require_admin)
):
    """Crea un presupuesto"""
    year = datetime.now().year
    count = await quotes_collection.count_documents({
        "quote_number": {"$regex": f"^{year}-"}
    })
    quote.quote_number = f"{year}-P-{count + 1:03d}"
    
    result = await quotes_collection.insert_one(quote.dict())
    
    return {
        "success": True,
        "quote_id": str(result.inserted_id),
        "quote_number": quote.quote_number
    }


@router.post("/quotes/{quote_id}/convert")
async def convert_quote_to_invoice(
    quote_id: str,
    admin: dict = Depends(require_admin)
):
    """Convierte un presupuesto en factura"""
    from bson import ObjectId
    
    quote = await quotes_collection.find_one({"_id": ObjectId(quote_id)})
    if not quote:
        raise HTTPException(status_code=404, detail="Presupuesto no encontrado")
    
    if quote.get("converted_to_invoice"):
        raise HTTPException(status_code=400, detail="Presupuesto ya convertido")
    
    # Crear factura desde presupuesto
    invoice = Invoice(
        user_id=quote["user_id"],
        client_name=quote["client_name"],
        client_email=quote["client_email"],
        items=quote["items"],
        subtotal=quote["subtotal"],
        tax_amount=quote["tax_amount"],
        total=quote["total"],
        status="draft"
    )
    
    year = datetime.now().year
    count = await invoices_collection.count_documents({
        "invoice_number": {"$regex": f"^{year}-"}
    })
    invoice.invoice_number = f"{year}-{count + 1:03d}"
    
    result = await invoices_collection.insert_one(invoice.dict())
    invoice_id = str(result.inserted_id)
    
    # Actualizar presupuesto
    await quotes_collection.update_one(
        {"_id": ObjectId(quote_id)},
        {"$set": {
            "status": "accepted",
            "converted_to_invoice": True,
            "invoice_id": invoice_id
        }}
    )
    
    return {
        "success": True,
        "invoice_id": invoice_id,
        "invoice_number": invoice.invoice_number
    }


# ==================== ESTADÍSTICAS GENERALES ====================

@router.get("/dashboard/stats")
async def get_dashboard_stats(admin: dict = Depends(require_admin)):
    """Estadísticas del dashboard admin"""
    total_users = await users_collection.count_documents({})
    active_subscriptions = await subscriptions_collection.count_documents({"status": "active"})
    total_charts = await db.charts.count_documents({})
    
    # Ingresos del mes actual
    start_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_revenue_pipeline = [
        {
            "$match": {
                "status": "completed",
                "completed_at": {"$gte": start_of_month.isoformat()}
            }
        },
        {
            "$group": {
                "_id": None,
                "total": {"$sum": "$amount"}
            }
        }
    ]
    
    revenue_result = await payments_collection.aggregate(monthly_revenue_pipeline).to_list(length=1)
    monthly_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    return {
        "total_users": total_users,
        "active_subscriptions": active_subscriptions,
        "total_charts": total_charts,
        "monthly_revenue": round(monthly_revenue, 2)
    }


# ==================== ACCESO ADMIN A PLANES ====================

@router.post("/subscriptions/grant-plan")
async def grant_admin_plan_access(
    request: dict,
    admin: dict = Depends(require_admin)
):
    """
    Da acceso automático al admin a un plan (sin Stripe).
    El admin puede acceder a cualquier plan sin necesidad de pagar.
    
    Request body:
    {
        "plan_tier": "pro"|"premium"|"enterprise",
        "duration_days": 365 (optional, default 365)
    }
    """
    try:
        from app.models.subscription import SUBSCRIPTION_PLANS, SubscriptionTier, UserSubscription
        
        plan_tier = request.get("plan_tier", "enterprise").lower()
        duration_days = request.get("duration_days", 365)
        
        # Validar tier
        valid_tiers = ["pro", "premium", "enterprise"]
        if plan_tier not in valid_tiers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Plan inválido. Debe ser: {', '.join(valid_tiers)}"
            )
        
        tier_enum = SubscriptionTier(plan_tier)
        plan = SUBSCRIPTION_PLANS[tier_enum]
        
        admin_id = str(admin.get("_id"))
        
        # Verificar si admin ya tiene suscripción
        existing = await subscriptions_collection.find_one({"user_id": admin_id})
        
        start_date = datetime.utcnow()
        end_date = start_date + timedelta(days=duration_days)
        
        if existing:
            # Actualizar suscripción existente
            await subscriptions_collection.update_one(
                {"user_id": admin_id},
                {
                    "$set": {
                        "tier": plan_tier,
                        "status": "active",
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat(),
                        "billing_cycle": "admin_unlimited",
                        "auto_renew": True,
                        "payment_status": "admin_granted",
                        "admin_granted_at": datetime.utcnow().isoformat(),
                        "admin_plan_notes": f"Plan {plan.name} otorgado al administrador"
                    }
                }
            )
            action = "actualizada"
        else:
            # Crear nueva suscripción
            subscription = UserSubscription(
                user_id=admin_id,
                tier=plan_tier,
                status="active",
                start_date=start_date.isoformat(),
                end_date=end_date.isoformat(),
                billing_cycle="admin_unlimited",
                auto_renew=True,
                payment_status="admin_granted"
            )
            
            sub_dict = subscription.dict()
            sub_dict["admin_granted_at"] = datetime.utcnow().isoformat()
            sub_dict["admin_plan_notes"] = f"Plan {plan.name} otorgado al administrador"
            
            await subscriptions_collection.insert_one(sub_dict)
            action = "creada"
        
        return {
            "success": True,
            "message": f"Suscripción {action} correctamente",
            "user_id": admin_id,
            "tier": plan_tier,
            "plan_name": plan.name,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "status": "active"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error en grant_admin_plan_access: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error asignando plan: {str(e)}"
        )


# ==================== CONTROL DE TOKENS Y GASTO DE IA ====================

@router.get("/ai-usage/stats")
async def get_ai_usage_stats(
    start_date: Optional[str] = Query(None, description="Fecha de inicio (ISO format)"),
    end_date: Optional[str] = Query(None, description="Fecha de fin (ISO format)"),
    user_id: Optional[str] = Query(None, description="Filtrar por usuario"),
    action_type: Optional[str] = Query(None, description="Filtrar por tipo de acción"),
    current_user: dict = Depends(require_admin)
):
    """
    Obtiene estadísticas agregadas de uso de IA y tokens
    Solo accesible para administradores
    """
    try:
        start = datetime.fromisoformat(start_date.replace('Z', '+00:00')) if start_date else None
        end = datetime.fromisoformat(end_date.replace('Z', '+00:00')) if end_date else None
        action = AIActionType(action_type) if action_type else None
        
        stats = await get_usage_stats(
            start_date=start,
            end_date=end,
            user_id=user_id,
            action_type=action
        )
        
        return stats
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato de fecha inválido: {str(e)}"
        )
    except Exception as e:
        print(f"❌ Error obteniendo estadísticas de IA: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo estadísticas: {str(e)}"
        )


@router.get("/ai-usage/history")
async def get_ai_usage_history(
    start_date: Optional[str] = Query(None, description="Fecha de inicio (ISO format)"),
    end_date: Optional[str] = Query(None, description="Fecha de fin (ISO format)"),
    user_id: Optional[str] = Query(None, description="Filtrar por usuario"),
    action_type: Optional[str] = Query(None, description="Filtrar por tipo de acción"),
    limit: int = Query(100, ge=1, le=1000, description="Límite de registros"),
    skip: int = Query(0, ge=0, description="Registros a saltar"),
    current_user: dict = Depends(require_admin)
):
    """
    Obtiene el historial completo de uso de IA con trazabilidad forense
    Solo accesible para administradores
    """
    try:
        start = datetime.fromisoformat(start_date.replace('Z', '+00:00')) if start_date else None
        end = datetime.fromisoformat(end_date.replace('Z', '+00:00')) if end_date else None
        action = AIActionType(action_type) if action_type else None
        
        history = await get_usage_history(
            start_date=start,
            end_date=end,
            user_id=user_id,
            action_type=action,
            limit=limit,
            skip=skip
        )
        
        # Convertir ObjectId a string para JSON
        for record in history:
            if '_id' in record:
                record['_id'] = str(record['_id'])
            if 'created_at' in record and isinstance(record['created_at'], datetime):
                record['created_at'] = record['created_at'].isoformat()
        
        return {
            "total": len(history),
            "limit": limit,
            "skip": skip,
            "records": history
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato de fecha inválido: {str(e)}"
        )
    except Exception as e:
        print(f"❌ Error obteniendo historial de IA: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo historial: {str(e)}"
        )


@router.get("/ai-usage/user/{user_id}")
async def get_user_ai_usage(
    user_id: str,
    start_date: Optional[str] = Query(None, description="Fecha de inicio (ISO format)"),
    end_date: Optional[str] = Query(None, description="Fecha de fin (ISO format)"),
    current_user: dict = Depends(require_admin)
):
    """
    Obtiene el historial de uso de IA de un usuario específico
    Solo accesible para administradores
    """
    try:
        start = datetime.fromisoformat(start_date.replace('Z', '+00:00')) if start_date else None
        end = datetime.fromisoformat(end_date.replace('Z', '+00:00')) if end_date else None
        
        stats = await get_usage_stats(
            start_date=start,
            end_date=end,
            user_id=user_id
        )
        
        history = await get_usage_history(
            start_date=start,
            end_date=end,
            user_id=user_id,
            limit=1000
        )
        
        # Convertir ObjectId a string
        for record in history:
            if '_id' in record:
                record['_id'] = str(record['_id'])
            if 'created_at' in record and isinstance(record['created_at'], datetime):
                record['created_at'] = record['created_at'].isoformat()
        
        return {
            "user_id": user_id,
            "stats": stats,
            "history": history
        }
    except Exception as e:
        print(f"❌ Error obteniendo uso de IA del usuario: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo uso del usuario: {str(e)}"
        )

