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
    admin: dict = Depends(require_admin)
):
    """Lista todos los usuarios (solo admin)"""
    query = {}
    if search:
        query = {
            "$or": [
                {"username": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}}
            ]
        }
    
    users_cursor = users_collection.find(query).skip(skip).limit(limit)
    users = await users_cursor.to_list(length=limit)
    total = await users_collection.count_documents(query)
    
    # Limpiar datos sensibles
    for user in users:
        user["_id"] = str(user["_id"])
        user.pop("hashed_password", None)
    
    return {
        "users": users,
        "total": total,
        "skip": skip,
        "limit": limit
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


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    request: UpdateUserRequest,
    admin: dict = Depends(require_admin)
):
    """Actualiza un usuario"""
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

