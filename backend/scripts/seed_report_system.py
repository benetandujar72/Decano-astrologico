"""
Script de seeding para el sistema de informes personalizables

Crea tipos de informe, plantillas y prompts por defecto
"""
import asyncio
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI") or "mongodb://localhost:27017"
DB_NAME = os.getenv("MONGODB_DB_NAME", "astrology_db")

# ============================================================================
# Tipos de Informe por Defecto
# ============================================================================

DEFAULT_REPORT_TYPES = [
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
            {"id": "modulo_2_nodos", "name": "Nodos Lunares", "required": False, "estimated_duration_sec": 180},
            {"id": "modulo_2_aspectos", "name": "Aspectos Principales", "required": True, "estimated_duration_sec": 240},
            {"id": "modulo_2_ejes", "name": "Ejes y Configuraciones", "required": True, "estimated_duration_sec": 480},
            {"id": "modulo_2_sintesis", "name": "Síntesis Interpretativa", "required": True, "estimated_duration_sec": 240},
            {"id": "modulo_3_recomendaciones", "name": "Recomendaciones", "required": False, "estimated_duration_sec": 240}
        ]
    },
    {
        "code": "carta_natal_resumida",
        "name": "Carta Natal Resumida",
        "description": "Análisis breve de los elementos más importantes de la carta natal",
        "icon": "📝",
        "category": "individual",
        "folder_path": "/reports/individual/carta-natal-resumida",
        "min_plan_required": "free",
        "is_active": True,
        "is_beta": False,
        "available_modules": [
            {"id": "modulo_1", "name": "Introducción", "required": True, "estimated_duration_sec": 180},
            {"id": "modulo_2_personales", "name": "Planetas Personales", "required": True, "estimated_duration_sec": 200},
            {"id": "modulo_2_aspectos", "name": "Aspectos Principales", "required": True, "estimated_duration_sec": 180},
            {"id": "modulo_2_sintesis", "name": "Síntesis", "required": True, "estimated_duration_sec": 180}
        ]
    },
    {
        "code": "transitos",
        "name": "Informe de Tránsitos",
        "description": "Análisis de tránsitos planetarios y su influencia actual",
        "icon": "🌊",
        "category": "individual",
        "folder_path": "/reports/individual/transitos",
        "min_plan_required": "premium",
        "is_active": True,
        "is_beta": False,
        "available_modules": [
            {"id": "modulo_1", "name": "Contexto de Tránsitos", "required": True, "estimated_duration_sec": 240},
            {"id": "modulo_transitos_personales", "name": "Tránsitos Personales", "required": True, "estimated_duration_sec": 300},
            {"id": "modulo_transitos_sociales", "name": "Tránsitos Sociales", "required": True, "estimated_duration_sec": 300},
            {"id": "modulo_transitos_transpersonales", "name": "Tránsitos Transpersonales", "required": True, "estimated_duration_sec": 360},
            {"id": "modulo_sintesis_transitos", "name": "Síntesis de Tránsitos", "required": True, "estimated_duration_sec": 240}
        ]
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
            {"id": "modulo_casas_cruzadas", "name": "Casas en Sinastría", "required": True, "estimated_duration_sec": 300},
            {"id": "modulo_compuesto", "name": "Carta Compuesta", "required": False, "estimated_duration_sec": 300},
            {"id": "modulo_sintesis_sinastria", "name": "Síntesis de Compatibilidad", "required": True, "estimated_duration_sec": 240}
        ]
    },
    {
        "code": "revolucion_solar",
        "name": "Revolución Solar",
        "description": "Análisis de la carta de revolución solar anual",
        "icon": "☀️",
        "category": "individual",
        "folder_path": "/reports/individual/revolucion-solar",
        "min_plan_required": "premium",
        "is_active": True,
        "is_beta": False,
        "available_modules": [
            {"id": "modulo_intro_rs", "name": "Introducción Revolución Solar", "required": True, "estimated_duration_sec": 240},
            {"id": "modulo_asc_rs", "name": "Ascendente de RS", "required": True, "estimated_duration_sec": 200},
            {"id": "modulo_planetas_rs", "name": "Planetas en RS", "required": True, "estimated_duration_sec": 300},
            {"id": "modulo_casas_rs", "name": "Casas de RS", "required": True, "estimated_duration_sec": 240},
            {"id": "modulo_sintesis_rs", "name": "Síntesis Anual", "required": True, "estimated_duration_sec": 240}
        ]
    },
    {
        "code": "carta_infantil",
        "name": "Carta Natal Infantil",
        "description": "Análisis de carta natal adaptado para niños (lenguaje para padres)",
        "icon": "👶",
        "category": "infantil",
        "folder_path": "/reports/infantil/carta-natal",
        "min_plan_required": "premium",
        "is_active": True,
        "is_beta": False,
        "available_modules": [
            {"id": "modulo_intro_infantil", "name": "Introducción para Padres", "required": True, "estimated_duration_sec": 240},
            {"id": "modulo_temperamento", "name": "Temperamento y Personalidad", "required": True, "estimated_duration_sec": 300},
            {"id": "modulo_necesidades", "name": "Necesidades Emocionales", "required": True, "estimated_duration_sec": 240},
            {"id": "modulo_potencial", "name": "Potencial y Talentos", "required": True, "estimated_duration_sec": 240},
            {"id": "modulo_desafios", "name": "Desafíos a Considerar", "required": True, "estimated_duration_sec": 240},
            {"id": "modulo_recomendaciones_padres", "name": "Recomendaciones para Padres", "required": True, "estimated_duration_sec": 240}
        ]
    },
    {
        "code": "carta_vocacional",
        "name": "Orientación Vocacional",
        "description": "Análisis orientado a descubrir vocación y potencial profesional",
        "icon": "💼",
        "category": "individual",
        "folder_path": "/reports/individual/vocacional",
        "min_plan_required": "enterprise",
        "is_active": True,
        "is_beta": False,
        "available_modules": [
            {"id": "modulo_intro_vocacional", "name": "Introducción Vocacional", "required": True, "estimated_duration_sec": 240},
            {"id": "modulo_talentos", "name": "Talentos Naturales", "required": True, "estimated_duration_sec": 300},
            {"id": "modulo_mc_profesion", "name": "Medio Cielo y Profesión", "required": True, "estimated_duration_sec": 300},
            {"id": "modulo_planetas_vocacion", "name": "Planetas y Vocación", "required": True, "estimated_duration_sec": 300},
            {"id": "modulo_areas_recomendadas", "name": "Áreas Profesionales", "required": True, "estimated_duration_sec": 240}
        ]
    },
    {
        "code": "carta_psicologica",
        "name": "Análisis Psicológico Profundo",
        "description": "Análisis enfocado en patrones psicológicos y desarrollo personal",
        "icon": "🧠",
        "category": "clinico",
        "folder_path": "/reports/clinico/psicologico",
        "min_plan_required": "enterprise",
        "is_active": True,
        "is_beta": True,
        "available_modules": [
            {"id": "modulo_intro_psico", "name": "Marco Psicológico", "required": True, "estimated_duration_sec": 300},
            {"id": "modulo_ego", "name": "Estructura del Ego", "required": True, "estimated_duration_sec": 360},
            {"id": "modulo_sombra", "name": "Aspectos de Sombra", "required": True, "estimated_duration_sec": 360},
            {"id": "modulo_complejos", "name": "Complejos Principales", "required": True, "estimated_duration_sec": 360},
            {"id": "modulo_integracion", "name": "Camino de Integración", "required": True, "estimated_duration_sec": 300}
        ]
    }
]

