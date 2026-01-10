# Instrucciones - Versión Minimal de Diagnóstico

## 🎯 Objetivo

Esta es una versión **ULTRA SIMPLIFICADA** del plugin que **NO hace nada** excepto verificar que tu servidor está listo.

**NO crea:**
- ❌ Tablas de base de datos
- ❌ Productos de WooCommerce
- ❌ Archivos React
- ❌ Configuraciones complejas

**SOLO verifica:**
- ✅ PHP 8.0+
- ✅ WordPress
- ✅ WooCommerce instalado
- ✅ Permisos de escritura
- ✅ Acceso a base de datos

---

## 📦 Paso 1: Limpiar Completamente las Instalaciones Anteriores

### A. Eliminar Carpetas del Plugin (Vía cPanel)

1. **Accede a cPanel > Administrador de archivos**

2. **Navega a** `/public_html/wp-content/plugins/`

3. **Elimina TODAS estas carpetas** si existen:
   - `fraktal-reports/`
   - `fraktal-reports-1.0.0-2/`
   - `fraktal-reports-1.0.0-diagnostic/`
   - Cualquier otra carpeta que empiece con `fraktal-reports` o `decano`

4. **Confirma que están eliminadas**

### B. Limpiar Base de Datos (Vía phpMyAdmin)

1. **Accede a cPanel > phpMyAdmin**

2. **Selecciona tu base de datos de WordPress**

3. **Haz clic en la pestaña "SQL"**

4. **Copia y pega este código**:

```sql
-- Eliminar opciones del plugin anterior
DELETE FROM wp_options WHERE option_name LIKE '%fraktal%';
DELETE FROM wp_options WHERE option_name LIKE '%decano%';
DELETE FROM wp_options WHERE option_name LIKE '%da_%';

-- Eliminar tablas si existen
DROP TABLE IF EXISTS wp_da_report_sessions;
DROP TABLE IF EXISTS wp_da_plan_usage;
```

**⚠️ IMPORTANTE:** Si tu WordPress usa un prefijo diferente a `wp_`, reemplázalo en el código.

Por ejemplo, si tu prefijo es `wpxyz_`:
```sql
DELETE FROM wpxyz_options WHERE option_name LIKE '%fraktal%';
DELETE FROM wpxyz_options WHERE option_name LIKE '%decano%';
DELETE FROM wpxyz_options WHERE option_name LIKE '%da_%';
DROP TABLE IF EXISTS wpxyz_da_report_sessions;
DROP TABLE IF EXISTS wpxyz_da_plan_usage;
```

5. **Haz clic en "Continuar"**

### C. Verificar en WordPress

1. **Ve a WordPress > Plugins > Plugins instalados**

2. **Verifica que NO aparece ningún plugin** con:
   - "Decano"
   - "Fraktal Reports"
   - "Astrológico"

3. Si aparece alguno, intenta **"Eliminar"** de nuevo

---

## 📦 Paso 2: Instalar la Versión Minimal

### Descargar el ZIP

Descarga el archivo:
```
wordpress/plugins/decano-minimal-diagnostic.zip
```

### Instalar en WordPress

1. **Ve a WordPress > Plugins > Añadir nuevo > Subir plugin**

2. **Selecciona** `decano-minimal-diagnostic.zip`

3. **Haz clic en "Instalar ahora"**

4. **Haz clic en "Activar plugin"**

---

## ✅ Paso 3: ¿Qué Esperar?

### Escenario A: TODO OK ✅

Si todo funciona, verás una pantalla como esta:

```
✅ Activación Exitosa - Plugin de Diagnóstico

El plugin de diagnóstico se activó correctamente.

📋 Información Recopilada:
• PHP: 8.3.27 ✓
• WordPress: 6.9 ✓
• WooCommerce: 9.x.x ✓
• Upload Dir: Escribible ✓
• Database: OK ✓
```

**¡EXCELENTE!** Tu servidor está listo. **Envíame esta captura de pantalla**.

### Escenario B: WooCommerce Falta ❌

Si ves:

