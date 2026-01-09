<?php
/**
 * Plugin Name: Fraktal Reports (Motor Fractal)
 * Description: Panel de usuario en WordPress para generar y descargar informes astrológicos (WooCommerce + Motor Fractal).
  * Version: 0.1.2
 * Author: Fraktal
 */

if (!defined('ABSPATH')) exit;

class Fraktal_Reports_Plugin {
  const OPT_API_URL = 'fraktal_reports_api_url';
  const OPT_HMAC_SECRET = 'fraktal_reports_hmac_secret';
  const OPT_PRODUCT_ID = 'fraktal_reports_product_id';
  const PLUGIN_VERSION = '0.1.2';

  public static function init() {
    add_action('admin_menu', [__CLASS__, 'admin_menu']);
    add_action('admin_init', [__CLASS__, 'admin_settings']);

    add_shortcode('fraktal_panel', [__CLASS__, 'render_panel_shortcode']);

    add_action('wp_enqueue_scripts', [__CLASS__, 'enqueue_assets']);

    // AJAX endpoints (solo para usuarios logueados)
    add_action('wp_ajax_fraktal_reports_list', [__CLASS__, 'ajax_list_reports']);
    add_action('wp_ajax_fraktal_reports_start', [__CLASS__, 'ajax_start_report']);
    add_action('wp_ajax_fraktal_reports_status', [__CLASS__, 'ajax_report_status']);
    add_action('wp_ajax_fraktal_reports_profiles_get', [__CLASS__, 'ajax_profiles_get']);
    add_action('wp_ajax_fraktal_reports_profiles_save', [__CLASS__, 'ajax_profiles_save']);

    // Descarga por proxy (admin-post)
    add_action('admin_post_fraktal_reports_download', [__CLASS__, 'handle_download_proxy']);
    add_action('admin_post_nopriv_fraktal_reports_download', [__CLASS__, 'handle_download_proxy']);

    // Woo hook (fase siguiente): cuando un pedido se completa, podríamos registrar permisos o enviar evento al backend
    add_action('woocommerce_order_status_completed', [__CLASS__, 'on_order_completed'], 10, 1);
  }

  public static function activate() {
    // Crear producto MVP si WooCommerce está activo y no existe
    if (!class_exists('WooCommerce')) return;
    $existing = get_option(self::OPT_PRODUCT_ID);
    if ($existing) return;

    $product = new WC_Product_Simple();
    $product->set_name('Informe Individual');
    $product->set_status('publish');
    $product->set_catalog_visibility('visible');
    $product->set_regular_price('29'); // ajustar
    $product->set_virtual(true);
    $product->set_downloadable(false);
    $product_id = $product->save();
    if ($product_id) {
      update_option(self::OPT_PRODUCT_ID, $product_id);
    }
  }

  public static function admin_menu() {
    add_options_page(
      'Fraktal Reports',
      'Fraktal Reports',
      'manage_options',
      'fraktal-reports',
      [__CLASS__, 'admin_page']
    );
  }

  public static function admin_settings() {
    register_setting('fraktal_reports', self::OPT_API_URL);
    register_setting('fraktal_reports', self::OPT_HMAC_SECRET);
    register_setting('fraktal_reports', self::OPT_PRODUCT_ID);

    add_settings_section('fraktal_reports_main', 'Configuración', function() {
      echo '<p>Configura la conexión con el Motor Fractal.</p>';
    }, 'fraktal-reports');

    add_settings_field(self::OPT_API_URL, 'Backend API URL', function() {
      $v = esc_attr(get_option(self::OPT_API_URL, ''));
      echo "<input type='text' class='regular-text' name='".esc_attr(self::OPT_API_URL)."' value='{$v}' placeholder='https://tu-backend.onrender.com' />";
      echo "<p class='description'>Debe apuntar al backend FastAPI (Motor Fractal).</p>";
    }, 'fraktal-reports', 'fraktal_reports_main');

    add_settings_field(self::OPT_HMAC_SECRET, 'WP HMAC Secret', function() {
      $v = esc_attr(get_option(self::OPT_HMAC_SECRET, ''));
      echo "<input type='password' class='regular-text' name='".esc_attr(self::OPT_HMAC_SECRET)."' value='{$v}' />";
      echo "<p class='description'>Debe coincidir con <code>WP_HMAC_SECRET</code> en el backend.</p>";
    }, 'fraktal-reports', 'fraktal_reports_main');

    add_settings_field(self::OPT_PRODUCT_ID, 'Producto Woo (ID)', function() {
      $v = esc_attr(get_option(self::OPT_PRODUCT_ID, ''));
      echo "<input type='number' class='small-text' name='".esc_attr(self::OPT_PRODUCT_ID)."' value='{$v}' />";
      echo "<p class='description'>ID del producto “Informe Individual”. Se crea automáticamente al activar si WooCommerce está activo.</p>";
    }, 'fraktal-reports', 'fraktal_reports_main');
  }

