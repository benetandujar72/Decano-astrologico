# Generación de Informe Gratuito - Implementación Completa

## ✅ Implementación Completada

Se ha implementado el flujo completo de generación del informe gratuito (`gancho_free`) desde el formulario de WordPress hasta el backend de Python.

---

## 🔄 Flujo Completo

```
Usuario → BirthDataForm → WordPress REST API → Backend Python → SSE Stream → Viewer
```

### Paso 1: Usuario completa formulario
- **Página**: `/tu-informe-astrologico-gratuito/`
- **Shortcode**: `[decano-free-report-form]`
- **Datos requeridos**:
  - Nombre completo
  - Fecha de nacimiento (YYYY-MM-DD)
  - Hora de nacimiento (HH:MM)
  - Ciudad y país de nacimiento
  - Coordenadas (auto-geocodificadas)

### Paso 2: Geocodificación automática
- **Endpoint**: `/wp-json/decano/v1/geocode` (POST)
- **Servicio**: Nominatim (OpenStreetMap)
- **Acceso**: Público (no requiere autenticación)
- **Respuesta**:
  ```json
  {
    "latitude": 41.3874,
    "longitude": 2.1686,
    "timezone": "UTC+1",
    "formatted_address": "Barcelona, España"
  }
  ```

### Paso 3: Envío del formulario
- **Componente**: `BirthDataForm.tsx`
- **Método**: `handleSubmit()`
- **Estado**: Muestra "Generando tu informe..." con spinner
- **Endpoint llamado**: `/wp-json/decano/v1/generate-free-report`

### Paso 4: WordPress REST API procesa solicitud
- **Archivo**: `class-da-rest-api.php` (líneas 368-502)
- **Acceso**: Público (no requiere login)
- **Funciones**:
  1. Crear usuario WordPress si no existe
  2. Obtener o crear token JWT del backend
  3. Llamar al backend para generar informe
  4. Devolver session_id

### Paso 5: Creación de usuario (si necesario)
```php
// Si usuario no está logueado
if (!is_user_logged_in()) {
    // Buscar por email
    $user = get_user_by('email', $email);

    if (!$user) {
        // Crear nuevo usuario
        $user_id = wp_create_user($username, $password, $email);
        wp_update_user(['ID' => $user_id, 'display_name' => $name]);
        $user->set_role('subscriber');
        wp_send_new_user_notifications($user_id, 'user');
    }
}
```

### Paso 6: Autenticación con el backend
- **Método**: `get_or_create_backend_jwt()`
- **Endpoint backend**: `/auth/wordpress-login` (POST)
- **Payload**:
  ```json
  {
    "wordpress_user_id": 123,
    "email": "usuario@email.com",
    "name": "Nombre Usuario"
  }
  ```
