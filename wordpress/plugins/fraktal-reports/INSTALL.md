# Guía de Instalación - Decano Astrológico v1.0.0

## Requisitos Previos

Antes de instalar el plugin, asegúrate de tener:

### Software Requerido
- **WordPress**: 6.0 o superior
- **PHP**: 8.1 o superior
- **WooCommerce**: 8.0 o superior
- **WooCommerce Subscriptions**: 5.0 o superior

### Configuración del Servidor
- Memory limit PHP: Al menos 256 MB
- Max execution time: 300 segundos (recomendado)
- Post max size: 64 MB
- Upload max filesize: 64 MB

### Backend API
- Backend FastAPI (Motor Fractal) desplegado y accesible
- WP HMAC Secret configurado en el backend

---

## Método 1: Instalación desde ZIP (Recomendado)

### Paso 1: Descargar el Plugin
Descarga el archivo `fraktal-reports-1.0.0.zip` desde el repositorio.

### Paso 2: Instalar en WordPress

1. Accede al panel de administración de WordPress
2. Ve a **Plugins > Añadir nuevo**
3. Haz clic en **Subir plugin**
4. Selecciona el archivo `fraktal-reports-1.0.0.zip`
5. Haz clic en **Instalar ahora**
6. Una vez instalado, haz clic en **Activar plugin**

### Paso 3: Verificar Instalación

Al activar el plugin, se ejecutarán automáticamente:
- ✅ Creación de tablas en la base de datos
- ✅ Creación de 3 productos WooCommerce con suscripciones
- ✅ Configuración inicial del sistema

Verifica que los productos fueron creados:
- Ve a **WooCommerce > Productos**
- Deberías ver:
  - Plan Gratuito - Decano Astrológico (€0/mes)
  - Plan Premium - Decano Astrológico (€29.99/mes)
  - Plan Enterprise - Decano Astrológico (€99.99/mes)

---

## Método 2: Instalación Manual vía FTP

### Paso 1: Extraer el ZIP
Extrae el contenido del archivo `fraktal-reports-1.0.0.zip` en tu ordenador.

### Paso 2: Subir vía FTP
1. Conecta a tu servidor vía FTP
2. Navega a `/wp-content/plugins/`
3. Sube la carpeta `fraktal-reports` completa
4. Asegúrate de que todos los archivos se hayan subido correctamente

### Paso 3: Activar el Plugin
1. Accede al panel de WordPress
2. Ve a **Plugins > Plugins instalados**
3. Busca "Decano Astrológico"
4. Haz clic en **Activar**

---

## Configuración Post-Instalación

### 1. Configurar Conexión con Backend

1. Ve a **Decano > Configuración** en el menú de WordPress
2. Completa los campos:

   **Backend API URL:**
   ```
   https://tu-backend.onrender.com
   ```
   (Sin barra final)

   **WP HMAC Secret:**
   ```
   tu_secret_hmac_aqui
   ```
   (Debe coincidir exactamente con `WP_HMAC_SECRET` del backend)

3. Haz clic en **Guardar Configuración**

### 2. Verificar Productos WooCommerce

Ve a **WooCommerce > Productos** y revisa los 3 productos creados:

#### Plan Gratuito (€0/mes)
- 1 informe resumido por mes
- Carta natal básica
- Acceso gratuito

#### Plan Premium (€29.99/mes)
- Informes ilimitados
- Informes completos
- 5 plantillas personalizadas
- Técnicas avanzadas
- Soporte prioritario

#### Plan Enterprise (€99.99/mes)
- Todo de Premium
- Plantillas ilimitadas
- API REST completa
- CSS personalizado
- Soporte 24/7

**IMPORTANTE:** Puedes modificar los precios desde WooCommerce > Productos.

### 3. Configurar Pasarela de Pago

Para que los usuarios puedan suscribirse a planes de pago:

1. Ve a **WooCommerce > Ajustes > Pagos**
2. Activa al menos una pasarela de pago (Stripe, PayPal, etc.)
3. Asegúrate de que la pasarela soporte pagos recurrentes

### 4. Añadir Shortcodes a Páginas

Crea las páginas necesarias con los shortcodes:

#### Página: Generar Informe
```
[decano-report-generator]
```

#### Página: Mi Dashboard
```
[decano-user-dashboard]
```

#### Página: Planes y Precios
```
[decano-plans highlighted="premium"]
```

#### Página: Mis Informes
```
[decano-report-history limit="20"]
```

---

## Verificación de Instalación

### Verificar Tablas de Base de Datos

Accede a phpMyAdmin y verifica que existen estas tablas:

- `wp_da_report_sessions` - Sesiones de informes
- `wp_da_plan_usage` - Uso mensual por usuario

### Verificar Frontend React

1. Visita una página con el shortcode `[decano-report-generator]`
2. Abre la consola del navegador (F12)
3. Verifica que no hay errores JavaScript
4. Deberías ver el componente React cargado con estilos Tailwind

### Probar Generación de Informe

1. Inicia sesión como usuario
2. Ve a la página con `[decano-report-generator]`
3. Crea un perfil de prueba
4. Selecciona un tipo de informe
5. Inicia la generación
6. Verifica que el wizard muestra el progreso

