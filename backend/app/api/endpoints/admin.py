"""
Panel de administración completo
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
from typing import List, Optional
import os
from dotenv import load_dotenv
from app.api.endpoints.auth import get_current_user
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

    # Obtener usuarios
    users_cursor = users_collection.find(query).sort(sort_by, sort_direction).skip(skip).limit(limit)
    users = await users_cursor.to_list(length=limit)
    total = await users_collection.count_documents(query)

    # Limpiar datos sensibles
    for user in users:
        user["_id"] = str(user["_id"])
        user.pop("hashed_password", None)

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
    """Obtiene detalles completos de un usuario"""
    from bson import ObjectId
    
    # Usuario
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    user["_id"] = str(user["_id"])
    user.pop("hashed_password", None)
    
    # Suscripción
    subscription = await subscriptions_collection.find_one({"user_id": user_id})
    
    # Cartas
    charts_count = await db.charts.count_documents({"user_id": user_id})
    
    # Pagos
    payments_cursor = payments_collection.find({"user_id": user_id}).limit(10)
    payments = await payments_cursor.to_list(length=10)
    for payment in payments:
        payment["_id"] = str(payment["_id"])
    
    return {
        "user": user,
        "subscription": subscription,
        "charts_count": charts_count,
        "recent_payments": payments
    }


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

    update_data = {}
    if request.role is not None:
        if request.role not in ["user", "admin"]:
            raise HTTPException(status_code=400, detail="Rol inválido")
        update_data["role"] = request.role

    if request.active is not None:
        update_data["active"] = request.active

    if not update_data:
        raise HTTPException(status_code=400, detail="Sin cambios")

    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return {"success": True, "message": "Usuario actualizado"}


@router.put("/users/{user_id}")
async def full_update_user(
    user_id: str,
    request: FullUpdateUserRequest,
    admin: dict = Depends(require_admin)
):
    """Actualiza un usuario completamente"""
    from bson import ObjectId
    import sys

    update_data = {}

    if request.username is not None:
        # Verificar que el username no esté en uso por otro usuario
        existing = await users_collection.find_one({
            "username": request.username,
            "_id": {"$ne": ObjectId(user_id)}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Nombre de usuario ya existe")
        update_data["username"] = request.username

    if request.email is not None:
        # Verificar que el email no esté en uso por otro usuario
        existing = await users_collection.find_one({
            "email": request.email,
            "_id": {"$ne": ObjectId(user_id)}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Email ya existe")
        update_data["email"] = request.email

    if request.role is not None:
        if request.role not in ["user", "admin"]:
            raise HTTPException(status_code=400, detail="Rol inválido")
        update_data["role"] = request.role

    if request.active is not None:
        update_data["active"] = request.active

    if not update_data:
        raise HTTPException(status_code=400, detail="Sin cambios")

    print(f"[ADMIN] Actualizando usuario {user_id}: {update_data}", file=sys.stderr)

    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    print(f"[ADMIN] Usuario {user_id} actualizado exitosamente", file=sys.stderr)

    return {"success": True, "message": "Usuario actualizado correctamente"}


@router.post("/users")
async def create_user(
    request: CreateUserRequest,
    admin: dict = Depends(require_admin)
):
    """Crea un nuevo usuario (solo admin)"""
    from passlib.context import CryptContext
    import sys

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    # Verificar que username y email no existan
    existing_username = await users_collection.find_one({"username": request.username})
    if existing_username:
        raise HTTPException(status_code=400, detail="Nombre de usuario ya existe")

    existing_email = await users_collection.find_one({"email": request.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email ya existe")

    if request.role not in ["user", "admin"]:
        raise HTTPException(status_code=400, detail="Rol inválido")

    # Crear usuario
    hashed_password = pwd_context.hash(request.password)

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
    from passlib.context import CryptContext
    import sys

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    # Verificar que el usuario existe
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Hash de la nueva contraseña
    hashed_password = pwd_context.hash(request.new_password)

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

