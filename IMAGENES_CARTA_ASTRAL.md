# 🎨 Generación de Imágenes de Carta Astral

## 📋 Resumen

El sistema ahora genera automáticamente **imágenes visuales de la carta astral** que se incluyen en los informes PDF y HTML.

---

## ✨ Características

### 🌟 Visualización 2D (Radial)

**Motor:** Matplotlib  
**Estilo:** Profesional, estilo tradicional

**Características:**
- ✅ Círculos concéntricos con diseño moderno
- ✅ 12 divisiones del zodiaco con símbolos
- ✅ Planetas posicionados por longitud eclíptica
- ✅ Colores según elementos (Fuego, Tierra, Aire, Agua)
- ✅ Cúspides de casas (Placidus)
- ✅ Ascendente y Medio Cielo destacados
- ✅ Indicador de retrogradación
- ✅ Evita superposición de planetas

**Resolución:** 800x800 píxeles (configurable)  
**Formato:** PNG de alta calidad

### 🌐 Visualización 3D (EXPERIMENTAL)

**Motor:** Plotly  
**Estilo:** Interactivo, moderno, espacial

**Características:**
- ✅ Visualización esférica 3D
- ✅ Planetas en órbitas a diferentes radios
- ✅ Interactivo (rotar, zoom, pan)
- ✅ Hover con información detallada
- ✅ Colores según elementos
- ✅ Líneas de órbita desde el centro
- ✅ Exportable a HTML interactivo

**Formatos:**
- HTML interactivo (con JavaScript)
- PNG estático (requiere Kaleido)
- SVG vectorial (requiere Kaleido)

---

## 📦 Instalación

### Dependencias Básicas (2D)

```bash
pip install matplotlib numpy Pillow
```

**Incluido en:** `requirements.txt` (ya instalado)

### Dependencias 3D (Opcional)

```bash
pip install plotly kaleido
```

**Nota:** No incluido por defecto. Instalar solo si necesitas visualización 3D.

---

## 🚀 Uso Automático

Las imágenes se generan **automáticamente** al crear informes:

### En Informes PDF

La carta astral aparece en la página 1, después de los datos personales:

```
📋 Datos Personales
   └─ Fecha, Hora, Ubicación

🌟 Carta Astral Visual
   └─ [IMAGEN DE LA CARTA] ← AQUÍ

🪐 Posiciones Planetarias
   └─ Tabla completa...
```

### En Informes HTML

La carta aparece como imagen incrustada (base64):

```html
<h2>🌟 Carta Astral Visual</h2>
<div style="text-align: center;">
    <img src="data:image/png;base64,..." alt="Carta Astral">
</div>
```

### En Informes DOCX

*(Por implementar)*  
La imagen puede añadirse usando `python-docx` con el mismo método.

---

## 🎨 Ejemplos Visuales

### Carta 2D (Matplotlib)

```
        ♈ ♉ ♊
      ♓ ┌───┐ ♋
    ♒ │ ┌─┐ │ ♌
      │ │☉│ │
    ♑ │ └─┘ │ ♍
      ♐ └───┘ ♎
        ♏
```

