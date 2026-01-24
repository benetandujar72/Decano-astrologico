<?php
/**
 * Clase para operaciones de reportes con Supabase.
 *
 * @package FraktalReports
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Fraktal_Supabase_Reports {

	/**
	 * Cliente de Supabase.
	 *
	 * @var Fraktal_Supabase_Client
	 */
	private $client;

	/**
	 * Auth helper.
	 *
	 * @var Fraktal_Supabase_Auth
	 */
	private $auth;

	/**
	 * Constructor.
	 */
	public function __construct() {
		$this->client = new Fraktal_Supabase_Client();
		$this->auth   = new Fraktal_Supabase_Auth();
	}

	/**
	 * Inicia la generación de un reporte llamando a la Edge Function.
	 *
	 * @param array  $chart_data Datos de la carta natal.
	 * @param string $report_type Tipo de reporte (individual, pareja, etc.).
	 * @param int    $wp_user_id ID del usuario en WordPress.
	 * @return array|WP_Error Respuesta con session_id o error.
	 */
	public function start_generation( $chart_data, $report_type, $wp_user_id ) {
		error_log('[DA DEBUG] ====== start_generation CALLED ======');
		error_log('[DA DEBUG] chart_data: ' . json_encode($chart_data));
		error_log('[DA DEBUG] report_type: ' . $report_type);
		error_log('[DA DEBUG] wp_user_id: ' . $wp_user_id);

		// Asegurar que el usuario existe en Supabase
		error_log('[DA DEBUG] Getting supabase_user_id for wp_user_id: ' . $wp_user_id);
		$supabase_user_id = $this->auth->get_supabase_user_id( $wp_user_id );
		error_log('[DA DEBUG] supabase_user_id result: ' . ($supabase_user_id ?: 'NULL'));

		if ( ! $supabase_user_id ) {
			error_log('[DA DEBUG] No supabase_user_id, syncing wp_user...');
			$profile = $this->auth->sync_wp_user( $wp_user_id );
			if ( is_wp_error( $profile ) ) {
				error_log('[DA DEBUG] sync_wp_user ERROR: ' . $profile->get_error_message());
				return $profile;
			}
			$supabase_user_id = $profile['id'];
			error_log('[DA DEBUG] synced supabase_user_id: ' . $supabase_user_id);
		}

		$wp_user = get_userdata( $wp_user_id );
		error_log('[DA DEBUG] wp_user email: ' . ($wp_user ? $wp_user->user_email : 'N/A'));

		$payload = array(
			'chart_data'       => $chart_data,
			'report_type'      => sanitize_text_field( $report_type ),
			'wp_user_id'       => intval( $wp_user_id ),
			'supabase_user_id' => $supabase_user_id,
			'email'            => $wp_user ? $wp_user->user_email : '',
			'display_name'     => $wp_user ? $wp_user->display_name : '',
			'wp_site_url'      => home_url(),
		);

		// Llamar a la Edge Function
		error_log('[DA DEBUG] Calling Edge Function: wordpress-report-webhook');
		error_log('[DA DEBUG] Payload: ' . json_encode($payload));
		error_log('[DA DEBUG] Supabase URL: ' . (defined('FRAKTAL_SUPABASE_URL') ? FRAKTAL_SUPABASE_URL : 'NOT DEFINED'));

		$result = $this->client->use_service_role()->invoke_function(
			'wordpress-report-webhook',
			$payload,
			array(
				'X-WP-User-ID'  => strval( $wp_user_id ),
				'X-WP-Site-URL' => home_url(),
			)
		);

		error_log('[DA DEBUG] Edge Function result: ' . json_encode($result));
		if (is_wp_error($result)) {
			error_log('[DA DEBUG] Edge Function ERROR: ' . $result->get_error_message());
		}

		return $result;
	}

	/**
	 * Obtiene el estado de una sesión de generación.
	 *
	 * @param string $session_id UUID de la sesión.
	 * @return array|WP_Error Estado del reporte o error.
	 */
	public function get_session_status( $session_id ) {
		$endpoint = $this->client->build_query(
			'reports',
			array( 'session_id' => 'eq.' . sanitize_text_field( $session_id ) ),
			array(
				'select' => 'id,session_id,status,progress_percent,current_module,report_type,created_at,completed_at,file_url',
				'limit'  => 1,
			)
		);

		$result = $this->client->get( $endpoint );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		if ( empty( $result ) || ! is_array( $result ) ) {
			return new WP_Error( 'not_found', 'Sesión no encontrada.' );
		}

		return $result[0];
	}

	/**
	 * Lista los reportes de un usuario.
	 *
	 * @param int $wp_user_id ID del usuario en WordPress.
	 * @param int $limit Límite de resultados.
	 * @return array|WP_Error Lista de reportes o error.
	 */
	public function list_user_reports( $wp_user_id, $limit = 100 ) {
		$endpoint = $this->client->build_query(
			'reports',
			array( 'wp_user_id' => 'eq.' . intval( $wp_user_id ) ),
			array(
				'select' => 'id,session_id,status,report_type,chart_name,created_at,completed_at,file_url',
				'order'  => 'created_at.desc',
				'limit'  => intval( $limit ),
			)
		);

		$result = $this->client->use_service_role()->get( $endpoint );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return $result ?: array();
	}

	/**
	 * Obtiene la URL de descarga de un reporte.
	 *
	 * @param string $report_id ID o session_id del reporte.
	 * @param int    $wp_user_id ID del usuario para verificación.
	 * @return string|WP_Error URL de descarga o error.
	 */
	public function get_download_url( $report_id, $wp_user_id = null ) {
		// Obtener el reporte
		$endpoint = $this->client->build_query(
			'reports',
			array( 'session_id' => 'eq.' . sanitize_text_field( $report_id ) ),
			array(
				'select' => 'id,wp_user_id,file_url,file_path,status',
				'limit'  => 1,
			)
		);

		$result = $this->client->use_service_role()->get( $endpoint );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		if ( empty( $result ) ) {
			return new WP_Error( 'not_found', 'Reporte no encontrado.' );
		}

		$report = $result[0];

		// Verificar propiedad si se proporciona wp_user_id
		if ( $wp_user_id && intval( $report['wp_user_id'] ) !== intval( $wp_user_id ) ) {
			return new WP_Error( 'unauthorized', 'No tienes permiso para acceder a este reporte.' );
		}

		// Verificar que esté completado
		if ( $report['status'] !== 'completed' ) {
			return new WP_Error( 'not_ready', 'El reporte aún no está listo para descargar.' );
		}

		// Si ya tiene URL pública, retornarla
		if ( ! empty( $report['file_url'] ) ) {
			return $report['file_url'];
		}

		// Si tiene file_path, generar URL firmada de Supabase Storage
		if ( ! empty( $report['file_path'] ) ) {
			return $this->get_signed_url( $report['file_path'] );
		}

		return new WP_Error( 'no_file', 'El reporte no tiene archivo asociado.' );
	}

	/**
	 * Genera una URL firmada para descargar desde Supabase Storage.
	 *
	 * @param string $file_path Ruta del archivo en Storage.
	 * @param int    $expires_in Segundos hasta expiración (default 1 hora).
	 * @return string|WP_Error URL firmada o error.
	 */
	public function get_signed_url( $file_path, $expires_in = 3600 ) {
		$endpoint = 'storage/v1/object/sign/reports/' . ltrim( $file_path, '/' );

		$result = $this->client->use_service_role()->post(
			$endpoint,
			array( 'expiresIn' => $expires_in )
		);

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		if ( isset( $result['signedURL'] ) ) {
			return FRAKTAL_SUPABASE_URL . $result['signedURL'];
		}

		return new WP_Error( 'signed_url_error', 'No se pudo generar la URL de descarga.' );
	}

	/**
	 * Crea un registro de reporte directamente (sin Edge Function).
	 *
	 * @param array $data Datos del reporte.
	 * @return array|WP_Error Reporte creado o error.
	 */
	public function create_report( $data ) {
		$defaults = array(
			'status'           => 'queued',
			'progress_percent' => 0,
			'created_at'       => current_time( 'mysql', true ),
		);

		$data = wp_parse_args( $data, $defaults );

		return $this->client->use_service_role()->post(
			'rest/v1/reports',
			$data,
			array( 'Prefer' => 'return=representation' )
		);
	}

	/**
	 * Actualiza el estado de un reporte.
	 *
	 * @param string $session_id UUID de la sesión.
	 * @param array  $data Datos a actualizar.
	 * @return array|WP_Error Resultado o error.
	 */
	public function update_report( $session_id, $data ) {
		$endpoint = 'rest/v1/reports?session_id=eq.' . sanitize_text_field( $session_id );

		$data['updated_at'] = current_time( 'mysql', true );

		return $this->client->use_service_role()->patch(
			$endpoint,
			$data,
			array( 'Prefer' => 'return=representation' )
		);
	}

	/**
	 * Obtiene los tipos de reporte disponibles.
	 *
	 * @param string $category Categoría opcional para filtrar.
	 * @return array|WP_Error Lista de tipos o error.
	 */
	public function get_report_types( $category = null ) {
		$filters = array();
		if ( $category ) {
			$filters['category'] = 'eq.' . sanitize_text_field( $category );
		}

		$endpoint = $this->client->build_query(
			'report_types',
			$filters,
			array(
				'select' => '*',
				'order'  => 'sort_order.asc',
			)
		);

		return $this->client->get( $endpoint );
	}
}
