<?php
/**
 * Generador de PDF para informes astrológicos usando TCPDF.
 *
 * @package FraktalReports
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Incluir TCPDF si no está cargado.
if ( ! class_exists( 'TCPDF' ) ) {
	$tcpdf_path = DECANO_PLUGIN_DIR . 'vendor/tcpdf/tcpdf.php';
	if ( file_exists( $tcpdf_path ) ) {
		require_once $tcpdf_path;
	} else {
		// Fallback: intentar cargar desde composer autoload.
		$composer_autoload = DECANO_PLUGIN_DIR . 'vendor/autoload.php';
		if ( file_exists( $composer_autoload ) ) {
			require_once $composer_autoload;
		}
	}
}

/**
 * Clase para generar PDFs de informes astrológicos.
 */
class Fraktal_Report_PDF_Generator {

	/**
	 * Instancia de TCPDF.
	 *
	 * @var TCPDF
	 */
	private $pdf;

	/**
	 * Configuración de branding.
	 *
	 * @var array
	 */
	private $branding;

	/**
	 * Datos del informe.
	 *
	 * @var array
	 */
	private $report_data;

	/**
	 * Configuración por defecto del branding.
	 */
	const DEFAULT_BRANDING = array(
		'company_name'    => 'Programa Fraktal',
		'tagline'         => 'Astrología Psicológica',
		'primary_color'   => array( 74, 85, 162 ),    // #4A55A2
		'secondary_color' => array( 147, 112, 219 ),  // #9370DB
		'accent_color'    => array( 255, 215, 0 ),    // #FFD700
		'text_color'      => array( 51, 51, 51 ),     // #333333
		'logo_path'       => '',
		'footer_text'     => '© Programa Fraktal - Astrología Psicológica',
		'website'         => 'https://programafraktal.com',
	);

	/**
	 * Constructor.
	 *
	 * @param array $branding Configuración de branding opcional.
	 */
	public function __construct( $branding = array() ) {
		$this->branding = wp_parse_args( $branding, self::DEFAULT_BRANDING );
	}

	/**
	 * Genera el PDF completo del informe.
	 *
	 * @param array $content     Contenido del informe (secciones).
	 * @param array $report_data Datos del informe (chart_data, tipo, etc.).
	 * @return string|WP_Error Ruta del archivo PDF generado o error.
	 */
	public function generate( $content, $report_data ) {
		if ( ! class_exists( 'TCPDF' ) ) {
			return new WP_Error( 'tcpdf_missing', 'TCPDF no está instalado. Ejecuta: composer require tecnickcom/tcpdf' );
		}

		$this->report_data = $report_data;

		// Crear instancia de TCPDF.
		$this->pdf = new TCPDF( 'P', 'mm', 'A4', true, 'UTF-8', false );

		// Configurar documento.
		$this->setup_document();

		// Agregar portada.
		$this->add_cover_page();

		// Agregar tabla de contenidos (marcador).
		$this->pdf->Bookmark( 'Índice', 0, 0, '', '', array( 0, 0, 0 ) );

		// Agregar secciones de contenido.
		$this->add_content_sections( $content );

		// Generar archivo temporal.
		$upload_dir = wp_upload_dir();
		$temp_dir   = $upload_dir['basedir'] . '/fraktal-reports-temp/';

		if ( ! file_exists( $temp_dir ) ) {
			wp_mkdir_p( $temp_dir );
			// Crear .htaccess para proteger el directorio.
			file_put_contents( $temp_dir . '.htaccess', 'deny from all' );
		}

		$filename = sprintf(
			'informe-%s-%s-%s.pdf',
			sanitize_file_name( $report_data['report_type'] ?? 'individual' ),
			substr( $report_data['session_id'] ?? uniqid(), 0, 8 ),
			gmdate( 'Ymd-His' )
		);

		$file_path = $temp_dir . $filename;

		// Guardar PDF.
		$this->pdf->Output( $file_path, 'F' );

		if ( ! file_exists( $file_path ) ) {
			return new WP_Error( 'pdf_save_error', 'No se pudo guardar el PDF.' );
		}

		return $file_path;
	}

