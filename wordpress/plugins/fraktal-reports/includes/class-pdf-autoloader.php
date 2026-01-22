<?php
/**
 * Autoloader para bibliotecas de PDF (DOMPDF).
 * Intenta cargar DOMPDF de múltiples fuentes para flexibilidad de instalación.
 *
 * @package FraktalReports
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Clase que maneja la carga automática de DOMPDF.
 */
class Fraktal_PDF_Autoloader {

	/**
	 * Indica si DOMPDF fue cargado correctamente.
	 *
	 * @var bool
	 */
	private static $loaded = false;

	/**
	 * Método de carga utilizado.
	 *
	 * @var string
	 */
	private static $load_method = '';

	/**
	 * Intenta cargar DOMPDF de múltiples fuentes.
	 *
	 * Orden de prioridad:
	 * 1. Composer autoload (vendor/autoload.php)
	 * 2. Librería bundled (lib/dompdf/autoload.inc.php)
	 * 3. WordPress wp-content/lib/dompdf (instalación compartida)
	 *
	 * @return bool True si se cargó correctamente, false en caso contrario.
	 */
	public static function load() {
		if ( self::$loaded ) {
			return true;
		}

		// 1. Intentar Composer autoload
		$composer_path = DECANO_PLUGIN_DIR . 'vendor/autoload.php';
		if ( file_exists( $composer_path ) ) {
			require_once $composer_path;
			if ( class_exists( '\Dompdf\Dompdf' ) ) {
				self::$loaded = true;
				self::$load_method = 'composer';
				return true;
			}
		}

		// 2. Intentar librería bundled en el plugin
		$bundled_path = DECANO_PLUGIN_DIR . 'lib/dompdf/autoload.inc.php';
		if ( file_exists( $bundled_path ) ) {
			require_once $bundled_path;
			if ( class_exists( '\Dompdf\Dompdf' ) ) {
				self::$loaded = true;
				self::$load_method = 'bundled';
				return true;
			}
		}

		// 3. Intentar instalación compartida en WordPress
		$shared_path = WP_CONTENT_DIR . '/lib/dompdf/autoload.inc.php';
		if ( file_exists( $shared_path ) ) {
			require_once $shared_path;
			if ( class_exists( '\Dompdf\Dompdf' ) ) {
				self::$loaded = true;
				self::$load_method = 'shared';
				return true;
			}
		}

		// 4. Intentar carga alternativa desde lib sin autoloader
		$alt_bundled = DECANO_PLUGIN_DIR . 'lib/dompdf/src/Dompdf.php';
		if ( file_exists( $alt_bundled ) ) {
			self::register_psr4_autoloader();
			if ( class_exists( '\Dompdf\Dompdf' ) ) {
				self::$loaded = true;
				self::$load_method = 'manual';
				return true;
			}
		}

		return false;
	}

	/**
	 * Verifica si DOMPDF está disponible.
	 *
	 * @return bool
	 */
	public static function is_available() {
		if ( ! self::$loaded ) {
			self::load();
		}
		return self::$loaded || class_exists( '\Dompdf\Dompdf' );
	}

	/**
	 * Obtiene el método de carga utilizado.
	 *
	 * @return string
	 */
	public static function get_load_method() {
		return self::$load_method;
	}

	/**
	 * Obtiene instrucciones de instalación para el admin.
	 *
	 * @return string HTML con instrucciones.
	 */
	public static function get_install_instructions() {
		$plugin_dir = DECANO_PLUGIN_DIR;

		return sprintf(
			'<div class="notice notice-error"><p><strong>DOMPDF no está instalado.</strong></p>
			<p>Para generar PDFs, necesitas instalar DOMPDF. Elige una opción:</p>
			<ol>
				<li><strong>Opción A (Recomendada):</strong> Descarga DOMPDF y extrae en <code>%s/lib/dompdf/</code></li>
				<li><strong>Opción B (Desarrolladores):</strong> Ejecuta <code>composer install</code> en la carpeta del plugin</li>
			</ol>
			<p><a href="%s" class="button button-primary" target="_blank">Descargar DOMPDF</a></p>
			</div>',
			esc_html( $plugin_dir ),
			'https://github.com/dompdf/dompdf/releases/latest'
		);
	}

