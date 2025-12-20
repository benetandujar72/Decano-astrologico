# 🔧 Guía de Solución de Problemas

Esta guía te ayudará a resolver los errores más comunes que puedes encontrar al desplegar la aplicación.

---

## 📋 Tabla de Contenidos

1. [Error 401 Unauthorized](#error-401-unauthorized)
2. [Error de Stripe API Key](#error-de-stripe-api-key)
3. [Errores de WebSocket](#errores-de-websocket)
4. [Tooltip no muestra minutos](#tooltip-no-muestra-minutos)

---

## Error 401 Unauthorized

### Síntomas
```
decano-astrologico.onrender.com/charts/:1 Failed to load resource: the server responded with a status of 401 ()
Error: Unauthorized
```

### Causa
El token JWT expiró o no es válido. Esto es **NORMAL** cuando:
- Abres la app por primera vez
- Han pasado más de 24 horas desde el último login
- El SECRET_KEY del backend cambió

### Solución
✅ **No requiere acción** - El código ya maneja este caso automáticamente:
- La app detecta el error 401
- Hace logout automático
- Redirige al login

Si ves este error, simplemente **vuelve a iniciar sesión**.

### Solución para Desarrolladores
Si necesitas aumentar el tiempo de expiración del token:

```python
# backend/app/api/endpoints/auth.py
# Línea ~50: Cambiar expires_delta
expires_delta = timedelta(days=7)  # En lugar de 1 día
```

---

## Error de Stripe API Key

### Síntomas
```
Error creando checkout: Error: Error creando sesión de pago:
Invalid API Key provided: sk_test_*******************************_KEY
```

### Causa
La variable de entorno `STRIPE_SECRET_KEY` en Render tiene un **valor placeholder** en lugar de una clave real de Stripe.

### Solución

#### Paso 1: Obtener tus claves de Stripe

1. Ve a [Stripe Dashboard - API Keys](https://dashboard.stripe.com/test/apikeys)
2. Copia tu **Secret key** (empieza con `sk_test_...`)
3. Copia tu **Publishable key** (empieza con `pk_test_...`)

#### Paso 2: Configurar Render (Backend)

1. Ve a tu servicio en [Render Dashboard](https://dashboard.render.com/)
2. Navega a **Environment** → **Environment Variables**
3. Busca `STRIPE_SECRET_KEY`
4. Reemplaza el valor placeholder por tu clave real:
   ```
   sk_test_51ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456
   ```
5. Agrega también:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_TU_WEBHOOK_SECRET
   STRIPE_SUCCESS_URL=https://tu-app.vercel.app/subscription-success
   STRIPE_CANCEL_URL=https://tu-app.vercel.app/plans
   ```
6. Haz clic en **Save Changes**
7. Render reiniciará automáticamente el servicio

#### Paso 3: Configurar Vercel (Frontend)

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Navega a **Settings** → **Environment Variables**
3. Agrega:
   ```
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_TU_PUBLISHABLE_KEY_AQUI
   ```
4. Haz clic en **Save**
5. Redeploy el frontend

#### Paso 4: Configurar Webhooks (Opcional pero recomendado)

1. Ve a [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Crea un nuevo endpoint:
   ```
   URL: https://tu-backend.onrender.com/subscriptions/webhook
   ```
3. Selecciona estos eventos:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copia el **Signing secret** (empieza con `whsec_...`)
5. Añádelo a Render como `STRIPE_WEBHOOK_SECRET`

### Verificación

Para verificar que Stripe está configurado correctamente:

1. Inicia sesión en la app
2. Ve a **Planes de Suscripción**
3. Haz clic en **Suscribirse** en cualquier plan
4. Deberías ver la página de checkout de Stripe

Si ves un error, revisa los logs en Render:
```bash
# En Render Dashboard > Logs
# Busca líneas con [STRIPE] o errores
```

---

## Errores de WebSocket

### Síntomas
```
WebSocket connection to 'wss://undefined:8991/' failed
data-actions.js:1 WebSocket is already in CLOSING or CLOSED state
```

### Causa
Estos errores vienen de scripts de **Vercel Analytics/Speed Insights** que se inyectan automáticamente. NO son errores de tu aplicación.

### Solución
✅ **Estos errores son inofensivos** - Puedes ignorarlos.

El código ya tiene filtros para silenciar estos mensajes en producción:
```typescript
// index.tsx - Líneas 7-38
// Silencia automáticamente errores de WebSocket de Vercel
```

Si quieres eliminarlos completamente:
1. Ve a tu proyecto en Vercel Dashboard
2. Navega a **Settings** → **Analytics**
3. Desactiva **Speed Insights** y **Web Analytics**

---

## Tooltip no muestra minutos

### Síntomas
El tooltip de los planetas solo muestra grados (ej: `25°`) en lugar de grados y minutos (ej: `25°30'`).

### Solución
✅ **Ya está solucionado** en la última versión.

El código actualizado en [components/NatalChart.tsx:231](components/NatalChart.tsx#L231) ahora muestra el formato completo:

```typescript
// ANTES (solo grados)
<span>{hoveredPlanet.degree.split('°')[0]}°</span>

// DESPUÉS (grados y minutos)
<span className="font-mono">{hoveredPlanet.degree}</span>
```

Si aún ves solo grados:
1. Asegúrate de tener la última versión del código
2. Limpia el cache del navegador (Ctrl + Shift + R)
3. Verifica que el backend esté devolviendo datos en formato `grado_a_zodiaco`

---

## 🆘 Otros Problemas

### MongoDB Connection Error
```
MongoServerError: Authentication failed
```

**Solución**:
1. Verifica que `MONGODB_URI` en Render sea correcto
2. Asegúrate de que la contraseña no contenga caracteres especiales sin codificar
3. En MongoDB Atlas → Network Access: permite `0.0.0.0/0`

### CORS Error
```
Access to fetch at 'https://backend.onrender.com/api' from origin 'https://frontend.vercel.app'
has been blocked by CORS policy
```

**Solución**:
1. En Render, agrega tu URL de Vercel a `CORS_ORIGINS`:
   ```
   CORS_ORIGINS=https://tu-app.vercel.app,https://decano-astrologico.vercel.app
   ```

### Gemini API Error
```
Error: Falta la API key de Gemini
```

**Solución**:
1. Obtén una API key de [Google AI Studio](https://makersuite.google.com/app/apikey)
2. En Vercel, agrega:
   ```
   VITE_GEMINI_API_KEY=tu_api_key_aqui
   ```

---

## 📚 Documentación Relacionada

- [STRIPE_SETUP_GUIDE.md](STRIPE_SETUP_GUIDE.md) - Guía completa de configuración de Stripe
- [WIZARD_SUSCRIPCIONES_COMPLETO.md](WIZARD_SUSCRIPCIONES_COMPLETO.md) - Implementación del sistema de suscripciones
- [backend/.env.example](backend/.env.example) - Plantilla de variables de entorno

---

## 💡 Consejos

1. **Nunca subas claves reales a GitHub** - Usa variables de entorno
2. **Usa claves de test en desarrollo** - `sk_test_...`, `pk_test_...`
3. **Cambia a claves de producción solo cuando estés listo** - `sk_live_...`, `pk_live_...`
4. **Revisa los logs de Render regularmente** - Muchos errores se muestran ahí primero
5. **Usa el modo incógnito para probar** - Evita problemas de cache

---

**¿Necesitas más ayuda?** Revisa los logs en:
- **Backend (Render)**: Dashboard → Logs
- **Frontend (Vercel)**: Dashboard → Deployments → [tu deploy] → Runtime Logs
- **Browser**: F12 → Console tab