# ============================================================================
# Prompts por Defecto (se crearán automáticamente con cada tipo)
# ============================================================================

def get_default_prompt_for_type(report_type: dict) -> dict:
    """Generar prompt por defecto para un tipo de informe"""
    return {
        "system_instruction": f"""Eres un astrólogo profesional certificado especializado en {report_type['name']}.

INSTRUCCIONES GENERALES:
- Utiliza un lenguaje claro, profesional y empático
- Basa tu análisis en la tradición astrológica clásica y moderna
- Interpreta los símbolos astrológicos de manera constructiva
- Enfócate en el potencial de crecimiento y desarrollo personal
- Evita predicciones categóricas o deterministas

IMPORTANTE - RESTRICCIONES:
- Nunca proporciones información médica, legal o financiera específica
- No hagas diagnósticos de salud mental
- No predecir eventos específicos como predicciones categóricas
- Enfócate en el potencial y el crecimiento personal""",

        "user_prompt_template": """Genera un informe astrológico de tipo '{report_type}' para {nombre}.

DATOS DE LA CARTA NATAL:
{carta_data}

MÓDULOS A INCLUIR:
{modulos}

Por favor, genera un análisis profesional, coherente y bien estructurado.""",

        "variables": [
            {"name": "nombre", "type": "string", "required": True, "description": "Nombre de la persona"},
            {"name": "carta_data", "type": "object", "required": True, "description": "Datos completos de la carta natal"},
            {"name": "report_type", "type": "string", "required": False, "description": "Tipo de informe"},
            {"name": "modulos", "type": "string", "required": False, "description": "Lista de módulos a generar"}
        ],
        "llm_provider": "gemini",
        "model": "gemini-3-pro-preview",
        "temperature": 0.7,
        "max_tokens": 8000,
        "safety_settings": {
            "harm_category_harassment": "BLOCK_MEDIUM_AND_ABOVE",
            "harm_category_hate_speech": "BLOCK_MEDIUM_AND_ABOVE",
            "harm_category_sexually_explicit": "BLOCK_MEDIUM_AND_ABOVE",
            "harm_category_dangerous_content": "BLOCK_MEDIUM_AND_ABOVE"
        }
    }

