# Guía Rápida: Depurar Plugin en Producción SIN Acceso a Archivos

## 🚨 Situación: Plugin da error al activar y NO tienes acceso FTP/SSH

El plugin incluye un sistema de debug completo que puedes usar desde el panel de WordPress.

---

## Método 1: Ver Logs desde el Panel Admin (Recomendado)

### Si el plugin se activó parcialmente:

1. **Accede a WordPress como administrador**

2. **Ve al menú "Decano"**
   - Si ves el menú "Decano" en la barra lateral, significa que el plugin se cargó

3. **Haz clic en "Decano > Debug"**

4. **Revisa las secciones**:

   **📋 Información del Entorno**
   - Muestra versiones de PHP, WordPress, WooCommerce
   - Verifica que PHP sea 8.1+ (requisito mínimo)

   **✅ Verificación del Sistema**
   - Cada verificación tiene un badge verde (OK) o rojo (FAIL)
   - Busca los badges rojos para identificar qué falta

   Revisa especialmente:
   - ✓ PHP Version
   - ✓ WordPress Version
   - ✓ WooCommerce (debe decir "SÍ")
   - ✓ WooCommerce Subscriptions (puede decir "NO", pero afectará funcionalidad)
   - ✓ Tabla de sesiones
   - ✓ Tabla de uso
   - ✓ Plan Free
   - ✓ Plan Premium (requerirá WC Subscriptions)
   - ✓ Plan Enterprise (requerirá WC Subscriptions)

   **📝 Log de Actividades**
   - Muestra las últimas 200 líneas del log
   - Busca líneas en ROJO con `[ERROR]`
   - Busca líneas con el símbolo `✗` (error)

   Ejemplo de log exitoso:
   ```
   [2026-01-10 10:30:15] [INFO] === INICIO DE ACTIVACIÓN DEL PLUGIN ===
   [2026-01-10 10:30:15] [INFO] Verificando requisitos del sistema...
   [2026-01-10 10:30:15] [INFO] Requisitos verificados correctamente
   [2026-01-10 10:30:16] [INFO] ✓ Tabla de sesiones verificada
   [2026-01-10 10:30:16] [INFO] ✓ Producto creado exitosamente: Plan Free (ID: 123)
   [2026-01-10 10:30:17] [INFO] === ACTIVACIÓN COMPLETADA EXITOSAMENTE ===
   ```

   Ejemplo de log con error:
   ```
   [2026-01-10 10:30:15] [ERROR] ✗ Error al crear producto premium: WC_Subscriptions_Product not found
   [2026-01-10 10:30:16] [ERROR] ✗ Error: Tabla de sesiones NO se creó
   ```

5. **Usa los botones de acción**:
   - **🔍 Verificar Sistema**: Re-ejecuta todas las verificaciones
   - **🌐 Test Conexión Backend**: Prueba si puede conectar con tu backend API
   - **🗑️ Limpiar Log**: Limpia el log si quieres empezar de nuevo

---

## Método 2: Si NO puedes acceder al panel admin

### Opción A: Pide al administrador del hosting

Solicita que descarguen el archivo de log:
```
/wp-content/uploads/decano-debug.log
```

Este archivo contiene toda la información de la activación.

### Opción B: Error log de WordPress

Si el hosting tiene WP_DEBUG activo, el archivo de error estará en:
```
/wp-content/debug.log
```

Busca líneas que contengan "Decano Astrológico".

---

## Errores Comunes y Qué Hacer

### ❌ "Este plugin requiere PHP 8.0 o superior"

**El problema**: Tu servidor tiene PHP 7.x

**Solución**:
1. Contacta a tu proveedor de hosting
2. Pide que actualicen PHP a versión 8.1 o superior
3. En algunos hostings puedes cambiar la versión desde cPanel

**Cómo verificar versión actual**:
- Ve a **Decano > Debug > Información del Entorno**
- Busca "php_version"

---

### ❌ "Este plugin requiere WooCommerce instalado y activado"

