"""
Generador de portadas únicas para informes astrológicos
Estilo místico y profesional
"""
from typing import Dict
from io import BytesIO
from datetime import datetime

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import inch
    from reportlab.pdfgen import canvas as pdf_canvas
    from reportlab.lib import colors
    from reportlab.lib.colors import HexColor
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
    import math
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False


def generate_mystical_cover(
    nombre: str,
    fecha: str,
    hora: str,
    lugar: str,
    tipo_analisis: str = "Carta Natal",
    ascendente: str = "",
    sol_signo: str = "",
    luna_signo: str = ""
) -> BytesIO:
    """
    Genera una portada mística única para el informe
    
    Args:
        nombre: Nombre del consultante
        fecha: Fecha de nacimiento
        hora: Hora de nacimiento
        lugar: Lugar de nacimiento
        tipo_analisis: Tipo de análisis (Carta Natal, Revolución Solar, etc.)
        ascendente: Signo del ascendente
        sol_signo: Signo solar
        luna_signo: Signo lunar
        
    Returns:
        BytesIO con la imagen de portada
    """
    if not PIL_AVAILABLE:
        raise ImportError("Pillow no está instalado")
    
    # Tamaño A4 en píxeles (300 DPI)
    width, height = 2480, 3508
    
    # Crear imagen base con gradiente místico
    img = Image.new('RGB', (width, height), color='#0a0e27')
    draw = ImageDraw.Draw(img)
    
    # Gradiente de fondo (negro azulado a morado)
    for y in range(height):
        progress = y / height
        r = int(10 + (60 * progress))
        g = int(14 + (30 * progress))
        b = int(39 + (90 * progress))
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    
    # Añadir estrellas aleatorias
    import random
    random.seed(hash(nombre + fecha))  # Semilla única por persona
    for _ in range(300):
        x = random.randint(0, width)
        y = random.randint(0, height // 2)
        size = random.randint(1, 3)
        brightness = random.randint(150, 255)
        draw.ellipse([x, y, x+size, y+size], fill=(brightness, brightness, brightness))
    
    # Círculo místico central
    center_x, center_y = width // 2, height // 3
    radius = 400
    
    # Círculos concéntricos con degradado
    for i in range(5):
        r = radius - (i * 60)
        alpha = 30 + (i * 15)
        color = HexColor(f'#667eea')
        
        # Círculo exterior dorado
        draw.ellipse(
            [center_x - r, center_y - r, center_x + r, center_y + r],
            outline=(102, 126, 234, alpha),
            width=2
        )
    
    # Símbolo zodiacal en el centro (rueda)
    zodiac_radius = 300
    signos = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓']
    
    try:
        # Intentar usar fuente con soporte Unicode
        font_zodiac = ImageFont.truetype("seguisym.ttf", 60)
    except:
        font_zodiac = ImageFont.load_default()
    
    for i, signo in enumerate(signos):
        angle = math.radians(i * 30 - 90)
        x = center_x + int(zodiac_radius * math.cos(angle))
        y = center_y + int(zodiac_radius * math.sin(angle))
        
        # Color dorado para los signos
        bbox = draw.textbbox((x, y), signo, font=font_zodiac, anchor="mm")
        draw.text((x, y), signo, fill=(255, 215, 0), font=font_zodiac, anchor="mm")
    
    # Fuentes
    try:
        font_title = ImageFont.truetype("arial.ttf", 120)
        font_subtitle = ImageFont.truetype("arial.ttf", 60)
        font_name = ImageFont.truetype("arialbd.ttf", 80)
        font_details = ImageFont.truetype("arial.ttf", 45)
        font_logo = ImageFont.truetype("times.ttf", 70) # Para logo Jon Landeta
    except:
        font_title = ImageFont.load_default()
        font_subtitle = font_title
        font_name = font_title
        font_details = font_title
        font_logo = font_title
    
    # --- LOGO JON LANDETA (Superior Izquierda) ---
    logo_x = 150
    logo_y = 150
    draw.text((logo_x, logo_y), "JON LANDETA", fill=(255, 215, 0), font=font_logo, anchor="lt")
    draw.text((logo_x, logo_y + 80), "ASTROLOGÍA", fill=(200, 200, 200), font=font_details, anchor="lt")

    # --- FOTO DEL USUARIO (Placeholder) ---
    # Círculo para la foto debajo del título principal o en el centro si se prefiere
    # El usuario pidió "una foto". Pondremos un placeholder circular en el centro del mandala
    photo_radius = 150
    draw.ellipse(
        [center_x - photo_radius, center_y - photo_radius, center_x + photo_radius, center_y + photo_radius],
        fill=(20, 20, 40),
        outline=(255, 215, 0),
        width=3
    )
    # Texto "FOTO" en el centro
    draw.text((center_x, center_y), "FOTO", fill=(100, 100, 100), font=font_details, anchor="mm")

    # Título "FRAKTAL"
    title_y = height // 12 + 100 # Bajamos un poco por el logo
    draw.text(
        (width // 2, title_y),
        "FRAKTAL",
        fill=(255, 215, 0),
        font=font_title,
        anchor="mm"
    )
    
    # Subtítulo
    subtitle_y = title_y + 100
    draw.text(
        (width // 2, subtitle_y),
        "Arquitectura Astrológica Sistémica",
        fill=(200, 200, 255),
        font=font_subtitle,
        anchor="mm"
    )
    
    # Línea decorativa
    line_y = subtitle_y + 80
    margin = width // 4
    draw.line(
        [(margin, line_y), (width - margin, line_y)],
        fill=(102, 126, 234),
        width=3
    )
    
    # Nombre del consultante (debajo del círculo zodiacal)
    name_y = center_y + radius + 150
    draw.text(
        (width // 2, name_y),
        nombre.upper(),
        fill=(255, 255, 255),
        font=font_name,
        anchor="mm"
    )
    
    # Tipo de análisis
    tipo_y = name_y + 100
    draw.text(
        (width // 2, tipo_y),
        tipo_analisis.upper(),
        fill=(167, 139, 250),
        font=font_subtitle,
        anchor="mm"
    )
    
    # Datos de nacimiento (en la parte inferior)
    details_y = height - 700
    details = [
        f"📅  {fecha}  |  🕐  {hora}",
        f"🌍  {lugar}",
        ""
    ]
    
    if ascendente:
        details.append(f"↗️  Ascendente {ascendente}")
    if sol_signo:
        details.append(f"☉  Sol en {sol_signo}")
    if luna_signo:
        details.append(f"☽  Luna en {luna_signo}")
    
    for i, detail in enumerate(details):
        if detail:
            y = details_y + (i * 70)
            draw.text(
                (width // 2, y),
                detail,
                fill=(200, 200, 200),
                font=font_details,
                anchor="mm"
            )
    
    # Fecha de generación y Jon Landeta (Footer)
    footer_y = height - 200
    fecha_generacion = datetime.now().strftime("%d de %B de %Y - %H:%M")
    meses = {
        'January': 'Enero', 'February': 'Febrero', 'March': 'Marzo',
        'April': 'Abril', 'May': 'Mayo', 'June': 'Junio',
        'July': 'Julio', 'August': 'Agosto', 'September': 'Septiembre',
        'October': 'Octubre', 'November': 'Noviembre', 'December': 'Diciembre'
    }
    for en, es in meses.items():
        fecha_generacion = fecha_generacion.replace(en, es)
    
    # Footer con nombre de Jon Landeta y fecha
    draw.text(
        (width // 2, footer_y),
        f"Realizado por Jon Landeta",
        fill=(255, 215, 0),
        font=font_subtitle,
        anchor="mm"
    )
    
    draw.text(
        (width // 2, footer_y + 80),
        f"Generado el {fecha_generacion}",
        fill=(150, 150, 150),
        font=font_details,
        anchor="mm"
    )
    
    # Aplicar efecto de brillo suave
    img = img.filter(ImageFilter.SMOOTH)
    
    # Guardar en buffer
    buffer = BytesIO()
    img.save(buffer, format='PNG', quality=95, dpi=(300, 300))
    buffer.seek(0)
    
    return buffer


def add_cover_to_pdf(pdf_buffer: BytesIO, cover_image: BytesIO) -> BytesIO:
    """
    Añade una portada a un PDF existente
    
    Args:
        pdf_buffer: Buffer del PDF original
        cover_image: Buffer de la imagen de portada
        
    Returns:
        Nuevo buffer del PDF con portada
    """
    try:
        from PyPDF2 import PdfMerger, PdfReader
        from reportlab.pdfgen import canvas as pdf_canvas
        from reportlab.lib.pagesizes import A4
        
        # Crear PDF de portada
        cover_pdf_buffer = BytesIO()
        c = pdf_canvas.Canvas(cover_pdf_buffer, pagesize=A4)
        
        # Añadir imagen de portada
        cover_image.seek(0)
        c.drawImage(
            cover_image,
            0, 0,
            width=A4[0],
            height=A4[1],
            preserveAspectRatio=True
        )
        c.save()
        cover_pdf_buffer.seek(0)
        
        # Combinar PDFs
        merger = PdfMerger()
        merger.append(cover_pdf_buffer)
        merger.append(pdf_buffer)
        
        # Crear buffer final
        final_buffer = BytesIO()
        merger.write(final_buffer)
        merger.close()
        final_buffer.seek(0)
        
        return final_buffer
        
    except ImportError:
        print("⚠️ PyPDF2 no disponible. Instala con: pip install PyPDF2")
        return pdf_buffer

