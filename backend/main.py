"""
Punto de entrada principal del backend FastAPI
"""
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar dominios específicos
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