	/**
	 * Configura el documento PDF.
	 */
	private function setup_document() {
		$report_type = $this->report_data['report_type'] ?? 'individual';
		$chart_name  = $this->report_data['chart_name'] ?? 'Sin nombre';

		// Información del documento.
		$this->pdf->SetCreator( $this->branding['company_name'] );
		$this->pdf->SetAuthor( $this->branding['company_name'] );
		$this->pdf->SetTitle( 'Informe Astrológico - ' . $chart_name );
		$this->pdf->SetSubject( 'Informe de ' . ucfirst( $report_type ) );
		$this->pdf->SetKeywords( 'astrología, carta natal, informe, ' . $report_type );

		// Eliminar cabecera y pie de página por defecto.
		$this->pdf->setPrintHeader( false );
		$this->pdf->setPrintFooter( false );

		// Márgenes.
		$this->pdf->SetMargins( 20, 25, 20 );
		$this->pdf->SetAutoPageBreak( true, 25 );

		// Fuentes.
		$this->pdf->SetFont( 'helvetica', '', 11 );
	}

	/**
	 * Agrega la portada del informe.
	 */
	private function add_cover_page() {
		$this->pdf->AddPage();

		// Fondo con gradiente (simulado con rectángulo).
		$this->pdf->SetFillColor(
			$this->branding['primary_color'][0],
			$this->branding['primary_color'][1],
			$this->branding['primary_color'][2]
		);
		$this->pdf->Rect( 0, 0, 210, 100, 'F' );

		// Logo (si existe).
		if ( ! empty( $this->branding['logo_path'] ) && file_exists( $this->branding['logo_path'] ) ) {
			$this->pdf->Image( $this->branding['logo_path'], 75, 20, 60, 0, '', '', '', false, 300 );
		}

		// Nombre de la empresa.
		$this->pdf->SetY( 55 );
		$this->pdf->SetTextColor( 255, 255, 255 );
		$this->pdf->SetFont( 'helvetica', 'B', 28 );
		$this->pdf->Cell( 0, 15, $this->branding['company_name'], 0, 1, 'C' );

		// Tagline.
		$this->pdf->SetFont( 'helvetica', 'I', 14 );
		$this->pdf->Cell( 0, 8, $this->branding['tagline'], 0, 1, 'C' );

		// Tipo de informe.
		$report_type  = $this->report_data['report_type'] ?? 'individual';
		$type_config  = Fraktal_Report_Type_Config::get_type( $report_type );
		$report_title = $type_config['name'] ?? 'Informe Astrológico';

		$this->pdf->SetY( 120 );
		$this->pdf->SetTextColor(
			$this->branding['primary_color'][0],
			$this->branding['primary_color'][1],
			$this->branding['primary_color'][2]
		);
		$this->pdf->SetFont( 'helvetica', 'B', 24 );
		$this->pdf->Cell( 0, 12, $report_title, 0, 1, 'C' );

		// Línea decorativa.
		$this->pdf->SetY( 140 );
		$this->pdf->SetDrawColor(
			$this->branding['accent_color'][0],
			$this->branding['accent_color'][1],
			$this->branding['accent_color'][2]
		);
		$this->pdf->SetLineWidth( 1 );
		$this->pdf->Line( 60, 140, 150, 140 );

		// Nombre del consultante.
		$chart_name = $this->report_data['chart_name'] ?? '';
		if ( ! empty( $chart_name ) ) {
			$this->pdf->SetY( 150 );
			$this->pdf->SetTextColor(
				$this->branding['text_color'][0],
				$this->branding['text_color'][1],
				$this->branding['text_color'][2]
			);
			$this->pdf->SetFont( 'helvetica', '', 18 );
			$this->pdf->Cell( 0, 10, 'para', 0, 1, 'C' );
			$this->pdf->SetFont( 'helvetica', 'B', 22 );
			$this->pdf->Cell( 0, 12, $chart_name, 0, 1, 'C' );
		}

		// Datos de nacimiento.
		$birth_data = $this->report_data['birth_data'] ?? array();
		if ( ! empty( $birth_data ) ) {
			$this->pdf->SetY( 190 );
			$this->pdf->SetFont( 'helvetica', '', 11 );
			$this->pdf->SetTextColor( 100, 100, 100 );

			$birth_info = array();
			if ( ! empty( $birth_data['fecha'] ) ) {
				$birth_info[] = 'Fecha: ' . $birth_data['fecha'];
			}
			if ( ! empty( $birth_data['hora'] ) ) {
				$birth_info[] = 'Hora: ' . $birth_data['hora'];
			}
			if ( ! empty( $birth_data['lugar'] ) ) {
				$birth_info[] = 'Lugar: ' . $birth_data['lugar'];
			}

			foreach ( $birth_info as $info ) {
				$this->pdf->Cell( 0, 6, $info, 0, 1, 'C' );
			}
		}

		// Fecha de generación.
		$this->pdf->SetY( 250 );
		$this->pdf->SetFont( 'helvetica', 'I', 9 );
		$this->pdf->SetTextColor( 150, 150, 150 );
		$this->pdf->Cell( 0, 5, 'Generado el ' . gmdate( 'd/m/Y' ), 0, 1, 'C' );
		$this->pdf->Cell( 0, 5, $this->branding['website'], 0, 1, 'C' );
	}

