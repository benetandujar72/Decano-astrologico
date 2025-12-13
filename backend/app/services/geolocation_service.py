"""
Servicio de geolocalización: Convierte coordenadas geográficas a zona horaria IANA
Precisión profesional para cálculos astrológicos

Este servicio permite:
1. Convertir coordenadas (lat, lon) → zona horaria IANA automáticamente
2. Calcular offset UTC considerando horario de verano (DST)
3. Validar zonas horarias IANA

Ejemplos:
    >>> coordenadas_a_timezone(40.4168, -3.7038)
    'Europe/Madrid'

    >>> coordenadas_a_timezone(40.7128, -74.0060)
    'America/New_York'
"""
from timezonefinder import TimezoneFinder
import pytz
from datetime import datetime
from typing import Tuple, Optional

# Inicializar TimezoneFinder (carga datos una sola vez para mejor rendimiento)
tf = TimezoneFinder()


def coordenadas_a_timezone(latitud: float, longitud: float) -> str:
    """
    Convierte coordenadas geográficas a zona horaria IANA

    Args:
        latitud: Latitud en grados decimales (-90 a 90)
        longitud: Longitud en grados decimales (-180 a 180)

    Returns:
        Zona horaria IANA (ej: "Europe/Madrid", "America/New_York")

    Raises:
        ValueError: Si las coordenadas son inválidas

    Ejemplos:
        >>> coordenadas_a_timezone(40.4168, -3.7038)
        'Europe/Madrid'

        >>> coordenadas_a_timezone(40.7128, -74.0060)
        'America/New_York'

        >>> coordenadas_a_timezone(-33.8688, 151.2093)
        'Australia/Sydney'
    """
    # Validar coordenadas
    if not (-90 <= latitud <= 90):
        raise ValueError(f"Latitud inválida: {latitud}. Debe estar entre -90 y 90")
    if not (-180 <= longitud <= 180):
        raise ValueError(f"Longitud inválida: {longitud}. Debe estar entre -180 y 180")

    # Obtener zona horaria
    timezone_str = tf.timezone_at(lat=latitud, lng=longitud)

    if timezone_str is None:
        # Fallback para coordenadas en océanos (usar zona más cercana)
        timezone_str = tf.closest_timezone_at(lat=latitud, lng=longitud)

    if timezone_str is None:
        # Último recurso: UTC (para coordenadas en lugares remotos)
        print(f"⚠️ No se encontró zona horaria para Lat {latitud}, Lon {longitud}. Usando UTC")
        timezone_str = "UTC"

    return timezone_str


def obtener_utc_offset(
    latitud: float,
    longitud: float,
    fecha_hora: datetime
) -> Tuple[str, int, bool]:
    """
    Obtiene el offset UTC para una ubicación y fecha específica
    Considera horario de verano (DST) automáticamente

    Args:
        latitud: Latitud en grados decimales
        longitud: Longitud en grados decimales
        fecha_hora: Datetime naive (hora local)

    Returns:
        Tupla (timezone_str, offset_segundos, es_dst)

    Ejemplos:
        >>> dt = datetime(2023, 7, 15, 14, 30)  # Julio (verano)
        >>> tz_str, offset, es_dst = obtener_utc_offset(40.4168, -3.7038, dt)
        >>> tz_str
        'Europe/Madrid'
        >>> offset / 3600  # Convertir a horas
        2.0  # UTC+2 (CEST - horario de verano en España)
        >>> es_dst
        True

        >>> dt_invierno = datetime(2023, 1, 15, 14, 30)  # Enero (invierno)
        >>> tz_str, offset, es_dst = obtener_utc_offset(40.4168, -3.7038, dt_invierno)
        >>> offset / 3600
        1.0  # UTC+1 (CET - horario estándar)
        >>> es_dst
        False
    """
    timezone_str = coordenadas_a_timezone(latitud, longitud)
    tz = pytz.timezone(timezone_str)

    # Localizar datetime y obtener offset
    dt_aware = tz.localize(fecha_hora)
    offset_segundos = dt_aware.utcoffset().total_seconds()
    es_dst = bool(dt_aware.dst())

    return (timezone_str, int(offset_segundos), es_dst)


def validar_zona_horaria(zona_horaria: str) -> bool:
    """
    Valida si una zona horaria IANA es correcta

    Args:
        zona_horaria: String IANA (ej: "Europe/Madrid")

    Returns:
        True si es válida, False si no existe

    Ejemplos:
        >>> validar_zona_horaria("Europe/Madrid")
        True

        >>> validar_zona_horaria("Invalid/Timezone")
        False
    """
    try:
        pytz.timezone(zona_horaria)
        return True
    except pytz.exceptions.UnknownTimeZoneError:
        return False


def obtener_info_timezone(latitud: float, longitud: float, fecha_hora: datetime) -> dict:
    """
    Obtiene información completa de la zona horaria para debugging

    Args:
        latitud: Latitud en grados decimales
        longitud: Longitud en grados decimales
        fecha_hora: Datetime naive (hora local)

    Returns:
        Dict con información detallada de la zona horaria

    Ejemplo:
        >>> dt = datetime(2023, 7, 15, 14, 30)
        >>> info = obtener_info_timezone(40.4168, -3.7038, dt)
        >>> print(info)
        {
            'timezone': 'Europe/Madrid',
            'offset_horas': 2.0,
            'offset_segundos': 7200,
            'es_dst': True,
            'nombre_dst': 'CEST',
            'nombre_std': 'CET'
        }
    """
    timezone_str, offset_segundos, es_dst = obtener_utc_offset(latitud, longitud, fecha_hora)
    tz = pytz.timezone(timezone_str)
    dt_aware = tz.localize(fecha_hora)

    return {
        'timezone': timezone_str,
        'offset_horas': offset_segundos / 3600,
        'offset_segundos': offset_segundos,
        'es_dst': es_dst,
        'nombre_timezone': dt_aware.tzname(),
        'latitud': latitud,
        'longitud': longitud
    }
