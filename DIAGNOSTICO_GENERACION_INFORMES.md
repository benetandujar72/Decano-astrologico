# 🔍 Guía de Diagnóstico: Problemas de Generación de Informes

## Estado Actual

Los endpoints están correctamente configurados y el código parece funcional. Este documento ayuda a diagnosticar por qué los informes no se generan.

---

## ✅ Verificación de Configuración

### 1. Backend (FastAPI)

#### Verificar que el servidor esté corriendo:
```bash
# En la carpeta backend/
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Verificar endpoints disponibles:
```bash
curl http://localhost:8000/docs
# Debería mostrar la documentación Swagger
```

#### Endpoints clave para generación:
- `POST /api/reports/start-full-generation` - Inicia sesión
- `POST /api/reports/queue-module` - Encola módulo
- `GET /api/reports/module-status/{session_id}/{module_id}` - Estado
- `GET /api/reports/generation-status/{session_id}` - Estado general
- `GET /api/reports/download-pdf/{session_id}` - Descargar PDF

### 2. Frontend (React + Vite)

#### Verificar variable de entorno:
```bash
# Crear .env desde .env.example
cp .env.example .env

# Editar .env y configurar:
VITE_API_URL=http://localhost:8000
# O la URL de producción:
# VITE_API_URL=https://api-decano.onrender.com
```

#### Verificar build:
```bash
npm run dev
# O para producción:
npm run build
```

---

## 🐛 Problemas Comunes

### Problema 1: "No se puede conectar con la API"

**Síntomas:**
- Error de red en consola
- "Failed to fetch"
- CORS errors

**Soluciones:**

1. **Verificar que el backend esté corriendo:**
   ```bash
   curl http://localhost:8000/api/health || curl http://localhost:8000/
   ```

2. **Verificar CORS en backend:**
   ```python
   # backend/app/main.py o server.py
   from fastapi.middleware.cors import CORSMiddleware

   app.add_middleware(
       CORSMiddleware,
       allow_origins=["*"],  # En producción: lista específica
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

3. **Verificar URL en frontend:**
   ```bash
   # En consola del navegador:
   console.log(import.meta.env.VITE_API_URL)
   # Debería mostrar la URL correcta
   ```

---

### Problema 2: "Error de autenticación (401)"

**Síntomas:**
- "Tu sesión ha expirado"
- Error 401 Unauthorized
- Token inválido

**Soluciones:**

1. **Verificar token en localStorage:**
   ```javascript
   // En consola del navegador:
   localStorage.getItem('fraktal_token')
   // Debería mostrar un JWT válido
   ```

2. **Renovar token:**
   - Cerrar sesión y volver a iniciar sesión
   - El token se genera en el login y dura 7 días

3. **Verificar que el endpoint de auth funciona:**
   ```bash
   curl -X POST http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"test","password":"test123"}'
   ```

---

### Problema 3: "Sesión creada pero no genera módulos"

**Síntomas:**
- `session_id` recibido correctamente
- Polling infinito
- Estado nunca cambia de "pending" a "done"

**Diagnóstico:**

1. **Verificar MongoDB:**
   ```bash
   # Verificar que MongoDB esté corriendo
   mongosh
   # En mongosh:
   use fraktal
   db.report_generation_sessions.find().pretty()
   ```

2. **Verificar logs del backend:**
   ```bash
   # Ver logs en tiempo real
   tail -f backend/logs/app.log
   # O si usas uvicorn directamente, ver la terminal
   ```

3. **Verificar que el job se encola:**
   ```bash
   # Hacer request manual
   curl -X POST http://localhost:8000/api/reports/queue-module \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"session_id":"SESSION_ID","module_id":"modulo_1"}'
   ```

4. **Revisar estado del módulo:**
   ```bash
   curl http://localhost:8000/api/reports/module-status/SESSION_ID/modulo_1 \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

**Soluciones:**

1. **Verificar que MongoDB esté accesible:**
   ```python
   # En backend, probar conexión
   from motor.motor_asyncio import AsyncIOMotorClient
   import os

   MONGODB_URL = os.getenv("MONGODB_URL")
   client = AsyncIOMotorClient(MONGODB_URL)
   # Probar
   await client.server_info()
   ```

2. **Verificar que Gemini API Key esté configurada:**
   ```bash
   # backend/.env
   GEMINI_API_KEY=tu_api_key_aqui
   ```

3. **Aumentar timeout:**
   ```typescript
   // En ReportGenerationWizard.tsx (ya está configurado)
   const maxWaitMs = 60 * 45 * 1000; // 45 minutos
   ```

---

### Problema 4: "Timeout durante la generación"

**Síntomas:**
- "Tiempo de espera agotado"
- Módulo en estado "running" por mucho tiempo
- Error después de 20-40 minutos

**Soluciones:**

1. **Verificar que el modelo de IA responde:**
   ```python
   # Probar Gemini directamente
   from app.services.ai_expert_service import get_ai_expert_service

   service = get_ai_expert_service()
   result = await service.generate_content("Test", "Genera un texto corto")
   print(result)
   ```

2. **Revisar límites de rate de Gemini:**
   - Verificar cuota en Google AI Studio
   - https://aistudio.google.com/app/apikey

3. **Aumentar timeouts en el backend:**
   ```python
   # backend/app/api/endpoints/reports.py
   # Línea 188 (ya está aumentado a 40 minutos)
   timeout=60 * 40,  # 40 minutos por módulo
   ```

---

### Problema 5: "Report type 'individual' no funciona"

**Diagnóstico:**

El código actual soporta correctamente todos los tipos:
- `individual` ✅
- `infantil` ✅
- `pareja` ✅
- `familiar` ✅
- `equipo` ✅
- `profesional` ✅

**Verificar:**

1. **En el request del frontend:**
   ```typescript
   // ReportGenerationWizard.tsx línea 179
   report_type: reportType,  // Debe ser "individual"
   ```

2. **En el backend:**
   ```python
   # full_report_service.py línea 591
   if report_type not in {"individual", "adultos", "infantil", ...}:
       raise HTTPException(...)
   ```

**Nota:** Si ves "adultos", cambiarlo a "individual" para consistencia.

---

## 🔧 Pasos de Depuración Completos

### Paso 1: Verificar Backend

```bash
cd backend

# Verificar .env
cat .env | grep -E "MONGODB_URL|GEMINI_API_KEY|VITE_API_URL"

# Iniciar backend con logs
uvicorn app.main:app --reload --log-level debug
```

### Paso 2: Verificar Frontend

```bash
# Verificar .env
cat .env | grep VITE_API_URL

# Iniciar frontend
npm run dev
```

### Paso 3: Probar Flujo Completo

1. **Abrir navegador:** http://localhost:5173
2. **Abrir DevTools:** F12 → Console y Network
3. **Iniciar sesión**
4. **Crear carta natal**
5. **Intentar generar informe**
6. **Observar:**
   - Requests en Network tab
   - Errores en Console
   - Logs en terminal del backend

### Paso 4: Verificar Request Específico

```bash
# 1. Obtener token (copiar de localStorage o login)
TOKEN="tu_token_jwt_aqui"

# 2. Iniciar sesión de generación
curl -X POST http://localhost:8000/api/reports/start-full-generation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "carta_data": {...},
    "nombre": "Test",
    "report_mode": "full",
    "report_type": "individual"
  }'

