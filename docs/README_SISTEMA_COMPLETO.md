# 🌟 Sistema Fraktal - Análisis Astrológico Profesional

## 📖 Descripción

**Fraktal** es un sistema completo de análisis astrológico que combina:

- ✨ **Precisión astronómica profesional** (Swiss Ephemeris)
- 🤖 **Inteligencia Artificial** (Google Gemini 2.5 Flash)
- 📊 **Análisis sistémico** (Método Carutti)
- 📄 **Exportación multi-formato** (PDF, DOCX, HTML, Markdown)
- 🎨 **Interfaz moderna** (React + TypeScript)

---

## 🚀 Inicio Rápido

### 1. Instalar Dependencias del Backend

#### Windows (PowerShell):
```powershell
cd backend
.\install_dependencies.ps1
```

#### Linux/Mac:
```bash
cd backend
chmod +x install_dependencies.sh
./install_dependencies.sh
```

#### Manual:
```bash
cd backend
pip install -r requirements.txt
```

### 2. Configurar Variables de Entorno

Crea o edita `backend/.env`:

```env
MONGODB_URI=tu_mongodb_uri
SECRET_KEY=tu_secret_key
ADMIN_BOOTSTRAP_PASSWORD=1234
GEMINI_API_KEY=tu_gemini_api_key
CORS_ORIGINS=http://localhost:3000
```

### 3. Iniciar Backend

```bash
cd backend
uvicorn main:app --reload
```

El backend estará disponible en `http://localhost:8000`

### 4. Iniciar Frontend

```bash
npm install
npm run dev
```

El frontend estará disponible en `http://localhost:3000`

---

## 📚 Documentación

### Para Usuarios
📖 **[GUIA_USUARIO.md](GUIA_USUARIO.md)**  
Manual completo para usar el sistema, introducir datos y exportar informes.

### Para Desarrolladores
🔧 **[NUEVAS_FUNCIONALIDADES.md](NUEVAS_FUNCIONALIDADES.md)**  
Documentación técnica detallada de todas las funcionalidades implementadas.

### Instalación de Dependencias
📦 **[backend/INSTALL_DEPENDENCIES.md](backend/INSTALL_DEPENDENCIES.md)**  
Guía completa de instalación con solución de problemas.

### Resumen de Implementación
📊 **[RESUMEN_IMPLEMENTACION.md](RESUMEN_IMPLEMENTACION.md)**  
Vista general del estado del proyecto y características implementadas.

---

## ✨ Características Principales

### 🔭 Motor de Efemérides Swiss Ephemeris

- ✅ Precisión de segundos de arco
- ✅ 13 cuerpos celestes (Sol, Luna, planetas, Quirón, Lilith, Nodos)
- ✅ Sistema de casas Placidus
- ✅ Detección automática de retrogradación
- ✅ Parte de Fortuna
- ✅ Conversión de zonas horarias

### 🤖 Análisis con IA

- ✅ Integración con Google Gemini 2.5 Flash
- ✅ Prompts dinámicos desde MongoDB
- ✅ Análisis sistémico (Método Carutti)
- ✅ Respuestas estructuradas en JSON

### 📄 Exportación Multi-Formato

| Formato | Características |
|---------|----------------|
| **HTML** | Estilos modernos, responsive, imprimible |
| **PDF** | Profesional A4, tablas con colores, paginado |
| **DOCX** | Editable en Word/Office, tablas formateadas |
| **Markdown** | Portable, compatible con Git, ligero |

### 🎨 Interfaz Moderna

- ✅ Diseño responsive (móvil, tablet, desktop)
- ✅ Animaciones fluidas
- ✅ Visualización de carta natal
- ✅ Tabla de posiciones planetarias
- ✅ Balance elemental
- ✅ Panel de control avanzado

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐  │
│  │ Formulario │→ │ Visualiza- │→ │ Selector de Formatos │  │
│  │   Datos    │  │    ción    │  │   de Exportación     │  │
│  └────────────┘  └────────────┘  └──────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                    ┌───────▼───────┐
                    │   API REST    │
                    │  (FastAPI)    │
                    └───────┬───────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
  ┌─────▼──────┐  ┌─────────▼────────┐  ┌──────▼────────┐
  │  Swiss     │  │  Google Gemini   │  │   Report      │
  │ Ephemeris  │  │   AI Analysis    │  │  Generators   │
  │  (Cálculo) │  │  (Interpretación)│  │ (PDF/DOCX/MD) │
  └────────────┘  └──────────────────┘  └───────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                    ┌───────▼───────┐
                    │   MongoDB     │
                    │  (Usuarios,   │
                    │   Cartas,     │
                    │   Prompts)    │
                    └───────────────┘