**El problema**: WooCommerce no está instalado

**Solución**:
1. Ve a **Plugins > Añadir nuevo**
2. Busca "WooCommerce"
3. Instala y activa
4. Desactiva y reactiva "Decano Astrológico"

---

### ❌ En el log ves: "ERROR: WooCommerce Subscriptions no está instalado"

**El problema**: WooCommerce Subscriptions no está instalado

**Impacto**:
- El plugin SE ACTIVARÁ
- Solo se creará el plan Free (€0)
- Los planes Premium y Enterprise NO se crearán
- Los usuarios solo podrán usar el plan gratuito

**Solución (si quieres planes de pago)**:
1. Instala WooCommerce Subscriptions
2. Ve a **Plugins**
3. Desactiva "Decano Astrológico"
4. Ve a **Herramientas > Estado del sitio > Base de datos**
5. Borra la opción `da_products_created` (o pide al admin que lo haga)
6. Reactiva "Decano Astrológico"
7. Ve a **Decano > Debug** y verifica que ahora aparecen los 3 productos

---

### ❌ En Verificación del Sistema: "Tabla de sesiones: FAIL"

**El problema**: No se pudo crear la tabla en la base de datos

**Causas posibles**:
1. El usuario de MySQL no tiene permisos CREATE TABLE
2. La base de datos está llena
3. Hay un problema de conexión con MySQL

**Solución**:
1. Contacta al administrador de base de datos
2. Verifica permisos del usuario MySQL
3. Asegúrate de que hay espacio disponible

**Verificación manual** (si tienes phpMyAdmin):
```sql
SHOW TABLES LIKE 'wp_da_%';
```
Deberías ver:
- `wp_da_report_sessions`
- `wp_da_plan_usage`

---

### ❌ "Build de React - Archivo JS: MISSING"

**El problema**: Los archivos de React no se subieron correctamente

**Solución**:
1. Descarga de nuevo el ZIP desde GitHub
2. Desinstala el plugin actual
3. Instala el nuevo ZIP
4. Verifica que el ZIP contenga la carpeta `public/build/`

**Archivos esperados**:
- `public/build/da-app.js` (~213 KB)
- `public/build/da-app.css` (~18 KB)

---

### ❌ En el log: "Exception" o "Fatal error"

**El problema**: Error de PHP durante la activación

**Qué hacer**:
1. Copia el STACK TRACE completo del log
2. Busca la línea que dice "in /path/to/file.php:123"
3. Anota el archivo y número de línea
4. Abre un issue en GitHub con:
   - El error completo
   - El stack trace
   - Información del entorno (desde Decano > Debug)

---

## Cómo Reportar un Error

Si necesitas ayuda, recopila esta información:

### 1. Captura de pantalla del panel Debug
- Ve a **Decano > Debug**
- Haz captura de pantalla de toda la página (o varias capturas)
- Incluye especialmente:
  - Información del Entorno
  - Verificación del Sistema
  - Log de Actividades (lo más importante)

### 2. Mensaje de error exacto
- Si WordPress mostró un mensaje al activar, cópialo completo

### 3. Cómo reproducir
- ¿Qué hiciste antes del error?
- ¿El error aparece al activar, o después?
- ¿Hay algún patrón?

### 4. Información del entorno
Desde **Decano > Debug > Información del Entorno**, copia:
- php_version
- wp_version
- plugin_version

### 5. Dónde reportar
- **GitHub Issues**: https://github.com/benetandujar72/Decano-astrologico/issues
- **Título del issue**: "Error al activar plugin: [descripción breve]"
- **Adjunta**: Capturas de pantalla y log

**⚠️ NO incluyas**:
- Contraseñas
- HMAC secrets
- Datos de usuarios reales
- Información de tarjetas de crédito

---

## Test de Conexión al Backend

Si el plugin se activó pero los informes no se generan:

1. Ve a **Decano > Configuración**
2. Verifica que:
   - **Backend API URL** esté configurada (ejemplo: `https://tu-backend.onrender.com`)
   - **WP HMAC Secret** esté configurado (debe coincidir con el backend)
