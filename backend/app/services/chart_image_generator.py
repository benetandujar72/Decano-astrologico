"""
Generador de imágenes de cartas astrales
Crea visualizaciones radiales profesionales de cartas natales
"""
from typing import Dict, List, Tuple
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

# Colores de elementos
ELEMENT_COLORS = {
    'Fuego': '#ef4444',
    'Tierra': '#10b981',
    'Aire': '#f59e0b',
    'Agua': '#3b82f6'
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
    format: str = 'png'
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
    
    # Crear figura
    fig_width = size[0] / dpi
    fig_height = size[1] / dpi
    fig, ax = plt.subplots(figsize=(fig_width, fig_height), dpi=dpi)
    ax.set_xlim(-1.5, 1.5)
    ax.set_ylim(-1.5, 1.5)
    ax.set_aspect('equal')
    ax.axis('off')
    
    # Fondo
    ax.add_patch(Circle((0, 0), 1.45, color='#0f1729', zorder=0))
    
    # Círculos concéntricos
    circles_radii = [1.0, 0.95, 0.85, 0.75]
    for i, radius in enumerate(circles_radii):
        color = '#1e293b' if i % 2 == 0 else '#0f172a'
        circle = Circle((0, 0), radius, fill=True, edgecolor='#334155', 
                       facecolor=color, linewidth=1, zorder=1)
        ax.add_patch(circle)
    
    # Dibujar divisiones de signos (12 secciones de 30°)
    for i in range(12):
        angle_deg = i * 30
        angle_rad = math.radians(angle_deg)
        x1 = 0.75 * math.cos(angle_rad)
        y1 = 0.75 * math.sin(angle_rad)
        x2 = 1.0 * math.cos(angle_rad)
        y2 = 1.0 * math.sin(angle_rad)
        ax.plot([x1, x2], [y1, y2], color='#475569', linewidth=1, zorder=2)
    
    # Dibujar símbolos de signos en el anillo exterior
    signos = list(ZODIAC_SYMBOLS.keys())
    for i, signo in enumerate(signos):
        # Calcular ángulo (empezando desde Aries en 0°)
        angle_deg = i * 30 + 15  # Centro del signo
        angle_rad = math.radians(angle_deg)
        
        # Posición en el círculo exterior
        radius = 1.15
        x = radius * math.cos(angle_rad)
        y = radius * math.sin(angle_rad)
        
        # Color según elemento
        elemento = SIGN_TO_ELEMENT.get(signo, 'Fuego')
        color = ELEMENT_COLORS.get(elemento, '#ffffff')
        
        # Dibujar símbolo
        ax.text(x, y, ZODIAC_SYMBOLS[signo], 
                fontsize=16, ha='center', va='center',
                color=color, weight='bold', zorder=4,
                family='DejaVu Sans')
    
    # Dibujar cúspides de casas
    if casas:
        for casa in casas:
            longitud = casa.get('cuspide', 0)
            # Convertir longitud a ángulo (0° Aries = 0°, luego sentido antihorario)
            angle_rad = math.radians(longitud)
            
            # Línea de cúspide
            x1 = 0.0 * math.cos(angle_rad)
            y1 = 0.0 * math.sin(angle_rad)
            x2 = 0.75 * math.cos(angle_rad)
            y2 = 0.75 * math.sin(angle_rad)
            
            # Línea más gruesa para casas angulares (1, 4, 7, 10)
            casa_num = casa.get('numero', 0)
            if casa_num in [1, 4, 7, 10]:
                ax.plot([x1, x2], [y1, y2], color='#f59e0b', linewidth=2, zorder=3)
            else:
                ax.plot([x1, x2], [y1, y2], color='#64748b', linewidth=1, zorder=2)
            
            # Número de casa en el anillo medio
            angle_next = casas[(casa_num) % 12].get('cuspide', longitud + 30)
            angle_mid = (longitud + angle_next) / 2
            angle_mid_rad = math.radians(angle_mid)
            
            radius_text = 0.65
            x_text = radius_text * math.cos(angle_mid_rad)
            y_text = radius_text * math.sin(angle_mid_rad)
            
            ax.text(x_text, y_text, str(casa_num),
                   fontsize=10, ha='center', va='center',
                   color='#94a3b8', weight='bold', zorder=5)
    
    # Dibujar planetas
    planeta_positions = []
    for nombre, datos in planetas.items():
        if not datos:
            continue
            
        longitud = datos.get('longitud', 0)
        angle_rad = math.radians(longitud)
        
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
        circle = Circle((x, y), 0.04, color='#1e293b', zorder=6)
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
                   color='#ef4444', weight='bold', zorder=7)
    
    # Dibujar ascendente (línea especial)
    if angulos and 'ascendente' in angulos:
        asc_lon = angulos['ascendente'].get('longitud', 0)
        angle_rad = math.radians(asc_lon)
        x1 = 0.0
        y1 = 0.0
        x2 = 1.0 * math.cos(angle_rad)
        y2 = 1.0 * math.sin(angle_rad)
        ax.plot([x1, x2], [y1, y2], color='#22d3ee', linewidth=3, zorder=3)
        
        # Etiqueta ASC
        x_label = 1.08 * math.cos(angle_rad)
        y_label = 1.08 * math.sin(angle_rad)
        ax.text(x_label, y_label, 'ASC',
               fontsize=10, ha='center', va='center',
               color='#22d3ee', weight='bold', zorder=4)
    
    # Dibujar medio cielo
    if angulos and 'medio_cielo' in angulos:
        mc_lon = angulos['medio_cielo'].get('longitud', 0)
        angle_rad = math.radians(mc_lon)
        x1 = 0.0
        y1 = 0.0
        x2 = 1.0 * math.cos(angle_rad)
        y2 = 1.0 * math.sin(angle_rad)
        ax.plot([x1, x2], [y1, y2], color='#a78bfa', linewidth=3, zorder=3)
        
        # Etiqueta MC
        x_label = 1.08 * math.cos(angle_rad)
        y_label = 1.08 * math.sin(angle_rad)
        ax.text(x_label, y_label, 'MC',
               fontsize=10, ha='center', va='center',
               color='#a78bfa', weight='bold', zorder=4)
    
    # Título
    datos_entrada = carta_data.get('datos_entrada', {})
    titulo = f"Carta Natal - {datos_entrada.get('fecha', 'N/A')}"
    ax.text(0, -1.35, titulo,
           fontsize=14, ha='center', va='center',
           color='#e2e8f0', weight='bold', zorder=8)
    
    # Guardar en buffer
    buffer = BytesIO()
    plt.savefig(buffer, format=format, facecolor='#0f1729', 
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
    texto = f"Carta Natal\n{datos_entrada.get('fecha', 'N/A')}"
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

