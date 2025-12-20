# 🚀 Guía de Configuración de Stripe

## 📋 PASO 1: Crear Cuenta en Stripe

1. Ve a https://dashboard.stripe.com/register
2. Crea una cuenta (usa tu email de empresa)
3. **IMPORTANTE**: Empieza en **modo TEST** (no requiere verificación inmediata)

---

## 🔑 PASO 2: Obtener API Keys

### Modo Test (para desarrollo):

1. Ve a: https://dashboard.stripe.com/test/apikeys
2. Copia las siguientes keys:
   - **Publishable key** (empieza con `pk_test_...`)
   - **Secret key** (empieza con `sk_test_...`)

### Agregar a `.env`:

```bash
# backend/.env
STRIPE_SECRET_KEY=sk_test_TU_SECRET_KEY_AQUI
STRIPE_PUBLISHABLE_KEY=pk_test_TU_PUBLISHABLE_KEY_AQUI
```

---

## 🪝 PASO 3: Configurar Webhook (Importante!)

Los webhooks permiten que Stripe notifique al backend cuando un pago se completa.

### Opción A: Desarrollo Local (usando Stripe CLI)

1. **Instalar Stripe CLI:**
   - Windows: Descarga desde https://github.com/stripe/stripe-cli/releases
   - macOS: `brew install stripe/stripe-brew/stripe`
   - Linux: Descarga binario desde releases

2. **Iniciar sesión:**
   ```bash
   stripe login
   ```

3. **Crear webhook local:**
   ```bash
   stripe listen --forward-to http://localhost:8000/subscriptions/webhook
   ```

4. **Copiar webhook secret:**
   - El comando anterior mostrará algo como: `whsec_...`
   - Agregar a `.env`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_EL_SECRET_AQUI
   ```

5. **Dejar corriendo:**
   - Mientras desarrollas, deja `stripe listen` corriendo en una terminal
   - Verás los eventos en tiempo real

### Opción B: Producción (Render/Vercel)

1. Ve a: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. URL del webhook: `https://TU_DOMINIO.onrender.com/subscriptions/webhook`
4. Eventos a escuchar:
   - `checkout.session.completed`
   - `invoice.paid`
   - `customer.subscription.deleted`
5. Copia el "Signing secret" (whsec_...)
6. Agregar a variables de entorno de Render:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

---

## 💳 PASO 4: Tarjetas de Prueba

En modo test, usa estas tarjetas para simular pagos:

| Tarjeta | Comportamiento |
|---------|----------------|
| `4242 4242 4242 4242` | ✅ Pago exitoso |
| `4000 0000 0000 0002` | ❌ Tarjeta rechazada |
| `4000 0025 0000 3155` | 🔐 Requiere autenticación 3D Secure |

**Datos adicionales** (pueden ser cualquier cosa en test mode):
- CVV: Cualquier 3 dígitos (ej: 123)
- Fecha expiración: Cualquier fecha futura (ej: 12/25)
- Nombre: Cualquier nombre
- Código postal: Cualquier ZIP (ej: 12345)

---

## 🧪 PASO 5: Probar el Flujo Completo

### Test 1: Pago Exitoso

1. Iniciar backend:
   ```bash
   cd backend
   python -m uvicorn main:app --reload
   ```

2. Iniciar frontend:
   ```bash
   npm run dev
   ```

3. Registrarse/Login en la app

4. Click en botón "Planes" (corona)

5. Seleccionar plan PRO → Click "Suscribirse"

6. En Stripe Checkout:
   - Tarjeta: `4242 4242 4242 4242`
   - Fecha: `12/25`
   - CVV: `123`
   - Click "Pagar"

7. **Verificar webhook:**
   - En terminal con `stripe listen` verás: `checkout.session.completed`
   - Backend imprimirá: `✅ Suscripción activada para user...`
   - Frontend redirigirá a `/subscription-success`

8. **Verificar en base de datos:**
   ```bash
   # MongoDB
   db.user_subscriptions.find({tier: "pro"})
   db.payments.find({status: "completed"})
   ```

### Test 2: Pago Fallido

1. Repetir pasos 1-5
2. Usar tarjeta: `4000 0000 0000 0002`
3. Stripe mostrará error
4. Suscripción NO se actualiza

### Test 3: Usuario Cancela

1. Repetir pasos 1-5
2. Click "← Volver" en Stripe Checkout
3. Frontend vuelve a `/plans`
4. Suscripción NO se actualiza

---

## 📊 PASO 6: Verificar en Dashboard de Stripe

