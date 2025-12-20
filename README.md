# FRAKTAL / Decano Astrológico

Aplicación full‑stack para análisis astrológico con:
- **Frontend**: React + Vite (en la raíz del repo)
- **Backend**: FastAPI + MongoDB (en `backend/`)
- **Deploy**: Render (backend, Docker) + Vercel (frontend)

## Estructura del repositorio

\- `backend/` FastAPI (API, auth, MongoDB, Stripe, PDF)
\- `components/`, `services/`, `src/`, `styles/` Frontend React
\- `docs/DEPLOYMENT.md` guía de despliegue (Render + Vercel)
\- `docs/VARIABLES_ENTORNO.md` referencia de variables de entorno

## Requisitos

- Node.js (para el frontend)
- Python 3.11+ (para el backend en local)
- MongoDB (Atlas o local)

## Arranque en local

### 1) Frontend (Vite)

1. Instala dependencias:
   - `npm install`
2. Configura el backend en `.env` (no se commitea):
   - Copia `.env.example` → `.env`
   - Ajusta `VITE_API_URL` (por defecto `http://localhost:8000`)
3. Ejecuta:
   - `npm run dev`

### 2) Backend (FastAPI)

1. Crea el archivo de entorno del backend:
   - Copia `backend/.env.example` → `backend/.env`
2. Instala dependencias:
   - `pip install -r backend/requirements.txt`
3. Ejecuta:
   - `cd backend`
   - `uvicorn main:app --reload --host 0.0.0.0 --port 8000`

Endpoints útiles:
- `GET /health`
- `GET /health/db`

## Build

- `npm run build`

## Deploy (producción)

Sigue la guía paso a paso en `docs/DEPLOYMENT.md`.

## Seguridad (importante)

- No subas archivos `.env` al repo.
- Usa las variables de entorno en Render/Vercel y rota las claves si alguna vez se han expuesto.
