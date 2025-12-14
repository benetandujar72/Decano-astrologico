# 🔑 Configuración de Variables de Stripe en Render y Vercel

Esta guía te muestra **exactamente** cómo configurar las claves de Stripe en tus servicios de deployment.

---

## 📋 Prerequisitos

Antes de empezar, necesitas obtener tus claves de Stripe:

### Paso 0: Obtener claves de Stripe

1. **Inicia sesión en Stripe**: https://dashboard.stripe.com/
2. **Ve a Developers → API Keys**:
   - Modo Test: https://dashboard.stripe.com/test/apikeys
   - Modo Live: https://dashboard.stripe.com/apikeys (solo cuando estés listo para producción)

3. **Copia estas claves**:
   ```
   ✅ Secret key (backend):     sk_test_51ABCxyz...
   ✅ Publishable key (frontend): pk_test_51ABCxyz...
   ```

**⚠️ IMPORTANTE**:
- Para desarrollo/testing usa claves que empiezan con `sk_test_` y `pk_test_`
- Para producción usa claves que empiezan con `sk_live_` y `pk_live_`
- **NUNCA** subas estas claves a GitHub

---

## 🔧 PARTE 1: Configurar RENDER (Backend)

### Paso 1: Acceder a tu servicio en Render

1. Ve a https://dashboard.render.com/
2. Busca tu servicio backend (normalmente llamado algo como `decano-astrologico-backend` o `fraktal-api`)
3. Haz clic en el nombre del servicio

### Paso 2: Ir a Environment Variables

1. En el menú lateral izquierdo, haz clic en **"Environment"**
2. Verás una lista de variables de entorno existentes

### Paso 3: Buscar variables de Stripe existentes

Busca estas variables (pueden tener valores placeholder):
```
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_SUCCESS_URL
STRIPE_CANCEL_URL
```

### Paso 4: Actualizar/Agregar variables

**Si la variable YA EXISTE**:
1. Haz clic en el icono de **lápiz (editar)** al lado de la variable
2. Reemplaza el valor con tu clave real
3. Haz clic en **"Save"**

**Si la variable NO EXISTE**:
1. Haz clic en **"Add Environment Variable"**
2. Rellena:
   - **Key**: El nombre de la variable (ej: `STRIPE_SECRET_KEY`)
   - **Value**: El valor real de Stripe

### Paso 5: Configurar TODAS las variables de Stripe

Agrega/actualiza estas variables con TUS valores:

```bash
# ============================================
# CLAVES DE STRIPE (OBLIGATORIAS)
# ============================================
STRIPE_SECRET_KEY=sk_test_51ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456
# ☝️ Reemplaza con tu Secret Key de Stripe Dashboard

STRIPE_PUBLISHABLE_KEY=pk_test_51ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456
# ☝️ Reemplaza con tu Publishable Key de Stripe Dashboard

# ============================================
# URLs DE REDIRECCIONAMIENTO
# ============================================
STRIPE_SUCCESS_URL=https://decano-astrologico.vercel.app/subscription-success
# ☝️ Reemplaza con la URL de TU frontend en Vercel + /subscription-success

STRIPE_CANCEL_URL=https://decano-astrologico.vercel.app/plans
# ☝️ Reemplaza con la URL de TU frontend en Vercel + /plans

# ============================================
# WEBHOOK SECRET (OPCIONAL - Ver Paso 6)
# ============================================
STRIPE_WEBHOOK_SECRET=whsec_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz
# ☝️ Solo si configuraste webhooks (ver más abajo)
```

### Paso 6: Guardar cambios

1. Después de agregar/editar TODAS las variables, haz clic en **"Save Changes"** (botón azul arriba)
2. Render **reiniciará automáticamente** tu servicio
3. Espera 1-2 minutos a que termine el deploy

### Paso 7: Verificar en logs

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

### Paso 3: Agregar variable de Stripe

1. Verás un formulario con tres campos:
   - **Name**: Nombre de la variable
   - **Value**: Valor de la variable
   - **Environments**: Dónde aplicar (Production, Preview, Development)

2. Rellena así:
   ```
   Name:  VITE_STRIPE_PUBLISHABLE_KEY
   Value: pk_test_51ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456
   ```
   ☝️ **Reemplaza el valor** con tu Publishable Key de Stripe

3. Selecciona los 3 checkboxes:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

4. Haz clic en **"Save"**

### Paso 4: Verificar otras variables necesarias

Asegúrate de tener también:

```bash
VITE_API_URL=https://tu-backend.onrender.com
# ☝️ La URL de tu backend en Render (sin el trailing slash)

VITE_GEMINI_API_KEY=tu_api_key_de_gemini
# ☝️ Tu API key de Google Gemini (para análisis IA)
```

### Paso 5: Redeploy el frontend

**IMPORTANTE**: Los cambios en variables de entorno **NO** se aplican automáticamente.

1. Ve a la pestaña **"Deployments"**
2. Busca el deployment más reciente (el de arriba)
3. Haz clic en el botón **"..."** (tres puntos) → **"Redeploy"**
4. Confirma haciendo clic en **"Redeploy"** en el modal
5. Espera 1-2 minutos a que termine el deploy

---

## 🎯 PARTE 3: Configurar Webhooks de Stripe (OPCIONAL pero recomendado)

