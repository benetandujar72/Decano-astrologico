"""
Generador de imágenes de cartas astrales
Crea visualizaciones radiales profesionales de cartas natales
"""
from typing import Dict, List, Tuple, Optional
from io import BytesIO
import math

try:
    from PIL import Image, ImageDraw, ImageFont
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("⚠️ Pillow no disponible. Instala con: pip install Pillow")

try:
    import matplotlib
    matplotlib.use('Agg')  # Backend sin GUI
    import matplotlib.pyplot as plt
    import matplotlib.patches as patches
    from matplotlib.patches import Circle, Wedge, FancyBboxPatch
    import numpy as np
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False
    print("⚠️ Matplotlib no disponible. Instala con: pip install matplotlib")


# Símbolos de planetas (Unicode)
PLANET_SYMBOLS = {
    'Sol': '☉',
    'Luna': '☽',
    'Mercurio': '☿',
    'Venus': '♀',
    'Marte': '♂',
    'Júpiter': '♃',
    'Saturno': '♄',
    'Urano': '♅',
    'Neptuno': '♆',
    'Plutón': '♇',
    'Quirón': '⚷',
    'Lilith med.': '⚸',
    'Nodo Norte': '☊'
}

# Símbolos de signos (Unicode)
ZODIAC_SYMBOLS = {
    'Aries': '♈', 'Tauro': '♉', 'Géminis': '♊', 'Cáncer': '♋',
    'Leo': '♌', 'Virgo': '♍', 'Libra': '♎', 'Escorpio': '♏',
    'Sagitario': '♐', 'Capricornio': '♑', 'Acuario': '♒', 'Piscis': '♓'
}

# Colores (estilo cosmograma)
THEME_COSMOGRAMA = {
    "bg": "#ffffff",
    "ring": "#ffffff",
    "ring_alt": "#ffffff",
    "line": "#9ca3af",         # tick/lineas finas
    "line_soft": "#d1d5db",    # bordes suaves
    "ink": "#111827",
    "muted": "#6b7280",
    "accent": "#d1005b",       # AC/DC/MC/IC
    "aspect_red": "#dc2626",
    "aspect_blue": "#2563eb",
    "aspect_yellow": "#f59e0b",
}

# Colores de elementos (más cercanos a cosmogramas impresos)
ELEMENT_COLORS = {
    "Fuego": "#dc2626",
    "Tierra": "#8b7b4f",
    "Aire": "#c5a200",
    "Agua": "#2563eb",
}

# Mapeo de signos a elementos
SIGN_TO_ELEMENT = {
    'Aries': 'Fuego', 'Leo': 'Fuego', 'Sagitario': 'Fuego',
    'Tauro': 'Tierra', 'Virgo': 'Tierra', 'Capricornio': 'Tierra',
    'Géminis': 'Aire', 'Libra': 'Aire', 'Acuario': 'Aire',
    'Cáncer': 'Agua', 'Escorpio': 'Agua', 'Piscis': 'Agua'
}


