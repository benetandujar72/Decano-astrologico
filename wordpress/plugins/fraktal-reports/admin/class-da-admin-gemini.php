<?php
/**
 * Configuración de Gemini API
 *
 * @package Decano_Astrologico
 * @since 1.2.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Clase para gestionar la configuración de Gemini API.
 */
class DA_Admin_Gemini {

	/**
	 * Opción para almacenar la API key de Gemini.
	 */
	const OPTION_API_KEY = 'fraktal_gemini_api_key';

	/**
	 * Opción para almacenar el modelo preferido.
	 */
	const OPTION_MODEL = 'fraktal_gemini_model';

	/**
	 * Inicializar hooks.
	 */
	public static function init() {
		add_action( 'wp_ajax_fraktal_save_gemini_key', array( __CLASS__, 'ajax_save_api_key' ) );
		add_action( 'wp_ajax_fraktal_test_gemini', array( __CLASS__, 'ajax_test_connection' ) );
		add_action( 'wp_ajax_fraktal_delete_gemini_key', array( __CLASS__, 'ajax_delete_api_key' ) );
	}

	/**
	 * Obtiene la API key almacenada.
	 *
	 * @return string API key o cadena vacía.
	 */
	public static function get_api_key() {
		$encrypted = get_option( self::OPTION_API_KEY, '' );
		if ( empty( $encrypted ) ) {
			return '';
		}
		return self::decrypt( $encrypted );
	}

	/**
	 * Guarda la API key encriptada.
	 *
	 * @param string $api_key API key a guardar.
	 * @return bool True si se guardó correctamente.
	 */
	public static function save_api_key( $api_key ) {
		if ( empty( $api_key ) ) {
			return delete_option( self::OPTION_API_KEY );
		}
		$encrypted = self::encrypt( $api_key );
		return update_option( self::OPTION_API_KEY, $encrypted );
	}

	/**
	 * Obtiene el modelo preferido.
	 *
	 * @return string Modelo de Gemini.
	 */
	public static function get_model() {
		return get_option( self::OPTION_MODEL, 'gemini-3-flash-preview' );
	}

	/**
	 * Encripta un valor usando la AUTH_KEY de WordPress.
	 *
	 * @param string $value Valor a encriptar.
	 * @return string Valor encriptado en base64.
	 */
	private static function encrypt( $value ) {
		if ( ! defined( 'AUTH_KEY' ) || empty( AUTH_KEY ) ) {
			// Fallback: usar base64 simple si no hay AUTH_KEY.
			return base64_encode( $value );
		}

		$key    = hash( 'sha256', AUTH_KEY, true );
		$iv     = substr( hash( 'sha256', SECURE_AUTH_KEY, true ), 0, 16 );
		$cipher = openssl_encrypt( $value, 'AES-256-CBC', $key, 0, $iv );

		return base64_encode( $cipher );
	}

	/**
	 * Desencripta un valor.
	 *
	 * @param string $encrypted Valor encriptado en base64.
	 * @return string Valor desencriptado.
	 */
	private static function decrypt( $encrypted ) {
		if ( ! defined( 'AUTH_KEY' ) || empty( AUTH_KEY ) ) {
			return base64_decode( $encrypted );
		}

		$key    = hash( 'sha256', AUTH_KEY, true );
		$iv     = substr( hash( 'sha256', SECURE_AUTH_KEY, true ), 0, 16 );
		$cipher = base64_decode( $encrypted );

		return openssl_decrypt( $cipher, 'AES-256-CBC', $key, 0, $iv );
	}

	/**
	 * Enmascara la API key para mostrarla.
	 *
	 * @param string $api_key API key completa.
	 * @return string API key enmascarada.
	 */
	public static function mask_api_key( $api_key ) {
		if ( empty( $api_key ) ) {
			return '';
		}
		$length = strlen( $api_key );
		if ( $length <= 8 ) {
			return str_repeat( '*', $length );
		}
		return substr( $api_key, 0, 4 ) . str_repeat( '*', $length - 8 ) . substr( $api_key, -4 );
	}

