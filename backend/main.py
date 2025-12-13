"""
Punto de entrada principal del backend FastAPI
"""
import os
import sys
import certifi
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# Forzar uso de certificados actualizados para TLS
os.environ["SSL_CERT_FILE"] = certifi.where()

from app.main import router as app_router

# Crear instancia de FastAPI
app = FastAPI(
    title="FRAKTAL API",
    description="API para análisis astrológico sistémico",
    version="1.0.0"
)

# Configurar CORS
_cors_origins = os.getenv(
    "CORS_ORIGINS",
    "https://decano-astrologico.vercel.app,http://localhost:3000,http://127.0.0.1:3000",
)
allowed_origins = [o.strip() for o in _cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler global para errores de MongoDB
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = str(exc)
    if "ServerSelectionTimeoutError" in type(exc).__name__ or "SSL" in error_msg:
        return JSONResponse(
            status_code=503,
            content={"detail": "Database connection error. Please try again later.", "error_type": "db_connection"},
            headers={
                "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
                "Access-Control-Allow-Credentials": "true",
            }
        )
    # Para otros errores, log y devolver 500 con CORS
    print(f"Unhandled error: {type(exc).__name__}: {exc}", file=sys.stderr)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true",
        }
    )

# Incluir routers de la aplicación
app.include_router(app_router)

@app.get("/")
async def root():
    return {
        "message": "FRAKTAL API v1.0",
        "status": "running",
        "python_version": sys.version,
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/health/db")
async def health_db():
    """Verifica conexión a MongoDB"""
    try:
        mongo_url = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
        # Ping rápido
        await client.admin.command("ping")
        return {"status": "healthy", "db": "connected"}
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "db": "disconnected", "error": str(e)[:200]}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
