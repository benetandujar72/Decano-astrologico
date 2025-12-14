# 🧪 TEST: Verificar Acceso Admin a Planes

## Paso 1: Verifica que el servidor está corriendo
```powershell
# En PowerShell, verifica que el backend esté activo
cd backend
python main.py
```

Deberías ver algo como:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

---

## Paso 2: Abre la aplicación
```
http://localhost:5173
```

---

## Paso 3: Inicia sesión como administrador
- Usuario: `admin` (o tu usuario admin)
- Contraseña: (tu contraseña)

---

## Paso 4: Accede al Panel de Administración
1. Haz clic en tu perfil (esquina superior)
2. Haz clic en "Panel de Administración"
3. Deberías ver varios tabs

---

## Paso 5: Abre la pestaña "Mi Plan"
Deberías ver:
- 📘 Plan PRO
- 📙 Plan PREMIUM (marcado como "RECOMENDADO")
- 📕 Plan ENTERPRISE

---

## Paso 6: Prueba el endpoint directamente (si quieres debuggear)

### Abre DevTools (F12) → Console

Copia y ejecuta esto:

```javascript
const API_URL = 'http://localhost:8000';
const token = localStorage.getItem('fraktal_token');

fetch(`${API_URL}/admin/subscriptions/grant-plan`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    plan_tier: 'enterprise',
    duration_days: 365
  })
})
.then(r => r.json())
.then(d => console.log(d))
.catch(e => console.error(e));
```

---

## Paso 7: Verifica los logs

En la consola del servidor backend, deberías ver:

```
[ADMIN] grant_admin_plan_access llamado
✅ Suscripción actualizada correctamente
```

---

## ✅ Checklist

- [ ] Backend está corriendo en http://localhost:8000
- [ ] Frontend está corriendo en http://localhost:5173
- [ ] Estoy logueado como administrador
- [ ] Veo la tab "Mi Plan" en el Panel Admin
- [ ] El botón "Activar Plan" no está desactivado
- [ ] Cuando hago clic, veo un mensaje de éxito
- [ ] Los logs del servidor muestran operación exitosa

---

## 🐛 Si Algo Falla

### Error: "Se requieren permisos de administrador"
- ✗ No estás logueado como admin
- ✓ Verifica tu rol en la BD: `db.users.findOne({email: "tu@email.com"})`

### Error: "Plan inválido"
- ✗ Enviaste `plan_tier` incorrecto
- ✓ Debe ser: `pro`, `premium` o `enterprise` (minúsculas)

### Error: "Error de conexión"
- ✗ El servidor backend no está corriendo
- ✓ Verifica que `python backend/main.py` esté ejecutándose

### El botón se queda cargando
- ✗ Hay un error en el servidor
- ✓ Revisa los logs del backend (consola)
- ✓ Abre DevTools → Network → busca `grant-plan`
- ✓ Mira la respuesta (tab "Response")

### Dice "Activo" pero no veo cambios
- ✗ Necesitas recargar la página
- ✓ Presiona F5 o Ctrl+R
- ✓ Verifica tu suscripción en "Mi Perfil"

---

## 📊 Verificar en Base de Datos

Para confirmar que se guardó correctamente:

```javascript
// En MongoDB Compass o mongo shell:
use fraktal
db.user_subscriptions.findOne({user_id: "tu_admin_id"})
```

Deberías ver:
```json
{
  "_id": ObjectId(...),
  "user_id": "tu_admin_id",
  "tier": "enterprise",
  "status": "active",
  "billing_cycle": "admin_unlimited",
  "payment_status": "admin_granted",
  "admin_granted_at": "2024-12-14T...",
  "admin_plan_notes": "Plan Enterprise otorgado al administrador"
}
```

---

## 🎯 Próximos Pasos

Una vez activado el plan como admin:

1. **Genera una Carta Astrológica:**
   - Ve a "Generar Carta"
   - Completa el formulario
   - ¿Funciona? ✅

2. **Prueba características Premium:**
   - Exportar a PDF
   - Análisis avanzado
   - Etc.

3. **Ahora sí intenta el pago de usuario regular:**
   - Si es necesario, hazlo desde otro usuario
   - El flujo de Stripe debería funcionar correctamente

---

## 💬 Resumen

El nuevo método permite que:
- ✅ Admin acceda a TODOS los planes instantáneamente
- ✅ NO necesita Stripe
- ✅ NO paga nada
- ✅ Acceso ilimitado por 1 año (renovable)
- ✅ Puede probar todas las features antes de ofrecerlas