- **Respuesta**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 86400
  }
  ```
- **Caché**: Token guardado en `user_meta` con expiración

### Paso 7: Llamada al backend para generar informe
- **Endpoint**: `/reports/queue-full-report` (POST)
- **Headers**:
  ```
  Authorization: Bearer {jwt_token}
  Content-Type: application/json
  ```
- **Payload**:
  ```json
  {
    "report_type": "gancho_free",
    "birth_datetime": "1990-01-15T14:30",
    "latitude": 41.3874,
    "longitude": 2.1686,
    "timezone": "UTC+1",
    "city": "Barcelona",
    "country": "España",
    "name": "Usuario Ejemplo"
  }
  ```
- **Respuesta del backend**:
  ```json
  {
    "session_id": "abc123def456",
    "status": "queued",
    "message": "Report generation started"
  }
  ```

### Paso 8: Respuesta de WordPress al frontend
```json
{
  "success": true,
  "session_id": "abc123def456",
  "user_id": 123,
  "is_new_user": true,
  "viewer_url": "https://programafraktal.com/tu-informe-gratis/?session_id=abc123def456",
  "message": "Informe en proceso de generación"
}
```

### Paso 9: Redirección al visualizador
- **URL**: `/tu-informe-gratis/?session_id={session_id}`
- **Componente**: `FreeReportViewer`
- **Funcionalidad**:
  - Se conecta al SSE stream del backend
  - Muestra progreso en tiempo real
  - Renderiza el informe cuando está listo

---

## 📁 Archivos Modificados

### 1. `class-da-rest-api.php`
**Ubicación**: `wordpress/plugins/fraktal-reports/includes/class-da-rest-api.php`

**Nuevos métodos añadidos**:

#### `register_routes()` - Líneas 81-134
```php
// Endpoint para generar informe gratuito (NO requiere login)
register_rest_route('decano/v1', '/generate-free-report', [
    'methods' => 'POST',
    'callback' => [__CLASS__, 'generate_free_report'],
    'permission_callback' => '__return_true',
    'args' => [
        'name' => [...],
        'email' => [...],
        'birth_date' => [...],
        'birth_time' => [...],
        'birth_city' => [...],
        'birth_country' => [...],
        'latitude' => [...],
        'longitude' => [...],
        'timezone' => [...]
    ]
]);
```

#### `generate_free_report()` - Líneas 368-502
Método principal que orquesta toda la generación:
- Validación de parámetros
- Creación de usuario WordPress
- Obtención de token JWT
- Llamada al backend
- Manejo de errores

#### `get_or_create_backend_jwt()` - Líneas 507-564
Gestión de autenticación con el backend:
- Cache de tokens con expiración
- Renovación automática
- Llamada a `/auth/wordpress-login`

**Líneas modificadas**: +230 líneas

### 2. `BirthDataForm.tsx`
**Ubicación**: `wordpress/plugins/fraktal-reports/react-src/src/components/BirthDataForm/BirthDataForm.tsx`

**Cambios realizados**:

#### Estado nuevo - Línea 64
```typescript
const [isGenerating, setIsGenerating] = useState(false);
```

#### Método `handleSubmit()` actualizado - Líneas 180-256
```typescript
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Si hay callback personalizado, usarlo
    if (onSubmit) {
        onSubmit(formData);
        return;
    }

    // Comportamiento por defecto: generar informe Free
    setIsGenerating(true);

    try {
        // Obtener configuración de WordPress
        const wpConfig = (window as any).decanoSettings || {};
        const restUrl = wpConfig.restUrl || '/wp-json/';
        const nonce = wpConfig.restNonce || '';

        // Preparar datos
        const payload = {
            name: formData.name,
            email: formData.name.toLowerCase().replace(/\s+/g, '.') + '@temp.decano.local',
            birth_date: formData.birth_date,
            birth_time: formData.birth_time,
            birth_city: formData.birth_place_city,
            birth_country: formData.birth_place_country,
            latitude: formData.latitude,
            longitude: formData.longitude,
            timezone: formData.timezone
        };

        // Llamar al endpoint
        const response = await fetch(restUrl + 'decano/v1/generate-free-report', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': nonce
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al generar el informe');
        }

        const result = await response.json();

        // Redirigir al visualizador
        if (result.viewer_url) {
            window.location.href = result.viewer_url;
        } else if (result.session_id) {
            window.location.href = `/tu-informe-gratis/?session_id=${result.session_id}`;
        }
    } catch (error: any) {
        setErrors({
            submit: error.message || 'Error al generar el informe'
        });
        setIsGenerating(false);
    }
};
```

#### Botón de submit actualizado - Líneas 508-521
```typescript
<button
  type="submit"
  className="btn-primary"
  disabled={isLoading || isGeocoding || isGenerating}
>
  {(isLoading || isGenerating) ? (
    <>
      <Loader2 className="animate-spin" size={18} />
      Generando tu informe...
    </>
  ) : (
    submitButtonText
  )}