```
❌ WooCommerce No Instalado

Este plugin requiere WooCommerce instalado y activado.
```

**Solución:**

1. Haz clic en el link que aparece para instalar WooCommerce
2. O ve manualmente a **Plugins > Añadir nuevo**
3. Busca **"WooCommerce"**
4. **Instala y activa** WooCommerce
5. **Vuelve a intentar activar** "Decano Astrológico - Diagnóstico Mínimo"

### Escenario C: PHP Viejo ❌

Si ves:

```
❌ PHP Versión Insuficiente

Tu versión actual: 7.4.x
```

**Solución:**

1. Contacta a tu proveedor de hosting
2. Solicita actualizar PHP a **8.1** o superior
3. En algunos hostings puedes cambiarlo desde cPanel

### Escenario D: Error Fatal (No debería pasar)

Si ves un error fatal de PHP, **copia el mensaje completo** y envíamelo.

---

## 📋 Paso 4: Acceder al Panel de Diagnóstico

Si el plugin se activó correctamente:

1. **Ve al menú lateral de WordPress**

2. **Busca "Decano Diagnóstico"** (con icono de advertencia ⚠️)

3. **Haz clic en él**

4. **Verás una tabla** con toda la información del sistema

5. **Copia el contenido del cuadro de texto** (está al final de la página)

6. **Envíame ese texto completo**

---

## 📸 ¿Qué Información Necesito?

Por favor envíame:

### 1. Captura de Pantalla

Captura de la pantalla que aparece al activar el plugin (Escenario A, B, C o D).

### 2. Texto del Diagnóstico

Si el plugin se activó, copia el contenido del cuadro de texto en la página "Decano Diagnóstico":

```
=== DIAGNÓSTICO DECANO ===
PHP: 8.3.27 OK
WordPress: 6.9 OK
WooCommerce: 9.x.x OK
WC Subscriptions: Not Installed
Upload Dir: Writable
Memory: 256M
Max Execution: 300s
```

### 3. Log de PHP (Opcional pero útil)

**Si sabes cómo acceder al log de PHP:**

1. Ve a **cPanel > Error Log** o **Administrador de archivos > wp-content/debug.log**

2. Busca estas líneas:
   ```
   DECANO MINIMAL ACTIVATION START
   ```

3. **Copia TODO el bloque** hasta `DECANO MINIMAL ACTIVATION SUCCESS`

4. Envíamelo

---

## 🗑️ Desinstalar (Cuando Terminemos)

Esta versión minimal **NO deja basura**:

- No crea tablas
- No crea productos
- Solo crea una opción en BD: `decano_minimal_test`

Para desinstalarla:

1. **Ve a Plugins > Plugins instalados**
2. **Desactiva** "Decano Astrológico - Diagnóstico Mínimo"
3. **Elimina** el plugin
4. **Listo** - no quedan rastros

---

## ❓ FAQ

### P: ¿Este plugin hará algo en mi sitio?

**R:** NO. Es solo diagnóstico. No afecta tu sitio en absoluto.

### P: ¿Puedo instalarlo en producción?

**R:** SÍ. Es totalmente seguro. No modifica nada importante.

### P: ¿Necesito WooCommerce Subscriptions?

**R:** NO para esta versión. Solo necesitas WooCommerce básico.

### P: ¿Qué pasa si no se activa?

**R:** Verás un mensaje de error específico que me dice exactamente qué falta.

### P: ¿Cuánto tiempo tarda la activación?

**R:** Menos de 1 segundo. Si tarda más, hay un problema.

---

## 🚀 Próximos Pasos

Después de instalar esta versión minimal y enviarme la información:

1. **Analizaré los resultados**
2. **Identificaré el problema exacto**
3. **Crearé la versión completa corregida**
4. **Te enviaré el ZIP final**

---

## 📞 Soporte

Si tienes algún problema:

1. **Captura de pantalla** del error
2. **Copia el mensaje completo**
3. **Envíamelo** con todos los detalles

---

**Última actualización:** 2026-01-10
**Versión:** 1.0.0-minimal-diagnostic
