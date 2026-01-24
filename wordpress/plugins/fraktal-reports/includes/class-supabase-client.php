<?php
/**
 * Clase cliente para interactuar con Supabase.
 *
 * @package FraktalReports
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Fraktal_Supabase_Client {

	private $url;
	private $key;
	private $service_key;
	private $user_token;
	private $use_service_key = false;

	public function __construct() {
		$this->url = defined( 'FRAKTAL_SUPABASE_URL' ) ? FRAKTAL_SUPABASE_URL : '';
		$this->key = defined( 'FRAKTAL_SUPABASE_ANON_KEY' ) ? FRAKTAL_SUPABASE_ANON_KEY : '';
		$this->service_key = defined( 'FRAKTAL_SUPABASE_SERVICE_KEY' ) ? FRAKTAL_SUPABASE_SERVICE_KEY : '';
	}

	/**
	 * Habilita el uso de SERVICE_KEY para operaciones privilegiadas.
	 *
	 * @param bool $use True para usar SERVICE_KEY.
	 * @return $this
	 */
	public function use_service_role( $use = true ) {
		$this->use_service_key = $use;
		return $this;
	}

	/**
	 * Establece un token JWT de usuario para autenticación.
	 *
	 * @param string $token El JWT token del usuario.
	 * @return $this
	 */
	public function set_user_token( $token ) {
		$this->user_token = $token;
		return $this;
	}

	/**
	 * Realiza una petición GET a Supabase.
	 *
	 * @param string $endpoint El endpoint (ej. 'rest/v1/table?select=*').
	 * @param array  $headers Headers adicionales.
	 * @return array|WP_Error
	 */
	public function get( $endpoint, $headers = array() ) {
		return $this->request( 'GET', $endpoint, null, $headers );
	}

	/**
	 * Realiza una petición POST a Supabase.
	 *
	 * @param string $endpoint El endpoint.
	 * @param array  $body Datos a enviar.
	 * @param array  $headers Headers adicionales.
	 * @return array|WP_Error
	 */
	public function post( $endpoint, $body, $headers = array() ) {
		return $this->request( 'POST', $endpoint, $body, $headers );
	}

	/**
	 * Realiza una petición PATCH a Supabase.
	 *
	 * @param string $endpoint El endpoint.
	 * @param array  $body Datos a actualizar.
	 * @param array  $headers Headers adicionales.
	 * @return array|WP_Error
	 */
	public function patch( $endpoint, $body, $headers = array() ) {
		return $this->request( 'PATCH', $endpoint, $body, $headers );
	}

	/**
	 * Realiza una petición DELETE a Supabase.
	 *
	 * @param string $endpoint El endpoint.
	 * @param array  $headers Headers adicionales.
	 * @return array|WP_Error
	 */
	public function delete( $endpoint, $headers = array() ) {
		return $this->request( 'DELETE', $endpoint, null, $headers );
	}

	/**
	 * Invoca una Edge Function de Supabase.
	 *
	 * @param string $function_name Nombre de la función (ej. 'wordpress-report-webhook').
	 * @param array  $body Datos a enviar a la función.
	 * @param array  $headers Headers adicionales.
	 * @return array|WP_Error
	 */
	public function invoke_function( $function_name, $body = null, $headers = array() ) {
		$endpoint = 'functions/v1/' . ltrim( $function_name, '/' );
		return $this->request( 'POST', $endpoint, $body, $headers, true );
	}

	/**
	 * Realiza un upsert (insert o update) en una tabla.
	 *
	 * @param string $table Nombre de la tabla.
	 * @param array  $data Datos a insertar/actualizar.
	 * @param string $on_conflict Columna(s) para detectar conflicto.
	 * @return array|WP_Error
	 */
	public function upsert( $table, $data, $on_conflict = 'id' ) {
		$endpoint = 'rest/v1/' . $table;
		$headers = array(
			'Prefer' => 'resolution=merge-duplicates',
		);
		return $this->request( 'POST', $endpoint, $data, $headers );
	}

	/**
	 * Función genérica para realizar peticiones.
	 *
	 * @param string $method Método HTTP.
	 * @param string $endpoint Endpoint de la API.
	 * @param array  $body Cuerpo de la petición.
	 * @param array  $custom_headers Headers personalizados.
	 * @param bool   $is_function True si es una Edge Function.
	 * @return array|WP_Error
	 */
	private function request( $method, $endpoint, $body = null, $custom_headers = array(), $is_function = false ) {
		error_log('[DA DEBUG] ====== Supabase request ======');
		error_log('[DA DEBUG] Method: ' . $method . ', Endpoint: ' . $endpoint);
		error_log('[DA DEBUG] Is function: ' . ($is_function ? 'yes' : 'no'));
		error_log('[DA DEBUG] URL configured: ' . (!empty($this->url) ? 'yes' : 'NO'));
		error_log('[DA DEBUG] Key configured: ' . (!empty($this->key) ? 'yes' : 'NO'));
		error_log('[DA DEBUG] Service key configured: ' . (!empty($this->service_key) ? 'yes' : 'NO'));
		error_log('[DA DEBUG] Use service key: ' . ($this->use_service_key ? 'yes' : 'no'));

		if ( empty( $this->url ) || empty( $this->key ) ) {
			error_log('[DA DEBUG] ERROR: Supabase URL or Key not configured!');
			return new WP_Error( 'supabase_config_error', 'Supabase URL or Key not configured.' );
		}

		$url = rtrim( $this->url, '/' ) . '/' . ltrim( $endpoint, '/' );
		error_log('[DA DEBUG] Full URL: ' . $url);

		// Determinar qué key usar para autenticación
		$auth_key = $this->key; // Default: ANON_KEY
		if ( $this->use_service_key && ! empty( $this->service_key ) ) {
			$auth_key = $this->service_key;
		}

		// Determinar el token de Authorization
		$auth_token = $auth_key;
		if ( ! empty( $this->user_token ) ) {
			$auth_token = $this->user_token;
		}

		$headers = array_merge(
			array(
				'apikey'        => $auth_key,
				'Authorization' => 'Bearer ' . $auth_token,
				'Content-Type'  => 'application/json',
			),
			$custom_headers
		);

		$args = array(
			'method'  => $method,
			'headers' => $headers,
			'timeout' => $is_function ? 120 : 30, // Edge Functions pueden tardar más
		);

		if ( ! empty( $body ) ) {
			$args['body'] = is_string( $body ) ? $body : wp_json_encode( $body );
		}

		error_log('[DA DEBUG] Making request to: ' . $url);
		$response = wp_remote_request( $url, $args );

		if ( is_wp_error( $response ) ) {
			error_log('[DA DEBUG] wp_remote_request ERROR: ' . $response->get_error_message());
			return $response;
		}

		$code = wp_remote_retrieve_response_code( $response );
		$response_body = wp_remote_retrieve_body( $response );
		$data = json_decode( $response_body, true );

		error_log('[DA DEBUG] Response code: ' . $code);
		error_log('[DA DEBUG] Response body: ' . substr($response_body, 0, 500));

		// Reset flags después de cada petición
		$this->use_service_key = false;
		$this->user_token = null;

		if ( $code >= 400 ) {
			$error_message = 'Unknown error';
			if ( isset( $data['message'] ) ) {
				$error_message = $data['message'];
			} elseif ( isset( $data['error'] ) ) {
				$error_message = $data['error'];
			} elseif ( isset( $data['error_description'] ) ) {
				$error_message = $data['error_description'];
			}
			return new WP_Error(
				'supabase_api_error',
				$error_message,
				array( 'status' => $code, 'data' => $data )
			);
		}

		return $data;
	}

	/**
	 * Construye una URL de query para PostgREST.
	 *
	 * @param string $table Nombre de la tabla.
	 * @param array  $filters Filtros en formato ['column' => 'eq.value'].
	 * @param array  $options Opciones adicionales (select, order, limit).
	 * @return string
	 */
	public function build_query( $table, $filters = array(), $options = array() ) {
		$endpoint = 'rest/v1/' . $table;
		$params = array();

		// Agregar select si existe
		if ( ! empty( $options['select'] ) ) {
			$params['select'] = $options['select'];
		}

		// Agregar filtros
		foreach ( $filters as $column => $value ) {
			$params[ $column ] = $value;
		}

		// Agregar order si existe
		if ( ! empty( $options['order'] ) ) {
			$params['order'] = $options['order'];
		}

		// Agregar limit si existe
		if ( ! empty( $options['limit'] ) ) {
			$params['limit'] = $options['limit'];
		}

		if ( ! empty( $params ) ) {
			$endpoint .= '?' . http_build_query( $params );
		}

		return $endpoint;
	}
}