	/**
	 * AJAX: Guardar API key.
	 */
	public static function ajax_save_api_key() {
		check_ajax_referer( 'fraktal_gemini_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => 'No tienes permisos para realizar esta acción.' ), 403 );
		}

		$api_key = isset( $_POST['api_key'] ) ? sanitize_text_field( wp_unslash( $_POST['api_key'] ) ) : '';
		$model   = isset( $_POST['model'] ) ? sanitize_text_field( wp_unslash( $_POST['model'] ) ) : 'gemini-3-flash-preview';

		if ( empty( $api_key ) ) {
			wp_send_json_error( array( 'message' => 'La API key no puede estar vacía.' ), 400 );
		}

		// Validar formato básico de API key de Google.
		if ( ! preg_match( '/^AIza[0-9A-Za-z\-_]{35}$/', $api_key ) ) {
			wp_send_json_error( array( 'message' => 'El formato de la API key no parece válido. Debe comenzar con "AIza" y tener 39 caracteres.' ), 400 );
		}

		// Guardar.
		self::save_api_key( $api_key );
		update_option( self::OPTION_MODEL, $model );

		wp_send_json_success( array(
			'message'    => 'API key guardada correctamente.',
			'masked_key' => self::mask_api_key( $api_key ),
		) );
	}

	/**
	 * AJAX: Eliminar API key.
	 */
	public static function ajax_delete_api_key() {
		check_ajax_referer( 'fraktal_gemini_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => 'No tienes permisos para realizar esta acción.' ), 403 );
		}

		delete_option( self::OPTION_API_KEY );

		wp_send_json_success( array( 'message' => 'API key eliminada.' ) );
	}

	/**
	 * AJAX: Testear conexión con Gemini API.
	 */
	public static function ajax_test_connection() {
		check_ajax_referer( 'fraktal_gemini_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => 'No tienes permisos para realizar esta acción.' ), 403 );
		}

		$api_key = self::get_api_key();
		if ( empty( $api_key ) ) {
			wp_send_json_error( array( 'message' => 'No hay API key configurada. Guarda una primero.' ), 400 );
		}

		$model = self::get_model();
		$result = self::test_gemini_api( $api_key, $model );

		if ( is_wp_error( $result ) ) {
			wp_send_json_error( array(
				'message' => $result->get_error_message(),
				'code'    => $result->get_error_code(),
			), 400 );
		}

		wp_send_json_success( $result );
	}

