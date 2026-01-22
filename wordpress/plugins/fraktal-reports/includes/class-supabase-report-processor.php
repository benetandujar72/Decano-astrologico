<?php
/**
 * Procesador de cola de informes para Supabase.
 *
 * @package FraktalReports
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Clase para procesar la cola de generación de informes.
 * Diseñada para ejecutarse con WP-Cron.
 */
class Fraktal_Supabase_Report_Processor {

	/**
	 * Cliente de Supabase.
	 *
	 * @var Fraktal_Supabase_Client
	 */
	private $client;

	/**
	 * Cliente de Storage.
	 *
	 * @var Fraktal_Supabase_Storage
	 */
	private $storage;

	/**
	 * Generador de PDF.
	 *
	 * @var Fraktal_Report_PDF_Generator
	 */
	private $pdf_generator;

	/**
	 * Constructor.
	 */
	public function __construct() {
		$this->client        = new Fraktal_Supabase_Client();
		$this->storage       = new Fraktal_Supabase_Storage();
		$this->pdf_generator = new Fraktal_Report_PDF_Generator();
	}

	/**
	 * Procesa la cola de reportes pendientes.
	 *
	 * @param int $limit Número máximo de reportes a procesar.
	 * @return array Resultados del procesamiento.
	 */
	public function process_queue( $limit = 5 ) {
		$results = array(
			'processed' => 0,
			'success'   => 0,
			'failed'    => 0,
			'errors'    => array(),
		);

		// Obtener reportes en cola.
		$reports = $this->get_queued_reports( $limit );

		if ( is_wp_error( $reports ) ) {
			$results['errors'][] = $reports->get_error_message();
			$this->log( 'Error obteniendo cola: ' . $reports->get_error_message() );
			return $results;
		}

		if ( empty( $reports ) ) {
			$this->log( 'No hay reportes en cola.' );
			return $results;
		}

		$this->log( sprintf( 'Procesando %d reportes en cola.', count( $reports ) ) );

		foreach ( $reports as $report ) {
			$results['processed']++;

			$result = $this->process_report( $report );

			if ( is_wp_error( $result ) ) {
				$results['failed']++;
				$results['errors'][] = sprintf(
					'Reporte %s: %s',
					$report['session_id'] ?? $report['id'],
					$result->get_error_message()
				);
			} else {
				$results['success']++;
			}
		}

		$this->log( sprintf(
			'Procesamiento completado: %d éxitos, %d fallos de %d total.',
			$results['success'],
			$results['failed'],
			$results['processed']
		) );

		return $results;
	}

	/**
	 * Obtiene reportes en cola desde Supabase.
	 *
	 * @param int $limit Límite de resultados.
	 * @return array|WP_Error Array de reportes o error.
	 */
	private function get_queued_reports( $limit ) {
		$endpoint = $this->client->build_query(
			'reports',
			array(
				'status' => 'eq.queued',
			),
			array(
				'select'  => '*',
				'order'   => 'created_at.asc',
				'limit'   => $limit,
			)
		);

		$response = $this->client->use_service_role()->get( $endpoint );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		return $response;
	}

