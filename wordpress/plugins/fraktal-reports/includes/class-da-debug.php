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

        // 7. Verificar configuración
        $checks['configuration'] = [
            'api_url' => get_option('da_api_url') ? 'OK' : 'MISSING',
            'hmac_secret' => get_option('da_hmac_secret') ? 'OK' : 'MISSING'
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

        // 9. Verificar clases requeridas
        $required_classes = [
            'DA_Activator',
            'DA_Plan_Manager',
            'DA_Limits',
            'DA_Admin',
            'DA_Public',
            'DA_Shortcodes'
        ];

        $checks['classes'] = [];
        foreach ($required_classes as $class) {
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
     * Test de conexión al backend
     *
     * @return array Resultado del test
     */
    public static function test_backend_connection() {
        $api_url = get_option('da_api_url');
        $hmac_secret = get_option('da_hmac_secret');

        if (empty($api_url)) {
            return [
                'status' => 'error',
                'message' => 'Backend API URL no configurada'
            ];
        }

        // Test 1: Ping básico
        $response = wp_remote_get($api_url . '/health', [
            'timeout' => 10
        ]);

        if (is_wp_error($response)) {
            return [
                'status' => 'error',
                'message' => 'Error al conectar con el backend: ' . $response->get_error_message()
            ];
        }

        $status_code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);

        $result = [
            'status' => $status_code == 200 ? 'success' : 'error',
            'status_code' => $status_code,
            'response_body' => $body
        ];

        // Test 2: Verificar autenticación HMAC
        if (!empty($hmac_secret)) {
            $test_payload = ['test' => true];
            $test_response = self::test_hmac_request($api_url, $hmac_secret, $test_payload);
            $result['hmac_test'] = $test_response;
        }

        return $result;
    }

    /**
     * Test de autenticación HMAC
     */
    private static function test_hmac_request($api_url, $secret, $payload) {
        $timestamp = time();
        $json_payload = json_encode($payload);

        $signature_base = $json_payload . $timestamp;
        $signature = hash_hmac('sha256', $signature_base, $secret);

        $response = wp_remote_post($api_url . '/api/test', [
            'headers' => [
                'Content-Type' => 'application/json',
                'X-WP-Signature' => $signature,
                'X-WP-Timestamp' => $timestamp
            ],
            'body' => $json_payload,
            'timeout' => 10
        ]);

        if (is_wp_error($response)) {
            return [
                'status' => 'error',
                'message' => $response->get_error_message()
            ];
        }

        return [
            'status' => 'success',
            'status_code' => wp_remote_retrieve_response_code($response),
            'response' => wp_remote_retrieve_body($response)
        ];
    }
}