---

## Solución de Problemas

### El plugin se activa pero no veo el menú "Decano"

**Causa:** Tu usuario no tiene permisos de administrador.

**Solución:** Asegúrate de estar conectado como administrador o que tu rol tenga la capacidad `manage_options`.

### Los productos no se crearon automáticamente

**Causa:** WooCommerce o WooCommerce Subscriptions no está activado.

**Solución:**
1. Activa WooCommerce primero
2. Activa WooCommerce Subscriptions
3. Desactiva y reactiva el plugin Decano Astrológico

### Los shortcodes no renderizan componentes React

**Causa:** Los archivos de build no se cargaron correctamente.

**Solución:**
1. Verifica que existe la carpeta `fraktal-reports/public/build/`
2. Verifica que contiene:
   - `da-app.js`
   - `da-app.css`
3. Si faltan, ejecuta el build desde la carpeta `react-src/`:
   ```bash
   npm install
   npm run build
   ```

### Error "Backend API URL no configurada"

**Causa:** No se ha configurado la URL del backend.

**Solución:**
1. Ve a **Decano > Configuración**
2. Añade la URL completa de tu backend FastAPI
3. Guarda la configuración

### Error de autenticación HMAC

**Causa:** El secret HMAC no coincide entre WordPress y el backend.

**Solución:**
1. Verifica el valor de `WP_HMAC_SECRET` en tu backend
2. Ve a **Decano > Configuración** en WordPress
3. Copia exactamente el mismo valor en "WP HMAC Secret"
4. Guarda la configuración

### Los estilos no se cargan correctamente

**Causa:** Conflicto con el tema de WordPress.

**Solución:**
1. Limpia la caché del navegador
2. Verifica que se está cargando `da-app.css` en el inspector
3. Si hay conflictos, puede que necesites ajustar la especificidad CSS

### El wizard se queda "estancado"

**Causa:** El backend no está respondiendo o hay un error.

**Solución:**
1. Verifica que el backend está accesible
2. Revisa los logs del backend para ver errores
3. Comprueba la consola del navegador para errores de red
4. El wizard debería detectar el estancamiento automáticamente tras 2 minutos

---

## Actualización del Plugin

Para actualizar a una versión posterior:

### Método Seguro (Recomendado)

1. **Haz backup de:**
   - Base de datos completa
   - Carpeta `wp-content/plugins/fraktal-reports/`

2. **Desactiva el plugin:**
   - Ve a **Plugins > Plugins instalados**
   - Desactiva "Decano Astrológico"

3. **Elimina la versión anterior:**
   - Elimina el plugin desde WordPress
   - O elimina la carpeta vía FTP

4. **Instala la nueva versión:**
   - Sube el nuevo ZIP
   - Activa el plugin

5. **Verifica:**
   - Revisa que los datos se mantienen
   - Prueba la generación de informes

### Método Rápido (Desarrolladores)

Si tienes acceso SSH/Git:

```bash
cd wp-content/plugins/fraktal-reports/
git pull origin main
```

---

## Desinstalación

Si necesitas eliminar completamente el plugin:

### Opción 1: Desde WordPress (Recomendado)

1. Desactiva el plugin
2. Haz clic en "Eliminar"
3. WordPress eliminará los archivos automáticamente

**NOTA:** Las tablas de la base de datos y los productos WooCommerce NO se eliminarán automáticamente.

### Opción 2: Manual (Desarrolladores)

Para eliminar completamente incluyendo datos:

```sql
-- Eliminar tablas
DROP TABLE IF EXISTS wp_da_report_sessions;
DROP TABLE IF EXISTS wp_da_plan_usage;

-- Eliminar opciones
DELETE FROM wp_options WHERE option_name LIKE 'da_%';

-- Eliminar productos (opcional)
-- Desde WooCommerce > Productos, elimina manualmente los 3 productos
```

---

## Recursos Adicionales

- **Documentación completa:** Ver [README.md](README.md)
- **Historial de cambios:** Ver [CHANGELOG.md](CHANGELOG.md)
- **Soporte:** Abrir issue en GitHub
- **Backend FastAPI:** Repositorio del Motor Fractal

---

## Checklist de Instalación

Usa este checklist para verificar que todo está configurado:

- [ ] WordPress 6.0+ instalado
- [ ] PHP 8.1+ configurado
- [ ] WooCommerce 8.0+ activado
- [ ] WooCommerce Subscriptions 5.0+ activado
- [ ] Plugin Decano Astrológico instalado y activado
- [ ] Backend API URL configurada en Decano > Configuración
- [ ] WP HMAC Secret configurado correctamente
- [ ] 3 productos de suscripción creados en WooCommerce
- [ ] Pasarela de pago configurada y activa
- [ ] Tablas de BD creadas (wp_da_report_sessions, wp_da_plan_usage)
- [ ] Páginas creadas con shortcodes
- [ ] Prueba de generación de informe completada exitosamente
- [ ] Panel admin accesible en Decano > Dashboard

---

**Versión:** 1.0.0
**Fecha:** Enero 2026
**Última actualización:** 2026-01-10
