<?php
/**
 * Configuración Automática de Páginas de WordPress
 *
 * Esta clase crea automáticamente las páginas necesarias para el plugin
 * con sus respectivos shortcodes configurados.
 *
 * @package Decano_Astrologico
 * @since 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class DA_Page_Setup {

    /**
     * Definición de todas las páginas necesarias
     */
    const PAGES = [
        'landing' => [
            'title' => 'Tu Informe Astrológico Gratuito',
            'slug' => 'informe-gratuito',
            'shortcode' => '[decano-free-report-form redirect_after="/mi-informe"]',
            'content_before' => '<div class="da-landing-intro">
<h2>Descubre los secretos de tu carta natal</h2>
<p>Obtén un análisis personalizado de tu carta natal completamente gratis. Solo necesitas tu fecha, hora y lugar de nacimiento.</p>
</div>',
            'content_after' => '<div class="da-landing-features">
<h3>¿Qué incluye tu informe gratuito?</h3>
<ul>
<li>✨ Posición de tu Sol, Luna y Ascendente</li>
<li>✨ Interpretación básica de tu personalidad</li>
<li>✨ Aspectos planetarios principales</li>
</ul>
</div>',
            'template' => '', // Plantilla de página (vacío = default)
            'menu_order' => 1
        ],
        'mi_informe' => [
            'title' => 'Mi Informe Astrológico',
            'slug' => 'mi-informe',
            'shortcode' => '[decano-free-report-viewer show_upgrade_cta="true"]',
            'content_before' => '',
            'content_after' => '',
            'template' => '',
            'menu_order' => 2
        ],
        'dashboard' => [
            'title' => 'Mi Panel de Control',
            'slug' => 'mi-cuenta',
            'shortcode' => '[decano-user-dashboard]',
            'content_before' => '',
            'content_after' => '',
            'template' => '',
            'menu_order' => 3
        ],
        'generador' => [
            'title' => 'Generar Informe',
            'slug' => 'generar-informe',
            'shortcode' => '[decano-report-generator plan_check="true" show_upgrade="true"]',
            'content_before' => '<div class="da-generator-intro">
<p>Crea tu informe astrológico personalizado. Selecciona el tipo de informe y completa los datos necesarios.</p>
</div>',
            'content_after' => '',
            'template' => '',
            'menu_order' => 4
        ],
        'planes' => [
            'title' => 'Planes y Precios',
            'slug' => 'planes',
            'shortcode' => '[decano-plans highlighted="premium"]',
            'content_before' => '<div class="da-plans-intro">
<h2>Elige tu plan de astrología</h2>
<p>Accede a informes detallados, análisis avanzados y mucho más con nuestros planes.</p>
</div>',
            'content_after' => '<div class="da-plans-faq">
<h3>Preguntas Frecuentes</h3>
<details>
<summary>¿Puedo cambiar de plan en cualquier momento?</summary>
<p>Sí, puedes actualizar tu plan cuando quieras. La diferencia se prorratea.</p>
</details>
<details>
<summary>¿Qué métodos de pago aceptan?</summary>
<p>Aceptamos tarjetas de crédito/débito, PayPal y transferencia bancaria.</p>
</details>
<details>
<summary>¿Hay garantía de devolución?</summary>
<p>Sí, ofrecemos garantía de devolución de 14 días si no estás satisfecho.</p>
</details>
</div>',
            'template' => '',
            'menu_order' => 5
        ],
        'upgrade' => [
            'title' => 'Mejora tu Plan',
            'slug' => 'upgrade',
            'shortcode' => '[decano-upgrade-landing show_free_cta="false" highlight="premium"]',
            'content_before' => '<div class="da-upgrade-intro">
<h2>Desbloquea todo el potencial de tu carta natal</h2>
<p>Tu informe gratuito es solo el comienzo. Accede a análisis más profundos y herramientas avanzadas.</p>
</div>',
            'content_after' => '',
            'template' => '',
            'menu_order' => 6
        ],
        'historial' => [
            'title' => 'Historial de Informes',
            'slug' => 'mis-informes',
            'shortcode' => '[decano-report-history]',
            'content_before' => '',
            'content_after' => '',
            'template' => '',
            'menu_order' => 7
        ]
    ];

    /**
     * Crear todas las páginas necesarias
     *
     * @return array Resultado de la creación con IDs de páginas
     */
    public static function create_all_pages() {
        $results = [
            'created' => [],
            'existing' => [],
            'errors' => []
        ];

        foreach (self::PAGES as $key => $page_data) {
            $result = self::create_page($key, $page_data);

            if ($result['status'] === 'created') {
                $results['created'][$key] = $result['page_id'];
            } elseif ($result['status'] === 'existing') {
                $results['existing'][$key] = $result['page_id'];
            } else {
                $results['errors'][$key] = $result['error'];
            }
        }

        // Guardar los IDs de las páginas en opciones
        update_option('da_page_ids', array_merge($results['created'], $results['existing']));

        return $results;
    }

    /**
     * Crear una página individual
     *
     * @param string $key Clave de la página
     * @param array $page_data Datos de la página
     * @return array Resultado
     */
    public static function create_page($key, $page_data) {
        // Verificar si la página ya existe por slug
        $existing = get_page_by_path($page_data['slug']);

        if ($existing) {
            return [
                'status' => 'existing',
                'page_id' => $existing->ID,
                'url' => get_permalink($existing->ID)
            ];
        }

        // Construir el contenido de la página
        $content = '';
        if (!empty($page_data['content_before'])) {
            $content .= $page_data['content_before'] . "\n\n";
        }
        $content .= $page_data['shortcode'];
        if (!empty($page_data['content_after'])) {
            $content .= "\n\n" . $page_data['content_after'];
        }

        // Crear la página
        $page_id = wp_insert_post([
            'post_title' => $page_data['title'],
            'post_name' => $page_data['slug'],
            'post_content' => $content,
            'post_status' => 'publish',
            'post_type' => 'page',
            'post_author' => get_current_user_id() ?: 1,
            'menu_order' => $page_data['menu_order'],
            'comment_status' => 'closed'
        ]);

        if (is_wp_error($page_id)) {
            return [
                'status' => 'error',
                'error' => $page_id->get_error_message()
            ];
        }

        // Establecer plantilla si se especifica
        if (!empty($page_data['template'])) {
            update_post_meta($page_id, '_wp_page_template', $page_data['template']);
        }

        return [
            'status' => 'created',
            'page_id' => $page_id,
            'url' => get_permalink($page_id)
        ];
    }

    /**
     * Obtener la URL de una página por su clave
     *
     * @param string $key Clave de la página (landing, dashboard, etc.)
     * @return string|false URL de la página o false si no existe
     */
    public static function get_page_url($key) {
        $page_ids = get_option('da_page_ids', []);

        if (isset($page_ids[$key])) {
            return get_permalink($page_ids[$key]);
        }

        // Buscar por slug como fallback
        if (isset(self::PAGES[$key])) {
            $page = get_page_by_path(self::PAGES[$key]['slug']);
            if ($page) {
                return get_permalink($page->ID);
            }
        }

        return false;
    }

    /**
     * Obtener el ID de una página por su clave
     *
     * @param string $key Clave de la página
     * @return int|false ID de la página o false si no existe
     */
    public static function get_page_id($key) {
        $page_ids = get_option('da_page_ids', []);
        return isset($page_ids[$key]) ? $page_ids[$key] : false;
    }

    /**
     * Verificar estado de las páginas
     *
     * @return array Estado de cada página
     */
    public static function check_pages_status() {
        $status = [];

        foreach (self::PAGES as $key => $page_data) {
            $page = get_page_by_path($page_data['slug']);

            $status[$key] = [
                'title' => $page_data['title'],
                'slug' => $page_data['slug'],
                'exists' => $page !== null,
                'page_id' => $page ? $page->ID : null,
                'url' => $page ? get_permalink($page->ID) : null,
                'status' => $page ? $page->post_status : null
            ];
        }

        return $status;
    }

    /**
     * Eliminar todas las páginas creadas por el plugin
     * CUIDADO: Solo usar al desinstalar el plugin
     *
     * @param bool $force_delete Eliminar permanentemente (true) o mover a papelera (false)
     * @return array Resultado de la eliminación
     */
    public static function delete_all_pages($force_delete = false) {
        $results = [];
        $page_ids = get_option('da_page_ids', []);

        foreach ($page_ids as $key => $page_id) {
            if (wp_delete_post($page_id, $force_delete)) {
                $results[$key] = 'deleted';
            } else {
                $results[$key] = 'error';
            }
        }

        delete_option('da_page_ids');
        return $results;
    }

    /**
     * Regenerar una página específica
     *
     * @param string $key Clave de la página
     * @return array Resultado
     */
    public static function regenerate_page($key) {
        if (!isset(self::PAGES[$key])) {
            return ['status' => 'error', 'error' => 'Página no definida'];
        }

        // Eliminar página existente si hay
        $page = get_page_by_path(self::PAGES[$key]['slug']);
        if ($page) {
            wp_delete_post($page->ID, true);
        }

        // Crear nueva
        return self::create_page($key, self::PAGES[$key]);
    }

    /**
     * Obtener HTML con información de las páginas para mostrar en admin
     *
     * @return string HTML formateado
     */
    public static function get_admin_pages_table() {
        $status = self::check_pages_status();

        $html = '<table class="wp-list-table widefat fixed striped">';
        $html .= '<thead><tr>';
        $html .= '<th>Página</th>';
        $html .= '<th>Slug</th>';
        $html .= '<th>Estado</th>';
        $html .= '<th>URL</th>';
        $html .= '<th>Acciones</th>';
        $html .= '</tr></thead><tbody>';

        foreach ($status as $key => $page) {
            $html .= '<tr>';
            $html .= '<td><strong>' . esc_html($page['title']) . '</strong></td>';
            $html .= '<td><code>/' . esc_html($page['slug']) . '</code></td>';

            if ($page['exists']) {
                $status_class = $page['status'] === 'publish' ? 'dashicons-yes-alt' : 'dashicons-warning';
                $html .= '<td><span class="dashicons ' . $status_class . '"></span> ' . ucfirst($page['status']) . '</td>';
                $html .= '<td><a href="' . esc_url($page['url']) . '" target="_blank">Ver página</a></td>';
                $html .= '<td><a href="' . admin_url('post.php?post=' . $page['page_id'] . '&action=edit') . '">Editar</a></td>';
            } else {
                $html .= '<td><span class="dashicons dashicons-no-alt"></span> No existe</td>';
                $html .= '<td>-</td>';
                $html .= '<td><button class="button da-create-page" data-page="' . esc_attr($key) . '">Crear</button></td>';
            }

            $html .= '</tr>';
        }

        $html .= '</tbody></table>';

        return $html;
    }

    /**
     * Registrar endpoint AJAX para crear páginas desde admin
     */
    public static function register_ajax_handlers() {
        add_action('wp_ajax_da_create_pages', [__CLASS__, 'ajax_create_pages']);
        add_action('wp_ajax_da_create_single_page', [__CLASS__, 'ajax_create_single_page']);
    }

    /**
     * AJAX: Crear todas las páginas
     */
    public static function ajax_create_pages() {
        check_ajax_referer('da_admin_nonce', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Permisos insuficientes']);
        }

        $results = self::create_all_pages();
        wp_send_json_success($results);
    }

    /**
     * AJAX: Crear una página individual
     */
    public static function ajax_create_single_page() {
        check_ajax_referer('da_admin_nonce', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Permisos insuficientes']);
        }

        $page_key = sanitize_text_field($_POST['page_key'] ?? '');

        if (!isset(self::PAGES[$page_key])) {
            wp_send_json_error(['message' => 'Página no válida']);
        }

        $result = self::create_page($page_key, self::PAGES[$page_key]);

        if ($result['status'] === 'error') {
            wp_send_json_error($result);
        }

        wp_send_json_success($result);
    }
}

// Registrar handlers AJAX
add_action('init', ['DA_Page_Setup', 'register_ajax_handlers']);
