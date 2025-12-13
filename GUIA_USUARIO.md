# 📖 Guía del Usuario - Sistema Fraktal

## 🎯 Introducción

Bienvenido al sistema Fraktal de análisis astrológico. Esta guía te ayudará a utilizar todas las nuevas funcionalidades para generar cartas astrales precisas y exportar informes profesionales.

---

## 🚀 Inicio Rápido

### 1. Acceder al Sistema

1. Abre tu navegador en la URL del sistema
2. Inicia sesión con tus credenciales
3. Serás redirigido automáticamente al formulario de entrada

---

## 📝 Introducir Datos del Alumno

### Formulario de Entrada

El sistema ahora captura automáticamente los datos necesarios para el cálculo preciso de efemérides:

#### **Campos Obligatorios:**

1. **Nombre del Alumno**
   - Introduce el nombre completo
   - Ejemplo: `Juan Pérez García`

2. **Fecha de Nacimiento**
   - Formato: `YYYY-MM-DD`
   - Ejemplo: `1990-01-15`
   - Usa el selector de calendario

3. **Hora de Nacimiento**
   - Formato: `HH:MM` (24 horas)
   - Ejemplo: `14:30` (2:30 PM)
   - **Importante:** La hora debe ser lo más precisa posible

4. **Ubicación Geográfica**
   - **Formato nuevo:** `Latitud,Longitud,Zona_Horaria`
   - Ejemplo completo: `40.4168,-3.7038,Europe/Madrid`
   
   **Componentes:**
   - **Latitud:** Coordenada norte/sur (-90 a +90)
   - **Longitud:** Coordenada este/oeste (-180 a +180)
   - **Zona Horaria:** Zona horaria IANA (opcional, usa UTC si se omite)

---

## 🌍 Obtener Coordenadas Geográficas

### Método 1: Google Maps

