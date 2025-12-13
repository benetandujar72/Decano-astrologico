# Checklist de Despliegue - FRAKTAL

## Problemas Comunes y Soluciones

### 1. Pantalla en Negro / Aplicación No Carga

**Posibles causas:**
- Variables de entorno no configuradas
- Error de JavaScript en la consola
- Backend no está respondiendo
- Problema con el build

**Solución:**
1. Abre la consola del navegador (F12) y revisa errores
2. Verifica que las variables de entorno estén configuradas en Vercel/Render:
   - `VITE_API_URL` - URL del backend
   - `GEMINI_API_KEY` - API key de Google Gemini
3. Verifica que el backend esté funcionando haciendo una petición a `/health`

### 2. Variables de Entorno en Vercel

**Configuración:**
1. Ve a tu proyecto en Vercel Dashboard
2. Settings → Environment Variables
3. Agrega las siguientes variables:

```
VITE_API_URL=https://tu-backend.onrender.com
GEMINI_API_KEY=tu-api-key-de-gemini
```

**IMPORTANTE:** 
- Las variables deben empezar con `VITE_` para que Vite las exponga al cliente
- Después de agregar variables, necesitas hacer un **nuevo deploy**

### 3. Verificar que el Build Funciona

**Localmente:**
```bash
npm run build
npm run preview
```

Si funciona localmente pero no en producción, el problema es probablemente:
- Variables de entorno no configuradas
- El backend no está accesible desde el frontend (CORS)

### 4. Verificar Backend

**Endpoints a verificar:**
- `GET /health` - Debe retornar `{"status": "healthy"}`
- `GET /` - Debe retornar información de la API

**CORS:**
El backend debe tener CORS configurado para permitir peticiones desde el frontend:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar tu dominio
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 5. Debugging en Producción

**Para ver qué está pasando:**
1. Abre las herramientas de desarrollador (F12)
2. Ve a la pestaña Console y busca errores
3. Ve a la pestaña Network y verifica las peticiones al backend
4. Verifica que `API_URL` esté correcto en la consola

**Logs útiles:**
- En desarrollo, la aplicación muestra en consola la `API_URL` configurada
- Si ves `http://localhost:8000` en producción, significa que `VITE_API_URL` no está configurada

### 6. Rebuild Después de Cambiar Variables

**En Vercel:**
- Después de agregar/modificar variables de entorno, ve a Deployments
- Haz clic en los tres puntos del último deployment
- Selecciona "Redeploy"

**En Render:**
- Las variables se aplican automáticamente en el próximo build
- Puedes forzar un rebuild desde el dashboard

## Pasos de Verificación Post-Deploy

1. ✅ La aplicación carga (no pantalla en negro)
2. ✅ Se muestra la pantalla de login
3. ✅ Puedes registrarte/iniciar sesión
4. ✅ El backend responde a las peticiones
5. ✅ Los análisis astrológicos se generan correctamente

## Contacto y Soporte

Si después de seguir estos pasos la aplicación sigue sin funcionar:
1. Revisa los logs del backend en Render
2. Revisa los logs del frontend en Vercel
3. Verifica la consola del navegador para errores específicos