```

---

## 📋 Estructura de Directorios

```
Decano-astrologico-1/
│
├── backend/                         # Backend FastAPI
│   ├── app/
│   │   ├── api/
│   │   │   └── endpoints/
│   │   │       ├── auth.py          # Autenticación
│   │   │       ├── charts.py        # Gestión de cartas
│   │   │       ├── config.py        # Prompts del sistema
│   │   │       ├── ephemeris.py     # ✨ NUEVO: Cálculo de efemérides
│   │   │       └── reports.py       # ✨ NUEVO: Generación de informes
│   │   │
│   │   └── services/
│   │       ├── ephemeris.py         # ✨ NUEVO: Motor Swiss Ephemeris
│   │       └── report_generators.py # ✨ NUEVO: Generadores PDF/DOCX/MD
│   │
│   ├── main.py                      # Punto de entrada
│   ├── requirements.txt             # Dependencias Python
│   ├── .env                         # Variables de entorno
│   ├── install_dependencies.ps1     # ✨ NUEVO: Script Windows
│   ├── install_dependencies.sh      # ✨ NUEVO: Script Linux/Mac
│   └── INSTALL_DEPENDENCIES.md      # ✨ NUEVO: Guía de instalación
│
├── components/                      # Componentes React
│   ├── ExportSelector.tsx           # ✨ NUEVO: Selector de formatos
│   ├── NatalChart.tsx
│   ├── PlanetaryTable.tsx
│   ├── CosmicLoader.tsx
│   ├── ControlPanel.tsx
│   ├── GenericModal.tsx
│   └── AdminPanel.tsx
│
├── App.tsx                          # ✏️ MODIFICADO: Integración completa
├── astrologyEngine.ts               # Motor de cálculos frontend
├── types.ts                         # Tipos TypeScript
├── constants.ts                     # Constantes y traducciones
│
├── docs/                            # Documentación (guías, troubleshooting, etc.)
│   ├── GUIA_USUARIO.md              # Manual de usuario
│   ├── NUEVAS_FUNCIONALIDADES.md    # Docs técnicas
│   ├── RESUMEN_IMPLEMENTACION.md    # Resumen del proyecto
│   ├── DEPLOYMENT.md                # Guía de despliegue
│   └── README_SISTEMA_COMPLETO.md   # Este archivo

└── README.md                        # README principal del repo
```

---

## 🔧 Endpoints de API

### Autenticación

- `POST /auth/register` - Registrar nuevo usuario
- `POST /auth/login` - Iniciar sesión
- `GET /auth/me` - Obtener usuario actual

### Cartas Astrales

- `GET /charts` - Listar cartas guardadas
- `POST /charts` - Guardar nueva carta
- `DELETE /charts/{id}` - Eliminar carta

### Configuración

- `GET /config/prompt` - Obtener prompt del sistema
- `POST /config/prompt` - Actualizar prompt (solo admin)

### ✨ Efemérides (NUEVO)

- `POST /ephemeris/calculate` - Calcular carta astral completa
- `GET /ephemeris/test` - Test con datos de ejemplo

### ✨ Informes (NUEVO)

- `POST /reports/generate` - Generar informe en formato específico
- `GET /reports/formats` - Listar formatos disponibles

---

## 🌍 Uso del Sistema

### 1. Introducir Datos

**Formato del campo "Lugar":**
```
latitud,longitud,zona_horaria
```

**Ejemplos:**
- Madrid: `40.4168,-3.7038,Europe/Madrid`
- México: `19.4326,-99.1332,America/Mexico_City`
- Buenos Aires: `-34.6037,-58.3816,America/Argentina/Buenos_Aires`

**Obtener coordenadas:**
1. Abre [Google Maps](https://maps.google.com)
2. Busca la ciudad
3. Click derecho → Copiar coordenadas

### 2. Seleccionar Protocolo

- **Análisis Sistémico:** Enfoque psicológico profundo (Carutti)
- **Auditoría Técnica:** Enfoque estructural y técnico

### 3. Ver Resultados

- **Radix:** Tabla de posiciones y carta visual
- **Desglose Modular:** Análisis por bloques
- **Síntesis:** Conclusiones generales

### 4. Exportar Informe

1. Click en "Exportar Expediente"
2. Seleccionar formato (Web, PDF, DOCX, Markdown)
3. Click en "Descargar Informe"

---

## 🧪 Testing

### Probar Backend

```bash
# Health check
curl http://localhost:8000/health

# Test de efemérides
curl http://localhost:8000/ephemeris/test \
  -H "Authorization: Bearer TU_TOKEN"

# Formatos disponibles
curl http://localhost:8000/reports/formats \
  -H "Authorization: Bearer TU_TOKEN"
```

### Probar Cálculo de Carta

```bash
curl -X POST http://localhost:8000/ephemeris/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "fecha": "1990-01-15",
    "hora": "14:30",
    "latitud": 40.4168,
    "longitud": -3.7038,
    "zona_horaria": "Europe/Madrid"
  }'
