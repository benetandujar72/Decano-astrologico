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

        // Endpoint para obtener datos de un informe por session_id
        register_rest_route('decano/v1', '/report/(?P<session_id>[a-zA-Z0-9-]+)', [
            'methods' => 'GET',
            'callback' => [__CLASS__, 'get_report_by_session'],
            'permission_callback' => '__return_true', // Permitir acceso anónimo
            'args' => [
                'session_id' => [
                    'required' => true,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field'
                ]
            ]
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
     * Usa Nominatim (OpenStreetMap) directamente - NO requiere backend externo
     */
    public static function reverse_geocode($request) {
        $lat = $request->get_param('lat');
        $lon = $request->get_param('lon');

        // Llamar a Nominatim (OpenStreetMap) para geocodificación inversa
        $nominatim_url = 'https://nominatim.openstreetmap.org/reverse';
        $response = wp_remote_get(add_query_arg([
            'lat' => $lat,
            'lon' => $lon,
            'format' => 'json',
            'zoom' => 10,
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

        $result = json_decode($response_body, true);

        if (!$result || isset($result['error'])) {
            return new WP_Error(
                'no_results',
                'No se encontró información para estas coordenadas',
                ['status' => 404]
            );
        }

        // Extraer información relevante
        $address = $result['address'] ?? [];

        return rest_ensure_response([
            'latitude' => floatval($lat),
            'longitude' => floatval($lon),
            'formatted_address' => $result['display_name'] ?? '',
            'city' => $address['city'] ?? $address['town'] ?? $address['village'] ?? '',
            'state' => $address['state'] ?? '',
            'country' => $address['country'] ?? '',
            'country_code' => $address['country_code'] ?? '',
            'timezone' => self::get_timezone_from_coordinates($lat, $lon)
        ]);
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
     * Este endpoint crea un usuario si no existe y usa Supabase para generar el informe
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

        // Verificar que Supabase esté configurado
        if (!defined('FRAKTAL_SUPABASE_URL') || empty(FRAKTAL_SUPABASE_URL)) {
            return new WP_Error('supabase_not_configured', 'Supabase no está configurado', ['status' => 500]);
        }

        // Paso 1: Obtener o crear usuario de WordPress
        $user_id = null;
        $is_logged_in = is_user_logged_in();
        $is_new_user = false;

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

                $is_new_user = true;
            }
        }

        // Paso 2: Sincronizar usuario con Supabase (si la clase existe)
        if (class_exists('Fraktal_Supabase_Auth')) {
            try {
                $auth = new Fraktal_Supabase_Auth();
                $auth->sync_wp_user($user_id);
            } catch (Exception $e) {
                // Log pero no fallar - el usuario puede existir ya
                error_log('[DA] Error sincronizando usuario con Supabase: ' . $e->getMessage());
            }
        }

        // Paso 3: Preparar datos del chart
        $chart_data = [
            'name' => $name,
            'email' => $email,
            'birth_date' => $birth_date,
            'birth_time' => $birth_time,
            'birth_city' => $birth_city,
            'birth_country' => $birth_country,
            'latitude' => floatval($latitude),
            'longitude' => floatval($longitude),
            'timezone' => $timezone
        ];

        // Paso 4: Crear sesión de generación de reporte
        if (class_exists('Fraktal_Supabase_Reports')) {
            // Usar la nueva clase de Supabase
            try {
                $reports = new Fraktal_Supabase_Reports();
                $result = $reports->start_generation($chart_data, 'gancho_free', $user_id);

                if (isset($result['error'])) {
                    return new WP_Error(
                        'generation_failed',
                        $result['error'],
                        ['status' => 500]
                    );
                }

                $session_id = $result['session_id'] ?? wp_generate_uuid4();

            } catch (Exception $e) {
                error_log('[DA] Error iniciando generación: ' . $e->getMessage());
                return new WP_Error(
                    'generation_failed',
                    'Error al iniciar la generación del informe: ' . $e->getMessage(),
                    ['status' => 500]
                );
            }
        } else {
            // Fallback: crear sesión local en WordPress DB
            global $wpdb;
            $table = $wpdb->prefix . 'da_report_sessions';
            $session_id = wp_generate_uuid4();

            $wpdb->insert($table, [
                'user_id' => $user_id,
                'session_id' => $session_id,
                'report_type' => 'gancho_free',
                'status' => 'queued',
                'chart_data' => json_encode($chart_data),
                'created_at' => current_time('mysql'),
                'updated_at' => current_time('mysql')
            ]);

            if ($wpdb->last_error) {
                return new WP_Error(
                    'db_error',
                    'Error al crear la sesión: ' . $wpdb->last_error,
                    ['status' => 500]
                );
            }
        }

        // Paso 5: Devolver session_id y datos del usuario
        return rest_ensure_response([
            'success' => true,
            'session_id' => $session_id,
            'user_id' => $user_id,
            'is_new_user' => $is_new_user,
            'viewer_url' => home_url('/mi-informe/?session_id=' . $session_id),
            'message' => 'Informe en proceso de generación'
        ]);
    }

    /**
     * Obtener datos de un informe por session_id
     * Este endpoint es llamado por FreeReportViewer para mostrar el informe
     */
    public static function get_report_by_session($request) {
        $session_id = $request->get_param('session_id');

        if (empty($session_id)) {
            return new WP_Error('missing_session', 'ID de sesión requerido', ['status' => 400]);
        }

        // Primero intentar obtener de Supabase
        if (defined('FRAKTAL_USE_SUPABASE') && FRAKTAL_USE_SUPABASE && class_exists('Fraktal_Supabase_Client')) {
            try {
                $client = new Fraktal_Supabase_Client();
                $client->use_service_role();

                // Construir query correctamente y buscar el reporte en Supabase
                $endpoint = $client->build_query('reports', [
                    'session_id' => 'eq.' . $session_id,
                ], ['select' => '*']);
                $response = $client->get($endpoint);

                if (!empty($response) && is_array($response) && count($response) > 0) {
                    $report = $response[0];

                    // Verificar el status del reporte
                    $status = $report['status'] ?? 'unknown';

                    if ($status === 'completed') {
                        // Reporte completado - devolver datos formateados
                        return self::format_report_response($report);
                    } elseif ($status === 'processing' || $status === 'queued') {
                        // Reporte en proceso
                        return rest_ensure_response([
                            'status' => $status,
                            'progress_percent' => $report['progress_percent'] ?? 0,
                            'current_module' => $report['current_module'] ?? null,
                            'message' => 'El informe se está generando...'
                        ]);
                    } elseif ($status === 'failed') {
                        return new WP_Error(
                            'report_failed',
                            $report['error_message'] ?? 'Error al generar el informe',
                            ['status' => 500]
                        );
                    }
                }
            } catch (Exception $e) {
                error_log('[DA] Error obteniendo reporte de Supabase: ' . $e->getMessage());
                // Continuar para intentar con WordPress DB
            }
        }

        // Fallback: buscar en WordPress DB
        global $wpdb;
        $table = $wpdb->prefix . 'da_report_sessions';

        $report = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table WHERE session_id = %s",
            $session_id
        ));

        if (!$report) {
            return new WP_Error('not_found', 'Informe no encontrado', ['status' => 404]);
        }

        $status = $report->status;

        if ($status === 'completed') {
            // Formatear respuesta desde WordPress DB
            $chart_data = json_decode($report->chart_data, true) ?? [];
            $report_content = json_decode($report->report_content, true) ?? [];

            return rest_ensure_response([
                'chart_data' => [
                    'name' => $chart_data['name'] ?? 'Usuario',
                    'birth_date' => $chart_data['birth_date'] ?? '',
                    'birth_time' => $chart_data['birth_time'] ?? '',
                    'birth_place' => ($chart_data['birth_city'] ?? '') . ', ' . ($chart_data['birth_country'] ?? ''),
                    'latitude' => $chart_data['latitude'] ?? 0,
                    'longitude' => $chart_data['longitude'] ?? 0
                ],
                'modules' => $report_content['modules'] ?? [],
                'chart_image_url' => $report_content['chart_image_url'] ?? null,
                'status' => 'completed'
            ]);
        } elseif ($status === 'processing' || $status === 'queued') {
            return rest_ensure_response([
                'status' => $status,
                'progress_percent' => 0,
                'message' => 'El informe se está generando...'
            ]);
        } else {
            return new WP_Error('report_failed', 'Error al generar el informe', ['status' => 500]);
        }
    }

    /**
     * Formatear respuesta del reporte desde Supabase
     */
    private static function format_report_response($report) {
        $birth_data = $report['birth_data'] ?? [];

        // Si es un array JSON string, decodificarlo
        if (is_string($birth_data)) {
            $birth_data = json_decode($birth_data, true) ?? [];
        }

        // Obtener contenido del reporte
        $modules = [];

        // Intentar obtener módulos desde report_content si existe
        $report_content = $report['report_content'] ?? null;
        if (is_string($report_content)) {
            $report_content = json_decode($report_content, true);
        }

        if ($report_content && isset($report_content['modules'])) {
            $modules = $report_content['modules'];
        } else {
            // Generar módulos de ejemplo si no hay contenido
            $modules = [
                [
                    'id' => 'sol',
                    'title' => 'Tu Identidad Solar',
                    'content' => $report_content['sol'] ?? 'Tu Sol representa tu esencia, tu identidad más profunda y tu propósito vital. Es la energía central que te impulsa y define quién eres en tu núcleo más auténtico.'
                ],
                [
                    'id' => 'luna',
                    'title' => 'Tu Naturaleza Emocional',
                    'content' => $report_content['luna'] ?? 'Tu Luna revela tu mundo emocional interno, tus necesidades de seguridad y cómo procesas tus sentimientos. Es tu lado más íntimo y vulnerable.'
                ],
                [
                    'id' => 'ascendente',
                    'title' => 'Tu Ascendente',
                    'content' => $report_content['ascendente'] ?? 'Tu Ascendente es la máscara que presentas al mundo, tu primera impresión y cómo inicias nuevas experiencias. Es tu estilo natural de aproximarte a la vida.'
                ]
            ];
        }

        return rest_ensure_response([
            'chart_data' => [
                'name' => $birth_data['name'] ?? $report['chart_name'] ?? 'Usuario',
                'birth_date' => $birth_data['birth_date'] ?? '',
                'birth_time' => $birth_data['birth_time'] ?? '',
                'birth_place' => ($birth_data['birth_city'] ?? '') . ', ' . ($birth_data['birth_country'] ?? ''),
                'latitude' => $birth_data['latitude'] ?? 0,
                'longitude' => $birth_data['longitude'] ?? 0
            ],
            'modules' => $modules,
            'chart_image_url' => $report['chart_image_url'] ?? null,
            'status' => 'completed'
        ]);
    }
}
