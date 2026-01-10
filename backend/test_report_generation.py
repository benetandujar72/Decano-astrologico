#!/usr/bin/env python3
"""
Script de prueba para verificar la generación de informes
"""
import asyncio
import os
import sys
from datetime import datetime

# Agregar el directorio raíz al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient


async def test_mongodb_connection():
    """Prueba la conexión a MongoDB"""
    print("🔍 Probando conexión a MongoDB...")

    MONGODB_URL = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI") or "mongodb://localhost:27017"

    try:
        client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=5000)
        # Intentar obtener info del servidor
        server_info = await client.server_info()
        print(f"✅ MongoDB conectado: versión {server_info.get('version')}")

        # Listar bases de datos
        db_names = await client.list_database_names()
        print(f"📊 Bases de datos disponibles: {', '.join(db_names)}")

        # Verificar base de datos 'fraktal'
        if 'fraktal' in db_names:
            db = client.fraktal
            collections = await db.list_collection_names()
            print(f"📁 Colecciones en 'fraktal': {', '.join(collections)}")

            # Verificar colección de sesiones
            if 'report_generation_sessions' in collections:
                count = await db.report_generation_sessions.count_documents({})
                print(f"📝 Sesiones de informes almacenadas: {count}")

                # Mostrar últimas 3 sesiones
                if count > 0:
                    print("\n📋 Últimas 3 sesiones:")
                    cursor = db.report_generation_sessions.find().sort([('created_at', -1)]).limit(3)
                    async for session in cursor:
                        print(f"  - {session.get('_id')}: {session.get('user_name')} ({session.get('status')})")
            else:
                print("⚠️ Colección 'report_generation_sessions' no existe")
        else:
            print("⚠️ Base de datos 'fraktal' no existe")

        client.close()
        return True

    except Exception as e:
        print(f"❌ Error conectando a MongoDB: {e}")
        return False


async def test_gemini_api():
    """Prueba la conexión con Gemini API"""
    print("\n🔍 Probando conexión con Gemini API...")

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        print("❌ GEMINI_API_KEY no configurada en .env")
        return False

    print(f"✅ GEMINI_API_KEY configurada (primeros 10 caracteres: {api_key[:10]}...)")

    try:
        from app.services.ai_expert_service import get_ai_expert_service

        service = get_ai_expert_service()
        print("📝 Probando generación de contenido...")

        result = await service.generate_content(
            user_prompt="¿Qué es la astrología?",
            sys_prompt="Responde en máximo 50 palabras."
        )

        if result and len(result) > 0:
            print(f"✅ Gemini API funciona correctamente")
            print(f"📄 Respuesta de ejemplo: {result[:100]}...")
            return True
        else:
            print("❌ Gemini API retornó respuesta vacía")
            return False

    except Exception as e:
        print(f"❌ Error probando Gemini API: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_report_service():
    """Prueba el servicio de generación de informes"""
    print("\n🔍 Probando servicio de generación de informes...")

    try:
        from app.services.full_report_service import full_report_service

        # Datos de prueba simplificados
        test_chart_data = {
            "datos_entrada": {
                "fecha": "1990-01-15",
                "hora": "14:30",
                "latitud": 40.4168,
                "longitud": -3.7038,
                "zona_horaria": "Europe/Madrid"
            },
            "planetas": {
                "Sol": {"signo": "Capricornio", "grado": 25, "casa": 10},
                "Luna": {"signo": "Tauro", "grado": 15, "casa": 2},
                "Ascendente": {"signo": "Aries", "grado": 5}
            },
            "casas": [
                {"numero": 1, "signo": "Aries", "cuspide": 5},
                {"numero": 2, "signo": "Tauro", "cuspide": 25}
            ]
        }

        print("📝 Obteniendo definición de secciones...")
        sections = full_report_service._get_sections_definition(report_mode="full")
        print(f"✅ {len(sections)} módulos definidos")

        for idx, section in enumerate(sections, 1):
            print(f"  {idx}. {section['id']}: {section['title']}")

        # Probar construcción de facts
        print("\n📝 Probando construcción de facts...")
        facts = full_report_service.build_chart_facts(test_chart_data)

        if facts and len(facts) > 0:
            print(f"✅ Facts construidos correctamente ({len(facts)} caracteres)")
            print(f"📄 Facts de ejemplo: {facts[:200]}...")
        else:
            print("⚠️ Facts vacíos o incorrectos")

        return True

    except Exception as e:
        print(f"❌ Error probando servicio de informes: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_endpoints():
    """Prueba los endpoints de la API"""
    print("\n🔍 Verificando configuración de endpoints...")

    try:
        from app.api.endpoints import reports

        # Verificar que el router existe
        if hasattr(reports, 'router'):
            print("✅ Router de reports configurado")

            # Contar rutas
            routes = reports.router.routes
            print(f"📍 {len(routes)} endpoints definidos:")

            for route in routes:
                if hasattr(route, 'methods') and hasattr(route, 'path'):
                    methods = ', '.join(route.methods)
                    print(f"  {methods} {route.path}")
        else:
            print("❌ Router no encontrado")
            return False

        return True

    except Exception as e:
        print(f"❌ Error verificando endpoints: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Ejecuta todas las pruebas"""
    print("=" * 60)
    print("🧪 TEST DE GENERACIÓN DE INFORMES")
    print("=" * 60)

    # Cargar variables de entorno
    from dotenv import load_dotenv
    load_dotenv()

    results = {}

    # 1. Probar MongoDB
    results['mongodb'] = await test_mongodb_connection()

    # 2. Probar Gemini API
    results['gemini'] = await test_gemini_api()

    # 3. Probar servicio de informes
    results['report_service'] = await test_report_service()

    # 4. Probar endpoints
    results['endpoints'] = await test_endpoints()

    # Resumen
    print("\n" + "=" * 60)
    print("📊 RESUMEN DE PRUEBAS")
    print("=" * 60)

    all_passed = True
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {test_name}")
        if not passed:
            all_passed = False

    print("=" * 60)

    if all_passed:
        print("🎉 TODAS LAS PRUEBAS PASARON")
        print("\n💡 El sistema está listo para generar informes")
        print("   Puedes iniciar el servidor con:")
        print("   cd backend && uvicorn app.main:app --reload")
        return 0
    else:
        print("⚠️ ALGUNAS PRUEBAS FALLARON")
        print("\n💡 Revisa la configuración:")
        print("   1. Verifica que MongoDB esté corriendo")
        print("   2. Verifica GEMINI_API_KEY en backend/.env")
        print("   3. Instala dependencias: pip install -r requirements.txt")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
