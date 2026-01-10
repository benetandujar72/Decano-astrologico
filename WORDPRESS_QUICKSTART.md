# 🚀 Quick Start: Extensión WordPress - Fase 1

## 📋 Resumen

Este documento contiene los pasos inmediatos para comenzar con la **Fase 1: Fundamentos del Plugin**.

---

## ✅ Pre-requisitos

### Entorno de Desarrollo
```bash
# WordPress local
- WordPress 6.4+
- PHP 8.1+
- MySQL 8.0+
- WooCommerce 8.0+

# Herramientas
- Composer
- Node.js 18+
- npm o yarn
```

### Cuentas Necesarias
- [ ] Cuenta Stripe (test mode)
- [ ] Acceso al backend FastAPI
- [ ] Servidor WordPress de desarrollo

---

## 📁 Paso 1: Crear Estructura del Plugin

```bash
# Navegar al directorio de plugins de WordPress
cd /path/to/wordpress/wp-content/plugins/

# Crear directorio del plugin
mkdir decano-astrologico
cd decano-astrologico

# Crear estructura de archivos
mkdir -p includes admin public api woocommerce
mkdir -p admin/css admin/js
mkdir -p public/css public/js
mkdir -p languages

# Crear archivos principales
touch decano-astrologico.php
touch uninstall.php
touch README.txt
touch composer.json
```

---

## 📝 Paso 2: Archivo Principal del Plugin

Crear `decano-astrologico.php`:

```php
<?php
/**
 * Plugin Name:       Decano Astrológico
 * Plugin URI:        https://decano.com/wordpress
 * Description:       Sistema completo de generación de informes astrológicos personalizables con WooCommerce y Stripe.
 * Version:           1.0.0
 * Author:            Decano Team
 * Author URI:        https://decano.com
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       decano-astrologico
 * Domain Path:       /languages
 * Requires at least: 6.0
 * Requires PHP:      8.0
 */

// Si se accede directamente, salir
if (!defined('WPINC')) {
    die;
}

// Versión del plugin
define('DECANO_VERSION', '1.0.0');
define('DECANO_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('DECANO_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Activación del plugin
 */
function activate_decano() {
    require_once DECANO_PLUGIN_DIR . 'includes/class-da-activator.php';
    DA_Activator::activate();
}
register_activation_hook(__FILE__, 'activate_decano');

/**
 * Desactivación del plugin
 */
function deactivate_decano() {
    require_once DECANO_PLUGIN_DIR . 'includes/class-da-deactivator.php';
    DA_Deactivator::deactivate();
}
register_deactivation_hook(__FILE__, 'deactivate_decano');

/**
 * Cargar el plugin
 */
require DECANO_PLUGIN_DIR . 'includes/class-da-loader.php';

function run_decano() {
    $plugin = new DA_Loader();
    $plugin->run();
}
run_decano();
```

---

## 🔧 Paso 3: Clase de Activación

Crear `includes/class-da-activator.php`:

```php
<?php
class DA_Activator {

    public static function activate() {
        // Verificar requisitos
        self::check_requirements();

        // Crear tablas de base de datos
        self::create_tables();

        // Crear productos WooCommerce
        self::create_products();

        // Configuración inicial
        self::initial_setup();

        // Flush rewrite rules
        flush_rewrite_rules();
    }

    private static function check_requirements() {
        // Verificar PHP version
        if (version_compare(PHP_VERSION, '8.0', '<')) {
            deactivate_plugins(plugin_basename(__FILE__));
            wp_die('Este plugin requiere PHP 8.0 o superior.');
        }

        // Verificar WooCommerce
        if (!class_exists('WooCommerce')) {
            deactivate_plugins(plugin_basename(__FILE__));
            wp_die('Este plugin requiere WooCommerce instalado y activado.');
        }
    }

    private static function create_tables() {
        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();

        // Tabla de sesiones de informes
        $table_reports = $wpdb->prefix . 'da_report_sessions';
        $sql_reports = "CREATE TABLE IF NOT EXISTS $table_reports (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) NOT NULL,
            session_id varchar(255) NOT NULL,
            report_type varchar(50) NOT NULL,
            status varchar(50) NOT NULL,
            chart_data longtext,
            report_content longtext,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY user_id (user_id),
            KEY session_id (session_id)
        ) $charset_collate;";

        // Tabla de uso de planes
        $table_usage = $wpdb->prefix . 'da_plan_usage';
        $sql_usage = "CREATE TABLE IF NOT EXISTS $table_usage (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) NOT NULL,
            month_year varchar(7) NOT NULL,
            reports_count int(11) DEFAULT 0,
            plan_type varchar(50) NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY user_month (user_id, month_year)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql_reports);
        dbDelta($sql_usage);
    }

    private static function create_products() {
        // Solo crear si no existen
        if (get_option('da_products_created')) {
            return;
        }

        $products = [
            'free' => [
                'name' => 'Plan Gratuito - Decano Astrológico',
                'price' => 0,
                'description' => '1 informe resumido al mes',
                'short_description' => 'Perfecto para empezar con la astrología',
                'features' => [
                    'Carta natal básica',
                    '1 informe resumido al mes',
                    'Posiciones planetarias',
                    'Aspectos principales'
                ]
            ],
            'premium' => [
                'name' => 'Plan Premium - Decano Astrológico',
                'price' => 29.99,
                'description' => 'Informes ilimitados + plantillas personalizadas',
                'short_description' => 'Para usuarios avanzados',
                'features' => [
                    'Informes ilimitados',
                    'Informes completos',
                    'Plantillas personalizadas',
                    'Técnicas avanzadas',
                    'Exportación PDF/DOCX',
                    'Soporte prioritario'
                ]
            ],
            'enterprise' => [
                'name' => 'Plan Enterprise - Decano Astrológico',
                'price' => 99.99,
                'description' => 'Todo Premium + API + Soporte dedicado',
                'short_description' => 'Para profesionales y empresas',
                'features' => [
                    'Todo de Premium',
                    'Informes personalizados',
                    'API REST completa',
                    'Prompts personalizados',
                    'Soporte 24/7',
                    'Gestor de cuenta dedicado'
                ]
            ]
        ];

        foreach ($products as $plan_type => $product_data) {
            $product = new WC_Product_Subscription();

            $product->set_name($product_data['name']);
            $product->set_regular_price($product_data['price']);
            $product->set_description($product_data['description']);
            $product->set_short_description($product_data['short_description']);

            // Configurar como suscripción mensual
            if ($plan_type !== 'free') {
                update_post_meta($product->get_id(), '_subscription_price', $product_data['price']);
                update_post_meta($product->get_id(), '_subscription_period', 'month');
                update_post_meta($product->get_id(), '_subscription_period_interval', '1');
                update_post_meta($product->get_id(), '_subscription_length', '0');
            }

            // Guardar metadata del plan
            update_post_meta($product->get_id(), 'da_plan_type', $plan_type);
            update_post_meta($product->get_id(), 'da_features', $product_data['features']);

            $product_id = $product->save();

            // Guardar ID del producto en opciones
            update_option("da_product_{$plan_type}_id", $product_id);
        }

        update_option('da_products_created', true);
    }

    private static function initial_setup() {
        // Configuración por defecto
        $defaults = [
            'da_api_url' => '',
            'da_api_key' => '',
            'da_enable_limits' => true,
            'da_enable_cache' => true,
            'da_cache_duration' => 300,
        ];

        foreach ($defaults as $key => $value) {
            if (get_option($key) === false) {
                update_option($key, $value);
            }
        }
    }
}
```

---

## 🔌 Paso 4: Clase Loader

Crear `includes/class-da-loader.php`:

