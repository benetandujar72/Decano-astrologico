# Contribuir

## Flujo de trabajo

- Rama principal: `main`
- Cambios: crea una rama por feature/fix y abre PR.

## Desarrollo local

### Frontend

- `npm install`
- Copia `.env.example` → `.env`
- `npm run dev`

### Backend

- Copia `backend/.env.example` → `backend/.env`
- `pip install -r backend/requirements.txt`
- `cd backend` y `uvicorn main:app --reload --host 0.0.0.0 --port 8000`

## Checklist antes de PR

- `npm run build` (frontend)
- Verificar endpoints `GET /health` y `GET /health/db`
- Confirmar que no se han commiteado secretos (`.env`, claves reales, etc.)
