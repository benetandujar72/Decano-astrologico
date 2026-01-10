# Guía de Depuración - Decano Astrológico

## 🔍 Sistema de Debug Integrado

El plugin incluye un sistema completo de debugging que te permite diagnosticar problemas sin necesidad de acceso FTP o SSH.

## Acceso al Panel de Debug

1. Inicia sesión en WordPress como administrador
2. Ve a **Decano > Debug** en el menú lateral
3. Verás una pantalla con toda la información del sistema

## Características del Panel de Debug

### 📋 Información del Entorno
Muestra:
- Versión de PHP, WordPress, WooCommerce
- Memory limit y max execution time
- Rutas de directorios
- Estado de WP_DEBUG

### ✅ Verificación del Sistema
Verifica automáticamente:
- **PHP**: Versión mínima requerida (8.1+)
- **WordPress**: Versión mínima (6.0+)
- **WooCommerce**: Instalación y versión
- **WooCommerce Subscriptions**: Instalación y versión
- **Tablas de BD**: Existencia de tablas personalizadas
- **Productos**: IDs de los 3 planes creados
- **Configuración**: API URL y HMAC Secret
- **Build de React**: Archivos JS y CSS con tamaños
- **Clases PHP**: Todas las clases requeridas

Cada verificación muestra un badge verde (✓) o rojo (✗).

### 📝 Log de Actividades
Muestra las últimas 200 líneas del log con colores:
- **Azul**: Inicios de proceso
- **Verde**: Acciones completadas exitosamente
- **Naranja**: Advertencias
- **Rojo**: Errores críticos

### 🔘 Botones de Acción
- **🔍 Verificar Sistema**: Re-ejecuta todas las verificaciones
- **🌐 Test Conexión Backend**: Prueba la conexión con el backend API
- **🗑️ Limpiar Log**: Borra el archivo de log actual

## Depuración de Errores de Activación

Si el plugin falla al activarse, sigue estos pasos:

### Paso 1: Activar modo debug de WordPress

Si puedes editar `wp-config.php`:

```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```

Si NO puedes editarlo, pide al administrador del hosting que lo haga.

### Paso 2: Intentar activar el plugin

1. Ve a **Plugins > Plugins instalados**
2. Intenta activar "Decano Astrológico"
3. Si falla, anota el mensaje de error completo

### Paso 3: Revisar los logs

#### Opción A: Panel de Debug (si el plugin se activó parcialmente)
1. Ve a **Decano > Debug**
2. Revisa el log de actividades
3. Busca líneas con `[ERROR]` en rojo

#### Opción B: Archivo de log directo
El log se guarda en:
```
/wp-content/uploads/decano-debug.log
```

Pide al administrador que descargue este archivo y te lo envíe.

#### Opción C: Error log de WordPress
Si está activado WP_DEBUG_LOG, revisa:
```
/wp-content/debug.log
```

## Errores Comunes y Soluciones

### Error: "Este plugin requiere PHP 8.0 o superior"

**Causa**: Tu hosting tiene una versión antigua de PHP.

**Solución**:
1. Contacta a tu proveedor de hosting
2. Solicita actualizar PHP a versión 8.1 o superior
3. Verifica la versión actual en **Decano > Debug > Información del Entorno**

### Error: "Este plugin requiere WooCommerce instalado y activado"

**Causa**: WooCommerce no está instalado o activado.

**Solución**:
1. Instala WooCommerce desde **Plugins > Añadir nuevo**
2. Activa WooCommerce
3. Intenta activar Decano Astrológico nuevamente

### Error: "WooCommerce Subscriptions no está instalado"

**Causa**: WooCommerce Subscriptions no está instalado.

**Nota**: Este error permite que el plugin se active, pero solo creará el plan Free.

**Solución**:
1. Instala WooCommerce Subscriptions
2. Ve a **Decano > Debug**
3. Verifica que aparezca "SÍ" en WooCommerce Subscriptions
4. Si los productos Premium/Enterprise no se crearon:
   - Ve a **Plugins**
   - Desactiva "Decano Astrológico"
   - Borra la opción `da_products_created` de la base de datos
   - Reactiva el plugin

### Error: "Tabla NO se creó"

**Causa**: Permisos insuficientes de base de datos.

**Solución**:
1. Ve a **Decano > Debug**
2. En la sección "Base de Datos", verifica qué tabla falló
3. Contacta al administrador de la base de datos
4. El usuario de MySQL debe tener permisos CREATE TABLE

### Error: "Build de React - Archivo JS: MISSING"

**Causa**: Los archivos del build de React no se subieron.

**Solución**:
1. Verifica que el ZIP incluía la carpeta `public/build/`
2. Si instalaste manualmente, asegúrate de subir:
   - `public/build/da-app.js`
   - `public/build/da-app.css`
