
# Guía de Diagnóstico de Errores - Decano Astrológico

## 🚨 El Plugin No Se Activa - ¿Qué Hacer?

Si el plugin da un error fatal al activar y **no puedes acceder a los archivos**, sigue estos pasos **EN ORDEN** para obtener información de diagnóstico.

---

## Paso 1: Acceder al Log de Errores de PHP

El plugin ahora escribe información detallada en el log de errores de PHP. Hay **3 formas** de acceder a este log:

### Opción A: Desde cPanel (Más Común)

1. **Accede a tu cPanel** de hosting
2. **Busca "Errores"** o **"Error Log"** en el buscador de cPanel
3. Haz clic en **"Error Log"** o **"Registro de errores"**
4. Busca líneas que contengan **`DECANO ACTIVATION`**
5. **Copia TODO el bloque** desde `=== DECANO ACTIVATION START ===` hasta el final

### Opción B: Desde el Administrador de Archivos de cPanel

1. **Accede a cPanel > Administrador de archivos**
2. Navega a **`public_html/wp-content/`**
3. Busca el archivo **`debug.log`**
   - Si no existe, ve al **Paso 2** para habilitarlo primero
4. Haz clic derecho en `debug.log` y selecciona **"Ver"** o **"Editar"**
5. Busca líneas que contengan **`DECANO ACTIVATION`**
6. **Copia TODO el bloque** de diagnóstico

### Opción C: Solicitar al Hosting

Si no tienes acceso a cPanel, contacta a soporte técnico de tu hosting y solicita:

> "Por favor, envíame el contenido del archivo `/public_html/wp-content/debug.log` o el error_log de PHP más reciente. Busquen líneas que contengan 'DECANO ACTIVATION'."

---

## Paso 2: Habilitar WP_DEBUG (Si el Log No Existe)

Si el archivo `debug.log` no existe, debes habilitarlo:

### Si TIENES acceso a cPanel:

1. **Accede a cPanel > Administrador de archivos**
2. Navega a **`public_html/`**
3. Busca el archivo **`wp-config.php`**
4. Haz clic derecho y selecciona **"Editar"**
5. **Busca estas líneas** (cerca del final, antes de `/* That's all, stop editing! */`):

   ```php
   define('WP_DEBUG', false);
   ```

6. **Reemplázalas por estas**:

   ```php
   define('WP_DEBUG', true);
   define('WP_DEBUG_LOG', true);
   define('WP_DEBUG_DISPLAY', false);
   ```

7. **Guarda el archivo**
8. **Intenta activar el plugin de nuevo**
9. **Revisa** `/wp-content/debug.log` (debería existir ahora)

### Si NO tienes acceso a cPanel:

Solicita a soporte técnico:

> "Por favor, activen WP_DEBUG en mi instalación de WordPress añadiendo estas líneas a wp-config.php antes de '/* That's all, stop editing! */':
>
> define('WP_DEBUG', true);
> define('WP_DEBUG_LOG', true);
> define('WP_DEBUG_DISPLAY', false);
>
> Luego envíenme el contenido del archivo /wp-content/debug.log después de intentar activar el plugin 'Decano Astrológico'."

---

## Paso 3: Interpretar el Log de Diagnóstico

El plugin registra **8 pasos** durante la activación. Busca el log que comienza con:

```
=== DECANO ACTIVATION START ===
```

### Ejemplo de Log Exitoso:

```log
=== DECANO ACTIVATION START ===
Plugin dir: /home/user/public_html/wp-content/plugins/fraktal-reports-1.0.0-2/
Plugin version: 1.0.0
Checking PHP version...
Current PHP: 8.3.27
✓ PHP version OK
Checking WordPress version...
WordPress version: 6.9
✓ WordPress version OK
Checking WooCommerce...
✓ WooCommerce class found
Checking activator file...
Activator path: /home/user/.../includes/class-da-activator.php
✓ Activator file exists
Loading activator class...
✓ Activator file loaded
Checking DA_Activator class...
✓ DA_Activator class exists
Calling DA_Activator::activate()...
✓ DA_Activator::activate() completed
=== DECANO ACTIVATION SUCCESS ===
```

### Ejemplo de Log con Error:

```log
=== DECANO ACTIVATION START ===
Plugin dir: /home/user/public_html/wp-content/plugins/fraktal-reports-1.0.0-2/
Plugin version: 1.0.0
Checking PHP version...
Current PHP: 8.3.27
✓ PHP version OK
Checking WordPress version...
WordPress version: 6.9
✓ WordPress version OK
Checking WooCommerce...
ERROR: WooCommerce not found
```

**En este caso**: El error es que **WooCommerce no está instalado o activado**.

---

## Errores Comunes y Soluciones