Los webhooks permiten que Stripe notifique a tu backend cuando ocurren eventos (pagos exitosos, suscripciones canceladas, etc.)

### Paso 1: Crear endpoint en Stripe

1. Ve a https://dashboard.stripe.com/test/webhooks
2. Haz clic en **"Add endpoint"**
3. Rellena:
   ```
   Endpoint URL: https://tu-backend.onrender.com/subscriptions/webhook
   ```
   ☝️ Reemplaza `tu-backend.onrender.com` con la URL real de tu backend en Render

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
2. Busca `STRIPE_WEBHOOK_SECRET`
3. Pega el signing secret que copiaste
4. Guarda los cambios

---

## ✅ VERIFICACIÓN FINAL

### Test 1: Verificar que Render tiene las variables

1. Ve a Render → Tu servicio → Environment
2. Verifica que veas (valores parcialmente ocultos):
   ```
   STRIPE_SECRET_KEY = sk_test_51ABC...xyz (secret)
   STRIPE_PUBLISHABLE_KEY = pk_test_51ABC...xyz
   STRIPE_SUCCESS_URL = https://tu-app.vercel.app/subscription-success
   STRIPE_CANCEL_URL = https://tu-app.vercel.app/plans
   STRIPE_WEBHOOK_SECRET = whsec_ABC...xyz (secret)
   ```

### Test 2: Verificar que Vercel tiene las variables

1. Ve a Vercel → Tu proyecto → Settings → Environment Variables
2. Verifica que veas:
   ```
   VITE_STRIPE_PUBLISHABLE_KEY = pk_test_51ABC...xyz
   VITE_API_URL = https://tu-backend.onrender.com
   ```

### Test 3: Probar el flujo de pago

1. **Abre tu app**: https://tu-app.vercel.app
2. **Inicia sesión** con tu usuario
3. **Ve a Planes de Suscripción** (botón en el menú)
4. **Haz clic en "Suscribirse"** en cualquier plan
5. **Deberías ver**: La página de checkout de Stripe (fondo blanco/azul con logo de Stripe)

**Si ves un error** en lugar del checkout:
- Abre la consola del navegador (F12)
- Busca mensajes de error
- Revisa los logs de Render

### Test 4: Usar tarjeta de prueba

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

### Error: "No such price"

**Causa**: Los IDs de los planes en el código no coinciden con los de Stripe

**Solución**:
1. Ve a Stripe Dashboard → Products
2. Crea los productos y precios
3. Copia los Price IDs (empiezan con `price_...`)
4. Actualiza el código en `backend/app/services/stripe_service.py`

### Error: "Webhook signature verification failed"

**Causa**: El `STRIPE_WEBHOOK_SECRET` es incorrecto o no está configurado

**Solución**:
1. Ve a Stripe Dashboard → Webhooks
2. Haz clic en tu endpoint
3. Copia de nuevo el Signing Secret
4. Actualiza `STRIPE_WEBHOOK_SECRET` en Render

### El checkout no se abre

**Causa**: Variable `VITE_STRIPE_PUBLISHABLE_KEY` no está en Vercel

**Solución**:
1. Verifica que la variable existe en Vercel
2. Asegúrate de haber hecho **Redeploy** después de agregarla
3. Limpia el cache del navegador (Ctrl + Shift + R)

---

## 📝 Checklist Final

Antes de dar por terminada la configuración, verifica:

**En Stripe Dashboard**:
- [ ] Tienes acceso a https://dashboard.stripe.com/
- [ ] Copiaste Secret Key (sk_test_...)
- [ ] Copiaste Publishable Key (pk_test_...)
- [ ] (Opcional) Creaste webhook y copiaste signing secret

**En Render**:
- [ ] `STRIPE_SECRET_KEY` = sk_test_51... (tu clave real)
- [ ] `STRIPE_PUBLISHABLE_KEY` = pk_test_51... (tu clave real)
- [ ] `STRIPE_SUCCESS_URL` = https://tu-app.vercel.app/subscription-success
- [ ] `STRIPE_CANCEL_URL` = https://tu-app.vercel.app/plans
- [ ] (Opcional) `STRIPE_WEBHOOK_SECRET` = whsec_...
- [ ] El servicio se redeployó automáticamente después de guardar

**En Vercel**:
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` = pk_test_51... (tu clave real)
- [ ] `VITE_API_URL` = https://tu-backend.onrender.com
- [ ] Hiciste Redeploy manual después de agregar variables

**En la App**:
- [ ] Puedes iniciar sesión
- [ ] Ves el botón "Planes de Suscripción"
- [ ] Al hacer clic en "Suscribirse", se abre el checkout de Stripe
- [ ] Puedes completar el pago con tarjeta de prueba
- [ ] Eres redirigido a /subscription-success

---

## 🎓 Recursos Adicionales

- **Stripe Dashboard**: https://dashboard.stripe.com/
- **Stripe Testing**: https://stripe.com/docs/testing
- **Render Docs**: https://render.com/docs/environment-variables
- **Vercel Docs**: https://vercel.com/docs/concepts/projects/environment-variables
- **Guía completa de Stripe**: [STRIPE_SETUP_GUIDE.md](STRIPE_SETUP_GUIDE.md)
- **Troubleshooting**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

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