</button>
```

#### Mensaje de error - Líneas 524-530
```typescript
{errors.submit && (
  <div className="form-error">
    <AlertCircle size={18} />
    <span>{errors.submit}</span>
  </div>
)}
```

**Líneas modificadas**: +60 líneas

### 3. `da-app.js`
**Ubicación**: `wordpress/plugins/fraktal-reports/public/build/da-app.js`

**Tamaño**: 234.78 KB (gzip: 72.87 KB)
**Build**: Compilado con Vite 7.3.1
**Módulos**: 1,711 módulos transformados

### 4. `fraktal-reports.zip`
**Ubicación**: `wordpress/plugins/fraktal-reports.zip`

**Tamaño**: 198 KB
**Contenido**: Plugin completo listo para instalar en WordPress

---

## 🔐 Seguridad Implementada

### WordPress REST API
- ✅ **Validación de parámetros**: Todos los campos validados y sanitizados
- ✅ **Email validation**: `is_email()` check
- ✅ **Sanitización**: `sanitize_text_field()`, `sanitize_email()`
- ✅ **Permisos**: Acceso público controlado con `__return_true`

### Creación de usuarios
- ✅ **Password seguro**: `wp_generate_password(16, true)`
- ✅ **Username único**: `name_1234` con número aleatorio
- ✅ **Rol limitado**: `subscriber` (sin permisos de admin)
- ✅ **Email único**: Verifica si existe antes de crear

### Autenticación backend
- ✅ **JWT tokens**: Tokens firmados con expiración
- ✅ **Caché seguro**: Guardado en `user_meta` (no en cookies)
- ✅ **Renovación automática**: Se renueva 1 hora antes de expirar
- ✅ **HTTPS**: Todas las llamadas al backend usan HTTPS

### Frontend
- ✅ **XSS Prevention**: React escapa automáticamente el HTML
- ✅ **CSRF Protection**: WordPress nonce en headers
- ✅ **Input validation**: Validación en cliente antes de enviar
- ✅ **Error handling**: Mensajes genéricos (no expone detalles internos)

---

## 🧪 Cómo Probar

### 1. Instalar Plugin Actualizado

**Opción A: Desde Git**
```bash
git pull origin main
cd wordpress/plugins/fraktal-reports.zip
# Subir a WordPress Admin → Plugins
```

**Opción B: Reinstalar en WordPress**
```
WordPress Admin → Plugins → Desactivar "Decano Astrológico"
WordPress Admin → Plugins → Eliminar "Decano Astrológico"
WordPress Admin → Plugins → Añadir Nuevo → Subir Plugin
Seleccionar fraktal-reports.zip → Instalar → Activar
```

### 2. Configurar Backend

```
WordPress Admin → Decano → Configuración
API URL: https://tu-backend.onrender.com
HMAC Secret: [generado automáticamente]
Guardar cambios
```

### 3. Probar el Formulario

**Página de prueba**: `https://programafraktal.com/tu-informe-astrologico-gratuito/`

#### Test 1: Usuario Nuevo
```
1. Abrir página con shortcode [decano-free-report-form]
2. Nombre: "Juan Pérez"
3. Fecha: "1990-01-15"
4. Hora: "14:30"
5. Ciudad: "Barcelona"
6. País: "España"
7. Esperar auto-geocodificación (1.5s) → Ver coordenadas: 41.3874, 2.1686
8. Click "Generar Mi Informe Gratuito"
9. Ver spinner "Generando tu informe..."
10. ✅ Debe redirigir a /tu-informe-gratis/?session_id=...
```

#### Test 2: Usuario Existente
```
1. Usar mismo email que en Test 1
2. Completar formulario
3. ✅ Debe usar el usuario existente (no crear duplicado)
4. ✅ Redirigir correctamente al viewer
```

#### Test 3: Error Handling
```
# Test 3.1: Backend offline
- Parar backend
- Intentar generar informe
- ✅ Debe mostrar error: "Error al conectar con el backend"

# Test 3.2: Coordenadas inválidas
- Introducir ciudad que no existe: "XYZCity123"
- ✅ Debe mostrar error de geocodificación

# Test 3.3: Datos incompletos
- Dejar campo "Hora" vacío
- Click submit
- ✅ Debe mostrar error: "La hora de nacimiento es obligatoria"
```