```php
<?php
class DA_Loader {

    public function __construct() {
        $this->load_dependencies();
        $this->define_admin_hooks();
        $this->define_public_hooks();
        $this->define_api_hooks();
    }

    private function load_dependencies() {
        // Cargar clases necesarias
        require_once DECANO_PLUGIN_DIR . 'admin/class-da-admin.php';
        require_once DECANO_PLUGIN_DIR . 'public/class-da-public.php';
        require_once DECANO_PLUGIN_DIR . 'api/class-da-api-bridge.php';
        require_once DECANO_PLUGIN_DIR . 'woocommerce/class-da-woo-integration.php';
    }

    private function define_admin_hooks() {
        $admin = new DA_Admin();

        add_action('admin_enqueue_scripts', [$admin, 'enqueue_styles']);
        add_action('admin_enqueue_scripts', [$admin, 'enqueue_scripts']);
        add_action('admin_menu', [$admin, 'add_admin_menu']);
    }

    private function define_public_hooks() {
        $public = new DA_Public();

        add_action('wp_enqueue_scripts', [$public, 'enqueue_styles']);
        add_action('wp_enqueue_scripts', [$public, 'enqueue_scripts']);

        // Shortcodes
        add_shortcode('decano-report-generator', [$public, 'report_generator_shortcode']);
        add_shortcode('decano-user-dashboard', [$public, 'user_dashboard_shortcode']);
        add_shortcode('decano-plans', [$public, 'plans_shortcode']);
    }

    private function define_api_hooks() {
        add_action('rest_api_init', 'da_register_api_routes');
    }

    public function run() {
        // El plugin está cargado y funcionando
    }
}

// Registrar rutas de la API REST
function da_register_api_routes() {
    require_once DECANO_PLUGIN_DIR . 'api/class-da-api-routes.php';
    $api_routes = new DA_API_Routes();
    $api_routes->register_routes();
}
```

---

## 🎨 Paso 5: Estructura Frontend React

```bash
# Crear directorio frontend
mkdir wp-frontend
cd wp-frontend

# Inicializar proyecto React con Vite
npm create vite@latest . -- --template react-ts

# Instalar dependencias
npm install
npm install -D tailwindcss postcss autoprefixer
npm install lucide-react react-query

# Configurar Tailwind
npx tailwindcss init -p
```

Configurar `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
        },
        indigo: {
          500: '#6366f1',
          400: '#818cf8',
        },
        amber: {
          500: '#f59e0b',
          400: '#fbbf24',
        }
      }
    },
  },
  plugins: [],
}
```

---

## 🔗 Paso 6: Configurar Build

Editar `wp-frontend/vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: '../public/build',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'da-app.js',
        assetFileNames: 'da-app.[ext]',
      }
    }
  }
})
```

---

## ✅ Checklist Fase 1

- [ ] Estructura de directorios creada
- [ ] `decano-astrologico.php` creado
- [ ] Clase `DA_Activator` implementada
- [ ] Clase `DA_Loader` implementada
- [ ] Tablas de BD configuradas
- [ ] Productos WooCommerce creados automáticamente
- [ ] Frontend React inicializado
- [ ] Tailwind CSS configurado
- [ ] Build configurado correctamente
- [ ] Plugin activable en WordPress

---

## 🚀 Próximos Pasos

Una vez completada la Fase 1:

1. **Fase 2**: Crear componentes React
   - WPReportGenerator
   - WPUserDashboard
   - WPPlanSelector

2. **Fase 3**: Integración WooCommerce + Stripe
   - Configurar webhooks
   - Control de límites
   - Modal de upgrade

---

## 📚 Recursos

- [WordPress Plugin Handbook](https://developer.wordpress.org/plugins/)
- [WooCommerce Developer Docs](https://woocommerce.github.io/code-reference/)
- [Stripe Documentation](https://stripe.com/docs)
- [React Documentation](https://react.dev/)

---

## 💬 Soporte

¿Preguntas sobre la implementación? Contacta al equipo de desarrollo.