# ============================================================================
# Plantillas Públicas por Defecto
# ============================================================================

DEFAULT_TEMPLATES = [
    {
        "name": "Plantilla Estándar",
        "report_type_code": "carta_natal_completa",
        "is_public": True,
        "is_default": True,
        "branding": {
            "logo_url": None,
            "logo_size": "medium",
            "title": "Informe Astrológico Personal",
            "title_auto_generate": True,
            "typography": {
                "font_family": "Arial",
                "font_size": 12,
                "heading_color": "#1e293b",
                "body_color": "#334155"
            },
            "color_scheme": {
                "primary_color": "#6366f1",
                "secondary_color": "#f59e0b",
                "accent_color": "#8b5cf6"
            }
        },
        "content": {
            "modules_to_print": [
                "modulo_1",
                "modulo_2_fundamentos",
                "modulo_2_personales",
                "modulo_2_sociales",
                "modulo_2_transpersonales",
                "modulo_2_aspectos",
                "modulo_2_ejes",
                "modulo_2_sintesis"
            ],
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
            "encryption_enabled": False
        }
    },
    {
        "name": "Plantilla Breve",
        "report_type_code": "carta_natal_resumida",
        "is_public": True,
        "is_default": True,
        "branding": {
            "logo_url": None,
            "logo_size": "small",
            "title": "Informe Astrológico Resumido",
            "title_auto_generate": True,
            "typography": {
                "font_family": "Arial",
                "font_size": 11,
                "heading_color": "#1e293b",
                "body_color": "#334155"
            },
            "color_scheme": {
                "primary_color": "#6366f1",
                "secondary_color": "#f59e0b",
                "accent_color": "#8b5cf6"
            }
        },
        "content": {
            "modules_to_print": [
                "modulo_1",
                "modulo_2_personales",
                "modulo_2_aspectos",
                "modulo_2_sintesis"
            ],
            "report_mode": "resumen",
            "include_chart_images": True,
            "include_aspects_table": False,
            "include_planetary_table": True,
            "language": "es",
            "page_size": "A4",
            "page_orientation": "portrait"
        },
        "advanced": {
            "custom_css": None,
            "watermark_text": None,
            "encryption_enabled": False
        }
    },
    {
        "name": "Plantilla Premium - Detallada",
        "report_type_code": "carta_natal_completa",
        "is_public": True,
        "is_default": False,
        "branding": {
            "logo_url": None,
            "logo_size": "large",
            "title": "Análisis Astrológico Exhaustivo",
            "title_auto_generate": True,
            "typography": {
                "font_family": "Georgia",
                "font_size": 13,
                "heading_color": "#0f172a",
                "body_color": "#1e293b"
            },
            "color_scheme": {
                "primary_color": "#4f46e5",
                "secondary_color": "#f97316",
                "accent_color": "#7c3aed"
            }
        },
        "content": {
            "modules_to_print": [
                "modulo_1",
                "modulo_2_fundamentos",
                "modulo_2_personales",
                "modulo_2_sociales",
                "modulo_2_transpersonales",
                "modulo_2_nodos",
                "modulo_2_aspectos",
                "modulo_2_ejes",
                "modulo_2_sintesis",
                "modulo_3_recomendaciones"
            ],
            "report_mode": "exhaustivo",
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
            "encryption_enabled": False
        }
    }
]

# ============================================================================
# Funciones de Seeding
# ============================================================================