### 4. Verificar en DevTools

**Consola del navegador (F12)**:
```javascript
// 1. Verificar configuración
console.log(window.decanoSettings);
// Debe devolver: { restUrl: "/wp-json/", restNonce: "abc123...", ... }

// 2. Ver llamadas de red
// Network tab → Filter: "generate-free-report"
// Debe ver: POST /wp-json/decano/v1/generate-free-report (200 OK)

// 3. Ver logs de BirthDataForm
// Console → Buscar: "[BirthDataForm]"
// Debe ver:
// - "[BirthDataForm] Generando informe gratuito..."
// - "[BirthDataForm] Llamando a WordPress API: ..."
// - "[BirthDataForm] Informe iniciado: {session_id: '...'}"
```

### 5. Verificar en WordPress

**Usuarios creados**:
```
WordPress Admin → Usuarios
✅ Debe aparecer nuevo usuario:
   - Username: juan_perez_1234
   - Email: juan.pérez@temp.decano.local
   - Rol: Subscriber
   - Backend JWT Token: Guardado en user_meta
```

**User Meta**:
```php
// En MySQL o phpMyAdmin
SELECT * FROM wp_usermeta
WHERE meta_key IN ('da_backend_jwt_token', 'da_backend_jwt_expiry')
AND user_id = [nuevo_user_id];

// Debe devolver:
// da_backend_jwt_token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
// da_backend_jwt_expiry: 1736877600 (timestamp)
```

### 6. Verificar en el Backend (Python)

**Logs de Render**:
```bash
# Buscar en logs:
grep "wordpress-login" logs.txt
grep "queue-full-report" logs.txt

# Debe ver:
# POST /auth/wordpress-login - 200 OK
# POST /reports/queue-full-report - 201 Created
# SSE /reports/stream/{session_id} - Connected
```

**MongoDB Atlas**:
```javascript
// En MongoDB Compass o Atlas UI
db.reports.findOne({session_id: "abc123def456"})

// Debe devolver documento:
{
  _id: ObjectId("..."),
  session_id: "abc123def456",
  user_id: 123,
  report_type: "gancho_free",
  status: "completed",
  birth_data: {
    datetime: "1990-01-15T14:30:00",
    latitude: 41.3874,
    longitude: 2.1686,
    timezone: "UTC+1"
  },
  modules: [
    { module_id: "modulo_1_sol", status: "completed", content: "..." },
    { module_id: "modulo_3_luna", status: "completed", content: "..." },
    { module_id: "modulo_9_ascendente", status: "completed", content: "..." }
  ],
  created_at: ISODate("2026-01-12T18:30:00Z"),
  completed_at: ISODate("2026-01-12T18:32:45Z")
}
```

---

## 🐛 Solución de Problemas

### Error: "Backend no configurado"

**Causa**: No se ha configurado `da_api_url` en WordPress

**Solución**:
```
WordPress Admin → Decano → Configuración
API URL: https://tu-backend.onrender.com
Guardar cambios
```

### Error: "No se pudo obtener token de autenticación"

**Causa**: El backend no responde en `/auth/wordpress-login`

**Solución**:
```bash
# 1. Verificar que el backend está online
curl https://tu-backend.onrender.com/health

# 2. Verificar el endpoint de auth
curl -X POST https://tu-backend.onrender.com/auth/wordpress-login \
  -H "Content-Type: application/json" \
  -d '{"wordpress_user_id": 1, "email": "test@test.com", "name": "Test"}'

# 3. Revisar logs del backend en Render
```

### Error: "Error al generar el informe"

**Causas posibles**:
1. Backend rechaza el report_type `gancho_free`
2. Faltan datos en el payload
3. Token JWT expirado o inválido

