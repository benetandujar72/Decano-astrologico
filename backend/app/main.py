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
    rag_admin,
    wp_reports,
    subscriptions,
    admin,
    profiles,
    geolocation,
    expert_chat,
    professional_services,
    demo_chat,
    contact,
    report_types,
    report_templates,
    report_prompts
)

# Crear router principal
router = APIRouter()

# Incluir routers de endpoints
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(charts.router, prefix="/charts", tags=["charts"])
router.include_router(profiles.router, prefix="/profiles", tags=["profiles"])
router.include_router(config.router, prefix="/config", tags=["config"])
router.include_router(ephemeris.router, prefix="/ephemeris", tags=["ephemeris"])
router.include_router(geolocation.router, prefix="/geolocation", tags=["geolocation"])
router.include_router(reports.router, prefix="/reports", tags=["reports"])
router.include_router(wp_reports.router, prefix="/wp", tags=["wp"])
router.include_router(subscriptions.router, prefix="/subscriptions", tags=["subscriptions"])
router.include_router(admin.router, prefix="/admin", tags=["admin"])
router.include_router(rag_admin.router, prefix="/admin", tags=["admin-rag"])

# Nuevos endpoints para sistema de expertos y servicios profesionales
router.include_router(expert_chat.router, prefix="/expert-chat", tags=["expert-chat"])
router.include_router(professional_services.router, prefix="/professional-services", tags=["professional-services"])
router.include_router(demo_chat.router, prefix="/demo-chat", tags=["demo-chat"])
router.include_router(contact.router, prefix="/contact", tags=["contact"])

# Endpoints para sistema de tipos de informe y plantillas personalizables
router.include_router(report_types.router, prefix="/report-types", tags=["report-types"])
router.include_router(report_templates.router, prefix="/templates", tags=["templates"])
router.include_router(report_prompts.router, prefix="/prompts", tags=["prompts"])

# Alias para compatibilidad
app = router
