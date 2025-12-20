# Variables de Entorno para Producción

Este documento lista todas las variables de entorno necesarias para el despliegue de la aplicación FRAKTAL en producción.

## Backend (FastAPI)

### Variables Requeridas

#### `SECRET_KEY`
- **Descripción**: Clave secreta para firmar y verificar tokens JWT
- **Tipo**: String
- **Ejemplo**: `your-super-secret-key-min-32-characters-long-for-security`
- **Recomendación**: Genera una clave aleatoria segura de al menos 32 caracteres
- **Generación**: Puedes usar `openssl rand -hex 32` o cualquier generador de claves seguras

#### `MONGODB_URL`
- **Descripción**: URL de conexión a la base de datos MongoDB
- **Tipo**: String (URI de MongoDB)
- **Ejemplo**: `mongodb+srv://usuario:password@cluster.mongodb.net/fraktal?retryWrites=true&w=majority`
- **Formato**: 
  - MongoDB Atlas: `mongodb+srv://user:pass@cluster.mongodb.net/dbname`
  - MongoDB local: `mongodb://localhost:27017/fraktal`
  - MongoDB con autenticación: `mongodb://user:pass@host:port/dbname`

## Frontend (React/Vite)

### Variables Requeridas

#### `VITE_API_URL`
- **Descripción**: URL base del backend API
- **Tipo**: String (URL completa)
- **Ejemplo**: `https://fraktal-api.onrender.com` o `https://api.tudominio.com`
- **Nota**: No incluir la barra final `/`
- **Uso**: El frontend usa esta URL para todas las peticiones al backend

#### `GEMINI_API_KEY`
- **Descripción**: API Key de Google Gemini para generar análisis astrológicos
- **Tipo**: String
- **Ejemplo**: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
- **Obtención**: 
  1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
  2. Crea un nuevo API key
  3. Copia la clave generada
- **Importante**: Mantén esta clave segura y no la expongas en el código

#### `GOOGLE_GEOCODING_API_KEY`
- **Descripción**: API Key de Google Geocoding API para convertir nombres de lugares a coordenadas
- **Tipo**: String
- **Ejemplo**: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
- **Obtención**: 
  1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
  2. Crea un proyecto o selecciona uno existente
  3. Habilita la API "Geocoding API"
  4. Ve a **APIs & Services → Credentials**
  5. Crea una nueva API Key o usa una existente
  6. (Opcional) Restringe la API Key solo a Geocoding API para mayor seguridad
- **Nota**: Si no se configura, el sistema intentará usar `GEMINI_API_KEY` como fallback (puede funcionar si ambas APIs están en el mismo proyecto)
- **Importante**: Mantén esta clave segura y no la expongas en el código

## Configuración en Render

### Para el Servicio Backend (Web Service)

1. Ve a tu servicio en Render Dashboard
2. Navega a **Environment** en el menú lateral
3. Agrega las siguientes variables:

```
SECRET_KEY=tu-clave-secreta-generada
MONGODB_URL=tu-url-de-mongodb
GOOGLE_GEOCODING_API_KEY=tu-api-key-de-google-geocoding
GEMINI_API_KEY=tu-api-key-de-gemini
```

### Para el Servicio Frontend (Static Site)

1. Ve a tu servicio estático en Render Dashboard
2. Navega a **Environment** en el menú lateral
3. Agrega las siguientes variables:

```
VITE_API_URL=https://tu-backend.onrender.com
GEMINI_API_KEY=tu-api-key-de-gemini
```

**Nota**: En Render, las variables de entorno que empiezan con `VITE_` se inyectan automáticamente en el build de Vite.

## Configuración en Otros Servicios

### Heroku
```bash
heroku config:set SECRET_KEY=tu-clave-secreta
heroku config:set MONGODB_URL=tu-url-mongodb
heroku config:set VITE_API_URL=https://tu-backend.herokuapp.com
heroku config:set GEMINI_API_KEY=tu-api-key
```

### Vercel
Agrega las variables en: **Settings → Environment Variables**

### Railway
Agrega las variables en: **Variables** tab del proyecto

## Archivos .env (Desarrollo)

Para desarrollo local, usa las plantillas `.env.example` y crea tus archivos reales (no se commitean):

- Frontend: copia `.env.example` → `.env`
- Backend: copia `backend/.env.example` → `backend/.env`

```env
# Backend
SECRET_KEY=dev-secret-key-change-in-production
MONGODB_URL=mongodb://localhost:27017/fraktal
GOOGLE_GEOCODING_API_KEY=tu-api-key-de-google-geocoding
GEMINI_API_KEY=tu-api-key-de-gemini

# Frontend
VITE_API_URL=http://localhost:8000
GEMINI_API_KEY=tu-api-key-de-desarrollo
```

**Importante**: 
- El archivo `.env` debe estar en `.gitignore` para no subirlo a GitHub
- Nunca commitees archivos `.env` con credenciales reales

## Verificación

### Backend
Para verificar que las variables están configuradas correctamente en el backend, puedes hacer una petición a:
```
GET /health
```

### Frontend
Las variables del frontend se inyectan durante el build. Verifica en la consola del navegador que `API_URL` apunta al backend correcto.

## Seguridad

⚠️ **IMPORTANTE**:
- Nunca expongas las claves en el código fuente
- Usa diferentes claves para desarrollo y producción
- Rota las claves periódicamente
- Usa servicios de gestión de secretos para producción (AWS Secrets Manager, HashiCorp Vault, etc.)