	/**
	 * Procesa un reporte individual.
	 *
	 * @param array $report Datos del reporte.
	 * @return bool|WP_Error True si se procesó correctamente, error si falló.
	 */
	private function process_report( $report ) {
		$session_id  = $report['session_id'] ?? '';
		$report_id   = $report['id'] ?? '';
		$report_type = $report['report_type'] ?? 'individual';
		$birth_data  = $report['birth_data'] ?? array();
		$wp_user_id  = $report['wp_user_id'] ?? 0;

		$this->log( "Procesando reporte {$session_id} tipo {$report_type}" );

		// 1. Marcar como "processing".
		$this->update_report_status( $report_id, 'processing', 5 );

		try {
			// 2. Obtener configuración del tipo de informe.
			$type_config = Fraktal_Report_Type_Config::get_type( $report_type );
			if ( ! $type_config ) {
				throw new Exception( "Tipo de informe no válido: {$report_type}" );
			}

			// 3. Calcular carta natal.
			$this->update_report_status( $report_id, 'processing', 15, 'Calculando carta natal' );
			$chart_data = $this->calculate_chart( $birth_data, $type_config );

			if ( is_wp_error( $chart_data ) ) {
				throw new Exception( 'Error calculando carta: ' . $chart_data->get_error_message() );
			}

			// 4. Generar contenido con IA.
			$this->update_report_status( $report_id, 'processing', 30, 'Generando interpretación' );
			$content = $this->generate_content( $chart_data, $report_type, $birth_data );

			if ( is_wp_error( $content ) ) {
				throw new Exception( 'Error generando contenido: ' . $content->get_error_message() );
			}

			// 5. Generar PDF.
			$this->update_report_status( $report_id, 'processing', 70, 'Generando PDF' );
			$pdf_path = $this->generate_pdf( $content, $report, $chart_data );

			if ( is_wp_error( $pdf_path ) ) {
				throw new Exception( 'Error generando PDF: ' . $pdf_path->get_error_message() );
			}

			// 6. Subir a Supabase Storage.
			$this->update_report_status( $report_id, 'processing', 85, 'Subiendo archivo' );
			$storage_path = $this->storage->generate_report_path( $wp_user_id, $session_id, $report_type );
			$upload_result = $this->storage->upload( $pdf_path, $storage_path );

			if ( is_wp_error( $upload_result ) ) {
				throw new Exception( 'Error subiendo PDF: ' . $upload_result->get_error_message() );
			}

			// 7. Actualizar reporte como completado.
			$this->update_report_completed( $report_id, $upload_result['full_path'] );

			// 8. Limpiar archivo temporal.
			if ( file_exists( $pdf_path ) ) {
				unlink( $pdf_path );
			}

			$this->log( "Reporte {$session_id} completado exitosamente." );
			return true;

		} catch ( Exception $e ) {
			$this->log( "Error en reporte {$session_id}: " . $e->getMessage() );
			$this->update_report_status( $report_id, 'failed', 0, $e->getMessage() );
			return new WP_Error( 'processing_error', $e->getMessage() );
		}
	}

	/**
	 * Calcula la carta natal llamando a la Edge Function.
	 *
	 * @param array $birth_data  Datos de nacimiento.
	 * @param array $type_config Configuración del tipo de informe.
	 * @return array|WP_Error Datos calculados de la carta o error.
	 */
	private function calculate_chart( $birth_data, $type_config ) {
		// Parsear fecha y hora.
		$fecha = $birth_data['fecha'] ?? '';
		$hora  = $birth_data['hora'] ?? '12:00';

		// Parsear fecha (formato esperado: YYYY-MM-DD o DD/MM/YYYY).
		$date_parts = array();
		if ( preg_match( '/(\d{4})-(\d{2})-(\d{2})/', $fecha, $date_parts ) ) {
			$year  = (int) $date_parts[1];
			$month = (int) $date_parts[2];
			$day   = (int) $date_parts[3];
		} elseif ( preg_match( '/(\d{2})\/(\d{2})\/(\d{4})/', $fecha, $date_parts ) ) {
			$day   = (int) $date_parts[1];
			$month = (int) $date_parts[2];
			$year  = (int) $date_parts[3];
		} else {
			return new WP_Error( 'invalid_date', 'Formato de fecha no válido: ' . $fecha );
		}

		// Parsear hora.
		$time_parts = explode( ':', $hora );
		$hour       = (int) ( $time_parts[0] ?? 12 );
		$minute     = (int) ( $time_parts[1] ?? 0 );

		// Coordenadas.
		$latitude  = (float) ( $birth_data['latitude'] ?? 0 );
		$longitude = (float) ( $birth_data['longitude'] ?? 0 );
		$timezone  = $this->get_timezone_offset( $birth_data['timezone'] ?? 'Europe/Madrid', $year, $month, $day );

		$payload = array(
			'year'        => $year,
			'month'       => $month,
			'day'         => $day,
			'hour'        => $hour,
			'minute'      => $minute,
			'timezone'    => $timezone,
			'latitude'    => $latitude,
			'longitude'   => $longitude,
			'houseSystem' => 'placidus',
			'zodiac'      => 'tropical',
		);

		$this->log( 'Llamando calculate-chart con: ' . wp_json_encode( $payload ) );

		$response = $this->client->use_service_role()->invoke_function( 'calculate-chart', $payload );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		// Verificar respuesta.
		if ( empty( $response['planets'] ) ) {
			return new WP_Error( 'chart_error', 'La respuesta de calculate-chart no contiene planetas.' );
		}

		return $response;
	}

