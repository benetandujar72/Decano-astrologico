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
        self::check_requirements();
        self::create_tables();
        self::create_subscription_products();
        self::initial_setup();
        flush_rewrite_rules();
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
        dbDelta($sql_reports);
        dbDelta($sql_usage);
    }

    /**
     * Crear productos de suscripción en WooCommerce
     */
    private static function create_subscription_products() {
        // Solo crear si no existen
        if (get_option('da_products_created')) {
            return;
        }

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
            // Para el plan Free, crear producto simple (no requiere suscripción)
            if ($tier === 'free') {
                $product = new WC_Product_Simple();
                $product->set_name($data['name']);
                $product->set_regular_price($data['price']);
                $product->set_virtual(true);
            } else {
                // Para Premium y Enterprise, crear productos de suscripción
                if (!class_exists('WC_Subscriptions_Product')) {
                    error_log('WooCommerce Subscriptions no está instalado');
                    continue;
                }

                $product = new WC_Product_Subscription();
                $product->set_name($data['name']);
                $product->set_regular_price($data['price']);
                $product->set_virtual(true);

                // Configurar suscripción
                $product->update_meta_data('_subscription_price', $data['price']);
                $product->update_meta_data('_subscription_period', $data['billing_period']);
                $product->update_meta_data('_subscription_period_interval', $data['billing_interval']);
                $product->update_meta_data('_subscription_length', 0); // Hasta cancelar
            }

            $product->set_description($data['description']);
            $product->set_short_description($data['short_description']);
            $product->set_status('publish');
            $product->set_catalog_visibility('visible');

            // Guardar metadata del plan
            foreach ($data['meta'] as $key => $value) {
                $product->update_meta_data('da_' . $key, $value);
            }

            $product_id = $product->save();

            // Guardar ID del producto en opciones
            update_option("da_product_{$tier}_id", $product_id);

            error_log("Producto creado: {$data['name']} (ID: {$product_id})");
        }

        update_option('da_products_created', true);
    }

    /**
     * Configuración inicial del plugin
     */
    private static function initial_setup() {
        // Configuración por defecto
        $defaults = [
            'da_api_url' => '',
            'da_api_key' => '',
            'da_hmac_secret' => '',
            'da_enable_limits' => true,
            'da_enable_cache' => true,
            'da_cache_duration' => 300,
            'da_version' => '1.0.0'
        ];

        foreach ($defaults as $key => $value) {
            if (get_option($key) === false) {
                update_option($key, $value);
            }
        }
    }
}
