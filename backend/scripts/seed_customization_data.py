#!/usr/bin/env python3
"""
Script para poblar MongoDB con datos iniciales de personalización
Ejecutar: python backend/scripts/seed_customization_data.py
"""

import sys
import os
from pathlib import Path

# Añadir el directorio backend al path para importar módulos
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import asyncio
from bson import ObjectId

# Importar configuración
from app.core.config import settings

async def seed_templates():
    """Crear plantillas iniciales"""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    templates_collection = db["templates"]

    print("\n📋 Creando plantillas iniciales...")

    # Verificar si ya existen plantillas
    existing_count = await templates_collection.count_documents({})
    if existing_count > 0:
        print(f"   ℹ️  Ya existen {existing_count} plantillas. ¿Deseas eliminarlas? (s/n): ", end="")
        response = input().strip().lower()
        if response == 's':
            await templates_collection.delete_many({})
            print("   ✓ Plantillas anteriores eliminadas")
        else:
            print("   → Manteniendo plantillas existentes")
            client.close()
            return

    templates = [
        {
            "_id": ObjectId(),
            "name": "Plantilla por Defecto",
            "description": "Plantilla base del sistema con configuración estándar",
            "is_public": True,
            "is_default": True,
            "created_by": "system",
            "branding": {
                "primary_color": "#3B82F6",
                "secondary_color": "#8B5CF6",
                "accent_color": "#10B981",
                "logo_url": None,
                "company_name": "Decano Astrológico",
                "show_branding": True
            },
            "typography": {
                "heading_font": "Playfair Display",
                "body_font": "Inter",
                "font_size_base": 16,
                "line_height": 1.6
            },
            "layout": {
                "page_size": "A4",
                "margins": {"top": 2.5, "right": 2.5, "bottom": 2.5, "left": 2.5},
                "header_height": 1.5,
                "footer_height": 1.0
            },
            "modules_config": {
                "enabled_modules": ["all"],
                "module_order": []
            },
            "advanced": {
                "custom_css": "",
                "custom_header_html": "",
                "custom_footer_html": "",
                "pdf_metadata": {
                    "author": "Decano Astrológico",
                    "subject": "Informe Astrológico Personalizado",
                    "keywords": "astrología, carta natal, informe"
                }
            },
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "_id": ObjectId(),
            "name": "Estilo Profesional",
            "description": "Diseño elegante y profesional para consultores",
            "is_public": True,
            "is_default": False,
            "created_by": "system",
            "branding": {
                "primary_color": "#1E293B",
                "secondary_color": "#64748B",
                "accent_color": "#F59E0B",
                "logo_url": None,
                "company_name": "Consultoría Astrológica",
                "show_branding": True
            },
            "typography": {
                "heading_font": "Merriweather",
                "body_font": "Lato",
                "font_size_base": 14,
                "line_height": 1.8
            },
            "layout": {
                "page_size": "A4",
                "margins": {"top": 3.0, "right": 2.0, "bottom": 3.0, "left": 2.0},
                "header_height": 2.0,
                "footer_height": 1.5
            },
            "modules_config": {
                "enabled_modules": ["all"],
                "module_order": []
            },
            "advanced": {
                "custom_css": "/* Estilo profesional con énfasis en tipografía */\nh2 { border-bottom: 2px solid var(--accent-color); padding-bottom: 0.5rem; }",
                "custom_header_html": "",
                "custom_footer_html": "",
                "pdf_metadata": {
                    "author": "Consultoría Astrológica",
                    "subject": "Análisis Astrológico Completo",
                    "keywords": "astrología profesional, análisis completo"
                }
            },
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "_id": ObjectId(),
            "name": "Estilo Místico",
            "description": "Diseño con colores místicos y tipografía evocadora",
            "is_public": True,
            "is_default": False,
            "created_by": "system",
            "branding": {
                "primary_color": "#7C3AED",
                "secondary_color": "#A78BFA",
                "accent_color": "#FBBF24",
                "logo_url": None,
                "company_name": "Sabiduría Ancestral",
                "show_branding": True
            },
            "typography": {
                "heading_font": "Cinzel",
                "body_font": "Lora",
                "font_size_base": 15,
                "line_height": 1.7
            },
            "layout": {
                "page_size": "A4",
                "margins": {"top": 2.5, "right": 2.5, "bottom": 2.5, "left": 2.5},
                "header_height": 1.5,
                "footer_height": 1.0
            },
            "modules_config": {
                "enabled_modules": ["all"],
                "module_order": []
            },
            "advanced": {
                "custom_css": "/* Estilo místico con decoraciones */\n.module-header { background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%); }",
                "custom_header_html": "",
                "custom_footer_html": "",
                "pdf_metadata": {
                    "author": "Sabiduría Ancestral",
                    "subject": "Carta Natal y Guía Astrológica",
                    "keywords": "astrología, místico, esotérico"
                }
            },
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]

    result = await templates_collection.insert_many(templates)
    print(f"   ✓ {len(result.inserted_ids)} plantillas creadas exitosamente")

    for template in templates:
        print(f"      • {template['name']} (ID: {template['_id']})")

    client.close()


async def seed_specialized_prompts():
    """Crear prompts especializados iniciales"""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    prompts_collection = db["specialized_prompts"]

    print("\n💬 Creando prompts especializados...")

    # Verificar si ya existen prompts
    existing_count = await prompts_collection.count_documents({})
    if existing_count > 0:
        print(f"   ℹ️  Ya existen {existing_count} prompts. ¿Deseas eliminarlos? (s/n): ", end="")
        response = input().strip().lower()
        if response == 's':
            await prompts_collection.delete_many({})
            print("   ✓ Prompts anteriores eliminados")
        else:
            print("   → Manteniendo prompts existentes")
            client.close()
            return

    prompts = [
        {
            "_id": ObjectId(),
            "name": "Prompt Sol en Signos - Detallado",
            "description": "Análisis profundo del Sol en cada signo zodiacal con énfasis en propósito de vida",
            "prompt_type": "modulo_1_sol",
            "is_active": False,
            "created_by": "system",
            "content": """Analiza el Sol en {signo} en la Casa {casa} con un enfoque en el propósito de vida y la expresión de la identidad.

ESTRUCTURA REQUERIDA:

**Identidad Solar**
Describe cómo esta posición tiende a manifestar la identidad central de la persona, usando lenguaje de posibilidad (puede, tiende a, frecuentemente).

**Propósito y Motivación**
Explica las motivaciones fundamentales y el sentido de propósito que suele emerger de esta configuración.

**Expresión Creativa**
Detalla cómo puede expresarse la creatividad y vitalidad personal.

**Desafíos de Desarrollo**
Identifica los desafíos que frecuentemente aparecen en el camino de integración de esta energía solar.

**Pregunta para reflexionar:**
[Una pregunta profunda que invite a la reflexión sobre su identidad y propósito]

REGLAS:
- NO uses lenguaje determinista ("es", "será", "siempre", "nunca")
- USA lenguaje de posibilidad ("tiende a", "puede", "frecuentemente", "a menudo")
- Mantén tono profesional y empático
- Extensión mínima: 3500 caracteres
- Incluye siempre la pregunta para reflexionar al final""",
            "variables": ["signo", "casa"],
            "example_usage": {
                "signo": "Leo",
                "casa": "5"
            },
            "tags": ["sol", "identidad", "propósito"],
            "usage_count": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "_id": ObjectId(),
            "name": "Prompt Luna en Signos - Emocional",
            "description": "Análisis emocional de la Luna con énfasis en necesidades y seguridad",
            "prompt_type": "modulo_3_luna",
            "is_active": False,
            "created_by": "system",
            "content": """Analiza la Luna en {signo} en la Casa {casa} enfocándote en el mundo emocional y las necesidades de seguridad.

ESTRUCTURA REQUERIDA:

**Naturaleza Emocional**
Describe el estilo emocional y la forma en que tiende a procesar los sentimientos.

**Necesidades de Seguridad**
Explica qué necesita esta persona para sentirse emocionalmente segura y nutrida.

**Patrones Reactivos**
Detalla cómo puede reaccionar ante situaciones de estrés o vulnerabilidad emocional.

**Cuidado Personal**
Sugiere formas en que puede cuidarse mejor emocionalmente según esta configuración.

**Pregunta para reflexionar:**
[Una pregunta que invite a conectar con sus necesidades emocionales]

REGLAS:
- NO uses lenguaje determinista
- USA lenguaje de posibilidad y tendencia
- Mantén tono empático y validante
- Extensión mínima: 3500 caracteres
- Incluye siempre la pregunta para reflexionar al final""",
            "variables": ["signo", "casa"],
            "example_usage": {
                "signo": "Cáncer",
                "casa": "4"
            },
            "tags": ["luna", "emociones", "necesidades"],
            "usage_count": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "_id": ObjectId(),
            "name": "Prompt Aspectos - Dinámicas Internas",
            "description": "Análisis de aspectos como diálogos internos entre diferentes partes del ser",
            "prompt_type": "modulo_5_aspectos",
            "is_active": False,
            "created_by": "system",
            "content": """Analiza el aspecto {aspecto} entre {planeta1} en {signo1} y {planeta2} en {signo2} como un diálogo interno entre diferentes partes de la psique.

ESTRUCTURA REQUERIDA:

**Naturaleza del Diálogo**
Describe la dinámica fundamental de este aspecto usando la metáfora del diálogo interno.

**Polo A: {planeta1} en {signo1}**
Explica qué representa este planeta y cómo se expresa en este signo (primera voz del diálogo).

**Polo B: {planeta2} en {signo2}**
Explica qué representa este planeta y cómo se expresa en este signo (segunda voz del diálogo).

**Integración Posible**
Sugiere cómo estos dos polos pueden trabajar juntos de forma constructiva.

**Desafío de Balance**
Identifica la tensión creativa o el desafío de equilibrio que presenta este aspecto.

**Pregunta para reflexionar:**
[Una pregunta que invite a explorar cómo estas dos energías interactúan en su vida]

REGLAS:
- DEBE incluir análisis de "Polo A" y "Polo B"
- NO uses lenguaje determinista
- USA lenguaje de posibilidad
- Mantén tono constructivo, incluso con aspectos tensos
- Extensión mínima: 4000 caracteres
- Incluye siempre la pregunta para reflexionar al final""",
            "variables": ["aspecto", "planeta1", "signo1", "planeta2", "signo2"],
            "example_usage": {
                "aspecto": "Cuadratura",
                "planeta1": "Sol",
                "signo1": "Aries",
                "planeta2": "Luna",
                "signo2": "Cáncer"
            },
            "tags": ["aspectos", "dinámicas", "integración"],
            "usage_count": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "_id": ObjectId(),
            "name": "Prompt Casas - Áreas de Experiencia",
            "description": "Análisis de las casas astrológicas como áreas de experiencia vital",
            "prompt_type": "modulo_4_casas",
            "is_active": False,
            "created_by": "system",
            "content": """Analiza la Casa {numero_casa} con planetas {planetas} en {signo} como un área clave de experiencia vital.

ESTRUCTURA REQUERIDA:

**Significado de la Casa**
Describe qué área de la vida representa esta casa y qué experiencias tiende a contener.

**Influencia del Signo en la Cúspide**
Explica cómo el signo {signo} tiñe las experiencias de esta casa.

**Planetas Residentes**
Detalla cómo los planetas {planetas} activan y dinamizan esta área de vida.

**Temas de Desarrollo**
Identifica los temas principales de crecimiento asociados a esta casa.

**Oportunidades**
Sugiere cómo puede aprovechar conscientemente las energías de esta casa.

**Pregunta para reflexionar:**
[Una pregunta que conecte con las experiencias concretas de esta área de vida]

REGLAS:
- NO uses lenguaje determinista
- USA lenguaje descriptivo de tendencias
- Relaciona con experiencias concretas
- Extensión mínima: 3500 caracteres
- Incluye siempre la pregunta para reflexionar al final""",
            "variables": ["numero_casa", "planetas", "signo"],
            "example_usage": {
                "numero_casa": "7",
                "planetas": "Venus",
                "signo": "Libra"
            },
            "tags": ["casas", "experiencia", "desarrollo"],
            "usage_count": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]

    result = await prompts_collection.insert_many(prompts)
    print(f"   ✓ {len(result.inserted_ids)} prompts creados exitosamente")

    for prompt in prompts:
        print(f"      • {prompt['name']} (Tipo: {prompt['prompt_type']})")

    client.close()


async def seed_report_types():
    """Crear tipos de informes iniciales"""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    report_types_collection = db["report_types"]

    print("\n📊 Creando tipos de informes...")

    # Verificar si ya existen report types
    existing_count = await report_types_collection.count_documents({})
    if existing_count > 0:
        print(f"   ℹ️  Ya existen {existing_count} tipos de informe. ¿Deseas eliminarlos? (s/n): ", end="")
        response = input().strip().lower()
        if response == 's':
            await report_types_collection.delete_many({})
            print("   ✓ Tipos de informe anteriores eliminados")
        else:
            print("   → Manteniendo tipos de informe existentes")
            client.close()
            return

    report_types = [
        {
            "_id": ObjectId(),
            "type_id": "carta_natal_resumida",
            "name": "Carta Natal Resumida",
            "description": "Informe básico con posiciones planetarias principales y aspectos",
            "available_for_tiers": ["free", "premium", "enterprise"],
            "modules": [
                "modulo_1_sol",
                "modulo_3_luna",
                "modulo_4_casas"
            ],
            "estimated_tokens": 5000,
            "avg_generation_time_seconds": 120,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "_id": ObjectId(),
            "type_id": "carta_natal_completa",
            "name": "Carta Natal Completa",
            "description": "Análisis exhaustivo de todos los elementos de la carta natal",
            "available_for_tiers": ["premium", "enterprise"],
            "modules": [
                "modulo_1_sol",
                "modulo_2_ejes",
                "modulo_3_luna",
                "modulo_4_casas",
                "modulo_5_aspectos",
                "modulo_6_planetas_personales",
                "modulo_7_planetas_sociales",
                "modulo_8_planetas_transpersonales"
            ],
            "estimated_tokens": 25000,
            "avg_generation_time_seconds": 600,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "_id": ObjectId(),
            "type_id": "sinastria",
            "name": "Sinastría de Relación",
            "description": "Análisis de compatibilidad entre dos cartas natales",
            "available_for_tiers": ["premium", "enterprise"],
            "modules": [
                "sinastria_sol_luna",
                "sinastria_venus_marte",
                "sinastria_aspectos_intercartas",
                "sinastria_casas_cruzadas"
            ],
            "estimated_tokens": 18000,
            "avg_generation_time_seconds": 450,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "_id": ObjectId(),
            "type_id": "revolucion_solar",
            "name": "Revolución Solar",
            "description": "Análisis predictivo para el año astrológico personal",
            "available_for_tiers": ["premium", "enterprise"],
            "modules": [
                "revolucion_solar_ascendente",
                "revolucion_solar_casas",
                "revolucion_solar_aspectos",
                "revolucion_solar_temas_anuales"
            ],
            "estimated_tokens": 15000,
            "avg_generation_time_seconds": 400,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "_id": ObjectId(),
            "type_id": "transitos",
            "name": "Tránsitos Actuales",
            "description": "Análisis de tránsitos planetarios sobre la carta natal",
            "available_for_tiers": ["enterprise"],
            "modules": [
                "transitos_planetas_lentos",
                "transitos_saturno_jupiter",
                "transitos_exterior_interior",
                "transitos_pronostico_trimestral"
            ],
            "estimated_tokens": 12000,
            "avg_generation_time_seconds": 350,
            "is_active": False,  # No implementado aún
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]

    result = await report_types_collection.insert_many(report_types)
    print(f"   ✓ {len(result.inserted_ids)} tipos de informe creados exitosamente")

    for report_type in report_types:
        status = "✓ Activo" if report_type['is_active'] else "⚠️ Inactivo"
        tiers = ", ".join(report_type['available_for_tiers'])
        print(f"      • {report_type['name']} [{status}] (Planes: {tiers})")

    client.close()


async def verify_data():
    """Verificar que los datos se crearon correctamente"""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]

    print("\n🔍 Verificando datos creados...")

    templates_count = await db["templates"].count_documents({})
    prompts_count = await db["specialized_prompts"].count_documents({})
    report_types_count = await db["report_types"].count_documents({})

    print(f"\n   ✓ Plantillas: {templates_count}")
    print(f"   ✓ Prompts especializados: {prompts_count}")
    print(f"   ✓ Tipos de informe: {report_types_count}")

    if templates_count > 0 and prompts_count > 0 and report_types_count > 0:
        print("\n✅ Base de datos poblada exitosamente!")
        print("\nPróximos pasos:")
        print("1. Reinicia el backend: Ctrl+C y vuelve a ejecutar 'python -m uvicorn app.main:app'")
        print("2. Recarga el frontend (F5)")
        print("3. Abre el panel de Diseño (botón 'Diseño' en la barra superior)")
        print("4. Deberías ver las plantillas y prompts disponibles")
    else:
        print("\n⚠️ Algunos datos no se crearon correctamente. Revisa los errores anteriores.")

    client.close()


async def main():
    """Función principal"""
    print("=" * 70)
    print("  SEED SCRIPT - SISTEMA DE PERSONALIZACIÓN DECANO ASTROLÓGICO")
    print("=" * 70)
    print("\nEste script poblará MongoDB con datos iniciales:")
    print("  • 3 plantillas (Defecto, Profesional, Místico)")
    print("  • 4 prompts especializados (Sol, Luna, Aspectos, Casas)")
    print("  • 5 tipos de informe (Resumida, Completa, Sinastría, etc.)")
    print("\n" + "=" * 70)

    try:
        # Verificar conexión a MongoDB
        print("\n🔌 Verificando conexión a MongoDB...")
        client = AsyncIOMotorClient(settings.MONGODB_URL)
        await client.admin.command('ping')
        print(f"   ✓ Conectado exitosamente a: {settings.MONGODB_DB_NAME}")
        client.close()

        # Ejecutar seeds
        await seed_templates()
        await seed_specialized_prompts()
        await seed_report_types()

        # Verificar
        await verify_data()

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        print("\nPosibles causas:")
        print("1. MongoDB no está ejecutándose")
        print("2. Variables de entorno incorrectas (MONGODB_URL, MONGODB_DB_NAME)")
        print("3. Problemas de permisos en la base de datos")
        print("\nVerifica tu archivo .env:")
        print(f"   MONGODB_URL={os.getenv('MONGODB_URL', 'NOT SET')}")
        print(f"   MONGODB_DB_NAME={os.getenv('MONGODB_DB_NAME', 'NOT SET')}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
