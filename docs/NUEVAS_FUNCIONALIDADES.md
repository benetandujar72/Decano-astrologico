# 🌟 Nuevas Funcionalidades - Sistema de Efemérides y Exportación

## 📋 Resumen

Se han implementado mejoras críticas en el sistema Fraktal para calcular efemérides astrológicas con **precisión profesional** y generar informes en **múltiples formatos**.

---

## ✨ Características Implementadas

### 1. 🔭 Motor de Efemérides Swiss Ephemeris

**Ubicación:** `backend/app/services/ephemeris.py`

#### Características:
- ✅ Precisión astronómica profesional con **Swiss Ephemeris** (estándar de la industria)
- ✅ Cálculo de **13 cuerpos celestes**:
  - Sol, Luna, Mercurio, Venus, Marte, Júpiter, Saturno, Urano, Neptuno, Plutón
  - Quirón (nuevo)
  - Lilith Media (nuevo)
  - Nodo Norte (verdadero)
- ✅ Sistema de casas **Placidus**
- ✅ Detección automática de **retrogradación**
- ✅ Cálculo de **Parte de Fortuna** (fórmulas diurna/nocturna)
- ✅ Conversión automática de zonas horarias
- ✅ Asignación automática de planetas a casas

#### Funciones Principales:

```python
# Calcular carta completa
from app.services.ephemeris import calcular_carta_completa

carta = calcular_carta_completa(
    fecha="1990-01-15",
    hora="14:30",
    latitud=40.4168,
    longitud=-3.7038,
    zona_horaria="Europe/Madrid"
)
```

---

### 2. 🔌 Endpoints de Backend

#### 2.1. Cálculo de Carta Astral

**Endpoint:** `POST /ephemeris/calculate`

**Request:**
```json
{
  "fecha": "1990-01-15",
  "hora": "14:30",
  "latitud": 40.4168,
  "longitud": -3.7038,
  "zona_horaria": "Europe/Madrid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "datos_entrada": { ... },
    "planetas": { ... },
    "casas": [ ... ],
    "angulos": { ... }
  },
  "texto_legible": "..."
}
```

#### 2.2. Test de Efemérides

**Endpoint:** `GET /ephemeris/test`

Útil para verificar que el servicio funciona correctamente con datos de ejemplo.

---

### 3. 📄 Generación de Informes Multi-Formato

**Ubicación:** `backend/app/services/report_generators.py`

#### Formatos Soportados:

| Formato | Descripción | Características |
|---------|-------------|-----------------|
| **Web / HTML** | Página web interactiva | Estilos CSS, responsive, imprimible |
| **PDF** | Documento profesional | ReportLab, tablas, colores, paginado |
| **DOCX** | Word editable | Compatible Office, tablas, formato |
| **Markdown** | Texto estructurado | Compatible Git, editable, portable |

#### Contenido de Informes:

✅ **Datos Personales** (fecha, hora, ubicación, zona horaria)  
✅ **Posiciones Planetarias** (con casas y retrogradación)  
✅ **Ángulos** (Ascendente, Medio Cielo, Parte de Fortuna)  
✅ **Cúspides de Casas** (Sistema Placidus)  
✅ **Análisis Psico-Astrológico Completo**  
✅ **Citas y Conclusiones**  

#### Uso del Generador:

```python
from app.services.report_generators import generate_report

# Generar PDF
pdf_buffer = generate_report(
    carta_data=carta_completa,
    format='pdf',
    analysis_text="Análisis detallado..."
)

# Generar HTML
html_content = generate_report(
    carta_data=carta_completa,
    format='html',
    analysis_text="Análisis detallado..."
)
```

---

### 4. 🌐 Endpoint de Generación de Informes

**Ubicación:** `backend/app/api/endpoints/reports.py`

#### 4.1. Generar Informe

**Endpoint:** `POST /reports/generate`

**Request:**
```json
{
  "carta_data": { ... },
  "format": "pdf",
  "analysis_text": "Análisis completo..."
}
```

**Response:** Archivo descargable (PDF, DOCX, HTML, Markdown)

#### 4.2. Obtener Formatos Disponibles

**Endpoint:** `GET /reports/formats`

**Response:**
```json
{
  "formats": [
    {
      "id": "web",
      "name": "Web / HTML",
      "description": "Página web con estilos visuales",
      "icon": "🌐",
      "available": true
    },
    ...
  ]
}
```

---

### 5. 🎨 Selector de Formatos en Frontend

