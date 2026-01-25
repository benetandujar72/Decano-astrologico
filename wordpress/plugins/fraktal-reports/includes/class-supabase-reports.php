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
	 * Lista todos los reportes (para admins).
	 *
	 * @param int $limit Límite de resultados.
	 * @return array|WP_Error Lista de reportes o error.
	 */
	public function list_all_reports( $limit = 100 ) {
		$endpoint = $this->client->build_query(
			'reports',
			array(),
			array(
				'select' => 'id,session_id,status,report_type,chart_name,wp_user_id,created_at,completed_at,file_url,file_path,report_content',
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
	 * Cuenta los reportes de un usuario.
	 *
	 * @param int $wp_user_id ID del usuario en WordPress.
	 * @return int Número de reportes.
	 */
	public function count_reports( $wp_user_id ) {
		$endpoint = $this->client->build_query(
			'reports',
			array( 'wp_user_id' => 'eq.' . intval( $wp_user_id ) ),
			array(
				'select' => 'id',
			)
		);

		$result = $this->client->use_service_role()->get( $endpoint );

		if ( is_wp_error( $result ) ) {
			return 0;
		}

		return is_array( $result ) ? count( $result ) : 0;
	}

	/**
	 * Obtiene la URL de descarga de un reporte.
	 *
	 * @param string $report_id ID o session_id del reporte.
	 * @param int    $wp_user_id ID del usuario para verificación.
	 * @return string|WP_Error URL de descarga o error.
	 */
	public function get_download_url( $report_id, $wp_user_id = null ) {
		error_log( '[Fraktal Download] ====== get_download_url CALLED ======' );
		error_log( '[Fraktal Download] report_id: ' . $report_id );
		error_log( '[Fraktal Download] wp_user_id: ' . ( $wp_user_id ?: 'NULL' ) );

		// Obtener el reporte con todos los campos necesarios
		$endpoint = $this->client->build_query(
			'reports',
			array( 'session_id' => 'eq.' . sanitize_text_field( $report_id ) ),
			array(
				'select' => 'id,session_id,wp_user_id,file_url,file_path,status,report_content,chart_data,report_type,chart_name',
				'limit'  => 1,
			)
		);

		$result = $this->client->use_service_role()->get( $endpoint );

		if ( is_wp_error( $result ) ) {
			error_log( '[Fraktal Download] Query error: ' . $result->get_error_message() );
			return $result;
		}

		if ( empty( $result ) ) {
			error_log( '[Fraktal Download] Report not found' );
			return new WP_Error( 'not_found', 'Reporte no encontrado.' );
		}

		$report = $result[0];
		error_log( '[Fraktal Download] Report found: ' . json_encode( array(
			'session_id' => $report['session_id'],
			'wp_user_id' => $report['wp_user_id'],
			'status'     => $report['status'],
			'file_path'  => $report['file_path'] ?? 'NULL',
			'file_url'   => $report['file_url'] ?? 'NULL',
		) ) );

		// Verificar propiedad si se proporciona wp_user_id
		// Los administradores pueden acceder a cualquier reporte
		if ( $wp_user_id && intval( $report['wp_user_id'] ) !== intval( $wp_user_id ) ) {
			// Verificar si el usuario es administrador
			$is_admin = user_can( $wp_user_id, 'manage_options' );
			if ( ! $is_admin ) {
				error_log( '[Fraktal Download] Unauthorized: user mismatch and not admin' );
				return new WP_Error( 'unauthorized', 'No tienes permiso para acceder a este reporte.' );
			}
			error_log( '[Fraktal Download] User is admin, allowing access to report from another user' );
		}

		// Verificar que esté completado
		if ( $report['status'] !== 'completed' ) {
			error_log( '[Fraktal Download] Report not ready, status: ' . $report['status'] );
			return new WP_Error( 'not_ready', 'El reporte aún no está listo para descargar.' );
		}

		// Si ya tiene URL pública, retornarla
		if ( ! empty( $report['file_url'] ) ) {
			error_log( '[Fraktal Download] Returning existing file_url: ' . $report['file_url'] );
			return $report['file_url'];
		}

		// Si tiene file_path, generar URL firmada de Supabase Storage
		if ( ! empty( $report['file_path'] ) ) {
			error_log( '[Fraktal Download] Generating signed URL for file_path: ' . $report['file_path'] );
			$signed_url = $this->get_signed_url( $report['file_path'] );

			// Si el archivo no existe (404), limpiar file_path y regenerar PDF
			if ( is_wp_error( $signed_url ) && strpos( $signed_url->get_error_message(), 'not found' ) !== false ) {
				error_log( '[Fraktal Download] File not found in Storage, clearing file_path and regenerating PDF' );

				// Limpiar el file_path inválido
				$clear_endpoint = $this->client->build_query(
					'reports',
					array( 'session_id' => 'eq.' . $report['session_id'] )
				);
				$this->client->use_service_role()->patch( $clear_endpoint, array( 'file_path' => null ) );

				// Regenerar PDF si hay contenido
				if ( ! empty( $report['report_content'] ) ) {
					error_log( '[Fraktal Download] Regenerating PDF on-demand' );
					return $this->generate_pdf_on_demand( $report );
				}
			}

			return $signed_url;
		}

		// No hay archivo, intentar generar PDF si hay contenido
		if ( ! empty( $report['report_content'] ) ) {
			error_log( '[Fraktal Download] No file_path, generating PDF on-demand' );
			return $this->generate_pdf_on_demand( $report );
		}

		error_log( '[Fraktal Download] No file and no content available' );
		return new WP_Error( 'no_file', 'El reporte no tiene archivo asociado.' );
	}

	/**
	 * Genera un PDF on-demand cuando no existe en Storage.
	 *
	 * @param array $report Datos del reporte.
	 * @return string|WP_Error URL firmada o error.
	 */
	private function generate_pdf_on_demand( $report ) {
		error_log( '[Fraktal PDF] ====== generate_pdf_on_demand START ======' );

		if ( empty( $report['report_content'] ) ) {
			return new WP_Error( 'no_content', 'El reporte no tiene contenido para generar PDF.' );
		}

		// Preparar datos para el generador PDF
		$chart_data = is_string( $report['chart_data'] ) ? json_decode( $report['chart_data'], true ) : $report['chart_data'];

		$pdf_data = array(
			'session_id'     => $report['session_id'],
			'report_type'    => $report['report_type'] ?? 'individual',
			'chart_name'     => $report['chart_name'] ?? 'Informe Astrológico',
			'report_content' => $report['report_content'],
			'chart_data'     => $chart_data,
		);

		error_log( '[Fraktal PDF] Generating PDF for session: ' . $report['session_id'] );

		// Verificar que la clase del generador existe
		if ( ! class_exists( 'Fraktal_Report_PDF_Generator' ) ) {
			$generator_file = FRAKTAL_REPORTS_PATH . 'includes/class-report-pdf-generator.php';
			if ( file_exists( $generator_file ) ) {
				require_once $generator_file;
			} else {
				error_log( '[Fraktal PDF] PDF Generator class not found' );
				return new WP_Error( 'generator_missing', 'Generador de PDF no disponible.' );
			}
		}

		try {
			$generator = new Fraktal_Report_PDF_Generator();
			$pdf_content = $generator->generate( $pdf_data );

			if ( is_wp_error( $pdf_content ) ) {
				error_log( '[Fraktal PDF] Generation error: ' . $pdf_content->get_error_message() );
				return $pdf_content;
			}

			error_log( '[Fraktal PDF] PDF generated successfully, size: ' . strlen( $pdf_content ) . ' bytes' );

			// Subir a Supabase Storage
			$file_name = $report['session_id'] . '.pdf';
			$storage = new Fraktal_Supabase_Storage();
			$upload_result = $storage->upload( 'reports', $file_name, $pdf_content, 'application/pdf' );

			if ( is_wp_error( $upload_result ) ) {
				error_log( '[Fraktal PDF] Upload error: ' . $upload_result->get_error_message() );
				return $upload_result;
			}

			error_log( '[Fraktal PDF] PDF uploaded to Storage: ' . $file_name );

			// Actualizar el file_path en el reporte
			$update_endpoint = $this->client->build_query(
				'reports',
				array( 'session_id' => 'eq.' . $report['session_id'] )
			);
			$this->client->use_service_role()->patch( $update_endpoint, array( 'file_path' => $file_name ) );

			// Generar y retornar URL firmada
			return $this->get_signed_url( $file_name );

		} catch ( Exception $e ) {
			error_log( '[Fraktal PDF] Exception: ' . $e->getMessage() );
			return new WP_Error( 'pdf_error', 'Error generando PDF: ' . $e->getMessage() );
		}
	}

	/**
	 * Genera una URL firmada para descargar desde Supabase Storage.
	 *
	 * @param string $file_path Ruta del archivo en Storage.
	 * @param int    $expires_in Segundos hasta expiración (default 1 hora).
	 * @return string|WP_Error URL firmada o error.
	 */
	public function get_signed_url( $file_path, $expires_in = 3600 ) {
		error_log( '[Fraktal SignedURL] Getting signed URL for: ' . $file_path );

		$endpoint = 'storage/v1/object/sign/reports/' . ltrim( $file_path, '/' );

		$result = $this->client->use_service_role()->post(
			$endpoint,
			array( 'expiresIn' => $expires_in )
		);

		if ( is_wp_error( $result ) ) {
			error_log( '[Fraktal SignedURL] Error: ' . $result->get_error_message() );
			return $result;
		}

		error_log( '[Fraktal SignedURL] Response: ' . json_encode( $result ) );

		if ( isset( $result['signedURL'] ) ) {
			// La signedURL de Supabase es relativa (/object/sign/...)
			// Necesita el prefijo /storage/v1 para la URL completa
			$signed_path = $result['signedURL'];
			if ( strpos( $signed_path, '/storage/v1' ) !== 0 ) {
				$signed_path = '/storage/v1' . $signed_path;
			}
			$full_url = FRAKTAL_SUPABASE_URL . $signed_path;
			error_log( '[Fraktal SignedURL] Generated URL: ' . $full_url );
			return $full_url;
		}

		// Verificar si el error es "not found"
		if ( isset( $result['error'] ) || isset( $result['message'] ) ) {
			$error_msg = $result['error'] ?? $result['message'] ?? 'Unknown error';
			error_log( '[Fraktal SignedURL] API Error: ' . $error_msg );
			return new WP_Error( 'signed_url_error', 'File not found: ' . $error_msg );
		}

		return new WP_Error( 'signed_url_error', 'No se pudo generar la URL de descarga.' );
	}

	/**
	 * Elimina un reporte.
	 *
	 * @param string $session_id UUID de la sesión.
	 * @param int    $wp_user_id ID del usuario para verificación.
	 * @return bool|WP_Error True si se eliminó o error.
	 */
	public function delete_report( $session_id, $wp_user_id = null ) {
		error_log( '[Fraktal Delete] ====== delete_report CALLED ======' );
		error_log( '[Fraktal Delete] session_id: ' . $session_id );

		// Primero obtener el reporte para verificar propiedad y obtener file_path
		$endpoint = $this->client->build_query(
			'reports',
			array( 'session_id' => 'eq.' . sanitize_text_field( $session_id ) ),
			array(
				'select' => 'id,wp_user_id,file_path',
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
		// Los administradores pueden eliminar cualquier reporte
		if ( $wp_user_id && intval( $report['wp_user_id'] ) !== intval( $wp_user_id ) ) {
			$is_admin = user_can( $wp_user_id, 'manage_options' );
			if ( ! $is_admin ) {
				return new WP_Error( 'unauthorized', 'No tienes permiso para eliminar este reporte.' );
			}
		}

		// Si tiene archivo en Storage, eliminarlo
		if ( ! empty( $report['file_path'] ) ) {
			$storage = new Fraktal_Supabase_Storage();
			$storage->delete( 'reports', $report['file_path'] );
		}

		// Eliminar el registro de la base de datos
		$delete_endpoint = $this->client->build_query(
			'reports',
			array( 'session_id' => 'eq.' . sanitize_text_field( $session_id ) )
		);

		$delete_result = $this->client->use_service_role()->delete( $delete_endpoint );

		if ( is_wp_error( $delete_result ) ) {
			return $delete_result;
		}

		error_log( '[Fraktal Delete] Report deleted successfully' );
		return true;
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
