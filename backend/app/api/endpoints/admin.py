"""
Panel de administración completo
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
from typing import List, Optional
import os
from dotenv import load_dotenv
from app.api.endpoints.auth import get_current_user, get_password_hash
from app.models.subscription import Invoice, Quote, SubscriptionTier
from pydantic import BaseModel

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


def require_admin(current_user: dict = Depends(get_current_user)):
    """Middleware para verificar permisos de admin"""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren permisos de administrador"
        )
    return current_user


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
    
    # Suscripción
    subscription = await subscriptions_collection.find_one({"user_id": user_id_str})
    if not subscription:
        # Intentar buscar por email también
        subscription = await subscriptions_collection.find_one({"user_id": user.get("email")})
    
    # Convertir subscription a dict si existe
    subscription_dict = None
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
    
    # Cartas
    charts_count = await db.charts.count_documents({"user_id": user_id_str})
    
    # Pagos
    payments_cursor = payments_collection.find({"user_id": user_id_str}).limit(10)
    payments = await payments_cursor.to_list(length=10)
    for payment in payments:
        payment["_id"] = str(payment["_id"])
    
    # Consultas con experto IA
    consultations_count = await db.expert_consultations.count_documents({"user_id": user_id_str})
    
    # Reservas de servicios
    bookings_count = await db.service_bookings.count_documents({"user_id": user_id_str})
    
    result = {
        "_id": user_id_str,
        "username": user.get("username"),
        "email": user.get("email"),
        "role": user.get("role", "user"),
        "active": user.get("active", True),
        "created_at": user.get("created_at"),
        "subscription": subscription_dict,
        "charts_count": charts_count,
        "consultations_count": consultations_count,
        "bookings_count": bookings_count,
        "recent_payments": payments
    }
    
    print(f"[ADMIN] Detalles de usuario {user_id_str} obtenidos exitosamente", file=sys.stderr)
    
    return result


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
    charts_cursor = db.charts.find({"user_id": user_id_str}).sort("timestamp", -1)
    charts = await charts_cursor.to_list(length=100)
    
    for chart in charts:
        chart["_id"] = str(chart["_id"])
        chart["chart_id"] = chart.get("chart_id") or str(chart["_id"])
    
    return {"charts": charts, "total": len(charts)}


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

    # Verificar permisos
    if admin.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren permisos de administrador"
        )

    # Buscar usuario
    user = None
    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
    except Exception as e:
        print(f"[ADMIN] Error buscando por ObjectId: {e}", file=sys.stderr)
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
    await db.audit_logs.insert_one({
        "action": "update_user",
        "target_user_id": str(user_id_obj),
        "target_username": user.get("username"),
        "admin_user": admin.get("username"),
        "admin_email": admin.get("email"),
        "timestamp": datetime.utcnow().isoformat(),
        "changes": update_data
    })

    # Obtener usuario actualizado
    updated_user = await users_collection.find_one({"_id": user_id_obj})
    updated_user["_id"] = str(updated_user["_id"])
    updated_user.pop("hashed_password", None)

    return {
        "success": True,
        "message": "Usuario actualizado correctamente",
        "user": updated_user
    }


@router.put("/users/{user_id}")
async def full_update_user(
    user_id: str,
    request: FullUpdateUserRequest,
    admin: dict = Depends(require_admin)
):
    """Actualiza un usuario completamente"""
    from bson import ObjectId
    import sys

    # Verificar que el usuario autenticado es admin
    if admin.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren permisos de administrador"
        )

    # Buscar usuario - intentar por ObjectId primero
    user = None
    try:
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
    await db.audit_logs.insert_one({
        "action": "update_user",
        "target_user_id": str(user_id_obj),
        "target_username": user.get("username"),
        "admin_user": admin.get("username"),
        "admin_email": admin.get("email"),
        "timestamp": datetime.utcnow().isoformat(),
        "changes": update_data
    })

    print(f"[ADMIN] Usuario {user_id} actualizado exitosamente", file=sys.stderr)

    # Obtener usuario actualizado para devolverlo
    updated_user = await users_collection.find_one({"_id": user_id_obj})
    updated_user["_id"] = str(updated_user["_id"])
    updated_user.pop("hashed_password", None)

    return {
        "success": True,
        "message": "Usuario actualizado correctamente",
        "user": updated_user
    }


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

