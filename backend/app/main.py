"""
Router principal de la aplicación FastAPI
Incluye todos los endpoints de la API
"""
from fastapi import APIRouter
from app.api.endpoints import (
    auth,
    charts,
    config,
    ephemeris,
    reports,
    subscriptions,
    admin,
    geolocation,
    expert_chat,
    professional_services,
    demo_chat
)

# Crear router principal
router = APIRouter()

# Incluir routers de endpoints
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(charts.router, prefix="/charts", tags=["charts"])
router.include_router(config.router, prefix="/config", tags=["config"])
router.include_router(ephemeris.router, prefix="/ephemeris", tags=["ephemeris"])
router.include_router(geolocation.router, prefix="/geolocation", tags=["geolocation"])
router.include_router(reports.router, prefix="/reports", tags=["reports"])
router.include_router(subscriptions.router, prefix="/subscriptions", tags=["subscriptions"])
router.include_router(admin.router, prefix="/admin", tags=["admin"])

# Nuevos endpoints para sistema de expertos y servicios profesionales
router.include_router(expert_chat.router, prefix="/expert-chat", tags=["expert-chat"])
router.include_router(professional_services.router, prefix="/professional-services", tags=["professional-services"])
router.include_router(demo_chat.router, prefix="/demo-chat", tags=["demo-chat"])

# Alias para compatibilidad
app = router