**Características visuales:**
- Fondo oscuro (#0f1729)
- Círculos en tonos azul/gris
- Signos del zodiaco en color según elemento
- Planetas con colores del elemento de su signo
- Líneas de casas en gris/dorado (angulares en dorado)
- ASC en cian (#22d3ee)
- MC en violeta (#a78bfa)

### Carta 3D (Plotly)

```
         ♅
        /|\
       / | \
      ☿  ☉  ♀
     /   |   \
    ♄----⊕----♂
     \   |   /
      ♃  ☽  ♆
       \ | /
        \|/
         ♇
```

**Características visuales:**
- Esfera central representando la Tierra
- Planetas en órbitas esféricas
- Líneas punteadas conectando centro a planetas
- Rotación interactiva con mouse
- Hover muestra datos completos

---

## 🔧 Uso Programático

### Generar Imagen 2D

```python
from app.services.chart_image_generator import generate_chart_image

# Generar imagen
chart_image = generate_chart_image(
    carta_data=carta_completa,
    size=(800, 800),
    method='matplotlib',  # o 'simple' para fallback
    dpi=100,
    format='png'
)

# Guardar archivo
with open('carta.png', 'wb') as f:
    f.write(chart_image.read())
```

### Generar Imagen 3D Interactiva

```python
from app.services.chart_image_3d import generate_chart_3d

# HTML interactivo
html_3d = generate_chart_3d(
    carta_data=carta_completa,
    interactive=True
)

# Guardar HTML
with open('carta_3d.html', 'w', encoding='utf-8') as f:
    f.write(html_3d)
```

### Generar Imagen 3D Estática

```python
# PNG estático (requiere kaleido)
image_3d = generate_chart_3d(
    carta_data=carta_completa,
    interactive=False,
    format='png'
)

# Guardar archivo
with open('carta_3d.png', 'wb') as f:
    f.write(image_3d.read())
```

---

## 🎨 Personalización

### Cambiar Tamaño

```python
# Imagen más grande
chart_image = generate_chart_image(
    carta_data,
    size=(1200, 1200),  # ← Tamaño personalizado
    dpi=150
)
```

### Cambiar Colores

Edita `backend/app/services/chart_image_generator.py`:

```python
# Colores de elementos
ELEMENT_COLORS = {
    'Fuego': '#ff0000',    # Rojo puro
    'Tierra': '#00ff00',   # Verde puro
    'Aire': '#ffff00',     # Amarillo puro
    'Agua': '#0000ff'      # Azul puro
}
```

### Añadir Aspectos Planetarios

```python
# En generate_chart_image_matplotlib, después de dibujar planetas:

# Calcular aspectos (conjunción, oposición, etc.)
for i, (nombre1, datos1) in enumerate(planetas.items()):
    for nombre2, datos2 in list(planetas.items())[i+1:]:
        diff = abs(datos1['longitud'] - datos2['longitud'])
        
        # Conjunción (0°, orbe ±8°)
        if diff < 8 or diff > 352:
            # Dibujar línea entre planetas
            x1, y1 = posicion_planeta1
            x2, y2 = posicion_planeta2
            ax.plot([x1, x2], [y1, y2], 
                   color='#ff0000', linewidth=2, 
                   linestyle='solid', zorder=2)
```

---

## 📊 Rendimiento

| Operación | Tiempo | Memoria |
|-----------|--------|---------|
| Generar imagen 2D | ~200-500ms | ~50MB |
| Incluir en PDF | +100-200ms | +10MB |
| Incluir en HTML (base64) | +50-100ms | +5MB |
| Generar 3D interactivo | ~500-1000ms | ~100MB |
| Exportar 3D a PNG | ~2-3s | ~200MB |

**Optimización:**  
La imagen se genera una sola vez en `__init__` del `ReportGenerator` y se reutiliza para todos los formatos.

---

## 🐛 Solución de Problemas

### Error: "matplotlib not found"

```bash
pip install matplotlib numpy
```

### Error: "Font not found" (símbolos no se ven)

**Windows:**
- Los símbolos Unicode deberían funcionar con DejaVu Sans
- Si no, instala fuentes: Arial Unicode MS o Segoe UI Symbol

**Linux:**
```bash
sudo apt-get install fonts-dejavu fonts-noto
```

**Mac:**
- Fuentes incluidas por defecto

### Error: "plotly not found" (3D)

```bash
pip install plotly kaleido
```

### Error: "kaleido not found" (exportación 3D estática)

```bash
pip install kaleido
```

**Alternativa:** Usa solo HTML interactivo (no requiere kaleido)

### La imagen no aparece en PDF

**Causa:** Error al generar imagen  
**Solución:** Revisa logs del servidor

```bash
# Debería ver:
[REPORTS] Generando informe en formato: pdf
# Sin errores de imagen
```

### La imagen se ve pixelada

```python
# Aumenta DPI
chart_image = generate_chart_image(
    carta_data,
    dpi=150  # ← Mayor resolución
)
```

---

## 🎯 Comparación: 2D vs 3D

| Característica | 2D (Matplotlib) | 3D (Plotly) |
|----------------|-----------------|-------------|
| **Estilo** | Tradicional, profesional | Moderno, espacial |
| **Interactividad** | No | Sí (HTML) |
| **Tamaño archivo** | ~100KB (PNG) | ~500KB (HTML) |
| **Compatibilidad** | Universal (PDF, print) | Solo web |
| **Tiempo generación** | Rápido (~300ms) | Medio (~800ms) |
| **Dependencias** | Incluidas | Opcional |
| **Uso recomendado** | Informes oficiales | Presentaciones web |

---

## 📚 Futuras Mejoras

### Corto Plazo
- [ ] Añadir aspectos planetarios (líneas entre planetas)
- [ ] Incluir imagen en informes DOCX
- [ ] Opciones de colores personalizables desde API

### Medio Plazo
- [ ] Gráfico de aspectos separado
- [ ] Animación de tránsitos
- [ ] Comparación de cartas (sinastría)

### Largo Plazo
- [ ] Visualización 3D con Three.js (más rápido)
- [ ] Realidad Aumentada (AR)
- [ ] Exportación a video (animación)

---

## 💡 Ejemplos de Uso

### Caso 1: Informe para Cliente

```python
# Generar informe PDF con carta visual
report = generate_report(
    carta_data=carta_completa,
    format='pdf',
    analysis_text=analisis_completo
)

# ✅ La carta astral se incluye automáticamente en página 1
```

### Caso 2: Presentación Web Interactiva

```python
# Generar HTML con carta 3D interactiva
html_3d = generate_chart_3d(carta_completa, interactive=True)

# Servir como página web
from fastapi.responses import HTMLResponse

@app.get("/carta-3d/{chart_id}")
async def get_chart_3d(chart_id: str):
    carta = get_chart_from_db(chart_id)
    html = generate_chart_3d(carta, interactive=True)
    return HTMLResponse(content=html)
```

### Caso 3: Imagen para Redes Sociales

```python
# Generar imagen 2D en alta resolución
chart_image = generate_chart_image(
    carta_data,
    size=(1080, 1080),  # Instagram
    dpi=150
)

# Guardar y compartir
with open('carta_instagram.png', 'wb') as f:
    f.write(chart_image.read())
```

---

## 🎉 Conclusión

El sistema ahora genera automáticamente:

✅ **Imágenes 2D profesionales** (Matplotlib) - Incluidas en PDF/HTML  
✅ **Visualizaciones 3D interactivas** (Plotly) - Opcional para web  
✅ **Integración automática** en informes  
✅ **Personalización** fácil de colores y estilos  
✅ **Alto rendimiento** con generación única y reutilización  

**¡Las cartas astrales ahora tienen representación visual completa!** 🌟