	/**
	 * Agrega las secciones de contenido.
	 *
	 * @param array $content Array de secciones con 'title' y 'content'.
	 */
	private function add_content_sections( $content ) {
		// Si el contenido es un string, convertirlo a secciones.
		if ( is_string( $content ) ) {
			$content = $this->parse_content_to_sections( $content );
		}

		if ( empty( $content ) || ! is_array( $content ) ) {
			return;
		}

		$section_number = 1;

		foreach ( $content as $section ) {
			$this->add_section( $section, $section_number );
			$section_number++;
		}
	}

	/**
	 * Agrega una sección individual.
	 *
	 * @param array $section        Datos de la sección.
	 * @param int   $section_number Número de sección.
	 */
	private function add_section( $section, $section_number ) {
		$this->pdf->AddPage();

		// Agregar bookmark para índice.
		$title = $section['title'] ?? "Sección {$section_number}";
		$this->pdf->Bookmark( $title, 0, 0, '', '', array( 0, 0, 0 ) );

		// Cabecera de sección.
		$this->add_section_header( $title, $section_number );

		// Contenido.
		$content = $section['content'] ?? '';
		$this->add_section_content( $content );

		// Pie de página.
		$this->add_page_footer();
	}

	/**
	 * Agrega cabecera de sección.
	 *
	 * @param string $title          Título de la sección.
	 * @param int    $section_number Número de sección.
	 */
	private function add_section_header( $title, $section_number ) {
		// Número de sección con círculo.
		$this->pdf->SetFillColor(
			$this->branding['primary_color'][0],
			$this->branding['primary_color'][1],
			$this->branding['primary_color'][2]
		);

		// Círculo con número.
		$this->pdf->Circle( 25, 30, 8, 0, 360, 'F' );
		$this->pdf->SetTextColor( 255, 255, 255 );
		$this->pdf->SetFont( 'helvetica', 'B', 14 );
		$this->pdf->SetXY( 17, 26 );
		$this->pdf->Cell( 16, 8, (string) $section_number, 0, 0, 'C' );

		// Título.
		$this->pdf->SetTextColor(
			$this->branding['primary_color'][0],
			$this->branding['primary_color'][1],
			$this->branding['primary_color'][2]
		);
		$this->pdf->SetFont( 'helvetica', 'B', 18 );
		$this->pdf->SetXY( 40, 25 );
		$this->pdf->Cell( 150, 10, $title, 0, 1, 'L' );

		// Línea bajo el título.
		$this->pdf->SetDrawColor(
			$this->branding['secondary_color'][0],
			$this->branding['secondary_color'][1],
			$this->branding['secondary_color'][2]
		);
		$this->pdf->SetLineWidth( 0.5 );
		$this->pdf->Line( 20, 42, 190, 42 );

		$this->pdf->SetY( 50 );
	}

	/**
	 * Agrega contenido de sección (con soporte para Markdown básico).
	 *
	 * @param string $content Contenido en texto o Markdown.
	 */
	private function add_section_content( $content ) {
		$this->pdf->SetTextColor(
			$this->branding['text_color'][0],
			$this->branding['text_color'][1],
			$this->branding['text_color'][2]
		);
		$this->pdf->SetFont( 'helvetica', '', 11 );

		// Convertir Markdown básico a HTML.
		$html = $this->markdown_to_html( $content );

		// Escribir HTML.
		$this->pdf->writeHTML( $html, true, false, true, false, '' );
	}