	/**
	 * Genera contenido del informe con IA.
	 *
	 * @param array  $chart_data  Datos de la carta natal.
	 * @param string $report_type Tipo de informe.
	 * @param array  $birth_data  Datos de nacimiento originales.
	 * @return string|WP_Error Contenido generado o error.
	 */
	private function generate_content( $chart_data, $report_type, $birth_data ) {
		$type_config = Fraktal_Report_Type_Config::get_type( $report_type );
		$category    = $type_config['category'] ?? 'natal';

		// Obtener prompts.
		$system_prompt = Fraktal_Report_Type_Config::get_system_prompt( $category );
		$user_prompt   = Fraktal_Report_Type_Config::get_user_prompt( $report_type );

		// Preparar datos astrológicos para el prompt.
		$astro_data = array(
			'name'       => $birth_data['nombre'] ?? 'Consultante',
			'birthDate'  => $birth_data['fecha'] ?? '',
			'birthTime'  => $birth_data['hora'] ?? '',
			'birthPlace' => $birth_data['lugar'] ?? '',
			'planets'    => $chart_data['planets'] ?? array(),
			'houses'     => $chart_data['houses'] ?? array(),
			'aspects'    => $chart_data['aspects'] ?? array(),
			'dominants'  => $chart_data['dominants'] ?? array(),
		);

		// Agregar datos específicos según el tipo.
		if ( ! empty( $chart_data['transits'] ) ) {
			$astro_data['transits'] = $chart_data['transits'];
		}
		if ( ! empty( $chart_data['solarReturn'] ) ) {
			$astro_data['solarReturn'] = $chart_data['solarReturn'];
		}
		if ( ! empty( $chart_data['synastryAspects'] ) ) {
			$astro_data['synastryAspects'] = $chart_data['synastryAspects'];
		}

		$payload = array(
			'prompt'         => $user_prompt,
			'systemPrompt'   => $system_prompt,
			'temperature'    => 0.7,
			'maxTokens'      => 8000,
			'model'          => 'google/gemini-3-flash-preview',
			'reportCategory' => $category,
			'astroData'      => $astro_data,
		);

		$this->log( 'Llamando generate-report-content para tipo: ' . $report_type );

		$response = $this->client->use_service_role()->invoke_function( 'generate-report-content', $payload );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		if ( empty( $response['text'] ) ) {
			return new WP_Error( 'content_error', 'La respuesta de generate-report-content no contiene texto.' );
		}

		$this->log( sprintf(
			'Contenido generado: %d caracteres, %d tokens',
			strlen( $response['text'] ),
			$response['tokensUsed'] ?? 0
		) );

		return $response['text'];
	}

	/**
	 * Genera el PDF del informe.
	 *
	 * @param string $content    Contenido del informe.
	 * @param array  $report     Datos del reporte.
	 * @param array  $chart_data Datos de la carta (opcional).
	 * @return string|WP_Error Ruta del archivo PDF o error.
	 */
	private function generate_pdf( $content, $report, $chart_data = array() ) {
		$report_data = array(
			'session_id'  => $report['session_id'] ?? '',
			'report_type' => $report['report_type'] ?? 'individual',
			'chart_name'  => $report['chart_name'] ?? '',
			'birth_data'  => $report['birth_data'] ?? array(),
		);

		// Agregar posiciones planetarias si están disponibles.
		if ( ! empty( $chart_data['planets'] ) ) {
			$report_data['planets'] = $chart_data['planets'];
		}

		return $this->pdf_generator->generate( $content, $report_data );
	}

