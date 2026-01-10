#!/usr/bin/env python3
"""
Script de diagnòstic per al problema de generació d'informes
Simula el flux complet del frontend per detectar on falla
"""
import asyncio
import os
import sys
import json
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI") or "mongodb://localhost:27017"
API_URL = "http://localhost:8000"  # Canviar si és diferent


async def simulate_report_generation():
    """Simula el flux complet de generació d'informes"""
    print("=" * 70)
    print("🔍 DIAGNÒSTIC: Problema de Generació d'Informes")
    print("=" * 70)
    print()

    # Dades de prova (la carta que l'usuari està intentant generar)
    test_chart_data = {
        "datos_entrada": {
            "fecha": "1985-05-15",  # Exemple
            "hora": "10:30",
            "latitud": 37.1211901,  # Morón de la Frontera
            "longitud": -5.4541928,
            "zona_horaria": "Europe/Madrid"
        },
        "planetas": {
            "Sol": {"signo": "Tauro", "grado": 24, "casa": 10},
            "Luna": {"signo": "Piscis", "grado": 15, "casa": 8},
            "Ascendente": {"signo": "Cancer", "grado": 5}
        },
        "casas": []
    }

    # 1. Verificar MongoDB
    print("📊 PASO 1: Verificar MongoDB")
    print("-" * 70)
    try:
        client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=5000)
        await client.server_info()
        print("✅ MongoDB connectat")

        db = client.fraktal

        # Comptar sessions actuals
        count = await db.report_generation_sessions.count_documents({})
        print(f"📝 Sessions existents: {count}")

        # Mostrar última sessió
        if count > 0:
            last_session = await db.report_generation_sessions.find_one(
                {},
                sort=[('created_at', -1)]
            )
            print(f"📋 Última sessió:")
            print(f"   ID: {last_session.get('_id')}")
            print(f"   Usuari: {last_session.get('user_name')}")
            print(f"   Status: {last_session.get('status')}")
            print(f"   Report type: {last_session.get('report_type')}")
            print(f"   Mòduls generats: {len(last_session.get('generated_modules', {}))}")

            # Verificar module_runs
            module_runs = last_session.get('module_runs', {})
            if module_runs:
                print(f"   Module runs:")
                for mid, mrun in module_runs.items():
                    print(f"      {mid}: {mrun.get('status')}")
            else:
                print(f"   ⚠️  No hi ha module_runs registrats")

        client.close()
    except Exception as e:
        print(f"❌ Error MongoDB: {e}")
        return False

    print()

    # 2. Verificar full_report_service
    print("📊 PASO 2: Verificar full_report_service")
    print("-" * 70)
    try:
        from app.services.full_report_service import full_report_service

        # Obtenir seccions per a report_type="individual"
        sections = full_report_service._get_sections_definition(report_mode="full")
        print(f"✅ Seccions definides: {len(sections)}")

        if sections and len(sections) > 0:
            print(f"📋 Primera secció:")
            first = sections[0]
            print(f"   ID: {first.get('id')}")
            print(f"   Title: {first.get('title')}")
            print(f"   Expected chars: {first.get('expected_min_chars')}")
        else:
            print(f"❌ No hi ha seccions definides!")
            return False

        # Verificar que les seccions tenen tots els camps necessaris
        for idx, section in enumerate(sections):
            if not section.get('id'):
                print(f"❌ Secció {idx} no té 'id'")
                return False
            if not section.get('title'):
                print(f"❌ Secció {idx} no té 'title'")
                return False

        print(f"✅ Totes les seccions tenen els camps necessaris")

    except Exception as e:
        print(f"❌ Error full_report_service: {e}")
        import traceback
        traceback.print_exc()
        return False

    print()

    # 3. Simular start-full-generation
    print("📊 PASO 3: Simular start-full-generation")
    print("-" * 70)
    try:
        # Simular el que fa l'endpoint
        from app.services.full_report_service import full_report_service

        report_mode = "full"
        report_type = "individual"

        # Validar report_type
        valid_types = {"individual", "adultos", "infantil", "pareja", "familiar", "equipo", "profesional"}
        if report_type not in valid_types:
            print(f"❌ report_type '{report_type}' no és vàlid")
            return False
        else:
            print(f"✅ report_type '{report_type}' és vàlid")

        # Obtenir mòduls
        sections = full_report_service._get_sections_definition(report_mode=report_mode)
        modules_list = [
            {
                "id": s["id"],
                "title": s["title"],
                "expected_min_chars": s["expected_min_chars"]
            }
            for s in sections
        ]

        print(f"✅ Mòduls a retornar: {len(modules_list)}")
        if modules_list:
            print(f"📋 Primer mòdul:")
            print(f"   {json.dumps(modules_list[0], indent=2)}")

        # Verificar que es pot crear una sessió
        client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=5000)
        db = client.fraktal

        session_data = {
            "user_id": "test_user_id",
            "user_name": "Test User",
            "carta_data": test_chart_data,
            "report_type": report_type,
            "report_mode": report_mode,
            "chart_facts": "Test facts",
            "generated_modules": {},
            "module_runs": {},
            "current_module_index": 0,
            "status": "in_progress",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        result = await db.report_generation_sessions.insert_one(session_data)
        session_id = str(result.inserted_id)

        print(f"✅ Sessió de prova creada: {session_id}")

        # Verificar que la sessió es pot llegir
        saved_session = await db.report_generation_sessions.find_one({"_id": result.inserted_id})
        if saved_session:
            print(f"✅ Sessió es pot llegir correctament")
            print(f"   Report type: {saved_session.get('report_type')}")
            print(f"   Status: {saved_session.get('status')}")
        else:
            print(f"❌ No es pot llegir la sessió!")
            return False

        # Netejar
        await db.report_generation_sessions.delete_one({"_id": result.inserted_id})
        print(f"✅ Sessió de prova eliminada")

        client.close()

    except Exception as e:
        print(f"❌ Error simulant start-full-generation: {e}")
        import traceback
        traceback.print_exc()
        return False

    print()

    # 4. Diagnòstic específic
    print("📊 PASO 4: Diagnòstic del Problema")
    print("-" * 70)

    client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=5000)
    db = client.fraktal

    # Buscar sessions recents sense module_runs
    recent_sessions = await db.report_generation_sessions.find(
        {},
        sort=[('created_at', -1)]
    ).limit(10).to_list(length=10)

    problem_sessions = []
    for session in recent_sessions:
        module_runs = session.get('module_runs', {})
        generated = session.get('generated_modules', {})

        # Sessió problemàtica: no té module_runs però hauria de tenir-los
        if len(module_runs) == 0 and len(generated) == 0:
            age_hours = (datetime.utcnow() - datetime.fromisoformat(session.get('created_at', '2020-01-01'))).total_seconds() / 3600
            if age_hours < 48:  # Últimes 48 hores
                problem_sessions.append(session)

    if problem_sessions:
        print(f"⚠️  Trobades {len(problem_sessions)} sessions problemàtiques (sense module_runs):")
        for ps in problem_sessions[:3]:  # Mostrar només les 3 primeres
            print(f"   ID: {ps.get('_id')}")
            print(f"   User: {ps.get('user_name')}")
            print(f"   Created: {ps.get('created_at')}")
            print(f"   Status: {ps.get('status')}")
            print(f"   Report type: {ps.get('report_type')}")
            print()
    else:
        print(f"✅ No s'han trobat sessions problemàtiques recents")

    client.close()

    print()
    print("=" * 70)
    print("📋 RESUM DEL DIAGNÒSTIC")
    print("=" * 70)

    if problem_sessions:
        print("⚠️  PROBLEMA DETECTAT:")
        print()
        print("Les sessions es creen correctament però no s'encolen els mòduls.")
        print()
        print("Possibles causes:")
        print("1. El frontend no crida a queue-module després de start-full-generation")
        print("2. Hi ha un error JavaScript que impedeix la crida")
        print("3. El token d'autenticació ha expirat")
        print()
        print("💡 SOLUCIÓ RECOMANADA:")
        print()
        print("Afegir més logging al frontend per veure on falla:")
        print()
        print("1. A ReportGenerationWizard.tsx línia 204-212:")
        print("   console.log('[WIZARD] data.session_id:', data.session_id);")
        print("   console.log('[WIZARD] data.modules:', data.modules);")
        print("   console.log('[WIZARD] autoGenerateAll:', autoGenerateAll);")
        print()
        print("2. Verificar que no hi ha errors al catch (línia 213)")
        print()
    else:
        print("✅ No s'han detectat problemes evidents")
        print()
        print("Si el problema persisteix, verificar:")
        print("1. Logs del navegador (Console)")
        print("2. Network tab (requests fallits)")
        print("3. Logs del backend (stderr)")

    return True


if __name__ == "__main__":
    try:
        result = asyncio.run(simulate_report_generation())
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n⚠️  Interromput per l'usuari")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error fatal: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
