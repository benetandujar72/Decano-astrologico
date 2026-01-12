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
        // Endpoint de geocodificación (NO requiere login para usuarios Free)
        register_rest_route('decano/v1', '/geocode', [
            'methods' => 'POST',
            'callback' => [__CLASS__, 'geocode_location'],
            'permission_callback' => '__return_true', // Permitir acceso anónimo
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

        // Endpoint para generar informe gratuito (NO requiere login)
        register_rest_route('decano/v1', '/generate-free-report', [
            'methods' => 'POST',
            'callback' => [__CLASS__, 'generate_free_report'],
            'permission_callback' => '__return_true', // Permitir acceso anónimo
            'args' => [
                'name' => [
                    'required' => true,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field'
                ],
                'email' => [
                    'required' => true,
                    'type' => 'string',
                    'validate_callback' => function($param) {
                        return is_email($param);
                    },
                    'sanitize_callback' => 'sanitize_email'
                ],
                'birth_date' => [
                    'required' => true,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field'
                ],
                'birth_time' => [
                    'required' => true,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field'
                ],
                'birth_city' => [
                    'required' => true,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field'
                ],
                'birth_country' => [
                    'required' => true,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field'
                ],
                'latitude' => [
                    'required' => true,
                    'type' => 'number'
                ],
                'longitude' => [
                    'required' => true,
                    'type' => 'number'
                ],
                'timezone' => [
                    'required' => true,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field'
                ]
            ]
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
     * Llama directamente a Nominatim (OpenStreetMap) - NO requiere autenticación
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

        // Construir query para Nominatim
        $query_parts = [$city];
        if (!empty($state)) {
            $query_parts[] = $state;
        }
        $query_parts[] = $country;
        $query = implode(', ', $query_parts);

        // Llamar a Nominatim (OpenStreetMap)
        $nominatim_url = 'https://nominatim.openstreetmap.org/search';
        $response = wp_remote_get(add_query_arg([
            'q' => $query,
            'format' => 'json',
            'limit' => 1,
            'addressdetails' => 1
        ], $nominatim_url), [
            'headers' => [
                'User-Agent' => 'Decano-Astrologico-WordPress/1.0'
            ],
            'timeout' => 15
        ]);

        if (is_wp_error($response)) {
            return new WP_Error(
                'geocode_error',
                'Error al contactar el servicio de geocodificación: ' . $response->get_error_message(),
                ['status' => 502]
            );
        }

        $response_code = wp_remote_retrieve_response_code($response);
        $response_body = wp_remote_retrieve_body($response);

        if ($response_code !== 200) {
            return new WP_Error(
                'geocode_failed',
                'El servicio de geocodificación no está disponible',
                ['status' => $response_code]
            );
        }

        $results = json_decode($response_body, true);

        if (empty($results) || !is_array($results)) {
            return new WP_Error(
                'no_results',
                'No se encontraron coordenadas para esta ubicación',
                ['status' => 404]
            );
        }

        $location = $results[0];

        // Extraer información relevante
        $latitude = floatval($location['lat']);
        $longitude = floatval($location['lon']);
        $display_name = $location['display_name'];

        // Intentar determinar el timezone (simplificado - basado en longitud)
        $timezone = self::get_timezone_from_coordinates($latitude, $longitude);

        $result = [
            'latitude' => $latitude,
            'longitude' => $longitude,
            'formatted_address' => $display_name,
            'city' => $city,
            'country' => $country,
            'timezone' => $timezone
        ];

        return rest_ensure_response($result);
    }

    /**
     * Obtener timezone aproximado desde coordenadas
     * Simplificación basada en longitud (cada 15° = 1 hora)
     */
    private static function get_timezone_from_coordinates($lat, $lon) {
        $offset_hours = round($lon / 15);

        if ($offset_hours > 0) {
            return 'UTC+' . $offset_hours;
        } elseif ($offset_hours < 0) {
            return 'UTC' . $offset_hours;
        } else {
            return 'UTC+0';
        }
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
     * Generar informe gratuito
     * Este endpoint crea un usuario si no existe y llama al backend para generar el informe
     */
    public static function generate_free_report($request) {
        $name = $request->get_param('name');
        $email = $request->get_param('email');
        $birth_date = $request->get_param('birth_date');
        $birth_time = $request->get_param('birth_time');
        $birth_city = $request->get_param('birth_city');
        $birth_country = $request->get_param('birth_country');
        $latitude = $request->get_param('latitude');
        $longitude = $request->get_param('longitude');
        $timezone = $request->get_param('timezone');

        // Verificar backend configurado
        $backend_url = get_option('da_api_url');
        if (empty($backend_url)) {
            return new WP_Error('backend_not_configured', 'Backend no configurado', ['status' => 500]);
        }

        // Paso 1: Obtener o crear usuario de WordPress
        $user_id = null;
        $is_logged_in = is_user_logged_in();

        if ($is_logged_in) {
            // Usuario ya está logueado
            $user_id = get_current_user_id();
        } else {
            // Buscar usuario por email
            $user = get_user_by('email', $email);

            if ($user) {
                // Usuario existe, usar su ID
                $user_id = $user->ID;
            } else {
                // Crear nuevo usuario
                $username = sanitize_user(str_replace(' ', '_', strtolower($name)) . '_' . wp_rand(1000, 9999));
                $password = wp_generate_password(16, true);

                $user_id = wp_create_user($username, $password, $email);

                if (is_wp_error($user_id)) {
                    return new WP_Error(
                        'user_creation_failed',
                        'No se pudo crear el usuario: ' . $user_id->get_error_message(),
                        ['status' => 500]
                    );
                }

                // Actualizar nombre del usuario
                wp_update_user([
                    'ID' => $user_id,
                    'display_name' => $name,
                    'first_name' => $name
                ]);

                // Asignar rol de subscriber
                $user = new WP_User($user_id);
                $user->set_role('subscriber');

                // Enviar email de bienvenida (opcional)
                wp_send_new_user_notifications($user_id, 'user');
            }
        }

        // Paso 2: Obtener o crear token del backend
        $token = self::get_or_create_backend_jwt($user_id, $email, $name);

        if (!$token) {
            return new WP_Error('auth_error', 'No se pudo obtener token de autenticación', ['status' => 401]);
        }

        // Paso 3: Preparar datos para el backend
        $birth_datetime = $birth_date . 'T' . $birth_time;

        $payload = [
            'report_type' => 'gancho_free',
            'birth_datetime' => $birth_datetime,
            'latitude' => floatval($latitude),
            'longitude' => floatval($longitude),
            'timezone' => $timezone,
            'city' => $birth_city,
            'country' => $birth_country,
            'name' => $name
        ];

        // Paso 4: Llamar al backend para generar informe gratuito
        // Usa el endpoint específico que calcula la carta desde datos de nacimiento
        $response = wp_remote_post($backend_url . '/reports/queue-free-report', [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type' => 'application/json'
            ],
            'body' => json_encode($payload),
            'timeout' => 30
        ]);

        if (is_wp_error($response)) {
            return new WP_Error(
                'backend_error',
                'Error al conectar con el backend: ' . $response->get_error_message(),
                ['status' => 502]
            );
        }

        $response_code = wp_remote_retrieve_response_code($response);
        $response_body = wp_remote_retrieve_body($response);

        if ($response_code !== 200 && $response_code !== 201) {
            $error_data = json_decode($response_body, true);
            $error_message = isset($error_data['detail']) ? $error_data['detail'] : 'Error desconocido del backend';

            return new WP_Error(
                'backend_failed',
                $error_message,
                ['status' => $response_code, 'body' => $error_data]
            );
        }

        $result = json_decode($response_body, true);

        if (!$result || !isset($result['session_id'])) {
            return new WP_Error(
                'invalid_response',
                'Respuesta inválida del backend',
                ['status' => 502, 'body' => $response_body]
            );
        }

        // Paso 5: Devolver session_id y datos del usuario
        return rest_ensure_response([
            'success' => true,
            'session_id' => $result['session_id'],
            'user_id' => $user_id,
            'is_new_user' => !$is_logged_in && !get_user_by('email', $email),
            'viewer_url' => home_url('/tu-informe-gratis/?session_id=' . $result['session_id']),
            'message' => 'Informe en proceso de generación'
        ]);
    }

    /**
     * Obtener o crear token JWT del backend para el usuario
     */
    private static function get_or_create_backend_jwt($user_id, $email, $name) {
        // Intentar obtener token existente
        $token = get_user_meta($user_id, 'da_backend_jwt_token', true);
        $token_expiry = get_user_meta($user_id, 'da_backend_jwt_expiry', true);

        // Verificar si el token sigue siendo válido (con margen de 1 hora)
        if (!empty($token) && !empty($token_expiry) && time() < ($token_expiry - 3600)) {
            return $token;
        }

        // Necesitamos crear un nuevo token llamando al backend
        $backend_url = get_option('da_api_url');
        if (empty($backend_url)) {
            return false;
        }

        // Llamar al endpoint de autenticación del backend
        $response = wp_remote_post($backend_url . '/auth/wordpress-login', [
            'headers' => [
                'Content-Type' => 'application/json'
            ],
            'body' => json_encode([
                'wordpress_user_id' => $user_id,
                'email' => $email,
                'name' => $name
            ]),
            'timeout' => 15
        ]);

        if (is_wp_error($response)) {
            error_log('[DA] Error obteniendo JWT: ' . $response->get_error_message());
            return false;
        }

        $response_code = wp_remote_retrieve_response_code($response);
        $response_body = wp_remote_retrieve_body($response);

        if ($response_code !== 200) {
            error_log('[DA] Backend auth failed (code ' . $response_code . '): ' . $response_body);
            return false;
        }

        $auth_data = json_decode($response_body, true);

        if (!$auth_data || !isset($auth_data['access_token'])) {
            error_log('[DA] Invalid auth response from backend');
            return false;
        }

        $token = $auth_data['access_token'];
        $expires_in = isset($auth_data['expires_in']) ? intval($auth_data['expires_in']) : 86400; // Default 24h

        // Guardar token y expiración
        update_user_meta($user_id, 'da_backend_jwt_token', $token);
        update_user_meta($user_id, 'da_backend_jwt_expiry', time() + $expires_in);

        return $token;
    }

    /**
     * Obtener o crear token de autenticación para el backend (método legacy)
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