async def seed_report_types(db):
    """Crear tipos de informe por defecto"""
    print("\n📄 Seeding Report Types...")

    report_types_collection = db["report_types"]
    prompts_collection = db["prompts"]

    created_count = 0
    updated_count = 0

    for rt_data in DEFAULT_REPORT_TYPES:
        # Check if exists
        existing = await report_types_collection.find_one({"code": rt_data["code"]})

        if existing:
            print(f"  ↻ Tipo '{rt_data['name']}' ya existe, actualizando...")

            # Update report type
            await report_types_collection.update_one(
                {"code": rt_data["code"]},
                {"$set": {
                    **rt_data,
                    "updated_at": datetime.utcnow()
                }}
            )
            updated_count += 1
        else:
            print(f"  ✓ Creando tipo '{rt_data['name']}'...")

            # Create default prompt first
            prompt_data = get_default_prompt_for_type(rt_data)
            prompt_data.update({
                "report_type_id": None,  # Will be updated after
                "version": 1,
                "is_default": True,
                "is_active": True,
                "customized_by": None,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })

            prompt_result = await prompts_collection.insert_one(prompt_data)
            prompt_id = prompt_result.inserted_id

            # Create report type
            rt_data.update({
                "default_prompt_id": prompt_id,
                "created_by": None,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "version": 1
            })

            result = await report_types_collection.insert_one(rt_data)

            # Update prompt with report_type_id
            await prompts_collection.update_one(
                {"_id": prompt_id},
                {"$set": {"report_type_id": result.inserted_id}}
            )

            created_count += 1

    print(f"\n  ✅ Report Types: {created_count} creados, {updated_count} actualizados")
    return created_count, updated_count


async def seed_templates(db):
    """Crear plantillas públicas por defecto"""
    print("\n🎨 Seeding Templates...")

    templates_collection = db["templates"]
    report_types_collection = db["report_types"]

    # Get a system user or use None
    # In production, you might want to create a "system" user
    system_user_id = None

    created_count = 0
    skipped_count = 0

    for template_data in DEFAULT_TEMPLATES:
        # Get report type ID
        report_type_code = template_data.pop("report_type_code")
        report_type = await report_types_collection.find_one({"code": report_type_code})

        if not report_type:
            print(f"  ⚠ Report type '{report_type_code}' not found, skipping template '{template_data['name']}'")
            skipped_count += 1
            continue

        # Check if default template already exists for this report type
        existing = await templates_collection.find_one({
            "report_type_id": report_type["_id"],
            "name": template_data["name"],
            "is_default": template_data["is_default"]
        })

        if existing:
            print(f"  ↻ Plantilla '{template_data['name']}' ya existe")
            skipped_count += 1
            continue

        print(f"  ✓ Creando plantilla '{template_data['name']}'...")

        template_data.update({
            "report_type_id": report_type["_id"],
            "owner_id": system_user_id,
            "usage_count": 0,
            "last_used_at": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "is_deleted": False,
            "preview_image_url": None
        })

        await templates_collection.insert_one(template_data)
        created_count += 1

    print(f"\n  ✅ Templates: {created_count} creadas, {skipped_count} omitidas")
    return created_count, skipped_count


async def seed_all():
    """Ejecutar todo el seeding"""
    print("=" * 60)
    print("🌱 SEEDING REPORT SYSTEM")
    print("=" * 60)

    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=5000)
    db = client[DB_NAME]

    try:
        # Test connection
        await client.admin.command("ping")
        print(f"✓ Conectado a MongoDB: {DB_NAME}")
    except Exception as e:
        print(f"✗ Error conectando a MongoDB: {e}")
        return

    try:
        # Seed report types (and prompts)
        rt_created, rt_updated = await seed_report_types(db)

        # Seed templates
        tpl_created, tpl_skipped = await seed_templates(db)

        # Summary
        print("\n" + "=" * 60)
        print("✅ SEEDING COMPLETADO")
        print("=" * 60)
        print(f"\nReport Types:")
        print(f"  - Creados: {rt_created}")
        print(f"  - Actualizados: {rt_updated}")
        print(f"\nPrompts:")
        print(f"  - Creados: {rt_created} (uno por tipo)")
        print(f"\nTemplates:")
        print(f"  - Creadas: {tpl_created}")
        print(f"  - Omitidas: {tpl_skipped}")

    except Exception as e:
        print(f"\n✗ Error durante el seeding: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()
        print("\n✓ Conexión cerrada")


if __name__ == "__main__":
    asyncio.run(seed_all())
