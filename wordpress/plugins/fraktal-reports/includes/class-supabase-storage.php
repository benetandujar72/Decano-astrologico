<?php
/**
 * Cliente para Supabase Storage.
 *
 * @package FraktalReports
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Fraktal_Supabase_Storage {

	/**
	 * Cliente de Supabase.
	 *
	 * @var Fraktal_Supabase_Client
	 */
	private $client;

	/**
	 * Nombre del bucket por defecto.
	 */
	const DEFAULT_BUCKET = 'reports';

	/**
	 * Constructor.
	 */
	public function __construct() {
		$this->client = new Fraktal_Supabase_Client();
	}

	/**
	 * Sube un archivo a Supabase Storage.
	 *
	 * @param string $file_path Ruta local del archivo.
	 * @param string $storage_path Ruta en Storage (ej: 'user-123/report-abc.pdf').
	 * @param string $bucket Nombre del bucket.
	 * @param string $content_type MIME type del archivo.
	 * @return array|WP_Error Respuesta con la ruta o error.
	 */
	public function upload( $file_path, $storage_path, $bucket = null, $content_type = null ) {
		if ( ! file_exists( $file_path ) ) {
			return new WP_Error( 'file_not_found', 'El archivo no existe: ' . $file_path );
		}

		$bucket = $bucket ?: self::DEFAULT_BUCKET;
		$content_type = $content_type ?: $this->get_mime_type( $file_path );
		$file_content = file_get_contents( $file_path );

		if ( false === $file_content ) {
			return new WP_Error( 'file_read_error', 'No se pudo leer el archivo.' );
		}

		$endpoint = 'storage/v1/object/' . $bucket . '/' . ltrim( $storage_path, '/' );

		$url = rtrim( FRAKTAL_SUPABASE_URL, '/' ) . '/' . $endpoint;

		$args = array(
			'method'  => 'POST',
			'headers' => array(
				'apikey'        => FRAKTAL_SUPABASE_SERVICE_KEY,
				'Authorization' => 'Bearer ' . FRAKTAL_SUPABASE_SERVICE_KEY,
				'Content-Type'  => $content_type,
			),
			'body'    => $file_content,
			'timeout' => 60,
		);

		$response = wp_remote_request( $url, $args );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$code = wp_remote_retrieve_response_code( $response );
		$body = wp_remote_retrieve_body( $response );
		$data = json_decode( $body, true );

		if ( $code >= 400 ) {
			$error_message = isset( $data['message'] ) ? $data['message'] : 'Error desconocido';
			return new WP_Error( 'storage_upload_error', $error_message, array( 'status' => $code ) );
		}

		return array(
			'path'       => $storage_path,
			'bucket'     => $bucket,
			'full_path'  => $bucket . '/' . $storage_path,
			'public_url' => $this->get_public_url( $storage_path, $bucket ),
		);
	}

	/**
	 * Sube contenido directamente (sin archivo local).
	 *
	 * @param string $content Contenido del archivo.
	 * @param string $storage_path Ruta en Storage.
	 * @param string $bucket Nombre del bucket.
	 * @param string $content_type MIME type.
	 * @return array|WP_Error Respuesta o error.
	 */
	public function upload_content( $content, $storage_path, $bucket = null, $content_type = 'application/pdf' ) {
		$bucket = $bucket ?: self::DEFAULT_BUCKET;

		$endpoint = 'storage/v1/object/' . $bucket . '/' . ltrim( $storage_path, '/' );

		$url = rtrim( FRAKTAL_SUPABASE_URL, '/' ) . '/' . $endpoint;

		$args = array(
			'method'  => 'POST',
			'headers' => array(
				'apikey'        => FRAKTAL_SUPABASE_SERVICE_KEY,
				'Authorization' => 'Bearer ' . FRAKTAL_SUPABASE_SERVICE_KEY,
				'Content-Type'  => $content_type,
			),
			'body'    => $content,
			'timeout' => 60,
		);

		$response = wp_remote_request( $url, $args );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$code = wp_remote_retrieve_response_code( $response );
		$body = wp_remote_retrieve_body( $response );
		$data = json_decode( $body, true );

		if ( $code >= 400 ) {
			$error_message = isset( $data['message'] ) ? $data['message'] : 'Error desconocido';
			return new WP_Error( 'storage_upload_error', $error_message, array( 'status' => $code ) );
		}

		return array(
			'path'       => $storage_path,
			'bucket'     => $bucket,
			'full_path'  => $bucket . '/' . $storage_path,
			'public_url' => $this->get_public_url( $storage_path, $bucket ),
		);
	}

	/**
	 * Genera una URL firmada para descarga.
	 *
	 * @param string $storage_path Ruta del archivo en Storage.
	 * @param string $bucket Nombre del bucket.
	 * @param int    $expires_in Segundos hasta expiración (default: 1 hora).
	 * @return string|WP_Error URL firmada o error.
	 */
	public function get_signed_url( $storage_path, $bucket = null, $expires_in = 3600 ) {
		$bucket = $bucket ?: self::DEFAULT_BUCKET;

		$endpoint = 'storage/v1/object/sign/' . $bucket . '/' . ltrim( $storage_path, '/' );

		$url = rtrim( FRAKTAL_SUPABASE_URL, '/' ) . '/' . $endpoint;

		$args = array(
			'method'  => 'POST',
			'headers' => array(
				'apikey'        => FRAKTAL_SUPABASE_SERVICE_KEY,
				'Authorization' => 'Bearer ' . FRAKTAL_SUPABASE_SERVICE_KEY,
				'Content-Type'  => 'application/json',
			),
			'body'    => wp_json_encode( array( 'expiresIn' => $expires_in ) ),
			'timeout' => 30,
		);

		$response = wp_remote_request( $url, $args );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$code = wp_remote_retrieve_response_code( $response );
		$body = wp_remote_retrieve_body( $response );
		$data = json_decode( $body, true );

		if ( $code >= 400 ) {
			$error_message = isset( $data['message'] ) ? $data['message'] : 'Error desconocido';
			return new WP_Error( 'storage_sign_error', $error_message, array( 'status' => $code ) );
		}

		if ( isset( $data['signedURL'] ) ) {
			return FRAKTAL_SUPABASE_URL . $data['signedURL'];
		}

		return new WP_Error( 'storage_sign_error', 'No se obtuvo URL firmada.' );
	}

	/**
	 * Obtiene la URL pública de un archivo (si el bucket es público).
	 *
	 * @param string $storage_path Ruta del archivo.
	 * @param string $bucket Nombre del bucket.
	 * @return string URL pública.
	 */
	public function get_public_url( $storage_path, $bucket = null ) {
		$bucket = $bucket ?: self::DEFAULT_BUCKET;
		return rtrim( FRAKTAL_SUPABASE_URL, '/' ) . '/storage/v1/object/public/' . $bucket . '/' . ltrim( $storage_path, '/' );
	}

	/**
	 * Elimina un archivo de Storage.
	 *
	 * @param string $storage_path Ruta del archivo.
	 * @param string $bucket Nombre del bucket.
	 * @return bool|WP_Error True si se eliminó, error si falló.
	 */
	public function delete( $storage_path, $bucket = null ) {
		$bucket = $bucket ?: self::DEFAULT_BUCKET;

		$endpoint = 'storage/v1/object/' . $bucket . '/' . ltrim( $storage_path, '/' );

		$url = rtrim( FRAKTAL_SUPABASE_URL, '/' ) . '/' . $endpoint;

		$args = array(
			'method'  => 'DELETE',
			'headers' => array(
				'apikey'        => FRAKTAL_SUPABASE_SERVICE_KEY,
				'Authorization' => 'Bearer ' . FRAKTAL_SUPABASE_SERVICE_KEY,
			),
			'timeout' => 30,
		);

		$response = wp_remote_request( $url, $args );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$code = wp_remote_retrieve_response_code( $response );

		if ( $code >= 400 ) {
			$body = wp_remote_retrieve_body( $response );
			$data = json_decode( $body, true );
			$error_message = isset( $data['message'] ) ? $data['message'] : 'Error desconocido';
			return new WP_Error( 'storage_delete_error', $error_message, array( 'status' => $code ) );
		}

		return true;
	}

	/**
	 * Lista archivos en un directorio de Storage.
	 *
	 * @param string $prefix Prefijo/directorio a listar.
	 * @param string $bucket Nombre del bucket.
	 * @param int    $limit Límite de resultados.
	 * @return array|WP_Error Lista de archivos o error.
	 */
	public function list_files( $prefix = '', $bucket = null, $limit = 100 ) {
		$bucket = $bucket ?: self::DEFAULT_BUCKET;

		$endpoint = 'storage/v1/object/list/' . $bucket;

		$url = rtrim( FRAKTAL_SUPABASE_URL, '/' ) . '/' . $endpoint;

		$args = array(
			'method'  => 'POST',
			'headers' => array(
				'apikey'        => FRAKTAL_SUPABASE_SERVICE_KEY,
				'Authorization' => 'Bearer ' . FRAKTAL_SUPABASE_SERVICE_KEY,
				'Content-Type'  => 'application/json',
			),
			'body'    => wp_json_encode( array(
				'prefix' => $prefix,
				'limit'  => $limit,
			) ),
			'timeout' => 30,
		);

		$response = wp_remote_request( $url, $args );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$code = wp_remote_retrieve_response_code( $response );
		$body = wp_remote_retrieve_body( $response );
		$data = json_decode( $body, true );

		if ( $code >= 400 ) {
			$error_message = isset( $data['message'] ) ? $data['message'] : 'Error desconocido';
			return new WP_Error( 'storage_list_error', $error_message, array( 'status' => $code ) );
		}

		return $data;
	}

	/**
	 * Genera una ruta única para un reporte.
	 *
	 * @param int    $wp_user_id ID del usuario de WordPress.
	 * @param string $session_id ID de sesión del reporte.
	 * @param string $report_type Tipo de informe.
	 * @return string Ruta en Storage.
	 */
	public function generate_report_path( $wp_user_id, $session_id, $report_type = 'individual' ) {
		$date = gmdate( 'Y/m' );
		$filename = sprintf(
			'informe-%s-%s-%s.pdf',
			sanitize_file_name( $report_type ),
			substr( $session_id, 0, 8 ),
			gmdate( 'Ymd-His' )
		);

		return sprintf( 'wp-user-%d/%s/%s', $wp_user_id, $date, $filename );
	}

	/**
	 * Detecta el MIME type de un archivo.
	 *
	 * @param string $file_path Ruta del archivo.
	 * @return string MIME type.
	 */
	private function get_mime_type( $file_path ) {
		$extension = strtolower( pathinfo( $file_path, PATHINFO_EXTENSION ) );

		$mime_types = array(
			'pdf'  => 'application/pdf',
			'png'  => 'image/png',
			'jpg'  => 'image/jpeg',
			'jpeg' => 'image/jpeg',
			'gif'  => 'image/gif',
			'svg'  => 'image/svg+xml',
			'json' => 'application/json',
			'txt'  => 'text/plain',
			'html' => 'text/html',
		);

		return isset( $mime_types[ $extension ] ) ? $mime_types[ $extension ] : 'application/octet-stream';
	}
}
