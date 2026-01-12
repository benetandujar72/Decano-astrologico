<?php
/**
 * Clase de gestión avanzada para administradores
 * Permite gestionar tipos de informe, plantillas, prompts y límites
 *
 * @package Decano_Astrologico
 * @since 1.1.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class DA_Admin_Management {

    /**
     * Obtener todos los tipos de informe desde el backend
     */
    public static function get_report_types() {
        $backend_url = get_option('da_api_url');
        if (empty($backend_url)) {
            return ['error' => 'Backend no configurado'];
        }

        $response = wp_remote_get($backend_url . '/report-types/', [
            'timeout' => 15
        ]);

        if (is_wp_error($response)) {
            return ['error' => $response->get_error_message()];
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        return $data ?: [];
    }

    /**
     * Obtener todas las plantillas desde el backend
     */
    public static function get_templates() {
        $backend_url = get_option('da_api_url');
        if (empty($backend_url)) {
            return ['error' => 'Backend no configurado'];
        }

        $response = wp_remote_get($backend_url . '/report-templates/', [
            'timeout' => 15
        ]);

        if (is_wp_error($response)) {
            return ['error' => $response->get_error_message()];
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        return $data ?: [];
    }

    /**
     * Obtener todos los prompts desde el backend
     */
    public static function get_prompts() {
        $backend_url = get_option('da_api_url');
        if (empty($backend_url)) {
            return ['error' => 'Backend no configurado'];
        }

        $response = wp_remote_get($backend_url . '/report-prompts/', [
            'timeout' => 15
        ]);

        if (is_wp_error($response)) {
            return ['error' => $response->get_error_message()];
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        return $data ?: [];
    }

    /**
     * Crear o actualizar tipo de informe
     */
    public static function save_report_type($data) {
        $backend_url = get_option('da_api_url');
        if (empty($backend_url)) {
            return ['error' => 'Backend no configurado'];
        }

        $method = isset($data['_id']) ? 'PUT' : 'POST';
        $url = $backend_url . '/report-types/';
        if ($method === 'PUT' && isset($data['type_id'])) {
            $url .= $data['type_id'];
        }

        $response = wp_remote_request($url, [
            'method' => $method,
            'headers' => [
                'Content-Type' => 'application/json'
            ],
            'body' => json_encode($data),
            'timeout' => 15
        ]);

        if (is_wp_error($response)) {
            return ['error' => $response->get_error_message()];
        }

        $body = wp_remote_retrieve_body($response);
        return json_decode($body, true);
    }

    /**
     * Eliminar tipo de informe
     */
    public static function delete_report_type($type_id) {
        $backend_url = get_option('da_api_url');
        if (empty($backend_url)) {
            return ['error' => 'Backend no configurado'];
        }

        $response = wp_remote_request($backend_url . '/report-types/' . $type_id, [
            'method' => 'DELETE',
            'timeout' => 15
        ]);

        if (is_wp_error($response)) {
            return ['error' => $response->get_error_message()];
        }

        return ['success' => true];
    }

    /**
     * Obtener límites configurados por tier
     */
    public static function get_tier_limits() {
        return [
            'free' => [
                'reports_per_month' => 1,
                'report_types' => ['gancho_free'],
                'features' => [
                    'geocoding' => true,
                    'save_profiles' => false,
                    'download_pdf' => false,
                    'custom_modules' => false
                ]
            ],
            'premium' => [
                'reports_per_month' => 10,
                'report_types' => ['carta_natal_completa', 'revolucion_solar', 'gancho_free'],
                'features' => [
                    'geocoding' => true,
                    'save_profiles' => true,
                    'download_pdf' => true,
                    'custom_modules' => true
                ]
            ],
            'enterprise' => [
                'reports_per_month' => -1, // Ilimitado
                'report_types' => ['all'],
                'features' => [
                    'geocoding' => true,
                    'save_profiles' => true,
                    'download_pdf' => true,
                    'custom_modules' => true,
                    'priority_support' => true,
                    'api_access' => true
                ]
            ]
        ];
    }

    /**
     * Actualizar límites de un tier
     */
    public static function update_tier_limits($tier, $limits) {
        // Guardar en options de WordPress
        $all_limits = self::get_tier_limits();
        $all_limits[$tier] = $limits;

        update_option('da_tier_limits', $all_limits);

        return ['success' => true, 'limits' => $limits];
    }

    /**
     * Obtener módulos disponibles
     */
    public static function get_available_modules() {
        return [
            'modulo_1_sol' => 'Sol - Identidad y Propósito',
            'modulo_2_mercurio' => 'Mercurio - Comunicación',
            'modulo_3_luna' => 'Luna - Emociones',
            'modulo_4_venus' => 'Venus - Amor y Valores',
            'modulo_5_marte' => 'Marte - Acción y Energía',
            'modulo_6_jupiter' => 'Júpiter - Expansión',
            'modulo_7_saturno' => 'Saturno - Estructura',
            'modulo_8_urano' => 'Urano - Cambio',
            'modulo_9_ascendente' => 'Ascendente - Primera Impresión',
            'modulo_10_nodos' => 'Nodos Lunares - Destino'
        ];
    }
}