	/**
	 * Registra un autoloader PSR-4 simple para DOMPDF.
	 * Usado como fallback cuando no hay autoload.inc.php.
	 */
	private static function register_psr4_autoloader() {
		spl_autoload_register( function ( $class ) {
			// Solo manejar clases de Dompdf
			$prefixes = array(
				'Dompdf\\'         => DECANO_PLUGIN_DIR . 'lib/dompdf/src/',
				'FontLib\\'        => DECANO_PLUGIN_DIR . 'lib/php-font-lib/src/FontLib/',
				'Sabberworm\\CSS\\' => DECANO_PLUGIN_DIR . 'lib/php-css-parser/src/',
				'Svg\\'            => DECANO_PLUGIN_DIR . 'lib/php-svg-lib/src/Svg/',
			);

			foreach ( $prefixes as $prefix => $base_dir ) {
				$len = strlen( $prefix );
				if ( strncmp( $prefix, $class, $len ) !== 0 ) {
					continue;
				}

				$relative_class = substr( $class, $len );
				$file = $base_dir . str_replace( '\\', '/', $relative_class ) . '.php';

				if ( file_exists( $file ) ) {
					require $file;
					return;
				}
			}
		} );
	}

	/**
	 * Intenta descargar e instalar DOMPDF automáticamente.
	 * Solo para uso administrativo, requiere permisos de escritura.
	 *
	 * @return bool|WP_Error True si se instaló correctamente, WP_Error en caso contrario.
	 */
	public static function auto_install() {
		// Verificar permisos
		$lib_dir = DECANO_PLUGIN_DIR . 'lib/';
		if ( ! is_writable( DECANO_PLUGIN_DIR ) ) {
			return new WP_Error( 'not_writable', 'El directorio del plugin no tiene permisos de escritura.' );
		}

		// Crear directorio lib si no existe
		if ( ! file_exists( $lib_dir ) ) {
			if ( ! wp_mkdir_p( $lib_dir ) ) {
				return new WP_Error( 'mkdir_failed', 'No se pudo crear el directorio lib.' );
			}
		}

		// URL de descarga de DOMPDF (versión estable)
		$dompdf_url = 'https://github.com/dompdf/dompdf/releases/download/v2.0.4/dompdf_2-0-4.zip';

		// Descargar archivo
		$tmp_file = download_url( $dompdf_url );
		if ( is_wp_error( $tmp_file ) ) {
			return $tmp_file;
		}

		// Extraer archivo
		$result = unzip_file( $tmp_file, $lib_dir );
		@unlink( $tmp_file );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		// Renombrar directorio si es necesario
		$extracted_dir = $lib_dir . 'dompdf_2-0-4';
		$target_dir = $lib_dir . 'dompdf';

		if ( file_exists( $extracted_dir ) && ! file_exists( $target_dir ) ) {
			rename( $extracted_dir, $target_dir );
		}

		// Verificar que la instalación fue exitosa
		if ( file_exists( $target_dir . '/autoload.inc.php' ) ) {
			return true;
		}

		return new WP_Error( 'install_failed', 'La instalación no se completó correctamente.' );
	}

	/**
	 * Obtiene información de diagnóstico sobre el estado de DOMPDF.
	 *
	 * @return array
	 */
	public static function get_diagnostic_info() {
		self::load();

		return array(
			'available'     => self::is_available(),
			'load_method'   => self::$load_method,
			'composer_path' => array(
				'path'   => DECANO_PLUGIN_DIR . 'vendor/autoload.php',
				'exists' => file_exists( DECANO_PLUGIN_DIR . 'vendor/autoload.php' ),
			),
			'bundled_path'  => array(
				'path'   => DECANO_PLUGIN_DIR . 'lib/dompdf/autoload.inc.php',
				'exists' => file_exists( DECANO_PLUGIN_DIR . 'lib/dompdf/autoload.inc.php' ),
			),
			'shared_path'   => array(
				'path'   => WP_CONTENT_DIR . '/lib/dompdf/autoload.inc.php',
				'exists' => file_exists( WP_CONTENT_DIR . '/lib/dompdf/autoload.inc.php' ),
			),
			'lib_writable'  => is_writable( DECANO_PLUGIN_DIR ),
		);
	}
}