	/**
	 * Realiza una llamada de prueba a la API de Gemini.
	 *
	 * @param string $api_key API key.
	 * @param string $model   Modelo a usar.
	 * @return array|WP_Error Resultado del test o error.
	 */
	public static function test_gemini_api( $api_key, $model = 'gemini-3-flash-preview' ) {
		$url = sprintf(
			'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s',
			$model,
			$api_key
		);

		$body = array(
			'contents' => array(
				array(
					'parts' => array(
						array(
							'text' => 'Responde solamente con la palabra "OK" si puedes leer este mensaje.',
						),
					),
				),
			),
			'generationConfig' => array(
				'maxOutputTokens' => 10,
				'temperature'     => 0,
			),
		);

		$start_time = microtime( true );

		$response = wp_remote_post( $url, array(
			'timeout' => 30,
			'headers' => array(
				'Content-Type' => 'application/json',
			),
			'body'    => wp_json_encode( $body ),
		) );

		$elapsed_time = round( ( microtime( true ) - $start_time ) * 1000 );

		if ( is_wp_error( $response ) ) {
			return new WP_Error( 'connection_error', 'Error de conexión: ' . $response->get_error_message() );
		}

		$status_code = wp_remote_retrieve_response_code( $response );
		$body        = wp_remote_retrieve_body( $response );
		$data        = json_decode( $body, true );

		// Errores comunes de la API.
		if ( $status_code === 400 ) {
			$error_msg = isset( $data['error']['message'] ) ? $data['error']['message'] : 'Petición inválida';
			return new WP_Error( 'bad_request', 'Error 400: ' . $error_msg );
		}

		if ( $status_code === 401 || $status_code === 403 ) {
			return new WP_Error( 'auth_error', 'Error de autenticación: La API key no es válida o no tiene permisos.' );
		}

		if ( $status_code === 404 ) {
			return new WP_Error( 'model_not_found', 'El modelo "' . $model . '" no existe o no está disponible.' );
		}

		if ( $status_code === 429 ) {
			return new WP_Error( 'rate_limit', 'Límite de peticiones excedido. Espera un momento y vuelve a intentar.' );
		}

		if ( $status_code >= 500 ) {
			return new WP_Error( 'server_error', 'Error del servidor de Google (HTTP ' . $status_code . '). Intenta más tarde.' );
		}

		if ( $status_code !== 200 ) {
			return new WP_Error( 'unknown_error', 'Error HTTP ' . $status_code . ': ' . $body );
		}

		// Extraer respuesta.
		$response_text = '';
		if ( isset( $data['candidates'][0]['content']['parts'][0]['text'] ) ) {
			$response_text = $data['candidates'][0]['content']['parts'][0]['text'];
		}

		// Información de uso.
		$tokens_used = 0;
		if ( isset( $data['usageMetadata']['totalTokenCount'] ) ) {
			$tokens_used = $data['usageMetadata']['totalTokenCount'];
		}

		return array(
			'success'      => true,
			'message'      => 'Conexión exitosa con Gemini API.',
			'model'        => $model,
			'response'     => trim( $response_text ),
			'tokens_used'  => $tokens_used,
			'response_ms'  => $elapsed_time,
		);
	}

