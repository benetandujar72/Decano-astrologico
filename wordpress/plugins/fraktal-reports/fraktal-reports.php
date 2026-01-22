<?php
/**
 * Plugin Name: Decano Astrológico
 * Plugin URI: https://app.programafraktal.com
 * Description: Sistema completo de generación de informes astrológicos con WooCommerce, múltiples planes (Free/Premium/Enterprise) y panel de administración avanzado.
 * Version: 1.1.0
 * Author: Decano Team
 * Author URI: https://app.programafraktal.com
 * License: GPL-2.0+
 * License URI: http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain: decano-astrologico
 * Domain Path: /languages
 * Requires at least: 6.0
 * Requires PHP: 8.0
 */

if (!defined('ABSPATH')) {
    exit;
}

// Definir constantes del plugin
define('DECANO_VERSION', '1.1.0');
define('DECANO_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('DECANO_PLUGIN_URL', plugin_dir_url(__FILE__));
define('DECANO_PLUGIN_BASENAME', plugin_basename(__FILE__));

// Configuración de Supabase (Hello World)
// Proyecto: asgnyckayusnmbozocxh
define( 'FRAKTAL_SUPABASE_URL', 'https://asgnyckayusnmbozocxh.supabase.co' );

// ANON_KEY - Para obtener esta clave:
// 1. Ir a Supabase Dashboard > Settings > API
// 2. Copiar "anon public" key del proyecto asgnyckayusnmbozocxh
// NOTA: Temporalmente usando SERVICE_KEY, pero se debe configurar la ANON_KEY correcta
define( 'FRAKTAL_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzZ255Y2theXVzbm1ib3pvY3hoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg4NTI4MzgsImV4cCI6MjA4NDQyODgzOH0.UQkkZN2nJ6q96ZR86iw4NBTtRY_UcJkBXUnTQ4V-_64' );

// SERVICE_KEY para operaciones privilegiadas (Edge Functions, operaciones admin)
// IMPORTANTE: Esta clave tiene acceso completo - nunca exponer en frontend
define( 'FRAKTAL_SUPABASE_SERVICE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzZ255Y2theXVzbm1ib3pvY3hoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODg4NTI4MzgsImV4cCI6MjA4NDQyODgzOH0.UQkkZN2nJ6q96ZR86iw4NBTtRY_UcJkBXUnTQ4V-_64' );

// Feature flag: true = usar Supabase, false = usar FastAPI legacy
define( 'FRAKTAL_USE_SUPABASE', true );

// Cargar clases de Supabase
require_once DECANO_PLUGIN_DIR . 'includes/class-supabase-client.php';
require_once DECANO_PLUGIN_DIR . 'includes/class-supabase-auth.php';
require_once DECANO_PLUGIN_DIR . 'includes/class-supabase-reports.php';
require_once DECANO_PLUGIN_DIR . 'includes/class-supabase-storage.php';
require_once DECANO_PLUGIN_DIR . 'includes/class-report-type-config.php';

// Cargar autoloader de PDF (gestiona DOMPDF desde múltiples fuentes)
require_once DECANO_PLUGIN_DIR . 'includes/class-pdf-autoloader.php';
require_once DECANO_PLUGIN_DIR . 'includes/class-report-pdf-generator.php';
require_once DECANO_PLUGIN_DIR . 'includes/class-supabase-report-processor.php';

/**
 * Activación del plugin con diagnóstico extensivo
 */
function activate_decano() {
    // LOG 1: Inicio de activación
    error_log('=== DECANO ACTIVATION START ===');
    error_log('Plugin dir: ' . DECANO_PLUGIN_DIR);
    error_log('Plugin version: ' . DECANO_VERSION);

    try {
        // LOG 2: Verificar PHP
        error_log('Checking PHP version...');
        error_log('Current PHP: ' . PHP_VERSION);
        if (version_compare(PHP_VERSION, '8.0', '<')) {
            error_log('ERROR: PHP version insufficient');
            wp_die('Este plugin requiere PHP 8.0 o superior. Tu versión actual es: ' . PHP_VERSION);
        }
        error_log('✓ PHP version OK');

        // LOG 3: Verificar WordPress
        error_log('Checking WordPress version...');
        global $wp_version;
        error_log('WordPress version: ' . $wp_version);
        error_log('✓ WordPress version OK');

        // LOG 4: Verificar WooCommerce
        error_log('Checking WooCommerce...');
        if (!class_exists('WooCommerce')) {
            error_log('ERROR: WooCommerce not found');
            wp_die(
                '<h1>WooCommerce Requerido</h1>' .
                '<p>Este plugin requiere <strong>WooCommerce</strong> instalado y activado.</p>' .
                '<p>Por favor, instala WooCommerce primero desde <a href="' . admin_url('plugin-install.php?s=woocommerce&tab=search&type=term') . '">Plugins > Añadir nuevo</a></p>' .
                '<p><a href="' . admin_url('plugins.php') . '">← Volver a Plugins</a></p>'
            );
        }
        error_log('✓ WooCommerce class found');

        // LOG 5: Verificar archivo activator existe
        error_log('Checking activator file...');
        $activator_path = DECANO_PLUGIN_DIR . 'includes/class-da-activator.php';
        error_log('Activator path: ' . $activator_path);

        if (!file_exists($activator_path)) {
            error_log('ERROR: Activator file not found');
            wp_die(
                '<h1>Error de Instalación</h1>' .
                '<p>Archivo faltante: <code>includes/class-da-activator.php</code></p>' .
                '<p>Por favor, reinstala el plugin desde el archivo ZIP.</p>' .
                '<p><a href="' . admin_url('plugins.php') . '">← Volver a Plugins</a></p>'
            );
        }
        error_log('✓ Activator file exists');

        // LOG 6: Cargar archivo activator
        error_log('Loading activator class...');
        require_once $activator_path;
        error_log('✓ Activator file loaded');

        // LOG 7: Verificar clase existe
        error_log('Checking DA_Activator class...');
        if (!class_exists('DA_Activator')) {
            error_log('ERROR: DA_Activator class not defined after require');
            wp_die(
                '<h1>Error de Carga</h1>' .
                '<p>La clase DA_Activator no se pudo cargar correctamente.</p>' .
                '<p>Verifica permisos de archivos y que el ZIP se instaló completamente.</p>' .
                '<p><a href="' . admin_url('plugins.php') . '">← Volver a Plugins</a></p>'
            );
        }
        error_log('✓ DA_Activator class exists');

        // LOG 8: Ejecutar activación
        error_log('Calling DA_Activator::activate()...');
        DA_Activator::activate();
        error_log('✓ DA_Activator::activate() completed');

        error_log('=== DECANO ACTIVATION SUCCESS ===');

    } catch (Exception $e) {
        // LOG ERROR: Capturar cualquier excepción
        error_log('=== DECANO ACTIVATION FAILED ===');
        error_log('ERROR TYPE: ' . get_class($e));
        error_log('ERROR MESSAGE: ' . $e->getMessage());
        error_log('ERROR FILE: ' . $e->getFile() . ':' . $e->getLine());
        error_log('ERROR TRACE: ' . $e->getTraceAsString());
        error_log('=================================');

        wp_die(
            '<h1>Error al activar el plugin Decano Astrológico</h1>' .
            '<p><strong>Error:</strong> ' . esc_html($e->getMessage()) . '</p>' .
            '<p><strong>Archivo:</strong> ' . esc_html($e->getFile()) . ':' . $e->getLine() . '</p>' .
            '<hr>' .
            '<h3>Pasos para Depurar:</h3>' .
            '<ol>' .
            '<li>Revisa el log de errores de PHP en <code>/wp-content/debug.log</code></li>' .
            '<li>Busca líneas que comiencen con <code>DECANO ACTIVATION</code></li>' .
            '<li>Copia el error completo y repórtalo en <a href="https://github.com/benetandujar72/Decano-astrologico/issues" target="_blank">GitHub Issues</a></li>' .
            '</ol>' .
            '<p><a href="' . admin_url('plugins.php') . '">← Volver a Plugins</a></p>'
        );
    } catch (Throwable $e) {
        // LOG ERROR: Capturar cualquier error fatal (PHP 7+)
        error_log('=== DECANO ACTIVATION FATAL ERROR ===');
        error_log('ERROR TYPE: ' . get_class($e));
        error_log('ERROR MESSAGE: ' . $e->getMessage());
        error_log('ERROR FILE: ' . $e->getFile() . ':' . $e->getLine());
        error_log('ERROR TRACE: ' . $e->getTraceAsString());
        error_log('=====================================');

        wp_die(
            '<h1>Error Fatal al activar el plugin</h1>' .
            '<p><strong>Error:</strong> ' . esc_html($e->getMessage()) . '</p>' .
            '<p><strong>Archivo:</strong> ' . esc_html($e->getFile()) . ':' . $e->getLine() . '</p>' .
            '<p>Este es un error crítico de PHP. Revisa el log de errores para más detalles.</p>' .
            '<p><a href="' . admin_url('plugins.php') . '">← Volver a Plugins</a></p>'
        );
    }
}
register_activation_hook(__FILE__, 'activate_decano');

/**
 * Desactivación del plugin
 */
function deactivate_decano() {
    require_once DECANO_PLUGIN_DIR . 'includes/class-da-deactivator.php';
    DA_Deactivator::deactivate();

    // Limpiar eventos de cron de Fraktal
    $cron_hooks = array(
        'fraktal_process_report_queue',
        'fraktal_cleanup_temp_files',
    );
    foreach ( $cron_hooks as $hook ) {
        $timestamp = wp_next_scheduled( $hook );
        if ( $timestamp ) {
            wp_unschedule_event( $timestamp, $hook );
        }
    }
}
register_deactivation_hook(__FILE__, 'deactivate_decano');

/**
 * Cargar el plugin
 */
function run_decano() {
    // Cargar clases principales primero
    require_once DECANO_PLUGIN_DIR . 'includes/class-da-loader.php';
    require_once DECANO_PLUGIN_DIR . 'includes/class-da-plan-manager.php';
    require_once DECANO_PLUGIN_DIR . 'includes/class-da-limits.php';

    $loader = new DA_Loader();
    $loader->run();
}

/**
 * Clase principal de compatibilidad con versión anterior
 * Mantiene todos los endpoints AJAX existentes funcionando
 */
class Fraktal_Reports_Plugin {
    // NOTA: Estas constantes se mantienen por compatibilidad con código legacy
    // Ya NO se usan cuando FRAKTAL_USE_SUPABASE = true
    const OPT_API_URL = 'da_api_url'; // LEGACY - Ya no se usa
    const OPT_HMAC_SECRET = 'da_hmac_secret'; // LEGACY - Ya no se usa
    const OPT_PRODUCT_ID = 'fraktal_reports_product_id'; // Mantener compatibilidad
    const PLUGIN_VERSION = '1.0.0';

    public static function init() {
        // Shortcode legacy
        add_shortcode('fraktal_panel', [__CLASS__, 'render_panel_shortcode']);

        add_action('wp_enqueue_scripts', [__CLASS__, 'enqueue_assets']);

        // AJAX endpoints (mantener compatibilidad)
        add_action('wp_ajax_fraktal_reports_list', [__CLASS__, 'ajax_list_reports']);
        add_action('wp_ajax_fraktal_reports_start', [__CLASS__, 'ajax_start_report']);
        add_action('wp_ajax_fraktal_reports_status', [__CLASS__, 'ajax_report_status']);
        add_action('wp_ajax_fraktal_reports_profiles_get', [__CLASS__, 'ajax_profiles_get']);
        add_action('wp_ajax_fraktal_reports_profiles_save', [__CLASS__, 'ajax_profiles_save']);

        // NUEVOS endpoints AJAX para planes
        add_action('wp_ajax_fraktal_reports_get_plan', [__CLASS__, 'ajax_get_plan']);
        add_action('wp_ajax_fraktal_reports_get_plans', [__CLASS__, 'ajax_get_plans']);
        add_action('wp_ajax_nopriv_fraktal_reports_get_plans', [__CLASS__, 'ajax_get_plans_public']); // Público
        add_action('wp_ajax_fraktal_reports_get_types', [__CLASS__, 'ajax_get_report_types']);
        add_action('wp_ajax_fraktal_reports_get_templates', [__CLASS__, 'ajax_get_templates']);

        // Descarga por proxy
        add_action('admin_post_fraktal_reports_download', [__CLASS__, 'handle_download_proxy']);
        add_action('admin_post_nopriv_fraktal_reports_download', [__CLASS__, 'handle_download_proxy']);
    }

    public static function enqueue_assets() {
        if (!is_user_logged_in()) return;
        global $post;
        if (!$post || !has_shortcode($post->post_content, 'fraktal_panel')) return;

        wp_enqueue_style('fraktal-reports', plugins_url('assets/fraktal-reports.css', __FILE__), [], self::PLUGIN_VERSION);
        wp_enqueue_script('fraktal-reports', plugins_url('assets/fraktal-reports.js', __FILE__), ['jquery'], self::PLUGIN_VERSION, true);

        wp_localize_script('fraktal-reports', 'FraktalReports', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'downloadUrl' => admin_url('admin-post.php?action=fraktal_reports_download'),
            'nonce' => wp_create_nonce('fraktal_reports_nonce'),
            'productId' => intval(get_option(self::OPT_PRODUCT_ID, 0)),
            'apiUrl' => self::api_url(),
            'supabase' => [
                'url' => FRAKTAL_SUPABASE_URL,
                'anonKey' => FRAKTAL_SUPABASE_ANON_KEY,
            ],
            'currentUser' => [
                'id' => get_current_user_id(),
                'plan' => DA_Plan_Manager::get_user_plan(get_current_user_id()),
            ]
        ]);
    }

    public static function render_panel_shortcode() {
        if (!is_user_logged_in()) {
            return '<p>Debes iniciar sesión para acceder al panel.</p>';
        }

        $user_id = get_current_user_id();
        $plan = DA_Plan_Manager::get_user_plan($user_id);
        $limits_info = DA_Limits::get_user_limits_info($user_id);

        ob_start();
        ?>
        <div class="fraktal-reports-panel" data-fraktal-panel="1">
            <?php if (!$limits_info['can_generate']): ?>
                <div class="notice notice-warning" style="padding:10px;margin:0 0 12px 0;">
                    <strong>Has alcanzado el límite de informes de tu plan <?php echo esc_html(ucfirst($plan)); ?></strong>
                    <br>
                    <a href="/planes" class="button button-primary" style="margin-top:10px;">Ver Planes Disponibles</a>
                </div>
            <?php endif; ?>

            <div class="fraktal-plan-info" style="background:#f0f0f1;padding:10px;margin-bottom:12px;border-radius:4px;">
                <strong>Plan Actual:</strong> <?php echo esc_html(ucfirst($plan)); ?>
                <br>
                <strong>Informes este mes:</strong>
                <?php echo esc_html($limits_info['reports_used_this_month']); ?>
                <?php if (!$limits_info['unlimited']): ?>
                    / <?php echo esc_html($limits_info['max_reports_per_month']); ?>
                <?php else: ?>
                    (Ilimitado)
                <?php endif; ?>
            </div>

            <div class="fraktal-tabs">
                <button class="fraktal-tab is-active" data-tab="profiles">Perfiles</button>
                <button class="fraktal-tab" data-tab="generate">Generar informe</button>
                <button class="fraktal-tab" data-tab="reports">Mis informes</button>
            </div>

            <div class="fraktal-tab-content is-active" data-content="profiles">
                <h3>Perfiles</h3>
                <div id="fraktal-profiles"></div>
                <button class="button button-primary" id="fraktal-add-profile">Añadir perfil</button>
                <p class="description">Guarda perfiles para futuros informes.</p>
            </div>

            <div class="fraktal-tab-content" data-content="generate">
                <h3>Generar informe individual</h3>
                <p>Selecciona un perfil y genera el informe exhaustivo.</p>
                <div id="fraktal-generate" data-fraktal-can-generate="<?php echo $limits_info['can_generate'] ? '1' : '0'; ?>"></div>
                <div id="fraktal-progress" class="fraktal-progress"></div>
            </div>

            <div class="fraktal-tab-content" data-content="reports">
                <h3>Mis informes</h3>
                <div id="fraktal-reports-list"></div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    // ========================================
    // AJAX ENDPOINTS - MANTENER COMPATIBILIDAD
    // ========================================

    private static function api_url() {
        $base = trim(strval(get_option(self::OPT_API_URL, '')));
        return rtrim($base, '/');
    }

    private static function hmac_secret() {
        return strval(get_option(self::OPT_HMAC_SECRET, ''));
    }

    /**
     * LEGACY: Firma de peticiones HMAC para FastAPI
     * Solo se usa cuando FRAKTAL_USE_SUPABASE = false
     */
    private static function sign_request($method, $path, $body, $wp_user_id) {
        $ts = time();
        $body_sha = hash('sha256', $body ? $body : '');
        $canonical = $ts . '.' . strtoupper($method) . '.' . $path . '.' . $body_sha . '.' . $wp_user_id;
        $sig = hash_hmac('sha256', $canonical, self::hmac_secret());
        return [
            'timestamp' => strval($ts),
            'signature' => $sig,
        ];
    }

    /**
     * LEGACY: Peticiones al backend FastAPI
     * Solo se usa cuando FRAKTAL_USE_SUPABASE = false
     * Con Supabase activo, se usan las clases Fraktal_Supabase_* en su lugar
     */
    private static function backend_request($method, $path, $payload = null) {
        $api = self::api_url();
        if (!$api) {
            return new WP_Error('fraktal_missing_api', 'Backend API URL no configurada');
        }
        $secret = self::hmac_secret();
        if (!$secret) {
            return new WP_Error('fraktal_missing_secret', 'HMAC secret no configurado');
        }

        $wp_user_id = strval(get_current_user_id());
        $url = $api . $path;
        $body = $payload ? wp_json_encode($payload) : '';

        $sig = self::sign_request($method, $path, $body, $wp_user_id);

        $args = [
            'method' => strtoupper($method),
            'timeout' => 120,
            'headers' => [
                'Content-Type' => 'application/json',
                'X-Fraktal-Timestamp' => $sig['timestamp'],
                'X-Fraktal-WP-User-Id' => $wp_user_id,
                'X-Fraktal-Signature' => $sig['signature'],
            ],
        ];
        if ($body !== '') {
            $args['body'] = $body;
        }

        return wp_remote_request($url, $args);
    }

    private static function require_nonce() {
        $nonce = isset($_POST['nonce']) ? sanitize_text_field($_POST['nonce']) : (isset($_GET['nonce']) ? sanitize_text_field($_GET['nonce']) : '');
        if (!wp_verify_nonce($nonce, 'fraktal_reports_nonce')) {
            wp_send_json_error(['message' => 'Nonce inválido'], 403);
            exit;
        }
    }

    // ========================================
    // ENDPOINTS EXISTENTES
    // ========================================

    public static function ajax_profiles_get() {
        self::require_nonce();
        $profiles = get_user_meta(get_current_user_id(), 'fraktal_profiles', true);
        if (!$profiles) $profiles = [];
        wp_send_json_success(['profiles' => $profiles]);
    }

    public static function ajax_profiles_save() {
        self::require_nonce();
        $raw = isset($_POST['profiles']) ? wp_unslash($_POST['profiles']) : '[]';
        $profiles = json_decode($raw, true);
        if (!is_array($profiles)) $profiles = [];
        update_user_meta(get_current_user_id(), 'fraktal_profiles', $profiles);
        wp_send_json_success(['ok' => true]);
    }

    public static function ajax_list_reports() {
        self::require_nonce();

        if ( FRAKTAL_USE_SUPABASE ) {
            $reports = new Fraktal_Supabase_Reports();
            $result = $reports->list_user_reports( get_current_user_id() );

            if ( is_wp_error( $result ) ) {
                wp_send_json_error( array( 'message' => $result->get_error_message() ), 500 );
            }

            wp_send_json_success( array( 'sessions' => $result ) );
            return;
        }

        // Legacy: FastAPI
        $resp = self::backend_request('GET', '/wp/report/my-sessions?limit=100', null);
        if (is_wp_error($resp)) {
            wp_send_json_error(['message' => $resp->get_error_message()], 500);
        }
        $code = wp_remote_retrieve_response_code($resp);
        $body = wp_remote_retrieve_body($resp);
        if ($code < 200 || $code >= 300) {
            wp_send_json_error(['message' => 'Error backend', 'code' => $code, 'body' => $body], 500);
        }
        wp_send_json_success(json_decode($body, true));
    }

    public static function ajax_start_report() {
        self::require_nonce();

        $user_id = get_current_user_id();

        // Verificar límites
        if (!DA_Limits::check_monthly_limit($user_id)) {
            $plan = DA_Plan_Manager::get_user_plan($user_id);
            wp_send_json_error([
                'message' => 'Has alcanzado el límite de informes de tu plan ' . ucfirst($plan),
                'upgrade_required' => true,
                'current_plan' => $plan
            ], 403);
            return;
        }

        $payload_raw = isset($_POST['payload']) ? wp_unslash($_POST['payload']) : '{}';
        $payload = json_decode($payload_raw, true);
        if (!is_array($payload)) $payload = [];

        if ( FRAKTAL_USE_SUPABASE ) {
            $reports = new Fraktal_Supabase_Reports();

            // Extraer datos de la carta del payload
            $chart_data = array(
                'nombre'        => isset( $payload['nombre'] ) ? sanitize_text_field( $payload['nombre'] ) : '',
                'fecha'         => isset( $payload['fecha'] ) ? sanitize_text_field( $payload['fecha'] ) : '',
                'hora'          => isset( $payload['hora'] ) ? sanitize_text_field( $payload['hora'] ) : '',
                'lugar'         => isset( $payload['lugar'] ) ? sanitize_text_field( $payload['lugar'] ) : '',
                'latitude'      => isset( $payload['latitude'] ) ? floatval( $payload['latitude'] ) : 0,
                'longitude'     => isset( $payload['longitude'] ) ? floatval( $payload['longitude'] ) : 0,
                'timezone'      => isset( $payload['timezone'] ) ? sanitize_text_field( $payload['timezone'] ) : 'UTC',
            );

            $report_type = isset( $payload['report_type'] ) ? sanitize_text_field( $payload['report_type'] ) : 'individual';

            $result = $reports->start_generation( $chart_data, $report_type, $user_id );

            if ( is_wp_error( $result ) ) {
                wp_send_json_error( array( 'message' => $result->get_error_message() ), 500 );
            }

            // Incrementar uso
            DA_Limits::increment_usage( $user_id );

            wp_send_json_success( $result );
            return;
        }

        // Legacy: FastAPI
        $payload['wp_user_id'] = strval($user_id);
        $u = wp_get_current_user();
        if ($u) {
            $payload['email'] = $u->user_email;
            $payload['display_name'] = $u->display_name;
            if (empty($payload['nombre'])) $payload['nombre'] = $u->display_name;
        }

        $resp = self::backend_request('POST', '/wp/report/queue-full', $payload);
        if (is_wp_error($resp)) {
            wp_send_json_error(['message' => $resp->get_error_message()], 500);
        }
        $code = wp_remote_retrieve_response_code($resp);
        $body = wp_remote_retrieve_body($resp);
        if ($code < 200 || $code >= 300) {
            wp_send_json_error(['message' => 'Error backend', 'code' => $code, 'body' => $body], 500);
        }

        // Incrementar uso
        DA_Limits::increment_usage($user_id);

        wp_send_json_success(json_decode($body, true));
    }

    public static function ajax_report_status() {
        self::require_nonce();
        $session_id = isset($_POST['session_id']) ? sanitize_text_field($_POST['session_id']) : '';
        if (!$session_id) {
            wp_send_json_error(['message' => 'session_id requerido'], 400);
        }

        if ( FRAKTAL_USE_SUPABASE ) {
            $reports = new Fraktal_Supabase_Reports();
            $result = $reports->get_session_status( $session_id );

            if ( is_wp_error( $result ) ) {
                wp_send_json_error( array( 'message' => $result->get_error_message() ), 500 );
            }

            // Normalizar respuesta para compatibilidad con frontend
            wp_send_json_success( array(
                'session_id'       => $result['session_id'],
                'status'           => $result['status'],
                'progress_percent' => isset( $result['progress_percent'] ) ? $result['progress_percent'] : 0,
                'current_module'   => isset( $result['current_module'] ) ? $result['current_module'] : '',
                'report_type'      => isset( $result['report_type'] ) ? $result['report_type'] : '',
                'file_url'         => isset( $result['file_url'] ) ? $result['file_url'] : null,
                'completed_at'     => isset( $result['completed_at'] ) ? $result['completed_at'] : null,
            ) );
            return;
        }

        // Legacy: FastAPI
        $resp = self::backend_request('GET', '/wp/report/status/' . rawurlencode($session_id), null);
        if (is_wp_error($resp)) {
            wp_send_json_error(['message' => $resp->get_error_message()], 500);
        }
        $code = wp_remote_retrieve_response_code($resp);
        $body = wp_remote_retrieve_body($resp);
        if ($code < 200 || $code >= 300) {
            wp_send_json_error(['message' => 'Error backend', 'code' => $code, 'body' => $body], 500);
        }
        wp_send_json_success(json_decode($body, true));
    }

    public static function handle_download_proxy() {
        if (!is_user_logged_in()) {
            wp_die('Debes iniciar sesión', 403);
        }
        $session_id = isset($_GET['session_id']) ? sanitize_text_field($_GET['session_id']) : '';
        $nonce = isset($_GET['nonce']) ? sanitize_text_field($_GET['nonce']) : '';
        if (!wp_verify_nonce($nonce, 'fraktal_reports_nonce')) {
            wp_die('Nonce inválido', 403);
        }
        if (!$session_id) {
            wp_die('session_id requerido', 400);
        }

        if ( FRAKTAL_USE_SUPABASE ) {
            $reports = new Fraktal_Supabase_Reports();
            $download_url = $reports->get_download_url( $session_id, get_current_user_id() );

            if ( is_wp_error( $download_url ) ) {
                wp_die( $download_url->get_error_message(), 500 );
            }

            // Redirigir a la URL firmada de Supabase Storage
            wp_redirect( $download_url );
            exit;
        }

        // Legacy: FastAPI
        $resp = self::backend_request('GET', '/wp/report/download-pdf/' . rawurlencode($session_id), null);
        if (is_wp_error($resp)) {
            wp_die($resp->get_error_message(), 500);
        }
        $code = wp_remote_retrieve_response_code($resp);
        if ($code < 200 || $code >= 300) {
            wp_die('Error backend al descargar', 500);
        }
        $headers = wp_remote_retrieve_headers($resp);
        $body = wp_remote_retrieve_body($resp);

        $content_type = isset($headers['content-type']) ? $headers['content-type'] : 'application/pdf';
        header('Content-Type: ' . $content_type);
        if (isset($headers['content-disposition'])) {
            header('Content-Disposition: ' . $headers['content-disposition']);
        } else {
            header('Content-Disposition: attachment; filename="informe.pdf"');
        }
        echo $body;
        exit;
    }

    // ========================================
    // NUEVOS ENDPOINTS AJAX PARA PLANES
    // ========================================

    public static function ajax_get_plan() {
        self::require_nonce();

        $user_id = get_current_user_id();
        $plan_info = DA_Plan_Manager::get_user_plan_info($user_id);
        $limits_info = DA_Limits::get_user_limits_info($user_id);

        wp_send_json_success([
            'tier' => $plan_info['tier'],
            'name' => $plan_info['name'],
            'price' => $plan_info['price'],
            'limits' => $plan_info['limits'],
            'usage' => [
                'this_month' => $limits_info['reports_used_this_month'],
                'remaining' => $limits_info['reports_remaining'],
                'unlimited' => $limits_info['unlimited']
            ]
        ]);
    }

    /**
     * Endpoint público para obtener planes (sin login requerido)
     */
    public static function ajax_get_plans_public() {
        // No requiere nonce ni login - es información pública
        $plans = self::get_plans_list();
        wp_send_json_success(['plans' => $plans]);
    }

    public static function ajax_get_plans() {
        self::require_nonce();

        $plans = self::get_plans_list();
        wp_send_json_success(['plans' => $plans]);
    }

    /**
     * Obtiene la lista de planes (usado por endpoints públicos y privados)
     */
    private static function get_plans_list() {
        $plans = [];
        foreach (['free', 'premium', 'enterprise'] as $tier) {
            $product_id = get_option("da_product_{$tier}_id");
            if ($product_id) {
                $product = wc_get_product($product_id);
                if ($product) {
                    // Obtener features desde WooCommerce meta (usa get_meta, no get_post_meta)
                    $features = $product->get_meta('da_features');
                    if (empty($features) || !is_array($features)) {
                        // Fallback: features por defecto según el tier
                        $features = self::get_default_plan_features($tier);
                    }

                    $plans[] = [
                        'tier' => $tier,
                        'name' => $product->get_name(),
                        'price' => floatval($product->get_price()),
                        'features' => $features,
                        'productId' => $product_id,
                        'description' => $product->get_short_description()
                    ];
                }
            }
        }

        // Si no hay productos creados, devolver planes por defecto
        if (empty($plans)) {
            $plans = self::get_default_plans();
        }

        return $plans;
    }

    /**
     * Obtiene features por defecto para un tier
     */
    private static function get_default_plan_features($tier) {
        $defaults = [
            'free' => [
                '1 informe resumido/mes',
                'Carta natal básica',
                'Posiciones planetarias',
                'Aspectos principales'
            ],
            'premium' => [
                'Informes ilimitados',
                'Informes completos y detallados',
                'Todos los tipos de informe',
                'Técnicas avanzadas',
                'Exportación PDF',
                'Soporte prioritario'
            ],
            'enterprise' => [
                'Todo de Premium',
                'Informes personalizados',
                'API REST completa',
                'Prompts personalizados',
                'Soporte 24/7',
                'Plantillas ilimitadas'
            ]
        ];
        return $defaults[$tier] ?? [];
    }

    /**
     * Devuelve planes por defecto si no hay productos WooCommerce
     */
    private static function get_default_plans() {
        return [
            [
                'tier' => 'free',
                'name' => 'Plan Gratuito',
                'price' => 0,
                'features' => self::get_default_plan_features('free'),
                'productId' => 0,
                'description' => 'Perfecto para empezar'
            ],
            [
                'tier' => 'premium',
                'name' => 'Plan Premium',
                'price' => 29.99,
                'features' => self::get_default_plan_features('premium'),
                'productId' => 0,
                'description' => 'Para usuarios avanzados'
            ],
            [
                'tier' => 'enterprise',
                'name' => 'Plan Enterprise',
                'price' => 99.99,
                'features' => self::get_default_plan_features('enterprise'),
                'productId' => 0,
                'description' => 'Para profesionales'
            ]
        ];
    }

    public static function ajax_get_report_types() {
        self::require_nonce();

        $category = isset($_POST['category']) ? sanitize_text_field($_POST['category']) : null;

        // Usar configuración local de tipos de informe
        if (class_exists('Fraktal_Report_Type_Config')) {
            $all_types = Fraktal_Report_Type_Config::get_all_types();
            $report_types = [];

            foreach ($all_types as $type_id => $config) {
                // Filtrar por categoría si se especifica
                if ($category && isset($config['category']) && $config['category'] !== $category) {
                    continue;
                }

                $report_types[] = [
                    'id' => $type_id,
                    'name' => $config['name'] ?? $type_id,
                    'slug' => $config['slug'] ?? $type_id,
                    'category' => $config['category'] ?? 'natal',
                    'description' => $config['description'] ?? '',
                    'estimated_pages' => $config['estimated_pages'] ?? 10,
                    'requires' => $config['requires'] ?? []
                ];
            }

            wp_send_json_success(['report_types' => $report_types]);
            return;
        }

        // Fallback: tipos básicos si no existe la clase de configuración
        $default_types = [
            ['id' => 'individual', 'name' => 'Carta Natal Individual', 'category' => 'natal', 'description' => 'Análisis completo de tu carta natal'],
            ['id' => 'infantil', 'name' => 'Carta Natal Infantil', 'category' => 'natal', 'description' => 'Análisis orientado a niños'],
            ['id' => 'pareja', 'name' => 'Sinastría de Pareja', 'category' => 'synastry', 'description' => 'Compatibilidad entre dos personas'],
            ['id' => 'transits', 'name' => 'Tránsitos Actuales', 'category' => 'transit', 'description' => 'Análisis de tránsitos planetarios'],
            ['id' => 'solar_return', 'name' => 'Revolución Solar', 'category' => 'solar-return', 'description' => 'Análisis del año solar'],
            ['id' => 'progressions', 'name' => 'Progresiones', 'category' => 'progressions', 'description' => 'Progresiones secundarias']
        ];

        // Filtrar por categoría si se especifica
        if ($category) {
            $default_types = array_filter($default_types, function($type) use ($category) {
                return $type['category'] === $category;
            });
            $default_types = array_values($default_types);
        }

        wp_send_json_success(['report_types' => $default_types]);
    }

    public static function ajax_get_templates() {
        self::require_nonce();

        $report_type_id = isset($_POST['report_type_id']) ? sanitize_text_field($_POST['report_type_id']) : null;

        // Las plantillas ahora están integradas en la configuración de tipos de informe
        // Ya no se gestionan desde el backend FastAPI
        if (class_exists('Fraktal_Report_Type_Config')) {
            $types = Fraktal_Report_Type_Config::get_all_types();
            $templates = [];

            foreach ($types as $type_id => $config) {
                // Si se filtra por tipo, solo incluir ese tipo
                if ($report_type_id && $type_id !== $report_type_id) {
                    continue;
                }

                $templates[] = [
                    'id' => $type_id,
                    'name' => $config['name'] ?? $type_id,
                    'description' => $config['description'] ?? '',
                    'category' => $config['category'] ?? 'natal',
                    'is_public' => true
                ];
            }

            wp_send_json_success(['templates' => $templates]);
            return;
        }

        // Fallback: devolver templates básicos
        wp_send_json_success(['templates' => [
            ['id' => 'individual', 'name' => 'Carta Natal Individual', 'category' => 'natal', 'is_public' => true],
            ['id' => 'pareja', 'name' => 'Sinastría de Pareja', 'category' => 'synastry', 'is_public' => true],
            ['id' => 'transitos', 'name' => 'Tránsitos Actuales', 'category' => 'transit', 'is_public' => true]
        ]]);
    }
}

// Iniciar el nuevo sistema
run_decano();

// Mantener compatibilidad con código existente
Fraktal_Reports_Plugin::init();

/**
 * Sincronización automática de usuarios WordPress -> Supabase al login.
 */
if ( FRAKTAL_USE_SUPABASE ) {
	add_action( 'wp_login', function( $user_login, $user ) {
		try {
			$auth = new Fraktal_Supabase_Auth();
			$auth->sync_wp_user( $user->ID );
		} catch ( Exception $e ) {
			error_log( 'Fraktal Supabase sync error on login: ' . $e->getMessage() );
		}
	}, 10, 2 );

	// También sincronizar al registrarse
	add_action( 'user_register', function( $user_id ) {
		try {
			$auth = new Fraktal_Supabase_Auth();
			$auth->sync_wp_user( $user_id );
		} catch ( Exception $e ) {
			error_log( 'Fraktal Supabase sync error on register: ' . $e->getMessage() );
		}
	}, 10, 1 );

	// Sincronizar cuando cambia la suscripción (WooCommerce)
	add_action( 'woocommerce_subscription_status_changed', function( $subscription_id, $old_status, $new_status ) {
		$subscription = wcs_get_subscription( $subscription_id );
		if ( $subscription ) {
			$user_id = $subscription->get_user_id();
			try {
				$auth = new Fraktal_Supabase_Auth();
				$tier = DA_Plan_Manager::get_user_plan( $user_id );
				$auth->sync_subscription_tier( $user_id, $tier );
			} catch ( Exception $e ) {
				error_log( 'Fraktal Supabase sync error on subscription change: ' . $e->getMessage() );
			}
		}
	}, 10, 3 );

	// ========================================
	// WP-CRON: Procesamiento de cola de reportes
	// ========================================

	/**
	 * Agregar intervalo de 1 minuto para WP-Cron.
	 */
	add_filter( 'cron_schedules', function( $schedules ) {
		$schedules['fraktal_every_minute'] = array(
			'interval' => 60,
			'display'  => __( 'Cada minuto (Fraktal Reports)' ),
		);
		$schedules['fraktal_hourly'] = array(
			'interval' => 3600,
			'display'  => __( 'Cada hora (Fraktal Reports)' ),
		);
		return $schedules;
	} );

	/**
	 * Hook para procesar cola de reportes.
	 */
	add_action( 'fraktal_process_report_queue', function() {
		// Verificar que tenemos SERVICE_KEY configurado
		if ( empty( FRAKTAL_SUPABASE_SERVICE_KEY ) ) {
			error_log( '[Fraktal Cron] SERVICE_KEY no configurado. Saltando procesamiento.' );
			return;
		}

		try {
			$processor = new Fraktal_Supabase_Report_Processor();
			$results = $processor->process_queue( 5 ); // Procesar hasta 5 reportes por ejecución

			if ( ! empty( $results['errors'] ) ) {
				error_log( '[Fraktal Cron] Errores en procesamiento: ' . implode( '; ', $results['errors'] ) );
			}
		} catch ( Exception $e ) {
			error_log( '[Fraktal Cron] Error fatal: ' . $e->getMessage() );
		}
	} );

	/**
	 * Hook para limpiar archivos temporales.
	 */
	add_action( 'fraktal_cleanup_temp_files', function() {
		try {
			$processor = new Fraktal_Supabase_Report_Processor();
			$deleted = $processor->cleanup_temp_files( 24 ); // Eliminar archivos mayores a 24 horas

			if ( $deleted > 0 ) {
				error_log( "[Fraktal Cron] Limpieza: {$deleted} archivos temporales eliminados." );
			}
		} catch ( Exception $e ) {
			error_log( '[Fraktal Cron] Error en limpieza: ' . $e->getMessage() );
		}
	} );

	/**
	 * Programar eventos de cron si no están programados.
	 */
	add_action( 'init', function() {
		// Procesamiento de cola cada minuto
		if ( ! wp_next_scheduled( 'fraktal_process_report_queue' ) ) {
			wp_schedule_event( time(), 'fraktal_every_minute', 'fraktal_process_report_queue' );
		}

		// Limpieza de archivos temporales cada hora
		if ( ! wp_next_scheduled( 'fraktal_cleanup_temp_files' ) ) {
			wp_schedule_event( time(), 'fraktal_hourly', 'fraktal_cleanup_temp_files' );
		}
	} );
}

/**
 * ========================================
 * ADMIN: Avisos y acciones para DOMPDF
 * ========================================
 */

/**
 * Mostrar aviso si DOMPDF no está instalado.
 */
add_action( 'admin_notices', function() {
	// Solo mostrar en páginas del plugin
	$screen = get_current_screen();
	if ( ! $screen || strpos( $screen->id, 'decano' ) === false ) {
		return;
	}

	// Verificar si DOMPDF está disponible
	if ( class_exists( 'Fraktal_PDF_Autoloader' ) && Fraktal_PDF_Autoloader::is_available() ) {
		return;
	}

	// Verificar si el usuario puede instalar plugins
	if ( ! current_user_can( 'install_plugins' ) ) {
		return;
	}

	$install_url = wp_nonce_url(
		admin_url( 'admin-post.php?action=fraktal_install_dompdf' ),
		'fraktal_install_dompdf'
	);

	?>
	<div class="notice notice-warning is-dismissible">
		<p><strong>Decano Astrológico:</strong> DOMPDF no está instalado. La generación de PDFs no funcionará sin esta librería.</p>
		<p>
			<a href="<?php echo esc_url( $install_url ); ?>" class="button button-primary">
				Instalar DOMPDF Automáticamente
			</a>
			<a href="https://github.com/dompdf/dompdf/releases/latest" class="button" target="_blank">
				Descargar Manualmente
			</a>
		</p>
		<p class="description">
			También puedes ejecutar <code>composer install</code> en la carpeta del plugin.
		</p>
	</div>
	<?php
} );

/**
 * Handler para instalar DOMPDF automáticamente.
 */
add_action( 'admin_post_fraktal_install_dompdf', function() {
	// Verificar permisos y nonce
	if ( ! current_user_can( 'install_plugins' ) ) {
		wp_die( 'No tienes permisos para realizar esta acción.' );
	}

	check_admin_referer( 'fraktal_install_dompdf' );

	// Intentar instalación automática
	if ( class_exists( 'Fraktal_PDF_Autoloader' ) ) {
		$result = Fraktal_PDF_Autoloader::auto_install();

		if ( is_wp_error( $result ) ) {
			wp_redirect( add_query_arg(
				array(
					'page' => 'decano-debug',
					'dompdf_error' => urlencode( $result->get_error_message() ),
				),
				admin_url( 'admin.php' )
			) );
			exit;
		}

		wp_redirect( add_query_arg(
			array(
				'page' => 'decano-debug',
				'dompdf_installed' => '1',
			),
			admin_url( 'admin.php' )
		) );
		exit;
	}

	wp_die( 'Error: Clase PDF Autoloader no disponible.' );
} );

/**
 * Mostrar mensaje de éxito/error después de instalar DOMPDF.
 */
add_action( 'admin_notices', function() {
	if ( isset( $_GET['dompdf_installed'] ) && $_GET['dompdf_installed'] === '1' ) {
		?>
		<div class="notice notice-success is-dismissible">
			<p><strong>DOMPDF instalado correctamente.</strong> La generación de PDFs está lista.</p>
		</div>
		<?php
	}

	if ( isset( $_GET['dompdf_error'] ) ) {
		?>
		<div class="notice notice-error is-dismissible">
			<p><strong>Error al instalar DOMPDF:</strong> <?php echo esc_html( urldecode( $_GET['dompdf_error'] ) ); ?></p>
			<p>Puedes intentar la instalación manual descargando DOMPDF de <a href="https://github.com/dompdf/dompdf/releases/latest" target="_blank">GitHub</a> y extrayéndolo en <code><?php echo esc_html( DECANO_PLUGIN_DIR ); ?>lib/dompdf/</code></p>
		</div>
		<?php
	}
} );