**Ubicación:** `components/ExportSelector.tsx`

#### Características:
- ✅ Interfaz visual elegante
- ✅ Detección automática de formatos disponibles
- ✅ Indicadores de selección
- ✅ Estado de carga durante exportación
- ✅ Feedback visual inmediato

#### Integración en App.tsx:

```tsx
<GenericModal isOpen={activeModal === 'export'} onClose={() => setActiveModal(null)} title="Exportar Informe">
   <ExportSelector onExport={downloadReport} isLoading={isExporting} />
</GenericModal>
```

---

## 🔄 Flujo de Trabajo Completo

### Entrada de Datos del Usuario

El usuario introduce sus datos en el formulario:

```tsx
{
  name: "Nombre del Usuario",
  date: "1990-01-15",
  time: "14:30",
  place: "40.4168,-3.7038,Europe/Madrid"  // Lat, Lon, Zona Horaria
}
```

**Formato del campo `place`:**
- **Con zona horaria:** `latitud,longitud,zona_horaria`
- **Sin zona horaria:** `latitud,longitud` (usa UTC por defecto)

**Ejemplos:**
- Madrid: `40.4168,-3.7038,Europe/Madrid`
- Ciudad de México: `19.4326,-99.1332,America/Mexico_City`
- Buenos Aires: `-34.6037,-58.3816,America/Argentina/Buenos_Aires`

### Cálculo de Carta Astral

1. **Frontend** usa el motor rápido (`astrologyEngine.ts`) para visualización inmediata
2. **Backend** calcula con Swiss Ephemeris en paralelo para máxima precisión
3. Los datos precisos se guardan para exportación

### Análisis con Gemini AI

El sistema:
1. Carga el prompt dinámico desde MongoDB
2. Envía las posiciones planetarias a Gemini 2.5 Flash
3. Recibe análisis estructurado en JSON
4. Muestra resultados paso a paso

### Exportación

1. Usuario hace clic en "Exportar Expediente"
2. Se abre modal con selector de formatos
3. Usuario selecciona formato deseado
4. Backend genera informe completo
5. Se descarga automáticamente

---

## 📦 Dependencias Añadidas

### Backend (`requirements.txt`)

```txt
pyswisseph==2.10.3.2      # Motor de efemérides
pytz>=2024.1              # Zonas horarias
reportlab>=4.0.0          # Generación PDF
python-docx>=1.1.0        # Generación DOCX
Pillow>=10.0.0            # Procesamiento de imágenes
```

### Instalación:

```bash
cd backend
pip install -r requirements.txt
```

---

## 🚀 Uso del Sistema

### 1. Backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

### 2. Frontend

```bash
npm run dev
```

### 3. Probar Efemérides

**Curl:**
```bash
curl -X GET http://localhost:8000/ephemeris/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Navegador:**
```
http://localhost:8000/ephemeris/test
```

### 4. Calcular Carta

**Curl:**
```bash
curl -X POST http://localhost:8000/ephemeris/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "fecha": "1990-01-15",
    "hora": "14:30",
    "latitud": 40.4168,
    "longitud": -3.7038,
    "zona_horaria": "Europe/Madrid"
  }'
```

### 5. Generar Informe

**Curl:**
```bash
curl -X POST http://localhost:8000/reports/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "carta_data": { ... },
    "format": "pdf",
    "analysis_text": "Análisis..."
  }' \
  --output carta.pdf
