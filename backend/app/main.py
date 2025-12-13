"""
Router principal de la aplicación FastAPI
Incluye todos los endpoints de la API
"""
from fastapi import APIRouter
from app.api.endpoints import auth, charts, config

# Crear router principal
router = APIRouter()

# Incluir routers de endpoints
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(charts.router, prefix="/charts", tags=["charts"])
router.include_router(config.router, prefix="/config", tags=["config"])

# Alias para compatibilidad
app = router