### ❌ Error: "WooCommerce not found"

**Diagnóstico**: En el log verás:
```
Checking WooCommerce...
ERROR: WooCommerce not found
```

**Causa**: WooCommerce no está instalado o no está activado.

**Solución**:

1. **Ve a Plugins > Añadir nuevo** en WordPress
2. Busca **"WooCommerce"**
3. **Instala** y **Activa** WooCommerce
4. **Vuelve a Plugins** y activa "Decano Astrológico"

---

### ❌ Error: "Activator file not found"

**Diagnóstico**: En el log verás:
```
Checking activator file...
Activator path: /path/to/includes/class-da-activator.php
ERROR: Activator file not found
```

**Causa**: El ZIP se instaló incompleto o los archivos no se subieron correctamente.

**Solución**:

1. **Desinstala el plugin completamente**:
   - Ve a **Plugins > Plugins instalados**
   - Desactiva "Decano Astrológico" (si está activo)
   - Haz clic en **"Eliminar"**

2. **Elimina la carpeta manualmente** (vía cPanel):
   - **cPanel > Administrador de archivos**
   - Navega a **`/public_html/wp-content/plugins/`**
   - Elimina la carpeta **`fraktal-reports-1.0.0-2`** (o similar)

3. **Reinstala desde el ZIP**:
   - Descarga el ZIP de nuevo desde GitHub
   - Ve a **Plugins > Añadir nuevo > Subir plugin**
   - Sube el archivo `fraktal-reports-1.0.0.zip`
   - Haz clic en **"Instalar ahora"**
   - Haz clic en **"Activar plugin"**

---

### ❌ Error: "DA_Activator class not defined after require"

**Diagnóstico**: En el log verás:
```
Loading activator class...
✓ Activator file loaded
Checking DA_Activator class...
ERROR: DA_Activator class not defined after require
```

**Causa**: Hay un error de sintaxis PHP en el archivo `class-da-activator.php` o falta una dependencia.

**Solución**:

1. **Busca en el log un error de sintaxis** justo antes de esta línea
2. Si ves algo como:
   ```
   PHP Parse error: syntax error, unexpected...
   ```
   El archivo está corrupto.

3. **Reinstala el plugin** siguiendo los pasos del error anterior.

---

### ❌ Error dentro de DA_Activator::activate()

**Diagnóstico**: En el log verás:
```
Calling DA_Activator::activate()...
=== DECANO ACTIVATION FAILED ===
ERROR TYPE: Exception
ERROR MESSAGE: Error creating database table...
ERROR FILE: /path/to/class-da-activator.php:123
ERROR TRACE: ...
```

**Causa**: Puede ser:
- Permisos insuficientes de base de datos
- WooCommerce Subscriptions no instalado (genera WARNING pero no bloquea)
- Otro error interno

**Solución**:

1. **Copia el ERROR MESSAGE completo**
2. **Copia el ERROR TRACE completo**
3. **Abre un issue en GitHub** con esta información:
   - https://github.com/benetandujar72/Decano-astrologico/issues
4. Incluye:
   - El mensaje de error completo
   - El stack trace completo
   - Tu versión de PHP (del log)
   - Tu versión de WordPress (del log)

---

## Errores Específicos según ERROR MESSAGE

### "Error creating table wp_da_report_sessions"

**Causa**: El usuario de MySQL no tiene permisos `CREATE TABLE`.

**Solución**:

1. Contacta a tu hosting
2. Solicita que el usuario de MySQL de tu WordPress tenga permisos:
   - `CREATE TABLE`
   - `ALTER TABLE`
   - `INDEX`

3. Verifica permisos en phpMyAdmin:
   - Accede a **cPanel > phpMyAdmin**
   - Selecciona tu base de datos de WordPress
   - Intenta ejecutar:
     ```sql
     CREATE TABLE test_table (id INT);
     DROP TABLE test_table;
     ```
   - Si falla, contacta al hosting.

---

### "WC_Subscriptions_Product not found"

**Diagnóstico**: En el log verás (dentro de DA_Activator):
```
ERROR: WooCommerce Subscriptions no está instalado
```

**Impacto**:
- El plugin **SE ACTIVARÁ**
- Solo se creará el plan **Free** (€0)
- Los planes **Premium** y **Enterprise** NO se crearán

**Solución (Si quieres planes de pago)**:

1. **Instala WooCommerce Subscriptions**:
   - Es un plugin de pago (~$199/año)
   - Descárgalo desde WooCommerce.com
   - Sube e instala el plugin en WordPress

2. **Resetea la creación de productos**:
   - Ve a **cPanel > phpMyAdmin**
   - Selecciona tu base de datos
   - Ejecuta:
     ```sql
     DELETE FROM wp_options WHERE option_name = 'da_products_created';
     ```
   - Reemplaza `wp_` por tu prefijo de BD si es diferente

