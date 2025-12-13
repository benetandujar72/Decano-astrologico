# 🚀 Inicio Rápido - Sistema Fraktal

## ✅ ¿Qué se ha implementado?

Se ha mejorado completamente el sistema Fraktal con:

1. **✨ Motor de Efemérides Swiss Ephemeris**
   - Cálculos astronómicos de precisión profesional
   - 13 cuerpos celestes (incluidos Quirón y Lilith)
   - Sistema de casas Placidus
   - Detección de retrogradación

2. **📄 Exportación Multi-Formato**
   - Web/HTML (con estilos modernos)
   - PDF (profesional, listo para imprimir)
   - DOCX (editable en Word)
   - Markdown (portable)

3. **🎨 Interfaz Mejorada**
   - Selector visual de formatos
   - Captura de zona horaria
   - Descarga automática de informes
   - Feedback visual en tiempo real

---

## ⚡ Empezar en 3 Pasos

### Paso 1: Instalar Dependencias

Abre PowerShell en la carpeta `backend` y ejecuta:

```powershell
.\install_dependencies.ps1
```

O manualmente:

```powershell
pip install -r requirements.txt
```

### Paso 2: Iniciar el Backend

```powershell
cd backend
uvicorn main:app --reload
```

### Paso 3: Iniciar el Frontend

En otra terminal:

```powershell
npm install
npm run dev
```

**¡Listo!** Abre http://localhost:3000

---

## 📝 Usar el Sistema

### 1. Introducir Datos del Alumno

En el formulario introduce:

- **Nombre:** Nombre completo del alumno
- **Fecha:** YYYY-MM-DD (usa el selector)
- **Hora:** HH:MM (formato 24 horas)
- **Lugar:** `latitud,longitud,zona_horaria`

**Ejemplo para Madrid:**
```
40.4168,-3.7038,Europe/Madrid
```

**Obtener coordenadas:**
1. Abre https://maps.google.com
2. Busca la ciudad
3. Click derecho en el punto exacto
4. Copia las coordenadas
5. Añade la zona horaria al final

### 2. Analizar

Selecciona el tipo de análisis:
- **Análisis Sistémico** (recomendado)
- **Auditoría Técnica**

El sistema calculará automáticamente:
- Posiciones planetarias precisas
- Casas astrológicas
- Retrogradaciones
- Parte de Fortuna
- Análisis con IA

### 3. Exportar Informe

Al final del análisis:

1. Click en **"Exportar Expediente"**
2. Selecciona el formato deseado:
   - 🌐 **Web** - Ver en navegador
   - 📄 **PDF** - Documento profesional
   - 📝 **Word** - Editable
   - 📋 **Markdown** - Texto portable
3. Click en **"Descargar Informe"**
4. El archivo se descarga automáticamente

---

## 🌍 Zonas Horarias Principales

| País/Región | Zona Horaria |
|-------------|--------------|
| **España** | `Europe/Madrid` |
| **México** | `America/Mexico_City` |
| **Argentina** | `America/Argentina/Buenos_Aires` |
| **Chile** | `America/Santiago` |
| **Colombia** | `America/Bogota` |
| **Perú** | `America/Lima` |
| **Venezuela** | `America/Caracas` |
| **USA (Este)** | `America/New_York` |
| **USA (Oeste)** | `America/Los_Angeles` |

**Lista completa:** https://en.wikipedia.org/wiki/List_of_tz_database_time_zones

---

## 📚 Documentación Completa

- **GUIA_USUARIO.md** - Manual completo de usuario
- **NUEVAS_FUNCIONALIDADES.md** - Documentación técnica
- **RESUMEN_IMPLEMENTACION.md** - Resumen del proyecto
- **README_SISTEMA_COMPLETO.md** - README principal
- **backend/INSTALL_DEPENDENCIES.md** - Guía de instalación detallada

---

## ⚠️ Importante

### Formato del Campo "Lugar"

❌ **Incorrecto:**
- `Madrid, España`
- `40.4168 -3.7038`
- `GMT+1`

✅ **Correcto:**
```
40.4168,-3.7038,Europe/Madrid
```

**Componentes:**
1. Latitud (número decimal, Norte positivo, Sur negativo)
2. Longitud (número decimal, Este positivo, Oeste negativo)
3. Zona horaria (formato IANA)

### Si No Conoces la Zona Horaria

Puedes omitirla (usa UTC por defecto):
```
40.4168,-3.7038
```

Pero es **altamente recomendado** incluirla para cálculos precisos.

---

## 🐛 Problemas Comunes

### Error: "pyswisseph not found"

**Solución:**
```powershell
pip install pyswisseph==2.10.3.2
```

### Error: "Zona horaria inválida"

**Solución:** Usa formato IANA completo:
- ✅ `Europe/Madrid`
- ❌ `CET` o `GMT+1`

### El informe no se descarga

**Solución:** Verifica que el backend esté corriendo y que hayas instalado todas las dependencias.

---

## 🎯 Ejemplo Completo

### Datos de Entrada

```
Nombre: María García López
Fecha: 1990-06-20
Hora: 14:30
Lugar: 40.4168,-3.7038,Europe/Madrid
```

### Resultado

El sistema generará:

1. **Carta Astral Visual** - Gráfico de la carta natal
2. **Tabla de Posiciones** - 13 cuerpos celestes con casas
3. **Análisis IA** - Interpretación psico-astrológica completa
4. **Informe Descargable** - En tu formato preferido

**Tiempo total:** ~15-30 segundos

---

## 📞 Ayuda

Si necesitas ayuda:

1. **Consulta la documentación**
   - GUIA_USUARIO.md para uso del sistema
   - backend/INSTALL_DEPENDENCIES.md para problemas de instalación

2. **Revisa los logs**
   ```powershell
   # El backend muestra logs detallados en la terminal
   ```

3. **Verifica las dependencias**
   ```powershell
   pip list | Select-String -Pattern "pyswisseph|reportlab|docx|pytz"
   ```

---

## ✅ Checklist de Verificación

Antes de usar el sistema, verifica:

- [ ] Backend instalado (`pip install -r requirements.txt`)
- [ ] Backend corriendo (`uvicorn main:app --reload`)
- [ ] Frontend corriendo (`npm run dev`)
- [ ] MongoDB conectado
- [ ] API Key de Gemini configurada
- [ ] Puedes hacer login en http://localhost:3000

Si todo está ✅, ¡el sistema está listo para usar!

---

## 🎉 ¡Disfruta del Sistema!

El sistema Fraktal ahora ofrece la máxima precisión en cálculos astrológicos y exportación profesional de informes.

**¿Listo para empezar?**

1. Instala dependencias
2. Inicia el sistema
3. Introduce los datos de tu primer alumno
4. ¡Genera tu primera carta astral profesional!

---

**🌟 Sistema Fraktal v2.0 - Análisis Astrológico Profesional**

