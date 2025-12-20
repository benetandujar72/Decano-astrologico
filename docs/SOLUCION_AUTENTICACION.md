# Solución al Problema de Autenticación

## Problemas Identificados

### 1. **Problema de Compatibilidad con bcrypt** ❌→✅
- **Causa**: bcrypt 5.0.0 es incompatible con passlib 1.7.4
- **Síntoma**: `ValueError: password cannot be longer than 72 bytes`
- **Solución**: Downgrade a bcrypt 4.1.3
  ```bash
  pip uninstall bcrypt -y
  pip install "bcrypt<4.2.0,>=4.0.0"
  ```

### 2. **Archivo .env Vacío** ❌→✅
- **Causa**: No existía configuración de entorno
- **Síntoma**: El backend usa valores por defecto incorrectos
- **Solución**: Creado archivo `.env` con la configuración correcta:
  ```env
  MONGODB_URI=mongodb://localhost:27017
  SECRET_KEY=fraktal-super-secret-key-change-in-production-use-random-256-bits
  ADMIN_BOOTSTRAP_PASSWORD=1234
  CORS_ORIGINS=https://decano-astrologico.vercel.app,http://localhost:3000,http://127.0.0.1:3000
  ```

### 3. **Latencia en el Login** ⏱️→⚡
- **Causa**: Doble consulta a MongoDB en bootstrap de admin
- **Síntoma**: El login tardaba mucho en responder
- **Optimización**:
  - Eliminada segunda consulta innecesaria
  - Agregados logs de timing para diagnosticar
  - Tiempo actual: ~0.2s (bcrypt) + ~0.02s (JWT) = **~0.22s total**

### 4. **Credenciales Admin No Funcionaban** ❌→✅
- **Causa**: Usuario admin no existía en la BD + problema bcrypt
- **Solución**:
  - Usuario admin se crea automáticamente en el primer login
  - Credenciales: `admin@programafraktal.com` / `1234`

## Cambios Realizados

### Backend

#### 1. `backend/.env` (NUEVO)
```env
MONGODB_URI=mongodb://localhost:27017
SECRET_KEY=fraktal-super-secret-key-change-in-production-use-random-256-bits
ADMIN_BOOTSTRAP_PASSWORD=1234
CORS_ORIGINS=https://decano-astrologico.vercel.app,http://localhost:3000,http://127.0.0.1:3000
GEMINI_API_KEY=
```

#### 2. `backend/app/api/endpoints/auth.py`
- ✅ Agregados logs detallados de timing
- ✅ Optimizada consulta de bootstrap (eliminada query duplicada)
- ✅ Mejor manejo de errores

#### 3. `backend/requirements.txt`
- ✅ Agregado pin de bcrypt: `bcrypt<4.2.0,>=4.0.0`

#### 4. `backend/init_db.py` (NUEVO)
- Script para inicializar la base de datos
- Crea índices en MongoDB
- Crea usuario admin si no existe

#### 5. `backend/test_login.py` (NUEVO)
- Script de diagnóstico del login
- Muestra tiempos de ejecución
- Verifica conectividad a MongoDB

## Cómo Probar

### Opción 1: Script de Test (Recomendado)
```bash
cd backend
python test_login.py
```

**Salida esperada:**
```
✓ MongoDB: Conectado
✓ Usuario admin: Existe
✓ Verificación de contraseña: OK
✓ Token JWT: Generado

⏱️ Tiempos:
  - Verificación bcrypt: 0.186s
  - Generación JWT: 0.020s
  - Total estimado: 0.206s
```

### Opción 2: Servidor Completo
```bash
# Terminal 1: Iniciar backend
cd backend
python -m uvicorn main:app --reload --port 8000

# Terminal 2: Probar login
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@programafraktal.com&password=1234"
```

### Opción 3: Frontend + Backend
```bash
# Terminal 1: Backend
cd backend
python -m uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
npm run dev
```

Luego abrir el navegador y probar login con:
- **Usuario**: `admin@programafraktal.com`
- **Contraseña**: `1234`

## Diagnóstico de Problemas

### Si MongoDB no está disponible
**Síntoma**: `ServerSelectionTimeoutError`

**Opciones**:
1. Instalar MongoDB localmente
2. Usar MongoDB Atlas (cloud): Actualizar `MONGODB_URI` en `.env`
3. Usar Docker:
   ```bash
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

### Si el login sigue lento
1. Ejecutar `test_login.py` para ver tiempos exactos
2. Revisar logs del servidor (los tiempos se imprimen en consola)
3. Verificar que bcrypt está en versión correcta:
   ```bash
   pip show bcrypt
   ```

### Si las credenciales no funcionan
1. Ejecutar `test_login.py` - creará el admin automáticamente
2. Verificar que el `.env` tiene `ADMIN_BOOTSTRAP_PASSWORD=1234`
3. Revisar logs del servidor - deberían mostrar `[AUTH] Login attempt for user: admin@programafraktal.com`

## Logs del Servidor

Con los cambios realizados, el servidor ahora muestra logs detallados:

```
[AUTH] Login attempt for user: admin@programafraktal.com
[AUTH] DB query time: 0.012s
[AUTH] Password verification time: 0.186s
[AUTH] Token generation time: 0.020s
[AUTH] Total login time: 0.218s - SUCCESS for admin@programafraktal.com
```

## Próximos Pasos (Producción)

### Para Deploy en Render/Vercel:

1. **Configurar Variables de Entorno**:
   - `MONGODB_URI`: URL de MongoDB Atlas
   - `SECRET_KEY`: Generar clave aleatoria segura (256 bits)
   - `ADMIN_BOOTSTRAP_PASSWORD`: Cambiar de `1234`
   - `CORS_ORIGINS`: Dominio de producción

2. **MongoDB Atlas**:
   - Crear cluster gratuito
   - Whitelist IP de Render (0.0.0.0/0 para permitir todas)
   - Copiar connection string a `MONGODB_URI`

3. **Optimizaciones**:
   - Ejecutar `init_db.py` una vez para crear índices
   - Considerar caché de JWT tokens
   - Implementar rate limiting

## Resumen de Tiempos

| Operación | Tiempo | Optimización Posible |
|-----------|--------|---------------------|
| Query MongoDB | 0.01-0.05s | ✅ Índices creados |
| Verificación bcrypt | ~0.18s | ⚠️ Inherente al algoritmo (seguridad) |
| Generación JWT | ~0.02s | ✅ Ya es rápido |
| **TOTAL** | **~0.20s** | ✅ Aceptable |

El tiempo de bcrypt es intencional para seguridad. Si se necesita más velocidad, se puede reducir los "rounds" de bcrypt, pero NO se recomienda por seguridad.

## Archivos Modificados/Creados

```
backend/
├── .env                          [NUEVO] - Variables de entorno
├── requirements.txt              [MODIFICADO] - Pin de bcrypt
├── init_db.py                    [NUEVO] - Script de inicialización
├── test_login.py                 [NUEVO] - Script de diagnóstico
└── app/api/endpoints/auth.py     [MODIFICADO] - Logs y optimización
```