  public static function admin_page() {
    ?>
    <div class="wrap">
      <h1>Fraktal Reports</h1>
      <form method="post" action="options.php">
        <?php
          settings_fields('fraktal_reports');
          do_settings_sections('fraktal-reports');
          submit_button();
        ?>
      </form>
      <hr/>
      <p>Shortcode del panel: <code>[fraktal_panel]</code></p>
    </div>
    <?php
  }

  public static function enqueue_assets() {
    if (!is_user_logged_in()) return;
    // Cargar solo si la página tiene el shortcode
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
    ]);
  }

  public static function render_panel_shortcode() {
    if (!is_user_logged_in()) {
      return '<p>Debes iniciar sesión para acceder al panel.</p>';
    }
    // Admins de WordPress: bypass de restricciones de pago (pueden generar y ver todo).
    // `manage_options` suele funcionar, pero en algunos entornos puede no estar asignado;
    // por eso también verificamos rol explícito `administrator`.
    $u = wp_get_current_user();
    $roles = $u ? (array) $u->roles : [];
    $is_admin = current_user_can('manage_options') || in_array('administrator', $roles, true);
    $product_id = intval(get_option(self::OPT_PRODUCT_ID, 0));
    $has_purchase = false;
    if ($is_admin) {
      $has_purchase = true;
    } else if (class_exists('WooCommerce') && $product_id) {
      $user = wp_get_current_user();
      $email = $user ? $user->user_email : '';
      if ($email) {
        $has_purchase = wc_customer_bought_product($email, get_current_user_id(), $product_id);
      }
    }
    ob_start();
    ?>
    <div class="fraktal-reports-panel" data-fraktal-panel="1">
      <?php if ($product_id && !$has_purchase): ?>
        <div class="notice notice-warning" style="padding:10px;margin:0 0 12px 0;">
          <strong>Necesitas comprar el Informe Individual</strong> para generar un informe.
        </div>
      <?php endif; ?>
      <div class="fraktal-tabs">
        <button class="fraktal-tab is-active" data-tab="profiles">Perfiles</button>
        <button class="fraktal-tab" data-tab="generate">Generar informe</button>
        <button class="fraktal-tab" data-tab="reports">Mis informes</button>
      </div>

      <div class="fraktal-tab-content is-active" data-content="profiles">
        <h3>Perfiles</h3>
        <div id="fraktal-profiles"></div>
        <button class="button button-primary" id="fraktal-add-profile">Añadir perfil</button>
        <p class="description">Guarda perfiles (tú, pareja, hijos) para futuros informes. MVP: se guardan en tu cuenta WP.</p>
      </div>

      <div class="fraktal-tab-content" data-content="generate">
        <h3>Generar informe individual</h3>
        <p>Selecciona un perfil y genera el informe exhaustivo.</p>
        <div id="fraktal-generate" data-fraktal-can-generate="<?php echo $has_purchase ? '1' : '0'; ?>"></div>
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

  private static function api_url() {
    $base = trim(strval(get_option(self::OPT_API_URL, '')));
    return rtrim($base, '/');
  }

  private static function hmac_secret() {
    return strval(get_option(self::OPT_HMAC_SECRET, ''));
  }

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
    $payload_raw = isset($_POST['payload']) ? wp_unslash($_POST['payload']) : '{}';
    $payload = json_decode($payload_raw, true);
    if (!is_array($payload)) $payload = [];
    // Forzar wp_user_id desde servidor
    $payload['wp_user_id'] = strval(get_current_user_id());
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
    wp_send_json_success(json_decode($body, true));
  }

  public static function ajax_report_status() {
    self::require_nonce();
    $session_id = isset($_POST['session_id']) ? sanitize_text_field($_POST['session_id']) : '';
    if (!$session_id) {
      wp_send_json_error(['message' => 'session_id requerido'], 400);
    }
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

  public static function on_order_completed($order_id) {
    if (!class_exists('WooCommerce')) return;
    $order = wc_get_order($order_id);
    if (!$order) return;

    $user_id = $order->get_user_id();
    if (!$user_id) return;

    // Solo si el producto del MVP está en el pedido
    $product_id = intval(get_option(self::OPT_PRODUCT_ID, 0));
    if (!$product_id) return;

    $has = false;
    foreach ($order->get_items() as $item) {
      if (intval($item->get_product_id()) === $product_id) { $has = true; break; }
    }
    if (!$has) return;

    // Notificar al backend (auditoría / futura lógica)
    $payload = [
      'wp_user_id' => strval($user_id),
      'order_id' => strval($order_id),
      'product_id' => strval($product_id),
      'total' => floatval($order->get_total()),
      'currency' => strval($order->get_currency()),
      'email' => strval($order->get_billing_email()),
    ];
    $resp = self::backend_request('POST', '/wp/woocommerce/order-paid', $payload);
    // best-effort: no romper checkout si falla
    return;
  }
}

register_activation_hook(__FILE__, ['Fraktal_Reports_Plugin', 'activate']);
Fraktal_Reports_Plugin::init();


