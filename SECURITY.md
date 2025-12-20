# Seguridad

## No commitear secretos

- No se deben commitear archivos `.env` ni variantes con credenciales.
- Usa `.env.example` (plantilla) y configura los secretos en Render/Vercel (Dashboard → Environment Variables).

## Si un secreto se expuso

1. Rota inmediatamente:
   - `SECRET_KEY`
   - `ADMIN_BOOTSTRAP_PASSWORD`
   - `MONGODB_URI`
   - Claves Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)
   - Cualquier API key (Gemini/Geocoding)
2. Si el secreto estuvo en git en cualquier commit histórico, considera limpiar el historial (p. ej. `git filter-repo`) y forzar push.

## Reporte

Si detectas un problema de seguridad, repórtalo al mantenedor del repo y evita publicar credenciales en issues.