3. Tamaños esperados:
   - JS: ~213 KB
   - CSS: ~18 KB

### Error en Log: "ERROR al crear producto"

**Causa**: Error al crear productos WooCommerce.

**Solución**:
1. Revisa el log completo en **Decano > Debug**
2. Busca el stack trace del error
3. Verifica que WooCommerce está completamente configurado
4. Intenta crear un producto manual en WooCommerce primero para verificar permisos

## Depuración Sin Acceso al Panel Admin

Si no puedes acceder al panel de WordPress, puedes revisar el log directamente.

### Ver el log vía FTP
1. Conecta por FTP
2. Navega a `/wp-content/uploads/`
3. Descarga el archivo `decano-debug.log`
4. Ábrelo con un editor de texto

### Ver el log vía cPanel File Manager
1. Accede a cPanel
2. Abre File Manager
3. Navega a `public_html/wp-content/uploads/`
4. Haz clic derecho en `decano-debug.log`
5. Selecciona "View" o "Edit"

### Buscar patrones de error
Busca en el log las siguientes cadenas:
```
[ERROR]
✗ Error
FAILED
Exception
Fatal error
```

## Test de Conexión al Backend

El panel de debug incluye un test de conexión al backend API.

### Ejecutar el test
1. Ve a **Decano > Debug**
2. Haz clic en **🌐 Test Conexión Backend**
3. Espera a que complete
4. Revisa los resultados en el log

### Interpretar resultados

**Success (200 OK)**:
```
Test de conexión ejecutado
status_code: 200
```
✅ La conexión funciona correctamente

**Error de conexión**:
```
ERROR: Error al conectar con el backend
```
❌ El backend no está accesible. Verifica:
- ¿La URL del backend es correcta?
- ¿El backend está en línea?
- ¿El firewall bloquea la conexión?

**Error de autenticación HMAC**:
```
status_code: 403
Unauthorized
```
❌ El HMAC Secret no coincide. Verifica:
- El secret en WordPress (Decano > Configuración)
- El secret en el backend (`WP_HMAC_SECRET`)
- Que no haya espacios extras al copiar/pegar

## Recopilar Información para Soporte

Si necesitas ayuda, recopila la siguiente información:

### 1. Información del sistema
Ve a **Decano > Debug** y haz captura de pantalla de:
- Información del Entorno
- Verificación del Sistema (todas las tablas)

### 2. Log completo
En **Decano > Debug**, copia todo el contenido del "Log de Actividades"

### 3. Error de WordPress
Si WP_DEBUG está activo, incluye el contenido de `/wp-content/debug.log`

### 4. Mensaje de error
Si al activar el plugin aparece un mensaje de error, copia el texto completo

### 5. Versiones
- PHP version
- WordPress version
- WooCommerce version
- WooCommerce Subscriptions version (si está instalado)

## Comandos de MySQL para Depuración Manual

Si tienes acceso a phpMyAdmin o línea de comandos de MySQL:

### Verificar tablas
```sql
SHOW TABLES LIKE 'wp_da_%';
```

### Ver opciones del plugin
```sql
SELECT * FROM wp_options WHERE option_name LIKE 'da_%';
```

### Resetear productos (si necesitas recrearlos)
```sql
DELETE FROM wp_options WHERE option_name = 'da_products_created';
-- Luego desactiva y reactiva el plugin
```

### Ver estructura de tablas
```sql
DESCRIBE wp_da_report_sessions;
DESCRIBE wp_da_plan_usage;
```

## Modo de Depuración Avanzado

Para desarrolladores que necesitan debugging más profundo:

### Habilitar error reporting completo
En `wp-config.php` (temporal):
```php
error_reporting(E_ALL);
ini_set('display_errors', 1);
define('WP_DEBUG', true);
define('WP_DEBUG_DISPLAY', true);
define('WP_DEBUG_LOG', true);
define('SCRIPT_DEBUG', true);
```

⚠️ **ADVERTENCIA**: No uses esto en producción, solo en desarrollo.

### Añadir logging personalizado
Edita `includes/class-da-debug.php` y aumenta la verbosidad si es necesario.

## Contacto de Soporte

Si después de seguir esta guía sigues teniendo problemas:

1. **GitHub Issues**: Abre un issue en https://github.com/benetandujar72/Decano-astrologico/issues
2. **Incluye**:
   - Capturas de pantalla del panel de Debug
   - Log completo
   - Mensaje de error exacto
   - Versiones de software
3. **NO incluyas**:
   - Contraseñas
   - HMAC secrets
   - Información sensible de usuarios

---

**Última actualización**: 2026-01-10
**Versión del plugin**: 1.0.0
