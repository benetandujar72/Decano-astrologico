# 🔗 URLs y Configuración de Stripe para el Proyecto

Este archivo contiene las URLs específicas y la configuración de webhook para tu proyecto.

---

## 📍 URLs del Proyecto

### Frontend (Vercel):
```
URL Base: https://decano-astrologico.vercel.app
```

### Backend (Render):
```
URL Base: https://fraktal-api.onrender.com
```
⚠️ **Nota**: Verifica la URL real de tu backend en Render Dashboard. Puede variar según el nombre del servicio.

---

## ✅ URLs de Stripe para Configurar en Render

### STRIPE_SUCCESS_URL
```
https://decano-astrologico.vercel.app/subscription-success
```
Esta es la URL a la que Stripe redirigirá al usuario después de un pago exitoso.

### STRIPE_CANCEL_URL
```
https://decano-astrologico.vercel.app/plans
```
Esta es la URL a la que Stripe redirigirá al usuario si cancela el proceso de pago.

---

## 🪝 Configuración del Webhook de Stripe

### URL del Webhook Endpoint
```
https://fraktal-api.onrender.com/subscriptions/webhook
```
⚠️ **IMPORTANTE**: Reemplaza `fraktal-api.onrender.com` con la URL real de tu backend en Render.

### Cómo Obtener el STRIPE_WEBHOOK_SECRET

#### Paso 1: Acceder a Stripe Dashboard
1. Ve a https://dashboard.stripe.com/test/webhooks
2. Si estás en modo producción, ve a https://dashboard.stripe.com/webhooks

#### Paso 2: Crear o Verificar el Webhook Endpoint

**Si NO tienes un webhook creado:**

1. Haz clic en **"Add endpoint"** o **"Add webhook endpoint"**
2. Rellena el formulario:
   ```
   Endpoint URL: https://fraktal-api.onrender.com/subscriptions/webhook
   ```
   ☝️ Reemplaza con la URL real de tu backend

3. En **"Events to send"** o **"Select events"**, selecciona estos eventos:
   - ✅ `checkout.session.completed` - Cuando se completa un pago
   - ✅ `customer.subscription.created` - Cuando se crea una suscripción
   - ✅ `customer.subscription.updated` - Cuando se actualiza una suscripción
   - ✅ `customer.subscription.deleted` - Cuando se cancela una suscripción
   - ✅ `invoice.payment_succeeded` - Cuando se procesa un pago recurrente
   - ✅ `invoice.payment_failed` - Cuando falla un pago recurrente

4. Haz clic en **"Add endpoint"** o **"Add webhook"**

**Si YA tienes un webhook creado:**

1. Haz clic en el webhook existente en la lista
2. Verifica que la URL sea correcta
3. Si necesitas actualizar la URL, haz clic en **"Edit"** o **"Update endpoint"**

#### Paso 3: Obtener el Signing Secret

1. Después de crear/editar el webhook, verás la página de detalles
2. Busca la sección **"Signing secret"** o **"Webhook signing secret"**
3. Haz clic en **"Reveal"**, **"Click to reveal"** o **"Show"**
4. Copia el secret completo (empieza con `whsec_...`)

**Ejemplo de Signing Secret:**
```
whsec_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890
```

⚠️ **IMPORTANTE**: 
- Este secret es diferente para cada webhook endpoint
- Si cambias la URL del webhook, necesitarás un nuevo secret
- El secret de modo TEST es diferente al de modo LIVE

---

## 📋 Resumen de Variables para Render

Copia y pega estas variables en Render Dashboard → Environment:

```bash
# ============================================
# CLAVES DE STRIPE (OBLIGATORIAS)
# ============================================
STRIPE_SECRET_KEY=sk_test_TU_SECRET_KEY_AQUI
# ☝️ Obtener de: https://dashboard.stripe.com/test/apikeys

STRIPE_PUBLISHABLE_KEY=pk_test_TU_PUBLISHABLE_KEY_AQUI
# ☝️ Obtener de: https://dashboard.stripe.com/test/apikeys

# ============================================
# URLs DE REDIRECCIONAMIENTO
# ============================================
STRIPE_SUCCESS_URL=https://decano-astrologico.vercel.app/subscription-success
# ☝️ URL de confirmación después del pago exitoso

STRIPE_CANCEL_URL=https://decano-astrologico.vercel.app/plans
# ☝️ URL de cancelación si el usuario cancela el pago

# ============================================
# WEBHOOK SECRET (OPCIONAL pero RECOMENDADO)
# ============================================
STRIPE_WEBHOOK_SECRET=whsec_TU_WEBHOOK_SECRET_AQUI
# ☝️ Obtener de: https://dashboard.stripe.com/test/webhooks
#    Después de crear el endpoint en el paso anterior
```

