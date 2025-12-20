# 🚀 Guía de Deployment - FRAKTAL App

Deployment completo en producción: **Render (Backend) + Vercel (Frontend) + MongoDB Atlas**

---

## 📋 Requisitos Previos

- [ ] Cuenta en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (gratuita)
- [ ] Cuenta en [Render](https://render.com) (gratuita)
- [ ] Cuenta en [Vercel](https://vercel.com) (gratuita)
- [ ] Repositorio en GitHub con el código

---

## 🗄️ Paso 1: Configurar MongoDB Atlas

### 1.1 Crear Cluster
1. Ve a https://cloud.mongodb.com y crea una cuenta
2. Click en **"Build a Database"**
3. Selecciona **FREE (M0)** tier
4. Región: Elige la más cercana (ej: AWS / eu-west-1 para Europa)
5. Cluster Name: `fraktal` (o el que prefieras)
6. Click **"Create"**

### 1.2 Configurar Seguridad

**Database Access:**
1. En el menú lateral: **Database Access**
2. Click **"Add New Database User"**
3. Authentication: **Password**
4. Username: `fraktal_user` (o el que prefieras)
5. Password: Genera una contraseña segura y **guárdala**
6. Database User Privileges: **Read and write to any database**
7. Click **"Add User"**

**Network Access:**
1. En el menú lateral: **Network Access**
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (0.0.0.0/0)
   - ⚠️ Esto es necesario para Render (IP dinámica)
4. Click **"Confirm"**

### 1.3 Obtener Connection String
1. En **Database**, click **"Connect"** en tu cluster
2. Selecciona **"Connect your application"**
3. Driver: **Python**, Version: **3.11 or later**
4. Copia la connection string:
   ```
   mongodb+srv://fraktal_user:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
   ```
5. **IMPORTANTE**: Reemplaza `<password>` con la contraseña del usuario
6. Agrega `/fraktal` después de `.net` para especificar la base de datos:
   ```
   mongodb+srv://fraktal_user:TU_PASSWORD@cluster.mongodb.net/fraktal?retryWrites=true&w=majority
   ```
7. **Guarda esta URL** - la necesitarás en Render

---

## 🔧 Paso 2: Deployment del Backend en Render

### 2.1 Crear Web Service
1. Ve a https://render.com y crea una cuenta
2. Click **"New +"** → **"Web Service"**
3. Conecta tu repositorio de GitHub
   - Selecciona: `benetandujar72/Decano-astrologico`
4. Click **"Connect"**

### 2.2 Configurar Servicio
Render detectará automáticamente el `render.yaml`, pero verifica:

- **Name**: `fraktal-api` (o el que prefieras)
- **Region**: Oregon (o Frankfurt para Europa)
- **Branch**: `main`
- **Root Directory**: `backend`
- **Runtime**: Python 3
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Plan**: Free

### 2.3 Variables de Entorno
En **Environment**, agrega estas variables:

| Key | Value | Secret |
|-----|-------|--------|
| `MONGODB_URI` | Tu connection string de MongoDB Atlas | ✅ Yes |
| `SECRET_KEY` | (Auto-generado por Render) | ✅ Yes |
| `ADMIN_BOOTSTRAP_PASSWORD` | Tu contraseña admin (ej: `Admin2024!`) | ✅ Yes |
| `CORS_ORIGINS` | `https://decano-astrologico.vercel.app` | ❌ No |
| `PYTHON_VERSION` | `3.11.0` | ❌ No |

**IMPORTANTE - MONGODB_URI ejemplo:**
```
mongodb+srv://fraktal_user:MiPasswordSeguro123@cluster0.abc123.mongodb.net/fraktal?retryWrites=true&w=majority
```

### 2.4 Deploy
1. Click **"Create Web Service"**
2. Espera 5-10 minutos mientras se despliega
3. Verás logs en tiempo real
4. Cuando termine, verás: **"Deploy successful"**
5. **Copia la URL** de tu API (ej: `https://fraktal-api.onrender.com`)

### 2.5 Verificar Backend
Abre en el navegador:
- `https://tu-app.onrender.com/` → Debe mostrar: `{"message":"FRAKTAL API v1.0"...}`
- `https://tu-app.onrender.com/health` → Debe mostrar: `{"status":"healthy"}`
- `https://tu-app.onrender.com/health/db` → Debe mostrar: `{"status":"healthy","db":"connected"}`

Si `/health/db` falla, revisa que el `MONGODB_URI` sea correcto.

---

## 🎨 Paso 3: Deployment del Frontend en Vercel

### 3.1 Conectar Repositorio
1. Ve a https://vercel.com
2. Click **"Add New Project"**
3. Importa tu repositorio: `benetandujar72/Decano-astrologico`
4. Click **"Import"**

### 3.2 Configurar Build
Vercel detectará automáticamente Vite, pero verifica:

- **Framework Preset**: Vite
- **Root Directory**: `./ ` (raíz del proyecto)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### 3.3 Variables de Entorno
En **Environment Variables**, agrega:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://tu-app.onrender.com` |

⚠️ Usa la URL de Render del Paso 2.4

### 3.4 Deploy
1. Click **"Deploy"**
2. Espera 2-3 minutos
3. Cuando termine, verás: **"Deployment successful"**
4. **Copia la URL** de Vercel (ej: `https://decano-astrologico.vercel.app`)

---

## 🔗 Paso 4: Conectar Frontend y Backend

### 4.1 Actualizar CORS en Render
1. Ve a tu servicio en Render
2. **Environment** → Busca `CORS_ORIGINS`
3. Actualiza con tu URL de Vercel:
   ```
   https://tu-dominio.vercel.app
   ```
4. Si tienes múltiples dominios (staging, production):
   ```
   https://decano-astrologico.vercel.app,https://decano-astrologico-staging.vercel.app
   ```
5. Click **"Save Changes"**
6. Render hará redeploy automáticamente (2-3 minutos)

### 4.2 Verificar Integración
1. Abre tu app en Vercel: `https://tu-dominio.vercel.app`
2. Intenta hacer login con:
   - **Usuario**: `admin@programafraktal.com`
   - **Contraseña**: La que configuraste en `ADMIN_BOOTSTRAP_PASSWORD`
3. Si funciona: **¡Listo! 🎉**

---

## ✅ Verificación Final

### Checklist de Funcionamiento

- [ ] **MongoDB Atlas**: Cluster creado y conectado
- [ ] **Render Backend**:
  - [ ] `/` muestra mensaje de API
  - [ ] `/health` retorna healthy
  - [ ] `/health/db` conecta a MongoDB
- [ ] **Vercel Frontend**:
  - [ ] App carga correctamente
  - [ ] Login funciona con admin
  - [ ] No hay errores de CORS en consola
- [ ] **Integración**:
  - [ ] Frontend puede hacer login
  - [ ] Se pueden crear/guardar cartas
  - [ ] No hay errores en Network tab

---

## 🐛 Troubleshooting

### Error: "Database connection error"
**Causa**: MongoDB no está conectado
**Solución**:
1. Verifica `MONGODB_URI` en Render
2. Verifica que el usuario existe en MongoDB Atlas
3. Verifica Network Access permite 0.0.0.0/0
4. Prueba el connection string localmente

### Error: CORS Policy
**Causa**: URL de Vercel no está en CORS_ORIGINS
**Solución**:
1. Actualiza `CORS_ORIGINS` en Render
2. Incluye la URL EXACTA de Vercel
3. Espera redeploy de Render

### Error: "Incorrect username or password"
**Causa**: Usuario admin no existe o contraseña incorrecta
**Solución**:
1. Verifica `ADMIN_BOOTSTRAP_PASSWORD` en Render
2. El usuario se crea automáticamente en primer login
3. Usa: `admin@programafraktal.com` / tu password configurado

### Backend tarda mucho en responder (cold start)
**Causa**: Render Free tier duerme después de 15 min inactivo
**Solución**:
- Primera request tarda 30-60s (normal en free tier)
- Considera upgrade a Starter plan ($7/mes) para eliminar cold starts
- O usa servicio de ping cada 10 minutos

### Frontend no encuentra el backend
**Causa**: `VITE_API_URL` incorrecto o no configurado
**Solución**:
1. Verifica variable en Vercel
2. Debe ser la URL completa de Render (con https://)
3. Redeploy frontend después de cambiar

---

## 🔄 Redeploy y Actualizaciones

### Actualizar Backend
1. Haz push a GitHub (rama main)
2. Render hace auto-deploy automáticamente
3. Espera 5-10 minutos

### Actualizar Frontend
1. Haz push a GitHub
2. Vercel hace auto-deploy automáticamente
3. Espera 2-3 minutos

### Forzar Redeploy Manual
**Render**: En tu servicio → **Manual Deploy** → **Clear build cache & deploy**
**Vercel**: En tu proyecto → **Deployments** → **Redeploy**

---

## 📊 Monitoreo

### Logs de Render
1. Dashboard → Tu servicio → **Logs**
2. Verás todos los requests y errores
3. Busca `[AUTH]` para ver logs de autenticación

### Logs de Vercel
1. Dashboard → Tu proyecto → **Functions**
2. Ver errores de build y runtime

### Logs de MongoDB
1. Atlas Dashboard → **Monitoring**
2. Ver queries, conexiones, performance

---

## 💰 Costos (Planes Gratuitos)

| Servicio | Plan | Límites | Upgrade |
|----------|------|---------|---------|
| **MongoDB Atlas** | M0 Free | 512MB storage, Shared CPU | $0/mes → $9/mes (M2) |
| **Render** | Free | 750h/mes, Sleep inactivo | $0/mes → $7/mes (Starter) |
| **Vercel** | Hobby | 100GB bandwidth | $0/mes → $20/mes (Pro) |

**Total Free Tier**: $0/mes para empezar 🎉

---

## 📝 Configuración Recomendada para Producción

Si esperas tráfico significativo:

1. **MongoDB Atlas**: Upgrade a M2 ($9/mes)
   - Más storage y performance

2. **Render**: Upgrade a Starter ($7/mes)
   - Sin cold starts
   - Mejor performance

3. **Vercel**: Mantén Free/Hobby
   - Suficiente para la mayoría de casos

**Total Production**: ~$16/mes

---

## 🔐 Seguridad - Checklist

- [ ] `SECRET_KEY` es aleatorio y seguro (no usar el de ejemplo)
- [ ] `ADMIN_BOOTSTRAP_PASSWORD` no es `1234` en producción
- [ ] MongoDB user tiene contraseña fuerte
- [ ] Variables marcadas como "Secret" en Render
- [ ] `.env` está en `.gitignore` (no subir a GitHub)
- [ ] CORS solo permite tu dominio de Vercel
- [ ] HTTPS habilitado en todas las URLs

---

## 📞 Soporte

Si tienes problemas:

1. Revisa la sección **Troubleshooting** arriba
2. Revisa los logs en Render y Vercel
3. Verifica `/health/db` en tu API
4. Abre una issue en GitHub con los logs

---

**¡Todo listo para producción! 🚀**
