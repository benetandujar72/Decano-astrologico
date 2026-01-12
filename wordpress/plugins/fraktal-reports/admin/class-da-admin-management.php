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
     * Timeout para llamadas al backend (30s para cold starts de Render)
     */
    const API_TIMEOUT = 30;

    /**
     * Obtener token JWT para el administrador actual
     * Usa el mismo sistema de autenticación que DA_Rest_API
     */
    private static function get_admin_jwt() {
        $current_user = wp_get_current_user();
        if (!$current_user || !$current_user->ID) {
            return false;
        }

        $user_id = $current_user->ID;

        // Verificar que es admin
        if (!current_user_can('manage_options')) {
            return false;
        }

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
                'email' => $current_user->user_email,
                'name' => $current_user->display_name,
                'role' => 'admin' // Indicar que es admin
            ]),
            'timeout' => 15,
            'sslverify' => false
        ]);

        if (is_wp_error($response)) {
            error_log('[DA Admin] Error obteniendo JWT: ' . $response->get_error_message());
            return false;
        }

        $response_code = wp_remote_retrieve_response_code($response);
        $response_body = wp_remote_retrieve_body($response);

        if ($response_code !== 200) {
            error_log('[DA Admin] Backend auth failed (code ' . $response_code . '): ' . $response_body);
            return false;
        }

        $auth_data = json_decode($response_body, true);

        if (!$auth_data || !isset($auth_data['access_token'])) {
            error_log('[DA Admin] Invalid auth response from backend');
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
     * Obtener headers de autenticación para llamadas al backend
     */
    private static function get_auth_headers() {
        $token = self::get_admin_jwt();
        $headers = [
            'Content-Type' => 'application/json'
        ];

        if ($token) {
            $headers['Authorization'] = 'Bearer ' . $token;
        }

        return $headers;
    }

    /**
     * Obtener todos los tipos de informe desde el backend
     */
    public static function get_report_types() {
        $backend_url = get_option('da_api_url');
        if (empty($backend_url)) {
            return ['error' => 'Backend no configurado. Por favor, configura la URL del backend en Configuración.'];
        }

        $response = wp_remote_get($backend_url . '/report-types/', [
            'headers' => self::get_auth_headers(),
            'timeout' => self::API_TIMEOUT,
            'sslverify' => false // Para desarrollo local
        ]);

        if (is_wp_error($response)) {
            $error_message = $response->get_error_message();

            // Si es timeout, dar mensaje más claro
            if (strpos($error_message, 'timed out') !== false || strpos($error_message, 'timeout') !== false) {
                return [
                    'error' => 'El backend tardó demasiado en responder. Esto puede ocurrir si el servidor está en "cold start". Intenta de nuevo en unos segundos.',
                    'timeout' => true
                ];
            }

            return ['error' => 'Error de conexión: ' . $error_message];
        }

        $response_code = wp_remote_retrieve_response_code($response);
        if ($response_code !== 200) {
            if ($response_code === 401) {
                return ['error' => 'Error de autenticación (401). Intenta recargar la página o contacta al administrador.'];
            } elseif ($response_code === 403) {
                return ['error' => 'Acceso denegado (403). Tu usuario no tiene permisos de administrador en el backend.'];
            }
            return ['error' => 'El backend respondió con código ' . $response_code . '. Verifica que la URL del backend sea correcta.'];
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return ['error' => 'Respuesta del backend no es JSON válido'];
        }

        // Asegurar que devolvemos un array
        if (!is_array($data)) {
            return [];
        }

        // El backend devuelve { report_types: [...], total: N }
        // Extraer solo el array de report_types si está presente
        if (isset($data['report_types']) && is_array($data['report_types'])) {
            return $data['report_types'];
        }

        return $data;
    }

    /**
     * Obtener todas las plantillas desde el backend
     */
    public static function get_templates() {
        $backend_url = get_option('da_api_url');
        if (empty($backend_url)) {
            return ['error' => 'Backend no configurado'];
        }

        $response = wp_remote_get($backend_url . '/templates/', [
            'headers' => self::get_auth_headers(),
            'timeout' => self::API_TIMEOUT,
            'sslverify' => false
        ]);

        if (is_wp_error($response)) {
            $error_message = $response->get_error_message();
            if (strpos($error_message, 'timeout') !== false) {
                return ['error' => 'Timeout: El backend tardó demasiado en responder.', 'timeout' => true];
            }
            return ['error' => $response->get_error_message()];
        }

        $response_code = wp_remote_retrieve_response_code($response);
        if ($response_code !== 200) {
            return ['error' => 'Backend respondió con código ' . $response_code];
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        if (!is_array($data)) {
            return [];
        }

        // El backend devuelve { templates: [...], total: N, user_limit: N }
        // Extraer solo el array de templates si está presente
        if (isset($data['templates']) && is_array($data['templates'])) {
            return $data['templates'];
        }

        return $data;
    }

    /**
     * Obtener todos los prompts desde el backend
     */
    public static function get_prompts() {
        $backend_url = get_option('da_api_url');
        if (empty($backend_url)) {
            return ['error' => 'Backend no configurado'];
        }

        $response = wp_remote_get($backend_url . '/prompts/', [
            'headers' => self::get_auth_headers(),
            'timeout' => self::API_TIMEOUT,
            'sslverify' => false
        ]);

        if (is_wp_error($response)) {
            $error_message = $response->get_error_message();
            if (strpos($error_message, 'timeout') !== false) {
                return ['error' => 'Timeout: El backend tardó demasiado en responder.', 'timeout' => true];
            }
            return ['error' => $response->get_error_message()];
        }

        $response_code = wp_remote_retrieve_response_code($response);
        if ($response_code !== 200) {
            return ['error' => 'Backend respondió con código ' . $response_code];
        }

        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        if (!is_array($data)) {
            return [];
        }

        // El backend devuelve { prompts: [...], total: N }
        // Extraer solo el array de prompts si está presente
        if (isset($data['prompts']) && is_array($data['prompts'])) {
            return $data['prompts'];
        }

        return $data;
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
            'headers' => self::get_auth_headers(),
            'body' => json_encode($data),
            'timeout' => self::API_TIMEOUT,
            'sslverify' => false
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
            'headers' => self::get_auth_headers(),
            'timeout' => self::API_TIMEOUT,
            'sslverify' => false
        ]);

        if (is_wp_error($response)) {
            return ['error' => $response->get_error_message()];
        }

        return ['success' => true];
    }

    /**
     * Obtener límites configurados por tier
     * Primero intenta cargar de la base de datos, si no usa los defaults
     */
    public static function get_tier_limits() {
        // Intentar cargar límites guardados
        $saved_limits = get_option('da_tier_limits');

        if (!empty($saved_limits) && is_array($saved_limits)) {
            return $saved_limits;
        }

        // Defaults
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
        // Cargar límites actuales
        $all_limits = self::get_tier_limits();

        // Actualizar el tier específico
        $all_limits[$tier] = $limits;

        // Guardar en options de WordPress
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

    /**
     * Verificar conexión con el backend
     */
    public static function test_backend_connection() {
        $backend_url = get_option('da_api_url');
        if (empty($backend_url)) {
            return [
                'success' => false,
                'error' => 'URL del backend no configurada'
            ];
        }

        // Intentar llamar al endpoint de health
        $response = wp_remote_get($backend_url . '/health', [
            'timeout' => 10,
            'sslverify' => false
        ]);

        if (is_wp_error($response)) {
            return [
                'success' => false,
                'error' => $response->get_error_message()
            ];
        }

        $response_code = wp_remote_retrieve_response_code($response);

        if ($response_code === 200) {
            return [
                'success' => true,
                'message' => 'Conexión exitosa con el backend'
            ];
        }

        return [
            'success' => false,
            'error' => 'Backend respondió con código ' . $response_code
        ];
    }

    /**
     * Obtener tipos de informe con fallback a datos locales
     */
    public static function get_report_types_with_fallback() {
        $types = self::get_report_types();

        // Si hay error, devolver datos de fallback
        if (isset($types['error'])) {
            return [
                'data' => self::get_default_report_types(),
                'error' => $types['error'],
                'is_fallback' => true
            ];
        }

        return [
            'data' => $types,
            'error' => null,
            'is_fallback' => false
        ];
    }

    /**
     * Tipos de informe por defecto (fallback cuando backend no disponible)
     */
    public static function get_default_report_types() {
        return [
            [
                'type_id' => 'gancho_free',
                'name' => 'Informe Gratuito (Gancho)',
                'available_for_tiers' => ['free', 'premium', 'enterprise'],
                'modules' => ['modulo_1_sol', 'modulo_3_luna', 'modulo_9_ascendente'],
                'is_active' => true,
                'description' => 'Informe gratuito con Sol, Luna y Ascendente para atraer nuevos usuarios.'
            ],
            [
                'type_id' => 'carta_natal_completa',
                'name' => 'Carta Natal Completa',
                'available_for_tiers' => ['premium', 'enterprise'],
                'modules' => ['modulo_1_sol', 'modulo_2_mercurio', 'modulo_3_luna', 'modulo_4_venus', 'modulo_5_marte', 'modulo_6_jupiter', 'modulo_7_saturno', 'modulo_8_urano', 'modulo_9_ascendente', 'modulo_10_nodos'],
                'is_active' => true,
                'description' => 'Análisis completo de la carta natal con todos los planetas y casas.'
            ],
            [
                'type_id' => 'revolucion_solar',
                'name' => 'Revolución Solar 2026',
                'available_for_tiers' => ['premium', 'enterprise'],
                'modules' => ['revolucion_solar'],
                'is_active' => true,
                'description' => 'Predicciones y tendencias para el año 2026.'
            ]
        ];
    }
}