1. Ve a: https://dashboard.stripe.com/test/payments
2. Verás los pagos de prueba
3. Click en un pago para ver detalles
4. Verás metadata: `user_id`, `plan_id`, etc.

---

## 🚀 PASO 7: Pasar a Producción

⚠️ **NO hacer esto hasta estar listo para cobrar de verdad**

1. **Activar cuenta:**
   - Stripe pedirá verificar identidad
   - Datos bancarios para recibir pagos
   - Información fiscal

2. **Obtener keys de producción:**
   - https://dashboard.stripe.com/apikeys
   - `pk_live_...` y `sk_live_...`

3. **Actualizar `.env` de producción:**
   ```bash
   STRIPE_SECRET_KEY=sk_live_...  # NO sk_test_
   STRIPE_PUBLISHABLE_KEY=pk_live_...  # NO pk_test_
   ```

4. **Configurar webhook de producción:**
   - URL: `https://decano-astrologico.onrender.com/subscriptions/webhook`
   - Eventos: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`

5. **Actualizar frontend:**
   - Archivo `.env.production`:
   ```bash
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```

6. **Probar con tarjeta real:**
   - Usar tarjeta propia (se cobrará 0.01€ para verificar)
   - Cancelar inmediatamente después

---

## 🔒 Seguridad

### ✅ LO QUE HACE BIEN:
- Backend **nunca** ve datos de tarjeta
- Stripe maneja PCI compliance
- Webhooks verifican firma
- JWT protege endpoints

### ❌ NUNCA HACER:
- Almacenar números de tarjeta
- Mostrar `STRIPE_SECRET_KEY` en frontend
- Ignorar verificación de webhook signature
- Usar keys de producción en desarrollo

---

## 📱 URLs Importantes

| Recurso | URL |
|---------|-----|
| Dashboard Test | https://dashboard.stripe.com/test |
| Dashboard Producción | https://dashboard.stripe.com |
| Webhooks Test | https://dashboard.stripe.com/test/webhooks |
| API Keys Test | https://dashboard.stripe.com/test/apikeys |
| Pagos Test | https://dashboard.stripe.com/test/payments |
| Documentación | https://stripe.com/docs |
| Stripe CLI | https://stripe.com/docs/stripe-cli |

---

## 🆘 Troubleshooting

### Problema: "No such customer"
**Solución**: El `stripe_customer_id` en MongoDB no es válido. Eliminar campo y dejar que se cree uno nuevo.

### Problema: Webhook no se recibe
**Solución**:
1. Verificar que `stripe listen` está corriendo
2. Ver logs del webhook en: https://dashboard.stripe.com/test/webhooks
3. Verificar URL del webhook (debe ser accesible públicamente en prod)

### Problema: "Invalid signature"
**Solución**:
1. Verificar que `STRIPE_WEBHOOK_SECRET` es correcto
2. No modificar payload del webhook antes de verificar

### Problema: Pago se completa pero suscripción no se actualiza
**Solución**:
1. Ver logs del webhook en backend
2. Verificar que `user_id` se está enviando en metadata
3. Verificar MongoDB connection

---

## 📝 Variables de Entorno Completas

```bash
# backend/.env

# MongoDB
MONGODB_URI=mongodb+srv://...
SECRET_KEY=tu-secret-key-jwt

# Stripe TEST
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=http://localhost:5173/subscription-success
STRIPE_CANCEL_URL=http://localhost:5173/plans

# Stripe PRODUCCIÓN (cuando esté listo)
# STRIPE_SECRET_KEY=sk_live_51...
# STRIPE_PUBLISHABLE_KEY=pk_live_51...
# STRIPE_WEBHOOK_SECRET=whsec_... (de webhook de producción)
# STRIPE_SUCCESS_URL=https://decano-astrologico.vercel.app/subscription-success
# STRIPE_CANCEL_URL=https://decano-astrologico.vercel.app/plans
```

---

## ✅ Checklist Final

Antes de lanzar a producción:

- [ ] Cuenta Stripe activada y verificada
- [ ] Keys de producción configuradas
- [ ] Webhook de producción creado y funcionando
- [ ] Probado con tarjeta real
- [ ] SSL/HTTPS habilitado
- [ ] Términos y condiciones actualizados
- [ ] Política de privacidad incluye Stripe
- [ ] Política de reembolsos definida
- [ ] Email de confirmación de pago configurado
- [ ] Backup de base de datos configurado

---

*Última actualización: 2025-12-14*
