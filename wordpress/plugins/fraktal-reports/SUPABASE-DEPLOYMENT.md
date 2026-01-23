# Guía de Despliegue de Supabase para Fraktal Reports

## Proyecto Supabase
- **URL**: https://asgnyckayusnmbozocxh.supabase.co
- **Dashboard**: https://supabase.com/dashboard/project/asgnyckayusnmbozocxh

---

## Paso 1: Crear Tablas de Base de Datos

1. Ir al Dashboard de Supabase
2. Navegar a **SQL Editor** en el menú lateral
3. Click en **New Query**
4. Copiar y pegar el contenido completo de `supabase-setup.sql`
5. Click en **Run** (o Ctrl+Enter)
6. Verificar que no hay errores y que las tablas se crearon

### Verificación
Ir a **Table Editor** y verificar que existen:
- `profiles` - Con columnas: id, wp_user_id, email, first_name, last_name, subscription_tier, etc.
- `reports` - Con columnas: id, session_id, wp_user_id, report_type, status, birth_data, etc.

---

## Paso 2: Crear Bucket de Storage

1. Ir a **Storage** en el menú lateral
2. Click en **New Bucket**
3. Configurar:
   - **Name**: `reports`
   - **Public bucket**: NO (desactivado)
   - **File size limit**: 50 MB
   - **Allowed MIME types**: `application/pdf`
4. Click en **Create bucket**

### Configurar Políticas del Bucket

1. Click en el bucket `reports`
2. Click en la pestaña **Policies**
3. Crear nueva política:
   - **Name**: `Service role upload`
   - **Allowed operation**: INSERT
   - **Target roles**: service_role
   - **Policy definition**: `true`

4. Crear otra política:
   - **Name**: `Users can download own reports`
   - **Allowed operation**: SELECT
   - **Policy definition**:
   ```sql
   (storage.foldername(name))[1] = auth.uid()::text
   ```

---

## Paso 3: Desplegar Edge Functions

### Opción A: Desde Supabase Dashboard (Recomendado para pruebas)

1. Ir a **Edge Functions** en el menú lateral
2. Click en **New Function**

#### Función 1: wordpress-report-webhook

1. Nombre: `wordpress-report-webhook`
2. Copiar el código de: `hello-world-check-main-4/supabase/functions/wordpress-report-webhook/index.ts`
3. Click en **Deploy**

#### Función 2: calculate-chart

1. Click en **New Function**
2. Nombre: `calculate-chart`
3. Copiar el código de: `hello-world-check-main-4/supabase/functions/calculate-chart/index.ts`
4. Click en **Deploy**

#### Función 3: generate-report-content

1. Click en **New Function**
2. Nombre: `generate-report-content`
3. Copiar el código de: `hello-world-check-main-4/supabase/functions/generate-report-content/index.ts`
4. Click en **Deploy**

### Opción B: Desde CLI (Recomendado para producción)

```bash
# Instalar Supabase CLI si no está instalado
npm install -g supabase

# Navegar al directorio del proyecto
cd "c:\Users\benet\Downloads\hello-world-check-main-4\hello-world-check-main-4"

# Vincular con el proyecto de Supabase
supabase link --project-ref asgnyckayusnmbozocxh

# Desplegar las funciones una por una
supabase functions deploy wordpress-report-webhook
supabase functions deploy calculate-chart
supabase functions deploy generate-report-content
```

---

## Paso 4: Configurar Variables de Entorno

### Para generate-report-content

Esta función requiere `LOVABLE_API_KEY` para llamar al API de IA.

1. Ir a **Edge Functions** en el Dashboard
2. Click en la función `generate-report-content`
3. Click en **Settings** o **Secrets**
4. Añadir:
   - **Name**: `LOVABLE_API_KEY`
   - **Value**: Tu API key de Lovable (o el proveedor de IA que uses)

**Nota**: Las variables `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` se configuran automáticamente.

---

## Paso 5: Verificar Despliegue

### Test de calculate-chart

```bash
curl -X POST https://asgnyckayusnmbozocxh.supabase.co/functions/v1/calculate-chart \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzZ255Y2theXVzbm1ib3pvY3hoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg4NTI4MzgsImV4cCI6MjA4NDQyODgzOH0.UQkkZN2nJ6q96ZR86iw4NBTtRY_UcJkBXUnTQ4V-_64" \
  -H "Content-Type: application/json" \
  -d '{
    "year": 1990,
    "month": 5,
    "day": 15,
    "hour": 12,
    "minute": 0,
    "latitude": 40.4168,
    "longitude": -3.7038
  }'
```

Respuesta esperada:
```json
{
  "success": true,
  "planets": [...],
  "houses": [...],
  "aspects": [...]
}
```

### Test de wordpress-report-webhook

```bash
curl -X POST https://asgnyckayusnmbozocxh.supabase.co/functions/v1/wordpress-report-webhook \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzZ255Y2theXVzbm1ib3pvY3hoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg4NTI4MzgsImV4cCI6MjA4NDQyODgzOH0.UQkkZN2nJ6q96ZR86iw4NBTtRY_UcJkBXUnTQ4V-_64" \
  -H "Content-Type: application/json" \
  -H "x-wp-user-id: 1" \
  -H "x-wp-site-url: http://localhost" \
  -d '{
    "chart_data": {
      "nombre": "Test User",
      "fecha": "1990-05-15",
      "hora": "12:00",
      "lugar": "Madrid",
      "latitude": 40.4168,
      "longitude": -3.7038,
      "timezone": "Europe/Madrid"
    },
    "report_type": "individual",
    "wp_user_id": 1,
    "email": "test@test.com",
    "display_name": "Test User",
    "wp_site_url": "http://localhost"
  }'
```

Respuesta esperada:
```json
{
  "success": true,
  "session_id": "uuid-here",
  "status": "queued"
}
```

---

## Paso 6: Test desde WordPress

1. Ir a tu sitio WordPress
2. Navegar a la página con `[fraktal_panel]`
3. Crear un perfil con datos de nacimiento
4. Click en "Generar Informe"
5. Verificar:
   - No hay error crítico
   - Aparece mensaje de "Informe en cola"
   - En Supabase Dashboard > Table Editor > reports, aparece un nuevo registro con status='queued'

---

## Troubleshooting

### Error: "Edge Function not found"
- Verificar que la función está desplegada en el Dashboard
- Verificar el nombre exacto de la función

### Error: "CORS error"
- La función ya incluye headers CORS, pero verificar que el frontend está haciendo la petición correctamente

### Error: "relation 'profiles' does not exist"
- Ejecutar el script SQL de setup antes de desplegar las Edge Functions

### Error: "LOVABLE_API_KEY not configured"
- Configurar la variable de entorno en la función generate-report-content

---

## Resumen de URLs

| Recurso | URL |
|---------|-----|
| Dashboard | https://supabase.com/dashboard/project/asgnyckayusnmbozocxh |
| API Base | https://asgnyckayusnmbozocxh.supabase.co |
| Edge Functions | https://asgnyckayusnmbozocxh.supabase.co/functions/v1/{function_name} |
| Storage | https://asgnyckayusnmbozocxh.supabase.co/storage/v1/object/reports/{path} |