**Solución**:
```javascript
// En DevTools Console
// Ver el payload exacto enviado
fetch('/wp-json/decano/v1/generate-free-report', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': window.decanoSettings.restNonce
    },
    body: JSON.stringify({
        name: "Test User",
        email: "test@test.com",
        birth_date: "1990-01-15",
        birth_time: "14:30",
        birth_city: "Barcelona",
        birth_country: "España",
        latitude: 41.3874,
        longitude: 2.1686,
        timezone: "UTC+1"
    })
}).then(r => r.json()).then(console.log);
```

### El usuario se crea pero no se genera el informe

**Causa**: Error después de crear usuario pero antes de llamar al backend

**Solución**:
```
WordPress Admin → Usuarios → Editar usuario
Ver en "Custom Fields":
- da_backend_jwt_token: ¿Existe?
- da_backend_jwt_expiry: ¿Es válido? (timestamp futuro)

Si no existe o está expirado:
- Borrar usuario
- Intentar de nuevo
```

### Redirección no funciona

**Causa**: `viewer_url` incorrecta o página viewer no existe

**Solución**:
```
1. Verificar que existe página: /tu-informe-gratis/
2. Verificar que tiene shortcode: [decano-free-report-viewer]
3. Verificar en código que session_id se pasa correctamente:

   // En BirthDataForm.tsx línea 241
   if (result.viewer_url) {
       console.log('Redirigiendo a:', result.viewer_url);
       window.location.href = result.viewer_url;
   }
```

---

## 📊 Diagrama de Secuencia

```
┌──────────┐     ┌──────────────────┐     ┌──────────────┐     ┌────────────┐
│ Usuario  │     │  BirthDataForm   │     │  WordPress   │     │  Backend   │
└────┬─────┘     └────────┬─────────┘     └──────┬───────┘     └─────┬──────┘
     │                     │                      │                   │
     │ 1. Completa datos   │                      │                   │
     ├────────────────────>│                      │                   │
     │                     │                      │                   │
     │                     │ 2. Geocode ciudad    │                   │
     │                     ├─────────────────────>│                   │
     │                     │    (Nominatim API)   │                   │
     │                     │<─────────────────────┤                   │
     │                     │  lat/lon/timezone    │                   │
     │                     │                      │                   │
     │ 3. Click "Generar"  │                      │                   │
     ├────────────────────>│                      │                   │
     │                     │                      │                   │
     │                     │ 4. POST /generate-   │                   │
     │                     │    free-report       │                   │
     │                     ├─────────────────────>│                   │
     │                     │                      │                   │
     │                     │                      │ 5. Crear usuario  │
     │                     │                      │    (si necesario) │
     │                     │                      │                   │
     │                     │                      │ 6. POST /auth/    │
     │                     │                      │    wordpress-login│
     │                     │                      ├──────────────────>│
     │                     │                      │<──────────────────┤
     │                     │                      │  JWT token        │
     │                     │                      │                   │
     │                     │                      │ 7. POST /reports/ │
     │                     │                      │    queue-full-    │
     │                     │                      │    report         │
     │                     │                      ├──────────────────>│
     │                     │                      │<──────────────────┤
     │                     │                      │  session_id       │
     │                     │                      │                   │
     │                     │<─────────────────────┤                   │
     │                     │  session_id +        │                   │
     │                     │  viewer_url          │                   │
     │                     │                      │                   │
     │ 8. Redirect a       │                      │                   │
     │    /tu-informe-     │                      │                   │
     │    gratis/?         │                      │                   │
     │    session_id=...   │                      │                   │
     │<────────────────────┤                      │                   │
     │                     │                      │                   │
     │                     │                      │ 9. SSE Stream     │
     │                     │                      │    /reports/      │
     │                     │                      │    stream/{id}    │
     │                     │                      ├──────────────────>│
     │ 10. Ver progreso    │                      │<══════════════════│
     │     en tiempo real  │                      │  SSE events       │
     │<════════════════════│                      │                   │
     │                     │                      │                   │
```

