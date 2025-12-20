# 📋 Variables de Stripe - Listas para Copiar

Este archivo contiene las variables de Stripe **listas para copiar y pegar** en Render y Vercel.

---

## 🔧 Variables para RENDER (Backend)

Copia estas variables y pégalas en **Render Dashboard → Tu Servicio → Environment → Add Environment Variable**:

### 1. STRIPE_SECRET_KEY
```
STRIPE_SECRET_KEY
```
**Valor**: `sk_test_TU_SECRET_KEY_AQUI`
- Obtener de: https://dashboard.stripe.com/test/apikeys
- Es la clave que empieza con `sk_test_...` o `sk_live_...`

### 2. STRIPE_PUBLISHABLE_KEY
```
STRIPE_PUBLISHABLE_KEY
```
**Valor**: `pk_test_TU_PUBLISHABLE_KEY_AQUI`
- Obtener de: https://dashboard.stripe.com/test/apikeys
- Es la clave que empieza con `pk_test_...` o `pk_live_...`

### 3. STRIPE_SUCCESS_URL
```
STRIPE_SUCCESS_URL
```
**Valor**: 
```
https://decano-astrologico.vercel.app/subscription-success
```
✅ URL de confirmación después del pago exitoso

### 4. STRIPE_CANCEL_URL
```
STRIPE_CANCEL_URL
```
**Valor**: 
```
https://decano-astrologico.vercel.app/plans
```
✅ URL de cancelación si el usuario cancela el pago

### 5. STRIPE_WEBHOOK_SECRET
```
STRIPE_WEBHOOK_SECRET
```
**Valor**: `whsec_TU_WEBHOOK_SECRET_AQUI`
- Obtener de: https://dashboard.stripe.com/test/webhooks
- **Pasos para obtenerlo**:
  1. Ve a https://dashboard.stripe.com/test/webhooks
  2. Haz clic en **"Add endpoint"**
  3. URL del endpoint: `https://fraktal-api.onrender.com/subscriptions/webhook`
     ⚠️ Verifica la URL real de tu backend en Render
  4. Selecciona eventos:
     - ✅ `checkout.session.completed`
     - ✅ `customer.subscription.created`
     - ✅ `customer.subscription.updated`
     - ✅ `customer.subscription.deleted`
     - ✅ `invoice.payment_succeeded`
     - ✅ `invoice.payment_failed`
  5. Haz clic en **"Add endpoint"**
  6. Copia el **"Signing secret"** (empieza con `whsec_...`)
  7. Pega ese valor aquí

---

## 🚀 Variables para VERCEL (Frontend)

Copia esta variable y pégala en **Vercel Dashboard → Tu Proyecto → Settings → Environment Variables**:

### 1. VITE_STRIPE_PUBLISHABLE_KEY
```
VITE_STRIPE_PUBLISHABLE_KEY
```
**Valor**: `pk_test_TU_PUBLISHABLE_KEY_AQUI`
- Obtener de: https://dashboard.stripe.com/test/apikeys
- Es la misma clave que `STRIPE_PUBLISHABLE_KEY` del backend
- **IMPORTANTE**: Selecciona los 3 checkboxes (Production, Preview, Development)
- **IMPORTANTE**: Después de agregar, haz **Redeploy** del proyecto

---

## 📝 Resumen Rápido

### En Render, agrega estas 5 variables:
1. ✅ `STRIPE_SECRET_KEY` = `sk_test_...`
2. ✅ `STRIPE_PUBLISHABLE_KEY` = `pk_test_...`
3. ✅ `STRIPE_SUCCESS_URL` = `https://decano-astrologico.vercel.app/subscription-success`
4. ✅ `STRIPE_CANCEL_URL` = `https://decano-astrologico.vercel.app/plans`
5. ✅ `STRIPE_WEBHOOK_SECRET` = `whsec_...` (obtener de Stripe Dashboard)

### En Vercel, agrega esta 1 variable:
1. ✅ `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_test_...` (la misma que en Render)
2. ✅ **Haz Redeploy** después de agregar

---

## 🔍 Verificación

### Verificar URLs:
- ✅ Éxito: https://decano-astrologico.vercel.app/subscription-success
- ✅ Cancelación: https://decano-astrologico.vercel.app/plans
- ✅ Webhook: https://fraktal-api.onrender.com/subscriptions/webhook
  ⚠️ Verifica la URL real de tu backend en Render

### Verificar en Render:
1. Ve a Render Dashboard → Tu Servicio → Environment
2. Verifica que veas las 5 variables listadas arriba
3. Verifica que los valores no tengan espacios al principio o final

### Verificar en Vercel:
1. Ve a Vercel Dashboard → Tu Proyecto → Settings → Environment Variables
2. Verifica que veas `VITE_STRIPE_PUBLISHABLE_KEY`
3. Verifica que esté seleccionado para Production, Preview y Development
4. **Haz Redeploy** si acabas de agregar la variable

---

## 🆘 Si Necesitas Ayuda

- **Guía completa**: [CONFIGURAR_STRIPE_RAPIDO.md](CONFIGURAR_STRIPE_RAPIDO.md)
- **URLs del proyecto**: [STRIPE_URLS_PROYECTO.md](STRIPE_URLS_PROYECTO.md)
- **Configuración detallada**: [STRIPE_ENV_CONFIG.md](STRIPE_ENV_CONFIG.md)

---

**¡Listo!** Con estas variables configuradas, tu integración de Stripe debería funcionar. 🎉