3. Guarda la configuración
4. Ve a **Decano > Debug**
5. Haz clic en **🌐 Test Conexión Backend**
6. Revisa el resultado en el log:

**Success**:
```
status_code: 200
response: {"status":"ok"}
```
✅ La conexión funciona

**Error**:
```
ERROR: Error al conectar con el backend: Connection timeout
```
❌ El backend no es accesible

**Forbidden**:
```
status_code: 403
Unauthorized
```
❌ El HMAC secret no coincide

---

## Reintentar la Activación

Si corregiste un problema y quieres reintentar:

1. **Desactiva el plugin**:
   - Ve a **Plugins > Plugins instalados**
   - Busca "Decano Astrológico"
   - Haz clic en "Desactivar"

2. **Limpia el log anterior** (opcional):
   - Si el plugin se activó parcialmente
   - Ve a **Decano > Debug**
   - Haz clic en **🗑️ Limpiar Log**

3. **Reactiva el plugin**:
   - Haz clic en "Activar"
   - Espera a que complete

4. **Verifica el resultado**:
   - Ve a **Decano > Debug**
   - Revisa el nuevo log
   - Verifica que todas las verificaciones estén en verde

---

## Casos Especiales

### El menú "Decano" no aparece

**Causa**: El plugin no se activó correctamente o hay un error fatal.

**Solución**:
1. Pide al administrador del hosting que revise:
   - `/wp-content/debug.log`
   - Logs del servidor PHP
2. Intenta desactivar todos los demás plugins
3. Activa "Decano Astrológico" solo
4. Si funciona, reactiva los otros plugins uno por uno

### Los shortcodes no funcionan

**Problema**: Los shortcodes como `[decano-report-generator]` no muestran nada.

**Verificaciones**:
1. Ve a **Decano > Debug**
2. Verifica:
   - Build de React: Archivo JS = OK
   - Build de React: Archivo CSS = OK
3. Abre la consola del navegador (F12)
4. Busca errores de JavaScript
5. Busca que se esté cargando `da-app.js`

### Los productos no aparecen en WooCommerce

1. Ve a **Decano > Debug**
2. Sección "Productos WooCommerce"
3. Verifica que los 3 productos muestren "OK"
4. Si dicen "MISSING":
   - Desactiva el plugin
   - Borra la opción `da_products_created` de la BD (pide al admin)
   - Reactiva el plugin

---

## Checklist de Depuración

Usa este checklist para verificar sistemáticamente:

- [ ] PHP versión 8.1 o superior
- [ ] WordPress 6.0 o superior
- [ ] WooCommerce instalado y activado
- [ ] WooCommerce Subscriptions instalado (opcional pero recomendado)
- [ ] Plugin "Decano Astrológico" activado sin errores
- [ ] Menú "Decano" visible en admin
- [ ] Tabla de sesiones creada (OK)
- [ ] Tabla de uso creada (OK)
- [ ] Plan Free creado (OK)
- [ ] Plan Premium creado (OK o MISSING si no hay Subscriptions)
- [ ] Plan Enterprise creado (OK o MISSING si no hay Subscriptions)
- [ ] Build de React JS presente (OK)
- [ ] Build de React CSS presente (OK)
- [ ] Backend API URL configurada
- [ ] HMAC Secret configurado
- [ ] Test de conexión al backend exitoso

---

## Recursos Adicionales

- **Documentación completa**: [README.md](wordpress/plugins/fraktal-reports/README.md)
- **Guía de instalación**: [INSTALL.md](wordpress/plugins/fraktal-reports/INSTALL.md)
- **Guía de debug detallada**: [DEBUG.md](wordpress/plugins/fraktal-reports/DEBUG.md)
- **Issues en GitHub**: https://github.com/benetandujar72/Decano-astrologico/issues

---

**Última actualización**: 2026-01-10
**Versión del plugin**: 1.0.0
