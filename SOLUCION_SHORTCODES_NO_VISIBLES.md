# Solución: Shortcodes No Visibles en WordPress

## 🔴 Problema Identificado

Los shortcodes `[decano-free-report-form]`, `[decano-free-report-viewer]` y `[decano-upgrade-landing]` no se visualizaban en las páginas de WordPress.

### Causas Raíz:

1. **Script React no se cargaba**: El archivo `class-da-public.php` solo detectaba el shortcode legacy `fraktal_panel`, ignorando los nuevos shortcodes.

2. **Componentes no registrados**: El archivo `main.tsx` no importaba ni registraba los 3 nuevos componentes del sistema Free Hook.

3. **Componente faltante**: `UpgradeLanding.tsx` no existía (solo estaba el CSS).

---

## ✅ Solución Implementada

### 1. Actualización de `class-da-public.php`

**Ubicación**: `wordpress/plugins/fraktal-reports/public/class-da-public.php`

#### Cambios realizados:

**a) Nuevo método `has_decano_shortcode()`**
```php
private function has_decano_shortcode() {
    global $post;

    if (!$post) {
        return false;
    }

    $shortcodes = [
        'decano-free-report-form',
        'decano-free-report-viewer',
        'decano-upgrade-landing',
        'decano-report-generator',
        'decano-user-dashboard',
        'decano-plans',
        'decano-report-history',
        'fraktal_panel' // Compatibilidad
    ];

    foreach ($shortcodes as $shortcode) {
        if (has_shortcode($post->post_content, $shortcode)) {
            return true;
        }
    }

    return false;
}
```

**b) Carga de estilos React compilados**
```php
public function enqueue_styles() {
    if (!$this->has_decano_shortcode()) {
        return;
    }

    // Estilos legacy
    wp_enqueue_style('decano-public', ...);

    // Estilos de React compilados
    $css_files = glob(DECANO_PLUGIN_DIR . 'public/build/assets/*.css');
    if (!empty($css_files)) {
        foreach ($css_files as $index => $css_file) {
            $css_url = DECANO_PLUGIN_URL . 'public/build/assets/' . basename($css_file);
            wp_enqueue_style('decano-react-' . $index, $css_url, [], DECANO_VERSION);
        }
    }
}
```

**c) Carga del bundle React (`da-app.js`)**
```php
public function enqueue_scripts() {
    if (!$this->has_decano_shortcode()) {
        return;
    }

    // Script legacy
    wp_enqueue_script('decano-public', ...);

    // Script de React compilado (da-app.js)
    if (file_exists(DECANO_PLUGIN_DIR . 'public/build/da-app.js')) {
        wp_enqueue_script(
            'decano-react-app',
            DECANO_PLUGIN_URL . 'public/build/da-app.js',
            [],
            DECANO_VERSION,
            true
        );
    }

    // Inyectar configuración para React
    $config = [
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'restUrl' => rest_url(),
        'restNonce' => wp_create_nonce('wp_rest'),
        'apiUrl' => get_option('da_api_url', ''),
        'currentUser' => [
            'id' => get_current_user_id(),
            'name' => wp_get_current_user()->display_name,
            'email' => wp_get_current_user()->user_email,
            'isLoggedIn' => is_user_logged_in(),
            'plan' => is_user_logged_in() ? DA_Plan_Manager::get_user_plan(get_current_user_id()) : 'free'
        ],
        // ...
    ];

    wp_localize_script('decano-react-app', 'wpApiSettings', [
        'root' => rest_url(),
        'nonce' => wp_create_nonce('wp_rest')
    ]);
    wp_localize_script('decano-react-app', 'decanoSettings', $config);
}
```

---

### 2. Actualización de `main.tsx`

**Ubicación**: `wordpress/plugins/fraktal-reports/react-src/src/main.tsx`

#### Antes:
```typescript
import ReportGenerator from './components/ReportGeneration/ReportGenerator';
import UserDashboard from './components/UserDashboard/UserDashboard';
import PlanSelector from './components/PlanSelector/PlanSelector';

const components = {
  ReportGenerator,
  UserDashboard,
  PlanSelector
};
```