def generate_chart_image_matplotlib(
    carta_data: Dict,
    size: Tuple[int, int] = (800, 800),
    dpi: int = 100,
    format: str = 'png',
    theme: str = "cosmograma",
) -> BytesIO:
    """
    Genera una imagen de carta astral usando Matplotlib
    
    Args:
        carta_data: Datos completos de la carta
        size: Tamaño en píxeles (ancho, alto)
        dpi: Resolución en puntos por pulgada
        format: Formato de salida ('png', 'jpg', 'svg')
        
    Returns:
        BytesIO buffer con la imagen
    """
    if not MATPLOTLIB_AVAILABLE:
        raise ImportError("Matplotlib no está instalado. Instala con: pip install matplotlib")
    
    # Extraer datos
    planetas = carta_data.get('planetas', {})
    casas = carta_data.get('casas', [])
    angulos = carta_data.get('angulos', {})
    
    theme_name = (theme or "cosmograma").lower().strip()
    t = THEME_COSMOGRAMA if theme_name == "cosmograma" else THEME_COSMOGRAMA

    # Extra: rotación para fijar Ascendente a la izquierda (180°)
    angulos = carta_data.get("angulos", {}) or {}
    asc_lon = None
    try:
        asc_lon = float((angulos.get("ascendente") or {}).get("longitud"))  # type: ignore
    except Exception:
        asc_lon = None
    rotation_offset = 0.0
    if isinstance(asc_lon, (int, float)):
        rotation_offset = (180.0 - float(asc_lon)) % 360.0

    def rot(lon: float) -> float:
        return (float(lon) + rotation_offset) % 360.0

    # Crear figura
    fig_width = size[0] / dpi
    fig_height = size[1] / dpi
    fig, ax = plt.subplots(figsize=(fig_width, fig_height), dpi=dpi)
    ax.set_xlim(-1.5, 1.5)
    ax.set_ylim(-1.5, 1.5)
    ax.set_aspect('equal')
    ax.axis('off')
    
    # Fondo blanco (cosmograma)
    ax.add_patch(Circle((0, 0), 1.45, color=t["bg"], zorder=0))
    
    # Círculos concéntricos
    circles_radii = [1.0, 0.95, 0.85, 0.75]
    for i, radius in enumerate(circles_radii):
        color = t["ring"] if i % 2 == 0 else t["ring_alt"]
        circle = Circle((0, 0), radius, fill=True, edgecolor=t["line_soft"],
                       facecolor=color, linewidth=1, zorder=1)
        ax.add_patch(circle)
    
    # Dibujar divisiones de signos (12 secciones de 30°)
    for i in range(12):
        angle_deg = rot(i * 30)
        angle_rad = math.radians(angle_deg)
        x1 = 0.75 * math.cos(angle_rad)
        y1 = 0.75 * math.sin(angle_rad)
        x2 = 1.0 * math.cos(angle_rad)
        y2 = 1.0 * math.sin(angle_rad)
        ax.plot([x1, x2], [y1, y2], color=t["line"], linewidth=0.9, zorder=2)

    # Ticks exteriores (estilo cosmograma)
    for deg in range(0, 360, 2):
        a = math.radians(rot(deg))
        r_outer = 1.28
        r_inner = 1.22 if (deg % 10) else 1.18
        lw = 0.6 if (deg % 10) else 0.9
        x1 = r_inner * math.cos(a)
        y1 = r_inner * math.sin(a)
        x2 = r_outer * math.cos(a)
        y2 = r_outer * math.sin(a)
        ax.plot([x1, x2], [y1, y2], color=t["line"], linewidth=lw, zorder=2)
    
    # Dibujar símbolos de signos en el anillo exterior
    signos = list(ZODIAC_SYMBOLS.keys())
    for i, signo in enumerate(signos):
        # Calcular ángulo (empezando desde Aries en 0°)
        angle_deg = rot(i * 30 + 15)  # Centro del signo
        angle_rad = math.radians(angle_deg)
        
        # Posición en el círculo exterior
        radius = 1.15
        x = radius * math.cos(angle_rad)
        y = radius * math.sin(angle_rad)
        
        # Color según elemento
        elemento = SIGN_TO_ELEMENT.get(signo, 'Fuego')
        color = ELEMENT_COLORS.get(elemento, '#ffffff')
        
        # Dibujar símbolo (coloreado por elemento)
        ax.text(x, y, ZODIAC_SYMBOLS[signo], 
                fontsize=16, ha='center', va='center',
                color=color, weight='bold', zorder=4,
                family='DejaVu Sans')
    
    # Dibujar cúspides de casas (Placidus/Koch según data) con rotación por Asc
    if casas:
        for casa in casas:
            longitud = casa.get('cuspide', 0)
            # Convertir longitud a ángulo con rotación (Asc fijo)
            angle_rad = math.radians(rot(longitud))
            
            # Línea de cúspide
            x1 = 0.0 * math.cos(angle_rad)
            y1 = 0.0 * math.sin(angle_rad)
            x2 = 0.75 * math.cos(angle_rad)
            y2 = 0.75 * math.sin(angle_rad)
            
            # Línea más gruesa para casas angulares (1, 4, 7, 10)
            casa_num = casa.get('numero', 0)
            if casa_num in [1, 4, 7, 10]:
                ax.plot([x1, x2], [y1, y2], color=t["ink"], linewidth=1.8, zorder=3)
            else:
                ax.plot([x1, x2], [y1, y2], color=t["ink"], linewidth=0.9, zorder=2, alpha=0.8)
            
            # Número de casa en el anillo medio
            angle_next = casas[(casa_num) % 12].get('cuspide', longitud + 30)
            angle_mid = (longitud + angle_next) / 2
            angle_mid_rad = math.radians(rot(angle_mid))
            
            radius_text = 0.65
            x_text = radius_text * math.cos(angle_mid_rad)
            y_text = radius_text * math.sin(angle_mid_rad)
            
            ax.text(x_text, y_text, str(casa_num),
                   fontsize=10, ha='center', va='center',
                   color=t["muted"], weight='bold', zorder=5)

    # Aspectos (líneas interiores) si están disponibles
    aspectos = carta_data.get("aspectos") or carta_data.get("aspects") or []
    if isinstance(aspectos, list) and aspectos:
        # Map de planeta -> longitud
        lon_by_name: Dict[str, float] = {}
        for nombre, datos in (planetas or {}).items():
            if not isinstance(datos, dict):
                continue
            try:
                lon_by_name[str(nombre)] = float(datos.get("longitud", 0.0))
            except Exception:
                continue

        def aspect_color(tipo: str) -> str:
            t0 = (tipo or "").lower()
            if "tríg" in t0 or "trig" in t0:
                return t["aspect_blue"]
            if "sext" in t0:
                return t["aspect_yellow"]
            if "cuad" in t0 or "square" in t0:
                return t["aspect_red"]
            if "opos" in t0 or "opposition" in t0:
                return t["aspect_red"]
            if "conj" in t0:
                return t["line"]
            return t["line"]

        r_aspect = 0.70
        for a in aspectos[:220]:
            if not isinstance(a, dict):
                continue
            p1 = a.get("planeta1") or a.get("p1") or a.get("from")
            p2 = a.get("planeta2") or a.get("p2") or a.get("to")
            tipo = a.get("tipo") or a.get("aspect") or ""
            if not p1 or not p2:
                continue
            if str(p1) not in lon_by_name or str(p2) not in lon_by_name:
                continue
            ang1 = math.radians(rot(lon_by_name[str(p1)]))
            ang2 = math.radians(rot(lon_by_name[str(p2)]))
            x1 = r_aspect * math.cos(ang1)
            y1 = r_aspect * math.sin(ang1)
            x2 = r_aspect * math.cos(ang2)
            y2 = r_aspect * math.sin(ang2)
            col = aspect_color(str(tipo))
            lw = 1.2 if (("opos" in str(tipo).lower()) or ("cuad" in str(tipo).lower())) else 0.9
            ax.plot([x1, x2], [y1, y2], color=col, linewidth=lw, alpha=0.75, zorder=2)
    
    # Dibujar planetas
    planeta_positions = []
    for nombre, datos in planetas.items():
        if not datos:
            continue
            
        longitud = datos.get('longitud', 0)
        angle_rad = math.radians(rot(longitud))
        
        # Posición en el anillo de planetas
        radius_planeta = 0.9
        x = radius_planeta * math.cos(angle_rad)
        y = radius_planeta * math.sin(angle_rad)
        
        # Evitar superposición (ajuste simple)
        adjusted = False
        for px, py in planeta_positions:
            dist = math.sqrt((x - px)**2 + (y - py)**2)
            if dist < 0.1:  # Demasiado cerca
                radius_planeta -= 0.05
                x = radius_planeta * math.cos(angle_rad)
                y = radius_planeta * math.sin(angle_rad)
                adjusted = True
                break
        
        planeta_positions.append((x, y))
        
        # Color según elemento del signo
        signo = datos.get('signo', 'Aries')
        elemento = SIGN_TO_ELEMENT.get(signo, 'Fuego')
        color = ELEMENT_COLORS.get(elemento, '#ffffff')
        
        # Círculo de fondo
        circle = Circle((x, y), 0.042, color="#ffffff", zorder=6, ec=t["line_soft"], lw=0.8)
        ax.add_patch(circle)
        
        # Símbolo del planeta
        simbolo = PLANET_SYMBOLS.get(nombre, nombre[0])
        ax.text(x, y, simbolo,
               fontsize=14, ha='center', va='center',
               color=color, weight='bold', zorder=7,
               family='DejaVu Sans')
        
        # Marcador de retrogradación
        if datos.get('retrogrado', False):
            ax.text(x + 0.06, y + 0.06, 'R',
                   fontsize=8, ha='center', va='center',
                   color=t["aspect_red"], weight='bold', zorder=7)
    
    # Ejes AC/DC/MC/IC en magenta (cosmograma)
    def draw_axis(lon: Optional[float], label: str) -> None:
        if lon is None:
            return
        a = math.radians(rot(float(lon)))
        ax.plot([0.0, 1.25 * math.cos(a)], [0.0, 1.25 * math.sin(a)], color=t["accent"], linewidth=2.0, zorder=3)
        ax.text(1.33 * math.cos(a), 1.33 * math.sin(a), label, fontsize=10, ha='center', va='center', color=t["accent"], weight='bold', zorder=4)

    asc = None
    mc = None
    try:
        asc = float((angulos.get("ascendente") or {}).get("longitud"))  # type: ignore
    except Exception:
        asc = None
    try:
        mc = float((angulos.get("medio_cielo") or {}).get("longitud"))  # type: ignore
    except Exception:
        mc = None

    if asc is not None:
        draw_axis(asc, "AC")
        draw_axis((asc + 180.0) % 360.0, "DC")
    if mc is not None:
        draw_axis(mc, "MC")
        draw_axis((mc + 180.0) % 360.0, "IC")
    
    # (MC/IC ya dibujado arriba)
    
    # Título
    datos_entrada = carta_data.get('datos_entrada', {})
    fecha = datos_entrada.get('fecha_local') or datos_entrada.get('fecha') or 'N/A'
    hora = datos_entrada.get('hora_local') or datos_entrada.get('hora') or ''
    nombre = datos_entrada.get('nombre') or ''
    titulo_base = f"Carta Natal - {fecha}" if hora == '' else f"Carta Natal - {fecha} {hora}"
    titulo = f"{titulo_base} - {nombre}" if nombre else titulo_base
    ax.text(0, -1.35, titulo,
           fontsize=14, ha='center', va='center',
           color=t["muted"], weight='bold', zorder=8)
    
    # Guardar en buffer
    buffer = BytesIO()
    plt.savefig(buffer, format=format, facecolor=t["bg"],
                edgecolor='none', bbox_inches='tight', dpi=dpi)
    plt.close(fig)
    buffer.seek(0)
    
    return buffer