	/**
	 * Actualiza el estado del reporte en Supabase.
	 *
	 * @param string $report_id      ID del reporte.
	 * @param string $status         Nuevo estado.
	 * @param int    $progress       Porcentaje de progreso.
	 * @param string $current_module Módulo actual (opcional).
	 */
	private function update_report_status( $report_id, $status, $progress, $current_module = '' ) {
		$data = array(
			'status'           => $status,
			'progress_percent' => $progress,
		);

		if ( ! empty( $current_module ) ) {
			$data['current_module'] = $current_module;
		}

		$endpoint = 'rest/v1/reports?id=eq.' . $report_id;

		$this->client->use_service_role()->patch(
			$endpoint,
			$data,
			array( 'Prefer' => 'return=minimal' )
		);
	}

	/**
	 * Marca el reporte como completado.
	 *
	 * @param string $report_id ID del reporte.
	 * @param string $file_path Ruta del archivo en Storage.
	 */
	private function update_report_completed( $report_id, $file_path ) {
		$data = array(
			'status'           => 'completed',
			'progress_percent' => 100,
			'file_path'        => $file_path,
			'completed_at'     => gmdate( 'Y-m-d\TH:i:s\Z' ),
			'current_module'   => null,
		);

		$endpoint = 'rest/v1/reports?id=eq.' . $report_id;

		$this->client->use_service_role()->patch(
			$endpoint,
			$data,
			array( 'Prefer' => 'return=minimal' )
		);
	}

	/**
	 * Obtiene el offset de timezone.
	 *
	 * @param string $timezone_name Nombre del timezone.
	 * @param int    $year          Año.
	 * @param int    $month         Mes.
	 * @param int    $day           Día.
	 * @return int Offset en horas.
	 */
	private function get_timezone_offset( $timezone_name, $year, $month, $day ) {
		try {
			$tz   = new DateTimeZone( $timezone_name );
			$date = new DateTime( sprintf( '%04d-%02d-%02d', $year, $month, $day ), $tz );
			return (int) ( $tz->getOffset( $date ) / 3600 );
		} catch ( Exception $e ) {
			// Fallback a UTC+1 (España).
			return 1;
		}
	}

	/**
	 * Registra un mensaje en el log.
	 *
	 * @param string $message Mensaje a registrar.
	 */
	private function log( $message ) {
		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			error_log( '[Fraktal Report Processor] ' . $message );
		}
	}

	/**
	 * Limpia archivos temporales antiguos.
	 *
	 * @param int $max_age_hours Edad máxima en horas (por defecto 24).
	 * @return int Número de archivos eliminados.
	 */
	public function cleanup_temp_files( $max_age_hours = 24 ) {
		$upload_dir = wp_upload_dir();
		$temp_dir   = $upload_dir['basedir'] . '/fraktal-reports-temp/';
		$deleted    = 0;

		if ( ! is_dir( $temp_dir ) ) {
			return 0;
		}

		$files = glob( $temp_dir . '*.pdf' );
		$now   = time();

		foreach ( $files as $file ) {
			$file_age = $now - filemtime( $file );
			if ( $file_age > ( $max_age_hours * 3600 ) ) {
				if ( unlink( $file ) ) {
					$deleted++;
				}
			}
		}

		if ( $deleted > 0 ) {
			$this->log( "Limpieza: {$deleted} archivos temporales eliminados." );
		}

		return $deleted;
	}

	/**
	 * Procesa un reporte específico por session_id (útil para reprocesar).
	 *
	 * @param string $session_id ID de sesión del reporte.
	 * @return bool|WP_Error Resultado del procesamiento.
	 */
	public function process_by_session_id( $session_id ) {
		$endpoint = $this->client->build_query(
			'reports',
			array(
				'session_id' => 'eq.' . $session_id,
			),
			array(
				'select' => '*',
				'limit'  => 1,
			)
		);

		$response = $this->client->use_service_role()->get( $endpoint );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		if ( empty( $response ) ) {
			return new WP_Error( 'not_found', 'Reporte no encontrado: ' . $session_id );
		}

		return $this->process_report( $response[0] );
	}
}