#### Después:
```typescript
import ReportGenerator from './components/ReportGeneration/ReportGenerator';
import UserDashboard from './components/UserDashboard/UserDashboard';
import PlanSelector from './components/PlanSelector/PlanSelector';

// Import Free Report Hook components
import { BirthDataForm as FreeReportForm } from './components/BirthDataForm/BirthDataForm';
import { FreeReportViewer } from './components/FreeReportViewer/FreeReportViewer';
import { UpgradeLanding } from './components/UpgradeLanding/UpgradeLanding';

const components = {
  ReportGenerator,
  UserDashboard,
  PlanSelector,
  FreeReportForm,      // ✅ NUEVO
  FreeReportViewer,    // ✅ NUEVO
  UpgradeLanding       // ✅ NUEVO
};
```

---

### 3. Creación de `UpgradeLanding.tsx`

**Ubicación**: `wordpress/plugins/fraktal-reports/react-src/src/components/UpgradeLanding/UpgradeLanding.tsx`

**Características del componente:**

- **Hero Section**: Con CTA para informe gratuito
- **Pricing Cards**:
  - Carta Natal Personal (49€)
  - Planificación 2026 (79€) - Marcado como "MÁS POPULAR"
- **Trust Section**: 4 características de confianza
- **FAQ Section**: Preguntas frecuentes
- **Final CTA**: Llamado a la acción final

**Props:**
```typescript
interface UpgradeLandingProps {
  showFreeCta?: string;      // "true" | "false"
  highlight?: string;         // ID del plan a destacar
}
```

**Ejemplo de uso:**
```php
[decano-upgrade-landing show_free_cta="true" highlight="revolucion_solar_2026"]
```

---

## 🔄 Build y Despliegue

### Comando ejecutado:
```bash
cd wordpress/plugins/fraktal-reports/react-src
npm run build
```

### Resultado del build:
```
✓ 1711 modules transformed
../public/build/index.html          0.45 kB │ gzip:  0.29 kB
../public/build/assets/index.css   34.12 kB │ gzip:  7.50 kB
../public/build/da-app.js          233.37 kB │ gzip: 72.51 kB
✓ built in 2.77s
```

### Cambios en el tamaño:
- **Antes**: da-app.js (213.56 kB)
- **Después**: da-app.js (233.37 kB) - +20 KB por el nuevo componente UpgradeLanding

---

## 📦 Plugin ZIP Actualizado

**Tamaño**: 0.21 MB (217,557 bytes)

**Archivos incluidos**:
- ✅ `public/build/da-app.js` (React bundle compilado)
- ✅ `public/build/assets/index-*.css` (Estilos compilados)
- ✅ `public/class-da-public.php` (Script loader actualizado)
- ✅ `react-src/src/main.tsx` (Registro de componentes)
- ✅ `react-src/src/components/UpgradeLanding/UpgradeLanding.tsx` (Nuevo componente)
- ✅ Todos los demás archivos del plugin

---

## 🧪 Cómo Probar

### 1. Instalar/Actualizar Plugin

```bash
# Opción A: Descargar desde GitHub
https://github.com/benetandujar72/Decano-astrologico/raw/main/wordpress/plugins/fraktal-reports.zip

# Opción B: Reinstalar en WordPress
WordPress Admin → Plugins → Desactivar "Decano Astrológico"
WordPress Admin → Plugins → Eliminar "Decano Astrológico"
WordPress Admin → Plugins → Añadir Nuevo → Subir Plugin
Seleccionar fraktal-reports.zip → Instalar → Activar
```

### 2. Verificar en Navegador

**Página**: `https://programafraktal.com/tu-informe-astrologico-gratuito/`

**Abrir DevTools (F12) y verificar:**