def generate_chart_image_simple(
    carta_data: Dict,
    size: Tuple[int, int] = (800, 800)
) -> BytesIO:
    """
    Genera una imagen simple de carta astral usando Pillow
    Versión fallback si Matplotlib no está disponible
    
    Args:
        carta_data: Datos completos de la carta
        size: Tamaño en píxeles (ancho, alto)
        
    Returns:
        BytesIO buffer con la imagen
    """
    if not PIL_AVAILABLE:
        raise ImportError("Pillow no está instalado. Instala con: pip install Pillow")
    
    width, height = size
    center_x, center_y = width // 2, height // 2
    
    # Crear imagen
    img = Image.new('RGB', size, color='#0f1729')
    draw = ImageDraw.Draw(img)
    
    # Círculos concéntricos
    radii = [int(min(width, height) * 0.45), 
             int(min(width, height) * 0.40),
             int(min(width, height) * 0.35)]
    
    for i, radius in enumerate(radii):
        color = '#1e293b' if i % 2 == 0 else '#0f172a'
        draw.ellipse(
            [center_x - radius, center_y - radius, 
             center_x + radius, center_y + radius],
            outline='#334155',
            fill=color,
            width=2
        )
    
    # Divisiones de signos
    for i in range(12):
        angle = math.radians(i * 30)
        x1 = center_x + int(radii[2] * math.cos(angle))
        y1 = center_y + int(radii[2] * math.sin(angle))
        x2 = center_x + int(radii[0] * math.cos(angle))
        y2 = center_y + int(radii[0] * math.sin(angle))
        draw.line([x1, y1, x2, y2], fill='#475569', width=1)
    
    # Texto central
    datos_entrada = carta_data.get('datos_entrada', {})
    fecha = datos_entrada.get('fecha_local') or datos_entrada.get('fecha') or 'N/A'
    hora = datos_entrada.get('hora_local') or datos_entrada.get('hora') or ''
    nombre = datos_entrada.get('nombre') or ''
    linea_fecha = f"{fecha} {hora}".strip() if hora else fecha
    texto = f"Carta Natal\n{linea_fecha}" if not nombre else f"Carta Natal\n{nombre}\n{linea_fecha}"
    draw.text((center_x, center_y), texto, fill='#e2e8f0', anchor='mm')
    
    # Guardar en buffer
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    return buffer


def generate_chart_image(
    carta_data: Dict,
    size: Tuple[int, int] = (800, 800),
    method: str = 'matplotlib',
    **kwargs
) -> BytesIO:
    """
    Función principal para generar imagen de carta astral
    
    Args:
        carta_data: Datos completos de la carta
        size: Tamaño en píxeles (ancho, alto)
        method: 'matplotlib' (completo) o 'simple' (básico)
        **kwargs: Argumentos adicionales para el generador específico
        
    Returns:
        BytesIO buffer con la imagen
    """
    if method == 'matplotlib' and MATPLOTLIB_AVAILABLE:
        return generate_chart_image_matplotlib(carta_data, size=size, **kwargs)
    elif method == 'simple' and PIL_AVAILABLE:
        return generate_chart_image_simple(carta_data, size=size)
    elif MATPLOTLIB_AVAILABLE:
        # Fallback a matplotlib si está disponible
        return generate_chart_image_matplotlib(carta_data, size=size, **kwargs)
    elif PIL_AVAILABLE:
        # Fallback a simple si está disponible
        return generate_chart_image_simple(carta_data, size=size)
    else:
        raise ImportError("Ni Matplotlib ni Pillow están instalados. Instala al menos uno.")