```

---

## 🐛 Solución de Problemas

### Backend no inicia

**Problema:** `ModuleNotFoundError: No module named 'swisseph'`  
**Solución:** Ejecuta `pip install -r requirements.txt`

### Error de zona horaria

**Problema:** `pytz.exceptions.UnknownTimeZoneError`  
**Solución:** Usa formato IANA (ej: `Europe/Madrid` en lugar de `CET`)

### Informe no se descarga

**Problema:** Error 500 al generar informe  
**Solución:** Verifica que estén instalados `reportlab` y `python-docx`

### Consulta más problemas en:
- `backend/INSTALL_DEPENDENCIES.md` - Instalación
- `GUIA_USUARIO.md` - Uso del sistema
- `NUEVAS_FUNCIONALIDADES.md` - Detalles técnicos

---

## 📊 Tecnologías Utilizadas

### Backend
- **FastAPI** - Framework web moderno
- **Swiss Ephemeris** - Motor de efemérides profesional
- **pytz** - Manejo de zonas horarias
- **ReportLab** - Generación de PDFs
- **python-docx** - Generación de documentos Word
- **Motor (MongoDB)** - Cliente asíncrono MongoDB
- **python-jose** - JWT para autenticación
- **passlib + bcrypt** - Hash de contraseñas

### Frontend
- **React** - Biblioteca UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool
- **Astronomy Engine** - Cálculos astronómicos
- **Lucide React** - Iconos
- **Tailwind CSS** - Estilos

### IA & Análisis
- **Google Gemini 2.5 Flash** - Análisis con IA
- **Método Carutti** - Sistema de interpretación

---

## 🎯 Casos de Uso

### Consultoría Astrológica
- Generar cartas natales precisas
- Analizar configuraciones planetarias
- Exportar informes profesionales para clientes

### Educación
- Enseñar astrología con datos reales
- Comparar diferentes cartas
- Guardar y gestionar cartas de estudiantes

### Investigación
- Análisis estadístico de configuraciones
- Exportar datos en formato editable (DOCX, Markdown)
- Integración con otras herramientas

### Auto-conocimiento
- Explorar tu propia carta natal
- Comprender patrones psicológicos
- Guardar análisis para revisión futura

---

## 📈 Rendimiento

| Operación | Tiempo Promedio |
|-----------|----------------|
| Cálculo de carta (backend) | ~50-200ms |
| Análisis con Gemini AI | ~5-15s |
| Generación HTML | ~10-50ms |
| Generación PDF | ~500-1000ms |
| Generación DOCX | ~200-500ms |
| Generación Markdown | ~5-20ms |

---

## 🔒 Seguridad

- ✅ Autenticación JWT
- ✅ Hash de contraseñas con bcrypt
- ✅ CORS configurado
- ✅ Validación de datos (Pydantic)
- ✅ Variables de entorno para secrets
- ✅ Roles de usuario (admin/user)

---

## 🚧 Roadmap Futuro

### Corto Plazo
- [ ] Tests unitarios y de integración
- [ ] Visualización de carta en informes
- [ ] Más sistemas de casas (Koch, Equal, etc.)

### Medio Plazo
- [ ] Cálculo de aspectos planetarios
- [ ] Tránsitos en tiempo real
- [ ] Progresiones secundarias
- [ ] Revolución solar

### Largo Plazo
- [ ] Sinastría (comparación de cartas)
- [ ] Base de datos de lugares
- [ ] App móvil (React Native)
- [ ] API pública

---

## 👥 Contribuir

Este proyecto está en desarrollo activo. Si encuentras bugs o tienes sugerencias:

1. Revisa la documentación existente
2. Crea un issue describiendo el problema/mejora
3. Si es un bug, incluye:
   - Pasos para reproducir
   - Comportamiento esperado vs actual
   - Capturas de pantalla
   - Logs del servidor

---

## 📄 Licencia

Copyright © 2025 Sistema Fraktal  
Todos los derechos reservados.

---

## 🙏 Agradecimientos

- **Swiss Ephemeris** por su motor de cálculo astronómico
- **Google** por la API de Gemini AI
- **Eugenio Carutti** por su sistema de análisis astrológico
- **ReportLab** por la generación de PDFs
- **FastAPI** por el framework web moderno

---

## 📞 Contacto

Para soporte técnico o consultas:
- Consulta la documentación en los archivos MD
- Revisa los logs del servidor para errores
- Contacta al administrador del sistema

---

**🌟 Desarrollado con ❤️ para análisis astrológico profesional**

**Versión:** 2.0  
**Última actualización:** 13 de Diciembre, 2025  
**Estado:** ✅ Producción