	/**
	 * Convierte Markdown básico a HTML para TCPDF.
	 *
	 * @param string $markdown Texto en Markdown.
	 * @return string HTML.
	 */
	private function markdown_to_html( $markdown ) {
		$html = $markdown;

		// Escapar HTML existente.
		$html = htmlspecialchars( $html, ENT_NOQUOTES, 'UTF-8' );

		// Headers (## Título -> <h3>).
		$html = preg_replace( '/^### (.+)$/m', '<h4 style="color: #4A55A2; margin-top: 15px;">$1</h4>', $html );
		$html = preg_replace( '/^## (.+)$/m', '<h3 style="color: #4A55A2; margin-top: 20px;">$1</h3>', $html );

		// Bold (**texto**).
		$html = preg_replace( '/\*\*(.+?)\*\*/', '<strong>$1</strong>', $html );

		// Italic (*texto*).
		$html = preg_replace( '/\*(.+?)\*/', '<em>$1</em>', $html );

		// Listas (- item).
		$html = preg_replace( '/^- (.+)$/m', '<li>$1</li>', $html );
		$html = preg_replace( '/(<li>.*<\/li>\n?)+/', '<ul>$0</ul>', $html );

		// Párrafos (doble salto de línea).
		$html = preg_replace( '/\n\n/', '</p><p style="margin-bottom: 10px; line-height: 1.6;">', $html );

		// Envolver en párrafo.
		$html = '<p style="margin-bottom: 10px; line-height: 1.6;">' . $html . '</p>';

		// Limpiar párrafos vacíos.
		$html = preg_replace( '/<p[^>]*>\s*<\/p>/', '', $html );

		return $html;
	}

	/**
	 * Agrega pie de página.
	 */
	private function add_page_footer() {
		$page_num = $this->pdf->getPage();

		$this->pdf->SetY( -20 );
		$this->pdf->SetTextColor( 150, 150, 150 );
		$this->pdf->SetFont( 'helvetica', '', 8 );

		// Línea.
		$this->pdf->SetDrawColor( 200, 200, 200 );
		$this->pdf->SetLineWidth( 0.2 );
		$this->pdf->Line( 20, 277, 190, 277 );

		// Texto del pie.
		$this->pdf->SetY( 280 );
		$this->pdf->Cell( 85, 5, $this->branding['footer_text'], 0, 0, 'L' );
		$this->pdf->Cell( 85, 5, 'Página ' . $page_num, 0, 0, 'R' );
	}

	/**
	 * Parsea contenido de texto a secciones.
	 *
	 * @param string $content Contenido completo.
	 * @return array Array de secciones.
	 */
	private function parse_content_to_sections( $content ) {
		$sections = array();

		// Dividir por headers de nivel 2 (## Título).
		$parts = preg_split( '/^## /m', $content, -1, PREG_SPLIT_NO_EMPTY );

		foreach ( $parts as $part ) {
			// El primer elemento antes del primer ## es introducción.
			$lines = explode( "\n", $part, 2 );
			$title = trim( $lines[0] );
			$body  = isset( $lines[1] ) ? trim( $lines[1] ) : '';

			if ( empty( $title ) && empty( $body ) ) {
				continue;
			}

			// Si no hay título claro, usar uno genérico.
			if ( strlen( $title ) > 100 || empty( $title ) ) {
				$title = 'Sección';
				$body  = $part;
			}

			$sections[] = array(
				'title'   => $title,
				'content' => $body,
			);
		}

		// Si no se encontraron secciones, crear una sola.
		if ( empty( $sections ) ) {
			$sections[] = array(
				'title'   => 'Análisis Astrológico',
				'content' => $content,
			);
		}

		return $sections;
	}

