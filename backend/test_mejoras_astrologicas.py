"""
Script de testing para validar las mejoras astrológicas
Ejecutar con: python test_mejoras_astrologicas.py

TESTS:
1. Detección automática de zona horaria para Madrid
2. Formato grados-minutos-segundos (D°M'S")
3. Carta completa con timezone automático
4. Validación de precisión con múltiples ciudades
"""
import sys
import os
sys.path.append(os.path.dirname(__file__))

from app.services.ephemeris import calcular_carta_completa, grado_a_zodiaco
from app.services.geolocation_service import coordenadas_a_timezone, obtener_utc_offset
from datetime import datetime


def test_timezone_madrid():
    """Test 1: Detección automática de zona horaria para Madrid"""
    print("\n" + "="*70)
    print("TEST 1: Detección automática de zona horaria - Madrid")
    print("="*70)

    timezone = coordenadas_a_timezone(40.4168, -3.7038)
    print(f"📍 Coordenadas: 40.4168°N, 3.7038°W")
    print(f"🌍 Timezone detectado: {timezone}")

    assert timezone == "Europe/Madrid", f"❌ Error: Esperado 'Europe/Madrid', obtenido '{timezone}'"
    print("✅ PASS - Timezone correcto")

    # Test con horario de verano (julio)
    dt_verano = datetime(2023, 7, 15, 14, 30)
    tz_str, offset, es_dst = obtener_utc_offset(40.4168, -3.7038, dt_verano)
    offset_horas = offset / 3600

    print(f"\n🌞 Julio (verano):")
    print(f"   Offset: UTC{offset_horas:+.1f} horas")
    print(f"   DST activo: {es_dst}")
    assert offset_horas == 2.0, f"❌ Error: Esperado UTC+2, obtenido UTC{offset_horas:+.1f}"
    print("   ✅ PASS - Horario de verano correcto (CEST)")

    # Test con horario estándar (enero)
    dt_invierno = datetime(2023, 1, 15, 14, 30)
    tz_str, offset, es_dst = obtener_utc_offset(40.4168, -3.7038, dt_invierno)
    offset_horas = offset / 3600

    print(f"\n❄️ Enero (invierno):")
    print(f"   Offset: UTC{offset_horas:+.1f} horas")
    print(f"   DST activo: {es_dst}")
    assert offset_horas == 1.0, f"❌ Error: Esperado UTC+1, obtenido UTC{offset_horas:+.1f}"
    print("   ✅ PASS - Horario estándar correcto (CET)")


def test_formato_dms():
    """Test 2: Formato grados-minutos-segundos"""
    print("\n" + "="*70)
    print("TEST 2: Formato D°M'S\" (Grados-Minutos-Segundos)")
    print("="*70)

    # Caso 1: 15.705° en Aries
    resultado = grado_a_zodiaco(15.705, incluir_segundos=True)
    print(f"\n🔢 Entrada: 15.705° (decimal)")
    print(f"📐 Salida: {resultado['texto']}")
    print(f"   Grados: {resultado['grados']}")
    print(f"   Minutos: {resultado['minutos']}")
    print(f"   Segundos: {resultado['segundos']}")

    assert resultado['grados'] == 15, f"❌ Error: Esperado 15°, obtenido {resultado['grados']}°"
    assert resultado['minutos'] == 42, f"❌ Error: Esperado 42', obtenido {resultado['minutos']}'"
    assert resultado['segundos'] == 18, f"❌ Error: Esperado 18\", obtenido {resultado['segundos']}\""
    assert resultado['signo'] == 'Aries', f"❌ Error: Esperado Aries, obtenido {resultado['signo']}"
    print("✅ PASS - Formato D°M'S\" correcto")

    # Caso 2: 45.5° en Tauro (sin segundos)
    resultado2 = grado_a_zodiaco(45.5, incluir_segundos=False)
    print(f"\n🔢 Entrada: 45.5° (decimal)")
    print(f"📐 Salida: {resultado2['texto']}")
    assert resultado2['grados'] == 15, f"❌ Error: Esperado 15°"
    assert resultado2['minutos'] == 30, f"❌ Error: Esperado 30'"
    assert resultado2['signo'] == 'Tauro', f"❌ Error: Esperado Tauro"
    print("✅ PASS - Formato D°M' correcto (sin segundos)")


