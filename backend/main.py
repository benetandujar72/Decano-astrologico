"""
Punto de entrada principal del backend FastAPI
"""
import os
import sys
import certifi
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()


async def seed_default_data_if_empty():
    """Seed default report types, prompts and templates if collections are empty"""
    mongo_url = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    db_name = os.getenv("MONGODB_DB_NAME", "astrology_db")

    try:
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
        db = client[db_name]

        # Check if report_types collection is empty
        report_types_count = await db["report_types"].count_documents({})
        if report_types_count == 0:
            print("🌱 Seeding default report types...")
            default_types = [
                {
                    "code": "carta_natal_completa",
                    "name": "Carta Natal Completa",
                    "description": "Análisis exhaustivo de la carta natal con todos los módulos disponibles",
                    "icon": "🌟",
                    "category": "individual",
                    "folder_path": "/reports/individual/carta-natal",
                    "min_plan_required": "free",
                    "is_active": True,
                    "is_beta": False,
                    "available_modules": [
                        {"id": "modulo_1", "name": "Introducción y Contexto", "required": True, "estimated_duration_sec": 300},
                        {"id": "modulo_2_fundamentos", "name": "Fundamentos Astrológicos", "required": True, "estimated_duration_sec": 240},
                        {"id": "modulo_2_personales", "name": "Planetas Personales", "required": True, "estimated_duration_sec": 240},
                        {"id": "modulo_2_sociales", "name": "Planetas Sociales", "required": True, "estimated_duration_sec": 240},
                        {"id": "modulo_2_transpersonales", "name": "Planetas Transpersonales", "required": True, "estimated_duration_sec": 300},
                        {"id": "modulo_2_aspectos", "name": "Aspectos Principales", "required": True, "estimated_duration_sec": 240},
                        {"id": "modulo_2_ejes", "name": "Ejes y Configuraciones", "required": True, "estimated_duration_sec": 480},
                        {"id": "modulo_2_sintesis", "name": "Síntesis Interpretativa", "required": True, "estimated_duration_sec": 240}
                    ],
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                    "version": 1
                },
                {
                    "code": "gancho_free",
                    "name": "Informe Gancho (Gratuito)",
                    "description": "Informe gratuito con análisis básico para convertir usuarios",
                    "icon": "🎁",
                    "category": "individual",
                    "folder_path": "/reports/individual/gancho",
                    "min_plan_required": "free",
                    "is_active": True,
                    "is_beta": False,
                    "available_modules": [
                        {"id": "modulo_1", "name": "Introducción", "required": True, "estimated_duration_sec": 180},
                        {"id": "modulo_2_personales", "name": "Planetas Personales", "required": True, "estimated_duration_sec": 200},
                        {"id": "modulo_2_sintesis", "name": "Síntesis", "required": True, "estimated_duration_sec": 180}
                    ],
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                    "version": 1
                },
                {
                    "code": "sinastria",
                    "name": "Sinastría (Compatibilidad)",
                    "description": "Análisis de compatibilidad entre dos cartas natales",
                    "icon": "💞",
                    "category": "sistemico",
                    "folder_path": "/reports/sistemico/sinastria",
                    "min_plan_required": "premium",
                    "is_active": True,
                    "is_beta": False,
                    "available_modules": [
                        {"id": "modulo_intro_sinastria", "name": "Introducción a la Sinastría", "required": True, "estimated_duration_sec": 240},
                        {"id": "modulo_aspectos_cruzados", "name": "Aspectos entre Cartas", "required": True, "estimated_duration_sec": 360},
                        {"id": "modulo_sintesis_sinastria", "name": "Síntesis de Compatibilidad", "required": True, "estimated_duration_sec": 240}
                    ],
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                    "version": 1
                }
            ]

            # Insert report types and create prompts
            for rt in default_types:
                # Create default prompt for this type
                prompt_data = {
                    "system_instruction": f"Eres un astrólogo profesional especializado en {rt['name']}.",
                    "user_prompt_template": "Genera un informe astrológico para {nombre} basado en: {carta_data}",
                    "variables": [
                        {"name": "nombre", "type": "string", "required": True},
                        {"name": "carta_data", "type": "object", "required": True}
                    ],
                    "llm_provider": "gemini",
                    "model": "gemini-3-pro-preview",
                    "temperature": 0.7,
                    "max_tokens": 8000,
                    "safety_settings": {},
                    "is_default": True,
                    "is_active": True,
                    "customized_by": None,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                    "version": 1
                }
                prompt_result = await db["prompts"].insert_one(prompt_data)

                rt["default_prompt_id"] = prompt_result.inserted_id
                result = await db["report_types"].insert_one(rt)

                # Update prompt with report_type_id
                await db["prompts"].update_one(
                    {"_id": prompt_result.inserted_id},
                    {"$set": {"report_type_id": result.inserted_id}}
                )

            print(f"  ✅ Created {len(default_types)} default report types with prompts")

        # Check if templates collection is empty
        templates_count = await db["templates"].count_documents({})
        if templates_count == 0:
            print("🌱 Seeding default templates...")

            # Get first report type
            first_type = await db["report_types"].find_one({"code": "carta_natal_completa"})
            if first_type:
                default_template = {
                    "name": "Plantilla Estándar",
                    "report_type_id": first_type["_id"],
                    "is_public": True,
                    "is_default": True,
                    "branding": {
                        "logo_url": None,
                        "logo_size": "medium",
                        "logo_position": "top-center",
                        "title": "Informe Astrológico Personal",
                        "title_auto_generate": True,
                        "typography": {
                            "font_family": "Merriweather",
                            "font_size_base": 12,
                            "font_color_primary": "#1e293b",
                            "font_color_secondary": "#64748b"
                        },
                        "color_scheme": {
                            "primary": "#4f46e5",
                            "secondary": "#f59e0b",
                            "background": "#ffffff"
                        }
                    },
                    "content": {
                        "modules_to_print": ["modulo_1", "modulo_2_fundamentos", "modulo_2_personales", "modulo_2_aspectos", "modulo_2_sintesis"],
                        "report_mode": "completo",
                        "include_chart_images": True,
                        "include_aspects_table": True,
                        "include_planetary_table": True,
                        "language": "es",
                        "page_size": "A4",
                        "page_orientation": "portrait"
                    },
                    "advanced": {
                        "custom_css": None,
                        "watermark_text": None,
                        "encryption_enabled": False,
                        "password_protected": False
                    },
                    "owner_id": None,
                    "usage_count": 0,
                    "last_used_at": None,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                    "is_deleted": False,
                    "preview_image_url": None
                }
                await db["templates"].insert_one(default_template)
                print("  ✅ Created default template")

        client.close()
        print("✅ Default data seeding check complete")

    except Exception as e:
        print(f"⚠️ Warning: Could not seed default data: {e}", file=sys.stderr)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    print("🚀 Starting FRAKTAL API...")
    await seed_default_data_if_empty()
    yield
    # Shutdown
    print("👋 Shutting down FRAKTAL API...")

# Forzar uso de certificados actualizados para TLS
os.environ["SSL_CERT_FILE"] = certifi.where()

from app.main import router as app_router

# Crear instancia de FastAPI
app = FastAPI(
    title="FRAKTAL API",
    description="API para análisis astrológico sistémico",
    version="1.0.0",
    lifespan=lifespan
)

# Configurar CORS
# Nota: en producción (Render) suele existir `CORS_ORIGINS`. Antes ese valor reemplazaba
# el default y podía dejar fuera dominios necesarios (p.ej. `programafraktal.com`).
# Aquí hacemos una unión (base + env) y deduplicamos.
_base_cors_origins = [
    "https://decano-astrologico.vercel.app",
    "https://programafraktal.com",
    "https://www.programafraktal.com",
    "https://app.programafraktal.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
]

_cors_origins_env = (os.getenv("CORS_ORIGINS") or "").strip()
_env_origins = [o.strip() for o in _cors_origins_env.split(",") if o.strip()]

allowed_origins = []
for o in _base_cors_origins + _env_origins:
    if o and o not in allowed_origins:
        allowed_origins.append(o)
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
