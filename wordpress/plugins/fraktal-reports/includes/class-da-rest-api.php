<?php
/**
 * REST API endpoints del plugin
 * Proxy a endpoints del backend de Python
 *
 * @package Decano_Astrologico
 * @since 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class DA_REST_API {

    /**
     * Registrar los endpoints REST
     */
    public static function register_routes() {
        // Endpoint de geocodificación
        register_rest_route('decano/v1', '/geocode', [
            'methods' => 'POST',
            'callback' => [__CLASS__, 'geocode_location'],
            'permission_callback' => [__CLASS__, 'check_user_logged_in'],
            'args' => [
                'city' => [
                    'required' => true,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field'
                ],
                'country' => [
                    'required' => true,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field'
                ],
                'state' => [
                    'required' => false,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field'
                ]
            ]
        ]);

        // Endpoint de geocodificación inversa
        register_rest_route('decano/v1', '/geocode/reverse', [
            'methods' => 'GET',
            'callback' => [__CLASS__, 'reverse_geocode'],
            'permission_callback' => [__CLASS__, 'check_user_logged_in'],
            'args' => [
                'lat' => [
                    'required' => true,
                    'type' => 'number',
                    'validate_callback' => function($param) {
                        return is_numeric($param) && $param >= -90 && $param <= 90;
                    }
                ],
                'lon' => [
                    'required' => true,
                    'type' => 'number',
                    'validate_callback' => function($param) {
                        return is_numeric($param) && $param >= -180 && $param <= 180;
                    }
                ]
            ]
        ]);

        // Endpoint para verificar plan del usuario
        register_rest_route('decano/v1', '/user/plan', [
            'methods' => 'GET',
            'callback' => [__CLASS__, 'get_user_plan'],
            'permission_callback' => [__CLASS__, 'check_user_logged_in']
        ]);

        // Endpoint para verificar límites de informes
        register_rest_route('decano/v1', '/user/limits', [
            'methods' => 'GET',
            'callback' => [__CLASS__, 'get_user_limits'],
            'permission_callback' => [__CLASS__, 'check_user_logged_in']
        ]);
    }

    /**
     * Verificar que el usuario esté logueado
     */
    public static function check_user_logged_in($request) {
        return is_user_logged_in();
    }

    /**
     * Geocodificar ubicación (ciudad → coordenadas)
     */
    public static function geocode_location($request) {
        $city = $request->get_param('city');
        $country = $request->get_param('country');
        $state = $request->get_param('state');

        if (empty($city) || empty($country)) {
            return new WP_Error(
                'missing_params',
                'Ciudad y país son obligatorios',
                ['status' => 400]
            );
        }

        // Obtener backend URL desde settings
        $backend_url = get_option('da_api_url');
        if (empty($backend_url)) {
            return new WP_Error(
                'backend_not_configured',
                'El backend no está configurado correctamente',
                ['status' => 500]
            );
        }

        // Obtener token de autorización
        $user_id = get_current_user_id();
        $token = self::get_or_create_user_token($user_id);

        if (!$token) {
            return new WP_Error(
                'auth_error',
                'No se pudo obtener token de autorización',
                ['status' => 401]
            );
        }

        // Preparar datos para enviar al backend
        $data = [
            'city' => $city,
            'country' => $country
        ];

        if (!empty($state)) {
            $data['state'] = $state;
        }

        // Llamar al backend de Python
        $response = wp_remote_post($backend_url . '/geocoding/geocode', [
            'headers' => [
                'Content-Type' => 'application/json',
                'Authorization' => 'Bearer ' . $token
            ],
            'body' => json_encode($data),
            'timeout' => 15
        ]);

        if (is_wp_error($response)) {
            DA_Debug::log('Error en geocodificación: ' . $response->get_error_message(), 'error');
            return new WP_Error(
                'geocode_error',
                'Error al contactar el servicio de geocodificación: ' . $response->get_error_message(),
                ['status' => 502]
            );
        }

        $response_code = wp_remote_retrieve_response_code($response);
        $response_body = wp_remote_retrieve_body($response);

        if ($response_code !== 200) {
            $error_data = json_decode($response_body, true);
            $error_message = isset($error_data['detail']) ? $error_data['detail'] : 'Error desconocido';

            DA_Debug::log("Error geocodificación (HTTP $response_code): $error_message", 'error');

            return new WP_Error(
                'geocode_failed',
                $error_message,
                ['status' => $response_code]
            );
        }

        $result = json_decode($response_body, true);

        if (!$result) {
            return new WP_Error(
                'invalid_response',
                'Respuesta inválida del servicio de geocodificación',
                ['status' => 502]
            );
        }

        DA_Debug::log("Geocodificación exitosa: $city, $country → {$result['latitude']}, {$result['longitude']}", 'info');

        return rest_ensure_response($result);
    }

    /**
     * Geocodificación inversa (coordenadas → ciudad)
     */
    public static function reverse_geocode($request) {
        $lat = $request->get_param('lat');
        $lon = $request->get_param('lon');

        $backend_url = get_option('da_api_url');
        if (empty($backend_url)) {
            return new WP_Error('backend_not_configured', 'Backend no configurado', ['status' => 500]);
        }

        $user_id = get_current_user_id();
        $token = self::get_or_create_user_token($user_id);

        if (!$token) {
            return new WP_Error('auth_error', 'No se pudo obtener token', ['status' => 401]);
        }

        $url = add_query_arg([
            'lat' => $lat,
            'lon' => $lon
        ], $backend_url . '/geocoding/reverse');

        $response = wp_remote_get($url, [
            'headers' => [
                'Authorization' => 'Bearer ' . $token
            ],
            'timeout' => 15
        ]);

        if (is_wp_error($response)) {
            return new WP_Error('geocode_error', $response->get_error_message(), ['status' => 502]);
        }

        $response_code = wp_remote_retrieve_response_code($response);
        $response_body = wp_remote_retrieve_body($response);

        if ($response_code !== 200) {
            $error_data = json_decode($response_body, true);
            $error_message = isset($error_data['detail']) ? $error_data['detail'] : 'Error desconocido';
            return new WP_Error('geocode_failed', $error_message, ['status' => $response_code]);
        }

        $result = json_decode($response_body, true);

        if (!$result) {
            return new WP_Error('invalid_response', 'Respuesta inválida', ['status' => 502]);
        }

        return rest_ensure_response($result);
    }

    /**
     * Obtener plan actual del usuario
     */
    public static function get_user_plan($request) {
        $user_id = get_current_user_id();

        if (!$user_id) {
            return new WP_Error('not_logged_in', 'Usuario no autenticado', ['status' => 401]);
        }

        $plan_manager = new DA_Plan_Manager();
        $tier = $plan_manager->get_user_tier($user_id);
        $limits = $plan_manager->get_tier_limits($tier);

        return rest_ensure_response([
            'user_id' => $user_id,
            'tier' => $tier,
            'limits' => $limits
        ]);
    }

    /**
     * Obtener límites de uso del usuario
     */
    public static function get_user_limits($request) {
        $user_id = get_current_user_id();

        if (!$user_id) {
            return new WP_Error('not_logged_in', 'Usuario no autenticado', ['status' => 401]);
        }

        $plan_manager = new DA_Plan_Manager();
        $tier = $plan_manager->get_user_tier($user_id);
        $limits = $plan_manager->get_tier_limits($tier);

        // Obtener uso actual del mes
        global $wpdb;
        $table_usage = $wpdb->prefix . 'da_plan_usage';
        $month_year = date('Y-m');

        $usage = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table_usage WHERE user_id = %d AND month_year = %s",
            $user_id,
            $month_year
        ));

        $reports_used = $usage ? (int)$usage->reports_count : 0;
        $max_reports = $limits['max_reports_per_month'];

        $can_generate = ($max_reports === -1) || ($reports_used < $max_reports);

        return rest_ensure_response([
            'tier' => $tier,
            'reports_used' => $reports_used,
            'max_reports' => $max_reports,
            'reports_remaining' => $max_reports === -1 ? -1 : max(0, $max_reports - $reports_used),
            'can_generate' => $can_generate,
            'month_year' => $month_year
        ]);
    }

    /**
     * Obtener o crear token de autenticación para el backend
     */
    private static function get_or_create_user_token($user_id) {
        // Obtener token existente
        $token = get_user_meta($user_id, 'da_backend_token', true);

        // Verificar si el token es válido (aquí simplificamos, en producción deberías verificar expiración)
        if (!empty($token)) {
            return $token;
        }

        // Crear nuevo token (JWT simplificado o usar el sistema de tokens del backend)
        // Por ahora usamos un hash del user_id + secret
        $secret = get_option('da_hmac_secret');
        if (empty($secret)) {
            $secret = wp_generate_password(32, false);
            update_option('da_hmac_secret', $secret);
        }

        $token = hash_hmac('sha256', $user_id . time(), $secret);

        // Guardar token
        update_user_meta($user_id, 'da_backend_token', $token);

        return $token;
    }
}
