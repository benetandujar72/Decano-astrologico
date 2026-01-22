<?php
/**
 * Sistema de Debug para Decano Astrológico
 *
 * @package Decano_Astrologico
 * @since 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class DA_Debug {

    /**
     * Archivo de log
     */
    private static $log_file = null;

    /**
     * Inicializar el sistema de debug
     */
    public static function init() {
        $upload_dir = wp_upload_dir();
        self::$log_file = $upload_dir['basedir'] . '/decano-debug.log';
    }

    /**
     * Registrar un mensaje de debug
     *
     * @param string $message Mensaje a registrar
     * @param string $level Nivel (info, warning, error)
     * @param array $context Contexto adicional
     */
    public static function log($message, $level = 'info', $context = []) {
        if (self::$log_file === null) {
            self::init();
        }

        $timestamp = date('Y-m-d H:i:s');
        $log_entry = sprintf(
            "[%s] [%s] %s\n",
            $timestamp,
            strtoupper($level),
            $message
        );

        if (!empty($context)) {
            $log_entry .= "Context: " . print_r($context, true) . "\n";
        }

        $log_entry .= "---\n";

        // Escribir al archivo
        error_log($log_entry, 3, self::$log_file);

        // También al error_log de PHP si es error
        if ($level === 'error') {
            error_log("Decano Astrológico - $message");
        }
    }

    /**
     * Obtener las últimas líneas del log
     *
     * @param int $lines Número de líneas
     * @return array Líneas del log
     */
    public static function get_log_lines($lines = 100) {
        if (self::$log_file === null) {
            self::init();
        }

        if (!file_exists(self::$log_file)) {
            return ['No hay logs disponibles.'];
        }

        $file = file(self::$log_file);
        if ($file === false) {
            return ['Error al leer el archivo de log.'];
        }

        return array_slice($file, -$lines);
    }

    /**
     * Limpiar el log
     */
    public static function clear_log() {
        if (self::$log_file === null) {
            self::init();
        }

        if (file_exists(self::$log_file)) {
            unlink(self::$log_file);
        }

        self::log('Log limpiado', 'info');
    }

    /**
     * Verificar el sistema completo
     *
     * @return array Resultado de las verificaciones
     */
    public static function system_check() {
        $checks = [];

        // 1. Verificar PHP
        $checks['php'] = [
            'version' => phpversion(),
            'required' => '8.1',
            'status' => version_compare(phpversion(), '8.1', '>=') ? 'OK' : 'FAIL',
            'memory_limit' => ini_get('memory_limit'),
            'max_execution_time' => ini_get('max_execution_time')
        ];

        // 2. Verificar WordPress
        global $wp_version;
        $checks['wordpress'] = [
            'version' => $wp_version,
            'required' => '6.0',
            'status' => version_compare($wp_version, '6.0', '>=') ? 'OK' : 'FAIL'
        ];

        // 3. Verificar WooCommerce
        if (class_exists('WooCommerce')) {
            $woo_version = WC()->version;
            $checks['woocommerce'] = [
                'installed' => true,
                'version' => $woo_version,
                'required' => '8.0',
                'status' => version_compare($woo_version, '8.0', '>=') ? 'OK' : 'FAIL'
            ];
        } else {
            $checks['woocommerce'] = [
                'installed' => false,
                'status' => 'FAIL',
                'message' => 'WooCommerce no está instalado'
            ];
        }

        // 4. Verificar WooCommerce Subscriptions
        if (class_exists('WC_Subscriptions')) {
            $checks['woocommerce_subscriptions'] = [
                'installed' => true,
                'version' => WC_Subscriptions::$version ?? 'desconocida',
                'status' => 'OK'
            ];
        } else {
            $checks['woocommerce_subscriptions'] = [
                'installed' => false,
                'status' => 'FAIL',
                'message' => 'WooCommerce Subscriptions no está instalado'
            ];
        }

        // 5. Verificar tablas de base de datos
        global $wpdb;
        $sessions_table = $wpdb->prefix . 'da_report_sessions';
        $usage_table = $wpdb->prefix . 'da_plan_usage';

        $checks['database'] = [
            'sessions_table' => $wpdb->get_var("SHOW TABLES LIKE '$sessions_table'") == $sessions_table ? 'OK' : 'FAIL',
            'usage_table' => $wpdb->get_var("SHOW TABLES LIKE '$usage_table'") == $usage_table ? 'OK' : 'FAIL'
        ];

        // 6. Verificar productos
        $checks['products'] = [
            'free' => get_option('da_product_free_id') ? 'OK' : 'MISSING',
            'premium' => get_option('da_product_premium_id') ? 'OK' : 'MISSING',
            'enterprise' => get_option('da_product_enterprise_id') ? 'OK' : 'MISSING'
        ];

        // 7. Verificar configuración de Supabase
        $checks['configuration'] = [
            'supabase_url' => defined('FRAKTAL_SUPABASE_URL') && FRAKTAL_SUPABASE_URL ? 'OK' : 'MISSING',
            'supabase_anon_key' => defined('FRAKTAL_SUPABASE_ANON_KEY') && FRAKTAL_SUPABASE_ANON_KEY ? 'OK' : 'MISSING',
            'supabase_service_key' => defined('FRAKTAL_SUPABASE_SERVICE_KEY') && FRAKTAL_SUPABASE_SERVICE_KEY ? 'OK' : 'MISSING',
            'use_supabase' => defined('FRAKTAL_USE_SUPABASE') && FRAKTAL_USE_SUPABASE ? 'ENABLED' : 'DISABLED'
        ];

        // 8. Verificar archivos React
        $react_js = DECANO_PLUGIN_DIR . 'public/build/da-app.js';
        $react_css = DECANO_PLUGIN_DIR . 'public/build/da-app.css';

        $checks['react_build'] = [
            'js_file' => file_exists($react_js) ? 'OK' : 'MISSING',
            'css_file' => file_exists($react_css) ? 'OK' : 'MISSING',
            'js_size' => file_exists($react_js) ? filesize($react_js) . ' bytes' : 'N/A',
            'css_size' => file_exists($react_css) ? filesize($react_css) . ' bytes' : 'N/A'
        ];

        // 9. Verificar DOMPDF para generación de PDFs
        if ( class_exists( 'Fraktal_PDF_Autoloader' ) ) {
            $pdf_info = Fraktal_PDF_Autoloader::get_diagnostic_info();
            $checks['dompdf'] = [
                'available' => $pdf_info['available'] ? 'OK' : 'MISSING',
                'load_method' => $pdf_info['load_method'] ?: 'none',
                'composer_exists' => $pdf_info['composer_path']['exists'] ? 'YES' : 'NO',
                'bundled_exists' => $pdf_info['bundled_path']['exists'] ? 'YES' : 'NO',
                'lib_writable' => $pdf_info['lib_writable'] ? 'YES' : 'NO',
            ];
        } else {
            $checks['dompdf'] = [
                'available' => 'UNKNOWN',
                'message' => 'PDF Autoloader no disponible'
            ];
        }

        // 10. Verificar clases requeridas
        // Algunas clases solo se cargan bajo condiciones específicas, así que las cargamos aquí
        $class_files = [
            'DA_Activator' => DECANO_PLUGIN_DIR . 'includes/class-da-activator.php',
            'DA_Plan_Manager' => DECANO_PLUGIN_DIR . 'includes/class-da-plan-manager.php',
            'DA_Limits' => DECANO_PLUGIN_DIR . 'includes/class-da-limits.php',
            'DA_Admin' => DECANO_PLUGIN_DIR . 'admin/class-da-admin.php',
            'DA_Public' => DECANO_PLUGIN_DIR . 'public/class-da-public.php',
            'DA_Shortcodes' => DECANO_PLUGIN_DIR . 'public/class-da-shortcodes.php'
        ];

        $checks['classes'] = [];
        foreach ($class_files as $class => $file) {
            // Primero verificar si el archivo existe
            if (!file_exists($file)) {
                $checks['classes'][$class] = 'FILE_MISSING';
                continue;
            }

            // Cargar el archivo si la clase no está ya cargada
            if (!class_exists($class)) {
                require_once $file;
            }

            // Verificar si la clase existe después de cargar
            $checks['classes'][$class] = class_exists($class) ? 'OK' : 'MISSING';
        }

        return $checks;
    }

    /**
     * Obtener información del entorno
     */
    public static function get_environment_info() {
        global $wpdb;

        return [
            'php_version' => phpversion(),
            'wp_version' => get_bloginfo('version'),
            'wp_memory_limit' => WP_MEMORY_LIMIT,
            'wp_debug' => defined('WP_DEBUG') && WP_DEBUG,
            'wp_debug_log' => defined('WP_DEBUG_LOG') && WP_DEBUG_LOG,
            'db_version' => $wpdb->db_version(),
            'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
            'plugin_version' => DECANO_VERSION,
            'plugin_dir' => DECANO_PLUGIN_DIR,
            'upload_dir' => wp_upload_dir()['basedir']
        ];
    }

    /**
     * Test de conexión a Supabase
     *
     * @return array Resultado del test
     */
    public static function test_backend_connection() {
        $result = [
            'tests' => [],
            'status' => 'success'
        ];

        // Verificar configuración
        if (!defined('FRAKTAL_SUPABASE_URL') || empty(FRAKTAL_SUPABASE_URL)) {
            return [
                'status' => 'error',
                'message' => 'Supabase URL no configurada',
                'tests' => []
            ];
        }

        if (!defined('FRAKTAL_SUPABASE_ANON_KEY') || empty(FRAKTAL_SUPABASE_ANON_KEY)) {
            return [
                'status' => 'error',
                'message' => 'Supabase Anon Key no configurada',
                'tests' => []
            ];
        }

        $supabase_url = FRAKTAL_SUPABASE_URL;
        $anon_key = FRAKTAL_SUPABASE_ANON_KEY;

        // Test 1: Conexión básica a Supabase REST API
        self::log('Iniciando test de conexión a Supabase...', 'info');

        $response = wp_remote_get($supabase_url . '/rest/v1/', [
            'headers' => [
                'apikey' => $anon_key,
                'Authorization' => 'Bearer ' . $anon_key
            ],
            'timeout' => 15
        ]);

        if (is_wp_error($response)) {
            $result['tests']['rest_api'] = [
                'status' => 'error',
                'message' => 'Error de conexión: ' . $response->get_error_message()
            ];
            $result['status'] = 'error';
            self::log('Error de conexión REST API: ' . $response->get_error_message(), 'error');
        } else {
            $status_code = wp_remote_retrieve_response_code($response);
            $result['tests']['rest_api'] = [
                'status' => $status_code >= 200 && $status_code < 300 ? 'success' : 'error',
                'status_code' => $status_code,
                'message' => $status_code >= 200 && $status_code < 300 ? 'Conexión REST API OK' : 'Error HTTP ' . $status_code
            ];
            if ($status_code >= 400) {
                $result['status'] = 'error';
            }
            self::log('REST API response: HTTP ' . $status_code, 'info');
        }

        // Test 2: Verificar que podemos consultar la tabla profiles
        $response = wp_remote_get($supabase_url . '/rest/v1/profiles?select=count&limit=1', [
            'headers' => [
                'apikey' => $anon_key,
                'Authorization' => 'Bearer ' . $anon_key,
                'Prefer' => 'count=exact'
            ],
            'timeout' => 15
        ]);

        if (is_wp_error($response)) {
            $result['tests']['profiles_table'] = [
                'status' => 'warning',
                'message' => 'No se pudo verificar tabla profiles: ' . $response->get_error_message()
            ];
        } else {
            $status_code = wp_remote_retrieve_response_code($response);
            $result['tests']['profiles_table'] = [
                'status' => $status_code >= 200 && $status_code < 300 ? 'success' : 'warning',
                'status_code' => $status_code,
                'message' => $status_code >= 200 && $status_code < 300 ? 'Tabla profiles accesible' : 'Tabla profiles no accesible (HTTP ' . $status_code . ')'
            ];
        }

        // Test 3: Verificar Edge Functions (si hay service key)
        if (defined('FRAKTAL_SUPABASE_SERVICE_KEY') && !empty(FRAKTAL_SUPABASE_SERVICE_KEY)) {
            $result['tests']['service_key'] = [
                'status' => 'success',
                'message' => 'Service Key configurada'
            ];

            // Test Edge Function health check
            $response = wp_remote_post($supabase_url . '/functions/v1/calculate-chart', [
                'headers' => [
                    'Content-Type' => 'application/json',
                    'Authorization' => 'Bearer ' . FRAKTAL_SUPABASE_SERVICE_KEY
                ],
                'body' => json_encode(['health_check' => true]),
                'timeout' => 15
            ]);

            if (is_wp_error($response)) {
                $result['tests']['edge_functions'] = [
                    'status' => 'warning',
                    'message' => 'No se pudo verificar Edge Functions: ' . $response->get_error_message()
                ];
            } else {
                $status_code = wp_remote_retrieve_response_code($response);
                // 400 puede ser esperado si la función rechaza health_check
                $result['tests']['edge_functions'] = [
                    'status' => $status_code < 500 ? 'success' : 'error',
                    'status_code' => $status_code,
                    'message' => $status_code < 500 ? 'Edge Functions accesibles' : 'Error en Edge Functions (HTTP ' . $status_code . ')'
                ];
            }
        } else {
            $result['tests']['service_key'] = [
                'status' => 'warning',
                'message' => 'Service Key no configurada - algunas funciones pueden no estar disponibles'
            ];
        }

        // Test 4: Verificar Storage
        $response = wp_remote_get($supabase_url . '/storage/v1/bucket', [
            'headers' => [
                'apikey' => $anon_key,
                'Authorization' => 'Bearer ' . $anon_key
            ],
            'timeout' => 15
        ]);

        if (is_wp_error($response)) {
            $result['tests']['storage'] = [
                'status' => 'warning',
                'message' => 'No se pudo verificar Storage: ' . $response->get_error_message()
            ];
        } else {
            $status_code = wp_remote_retrieve_response_code($response);
            $result['tests']['storage'] = [
                'status' => $status_code < 500 ? 'success' : 'error',
                'status_code' => $status_code,
                'message' => $status_code < 500 ? 'Storage accesible' : 'Error en Storage (HTTP ' . $status_code . ')'
            ];
        }

        self::log('Test de conexión completado: ' . $result['status'], 'info', $result['tests']);

        return $result;
    }
}
