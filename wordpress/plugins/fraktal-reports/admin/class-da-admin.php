<?php
/**
 * Clase Admin del Plugin
 *
 * @package Decano_Astrologico
 * @since 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class DA_Admin {

    /**
     * Añadir menú de administración
     */
    public function add_admin_menu() {
        // Menú principal
        add_menu_page(
            'Decano Astrológico',
            'Decano',
            'manage_options',
            'decano',
            [$this, 'render_dashboard'],
            'dashicons-star-filled',
            30
        );

        // Submenús
        add_submenu_page(
            'decano',
            'Dashboard - Decano Astrológico',
            'Dashboard',
            'manage_options',
            'decano',
            [$this, 'render_dashboard']
        );

        add_submenu_page(
            'decano',
            'Configuración - Decano Astrológico',
            'Configuración',
            'manage_options',
            'decano-settings',
            [$this, 'render_settings']
        );
    }

    /**
     * Cargar estilos del admin
     */
    public function enqueue_styles($hook) {
        // Solo cargar en páginas del plugin
        if (strpos($hook, 'decano') === false) {
            return;
        }

        wp_enqueue_style(
            'decano-admin',
            DECANO_PLUGIN_URL . 'admin/css/da-admin.css',
            [],
            DECANO_VERSION
        );
    }

    /**
     * Cargar scripts del admin
     */
    public function enqueue_scripts($hook) {
        // Solo cargar en páginas del plugin
        if (strpos($hook, 'decano') === false) {
            return;
        }

        wp_enqueue_script(
            'decano-admin',
            DECANO_PLUGIN_URL . 'admin/js/da-admin.js',
            ['jquery'],
            DECANO_VERSION,
            true
        );
    }

    /**
     * Renderizar página de dashboard
     */
    public function render_dashboard() {
        ?>
        <div class="wrap">
            <h1>Dashboard - Decano Astrológico</h1>

            <div class="da-admin-stats">
                <?php $this->render_quick_stats(); ?>
            </div>

            <div class="da-admin-info">
                <h2>Información del Plugin</h2>
                <p><strong>Versión:</strong> <?php echo DECANO_VERSION; ?></p>
                <p><strong>Estado:</strong> Activo</p>

                <h3>Productos Creados</h3>
                <ul>
                    <?php $this->list_created_products(); ?>
                </ul>
            </div>
        </div>
        <?php
    }

    /**
     * Renderizar estadísticas rápidas
     */
    private function render_quick_stats() {
        global $wpdb;

        // Total de usuarios
        $total_users = count_users();
        $total_users_count = $total_users['total_users'];

        // Informes este mes
        $table_usage = $wpdb->prefix . 'da_plan_usage';
        $current_month = date('Y-m');
        $reports_this_month = $wpdb->get_var($wpdb->prepare(
            "SELECT SUM(reports_count) FROM $table_usage WHERE month_year = %s",
            $current_month
        )) ?: 0;

        ?>
        <div class="da-stat-card">
            <h3>Total Usuarios</h3>
            <p class="da-stat-number"><?php echo esc_html($total_users_count); ?></p>
        </div>

        <div class="da-stat-card">
            <h3>Informes Este Mes</h3>
            <p class="da-stat-number"><?php echo esc_html($reports_this_month); ?></p>
        </div>
        <?php
    }

    /**
     * Listar productos creados
     */
    private function list_created_products() {
        foreach (['free', 'premium', 'enterprise'] as $tier) {
            $product_id = get_option("da_product_{$tier}_id");

            if ($product_id) {
                $product = wc_get_product($product_id);
                if ($product) {
                    echo '<li>';
                    echo '<strong>' . esc_html(ucfirst($tier)) . ':</strong> ';
                    echo esc_html($product->get_name()) . ' ';
                    echo '(ID: ' . esc_html($product_id) . ', Precio: €' . esc_html($product->get_price()) . ')';
                    echo '</li>';
                } else {
                    echo '<li><strong>' . esc_html(ucfirst($tier)) . ':</strong> Producto no encontrado (ID: ' . esc_html($product_id) . ')</li>';
                }
            } else {
                echo '<li><strong>' . esc_html(ucfirst($tier)) . ':</strong> No creado</li>';
            }
        }
    }

    /**
     * Renderizar página de configuración
     */
    public function render_settings() {
        // Procesar formulario si se envió
        if (isset($_POST['da_settings_submit'])) {
            check_admin_referer('da_settings');

            update_option('da_api_url', sanitize_text_field($_POST['da_api_url']));
            update_option('da_hmac_secret', sanitize_text_field($_POST['da_hmac_secret']));

            echo '<div class="notice notice-success"><p>Configuración guardada correctamente.</p></div>';
        }

        $api_url = get_option('da_api_url', '');
        $hmac_secret = get_option('da_hmac_secret', '');

        ?>
        <div class="wrap">
            <h1>Configuración - Decano Astrológico</h1>

            <form method="post" action="">
                <?php wp_nonce_field('da_settings'); ?>

                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="da_api_url">Backend API URL</label>
                        </th>
                        <td>
                            <input
                                type="text"
                                id="da_api_url"
                                name="da_api_url"
                                value="<?php echo esc_attr($api_url); ?>"
                                class="regular-text"
                                placeholder="https://tu-backend.onrender.com"
                            />
                            <p class="description">URL del backend FastAPI (Motor Fractal).</p>
                        </td>
                    </tr>

                    <tr>
                        <th scope="row">
                            <label for="da_hmac_secret">WP HMAC Secret</label>
                        </th>
                        <td>
                            <input
                                type="password"
                                id="da_hmac_secret"
                                name="da_hmac_secret"
                                value="<?php echo esc_attr($hmac_secret); ?>"
                                class="regular-text"
                            />
                            <p class="description">Debe coincidir con <code>WP_HMAC_SECRET</code> en el backend.</p>
                        </td>
                    </tr>
                </table>

                <p class="submit">
                    <input
                        type="submit"
                        name="da_settings_submit"
                        class="button button-primary"
                        value="Guardar Configuración"
                    />
                </p>
            </form>

            <hr>

            <h2>Shortcodes Disponibles</h2>
            <ul>
                <li><code>[fraktal_panel]</code> - Panel principal del usuario (compatible con versión anterior)</li>
            </ul>
        </div>
        <?php
    }
}
