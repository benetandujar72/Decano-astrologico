"""
Generador de imágenes 3D de cartas astrales (EXPERIMENTAL)
Visualización interactiva y moderna con Plotly
"""
from typing import Dict
from io import BytesIO
import math

try:
    import plotly.graph_objects as go
    import plotly.io as pio
    PLOTLY_AVAILABLE = True
except ImportError:
    PLOTLY_AVAILABLE = False
    print("⚠️ Plotly no disponible. Instala con: pip install plotly kaleido")


# Símbolos de planetas
PLANET_SYMBOLS = {
    'Sol': '☉', 'Luna': '☽', 'Mercurio': '☿', 'Venus': '♀', 'Marte': '♂',
    'Júpiter': '♃', 'Saturno': '♄', 'Urano': '♅', 'Neptuno': '♆', 'Plutón': '♇',
    'Quirón': '⚷', 'Lilith med.': '⚸', 'Nodo Norte': '☊'
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


def generate_chart_3d_interactive(carta_data: Dict) -> str:
    """
    Genera una carta astral 3D interactiva con Plotly (HTML)
    
    Args:
        carta_data: Datos completos de la carta
        
    Returns:
        String HTML con la visualización interactiva
    """
    if not PLOTLY_AVAILABLE:
        raise ImportError("Plotly no está instalado. Instala con: pip install plotly")
    
    # Extraer datos
    planetas = carta_data.get('planetas', {})
    casas = carta_data.get('casas', [])
    angulos = carta_data.get('angulos', {})
    datos = carta_data.get('datos_entrada', {})
    
    # Crear figura 3D
    fig = go.Figure()
    
    # Esfera central (tierra)
    u = [i for i in range(0, 360, 10)]
    v = [i for i in range(0, 180, 10)]
    
    x_sphere = []
    y_sphere = []
    z_sphere = []
    
    for ui in u:
        x_row = []
        y_row = []
        z_row = []
        for vi in v:
            x_row.append(0.3 * math.sin(math.radians(vi)) * math.cos(math.radians(ui)))
            y_row.append(0.3 * math.sin(math.radians(vi)) * math.sin(math.radians(ui)))
            z_row.append(0.3 * math.cos(math.radians(vi)))
        x_sphere.append(x_row)
        y_sphere.append(y_row)
        z_sphere.append(z_row)
    
    fig.add_trace(go.Surface(
        x=x_sphere,
        y=y_sphere,
        z=z_sphere,
        colorscale=[[0, '#1e293b'], [1, '#0f172a']],
        showscale=False,
        name='Centro',
        hoverinfo='skip'
    ))
    
    # Añadir planetas en órbitas esféricas
    for nombre, datos_planeta in planetas.items():
        if not datos_planeta:
            continue
        
        longitud = datos_planeta.get('longitud', 0)
        signo = datos_planeta.get('signo', 'Aries')
        
        # Convertir longitud a coordenadas esféricas
        # Radio basado en orden planetario
        radios = {
            'Luna': 0.5, 'Mercurio': 0.6, 'Venus': 0.7, 'Sol': 0.75,
            'Marte': 0.8, 'Júpiter': 0.9, 'Saturno': 1.0,
            'Urano': 1.1, 'Neptuno': 1.2, 'Plutón': 1.3,
            'Quirón': 0.85, 'Lilith med.': 0.55, 'Nodo Norte': 0.95
        }
        
        radio = radios.get(nombre, 1.0)
        
        # Convertir longitud eclíptica a coordenadas 3D
        theta = math.radians(longitud)  # Longitud
        phi = math.radians(90)  # Latitud (plano eclíptico)
        
        x = radio * math.sin(phi) * math.cos(theta)
        y = radio * math.sin(phi) * math.sin(theta)
        z = radio * math.cos(phi)
        
        # Color según elemento
        elemento = SIGN_TO_ELEMENT.get(signo, 'Fuego')
        color = ELEMENT_COLORS.get(elemento, '#ffffff')
        
        # Añadir planeta
        simbolo = PLANET_SYMBOLS.get(nombre, nombre[0])
        hover_text = f"{nombre}<br>{datos_planeta['texto']}<br>Casa {datos_planeta.get('casa', '?')}"
        if datos_planeta.get('retrogrado', False):
            hover_text += "<br>Retrógrado"
        
        fig.add_trace(go.Scatter3d(
            x=[x],
            y=[y],
            z=[z],
            mode='markers+text',
            marker=dict(
                size=15,
                color=color,
                symbol='circle',
                line=dict(color='white', width=2)
            ),
            text=[simbolo],
            textposition='middle center',
            textfont=dict(size=12, color='white'),
            name=nombre,
            hovertext=hover_text,
            hoverinfo='text'
        ))
        
        # Línea desde el centro al planeta (órbita)
        fig.add_trace(go.Scatter3d(
            x=[0, x],
            y=[0, y],
            z=[0, z],
            mode='lines',
            line=dict(color=color, width=1, dash='dot'),
            showlegend=False,
            hoverinfo='skip'
        ))
    
    # Configuración de layout
    fig.update_layout(
        title=dict(
            text=f"Carta Astral 3D - {datos.get('fecha', 'N/A')}",
            x=0.5,
            xanchor='center',
            font=dict(size=20, color='white')
        ),
        scene=dict(
            xaxis=dict(visible=False, range=[-1.5, 1.5]),
            yaxis=dict(visible=False, range=[-1.5, 1.5]),
            zaxis=dict(visible=False, range=[-1.5, 1.5]),
            bgcolor='#0f1729',
            camera=dict(
                eye=dict(x=1.5, y=1.5, z=1.5),
                center=dict(x=0, y=0, z=0)
            ),
            aspectmode='cube'
        ),
        paper_bgcolor='#0f1729',
        plot_bgcolor='#0f1729',
        font=dict(color='white'),
        showlegend=True,
        legend=dict(
            x=0.02,
            y=0.98,
            bgcolor='rgba(15, 23, 41, 0.8)',
            bordercolor='white',
            borderwidth=1
        ),
        height=800,
        margin=dict(l=0, r=0, t=50, b=0)
    )
    
    # Convertir a HTML
    html = pio.to_html(fig, include_plotlyjs='cdn', full_html=True)
    
    return html


def generate_chart_3d_static(carta_data: Dict, format: str = 'png') -> BytesIO:
    """
    Genera una imagen estática 3D de la carta astral
    
    Args:
        carta_data: Datos completos de la carta
        format: Formato de salida ('png', 'jpg', 'svg')
        
    Returns:
        BytesIO buffer con la imagen
    """
    if not PLOTLY_AVAILABLE:
        raise ImportError("Plotly no está instalado. Instala con: pip install plotly kaleido")
    
    # Generar HTML interactivo
    html = generate_chart_3d_interactive(carta_data)
    
    # Extraer la figura (requiere kaleido para conversión)
    try:
        import plotly.graph_objects as go
        from plotly.io import write_image
        
        # Re-crear figura para exportación
        # (Simplificado - en producción reutilizar la función)
        planetas = carta_data.get('planetas', {})
        fig = go.Figure()
        
        # Añadir planetas (versión simplificada)
        for nombre, datos_planeta in planetas.items():
            if not datos_planeta:
                continue
            
            longitud = datos_planeta.get('longitud', 0)
            theta = math.radians(longitud)
            phi = math.radians(90)
            radio = 1.0
            
            x = radio * math.sin(phi) * math.cos(theta)
            y = radio * math.sin(phi) * math.sin(theta)
            z = radio * math.cos(phi)
            
            fig.add_trace(go.Scatter3d(
                x=[x], y=[y], z=[z],
                mode='markers',
                marker=dict(size=10)
            ))
        
        fig.update_layout(
            scene=dict(
                xaxis=dict(visible=False),
                yaxis=dict(visible=False),
                zaxis=dict(visible=False)
            )
        )
        
        # Guardar en buffer
        buffer = BytesIO()
        write_image(fig, buffer, format=format, width=800, height=800)
        buffer.seek(0)
        
        return buffer
        
    except ImportError:
        raise ImportError("Kaleido no está instalado. Instala con: pip install kaleido")


def generate_chart_3d(carta_data: Dict, interactive: bool = True, **kwargs) -> any:
    """
    Función principal para generar carta astral 3D
    
    Args:
        carta_data: Datos completos de la carta
        interactive: Si True retorna HTML interactivo, si False retorna imagen estática
        **kwargs: Argumentos adicionales (format para estático)
        
    Returns:
        HTML string (interactivo) o BytesIO (estático)
    """
    if not PLOTLY_AVAILABLE:
        raise ImportError("Plotly no está instalado. Instala con: pip install plotly")
    
    if interactive:
        return generate_chart_3d_interactive(carta_data)
    else:
        return generate_chart_3d_static(carta_data, format=kwargs.get('format', 'png'))