```

---

## 🎯 Validación de Datos de Entrada

### Frontend Valida:

- ✅ Fecha en formato `YYYY-MM-DD`
- ✅ Hora en formato `HH:MM`
- ✅ Latitud entre -90 y 90
- ✅ Longitud entre -180 y 180
- ✅ Zona horaria válida (lista de pytz)

### Backend Valida:

- ✅ Tipos de datos correctos (Pydantic)
- ✅ Rangos válidos de coordenadas
- ✅ Formato de fecha/hora parseables
- ✅ Zona horaria existente en pytz

---

## 📊 Ejemplo de Carta Completa

```json
{
  "datos_entrada": {
    "fecha": "1990-01-15",
    "hora": "14:30",
    "latitud": 40.4168,
    "longitud": -3.7038,
    "zona_horaria": "Europe/Madrid",
    "fecha_utc": "1990-01-15 13:30:00 UTC"
  },
  "planetas": {
    "Sol": {
      "longitud": 294.5,
      "velocidad": 1.02,
      "retrogrado": false,
      "signo": "Capricornio",
      "grados": 24,
      "minutos": 30,
      "texto": "24º30' Capricornio",
      "casa": 10
    },
    "Luna": {
      "longitud": 125.3,
      "velocidad": 13.5,
      "retrogrado": false,
      "signo": "Leo",
      "grados": 5,
      "minutos": 18,
      "texto": "05º18' Leo",
      "casa": 4
    },
    ...
  },
  "casas": [
    {
      "numero": 1,
      "cuspide": 45.2,
      "texto": "15º12' Tauro"
    },
    ...
  ],
  "angulos": {
    "ascendente": {
      "longitud": 45.2,
      "signo": "Tauro",
      "grados": 15,
      "minutos": 12,
      "texto": "15º12' Tauro"
    },
    "medio_cielo": {
      "longitud": 315.8,
      "signo": "Acuario",
      "grados": 15,
      "minutos": 48,
      "texto": "15º48' Acuario"
    },
    "parte_fortuna": {
      "longitud": 175.5,
      "signo": "Virgo",
      "grados": 25,
      "minutos": 30,
      "texto": "25º30' Virgo"
    }
  }
}
```

---

## 🎨 Estilos de Informes

### HTML
- Gradientes modernos
- Tablas interactivas con hover
- Responsive design
- Colores temáticos (indigo/purple)
- Iconos y emojis

### PDF
- Diseño profesional A4
- Tablas con colores alternados
- Encabezados en color
- Footer con fecha de generación
- Paginación automática

### DOCX
- Estilos de Office nativos
- Tablas formateadas
- Colores corporativos
- Fácilmente editable

### Markdown
- Compatible con GitHub/GitLab
- Tablas en formato GFM
- Headers estructurados
- Fácil conversión a otros formatos

---

## 🔍 Debugging y Logs

El sistema incluye logs detallados en cada paso:

```python
# Backend logs
print(f"[EPHEMERIS] Calculando carta para: {fecha} {hora}", file=sys.stderr)
print(f"[REPORTS] Generando informe en formato: {format}", file=sys.stderr)
```

```typescript
// Frontend logs
console.log('✅ Efemérides calculadas con Swiss Ephemeris');
console.warn('⚠️ No se pudieron calcular efemérides con backend');
```

---

## ⚠️ Notas Importantes

### Zonas Horarias

Es **crítico** usar el formato correcto de zona horaria:

❌ **Incorrecto:** `GMT+1`, `UTC+2`, `CET`  
✅ **Correcto:** `Europe/Madrid`, `America/Mexico_City`, `Asia/Tokyo`

**Lista completa:** https://en.wikipedia.org/wiki/List_of_tz_database_time_zones

### Precisión de Cálculos

- **Frontend (Astronomy Engine):** Precisión de ~1 minuto de arco
- **Backend (Swiss Ephemeris):** Precisión de segundos de arco
- **Recomendación:** Usar backend para informes oficiales

### Formato de Coordenadas

- **Latitud Norte:** Positiva (ej: 40.4168)
- **Latitud Sur:** Negativa (ej: -34.6037)
- **Longitud Este:** Positiva (ej: 139.6917 para Tokio)
- **Longitud Oeste:** Negativa (ej: -99.1332 para CDMX)

---

## 🐛 Solución de Problemas

### Error: "pyswisseph no encontrado"

```bash
pip install pyswisseph==2.10.3.2
```

### Error: "ReportLab no disponible"

```bash
pip install reportlab>=4.0.0 Pillow>=10.0.0
```

### Error: "python-docx no disponible"

```bash
pip install python-docx>=1.1.0
```

### Error: "Zona horaria inválida"

Usa el formato completo: `Europe/Madrid` en lugar de `CET` o `GMT+1`.

Verifica con:
```python
import pytz
print(pytz.all_timezones)
```

---

## 📚 Referencias

- **Swiss Ephemeris:** https://www.astro.com/swisseph/
- **ReportLab:** https://www.reportlab.com/docs/reportlab-userguide.pdf
- **python-docx:** https://python-docx.readthedocs.io/
- **pytz:** https://pythonhosted.org/pytz/

---

## 🎉 Conclusión

El sistema ahora ofrece:

✅ **Precisión profesional** en cálculos astrológicos  
✅ **Múltiples formatos** de exportación  
✅ **Informes completos** con análisis y visualización  
✅ **Interfaz elegante** y fácil de usar  
✅ **Validación robusta** de datos de entrada  
✅ **Logs detallados** para debugging  

**¡El sistema está listo para producción!** 🚀