	/**
	 * Agrega imagen de carta natal al PDF.
	 *
	 * @param string $image_path Ruta de la imagen.
	 * @param string $caption    Título de la imagen.
	 */
	public function add_chart_image( $image_path, $caption = 'Carta Natal' ) {
		if ( ! file_exists( $image_path ) ) {
			return;
		}

		$this->pdf->AddPage();
		$this->pdf->Bookmark( $caption, 0, 0, '', '', array( 0, 0, 0 ) );

		// Título.
		$this->pdf->SetTextColor(
			$this->branding['primary_color'][0],
			$this->branding['primary_color'][1],
			$this->branding['primary_color'][2]
		);
		$this->pdf->SetFont( 'helvetica', 'B', 16 );
		$this->pdf->Cell( 0, 15, $caption, 0, 1, 'C' );

		// Imagen centrada.
		$this->pdf->Image( $image_path, 30, 50, 150, 0, '', '', '', false, 300, '', false, false, 1 );

		$this->add_page_footer();
	}

	/**
	 * Agrega tabla de posiciones planetarias.
	 *
	 * @param array $planets Array de posiciones planetarias.
	 */
	public function add_planets_table( $planets ) {
		if ( empty( $planets ) ) {
			return;
		}

		$this->pdf->AddPage();
		$this->pdf->Bookmark( 'Posiciones Planetarias', 0, 0, '', '', array( 0, 0, 0 ) );

		// Título.
		$this->pdf->SetTextColor(
			$this->branding['primary_color'][0],
			$this->branding['primary_color'][1],
			$this->branding['primary_color'][2]
		);
		$this->pdf->SetFont( 'helvetica', 'B', 16 );
		$this->pdf->Cell( 0, 15, 'Posiciones Planetarias', 0, 1, 'C' );

		// Tabla.
		$html = '<table border="1" cellpadding="5" style="border-collapse: collapse;">';
		$html .= '<thead>';
		$html .= '<tr style="background-color: #4A55A2; color: white;">';
		$html .= '<th width="25%"><b>Planeta</b></th>';
		$html .= '<th width="20%"><b>Signo</b></th>';
		$html .= '<th width="20%"><b>Grado</b></th>';
		$html .= '<th width="15%"><b>Casa</b></th>';
		$html .= '<th width="20%"><b>Estado</b></th>';
		$html .= '</tr>';
		$html .= '</thead>';
		$html .= '<tbody>';

		foreach ( $planets as $planet => $data ) {
			$degree = isset( $data['degree'] ) ? $data['degree'] : 0;
			$minute = isset( $data['minute'] ) ? $data['minute'] : 0;
			$retro  = ! empty( $data['retrograde'] ) ? 'Retrógrado' : 'Directo';

			$html .= '<tr>';
			$html .= '<td><b>' . esc_html( $planet ) . '</b></td>';
			$html .= '<td>' . esc_html( $data['sign'] ?? '-' ) . '</td>';
			$html .= '<td>' . $degree . '° ' . $minute . "'</td>";
			$html .= '<td style="text-align: center;">' . esc_html( $data['house'] ?? '-' ) . '</td>';
			$html .= '<td>' . $retro . '</td>';
			$html .= '</tr>';
		}

		$html .= '</tbody></table>';

		$this->pdf->SetTextColor(
			$this->branding['text_color'][0],
			$this->branding['text_color'][1],
			$this->branding['text_color'][2]
		);
		$this->pdf->SetFont( 'helvetica', '', 10 );
		$this->pdf->writeHTML( $html, true, false, true, false, '' );

		$this->add_page_footer();
	}

	/**
	 * Obtiene el contenido binario del PDF (sin guardarlo en archivo).
	 *
	 * @param array $content     Contenido del informe.
	 * @param array $report_data Datos del informe.
	 * @return string|WP_Error Contenido binario del PDF o error.
	 */
	public function generate_content( $content, $report_data ) {
		if ( ! class_exists( 'TCPDF' ) ) {
			return new WP_Error( 'tcpdf_missing', 'TCPDF no está instalado.' );
		}

		$this->report_data = $report_data;
		$this->pdf         = new TCPDF( 'P', 'mm', 'A4', true, 'UTF-8', false );

		$this->setup_document();
		$this->add_cover_page();
		$this->pdf->Bookmark( 'Índice', 0, 0, '', '', array( 0, 0, 0 ) );
		$this->add_content_sections( $content );

		// Retornar como string.
		return $this->pdf->Output( '', 'S' );
	}
}
