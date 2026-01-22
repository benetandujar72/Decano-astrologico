<?php
/**
 * Generador de PDF para informes astrológicos usando DOMPDF.
 *
 * @package FraktalReports
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Cargar DOMPDF via Composer autoload.
$autoload_path = DECANO_PLUGIN_DIR . 'vendor/autoload.php';
if ( file_exists( $autoload_path ) ) {
	require_once $autoload_path;
}

use Dompdf\Dompdf;
use Dompdf\Options;

/**
 * Clase para generar PDFs de informes astrológicos con DOMPDF.
 */
class Fraktal_Report_PDF_Generator {

	/**
	 * Instancia de DOMPDF.
	 *
	 * @var Dompdf
	 */
	private $dompdf;

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
		'company_name'     => 'Programa Fraktal',
		'tagline'          => 'Astrología Psicológica',
		'primary_color'    => '#4A55A2',
		'secondary_color'  => '#9370DB',
		'accent_color'     => '#FFD700',
		'text_color'       => '#333333',
		'logo_url'         => '',
		'footer_text'      => '© Programa Fraktal - Astrología Psicológica',
		'website'          => 'https://programafraktal.com',
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
	 * @param array|string $content     Contenido del informe (secciones o texto).
	 * @param array        $report_data Datos del informe (chart_data, tipo, etc.).
	 * @return string|WP_Error Ruta del archivo PDF generado o error.
	 */
	public function generate( $content, $report_data ) {
		if ( ! class_exists( 'Dompdf\Dompdf' ) ) {
			return new WP_Error( 'dompdf_missing', 'DOMPDF no está instalado. Ejecuta: composer require dompdf/dompdf' );
		}

		$this->report_data = $report_data;

		// Configurar DOMPDF.
		$options = new Options();
		$options->set( 'isHtml5ParserEnabled', true );
		$options->set( 'isRemoteEnabled', true );
		$options->set( 'defaultFont', 'DejaVu Sans' );
		$options->set( 'isFontSubsettingEnabled', true );
		$options->set( 'tempDir', sys_get_temp_dir() );

		$this->dompdf = new Dompdf( $options );

		// Si el contenido es string, convertirlo a secciones.
		if ( is_string( $content ) ) {
			$content = $this->parse_content_to_sections( $content );
		}

		// Generar HTML completo.
		$html = $this->render_html( $content );

		// Cargar HTML en DOMPDF.
		$this->dompdf->loadHtml( $html );

		// Configurar papel A4.
		$this->dompdf->setPaper( 'A4', 'portrait' );

		// Renderizar PDF.
		$this->dompdf->render();

		// Generar archivo temporal.
		$upload_dir = wp_upload_dir();
		$temp_dir   = $upload_dir['basedir'] . '/fraktal-reports-temp/';

		if ( ! file_exists( $temp_dir ) ) {
			wp_mkdir_p( $temp_dir );
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
		$pdf_content = $this->dompdf->output();
		$saved = file_put_contents( $file_path, $pdf_content );

		if ( false === $saved ) {
			return new WP_Error( 'pdf_save_error', 'No se pudo guardar el PDF.' );
		}

		return $file_path;
	}

	/**
	 * Genera el HTML completo del informe.
	 *
	 * @param array $sections Secciones del informe.
	 * @return string HTML completo.
	 */
	private function render_html( $sections ) {
		$report_type  = $this->report_data['report_type'] ?? 'individual';
		$type_config  = class_exists( 'Fraktal_Report_Type_Config' )
			? Fraktal_Report_Type_Config::get_type( $report_type )
			: null;
		$report_title = $type_config['name'] ?? 'Informe Astrológico';
		$chart_name   = $this->report_data['chart_name'] ?? 'Sin nombre';
		$birth_data   = $this->report_data['birth_data'] ?? array();

		ob_start();
		?>
<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="UTF-8">
	<title><?php echo esc_html( $report_title . ' - ' . $chart_name ); ?></title>
	<style>
		<?php echo $this->get_css_styles(); ?>
	</style>
</head>
<body>
	<!-- PORTADA -->
	<div class="cover-page">
		<div class="cover-header">
			<?php if ( ! empty( $this->branding['logo_url'] ) ) : ?>
				<img src="<?php echo esc_url( $this->branding['logo_url'] ); ?>" class="logo" alt="Logo">
			<?php endif; ?>
			<h1 class="company-name"><?php echo esc_html( $this->branding['company_name'] ); ?></h1>
			<p class="tagline"><?php echo esc_html( $this->branding['tagline'] ); ?></p>
		</div>

		<div class="cover-content">
			<h2 class="report-title"><?php echo esc_html( $report_title ); ?></h2>
			<div class="decorative-line"></div>

			<?php if ( ! empty( $chart_name ) ) : ?>
				<p class="prepared-for">para</p>
				<h3 class="chart-name"><?php echo esc_html( $chart_name ); ?></h3>
			<?php endif; ?>
		</div>

		<div class="cover-birth-data">
			<?php if ( ! empty( $birth_data['fecha'] ) ) : ?>
				<p><strong>Fecha:</strong> <?php echo esc_html( $birth_data['fecha'] ); ?></p>
			<?php endif; ?>
			<?php if ( ! empty( $birth_data['hora'] ) ) : ?>
				<p><strong>Hora:</strong> <?php echo esc_html( $birth_data['hora'] ); ?></p>
			<?php endif; ?>
			<?php if ( ! empty( $birth_data['lugar'] ) ) : ?>
				<p><strong>Lugar:</strong> <?php echo esc_html( $birth_data['lugar'] ); ?></p>
			<?php endif; ?>
		</div>

		<div class="cover-footer">
			<p>Generado el <?php echo esc_html( gmdate( 'd/m/Y' ) ); ?></p>
			<p><?php echo esc_html( $this->branding['website'] ); ?></p>
		</div>
	</div>

	<!-- ÍNDICE -->
	<div class="page-break"></div>
	<div class="toc-page">
		<h2 class="toc-title">Índice</h2>
		<ul class="toc-list">
			<?php
			$section_num = 1;
			foreach ( $sections as $section ) :
				$title = $section['title'] ?? "Sección {$section_num}";
			?>
				<li>
					<span class="toc-number"><?php echo $section_num; ?>.</span>
					<span class="toc-text"><?php echo esc_html( $title ); ?></span>
				</li>
			<?php
				$section_num++;
			endforeach;
			?>
		</ul>
	</div>

	<!-- SECCIONES DE CONTENIDO -->
	<?php
	$section_num = 1;
	foreach ( $sections as $section ) :
		$title   = $section['title'] ?? "Sección {$section_num}";
		$content = $section['content'] ?? '';
	?>
		<div class="page-break"></div>
		<div class="content-section">
			<div class="section-header">
				<span class="section-number"><?php echo $section_num; ?></span>
				<h2 class="section-title"><?php echo esc_html( $title ); ?></h2>
			</div>
			<div class="section-content">
				<?php echo $this->markdown_to_html( $content ); ?>
			</div>
		</div>
	<?php
		$section_num++;
	endforeach;
	?>

	<!-- TABLA DE POSICIONES (si hay datos) -->
	<?php if ( ! empty( $this->report_data['planets'] ) ) : ?>
		<div class="page-break"></div>
		<div class="content-section">
			<div class="section-header">
				<span class="section-number">A</span>
				<h2 class="section-title">Posiciones Planetarias</h2>
			</div>
			<div class="section-content">
				<?php echo $this->render_planets_table( $this->report_data['planets'] ); ?>
			</div>
		</div>
	<?php endif; ?>

	<!-- PIE DE PÁGINA EN CADA PÁGINA (via CSS) -->
</body>
</html>
		<?php
		return ob_get_clean();
	}

	/**
	 * Obtiene los estilos CSS para el PDF.
	 *
	 * @return string CSS.
	 */
	private function get_css_styles() {
		$primary   = $this->branding['primary_color'];
		$secondary = $this->branding['secondary_color'];
		$accent    = $this->branding['accent_color'];
		$text      = $this->branding['text_color'];

		return <<<CSS
/* Reset y base */
* {
	margin: 0;
	padding: 0;
	box-sizing: border-box;
}

body {
	font-family: 'DejaVu Sans', Arial, sans-serif;
	font-size: 11pt;
	line-height: 1.6;
	color: {$text};
}

/* Saltos de página */
.page-break {
	page-break-after: always;
}

/* PORTADA */
.cover-page {
	height: 100%;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	text-align: center;
	padding: 40px 30px;
}

.cover-header {
	background: linear-gradient(135deg, {$primary} 0%, {$secondary} 100%);
	color: white;
	padding: 40px 20px;
	margin: -40px -30px 0 -30px;
	border-radius: 0 0 30px 30px;
}

.logo {
	max-width: 120px;
	margin-bottom: 15px;
}

.company-name {
	font-size: 28pt;
	font-weight: bold;
	margin-bottom: 5px;
}

.tagline {
	font-size: 14pt;
	font-style: italic;
	opacity: 0.9;
}

.cover-content {
	padding: 60px 0;
}

.report-title {
	font-size: 24pt;
	color: {$primary};
	margin-bottom: 20px;
}

.decorative-line {
	width: 100px;
	height: 3px;
	background: {$accent};
	margin: 0 auto 30px auto;
}

.prepared-for {
	font-size: 14pt;
	color: #666;
	margin-bottom: 10px;
}

.chart-name {
	font-size: 22pt;
	color: {$text};
}

.cover-birth-data {
	background: #f8f9fa;
	padding: 20px;
	border-radius: 10px;
	margin: 30px 50px;
}

.cover-birth-data p {
	margin: 8px 0;
	font-size: 11pt;
}

.cover-footer {
	color: #999;
	font-size: 9pt;
}

/* ÍNDICE */
.toc-page {
	padding: 40px 30px;
}

.toc-title {
	font-size: 20pt;
	color: {$primary};
	margin-bottom: 30px;
	padding-bottom: 10px;
	border-bottom: 2px solid {$secondary};
}

.toc-list {
	list-style: none;
}

.toc-list li {
	padding: 12px 0;
	border-bottom: 1px dotted #ddd;
	font-size: 12pt;
}

.toc-number {
	display: inline-block;
	width: 30px;
	color: {$primary};
	font-weight: bold;
}

.toc-text {
	color: {$text};
}

/* SECCIONES DE CONTENIDO */
.content-section {
	padding: 30px;
}

.section-header {
	display: flex;
	align-items: center;
	margin-bottom: 25px;
	padding-bottom: 15px;
	border-bottom: 2px solid {$secondary};
}

.section-number {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	background: {$primary};
	color: white;
	border-radius: 50%;
	font-size: 16pt;
	font-weight: bold;
	margin-right: 15px;
}

.section-title {
	font-size: 18pt;
	color: {$primary};
}

.section-content {
	text-align: justify;
}

.section-content p {
	margin-bottom: 15px;
}

.section-content h3 {
	font-size: 14pt;
	color: {$primary};
	margin: 25px 0 15px 0;
}

.section-content h4 {
	font-size: 12pt;
	color: {$secondary};
	margin: 20px 0 10px 0;
}

.section-content ul, .section-content ol {
	margin: 15px 0 15px 25px;
}

.section-content li {
	margin-bottom: 8px;
}

.section-content strong {
	color: {$primary};
}

.section-content em {
	color: #555;
}

/* TABLAS */
table {
	width: 100%;
	border-collapse: collapse;
	margin: 20px 0;
}

table th {
	background: {$primary};
	color: white;
	padding: 12px 10px;
	text-align: left;
	font-size: 10pt;
}

table td {
	padding: 10px;
	border-bottom: 1px solid #eee;
	font-size: 10pt;
}

table tr:nth-child(even) {
	background: #f9f9f9;
}

table tr:hover {
	background: #f0f0f0;
}

/* PIE DE PÁGINA */
@page {
	margin: 2cm 2cm 2.5cm 2cm;
}

.page-footer {
	position: fixed;
	bottom: -1.5cm;
	left: 0;
	right: 0;
	height: 1cm;
	font-size: 8pt;
	color: #999;
	border-top: 1px solid #ddd;
	padding-top: 5px;
}

/* Citas y destacados */
blockquote {
	background: #f8f9fa;
	border-left: 4px solid {$accent};
	padding: 15px 20px;
	margin: 20px 0;
	font-style: italic;
}

.highlight-box {
	background: linear-gradient(135deg, rgba(74,85,162,0.1) 0%, rgba(147,112,219,0.1) 100%);
	border: 1px solid {$secondary};
	border-radius: 8px;
	padding: 20px;
	margin: 20px 0;
}

/* Símbolos astrológicos */
.planet-symbol {
	font-size: 14pt;
	margin-right: 5px;
}

.sign-symbol {
	color: {$secondary};
}
CSS;
	}

	/**
	 * Convierte Markdown básico a HTML.
	 *
	 * @param string $markdown Texto en Markdown.
	 * @return string HTML.
	 */
	private function markdown_to_html( $markdown ) {
		$html = $markdown;

		// Escapar HTML existente.
		$html = htmlspecialchars( $html, ENT_NOQUOTES, 'UTF-8' );

		// Headers.
		$html = preg_replace( '/^#### (.+)$/m', '<h5>$1</h5>', $html );
		$html = preg_replace( '/^### (.+)$/m', '<h4>$1</h4>', $html );
		$html = preg_replace( '/^## (.+)$/m', '<h3>$1</h3>', $html );

		// Bold (**texto** o __texto__).
		$html = preg_replace( '/\*\*(.+?)\*\*/', '<strong>$1</strong>', $html );
		$html = preg_replace( '/__(.+?)__/', '<strong>$1</strong>', $html );

		// Italic (*texto* o _texto_).
		$html = preg_replace( '/\*([^*]+?)\*/', '<em>$1</em>', $html );
		$html = preg_replace( '/_([^_]+?)_/', '<em>$1</em>', $html );

		// Listas con guión (- item).
		$html = preg_replace( '/^- (.+)$/m', '<li>$1</li>', $html );

		// Envolver listas consecutivas en <ul>.
		$html = preg_replace( '/(<li>.*<\/li>\n?)+/s', '<ul>$0</ul>', $html );

		// Listas numeradas (1. item).
		$html = preg_replace( '/^\d+\. (.+)$/m', '<oli>$1</oli>', $html );
		$html = preg_replace( '/(<oli>.*<\/oli>\n?)+/s', '<ol>$0</ol>', $html );
		$html = str_replace( array( '<oli>', '</oli>' ), array( '<li>', '</li>' ), $html );

		// Blockquotes (> texto).
		$html = preg_replace( '/^> (.+)$/m', '<blockquote>$1</blockquote>', $html );

		// Párrafos (doble salto de línea).
		$html = preg_replace( '/\n\n+/', '</p><p>', $html );

		// Saltos de línea simples.
		$html = preg_replace( '/\n/', '<br>', $html );

		// Envolver en párrafo.
		$html = '<p>' . $html . '</p>';

		// Limpiar párrafos vacíos y mal formados.
		$html = preg_replace( '/<p>\s*<\/p>/', '', $html );
		$html = preg_replace( '/<p>\s*<(ul|ol|h[1-6]|blockquote)/', '<$1', $html );
		$html = preg_replace( '/<\/(ul|ol|h[1-6]|blockquote)>\s*<\/p>/', '</$1>', $html );

		return $html;
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

		foreach ( $parts as $index => $part ) {
			$lines = explode( "\n", $part, 2 );
			$title = trim( $lines[0] );
			$body  = isset( $lines[1] ) ? trim( $lines[1] ) : '';

			if ( empty( $title ) && empty( $body ) ) {
				continue;
			}

			// Si el título es muy largo, probablemente no es un título real.
			if ( strlen( $title ) > 100 || empty( $title ) ) {
				if ( $index === 0 ) {
					$title = 'Introducción';
				} else {
					$title = 'Sección ' . ( $index + 1 );
				}
				$body = $part;
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
	 * Renderiza tabla de posiciones planetarias.
	 *
	 * @param array $planets Array de posiciones planetarias.
	 * @return string HTML de la tabla.
	 */
	private function render_planets_table( $planets ) {
		if ( empty( $planets ) ) {
			return '';
		}

		$html = '<table>';
		$html .= '<thead><tr>';
		$html .= '<th>Planeta</th>';
		$html .= '<th>Signo</th>';
		$html .= '<th>Grado</th>';
		$html .= '<th>Casa</th>';
		$html .= '<th>Estado</th>';
		$html .= '</tr></thead>';
		$html .= '<tbody>';

		foreach ( $planets as $planet => $data ) {
			$degree = isset( $data['degree'] ) ? $data['degree'] : 0;
			$minute = isset( $data['minute'] ) ? $data['minute'] : 0;
			$sign   = isset( $data['sign'] ) ? $data['sign'] : '-';
			$house  = isset( $data['house'] ) ? $data['house'] : '-';
			$retro  = ! empty( $data['retrograde'] ) ? 'Retrógrado' : 'Directo';

			$html .= '<tr>';
			$html .= '<td><strong>' . esc_html( $planet ) . '</strong></td>';
			$html .= '<td>' . esc_html( $sign ) . '</td>';
			$html .= '<td>' . $degree . '° ' . $minute . "'</td>";
			$html .= '<td style="text-align: center;">' . esc_html( $house ) . '</td>';
			$html .= '<td>' . $retro . '</td>';
			$html .= '</tr>';
		}

		$html .= '</tbody></table>';

		return $html;
	}

	/**
	 * Obtiene el contenido binario del PDF (sin guardarlo en archivo).
	 *
	 * @param array|string $content     Contenido del informe.
	 * @param array        $report_data Datos del informe.
	 * @return string|WP_Error Contenido binario del PDF o error.
	 */
	public function generate_content( $content, $report_data ) {
		if ( ! class_exists( 'Dompdf\Dompdf' ) ) {
			return new WP_Error( 'dompdf_missing', 'DOMPDF no está instalado.' );
		}

		$this->report_data = $report_data;

		$options = new Options();
		$options->set( 'isHtml5ParserEnabled', true );
		$options->set( 'isRemoteEnabled', true );
		$options->set( 'defaultFont', 'DejaVu Sans' );

		$this->dompdf = new Dompdf( $options );

		if ( is_string( $content ) ) {
			$content = $this->parse_content_to_sections( $content );
		}

		$html = $this->render_html( $content );

		$this->dompdf->loadHtml( $html );
		$this->dompdf->setPaper( 'A4', 'portrait' );
		$this->dompdf->render();

		return $this->dompdf->output();
	}

	/**
	 * Establece una plantilla HTML personalizada.
	 *
	 * @param string $template_path Ruta a la plantilla HTML.
	 * @return self
	 */
	public function set_template( $template_path ) {
		if ( file_exists( $template_path ) ) {
			$this->custom_template = $template_path;
		}
		return $this;
	}

	/**
	 * Establece el branding personalizado.
	 *
	 * @param array $branding Array de configuración de branding.
	 * @return self
	 */
	public function set_branding( $branding ) {
		$this->branding = wp_parse_args( $branding, self::DEFAULT_BRANDING );
		return $this;
	}
}
