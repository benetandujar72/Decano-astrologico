# Arquitectura

Este documento explica la arquitectura del proyecto para facilitar el onboarding, el mantenimiento y el despliegue.

## Visión general

- **Frontend**: React + Vite (en la raíz del repo)
- **Backend**: FastAPI + MongoDB (en `backend/`)
- **Deploy**: Render (backend, Docker) + Vercel (frontend)

### Diagrama (alto nivel)

```text
┌──────────────────────┐            HTTPS             ┌──────────────────────────┐
│  Browser (React/Vite) │ ─────────────────────────▶  │ FastAPI (Render / Docker) │
│  Vercel               │                              │ /auth /demo-chat /admin   │
└──────────┬───────────┘                              └───────────┬──────────────┘
           │                                                      │
           │                                                      │
           │                                       ┌──────────────▼──────────────┐
           │                                       │ MongoDB Atlas                │
           │                                       │ users, user_subscriptions,   │
           │                                       │ demo_sessions, charts, ...   │
           │                                       └──────────────────────────────┘
           │
           │                                       (opcional) ┌───────────────────┐
           └───────────────────────────────────────────────▶  │ Stripe            │
                                                           │  │ pagos/webhooks    │
                                                           │  └───────────────────┘
```

## Componentes principales

### Frontend (React)

- UI + lógica de interacción (formularios, demo guiada, panel admin, perfil).
- Todas las llamadas HTTP se centralizan en `services/api.ts`.
- Variables de entorno:
  - `VITE_API_URL` (URL del backend).

#### Freemium en frontend (UX)

La UI refleja el modelo freemium para mejorar experiencia de usuario (pero **no es** la capa de seguridad):
- **FREE/anónimo**: demo guiada (solo “Siguiente Paso”, sin input libre).
- **PRO+/admin**: puede enviar preguntas libres.

### Backend (FastAPI)

- API REST para autenticación, demo, historial, PDF, admin y suscripciones.
- Motor de permisos centralizado en `backend/app/services/subscription_permissions.py`.
- Persistencia en MongoDB vía Motor.

#### Colecciones relevantes

- `users`: usuarios.
- `user_subscriptions`: estado de suscripción (colección “source of truth” actual).
  - Existe compatibilidad con `subscriptions` como fallback legado.
- `demo_sessions`: sesiones de demo (mensajes + reportes).
- `charts`: cartas guardadas.

## Autenticación y autorización

- **Auth**: JWT Bearer (`Authorization: Bearer <token>`).
- **Roles**:
  - `admin`: acceso a endpoints de administración.
  - `user`: acceso estándar.

### Reglas de permisos (resumen)

- **Admin**: puede ver contenido completo y consultar demos de cualquier usuario (endpoints `/admin/...`).
- **PRO+/premium/etc**: ve contenido completo (incluyendo historial y PDF completo).
- **FREE/anónimo**:
  - En demo-chat: solo flujo guiado (bloqueo de mensajes libres).
  - En lectura/histórico/pdf: recibe **preview** (contenido capado) para evitar fugas.

## Flujo de “Demo Chat” (freemium)

### Objetivo

Permitir un primer valor (“preview” persuasivo) y reservar el informe completo para planes superiores, sin poder saltarse la restricción por llamadas directas a API.

### Flujo

1. `POST /demo-chat/start`
   - Crea una sesión `demo_sessions` con datos iniciales.
2. `POST /demo-chat/chat`
   - Si es FREE/anónimo: solo permite avanzar con `next_step=true`.
   - El modelo devuelve JSON con:
     - `preview`: resumen comercial/persuasivo
     - `full`: análisis completo
   - Se guarda **full** en la sesión, y también un **preview** por paso.
3. Lectura:
   - `GET /demo-chat/history/{id}` y `GET /demo-chat/session/{id}`
   - Se aplica proyección según permisos (FREE ve solo preview).
4. PDF:
   - `GET /demo-chat/pdf/{id}` genera PDF con preview para FREE y full para PRO+/admin.

## Administración

El admin tiene endpoints dedicados para inspección de usuarios:
- Listado de demos: `GET /admin/users/{user_id}/demo-sessions`
- Detalle completo: `GET /admin/users/{user_id}/demo-sessions/{session_id}`

En frontend, esto se muestra en `components/UserDetailView.tsx`.

## Despliegue (resumen)

- Render (backend) usa `backend/Dockerfile` y escucha en `$PORT` (fallback 8000).
- Vercel (frontend) construye con `npm run build` y apunta al backend con `VITE_API_URL`.

Guías:
- Deploy: [DEPLOYMENT.md](DEPLOYMENT.md)
- Variables de entorno: [VARIABLES_ENTORNO.md](VARIABLES_ENTORNO.md)

## Operación / verificación rápida

- Backend health:
  - `GET /health`
  - `GET /health/db`
- Frontend:
  - `npm run build`

## Notas de seguridad

- No se deben commitear `.env` con secretos. Usa `.env.example` y configura secretos en Render/Vercel.
- Si algún secreto se expuso en git históricamente, rota claves y considera limpiar historial.
