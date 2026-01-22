<?php
/**
 * Activador del plugin Decano Astrológico
 *
 * @package Decano_Astrologico
 * @since 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class DA_Activator {

    /**
     * Ejecutar al activar el plugin
     */
    public static function activate() {
        require_once DECANO_PLUGIN_DIR . 'includes/class-da-debug.php';
        DA_Debug::init();

        try {
            DA_Debug::log('=== INICIO DE ACTIVACIÓN DEL PLUGIN ===', 'info');

            DA_Debug::log('Verificando requisitos del sistema...', 'info');
            self::check_requirements();
            DA_Debug::log('Requisitos verificados correctamente', 'info');

            DA_Debug::log('Creando tablas de base de datos...', 'info');
            self::create_tables();
            DA_Debug::log('Tablas creadas correctamente', 'info');

            DA_Debug::log('Creando productos de suscripción...', 'info');
            self::create_subscription_products();
            DA_Debug::log('Productos creados correctamente', 'info');

            DA_Debug::log('Configuración inicial...', 'info');
            self::initial_setup();
            DA_Debug::log('Configuración inicial completada', 'info');

            DA_Debug::log('Creando páginas de WordPress...', 'info');
            self::create_pages();
            DA_Debug::log('Páginas creadas correctamente', 'info');

            flush_rewrite_rules();

            DA_Debug::log('=== ACTIVACIÓN COMPLETADA EXITOSAMENTE ===', 'info');

        } catch (Exception $e) {
            DA_Debug::log('ERROR DURANTE LA ACTIVACIÓN: ' . $e->getMessage(), 'error', [
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Verificar requisitos del sistema
     */
    private static function check_requirements() {
        // Verificar versión de PHP
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

    /**
     * Crear tablas en la base de datos
     */
    private static function create_tables() {
        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();

        DA_Debug::log('Charset/Collate: ' . $charset_collate, 'info');

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
            KEY session_id (session_id),
            KEY status (status)
        ) $charset_collate;";

        // Tabla de uso de planes
        $table_usage = $wpdb->prefix . 'da_plan_usage';
        $sql_usage = "CREATE TABLE IF NOT EXISTS $table_usage (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) NOT NULL,
            month_year varchar(7) NOT NULL,
            reports_count int(11) DEFAULT 0,
            plan_tier varchar(50) NOT NULL,
            last_reset datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY user_month (user_id, month_year),
            KEY plan_tier (plan_tier)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');

        DA_Debug::log('Ejecutando dbDelta para tabla de sesiones...', 'info');
        $result_reports = dbDelta($sql_reports);
        DA_Debug::log('Resultado tabla sesiones', 'info', $result_reports);

        DA_Debug::log('Ejecutando dbDelta para tabla de uso...', 'info');
        $result_usage = dbDelta($sql_usage);
        DA_Debug::log('Resultado tabla uso', 'info', $result_usage);

        // Verificar que las tablas se crearon
        if ($wpdb->get_var("SHOW TABLES LIKE '$table_reports'") == $table_reports) {
            DA_Debug::log('✓ Tabla de sesiones verificada', 'info');
        } else {
            DA_Debug::log('✗ Error: Tabla de sesiones NO se creó', 'error');
        }

        if ($wpdb->get_var("SHOW TABLES LIKE '$table_usage'") == $table_usage) {
            DA_Debug::log('✓ Tabla de uso verificada', 'info');
        } else {
            DA_Debug::log('✗ Error: Tabla de uso NO se creó', 'error');
        }
    }

    /**
     * Crear productos de suscripción en WooCommerce
     */
    private static function create_subscription_products() {
        // Solo crear si no existen
        if (get_option('da_products_created')) {
            DA_Debug::log('Productos ya fueron creados anteriormente, saltando...', 'info');
            return;
        }

        DA_Debug::log('Iniciando creación de productos WooCommerce', 'info');

        $products = [
            'free' => [
                'name' => 'Plan Gratuito - Decano Astrológico',
                'price' => 0,
                'billing_period' => 'month',
                'billing_interval' => 1,
                'description' => 'Perfecto para empezar con la astrología',
                'short_description' => '1 informe resumido al mes',
                'meta' => [
                    'plan_tier' => 'free',
                    'max_reports_per_month' => 1,
                    'report_types' => ['carta_natal_resumida'],
                    'can_use_templates' => false,
                    'max_templates' => 0,
                    'features' => [
                        '1 informe resumido/mes',
                        'Carta natal básica',
                        'Posiciones planetarias',
                        'Aspectos principales'
                    ]
                ]
            ],
            'premium' => [
                'name' => 'Plan Premium - Decano Astrológico',
                'price' => 29.99,
                'billing_period' => 'month',
                'billing_interval' => 1,
                'description' => 'Para usuarios avanzados que necesitan análisis profundos',
                'short_description' => 'Informes ilimitados + plantillas personalizadas',
                'meta' => [
                    'plan_tier' => 'premium',
                    'max_reports_per_month' => -1, // Ilimitado
                    'report_types' => ['all'], // Todos menos enterprise
                    'can_use_templates' => true,
                    'max_templates' => 5,
                    'features' => [
                        'Informes ilimitados',
                        'Informes completos',
                        'Plantillas personalizadas (5 máx)',
                        'Técnicas avanzadas',
                        'Exportación PDF/DOCX',
                        'Soporte prioritario'
                    ]
                ]
            ],
            'enterprise' => [
                'name' => 'Plan Enterprise - Decano Astrológico',
                'price' => 99.99,
                'billing_period' => 'month',
                'billing_interval' => 1,
                'description' => 'Para profesionales y empresas que requieren funcionalidades avanzadas',
                'short_description' => 'Todo Premium + API + Soporte dedicado',
                'meta' => [
                    'plan_tier' => 'enterprise',
                    'max_reports_per_month' => -1,
                    'report_types' => ['all'],
                    'can_use_templates' => true,
                    'max_templates' => -1, // Ilimitado
                    'can_use_advanced_css' => true,
                    'features' => [
                        'Todo de Premium',
                        'Informes personalizados',
                        'API REST completa',
                        'Prompts personalizados',
                        'Soporte 24/7',
                        'Gestor de cuenta dedicado',
                        'Plantillas ilimitadas',
                        'CSS personalizado'
                    ]
                ]
            ]
        ];

        foreach ($products as $tier => $data) {
            DA_Debug::log("Creando producto: $tier - {$data['name']}", 'info');

            try {
                // Crear productos simples para todos los planes
                // NOTA: Si en el futuro quieres usar WooCommerce Subscriptions,
                // descomenta el código antiguo y cambia esto
                DA_Debug::log("Creando producto simple para plan $tier", 'info');
                $product = new WC_Product_Simple();
                $product->set_name($data['name']);
                $product->set_regular_price($data['price']);
                $product->set_virtual(true);

                // Añadir nota sobre la duración en la descripción para planes de pago
                if ($tier !== 'free') {
                    $billing_text = $data['billing_period'] === 'month' ? 'mensual' : 'anual';
                    $period_note = "\n\n<strong>Duración:</strong> Acceso " . $billing_text . " al plan. La renovación debe realizarse manualmente cada mes.";
                    $product->set_description($data['description'] . $period_note);
                    $product->set_short_description($data['short_description'] . ' (Acceso ' . $billing_text . ')');
                } else {
                    $product->set_description($data['description']);
                    $product->set_short_description($data['short_description']);
                }
                $product->set_status('publish');
                $product->set_catalog_visibility('visible');

                // Guardar metadata del plan
                DA_Debug::log("Guardando metadata del plan", 'info');
                foreach ($data['meta'] as $key => $value) {
                    $product->update_meta_data('da_' . $key, $value);
                }

                DA_Debug::log("Guardando producto en base de datos...", 'info');
                $product_id = $product->save();

                // Guardar ID del producto en opciones
                update_option("da_product_{$tier}_id", $product_id);

                DA_Debug::log("✓ Producto creado exitosamente: {$data['name']} (ID: {$product_id})", 'info');

            } catch (Exception $e) {
                DA_Debug::log("✗ ERROR al crear producto $tier: " . $e->getMessage(), 'error', [
                    'trace' => $e->getTraceAsString()
                ]);
            }
        }

        update_option('da_products_created', true);
        DA_Debug::log('Marca de productos creados establecida', 'info');
    }

    /**
     * Configuración inicial del plugin
     * NOTA: Ya no se usan da_api_url, da_api_key, da_hmac_secret
     * La configuración de Supabase está en constantes en fraktal-reports.php
     */
    private static function initial_setup() {
        // Configuración por defecto (solo opciones internas, no de backend)
        $defaults = [
            'da_enable_limits' => true,
            'da_enable_cache' => true,
            'da_cache_duration' => 300,
            'da_version' => DECANO_VERSION
        ];

        foreach ($defaults as $key => $value) {
            if (get_option($key) === false) {
                update_option($key, $value);
            }
        }

        // Limpiar opciones legacy si existen (migración)
        $legacy_options = ['da_api_url', 'da_api_key', 'da_hmac_secret', 'da_backend_jwt_token', 'da_backend_jwt_expiry'];
        foreach ($legacy_options as $option) {
            if (get_option($option) !== false) {
                delete_option($option);
                DA_Debug::log("Opción legacy eliminada: $option", 'info');
            }
        }
    }

    /**
     * Crear páginas de WordPress necesarias para el plugin
     */
    private static function create_pages() {
        // Solo crear si no se han creado antes
        if (get_option('da_pages_created')) {
            DA_Debug::log('Páginas ya fueron creadas anteriormente, saltando...', 'info');
            return;
        }

        require_once DECANO_PLUGIN_DIR . 'includes/class-da-page-setup.php';

        $results = DA_Page_Setup::create_all_pages();

        DA_Debug::log('Resultado de creación de páginas', 'info', [
            'created' => count($results['created']),
            'existing' => count($results['existing']),
            'errors' => count($results['errors'])
        ]);

        if (!empty($results['created'])) {
            foreach ($results['created'] as $key => $page_id) {
                DA_Debug::log("✓ Página '$key' creada (ID: $page_id)", 'info');
            }
        }

        if (!empty($results['existing'])) {
            foreach ($results['existing'] as $key => $page_id) {
                DA_Debug::log("→ Página '$key' ya existía (ID: $page_id)", 'info');
            }
        }

        if (!empty($results['errors'])) {
            foreach ($results['errors'] as $key => $error) {
                DA_Debug::log("✗ Error creando página '$key': $error", 'error');
            }
        }

        update_option('da_pages_created', true);
        DA_Debug::log('Marca de páginas creadas establecida', 'info');
    }
}