---

## 🔍 Verificar que las URLs Funcionan

### Verificar URL de Éxito:
1. Abre en el navegador: `https://decano-astrologico.vercel.app/subscription-success`
2. Deberías ver la página de confirmación de suscripción

### Verificar URL de Cancelación:
1. Abre en el navegador: `https://decano-astrologico.vercel.app/plans`
2. Deberías ver la página de planes de suscripción

### Verificar Webhook Endpoint:
1. Abre en el navegador: `https://fraktal-api.onrender.com/subscriptions/webhook`
2. Deberías recibir un error (es normal, el webhook solo acepta POST desde Stripe)
3. Si ves un error 404, verifica que el endpoint esté correctamente configurado en el backend

---

## 🧪 Probar el Webhook (Modo Test)

### Opción 1: Usar Stripe CLI (Recomendado para desarrollo local)

1. **Instalar Stripe CLI:**
   - Windows: Descarga desde https://github.com/stripe/stripe-cli/releases
   - macOS: `brew install stripe/stripe-brew/stripe`
   - Linux: Descarga binario desde releases

2. **Iniciar sesión:**
   ```bash
   stripe login
   ```

3. **Escuchar eventos (para desarrollo local):**
   ```bash
   stripe listen --forward-to http://localhost:8000/subscriptions/webhook
   ```
   Esto mostrará un webhook secret que puedes usar localmente.

### Opción 2: Usar Stripe Dashboard (Para producción)

1. Ve a https://dashboard.stripe.com/test/webhooks
2. Haz clic en tu webhook endpoint
3. Haz clic en **"Send test webhook"** o **"Send test event"**
4. Selecciona el evento: `checkout.session.completed`
5. Haz clic en **"Send test webhook"**
6. Verifica en los logs de Render que el webhook fue recibido correctamente

---

## ⚠️ Notas Importantes

1. **URLs de Producción vs Test:**
   - Las URLs mostradas arriba son para producción
   - Si estás en desarrollo, usa `http://localhost:5173` para las URLs de éxito/cancelación

2. **Actualizar URLs si cambias el dominio:**
   - Si cambias el dominio de Vercel, actualiza `STRIPE_SUCCESS_URL` y `STRIPE_CANCEL_URL` en Render
   - Si cambias la URL del backend, actualiza el webhook en Stripe Dashboard

3. **Webhook Secret:**
   - Cada webhook endpoint tiene su propio secret único
   - No compartas el secret públicamente
   - Si expones el secret, crea un nuevo webhook endpoint y obtén un nuevo secret

4. **Modo Test vs Live:**
   - En modo TEST, usa claves que empiezan con `sk_test_` y `pk_test_`
   - En modo LIVE, usa claves que empiezan con `sk_live_` y `pk_live_`
   - Los webhooks también son diferentes entre test y live

---

## 🆘 Si Algo No Funciona

### El webhook no recibe eventos:
1. Verifica que la URL del webhook sea correcta y accesible
2. Verifica que `STRIPE_WEBHOOK_SECRET` esté configurado correctamente en Render
3. Revisa los logs de Render para ver si hay errores
4. Verifica en Stripe Dashboard que los eventos se estén enviando

### Las URLs de redirección no funcionan:
1. Verifica que las rutas existan en tu frontend
2. Verifica que el dominio de Vercel sea correcto
3. Prueba abriendo las URLs directamente en el navegador

### Error "Invalid webhook signature":
1. Verifica que copiaste el webhook secret completo (empieza con `whsec_`)
2. Verifica que no haya espacios al principio o final del secret
3. Asegúrate de estar usando el secret correcto (test vs live)

---

**¡Listo!** Con estas URLs y configuración, tu integración de Stripe debería funcionar correctamente. 🎉