	/**
	 * Renderiza la página de configuración de Gemini.
	 */
	public static function render_settings_page() {
		$api_key    = self::get_api_key();
		$has_key    = ! empty( $api_key );
		$masked_key = $has_key ? self::mask_api_key( $api_key ) : '';
		$model      = self::get_model();

		$available_models = array(
			'gemini-3-flash-preview'   => 'Gemini 3 Flash (Rápido, recomendado)',
			'gemini-3-pro-preview'     => 'Gemini 3 Pro (Más potente)',
		);

		?>
		<div class="wrap">
			<h1>
				<span class="dashicons dashicons-admin-generic" style="font-size: 28px; margin-right: 10px;"></span>
				Configuración de Gemini API
			</h1>

			<div class="notice notice-info" style="margin: 20px 0;">
				<p>
					<strong>Gemini API</strong> se utiliza para generar el contenido de los informes astrológicos con inteligencia artificial.
					Puedes obtener una API key gratuita en <a href="https://aistudio.google.com/app/apikey" target="_blank">Google AI Studio</a>.
				</p>
			</div>

			<div class="da-gemini-settings" style="max-width: 800px;">
				<!-- Estado actual -->
				<div class="da-gemini-status" style="background: #fff; padding: 20px; border: 1px solid #ccd0d4; margin-bottom: 20px;">
					<h2 style="margin-top: 0;">Estado de la Conexión</h2>

					<?php if ( $has_key ) : ?>
						<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
							<span class="dashicons dashicons-yes-alt" style="color: #00a32a; font-size: 24px;"></span>
							<span style="font-size: 16px;">API Key configurada: <code><?php echo esc_html( $masked_key ); ?></code></span>
						</div>
					<?php else : ?>
						<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
							<span class="dashicons dashicons-warning" style="color: #dba617; font-size: 24px;"></span>
							<span style="font-size: 16px;">No hay API Key configurada</span>
						</div>
					<?php endif; ?>

					<div id="gemini-test-result" style="display: none; margin-top: 15px; padding: 15px; border-radius: 4px;"></div>

					<button type="button" id="btn-test-gemini" class="button button-secondary" <?php echo $has_key ? '' : 'disabled'; ?>>
						<span class="dashicons dashicons-yes" style="margin-top: 3px;"></span>
						Probar Conexión
					</button>
				</div>

				<!-- Formulario de configuración -->
				<div class="da-gemini-form" style="background: #fff; padding: 20px; border: 1px solid #ccd0d4;">
					<h2 style="margin-top: 0;"><?php echo $has_key ? 'Actualizar' : 'Configurar'; ?> API Key</h2>

					<form id="gemini-settings-form">
						<?php wp_nonce_field( 'fraktal_gemini_nonce', 'gemini_nonce' ); ?>

						<table class="form-table">
							<tr>
								<th scope="row">
									<label for="gemini_api_key">API Key de Gemini</label>
								</th>
								<td>
									<input type="password"
										   name="gemini_api_key"
										   id="gemini_api_key"
										   class="regular-text"
										   placeholder="AIza..."
										   autocomplete="off">
									<button type="button" id="toggle-api-key" class="button button-secondary" style="margin-left: 5px;">
										<span class="dashicons dashicons-visibility" style="margin-top: 3px;"></span>
									</button>
									<p class="description">
										Obtén tu API key en <a href="https://aistudio.google.com/app/apikey" target="_blank">Google AI Studio</a>.
										La clave se almacena encriptada.
									</p>
								</td>
							</tr>
							<tr>
								<th scope="row">
									<label for="gemini_model">Modelo</label>
								</th>
								<td>
									<select name="gemini_model" id="gemini_model">
										<?php foreach ( $available_models as $model_id => $model_name ) : ?>
											<option value="<?php echo esc_attr( $model_id ); ?>" <?php selected( $model, $model_id ); ?>>
												<?php echo esc_html( $model_name ); ?>
											</option>
										<?php endforeach; ?>
									</select>
									<p class="description">
										Gemini 3 Flash ofrece el mejor equilibrio entre velocidad y calidad.
									</p>
								</td>
							</tr>
						</table>

						<p class="submit">
							<button type="submit" id="btn-save-gemini" class="button button-primary">
								<span class="dashicons dashicons-saved" style="margin-top: 3px;"></span>
								Guardar API Key
							</button>
							<?php if ( $has_key ) : ?>
								<button type="button" id="btn-delete-gemini" class="button button-link-delete" style="margin-left: 15px;">
									Eliminar API Key
								</button>
							<?php endif; ?>
						</p>
					</form>
				</div>

				<!-- Información adicional -->
				<div class="da-gemini-info" style="background: #f0f0f1; padding: 20px; border: 1px solid #ccd0d4; margin-top: 20px;">
					<h3 style="margin-top: 0;">
						<span class="dashicons dashicons-info"></span>
						Información sobre Gemini API
					</h3>
					<ul style="margin-left: 20px;">
						<li><strong>Gratis:</strong> Google ofrece un nivel gratuito generoso para Gemini API.</li>
						<li><strong>Límites:</strong> El plan gratuito permite hasta 60 peticiones por minuto.</li>
						<li><strong>Privacidad:</strong> Los datos se procesan en los servidores de Google.</li>
						<li><strong>Modelos:</strong> Gemini 3 Flash es el más reciente y eficiente.</li>
					</ul>
					<p>
						<a href="https://ai.google.dev/pricing" target="_blank">Ver precios y límites de Gemini API →</a>
					</p>
				</div>
			</div>
		</div>

		<script>
		jQuery(document).ready(function($) {
			var nonce = $('#gemini_nonce').val();

			// Toggle visibilidad de API key
			$('#toggle-api-key').on('click', function() {
				var input = $('#gemini_api_key');
				var icon = $(this).find('.dashicons');
				if (input.attr('type') === 'password') {
					input.attr('type', 'text');
					icon.removeClass('dashicons-visibility').addClass('dashicons-hidden');
				} else {
					input.attr('type', 'password');
					icon.removeClass('dashicons-hidden').addClass('dashicons-visibility');
				}
			});

			// Guardar API key
			$('#gemini-settings-form').on('submit', function(e) {
				e.preventDefault();

				var apiKey = $('#gemini_api_key').val().trim();
				var model = $('#gemini_model').val();

				if (!apiKey) {
					alert('Por favor, introduce una API key.');
					return;
				}

				var $btn = $('#btn-save-gemini');
				$btn.prop('disabled', true).html('<span class="dashicons dashicons-update spin"></span> Guardando...');

				$.ajax({
					url: ajaxurl,
					type: 'POST',
					data: {
						action: 'fraktal_save_gemini_key',
						nonce: nonce,
						api_key: apiKey,
						model: model
					},
					success: function(response) {
						if (response.success) {
							showResult('success', response.data.message);
							$('#gemini_api_key').val('');
							$('#btn-test-gemini').prop('disabled', false);
							setTimeout(function() { location.reload(); }, 1500);
						} else {
							showResult('error', response.data.message);
						}
					},
					error: function() {
						showResult('error', 'Error de conexión. Inténtalo de nuevo.');
					},
					complete: function() {
						$btn.prop('disabled', false).html('<span class="dashicons dashicons-saved" style="margin-top: 3px;"></span> Guardar API Key');
					}
				});
			});

			// Eliminar API key
			$('#btn-delete-gemini').on('click', function() {
				if (!confirm('¿Estás seguro de que quieres eliminar la API key?')) {
					return;
				}

				var $btn = $(this);
				$btn.prop('disabled', true).text('Eliminando...');

				$.ajax({
					url: ajaxurl,
					type: 'POST',
					data: {
						action: 'fraktal_delete_gemini_key',
						nonce: nonce
					},
					success: function(response) {
						if (response.success) {
							showResult('success', response.data.message);
							setTimeout(function() { location.reload(); }, 1000);
						} else {
							showResult('error', response.data.message);
						}
					},
					error: function() {
						showResult('error', 'Error de conexión.');
					},
					complete: function() {
						$btn.prop('disabled', false).text('Eliminar API Key');
					}
				});
			});

			// Probar conexión
			$('#btn-test-gemini').on('click', function() {
				var $btn = $(this);
				$btn.prop('disabled', true).html('<span class="dashicons dashicons-update spin"></span> Probando...');

				$.ajax({
					url: ajaxurl,
					type: 'POST',
					data: {
						action: 'fraktal_test_gemini',
						nonce: nonce
					},
					success: function(response) {
						if (response.success) {
							var html = '<strong>✓ ' + response.data.message + '</strong><br>' +
								'<small>Modelo: ' + response.data.model + ' | ' +
								'Respuesta: "' + response.data.response + '" | ' +
								'Tokens: ' + response.data.tokens_used + ' | ' +
								'Tiempo: ' + response.data.response_ms + 'ms</small>';
							showResult('success', html);
						} else {
							showResult('error', response.data.message);
						}
					},
					error: function() {
						showResult('error', 'Error de conexión. Inténtalo de nuevo.');
					},
					complete: function() {
						$btn.prop('disabled', false).html('<span class="dashicons dashicons-yes" style="margin-top: 3px;"></span> Probar Conexión');
					}
				});
			});

			function showResult(type, message) {
				var $result = $('#gemini-test-result');
				$result.removeClass('notice-success notice-error')
					.addClass(type === 'success' ? 'notice-success' : 'notice-error')
					.css({
						'display': 'block',
						'background': type === 'success' ? '#d4edda' : '#f8d7da',
						'border-left': '4px solid ' + (type === 'success' ? '#00a32a' : '#dc3232')
					})
					.html(message);
			}
		});
		</script>

		<style>
			.spin {
				animation: spin 1s linear infinite;
			}
			@keyframes spin {
				100% { transform: rotate(360deg); }
			}
			.da-gemini-settings .dashicons {
				vertical-align: middle;
			}
		</style>
		<?php
	}
}

// Inicializar.
DA_Admin_Gemini::init();
