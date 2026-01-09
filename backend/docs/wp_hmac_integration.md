# Integración WordPress → Motor Fractal (HMAC)

Este documento define el esquema de autenticación y llamadas que debe usar WordPress (plugin) para comunicarse con el backend.

## Variables de entorno (backend)

- `WP_HMAC_SECRET`: secret compartido (obligatorio).
- `WP_HMAC_ALLOWED_SKEW_SECONDS`: ventana de tiempo para el timestamp (default: `300`).
- `WP_ADMIN_USER_IDS`: lista CSV de `wp_user_id` con rol admin en WordPress para **bypass** (ej. `1,2,3`).

## Headers requeridos

En **todas** las llamadas WordPress → Backend (ruta `/wp/...`):

- `X-Fraktal-Timestamp`: epoch seconds (ej. `1736188800`)
- `X-Fraktal-WP-User-Id`: id del usuario en WordPress (string o int)
- `X-Fraktal-Signature`: firma HMAC SHA256 en hex

## Canonical string

Para firmar:

`{timestamp}.{method}.{path}.{body_sha256}.{wp_user_id}`

Donde:

- `timestamp`: el de `X-Fraktal-Timestamp`
- `method`: `GET|POST|...` en mayúsculas
- `path`: path exacto, p.ej. `/wp/report/queue-full`
- `body_sha256`: `sha256(body_raw)` en hex (para GET sin body, es el sha256 del vacío)
- `wp_user_id`: el de `X-Fraktal-WP-User-Id`

Firma:

`signature = hex(hmac_sha256(secret, canonical_string))`

## Endpoints (MVP)

- `POST /wp/report/queue-full`
  - body: `{ wp_user_id, email?, display_name?, nombre?, report_mode, carta_data }`
- `GET /wp/report/status/{session_id}`
- `GET /wp/report/my-sessions?limit=100`
- `GET /wp/report/download-pdf/{session_id}`

Nota: La carta completa `carta_data` se obtiene con `POST /charts/generate` (endpoint público en este backend).

## Bypass para administradores

Si el `wp_user_id` está incluido en `WP_ADMIN_USER_IDS`, entonces:

- `GET /wp/report/my-sessions` devuelve **todas** las sesiones (no filtra por `wp_user_id`).
- `GET /wp/report/status/{session_id}` permite consultar cualquier sesión.
- `GET /wp/report/download-pdf/{session_id}` permite descargar cualquier PDF.


