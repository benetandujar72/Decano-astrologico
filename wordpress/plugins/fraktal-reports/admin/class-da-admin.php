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
            'Usuarios - Decano Astrológico',
            'Usuarios',
            'manage_options',
            'decano-users',
            [$this, 'render_users']
        );

        add_submenu_page(
            'decano',
            'Informes - Decano Astrológico',
            'Informes',
            'manage_options',
            'decano-reports',
            [$this, 'render_reports']
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
        require_once DECANO_PLUGIN_DIR . 'admin/class-da-admin-dashboard.php';
        $stats = DA_Admin_Dashboard::get_stats();

        ?>
        <div class="wrap">
            <h1>Dashboard - Decano Astrológico</h1>

            <!-- Estadísticas principales -->
            <div class="da-admin-stats">
                <div class="da-stat-card">
                    <h3>Informes Este Mes</h3>
                    <p class="da-stat-number"><?php echo number_format($stats['reports_this_month']); ?></p>
                </div>

                <div class="da-stat-card">
                    <h3>Usuarios Activos</h3>
                    <p class="da-stat-number"><?php echo number_format($stats['active_users']); ?></p>
                    <p class="da-stat-detail">de <?php echo number_format($stats['total_users']); ?> totales</p>
                </div>

                <div class="da-stat-card">
                    <h3>Suscripciones Activas</h3>
                    <p class="da-stat-number"><?php echo number_format($stats['active_subscriptions']); ?></p>
                </div>

                <div class="da-stat-card">
                    <h3>Ingresos Este Mes</h3>
                    <p class="da-stat-number">€<?php echo number_format($stats['revenue_this_month'], 2); ?></p>
                </div>
            </div>

            <!-- Distribución de planes -->
            <div class="da-admin-section">
                <h2>Distribución de Planes</h2>
                <div class="da-plans-distribution">
                    <?php foreach ($stats['plans_distribution'] as $tier => $count): ?>
                        <div class="da-plan-item">
                            <strong><?php echo esc_html(ucfirst($tier)); ?>:</strong>
                            <?php echo number_format($count); ?> usuarios
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>

            <!-- Informes recientes -->
            <div class="da-admin-section">
                <h2>Informes Recientes</h2>
                <table class="wp-list-table widefat fixed striped">
                    <thead>
                        <tr>
                            <th>Session ID</th>
                            <th>Usuario</th>
                            <th>Estado</th>
                            <th>Fecha</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (!empty($stats['recent_reports'])): ?>
                            <?php foreach ($stats['recent_reports'] as $report): ?>
                                <tr>
                                    <td><code><?php echo esc_html(substr($report->session_id, 0, 12)) . '...'; ?></code></td>
                                    <td><?php echo esc_html($report->user_name); ?></td>
                                    <td>
                                        <span class="da-status-badge da-status-<?php echo esc_attr($report->status); ?>">
                                            <?php echo esc_html($report->status); ?>
                                        </span>
                                    </td>
                                    <td><?php echo esc_html(date('d/m/Y H:i', strtotime($report->created_at))); ?></td>
                                </tr>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <tr>
                                <td colspan="4">No hay informes recientes</td>
                            </tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
        <?php
    }

    /**
     * Renderizar página de usuarios
     */
    public function render_users() {
        require_once DECANO_PLUGIN_DIR . 'admin/class-da-admin-users.php';

        $paged = isset($_GET['paged']) ? max(1, intval($_GET['paged'])) : 1;
        $search = isset($_GET['s']) ? sanitize_text_field($_GET['s']) : '';
        $plan_filter = isset($_GET['plan']) ? sanitize_text_field($_GET['plan']) : '';

        $data = DA_Admin_Users::get_users_with_plans([
            'paged' => $paged,
            'search' => $search,
            'plan_filter' => $plan_filter
        ]);

        ?>
        <div class="wrap">
            <h1>Gestión de Usuarios</h1>

            <!-- Filtros -->
            <div class="tablenav top">
                <form method="get">
                    <input type="hidden" name="page" value="decano-users" />

                    <select name="plan" id="plan-filter">
                        <option value="">Todos los planes</option>
                        <option value="free" <?php selected($plan_filter, 'free'); ?>>Free</option>
                        <option value="premium" <?php selected($plan_filter, 'premium'); ?>>Premium</option>
                        <option value="enterprise" <?php selected($plan_filter, 'enterprise'); ?>>Enterprise</option>
                    </select>

                    <input type="search" name="s" value="<?php echo esc_attr($search); ?>" placeholder="Buscar usuario..." />

                    <input type="submit" class="button" value="Filtrar" />
                </form>
            </div>

            <!-- Tabla de usuarios -->
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th>Usuario</th>
                        <th>Email</th>
                        <th>Plan</th>
                        <th>Informes Este Mes</th>
                        <th>Próxima Renovación</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (!empty($data['users'])): ?>
                        <?php foreach ($data['users'] as $user): ?>
                            <tr>
                                <td>
                                    <strong><?php echo esc_html($user['display_name']); ?></strong><br>
                                    <small><?php echo esc_html($user['user_login']); ?></small>
                                </td>
                                <td><?php echo esc_html($user['user_email']); ?></td>
                                <td>
                                    <span class="da-plan-badge da-plan-<?php echo esc_attr($user['plan_tier']); ?>">
                                        <?php echo esc_html(ucfirst($user['plan_tier'])); ?>
                                    </span>
                                </td>
                                <td><?php echo number_format($user['reports_this_month']); ?></td>
                                <td>
                                    <?php
                                    if ($user['next_payment_date']) {
                                        echo esc_html(date('d/m/Y', strtotime($user['next_payment_date'])));
                                    } else {
                                        echo 'N/A';
                                    }
                                    ?>
                                </td>
                                <td>
                                    <a href="<?php echo admin_url('user-edit.php?user_id=' . $user['ID']); ?>" class="button button-small">
                                        Ver Perfil
                                    </a>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <tr>
                            <td colspan="6">No se encontraron usuarios</td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>

            <!-- Paginación -->
            <?php if ($data['pages'] > 1): ?>
                <div class="tablenav bottom">
                    <div class="tablenav-pages">
                        <?php
                        echo paginate_links([
                            'base' => add_query_arg('paged', '%#%'),
                            'format' => '',
                            'prev_text' => '&laquo;',
                            'next_text' => '&raquo;',
                            'total' => $data['pages'],
                            'current' => $paged
                        ]);
                        ?>
                    </div>
                </div>
            <?php endif; ?>
        </div>
        <?php
    }

    /**
     * Renderizar página de informes
     */
    public function render_reports() {
        require_once DECANO_PLUGIN_DIR . 'admin/class-da-admin-reports.php';

        $paged = isset($_GET['paged']) ? max(1, intval($_GET['paged'])) : 1;
        $status_filter = isset($_GET['status']) ? sanitize_text_field($_GET['status']) : '';
        $search = isset($_GET['s']) ? sanitize_text_field($_GET['s']) : '';

        $data = DA_Admin_Reports::get_reports([
            'paged' => $paged,
            'status' => $status_filter,
            'search' => $search
        ]);

        $stats = DA_Admin_Reports::get_report_stats();

        ?>
        <div class="wrap">
            <h1>Gestión de Informes</h1>

            <!-- Estadísticas rápidas -->
            <div class="da-admin-stats-inline">
                <div class="da-stat-inline">
                    <strong>Total:</strong> <?php echo number_format($stats['total']); ?>
                </div>
                <div class="da-stat-inline">
                    <strong>Últimos 30 días:</strong> <?php echo number_format($stats['last_30_days']); ?>
                </div>
                <div class="da-stat-inline">
                    <strong>Promedio/día:</strong> <?php echo number_format($stats['avg_per_day'], 1); ?>
                </div>
            </div>

            <!-- Filtros -->
            <div class="tablenav top">
                <form method="get">
                    <input type="hidden" name="page" value="decano-reports" />

                    <select name="status" id="status-filter">
                        <option value="">Todos los estados</option>
                        <option value="pending" <?php selected($status_filter, 'pending'); ?>>Pendiente</option>
                        <option value="processing" <?php selected($status_filter, 'processing'); ?>>Procesando</option>
                        <option value="completed" <?php selected($status_filter, 'completed'); ?>>Completado</option>
                        <option value="failed" <?php selected($status_filter, 'failed'); ?>>Error</option>
                        <option value="stalled" <?php selected($status_filter, 'stalled'); ?>>Estancado</option>
                    </select>

                    <input type="search" name="s" value="<?php echo esc_attr($search); ?>" placeholder="Buscar..." />

                    <input type="submit" class="button" value="Filtrar" />
                </form>
            </div>

            <!-- Tabla de informes -->
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th>Session ID</th>
                        <th>Usuario</th>
                        <th>Estado</th>
                        <th>Creado</th>
                        <th>Actualizado</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (!empty($data['reports'])): ?>
                        <?php foreach ($data['reports'] as $report): ?>
                            <tr>
                                <td>
                                    <code><?php echo esc_html(substr($report->session_id, 0, 16)) . '...'; ?></code>
                                </td>
                                <td>
                                    <?php echo esc_html($report->user_name); ?><br>
                                    <small><?php echo esc_html($report->user_email); ?></small>
                                </td>
                                <td>
                                    <span class="da-status-badge da-status-<?php echo esc_attr($report->status); ?>">
                                        <?php echo esc_html($report->status); ?>
                                    </span>
                                </td>
                                <td><?php echo esc_html(date('d/m/Y H:i', strtotime($report->created_at))); ?></td>
                                <td><?php echo esc_html(date('d/m/Y H:i', strtotime($report->updated_at))); ?></td>
                            </tr>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <tr>
                            <td colspan="5">No se encontraron informes</td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>

            <!-- Paginación -->
            <?php if ($data['pages'] > 1): ?>
                <div class="tablenav bottom">
                    <div class="tablenav-pages">
                        <?php
                        echo paginate_links([
                            'base' => add_query_arg('paged', '%#%'),
                            'format' => '',
                            'prev_text' => '&laquo;',
                            'next_text' => '&raquo;',
                            'total' => $data['pages'],
                            'current' => $paged
                        ]);
                        ?>
                    </div>
                </div>
            <?php endif; ?>
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