1. Abre [Google Maps](https://maps.google.com)
2. Busca la ciudad de nacimiento
3. Haz clic derecho en el punto exacto
4. Selecciona las coordenadas que aparecen arriba
5. Copia en formato `latitud,longitud`

**Ejemplo para Madrid:**
- Google Maps muestra: `40.4168, -3.7038`
- Introduce: `40.4168,-3.7038,Europe/Madrid`

### Método 2: Sitios Especializados

Usa servicios como:
- [LatLong.net](https://www.latlong.net/)
- [GPS Coordinates](https://www.gps-coordinates.net/)

---

## ⏰ Zonas Horarias

### Formato Correcto

Usa el formato **IANA** (también llamado Olson):

✅ **Correcto:**
- `Europe/Madrid`
- `America/Mexico_City`
- `America/Argentina/Buenos_Aires`
- `Asia/Tokyo`
- `America/New_York`

❌ **Incorrecto:**
- `GMT+1`
- `UTC+2`
- `CET`
- `PST`

### Principales Zonas Horarias

| Región | Zona Horaria |
|--------|--------------|
| **España** | `Europe/Madrid` |
| **México** | `America/Mexico_City` |
| **Argentina** | `America/Argentina/Buenos_Aires` |
| **Chile** | `America/Santiago` |
| **Colombia** | `America/Bogota` |
| **Perú** | `America/Lima` |
| **Venezuela** | `America/Caracas` |
| **Estados Unidos (Este)** | `America/New_York` |
| **Estados Unidos (Oeste)** | `America/Los_Angeles` |

**Lista completa:** [Zonas Horarias IANA](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)

---

## 🔄 Proceso de Análisis

### Paso 1: Selección de Protocolo

Después de introducir los datos, selecciona el tipo de análisis:

#### 🧠 **Análisis Sistémico (Carutti)**
- Enfoque psicológico profundo
- Análisis de mecánica de la conciencia
- Lunas, Ascendentes y polaridades transpersonales
- **Recomendado para:** Consultas psicológicas, desarrollo personal

#### 🔧 **Auditoría de Estructura**
- Enfoque técnico y estructural
- Cálculo de orbes, dignidades, intercepciones
- Balance de elementos
- **Recomendado para:** Estudios académicos, análisis técnico

### Paso 2: Procesamiento

El sistema realizará automáticamente:

1. ✅ Cálculo de efemérides con Swiss Ephemeris
2. ✅ Conversión de zona horaria a UTC
3. ✅ Cálculo de 13 cuerpos celestes
4. ✅ Determinación de casas (sistema Placidus)
5. ✅ Detección de retrogradaciones
6. ✅ Cálculo de Parte de Fortuna
7. ✅ Análisis con IA (Gemini)
8. ✅ Generación de visualización

**Tiempo estimado:** 10-30 segundos

### Paso 3: Visualización de Resultados

Los resultados se muestran en varias secciones:

#### **Radix (Vista Estructural)**
- Tabla de posiciones planetarias
- Carta natal visual
- Balance elemental
- Panel de control

#### **Desglose Modular**
- Análisis por bloques
- Tesis sistémica
- Auditoría técnica
- Traducción vivencial

#### **Síntesis**
- Conclusión general
- Cita inspiradora
- Opciones de exportación

---

## 📤 Exportar Informes

### Paso 1: Acceder al Selector

1. Ve hasta la pantalla final de resultados
2. Haz clic en **"Exportar Expediente"**
3. Se abrirá un selector de formatos

### Paso 2: Elegir Formato

Selecciona el formato que necesites:

#### 🌐 **Web / HTML**
- **Ideal para:** Ver en navegador, compartir online
- **Características:** 
  - Estilos visuales modernos
  - Colores y gradientes
  - Responsive (se adapta a dispositivos)
  - Imprimible desde el navegador
- **Tamaño:** ~200-500 KB

#### 📄 **PDF**
- **Ideal para:** Documentos oficiales, impresión
- **Características:**
  - Formato profesional A4
  - Tablas con colores
  - Paginación automática
  - No editable
- **Tamaño:** ~300-800 KB

#### 📝 **Word (DOCX)**
- **Ideal para:** Edición posterior, personalización
- **Características:**
  - Compatible con Microsoft Word
  - Totalmente editable
  - Tablas formateadas
  - Estilos Office nativos
- **Tamaño:** ~100-300 KB

#### 📋 **Markdown**
- **Ideal para:** Desarrolladores, control de versiones
- **Características:**
  - Formato texto plano
  - Compatible con Git
  - Fácil conversión a otros formatos
  - Portable y ligero
- **Tamaño:** ~50-150 KB

### Paso 3: Descargar

1. Selecciona tu formato preferido (se destacará en color)
2. Haz clic en **"Descargar Informe"**
3. El archivo se descargará automáticamente

**Nombre del archivo:** `carta_astral_[nombre]_[fecha].ext`

---

## 📋 Contenido de los Informes

Todos los formatos incluyen:

### ✅ Sección 1: Datos Personales
- Nombre completo
- Fecha y hora de nacimiento
- Ubicación geográfica (coordenadas)
- Zona horaria
- Fecha/hora UTC (para referencia)

### ✅ Sección 2: Posiciones Planetarias

Tabla completa con:
- **13 cuerpos celestes:** Sol, Luna, Mercurio, Venus, Marte, Júpiter, Saturno, Urano, Neptuno, Plutón, Quirón, Lilith Media, Nodo Norte
- **Posición zodiacal:** Grado, minuto y signo
- **Casa:** Asignación a casa astrológica (1-12)
- **Retrogradación:** Indicador si el planeta está retrógrado
- **Parte de Fortuna:** Punto arábigo calculado

### ✅ Sección 3: Ángulos Principales
- **Ascendente (ASC):** Punto del horizonte este
- **Medio Cielo (MC):** Punto más alto del cielo

### ✅ Sección 4: Cúspides de Casas
- **12 cúspides** calculadas con sistema Placidus
- Posición zodiacal de cada cúspide

### ✅ Sección 5: Carta Astral Visual
*(Solo en formatos HTML y PDF)*
- Representación gráfica de la carta
- Posiciones de planetas
- Líneas de casas

### ✅ Sección 6: Análisis Psico-Astrológico

Análisis completo estructurado en módulos:

#### **Módulo 1: Estructura Energética Base**
- Balance de elementos (Fuego, Tierra, Aire, Agua)
- Ritmo y modalidad
- Tensión vital primaria (Sol-Luna-Ascendente)
- Polarización transpersonal

#### **Módulo 2: Análisis Planetario Profundo**
- Funciones planetarias sistémicas
- Regencias y dispositores
- Configuraciones maestras
- Sombra y proyección

#### **Módulo 3: Campos de Experiencia**
- Análisis por ejes polares (1-7, 2-8, etc.)
- Detección de lo no metabolizado
- Dinámica de importación y polarización

#### **Módulo 4: Síntesis y Sentido**
- Vector evolutivo (Nodos Lunares)
- Saturno como esqueleto del Dharma
- Mito personal y misión transpersonal

### ✅ Sección 7: Conclusión
- Síntesis general
- Cita inspiradora
- Fecha de generación del informe

---

## 🎨 Ejemplos de Uso

### Ejemplo 1: Madrid, España

**Datos de entrada:**
```
Nombre: María García López
Fecha: 1985-06-20
Hora: 08:45
Lugar: 40.4168,-3.7038,Europe/Madrid
```

**Formato recomendado:** PDF (para consulta profesional)

---

### Ejemplo 2: Ciudad de México

**Datos de entrada:**
```
Nombre: Carlos Rodríguez
Fecha: 1992-11-10
Hora: 15:20
Lugar: 19.4326,-99.1332,America/Mexico_City
```

**Formato recomendado:** DOCX (para editar y personalizar)

---

### Ejemplo 3: Buenos Aires, Argentina

**Datos de entrada:**
```
Nombre: Ana Fernández
Fecha: 1978-03-05
Hora: 21:15
Lugar: -34.6037,-58.3816,America/Argentina/Buenos_Aires
```

**Formato recomendado:** HTML (para compartir online)

---

## ⚠️ Consejos Importantes

### 🕐 Hora de Nacimiento
- **Usa la hora local** del lugar de nacimiento
- **Especifica la zona horaria correcta**
- **Si no conoces la hora exacta:** Usa 12:00 como aproximación
- **Horario de verano:** El sistema lo maneja automáticamente

### 🌍 Coordenadas
- **Latitud Norte:** Número positivo (ej: 40.4168)
- **Latitud Sur:** Número negativo (ej: -34.6037)
- **Longitud Este:** Número positivo (ej: 139.6917)
- **Longitud Oeste:** Número negativo (ej: -3.7038)

### 📱 Formato de Lugar
- **Sin espacios:** `40.4168,-3.7038,Europe/Madrid`
- **Con comas:** Separar latitud, longitud y zona horaria
- **Zona horaria opcional:** Si se omite, usa UTC

---

## ❓ Preguntas Frecuentes

### ¿Por qué necesito la zona horaria?

La zona horaria es crítica para calcular correctamente las posiciones planetarias. El sistema convierte tu hora local a UTC y luego calcula las efemérides astronómicas precisas.

### ¿Qué pasa si no sé las coordenadas exactas?

Usa el centro de la ciudad más cercana. La diferencia de unos kilómetros generalmente afecta solo al Ascendente y las cúspides de casas en minutos de arco.

### ¿Puedo usar formato decimal?

Sí, el sistema acepta coordenadas en formato decimal. Ejemplo: `40.4168` es lo mismo que `40°25'N`.

### ¿Los informes incluyen la carta visual?

Sí, los formatos HTML y PDF incluyen la representación gráfica de la carta natal.

### ¿Puedo editar los informes?

Sí, el formato DOCX es completamente editable en Microsoft Word, LibreOffice o Google Docs.

### ¿Qué formato es mejor para imprimir?

El formato PDF está optimizado para impresión en tamaño A4 con márgenes estándar.

### ¿Puedo guardar múltiples cartas?

Sí, el sistema permite guardar cartas y cargarlas posteriormente desde el listado.

---

## 🐛 Solución de Problemas

### Error: "Zona horaria inválida"
**Causa:** Formato incorrecto de zona horaria  
**Solución:** Usa formato IANA (ej: `Europe/Madrid` en lugar de `CET`)

### Error: "Coordenadas fuera de rango"
**Causa:** Latitud o longitud incorrecta  
**Solución:** Verifica que latitud esté entre -90 y 90, longitud entre -180 y 180

### Error: "Fecha inválida"
**Causa:** Formato de fecha incorrecto  
**Solución:** Usa formato YYYY-MM-DD (ej: 1990-01-15)

### El informe no se descarga
**Causa:** Problema de conexión o permisos  
**Solución:** Verifica tu conexión, intenta otro formato, o contacta soporte

### La carta visual no aparece
**Causa:** Solo disponible en HTML y PDF  
**Solución:** Usa formato HTML o PDF para ver la visualización

---

## 📞 Soporte

Si tienes problemas o preguntas:

1. Consulta esta guía
2. Revisa el archivo `NUEVAS_FUNCIONALIDADES.md` para detalles técnicos
3. Contacta al administrador del sistema
4. Reporta errores con capturas de pantalla

---

## 🎉 ¡Disfruta del Sistema!

El sistema Fraktal ahora ofrece la máxima precisión en cálculos astrológicos y múltiples formatos de exportación profesional.

**¡Buena suerte con tus análisis!** 🌟