# 3. Copiar session_id de la respuesta
SESSION_ID="..."

# 4. Encolar módulo
curl -X POST http://localhost:8000/api/reports/queue-module \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"session_id":"'$SESSION_ID'","module_id":"modulo_1"}'

# 5. Verificar estado (repetir cada 5 segundos)
curl http://localhost:8000/api/reports/module-status/$SESSION_ID/modulo_1 \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 Verificación de Estado

### MongoDB - Ver Sesiones

```javascript
// En mongosh:
use fraktal
db.report_generation_sessions.find().sort({created_at: -1}).limit(5).pretty()

// Ver una sesión específica:
db.report_generation_sessions.findOne({_id: ObjectId("SESSION_ID")})

// Ver estado de módulos:
db.report_generation_sessions.find(
  {},
  {
    "user_name": 1,
    "status": 1,
    "current_module_index": 1,
    "module_runs": 1
  }
).pretty()
```

### Logs de Backend

```bash
# Ver logs en tiempo real
tail -f backend/logs/app.log

# Buscar errores
grep -i "error\|exception\|failed" backend/logs/app.log | tail -20

# Buscar logs de generación
grep "WIZARD\|REPORTS" backend/logs/app.log | tail -50
```

---

## ✅ Checklist de Verificación

Antes de reportar un bug, verificar:

- [ ] Backend corriendo en puerto 8000
- [ ] Frontend corriendo (dev o build)
- [ ] MongoDB accesible y corriendo
- [ ] GEMINI_API_KEY configurada en backend/.env
- [ ] VITE_API_URL configurada correctamente
- [ ] Usuario autenticado (token válido)
- [ ] CORS configurado en backend
- [ ] Puedo hacer login correctamente
- [ ] Puedo crear carta natal
- [ ] Request a `/start-full-generation` retorna session_id
- [ ] Verificado logs del backend para errores
- [ ] Verificado console del navegador para errores

---

## 🆘 Soporte

Si después de seguir esta guía el problema persiste:

1. **Recopilar información:**
   - Logs del backend (últimas 50 líneas)
   - Console del navegador (errores)
   - Network tab (requests fallidos)
   - Versión de Node.js: `node --version`
   - Versión de Python: `python --version`

2. **Crear issue:**
   - GitHub: [Crear Issue](https://github.com/...)
   - Incluir toda la información anterior

---

## 📝 Notas de Desarrollo

### Flujo de Generación

```
1. Frontend → POST /start-full-generation
   ↓ Retorna session_id + modules[]

2. Frontend → POST /queue-module {session_id, module_id: "modulo_1"}
   ↓ Encola job en background
   ↓ Retorna inmediatamente

3. Frontend → GET /module-status/{session_id}/modulo_1 (polling cada 5s)
   ↓ status: "pending" | "running" | "done" | "error"

4. Backend → Ejecuta job asíncrono (hasta 40 min)
   ↓ Genera contenido con Gemini
   ↓ Guarda en MongoDB

5. Frontend detecta status: "done"
   ↓ Muestra contenido
   ↓ Permite generar siguiente módulo

6. Repetir pasos 2-5 para todos los módulos

7. Frontend → GET /download-pdf/{session_id}
   ↓ Backend genera PDF con todos los módulos
   ↓ Retorna archivo
```

### Timeouts Configurados

- **Timeout HTTP del job:** 40 minutos (línea 188 de reports.py)
- **Timeout de polling frontend:** 45 minutos (línea 223 de ReportGenerationWizard.tsx)
- **Intervalo de polling:** 5 segundos (línea 263)

### Módulos del Informe "Full"

1. modulo_1: Estructura Energética Base (~6000 chars)
2. modulo_2_fundamentos: Fundamentos del Ser (~5000 chars)
3. modulo_2_ejes: Ejes de Vida (~8000 chars)
4. modulo_2_personales: Planetas Personales (~5000 chars)
5. modulo_2_sociales: Planetas Sociales (~5000 chars)
6. modulo_2_transpersonales: Planetas Transpersonales (~6000 chars)
7. modulo_2_nodos: Nodos Lunares (~4000 chars)
8. modulo_2_aspectos: Aspectos Clave (~5000 chars)
9. modulo_2_sintesis: Síntesis Arquetípica (~5000 chars)
10. modulo_3_transitos: Tránsitos Actuales (~6000 chars)
11. modulo_4_recomendaciones: Recomendaciones Evolutivas (~5000 chars)

**Total estimado:** ~60,000 caracteres = ~30 páginas

---

**Última actualización:** 2026-01-10
