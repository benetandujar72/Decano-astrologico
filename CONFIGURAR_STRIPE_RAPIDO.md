# ⚡ Configuración Rápida de Stripe en Render y Vercel

Esta guía te muestra **paso a paso** cómo configurar las variables de Stripe en tus plataformas de deployment.

---

## 📋 ANTES DE EMPEZAR: Obtener las Claves de Stripe

1. **Inicia sesión en Stripe**: https://dashboard.stripe.com/
2. **Ve a Developers → API Keys**:
   - Modo Test: https://dashboard.stripe.com/test/apikeys
   - Modo Live: https://dashboard.stripe.com/apikeys (solo para producción)
3. **Copia estas claves**:
   - ✅ **Secret key** (empieza con `sk_test_...` o `sk_live_...`)
   - ✅ **Publishable key** (empieza con `pk_test_...` o `pk_live_...`)

⚠️ **IMPORTANTE**: 
- Para desarrollo/testing usa claves que empiezan con `sk_test_` y `pk_test_`
- Para producción usa claves que empiezan con `sk_live_` y `pk_live_`
- **NUNCA** subas estas claves a GitHub

---

## 🔧 PARTE 1: Configurar RENDER (Backend)

### Paso 1: Acceder a tu servicio en Render

1. Ve a https://dashboard.render.com/
2. Busca tu servicio backend (normalmente llamado `fraktal-api` según `render.yaml`)
3. Haz clic en el nombre del servicio

### Paso 2: Ir a Environment Variables

1. En el menú lateral izquierdo, haz clic en **"Environment"**
2. Verás una lista de variables de entorno existentes

### Paso 3: Agregar/Actualizar Variables de Stripe

Haz clic en **"Add Environment Variable"** para cada una de estas variables:

#### Variable 1: STRIPE_SECRET_KEY
```
Key:   STRIPE_SECRET_KEY
Value: sk_test_51ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456
```
☝️ Reemplaza con tu **Secret Key** real de Stripe (la que empieza con `sk_test_` o `sk_live_`)

#### Variable 2: STRIPE_PUBLISHABLE_KEY
```
Key:   STRIPE_PUBLISHABLE_KEY
Value: pk_test_51ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456
```
☝️ Reemplaza con tu **Publishable Key** real de Stripe (la que empieza con `pk_test_` o `pk_live_`)

#### Variable 3: STRIPE_SUCCESS_URL
```
Key:   STRIPE_SUCCESS_URL
Value: https://decano-astrologico.vercel.app/subscription-success
```
✅ **URL de confirmación**: Esta es la URL a la que Stripe redirigirá al usuario después de un pago exitoso.

#### Variable 4: STRIPE_CANCEL_URL
```
Key:   STRIPE_CANCEL_URL
Value: https://decano-astrologico.vercel.app/plans
```
✅ **URL de cancelación**: Esta es la URL a la que Stripe redirigirá al usuario si cancela el proceso de pago.

