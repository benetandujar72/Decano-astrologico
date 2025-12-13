"""
Servicio de cálculo de efemérides astrológicas usando Swiss Ephemeris
Precisión profesional para análisis psico-astrológicos
"""
import swisseph as swe
import math
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import pytz
from app.services.geolocation_service import coordenadas_a_timezone

# Configuración inicial: Usar efemérides analíticas Moshier
# (precisión suficiente y sin archivos externos)
swe.set_ephe_path('')

# Constantes
SIGNOS = ['Aries', 'Tauro', 'Géminis', 'Cáncer', 'Leo', 'Virgo',
          'Libra', 'Escorpio', 'Sagitario', 'Capricornio', 'Acuario', 'Piscis']

PLANETAS = {
    'Sol': swe.SUN,
    'Luna': swe.MOON,
    'Mercurio': swe.MERCURY,
    'Venus': swe.VENUS,
    'Marte': swe.MARS,
    'Júpiter': swe.JUPITER,
    'Saturno': swe.SATURN,
    'Urano': swe.URANUS,
    'Neptuno': swe.NEPTUNE,
    'Plutón': swe.PLUTO,
    'Quirón': swe.CHIRON,
    'Lilith med.': swe.MEAN_APOG,  # Lilith Media (no verdadera)
    'Nodo Norte': swe.TRUE_NODE     # Nodo Verdadero
}


