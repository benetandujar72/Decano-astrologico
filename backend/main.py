"""
Punto de entrada principal del backend FastAPI
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

# Incluir routers de la aplicación
app.include_router(app_router)

@app.get("/")
async def root():
    return {"message": "FRAKTAL API v1.0", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
