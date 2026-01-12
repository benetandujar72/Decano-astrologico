"""
Script para añadir el tipo de informe 'gancho_free' a MongoDB
Este informe es el que verán los usuarios Free como muestra
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from bson import ObjectId

# Configurar conexión
MONGODB_URL = 'mongodb+srv://bandujar_db_user:gb9rxE0XYPaRFo9G@fraktal.um7xvgq.mongodb.net/fraktal?retryWrites=true&w=majority&ssl=true'
MONGODB_DB_NAME = 'fraktal'

async def add_free_hook_report_type():
    """Añadir tipo de informe gancho para usuarios Free"""
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[MONGODB_DB_NAME]
    report_types_collection = db["report_types"]

    print("=" * 60)
    print("  AÑADIENDO TIPO DE INFORME GANCHO FREE")
    print("=" * 60)

    # Verificar si ya existe
    existing = await report_types_collection.find_one({"type_id": "gancho_free"})

    if existing:
        print("\n⚠️  El tipo 'gancho_free' ya existe.")
        print(f"   ID: {existing['_id']}")
        print(f"   Nombre: {existing['name']}")
        response = input("\n¿Deseas actualizarlo? (s/n): ")
        if response.strip().lower() != 's':
            print("Operación cancelada")
            client.close()
            return

        # Actualizar
        await report_types_collection.update_one(
            {"type_id": "gancho_free"},
            {"$set": {
                "name": "Informe Gancho Gratuito",
                "description": "Informe resumido gratuito para usuarios Free - Muestra de las capacidades del sistema",
                "available_for_tiers": ["free"],
                "modules": [
                    "modulo_1_sol",
                    "modulo_3_luna",
                    "modulo_9_ascendente"
                ],
                "estimated_tokens": 8000,
                "avg_generation_time_seconds": 180,
                "is_active": True,
                "display_config": {
                    "show_chart_image": True,
                    "show_aspects_summary": True,
                    "show_houses_summary": True,
                    "show_cta_upgrade": True,
                    "cta_text": "DESCARGAR INFORME COMPLETO",
                    "cta_url": "/upgrade"
                },
                "content_limits": {
                    "min_chars_per_module": 2000,
                    "max_chars_per_module": 3000,
                    "include_reflection_question": True
                },
                "updated_at": datetime.utcnow()
            }}
        )
        print("\n✓ Tipo de informe 'gancho_free' actualizado")

    else:
        # Crear nuevo
        new_report_type = {
            "_id": ObjectId(),
            "type_id": "gancho_free",
            "name": "Informe Gancho Gratuito",
            "description": "Informe resumido gratuito para usuarios Free - Muestra de las capacidades del sistema",
            "available_for_tiers": ["free"],
            "modules": [
                "modulo_1_sol",       # Identidad Solar
                "modulo_3_luna",       # Naturaleza Emocional
                "modulo_9_ascendente"  # Primera Impresión y Máscara Social
            ],
            "estimated_tokens": 8000,
            "avg_generation_time_seconds": 180,
            "is_active": True,
            "display_config": {
                "show_chart_image": True,
                "show_aspects_summary": True,
                "show_houses_summary": True,
                "show_cta_upgrade": True,
                "cta_text": "DESCARGAR INFORME COMPLETO",
                "cta_url": "/upgrade"
            },
            "content_limits": {
                "min_chars_per_module": 2000,
                "max_chars_per_module": 3000,
                "include_reflection_question": True
            },
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        result = await report_types_collection.insert_one(new_report_type)
        print(f"\n✓ Tipo de informe 'gancho_free' creado (ID: {result.inserted_id})")

    # Verificar
    hook_report = await report_types_collection.find_one({"type_id": "gancho_free"})

    print("\n📊 DETALLES DEL INFORME GANCHO:")
    print(f"   Nombre: {hook_report['name']}")
    print(f"   Módulos incluidos:")
    for module in hook_report['modules']:
        print(f"      • {module}")
    print(f"   Disponible para: {', '.join(hook_report['available_for_tiers'])}")
    print(f"   Activo: {'✓ Sí' if hook_report['is_active'] else '✗ No'}")
    print(f"   Muestra CTA upgrade: {'✓ Sí' if hook_report['display_config']['show_cta_upgrade'] else '✗ No'}")

    print("\n✅ Configuración completada!")
    print("\nPróximos pasos:")
    print("1. Reinicia el backend")
    print("2. El endpoint /reports/queue-full-report aceptará type='gancho_free'")
    print("3. Los usuarios Free podrán generar este informe")

    client.close()

if __name__ == "__main__":
    asyncio.run(add_free_hook_report_type())