#### Variable 5: STRIPE_WEBHOOK_SECRET (Opcional pero recomendado)
```
Key:   STRIPE_WEBHOOK_SECRET
Value: whsec_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz
```
☝️ **Cómo obtenerlo**: 
1. Ve a https://dashboard.stripe.com/test/webhooks
2. Crea un endpoint con URL: `https://fraktal-api.onrender.com/subscriptions/webhook`
3. Selecciona eventos: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`
4. Copia el "Signing secret" (empieza con `whsec_...`)
5. Pega aquí el valor completo

📖 **Ver guía detallada**: [STRIPE_URLS_PROYECTO.md](STRIPE_URLS_PROYECTO.md)

### Paso 4: Guardar Cambios

1. Después de agregar/editar TODAS las variables, haz clic en **"Save Changes"** (botón azul arriba)
2. Render **reiniciará automáticamente** tu servicio
3. Espera 1-2 minutos a que termine el deploy

### Paso 5: Verificar en Logs

1. Ve a la pestaña **"Logs"** en Render
2. Busca líneas que digan:
   ```
   [STRIPE] Initialized successfully
   ```
3. Si ves errores como `Invalid API Key`, verifica que copiaste la clave completa sin espacios

---

## 🚀 PARTE 2: Configurar VERCEL (Frontend)

### Paso 1: Acceder a tu proyecto en Vercel

1. Ve a https://vercel.com/dashboard
2. Busca tu proyecto frontend (ej: `decano-astrologico`)
3. Haz clic en el nombre del proyecto

### Paso 2: Ir a Settings

1. En la parte superior, haz clic en **"Settings"**
2. En el menú lateral izquierdo, haz clic en **"Environment Variables"**

### Paso 3: Agregar Variable de Stripe

1. Verás un formulario con tres campos:
   - **Name**: Nombre de la variable
   - **Value**: Valor de la variable
   - **Environments**: Dónde aplicar (Production, Preview, Development)

2. Rellena así:
   ```
   Name:  VITE_STRIPE_PUBLISHABLE_KEY
   Value: pk_test_51ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456
   ```
   ☝️ **Reemplaza el valor** con tu Publishable Key real de Stripe

3. Selecciona los 3 checkboxes:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

4. Haz clic en **"Save"**

### Paso 4: Verificar otras variables necesarias

Asegúrate de tener también estas variables configuradas:

```
VITE_API_URL=https://tu-backend.onrender.com
```
☝️ La URL de tu backend en Render (sin el trailing slash)

### Paso 5: Redeploy el Frontend

**⚠️ IMPORTANTE**: Los cambios en variables de entorno **NO** se aplican automáticamente.

1. Ve a la pestaña **"Deployments"**
2. Busca el deployment más reciente (el de arriba)
3. Haz clic en el botón **"..."** (tres puntos) → **"Redeploy"**
4. Confirma haciendo clic en **"Redeploy"** en el modal
5. Espera 1-2 minutos a que termine el deploy

---

## 🎯 PARTE 3: Configurar Webhooks de Stripe (Opcional pero Recomendado)

Los webhooks permiten que Stripe notifique a tu backend cuando ocurren eventos (pagos exitosos, suscripciones canceladas, etc.)

### Paso 1: Crear endpoint en Stripe

1. Ve a https://dashboard.stripe.com/test/webhooks
2. Haz clic en **"Add endpoint"**
3. Rellena:
   ```
   Endpoint URL: https://fraktal-api.onrender.com/subscriptions/webhook
   ```
   ⚠️ **IMPORTANTE**: Verifica la URL real de tu backend en Render Dashboard. Puede variar según el nombre del servicio.

4. En **"Events to send"**, selecciona:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`

5. Haz clic en **"Add endpoint"**

### Paso 2: Copiar Signing Secret

1. Después de crear el endpoint, verás una página con detalles
2. Busca la sección **"Signing secret"**
3. Haz clic en **"Reveal"** o **"Click to reveal"**
4. Copia el secret (empieza con `whsec_...`)

### Paso 3: Agregar a Render

1. Vuelve a Render → Tu servicio → Environment
2. Busca o crea `STRIPE_WEBHOOK_SECRET`
3. Pega el signing secret que copiaste
4. Guarda los cambios

---

## ✅ VERIFICACIÓN FINAL

### Checklist para Render:

- [ ] `STRIPE_SECRET_KEY` = sk_test_51... (tu clave real)
- [ ] `STRIPE_PUBLISHABLE_KEY` = pk_test_51... (tu clave real)
- [ ] `STRIPE_SUCCESS_URL` = https://tu-app.vercel.app/subscription-success
- [ ] `STRIPE_CANCEL_URL` = https://tu-app.vercel.app/plans
- [ ] (Opcional) `STRIPE_WEBHOOK_SECRET` = whsec_...
- [ ] El servicio se redeployó automáticamente después de guardar