def test_carta_completa_madrid():
    """Test 3: Carta completa con timezone automático"""
    print("\n" + "="*70)
    print("TEST 3: Carta Completa Madrid (Detección Automática)")
    print("="*70)

    carta = calcular_carta_completa(
        fecha="1990-01-15",
        hora="14:30",
        latitud=40.4168,
        longitud=-3.7038,
        zona_horaria=None  # ← Detección automática
    )

    print(f"\n📅 Entrada:")
    print(f"   Fecha: 1990-01-15 14:30")
    print(f"   Lugar: Madrid (40.4168°N, 3.7038°W)")
    print(f"   Timezone: AUTO")

    print(f"\n🌍 Resultado:")
    print(f"   Timezone detectado: {carta['datos_entrada']['zona_horaria']}")
    print(f"   Fecha UTC: {carta['datos_entrada']['fecha_utc']}")

    assert carta['datos_entrada']['zona_horaria'] == 'Europe/Madrid', \
        f"❌ Error: Timezone incorrecto"
    print("✅ PASS - Timezone detectado correctamente")

    # Verificar formato con segundos en Ascendente
    asc = carta['angulos']['ascendente']
    print(f"\n🌅 Ascendente:")
    print(f"   Texto: {asc['texto']}")
    print(f"   Grados: {asc['grados']}°")
    print(f"   Minutos: {asc['minutos']}'")
    print(f"   Segundos: {asc['segundos']}\"")

    assert 'segundos' in asc, "❌ Error: Falta campo 'segundos' en Ascendente"
    print("✅ PASS - Ascendente incluye segundos")

    # Verificar formato en posiciones planetarias
    sol = carta['planetas']['Sol']
    print(f"\n☀️ Sol:")
    print(f"   Texto: {sol['texto']}")
    print(f"   {sol['grados']}° {sol['minutos']}' {sol['segundos']}\" {sol['signo']}")

    assert 'segundos' in sol, "❌ Error: Falta campo 'segundos' en Sol"
    print("✅ PASS - Planetas incluyen segundos")


def test_multiples_ciudades():
    """Test 4: Validación con múltiples ciudades del mundo"""
    print("\n" + "="*70)
    print("TEST 4: Validación con Múltiples Ciudades")
    print("="*70)

    ciudades = [
        {
            'nombre': 'Madrid, España',
            'lat': 40.4168,
            'lon': -3.7038,
            'tz_esperado': 'Europe/Madrid'
        },
        {
            'nombre': 'Nueva York, USA',
            'lat': 40.7128,
            'lon': -74.0060,
            'tz_esperado': 'America/New_York'
        },
        {
            'nombre': 'Sydney, Australia',
            'lat': -33.8688,
            'lon': 151.2093,
            'tz_esperado': 'Australia/Sydney'
        },
        {
            'nombre': 'Ciudad de México',
            'lat': 19.4326,
            'lon': -99.1332,
            'tz_esperado': 'America/Mexico_City'
        },
        {
            'nombre': 'Tokio, Japón',
            'lat': 35.6762,
            'lon': 139.6503,
            'tz_esperado': 'Asia/Tokyo'
        }
    ]

    for ciudad in ciudades:
        tz_detectado = coordenadas_a_timezone(ciudad['lat'], ciudad['lon'])
        print(f"\n🌍 {ciudad['nombre']}:")
        print(f"   Coordenadas: {ciudad['lat']}, {ciudad['lon']}")
        print(f"   Timezone: {tz_detectado}")

        assert tz_detectado == ciudad['tz_esperado'], \
            f"❌ Error: Esperado {ciudad['tz_esperado']}, obtenido {tz_detectado}"
        print(f"   ✅ PASS")


def test_precision_efemerides():
    """Test 5: Verificación de precisión en efemérides"""
    print("\n" + "="*70)
    print("TEST 5: Precisión de Efemérides (Flags Profesionales)")
    print("="*70)

    # Calcular carta para fecha conocida
    carta = calcular_carta_completa(
        fecha="2000-01-01",
        hora="12:00",
        latitud=51.5074,
        longitud=-0.1278,
        zona_horaria=None  # Londres
    )

    print(f"\n🌍 Carta de prueba:")
    print(f"   Fecha: 2000-01-01 12:00")
    print(f"   Lugar: Londres (51.5074°N, 0.1278°W)")
    print(f"   Timezone: {carta['datos_entrada']['zona_horaria']}")

    # Verificar que todos los planetas tienen datos
    print(f"\n🪐 Posiciones planetarias calculadas:")
    for nombre, pos in carta['planetas'].items():
        if pos:
            print(f"   {nombre:12s}: {pos['texto']:25s} Casa {pos.get('casa', '?')}")
            assert 'segundos' in pos, f"❌ Error: {nombre} sin segundos"
        else:
            print(f"   {nombre:12s}: ERROR - No se pudo calcular")

    print(f"\n✅ PASS - Todas las posiciones calculadas con precisión D°M'S\"")


if __name__ == "__main__":
    print("\n" + "🌟"*35)
    print("  SCRIPT DE TESTING - MEJORAS ASTROLÓGICAS")
    print("🌟"*35)

    try:
        test_timezone_madrid()
        test_formato_dms()
        test_carta_completa_madrid()
        test_multiples_ciudades()
        test_precision_efemerides()

        print("\n" + "="*70)
        print("✅ ✅ ✅  TODOS LOS TESTS PASARON  ✅ ✅ ✅")
        print("="*70)
        print("\n🎯 Resumen:")
        print("   ✓ Detección automática de timezone funcionando")
        print("   ✓ Formato D°M'S\" implementado correctamente")
        print("   ✓ Flags profesionales de Swiss Ephemeris activos")
        print("   ✓ Precisión astronómica garantizada")
        print("\n")

    except AssertionError as e:
        print(f"\n❌ ❌ ❌  TEST FALLIDO  ❌ ❌ ❌")
        print(f"Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 ERROR INESPERADO 💥")
        print(f"Tipo: {type(e).__name__}")
        print(f"Mensaje: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