```javascript
// En la consola del navegador:

// 1. Verificar que el script React se cargó
document.querySelector('script[src*="da-app.js"]');
// Debe devolver: <script src=".../da-app.js"></script>

// 2. Verificar que el contenedor del componente existe
document.querySelector('[data-component="FreeReportForm"]');
// Debe devolver: <div id="decano-free-report-form" data-component="FreeReportForm"></div>

// 3. Verificar que no hay errores en la consola
// NO debe haber mensajes como: "Component FreeReportForm not found"

// 4. Verificar configuración inyectada
console.log(window.wpApiSettings);
console.log(window.decanoSettings);
// Debe devolver objetos con root, nonce, apiUrl, etc.
```

### 3. Testing Funcional

**Test del formulario Free:**
1. Ve a `/tu-informe-astrologico-gratuito/`
2. ✅ Debes ver el formulario de datos de nacimiento
3. ✅ Introduce "Barcelona" y "España" → Espera 1.5s
4. ✅ Debe autocompletar coordenadas: `41.3874, 2.1686`
5. ✅ Completa datos y genera informe

**Test del landing de upgrade:**
1. Ve a `/planes-premium/` (o crea página con `[decano-upgrade-landing]`)
2. ✅ Debes ver hero section con CTA gratis
3. ✅ Debes ver 2 cards de pricing (49€ y 79€)
4. ✅ Card "Planificación 2026" debe tener badge "MÁS POPULAR"
5. ✅ Scroll down → Ver secciones Trust y FAQ

---

## 🐛 Troubleshooting

### Problema: Todavía no veo el formulario

**Solución:**
1. Limpiar caché de WordPress (si usas plugin de caché)
2. Limpiar caché del navegador (Ctrl+Shift+R)
3. Verificar en DevTools que `da-app.js` se está cargando
4. Verificar que no hay errores JavaScript en la consola

### Problema: Error "Component not found in registry"

**Causa**: El componente no está importado en `main.tsx`

**Solución**: Ya está corregido en la última versión. Reinstalar el plugin.

### Problema: Los estilos no se aplican correctamente

**Solución:**
1. Verificar que el CSS se está cargando en DevTools → Network → Filtrar por CSS
2. Buscar archivos: `index-*.css`
3. Si no aparecen, verificar que existen en `public/build/assets/`

### Problema: Shortcode se muestra como texto plano `[decano-free-report-form]`

**Causa**: El shortcode no está registrado o hay un error de sintaxis

**Solución:**
1. Verificar que el plugin está activado
2. Verificar ortografía del shortcode (debe ser exactamente: `[decano-free-report-form]`)
3. No usar espacios extras o caracteres especiales

---

## 📋 Resumen de Commits

```bash
720972a fix(shortcodes): enable React components rendering for all shortcodes
6557686 feat(admin): add free report hook shortcodes to settings page
2e44622 chore(wordpress): final plugin ZIP update after build cleanup
b9e9bac docs: add WordPress plugin installation and testing guide
bbcb1d9 chore(wordpress): rebuild plugin with free report components and geocoding
```

---

## ✅ Checklist Final

- [x] Método `has_decano_shortcode()` creado
- [x] Detección de 8 shortcodes implementada
- [x] Carga de `da-app.js` implementada
- [x] Carga de CSS React implementada
- [x] `main.tsx` actualizado con 3 nuevos componentes
- [x] `UpgradeLanding.tsx` creado
- [x] React build ejecutado exitosamente
- [x] Plugin ZIP actualizado
- [x] Cambios commiteados y pusheados a GitHub
- [x] Documentación completa creada

---

## 🚀 Próximos Pasos

1. **Descargar e instalar** el plugin actualizado desde GitHub
2. **Limpiar cachés** de WordPress y navegador
3. **Probar** los 3 shortcodes en páginas de WordPress
4. **Verificar** que la geocodificación funciona correctamente
5. **Testear** el flujo completo: Form → Viewer → Landing → Checkout

---

**Última actualización**: 2026-01-12 18:45 CET

**Versión del plugin**: 1.0.0-free-hook-fixed

**Estado**: ✅ LISTO PARA PRODUCCIÓN