### Checklist para Vercel:

- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` = pk_test_51... (tu clave real)
- [ ] `VITE_API_URL` = https://tu-backend.onrender.com
- [ ] Hiciste **Redeploy manual** después de agregar variables

### Test en la App:

1. **Abre tu app**: https://tu-app.vercel.app
2. **Inicia sesión** con tu usuario
3. **Ve a Planes de Suscripción** (botón en el menú)
4. **Haz clic en "Suscribirse"** en cualquier plan
5. **Deberías ver**: La página de checkout de Stripe (fondo blanco/azul con logo de Stripe)

**Si ves un error** en lugar del checkout:
- Abre la consola del navegador (F12)
- Busca mensajes de error
- Revisa los logs de Render

### Usar Tarjeta de Prueba

Para probar el pago en modo test, usa esta tarjeta:

```
Número: 4242 4242 4242 4242
Fecha: 12/34 (cualquier fecha futura)
CVC: 123 (cualquier 3 dígitos)
Código postal: 12345 (cualquier código)
```

Si todo funciona:
- ✅ Serás redirigido a `/subscription-success`
- ✅ Verás un mensaje de confirmación
- ✅ Tu suscripción aparecerá en el panel de usuario

---

## 🐛 Problemas Comunes

### Error: "Invalid API Key provided"

**Causa**: La clave tiene espacios, está incompleta o es incorrecta

**Solución**:
1. Ve a Stripe Dashboard → API Keys
2. Copia de nuevo la clave completa
3. Asegúrate de copiar TODO (empieza con `sk_test_51` o `sk_live_51`)
4. Pega en Render sin espacios al principio o final
5. Guarda y espera a que Render redeploy

### Error: "Webhook signature verification failed"

**Causa**: El `STRIPE_WEBHOOK_SECRET` es incorrecto o no está configurado

**Solución**:
1. Ve a Stripe Dashboard → Webhooks
2. Haz clic en tu endpoint
3. Copia de nuevo el Signing Secret
4. Actualiza `STRIPE_WEBHOOK_SECRET` en Render

### El checkout no se abre

**Causa**: Variable `VITE_STRIPE_PUBLISHABLE_KEY` no está en Vercel o no se hizo redeploy

**Solución**:
1. Verifica que la variable existe en Vercel
2. Asegúrate de haber hecho **Redeploy** después de agregarla
3. Limpia el cache del navegador (Ctrl + Shift + R)

---

## 📝 Resumen de Variables

### Variables en RENDER (Backend):
```bash
STRIPE_SECRET_KEY=sk_test_...          # Clave secreta de Stripe
STRIPE_PUBLISHABLE_KEY=pk_test_...     # Clave pública (opcional en backend)
STRIPE_SUCCESS_URL=https://...         # URL de éxito después del pago
STRIPE_CANCEL_URL=https://...          # URL de cancelación
STRIPE_WEBHOOK_SECRET=whsec_...        # Secret para webhooks (opcional)
```

### Variables en VERCEL (Frontend):
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Clave pública para el frontend
VITE_API_URL=https://...                 # URL del backend en Render
```

---

## 🆘 ¿Necesitas Ayuda?

Si después de seguir esta guía aún tienes problemas:

1. **Revisa los logs**:
   - Render: Dashboard → Tu servicio → Logs
   - Vercel: Dashboard → Tu proyecto → Deployments → [último] → Runtime Logs
   - Browser: F12 → Console

2. **Verifica las URLs**:
   - Backend Render URL (debe terminar en `.onrender.com`)
   - Frontend Vercel URL (debe terminar en `.vercel.app`)

3. **Contacta con soporte**:
   - Stripe Support Chat en Dashboard
   - Render Support: support@render.com
   - Vercel Support: https://vercel.com/support

---

**¡Listo!** Con esta configuración, tu sistema de suscripciones con Stripe debería funcionar perfectamente. 🎉