def grado_a_zodiaco(deg: float, incluir_segundos: bool = True) -> Dict[str, any]:
    """
    Convierte grados decimales a formato zodiacal con precisión profesional

    Args:
        deg: Grados decimales (0-360)
        incluir_segundos: Si True, incluye segundos en el formato (ej: 15°42'18")

    Returns:
        Dict con: signo, grados, minutos, segundos, texto_completo, longitud_absoluta

    Ejemplos:
        >>> grado_a_zodiaco(15.705)
        {'signo': 'Aries', 'grados': 15, 'minutos': 42, 'segundos': 18,
         'texto': "15°42'18\" Aries", 'longitud_absoluta': 15.705}
    """
    # Normalizar a 0-360
    deg = deg % 360

    # Determinar signo (cada signo = 30°)
    signo_idx = int(deg // 30)
    pos_en_signo = deg % 30

    # Extraer grados, minutos y segundos
    grados = int(pos_en_signo)
    minutos_decimales = (pos_en_signo - grados) * 60
    minutos = int(minutos_decimales)
    segundos_decimales = (minutos_decimales - minutos) * 60
    segundos = int(round(segundos_decimales))  # Redondear segundos

    # Ajustar overflow de segundos → minutos → grados
    if segundos >= 60:
        segundos = 0
        minutos += 1

    if minutos >= 60:
        minutos = 0
        grados += 1

    if grados >= 30:
        grados = 0
        signo_idx = (signo_idx + 1) % 12

    # Obtener signo
    signo = SIGNOS[signo_idx]

    # Formatear texto
    if incluir_segundos:
        texto = f'{grados:02d}°{minutos:02d}\'{segundos:02d}" {signo}'
    else:
        texto = f'{grados:02d}°{minutos:02d}\' {signo}'

    return {
        'signo': signo,
        'grados': grados,
        'minutos': minutos,
        'segundos': segundos,  # ← NUEVO
        'texto': texto,
        'longitud_absoluta': deg,
        'decimal_en_signo': pos_en_signo  # ← Útil para cálculos internos
    }


def calcular_julian_day(
    fecha: str,
    hora: str,
    latitud: float,
    longitud: float,
    zona_horaria: Optional[str] = None
) -> Tuple[float, datetime, str]:
    """
    Calcula el Julian Day para los cálculos astronómicos con detección automática de timezone

    Args:
        fecha: Formato "YYYY-MM-DD"
        hora: Formato "HH:MM"
        latitud: Latitud del lugar
        longitud: Longitud del lugar
        zona_horaria: Zona horaria IANA (opcional, se calcula automáticamente si no se provee)

    Returns:
        Tupla (julian_day_et, datetime_utc, zona_horaria_detectada)

    Ejemplos:
        >>> # Madrid - Detección automática
        >>> jd, dt_utc, tz = calcular_julian_day("2023-07-15", "14:30", 40.4168, -3.7038)
        >>> tz
        'Europe/Madrid'
    """
    # Si no se proporcionó zona horaria, calcularla automáticamente
    if zona_horaria is None or zona_horaria == "UTC":
        zona_horaria = coordenadas_a_timezone(latitud, longitud)
        print(f"🌍 Zona horaria detectada: {zona_horaria} (Lat {latitud}, Lon {longitud})")

    # Parsear fecha y hora local
    local_dt = datetime.strptime(f"{fecha} {hora}", "%Y-%m-%d %H:%M")

    # Convertir a UTC
    tz = pytz.timezone(zona_horaria)
    dt_aware = tz.localize(local_dt)
    dt_utc = dt_aware.astimezone(pytz.utc)

    # Hora decimal para Swiss Ephemeris
    hora_utc_dec = dt_utc.hour + dt_utc.minute/60.0 + dt_utc.second/3600.0

    # Calcular Julian Day (UT)
    jd_ut = swe.julday(dt_utc.year, dt_utc.month, dt_utc.day, hora_utc_dec)

    # Convertir a Ephemeris Time (ET) para mayor precisión
    delta_t = swe.deltat(jd_ut)
    jd_et = jd_ut + delta_t

    return jd_et, dt_utc, zona_horaria


def calcular_posiciones_planetas(jd_ut: float, lat: Optional[float] = None, lon: Optional[float] = None) -> Dict[str, Dict]:
    """
    Calcula las posiciones de todos los planetas con precisión profesional

    Args:
        jd_ut: Julian Day (UT)
        lat: Latitud (opcional, para corrección topocéntrica)
        lon: Longitud (opcional, para corrección topocéntrica)

    Returns:
        Dict con posiciones de cada planeta
    """
    posiciones = {}

    # Flags profesionales para máxima precisión
    if lat is not None and lon is not None:
        # Si tenemos coordenadas, establecer posición topocéntrica
        swe.set_topo(lon, lat, 0)  # lon, lat, altura_metros
        flags = (
            swe.FLG_SWIEPH |      # Usar archivos Swiss Ephemeris (o Moshier si no están)
            swe.FLG_SPEED |       # Calcular velocidades planetarias
            swe.FLG_TOPOCTR       # Corrección topocéntrica (desde ubicación geográfica)
        )
    else:
        # Sin coordenadas, usar cálculo geocéntrico estándar
        flags = (
            swe.FLG_SWIEPH |      # Usar archivos Swiss Ephemeris (o Moshier si no están)
            swe.FLG_SPEED         # Calcular velocidades planetarias
        )
    
    for nombre, id_cuerpo in PLANETAS.items():
        try:
            res = swe.calc_ut(jd_ut, id_cuerpo, flags)
            longitud = res[0][0]
            velocidad = res[0][3]
            
            # Detectar retrogradación
            retro = False
            if velocidad < 0 and nombre not in ['Nodo Norte', 'Lilith med.']:
                retro = True
            
            # Convertir a formato zodiacal
            pos_zodiacal = grado_a_zodiaco(longitud)
            
            posiciones[nombre] = {
                'longitud': longitud,
                'velocidad': velocidad,
                'retrogrado': retro,
                'signo': pos_zodiacal['signo'],
                'grados': pos_zodiacal['grados'],
                'minutos': pos_zodiacal['minutos'],
                'segundos': pos_zodiacal['segundos'],  # ← NUEVO
                'texto': pos_zodiacal['texto'] + (' R' if retro else '')
            }
            
        except swe.Error as e:
            print(f"Error calculando {nombre}: {e}")
            posiciones[nombre] = None
    
    return posiciones


def calcular_casas_y_angulos(jd_ut: float, lat: float, lon: float) -> Dict[str, any]:
    """
    Calcula las casas astrológicas y ángulos (ASC, MC)
    
    Args:
        jd_ut: Julian Day (UT)
        lat: Latitud
        lon: Longitud
        
    Returns:
        Dict con cúspides de casas y ángulos
    """
    # Sistema Placidus (código 'P')
    res_casas = swe.houses(jd_ut, lat, lon, b'P')
    cuspides = res_casas[0]  # Cúspides de las 12 casas
    asc_mc = res_casas[1]    # [ASC, MC, ARMC, Vertex, ...]
    
    # Convertir cúspides a formato zodiacal
    casas = []
    for i, cusp in enumerate(cuspides):
        pos_zodiacal = grado_a_zodiaco(cusp)
        casas.append({
            'numero': i + 1,
            'cuspide': cusp,
            'texto': pos_zodiacal['texto']
        })
    
    # Ángulos principales
    ascendente = grado_a_zodiaco(asc_mc[0])
    medio_cielo = grado_a_zodiaco(asc_mc[1])
    
    return {
        'casas': casas,
        'ascendente': {
            'longitud': asc_mc[0],
            **ascendente
        },
        'medio_cielo': {
            'longitud': asc_mc[1],
            **medio_cielo
        }
    }


def calcular_parte_fortuna(asc: float, sol: float, luna: float, es_diurno: bool = True) -> Dict:
    """
    Calcula la Parte/Rueda de la Fortuna
    
    Args:
        asc: Longitud del Ascendente
        sol: Longitud del Sol
        luna: Longitud de la Luna
        es_diurno: Si True usa fórmula diurna, si False nocturna
        
    Returns:
        Dict con posición de la Parte de Fortuna
    """
    if es_diurno:
        # Fórmula diurna: ASC + Luna - Sol
        fortuna = (asc + luna - sol) % 360
    else:
        # Fórmula nocturna: ASC + Sol - Luna
        fortuna = (asc + sol - luna) % 360
    
    pos_zodiacal = grado_a_zodiaco(fortuna)
    
    return {
        'longitud': fortuna,
        **pos_zodiacal
    }


def asignar_casas_a_planetas(posiciones: Dict, cuspides: List[float]) -> Dict:
    """
    Asigna cada planeta a su casa correspondiente
    
    Args:
        posiciones: Dict con posiciones planetarias
        cuspides: Lista de 12 cúspides de casas
        
    Returns:
        Posiciones actualizadas con número de casa
    """
    for nombre, pos in posiciones.items():
        if pos is None:
            continue
            
        longitud = pos['longitud']
        
        # Encontrar casa (método Placidus)
        casa = 1
        for i in range(12):
            cusp_actual = cuspides[i]
            cusp_siguiente = cuspides[(i + 1) % 12]
            
            # Manejar el cruce de 0° Aries
            if cusp_siguiente < cusp_actual:
                if longitud >= cusp_actual or longitud < cusp_siguiente:
                    casa = i + 1
                    break
            else:
                if cusp_actual <= longitud < cusp_siguiente:
                    casa = i + 1
                    break
        
        pos['casa'] = casa
    
    return posiciones


def calcular_carta_completa(
    fecha: str,
    hora: str,
    latitud: float,
    longitud: float,
    zona_horaria: Optional[str] = None
) -> Dict:
    """
    Calcula la carta astral completa con todos los elementos y detección automática de timezone

    Args:
        fecha: Formato "YYYY-MM-DD"
        hora: Formato "HH:MM"
        latitud: Latitud del lugar
        longitud: Longitud del lugar
        zona_horaria: Zona horaria IANA (opcional, se detecta automáticamente desde coordenadas)

    Returns:
        Dict completo con toda la información astrológica

    Ejemplos:
        >>> # Madrid - Detección automática
        >>> carta = calcular_carta_completa("2023-07-15", "14:30", 40.4168, -3.7038)
        >>> carta['datos_entrada']['zona_horaria']
        'Europe/Madrid'
    """
    # 1. Calcular Julian Day (ahora con detección automática de timezone)
    jd_et, dt_utc, zona_horaria_detectada = calcular_julian_day(fecha, hora, latitud, longitud, zona_horaria)
    jd_ut = jd_et - swe.deltat(jd_et - swe.deltat(jd_et))  # Aproximación de UT

    # 2. Calcular posiciones planetarias (con corrección topocéntrica)
    posiciones = calcular_posiciones_planetas(jd_ut, latitud, longitud)
    
    # 3. Calcular casas y ángulos
    casas_data = calcular_casas_y_angulos(jd_ut, latitud, longitud)
    
    # 4. Asignar casas a planetas
    cuspides_raw = [c['cuspide'] for c in casas_data['casas']]
    posiciones = asignar_casas_a_planetas(posiciones, cuspides_raw)
    
    # 5. Calcular Parte de Fortuna (usar fórmula diurna por defecto)
    asc_lon = casas_data['ascendente']['longitud']
    sol_lon = posiciones['Sol']['longitud']
    luna_lon = posiciones['Luna']['longitud']
    parte_fortuna = calcular_parte_fortuna(asc_lon, sol_lon, luna_lon)
    
    # 6. Compilar resultado completo
    return {
        'datos_entrada': {
            'fecha': fecha,
            'hora': hora,
            'latitud': latitud,
            'longitud': longitud,
            'zona_horaria': zona_horaria_detectada,  # ← Usar la zona detectada
            'fecha_utc': dt_utc.strftime("%Y-%m-%d %H:%M:%S UTC")
        },
        'planetas': posiciones,
        'casas': casas_data['casas'],
        'angulos': {
            'ascendente': casas_data['ascendente'],
            'medio_cielo': casas_data['medio_cielo'],
            'parte_fortuna': parte_fortuna
        }
    }


# Función de utilidad para formato de texto legible
def formato_texto_carta(carta: Dict) -> str:
    """
    Genera un texto legible de la carta astral
    
    Args:
        carta: Dict con datos de la carta completa
        
    Returns:
        String formateado para mostrar
    """
    datos = carta['datos_entrada']
    texto = f"""
╔══════════════════════════════════════════════════════════╗
║           CARTA ASTRAL COMPLETA                          ║
╚══════════════════════════════════════════════════════════╝

📅 Fecha: {datos['fecha']} {datos['hora']} ({datos['zona_horaria']})
🌍 Ubicación: Lat {datos['latitud']}, Lon {datos['longitud']}
🕐 UTC: {datos['fecha_utc']}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PLANETAS Y PUNTOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
    
    for nombre, pos in carta['planetas'].items():
        if pos:
            retro = " R" if pos['retrogrado'] else ""
            casa = pos.get('casa', '?')
            texto += f"{nombre:12s} : {pos['texto']:20s}  Casa {casa:2d}{retro}\n"
    
    texto += f"\n{'P. Fortuna':12s} : {carta['angulos']['parte_fortuna']['texto']}\n"
    
    texto += f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ÁNGULOS PRINCIPALES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ascendente   : {carta['angulos']['ascendente']['texto']}
Medio Cielo  : {carta['angulos']['medio_cielo']['texto']}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CÚSPIDES DE CASAS (Placidus)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
    
    for casa in carta['casas']:
        texto += f"Casa {casa['numero']:2d} : {casa['texto']}\n"
    
    return texto