3. **Reactiva el plugin**:
   - Ve a **Plugins**
   - Desactiva "Decano Astrológico"
   - Activa "Decano Astrológico"

4. **Verifica productos creados**:
   - Ve a **WooCommerce > Productos**
   - Deberías ver 3 productos ahora:
     - Plan Gratuito (€0/mes)
     - Plan Premium (€29.99/mes)
     - Plan Enterprise (€99.99/mes)

---

## Checklist de Verificación Antes de Activar

Antes de intentar activar el plugin, verifica:

- [ ] **PHP 8.0 o superior** instalado
- [ ] **WordPress 6.0 o superior** instalado
- [ ] **WooCommerce** instalado y activado
- [ ] El **ZIP del plugin** descargado completo (sin errores)
- [ ] Suficiente **espacio en disco** en el hosting
- [ ] El usuario de **MySQL tiene permisos** CREATE TABLE

---

## Cómo Enviar un Reporte de Error

Si después de seguir esta guía el error persiste:

### 1. Recopila Información

Necesitas:

1. **Log completo de diagnóstico** (desde `=== DECANO ACTIVATION START ===` hasta el final)
2. **Mensaje de error exacto** que muestra WordPress
3. **Captura de pantalla** del error (si es posible)

### 2. Abre un Issue en GitHub

1. Ve a: https://github.com/benetandujar72/Decano-astrologico/issues
2. Haz clic en **"New Issue"**
3. **Título**: "Error al activar plugin: [descripción breve]"
4. **Cuerpo**: Incluye:

```markdown
## Descripción del Error
[Describe qué pasó cuando intentaste activar el plugin]

## Log de Diagnóstico
```
[Pega AQUÍ el log completo desde === DECANO ACTIVATION START ===]
```

## Información del Sistema
- PHP version: [del log]
- WordPress version: [del log]
- WooCommerce instalado: Sí / No
- WooCommerce Subscriptions instalado: Sí / No

## Pasos Realizados
- [ ] Instalé WooCommerce
- [ ] Habilité WP_DEBUG
- [ ] Verifiqué el log de errores
- [ ] Reinstalé el plugin desde cero
- [ ] [Otros pasos...]

## Captura de Pantalla
[Adjunta captura del error si es posible]
```

### 3. NO Incluyas

⚠️ **Por seguridad, NO incluyas**:
- Contraseñas
- HMAC secrets
- Nombres de usuario de base de datos
- Rutas completas de servidor (puedes reemplazarlas por `/path/to/...`)
- Información sensible de clientes

---

## Acceso Remoto Temporal (Último Recurso)

Si no puedes resolver el error y necesitas ayuda urgente:

1. **Instala el plugin "Temporary Login Without Password"**:
   - https://wordpress.org/plugins/temporary-login-without-password/

2. **Crea un acceso temporal** para el desarrollador:
   - Duración: 1 hora
   - Rol: Administrador

3. **Comparte el link** SOLO vía mensaje privado en GitHub

4. **Revoca el acceso** inmediatamente después de que se resuelva

---

## Desactivar WP_DEBUG Después de Resolver

⚠️ **IMPORTANTE**: Una vez resuelto el problema, **desactiva WP_DEBUG** en producción:

1. Edita **`wp-config.php`**
2. Cambia:
   ```php
   define('WP_DEBUG', true);
   define('WP_DEBUG_LOG', true);
   define('WP_DEBUG_DISPLAY', false);
   ```

3. Por:
   ```php
   define('WP_DEBUG', false);
   ```

4. **Guarda el archivo**

Dejar WP_DEBUG activo puede exponer información sensible en logs.

---

## Resumen de Acciones

### Si el plugin NO activa:

1. ✅ **Habilita WP_DEBUG** (Paso 2)
2. ✅ **Intenta activar el plugin**
3. ✅ **Accede al log de errores** (Paso 1)
4. ✅ **Busca líneas con `DECANO ACTIVATION`**
5. ✅ **Identifica el error específico** (Paso 3)
6. ✅ **Aplica la solución correspondiente** (Paso 4)
7. ✅ **Si persiste, abre un issue en GitHub** con el log completo

### Si el plugin SÍ activa pero falla algo después:

1. ✅ Ve a **Decano > Debug** en el panel de WordPress
2. ✅ Revisa las **verificaciones del sistema**
3. ✅ Busca badges rojos **"FAIL"**
4. ✅ Revisa el **log de actividades**
5. ✅ Usa el botón **"Test Conexión Backend"**

---

**Última actualización**: 2026-01-10
**Versión del plugin**: 1.0.0