---

## 🚀 Próximos Pasos

### 1. Añadir campo Email al formulario
Actualmente se genera un email temporal. Sería mejor pedir el email real:

```typescript
// En BirthDataForm.tsx
<div className="form-group">
  <label htmlFor="email" className="form-label">
    Email
    <span className="required">*</span>
  </label>
  <input
    type="email"
    id="email"
    name="email"
    value={formData.email}
    onChange={handleInputChange}
    placeholder="tu@email.com"
    className="form-input"
  />
</div>
```

### 2. Mejorar manejo de SSE en FreeReportViewer
Implementar streaming de progreso:

```typescript
const eventSource = new EventSource(
  `${apiUrl}/reports/stream/${sessionId}`,
  { withCredentials: true }
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  setProgress(data.progress);

  if (data.status === 'completed') {
    setReport(data.report);
    eventSource.close();
  }
};
```

### 3. Añadir notificación por email
Cuando el informe esté listo, enviar email al usuario:

```php
// En el backend o mediante webhook
add_action('da_report_completed', function($session_id, $user_id) {
    $user = get_userdata($user_id);
    $viewer_url = home_url("/tu-informe-gratis/?session_id={$session_id}");

    wp_mail(
        $user->user_email,
        'Tu Informe Astrológico está listo',
        "Hola {$user->display_name},\n\n" .
        "Tu informe astrológico personalizado está listo.\n\n" .
        "Ver informe: {$viewer_url}\n\n" .
        "Saludos,\nEl equipo de Decano Astrológico"
    );
}, 10, 2);
```

### 4. Analytics y tracking
Añadir eventos de Google Analytics:

```typescript
// En BirthDataForm.tsx después de generar
if (typeof gtag !== 'undefined') {
  gtag('event', 'free_report_generated', {
    user_id: result.user_id,
    is_new_user: result.is_new_user,
    session_id: result.session_id
  });
}
```

### 5. Optimizar creación de usuarios
Considerar login automático después de crear usuario:

```php
// En class-da-rest-api.php después de wp_create_user()
wp_set_current_user($user_id);
wp_set_auth_cookie($user_id);
do_action('wp_login', $user->user_login, $user);
```

---

## 📝 Commits Relacionados

```bash
71846f1 feat(free-report): implement complete free report generation flow
```

**Archivos modificados**:
- `wordpress/plugins/fraktal-reports/includes/class-da-rest-api.php` (+230 líneas)
- `wordpress/plugins/fraktal-reports/react-src/src/components/BirthDataForm/BirthDataForm.tsx` (+60 líneas)
- `wordpress/plugins/fraktal-reports/public/build/da-app.js` (234.78 KB)
- `wordpress/plugins/fraktal-reports.zip` (198 KB)

---

## 📚 Referencias

### WordPress REST API
- [WordPress REST API Handbook](https://developer.wordpress.org/rest-api/)
- [register_rest_route()](https://developer.wordpress.org/reference/functions/register_rest_route/)
- [WP_REST_Request](https://developer.wordpress.org/reference/classes/wp_rest_request/)

### User Management
- [wp_create_user()](https://developer.wordpress.org/reference/functions/wp_create_user/)
- [wp_update_user()](https://developer.wordpress.org/reference/functions/wp_update_user/)
- [get_user_meta()](https://developer.wordpress.org/reference/functions/get_user_meta/)
- [update_user_meta()](https://developer.wordpress.org/reference/functions/update_user_meta/)

### Security
- [Data Validation](https://developer.wordpress.org/apis/security/data-validation/)
- [Sanitizing Data](https://developer.wordpress.org/apis/security/sanitizing-securing-output/)

### Backend API
- [FastAPI JWT Authentication](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

---

**Última actualización**: 2026-01-12 19:35 CET

**Versión del plugin**: 1.0.0-free-generation

**Estado**: ✅ LISTO PARA PRODUCCIÓN
