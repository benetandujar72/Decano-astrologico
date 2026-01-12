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

        add_submenu_page(
            'decano',
            'Tipos de Informe - Decano Astrológico',
            'Tipos de Informe',
            'manage_options',
            'decano-report-types',
            [$this, 'render_report_types']
        );

        add_submenu_page(
            'decano',
            'Plantillas - Decano Astrológico',
            'Plantillas',
            'manage_options',
            'decano-templates',
            [$this, 'render_templates']
        );

        add_submenu_page(
            'decano',
            'Prompts - Decano Astrológico',
            'Prompts',
            'manage_options',
            'decano-prompts',
            [$this, 'render_prompts']
        );

        add_submenu_page(
            'decano',
            'Planes y Límites - Decano Astrológico',
            'Planes y Límites',
            'manage_options',
            'decano-plans-limits',
            [$this, 'render_plans_limits']
        );

        add_submenu_page(
            'decano',
            'Debug - Decano Astrológico',
            'Debug',
            'manage_options',
            'decano-debug',
            [$this, 'render_debug']
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

            <h3>Sistema de Informe Gancho (FREE Users) 🆕</h3>
            <table class="wp-list-table widefat fixed striped" style="max-width: 900px;">
                <thead>
                    <tr>
                        <th style="width: 40%;">Shortcode</th>
                        <th>Descripción</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <code>[decano-free-report-form]</code><br>
                            <small>
                                Parámetros:<br>
                                - <code>redirect_after=""</code> (URL de redirección)
                            </small>
                        </td>
                        <td>
                            <strong>Formulario de informe gratuito para usuarios Free.</strong><br>
                            Incluye geocodificación automática (ciudad → coordenadas).<br>
                            Genera informe gancho con módulos: Sol, Luna y Ascendente.<br>
                            <em>Ideal para página de landing: /informe-gratis</em>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <code>[decano-free-report-viewer]</code>
                        </td>
                        <td>
                            <strong>Visualizador del informe gratuito generado.</strong><br>
                            Muestra informe con diseño místico profesional.<br>
                            Incluye CTA "DESCARGAR INFORME COMPLETO" para upgrade.<br>
                            <em>Ideal para página dinámica: /mi-informe-gratis</em>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <code>[decano-upgrade-landing]</code><br>
                            <small>
                                Parámetros:<br>
                                - <code>show_free_cta="true"</code> (mostrar CTA gratis)<br>
                                - <code>highlight="revolucion_solar_2026"</code> (plan destacado)
                            </small>
                        </td>
                        <td>
                            <strong>Landing page de upgrade con pricing.</strong><br>
                            Muestra planes premium: Carta Natal (49€) y Planificación 2026 (79€).<br>
                            Hero section con CTA para informe gratuito.<br>
                            <em>Ideal para página de conversión: /planes-premium</em>
                        </td>
                    </tr>
                </tbody>
            </table>

            <h3 style="margin-top: 30px;">Generador de Informes Completos</h3>
            <table class="wp-list-table widefat fixed striped" style="max-width: 900px;">
                <thead>
                    <tr>
                        <th style="width: 40%;">Shortcode</th>
                        <th>Descripción</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <code>[decano-report-generator]</code><br>
                            <small>
                                Parámetros:<br>
                                - <code>plan_check="true"</code> (verificar límites)<br>
                                - <code>show_upgrade="true"</code> (mostrar upgrade)
                            </small>
                        </td>
                        <td>
                            Generador completo de informes con wizard.<br>
                            Incluye selector de perfiles, tipos de informe y progreso en tiempo real.<br>
                            <strong>Para usuarios Premium y Enterprise.</strong>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <code>[decano-user-dashboard]</code>
                        </td>
                        <td>
                            Dashboard del usuario con estadísticas de uso e historial de informes.<br>
                            Muestra plan actual, informes del mes y últimos informes generados.
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <code>[decano-plans]</code><br>
                            <small>
                                Parámetros:<br>
                                - <code>highlighted="premium"</code> (plan destacado)
                            </small>
                        </td>
                        <td>
                            Selector de planes con comparación de características.<br>
                            Permite a usuarios ver y cambiar su plan de suscripción.
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <code>[decano-report-history]</code><br>
                            <small>
                                Parámetros:<br>
                                - <code>limit="10"</code> (número de informes)
                            </small>
                        </td>
                        <td>
                            Historial de informes generados por el usuario.<br>
                            Muestra estado, fecha y opción de descarga.
                        </td>
                    </tr>
                </tbody>
            </table>

            <h3 style="margin-top: 30px;">Compatibilidad con Versión Anterior</h3>
            <table class="wp-list-table widefat fixed striped" style="max-width: 900px;">
                <thead>
                    <tr>
                        <th style="width: 40%;">Shortcode</th>
                        <th>Descripción</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><code>[fraktal_panel]</code></td>
                        <td>
                            Panel principal del usuario (v0.1.3).<br>
                            <strong>Nota:</strong> Se recomienda migrar a <code>[decano-report-generator]</code>.
                        </td>
                    </tr>
                </tbody>
            </table>

            <div class="notice notice-info" style="max-width: 900px; margin-top: 20px;">
                <p>
                    <strong>💡 Tip:</strong> Los shortcodes del sistema de informe gancho están optimizados para convertir usuarios Free en clientes Premium.
                </p>
                <p>
                    <strong>Flujo recomendado:</strong><br>
                    1. Usuario llega a <code>/informe-gratis</code> → <code>[decano-free-report-form]</code><br>
                    2. Genera informe → Redirige a <code>/mi-informe-gratis</code> → <code>[decano-free-report-viewer]</code><br>
                    3. Click en CTA → <code>/planes-premium</code> → <code>[decano-upgrade-landing]</code><br>
                    4. Selecciona plan → Checkout WooCommerce → CONVERSIÓN ✅
                </p>
            </div>

            <div class="notice notice-warning" style="max-width: 900px; margin-top: 20px;">
                <p>
                    <strong>⚠️ Importante:</strong> Todos los shortcodes (excepto <code>[decano-plans]</code> y <code>[decano-upgrade-landing]</code>) requieren que el usuario esté autenticado.
                    Si el usuario no ha iniciado sesión, se mostrará un mensaje pidiéndole que lo haga.
                </p>
            </div>
        </div>
        <?php
    }

    /**
     * Renderizar página de debug
     */
    public function render_debug() {
        require_once DECANO_PLUGIN_DIR . 'includes/class-da-debug.php';
        DA_Debug::init();

        // Procesar acciones
        if (isset($_POST['da_debug_action'])) {
            check_admin_referer('da_debug');

            $action = sanitize_text_field($_POST['da_debug_action']);

            switch ($action) {
                case 'clear_log':
                    DA_Debug::clear_log();
                    echo '<div class="notice notice-success"><p>Log limpiado correctamente.</p></div>';
                    break;

                case 'test_backend':
                    $result = DA_Debug::test_backend_connection();
                    echo '<div class="notice notice-info"><p>Test de conexión ejecutado. Ver resultados abajo.</p></div>';
                    break;

                case 'system_check':
                    echo '<div class="notice notice-info"><p>Verificación del sistema ejecutada.</p></div>';
                    break;
            }
        }

        // Obtener datos
        $checks = DA_Debug::system_check();
        $env_info = DA_Debug::get_environment_info();
        $log_lines = DA_Debug::get_log_lines(200);

        ?>
        <div class="wrap">
            <h1>Debug y Diagnóstico - Decano Astrológico</h1>

            <!-- Botones de acción -->
            <div style="margin: 20px 0;">
                <form method="post" style="display: inline-block; margin-right: 10px;">
                    <?php wp_nonce_field('da_debug'); ?>
                    <input type="hidden" name="da_debug_action" value="system_check" />
                    <button type="submit" class="button">🔍 Verificar Sistema</button>
                </form>

                <form method="post" style="display: inline-block; margin-right: 10px;">
                    <?php wp_nonce_field('da_debug'); ?>
                    <input type="hidden" name="da_debug_action" value="test_backend" />
                    <button type="submit" class="button">🌐 Test Conexión Backend</button>
                </form>

                <form method="post" style="display: inline-block;">
                    <?php wp_nonce_field('da_debug'); ?>
                    <input type="hidden" name="da_debug_action" value="clear_log" />
                    <button type="submit" class="button">🗑️ Limpiar Log</button>
                </form>
            </div>

            <!-- Información del Entorno -->
            <div class="da-admin-section">
                <h2>📋 Información del Entorno</h2>
                <table class="wp-list-table widefat fixed striped" style="max-width: 800px;">
                    <tbody>
                        <?php foreach ($env_info as $key => $value): ?>
                            <tr>
                                <th style="width: 200px;"><?php echo esc_html($key); ?></th>
                                <td><code><?php echo esc_html(is_bool($value) ? ($value ? 'true' : 'false') : $value); ?></code></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>

            <!-- Verificación del Sistema -->
            <div class="da-admin-section">
                <h2>✅ Verificación del Sistema</h2>

                <!-- PHP -->
                <h3>PHP</h3>
                <table class="wp-list-table widefat fixed striped" style="max-width: 800px;">
                    <tbody>
                        <tr>
                            <th style="width: 200px;">Versión</th>
                            <td>
                                <span class="da-status-badge da-status-<?php echo $checks['php']['status'] == 'OK' ? 'completed' : 'failed'; ?>">
                                    <?php echo esc_html($checks['php']['version']); ?>
                                </span>
                                (Requerido: <?php echo esc_html($checks['php']['required']); ?>+)
                            </td>
                        </tr>
                        <tr>
                            <th>Memory Limit</th>
                            <td><code><?php echo esc_html($checks['php']['memory_limit']); ?></code></td>
                        </tr>
                        <tr>
                            <th>Max Execution Time</th>
                            <td><code><?php echo esc_html($checks['php']['max_execution_time']); ?>s</code></td>
                        </tr>
                    </tbody>
                </table>

                <!-- WordPress -->
                <h3>WordPress</h3>
                <table class="wp-list-table widefat fixed striped" style="max-width: 800px;">
                    <tbody>
                        <tr>
                            <th style="width: 200px;">Versión</th>
                            <td>
                                <span class="da-status-badge da-status-<?php echo $checks['wordpress']['status'] == 'OK' ? 'completed' : 'failed'; ?>">
                                    <?php echo esc_html($checks['wordpress']['version']); ?>
                                </span>
                                (Requerido: <?php echo esc_html($checks['wordpress']['required']); ?>+)
                            </td>
                        </tr>
                    </tbody>
                </table>

                <!-- WooCommerce -->
                <h3>WooCommerce</h3>
                <table class="wp-list-table widefat fixed striped" style="max-width: 800px;">
                    <tbody>
                        <tr>
                            <th style="width: 200px;">Instalado</th>
                            <td>
                                <span class="da-status-badge da-status-<?php echo $checks['woocommerce']['installed'] ? 'completed' : 'failed'; ?>">
                                    <?php echo $checks['woocommerce']['installed'] ? 'SÍ' : 'NO'; ?>
                                </span>
                            </td>
                        </tr>
                        <?php if ($checks['woocommerce']['installed']): ?>
                            <tr>
                                <th>Versión</th>
                                <td><?php echo esc_html($checks['woocommerce']['version']); ?></td>
                            </tr>
                        <?php endif; ?>
                    </tbody>
                </table>

                <!-- WooCommerce Subscriptions -->
                <h3>WooCommerce Subscriptions</h3>
                <table class="wp-list-table widefat fixed striped" style="max-width: 800px;">
                    <tbody>
                        <tr>
                            <th style="width: 200px;">Instalado</th>
                            <td>
                                <span class="da-status-badge da-status-<?php echo $checks['woocommerce_subscriptions']['installed'] ? 'completed' : 'failed'; ?>">
                                    <?php echo $checks['woocommerce_subscriptions']['installed'] ? 'SÍ' : 'NO'; ?>
                                </span>
                            </td>
                        </tr>
                        <?php if ($checks['woocommerce_subscriptions']['installed']): ?>
                            <tr>
                                <th>Versión</th>
                                <td><?php echo esc_html($checks['woocommerce_subscriptions']['version']); ?></td>
                            </tr>
                        <?php endif; ?>
                    </tbody>
                </table>

                <!-- Base de Datos -->
                <h3>Base de Datos</h3>
                <table class="wp-list-table widefat fixed striped" style="max-width: 800px;">
                    <tbody>
                        <tr>
                            <th style="width: 200px;">Tabla de sesiones</th>
                            <td>
                                <span class="da-status-badge da-status-<?php echo $checks['database']['sessions_table'] == 'OK' ? 'completed' : 'failed'; ?>">
                                    <?php echo esc_html($checks['database']['sessions_table']); ?>
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <th>Tabla de uso</th>
                            <td>
                                <span class="da-status-badge da-status-<?php echo $checks['database']['usage_table'] == 'OK' ? 'completed' : 'failed'; ?>">
                                    <?php echo esc_html($checks['database']['usage_table']); ?>
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <!-- Productos -->
                <h3>Productos WooCommerce</h3>
                <table class="wp-list-table widefat fixed striped" style="max-width: 800px;">
                    <tbody>
                        <tr>
                            <th style="width: 200px;">Plan Free</th>
                            <td>
                                <span class="da-status-badge da-status-<?php echo $checks['products']['free'] == 'OK' ? 'completed' : 'failed'; ?>">
                                    <?php echo esc_html($checks['products']['free']); ?>
                                </span>
                                <?php if ($checks['products']['free'] == 'OK'): ?>
                                    (ID: <?php echo esc_html(get_option('da_product_free_id')); ?>)
                                <?php endif; ?>
                            </td>
                        </tr>
                        <tr>
                            <th>Plan Premium</th>
                            <td>
                                <span class="da-status-badge da-status-<?php echo $checks['products']['premium'] == 'OK' ? 'completed' : 'failed'; ?>">
                                    <?php echo esc_html($checks['products']['premium']); ?>
                                </span>
                                <?php if ($checks['products']['premium'] == 'OK'): ?>
                                    (ID: <?php echo esc_html(get_option('da_product_premium_id')); ?>)
                                <?php endif; ?>
                            </td>
                        </tr>
                        <tr>
                            <th>Plan Enterprise</th>
                            <td>
                                <span class="da-status-badge da-status-<?php echo $checks['products']['enterprise'] == 'OK' ? 'completed' : 'failed'; ?>">
                                    <?php echo esc_html($checks['products']['enterprise']); ?>
                                </span>
                                <?php if ($checks['products']['enterprise'] == 'OK'): ?>
                                    (ID: <?php echo esc_html(get_option('da_product_enterprise_id')); ?>)
                                <?php endif; ?>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <!-- Configuración -->
                <h3>Configuración</h3>
                <table class="wp-list-table widefat fixed striped" style="max-width: 800px;">
                    <tbody>
                        <tr>
                            <th style="width: 200px;">API URL</th>
                            <td>
                                <span class="da-status-badge da-status-<?php echo $checks['configuration']['api_url'] == 'OK' ? 'completed' : 'failed'; ?>">
                                    <?php echo esc_html($checks['configuration']['api_url']); ?>
                                </span>
                                <?php if ($checks['configuration']['api_url'] == 'OK'): ?>
                                    <code><?php echo esc_html(get_option('da_api_url')); ?></code>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <tr>
                            <th>HMAC Secret</th>
                            <td>
                                <span class="da-status-badge da-status-<?php echo $checks['configuration']['hmac_secret'] == 'OK' ? 'completed' : 'failed'; ?>">
                                    <?php echo esc_html($checks['configuration']['hmac_secret']); ?>
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <!-- Build de React -->
                <h3>Build de React</h3>
                <table class="wp-list-table widefat fixed striped" style="max-width: 800px;">
                    <tbody>
                        <tr>
                            <th style="width: 200px;">Archivo JS</th>
                            <td>
                                <span class="da-status-badge da-status-<?php echo $checks['react_build']['js_file'] == 'OK' ? 'completed' : 'failed'; ?>">
                                    <?php echo esc_html($checks['react_build']['js_file']); ?>
                                </span>
                                <?php if ($checks['react_build']['js_file'] == 'OK'): ?>
                                    (<?php echo esc_html($checks['react_build']['js_size']); ?>)
                                <?php endif; ?>
                            </td>
                        </tr>
                        <tr>
                            <th>Archivo CSS</th>
                            <td>
                                <span class="da-status-badge da-status-<?php echo $checks['react_build']['css_file'] == 'OK' ? 'completed' : 'failed'; ?>">
                                    <?php echo esc_html($checks['react_build']['css_file']); ?>
                                </span>
                                <?php if ($checks['react_build']['css_file'] == 'OK'): ?>
                                    (<?php echo esc_html($checks['react_build']['css_size']); ?>)
                                <?php endif; ?>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <!-- Clases PHP -->
                <h3>Clases PHP Requeridas</h3>
                <table class="wp-list-table widefat fixed striped" style="max-width: 800px;">
                    <tbody>
                        <?php foreach ($checks['classes'] as $class => $status): ?>
                            <tr>
                                <th style="width: 200px;"><?php echo esc_html($class); ?></th>
                                <td>
                                    <span class="da-status-badge da-status-<?php echo $status == 'OK' ? 'completed' : 'failed'; ?>">
                                        <?php echo esc_html($status); ?>
                                    </span>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>

            <!-- Log de Actividades -->
            <div class="da-admin-section">
                <h2>📝 Log de Actividades (Últimas 200 líneas)</h2>
                <div style="background: #f1f1f1; padding: 15px; border-radius: 5px; max-height: 500px; overflow-y: scroll; font-family: monospace; font-size: 12px;">
                    <?php if (empty($log_lines)): ?>
                        <p>No hay logs disponibles.</p>
                    <?php else: ?>
                        <?php foreach ($log_lines as $line): ?>
                            <?php
                            $line_html = esc_html($line);
                            // Colorear según el nivel
                            if (strpos($line, '[ERROR]') !== false) {
                                $line_html = '<span style="color: #d32f2f; font-weight: bold;">' . $line_html . '</span>';
                            } elseif (strpos($line, '[WARNING]') !== false) {
                                $line_html = '<span style="color: #f57c00;">' . $line_html . '</span>';
                            } elseif (strpos($line, '===') !== false) {
                                $line_html = '<strong style="color: #1976d2;">' . $line_html . '</strong>';
                            } elseif (strpos($line, '✓') !== false) {
                                $line_html = '<span style="color: #388e3c;">' . $line_html . '</span>';
                            } elseif (strpos($line, '✗') !== false) {
                                $line_html = '<span style="color: #d32f2f;">' . $line_html . '</span>';
                            }
                            echo $line_html;
                            ?>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
                <p style="margin-top: 10px;">
                    <small>
                        <strong>Ubicación del archivo:</strong>
                        <code><?php echo esc_html(wp_upload_dir()['basedir'] . '/decano-debug.log'); ?></code>
                    </small>
                </p>
            </div>
        </div>
        <?php
    }

    /**
     * Renderizar página de tipos de informe
     */
    public function render_report_types() {
        require_once DECANO_PLUGIN_DIR . 'admin/class-da-admin-management.php';

        // Procesar acciones
        if (isset($_POST['da_action'])) {
            check_admin_referer('da_report_types');

            $action = sanitize_text_field($_POST['da_action']);

            if ($action === 'delete' && isset($_POST['type_id'])) {
                $result = DA_Admin_Management::delete_report_type(sanitize_text_field($_POST['type_id']));
                if (isset($result['error'])) {
                    echo '<div class="notice notice-error"><p>Error: ' . esc_html($result['error']) . '</p></div>';
                } else {
                    echo '<div class="notice notice-success"><p>Tipo de informe eliminado correctamente.</p></div>';
                }
            }
        }

        // Obtener tipos con fallback
        $result = DA_Admin_Management::get_report_types_with_fallback();
        $report_types = $result['data'];
        $backend_error = $result['error'];
        $is_fallback = $result['is_fallback'];
        $available_modules = DA_Admin_Management::get_available_modules();

        ?>
        <div class="wrap">
            <h1>Gestión de Tipos de Informe</h1>

            <p class="description">
                Gestiona los tipos de informe disponibles para los usuarios. Los tipos de informe determinan qué módulos
                astrológicos se incluyen en cada informe generado.
            </p>

            <!-- Botón para añadir nuevo -->
            <p>
                <a href="<?php echo admin_url('admin.php?page=decano-report-types&action=new'); ?>" class="button button-primary">
                    ➕ Añadir Nuevo Tipo
                </a>
                <a href="<?php echo admin_url('admin.php?page=decano-report-types&action=sync'); ?>" class="button">
                    🔄 Sincronizar desde Backend
                </a>
            </p>

            <?php if ($backend_error): ?>
                <div class="notice notice-warning">
                    <p><strong>⚠️ Aviso:</strong> <?php echo esc_html($backend_error); ?></p>
                    <?php if ($is_fallback): ?>
                        <p>Mostrando datos de demostración. Los cambios no se guardarán hasta que el backend esté disponible.</p>
                    <?php endif; ?>
                    <p><a href="<?php echo admin_url('admin.php?page=decano-settings'); ?>">Configurar Backend</a> |
                       <a href="<?php echo esc_url($_SERVER['REQUEST_URI']); ?>">Reintentar</a></p>
                </div>
            <?php endif; ?>
                <!-- Tabla de tipos de informe -->
                <table class="wp-list-table widefat fixed striped">
                    <thead>
                        <tr>
                            <th style="width: 20%;">ID del Tipo</th>
                            <th style="width: 25%;">Nombre</th>
                            <th style="width: 20%;">Planes Disponibles</th>
                            <th style="width: 15%;">Módulos</th>
                            <th style="width: 10%;">Estado</th>
                            <th style="width: 10%;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($report_types) || !is_array($report_types)): ?>
                            <tr>
                                <td colspan="6">No se encontraron tipos de informe. Crea uno nuevo o sincroniza desde el backend.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($report_types as $type): ?>
                                <?php
                                // Verificar que $type sea un array válido
                                if (!is_array($type)) {
                                    continue;
                                }
                                $type_id = isset($type['type_id']) ? $type['type_id'] : '';
                                $type_name = isset($type['name']) ? $type['name'] : $type_id;
                                ?>
                                <tr>
                                    <td><code><?php echo esc_html($type_id); ?></code></td>
                                    <td>
                                        <strong><?php echo esc_html($type_name); ?></strong>
                                        <?php if ($type_id === 'gancho_free'): ?>
                                            <span class="dashicons dashicons-star-filled" style="color: #daa520;" title="Informe Gancho para Free"></span>
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <?php
                                        $tiers = isset($type['available_for_tiers']) && is_array($type['available_for_tiers']) ? $type['available_for_tiers'] : [];
                                        foreach ($tiers as $tier) {
                                            if (!is_string($tier)) continue;
                                            $color = $tier === 'free' ? '#95a5a6' : ($tier === 'premium' ? '#3498db' : '#9b59b6');
                                            echo '<span style="background: ' . $color . '; color: white; padding: 2px 8px; border-radius: 3px; margin-right: 5px; font-size: 11px;">' . esc_html(strtoupper($tier)) . '</span>';
                                        }
                                        ?>
                                    </td>
                                    <td>
                                        <?php
                                        $modules = isset($type['modules']) && is_array($type['modules']) ? $type['modules'] : [];
                                        echo '<span class="dashicons dashicons-admin-page" title="' . count($modules) . ' módulos"></span> ' . count($modules);
                                        ?>
                                    </td>
                                    <td>
                                        <?php if (isset($type['is_active']) && $type['is_active']): ?>
                                            <span class="da-status-badge da-status-completed">Activo</span>
                                        <?php else: ?>
                                            <span class="da-status-badge da-status-failed">Inactivo</span>
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <a href="<?php echo admin_url('admin.php?page=decano-report-types&action=edit&type_id=' . urlencode($type_id)); ?>" class="button button-small">
                                            Editar
                                        </a>
                                        <?php if ($type_id !== 'gancho_free'): ?>
                                            <form method="post" style="display: inline;">
                                                <?php wp_nonce_field('da_report_types'); ?>
                                                <input type="hidden" name="da_action" value="delete" />
                                                <input type="hidden" name="type_id" value="<?php echo esc_attr($type_id); ?>" />
                                                <button type="submit" class="button button-small button-link-delete" onclick="return confirm('¿Estás seguro de eliminar este tipo de informe?');">
                                                    Eliminar
                                                </button>
                                            </form>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>

                <!-- Información sobre el informe gancho -->
                <div class="notice notice-info" style="margin-top: 20px;">
                    <p>
                        <strong>ℹ️ Informe Gancho (gancho_free):</strong><br>
                        Este tipo de informe es especial y está diseñado para convertir usuarios Free en Premium.
                        Incluye solo 3 módulos básicos: Sol, Luna y Ascendente. No se puede eliminar.
                    </p>
                </div>
            <?php endif; ?>
        </div>
        <?php
    }

    /**
     * Renderizar página de plantillas
     */
    public function render_templates() {
        require_once DECANO_PLUGIN_DIR . 'admin/class-da-admin-management.php';

        $templates = DA_Admin_Management::get_templates();

        ?>
        <div class="wrap">
            <h1>Gestión de Plantillas</h1>

            <p class="description">
                Las plantillas definen la estructura y formato de los informes generados.
                Cada plantilla contiene secciones, estilos y el orden de presentación.
            </p>

            <p>
                <a href="<?php echo admin_url('admin.php?page=decano-templates&action=new'); ?>" class="button button-primary">
                    ➕ Añadir Nueva Plantilla
                </a>
                <a href="<?php echo admin_url('admin.php?page=decano-templates&action=sync'); ?>" class="button">
                    🔄 Sincronizar desde Backend
                </a>
            </p>

            <?php if (isset($templates['error'])): ?>
                <div class="notice notice-error">
                    <p><strong>Error:</strong> <?php echo esc_html($templates['error']); ?></p>
                    <p>Por favor, configura la URL del backend en <a href="<?php echo admin_url('admin.php?page=decano-settings'); ?>">Configuración</a>.</p>
                </div>
            <?php else: ?>
                <table class="wp-list-table widefat fixed striped">
                    <thead>
                        <tr>
                            <th style="width: 25%;">Nombre</th>
                            <th style="width: 35%;">Descripción</th>
                            <th style="width: 15%;">Tipo</th>
                            <th style="width: 10%;">Versión</th>
                            <th style="width: 15%;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($templates)): ?>
                            <tr>
                                <td colspan="5">No se encontraron plantillas. Sincroniza desde el backend o crea una nueva.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($templates as $template): ?>
                                <tr>
                                    <td><strong><?php echo esc_html($template['name'] ?? 'Sin nombre'); ?></strong></td>
                                    <td><?php echo esc_html($template['description'] ?? '-'); ?></td>
                                    <td><code><?php echo esc_html($template['type'] ?? 'standard'); ?></code></td>
                                    <td><?php echo esc_html($template['version'] ?? '1.0'); ?></td>
                                    <td>
                                        <a href="#" class="button button-small">Ver</a>
                                        <a href="#" class="button button-small">Editar</a>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            <?php endif; ?>

            <div class="notice notice-info" style="margin-top: 20px;">
                <p>
                    <strong>💡 Tip:</strong> Las plantillas se gestionan principalmente desde el backend de Python.
                    Desde aquí puedes visualizar y sincronizar las plantillas existentes.
                </p>
            </div>
        </div>
        <?php
    }

    /**
     * Renderizar página de prompts
     */
    public function render_prompts() {
        require_once DECANO_PLUGIN_DIR . 'admin/class-da-admin-management.php';

        $prompts = DA_Admin_Management::get_prompts();

        ?>
        <div class="wrap">
            <h1>Gestión de Prompts</h1>

            <p class="description">
                Los prompts son las instrucciones que se envían a la IA (Gemini) para generar el contenido de cada módulo astrológico.
                Puedes personalizar los prompts para cambiar el tono, estilo y profundidad del análisis.
            </p>

            <p>
                <a href="<?php echo admin_url('admin.php?page=decano-prompts&action=new'); ?>" class="button button-primary">
                    ➕ Añadir Nuevo Prompt
                </a>
                <a href="<?php echo admin_url('admin.php?page=decano-prompts&action=sync'); ?>" class="button">
                    🔄 Sincronizar desde Backend
                </a>
            </p>

            <?php if (isset($prompts['error'])): ?>
                <div class="notice notice-error">
                    <p><strong>Error:</strong> <?php echo esc_html($prompts['error']); ?></p>
                    <p>Por favor, configura la URL del backend en <a href="<?php echo admin_url('admin.php?page=decano-settings'); ?>">Configuración</a>.</p>
                </div>
            <?php else: ?>
                <table class="wp-list-table widefat fixed striped">
                    <thead>
                        <tr>
                            <th style="width: 20%;">Módulo</th>
                            <th style="width: 40%;">Prompt (extracto)</th>
                            <th style="width: 15%;">Tokens Estimados</th>
                            <th style="width: 10%;">Activo</th>
                            <th style="width: 15%;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($prompts)): ?>
                            <tr>
                                <td colspan="5">No se encontraron prompts. Sincroniza desde el backend.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($prompts as $prompt): ?>
                                <tr>
                                    <td>
                                        <strong><?php echo esc_html($prompt['module_name'] ?? $prompt['module_id'] ?? 'Desconocido'); ?></strong>
                                        <?php if (in_array($prompt['module_id'] ?? '', ['modulo_1_sol', 'modulo_3_luna', 'modulo_9_ascendente'])): ?>
                                            <span class="dashicons dashicons-star-filled" style="color: #daa520;" title="Usado en informe gancho"></span>
                                        <?php endif; ?>
                                    </td>
                                    <td style="font-size: 12px; color: #666;">
                                        <?php
                                        $text = $prompt['prompt_text'] ?? '';
                                        echo esc_html(strlen($text) > 100 ? substr($text, 0, 100) . '...' : $text);
                                        ?>
                                    </td>
                                    <td><?php echo number_format($prompt['estimated_tokens'] ?? 0); ?></td>
                                    <td>
                                        <?php if (isset($prompt['is_active']) && $prompt['is_active']): ?>
                                            <span class="da-status-badge da-status-completed">Sí</span>
                                        <?php else: ?>
                                            <span class="da-status-badge da-status-failed">No</span>
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <a href="#" class="button button-small">Ver</a>
                                        <a href="#" class="button button-small">Editar</a>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            <?php endif; ?>

            <div class="notice notice-warning" style="margin-top: 20px;">
                <p>
                    <strong>⚠️ Importante:</strong> Modificar los prompts puede afectar significativamente la calidad
                    y el tono de los informes generados. Se recomienda hacer pruebas exhaustivas antes de activar cambios en producción.
                </p>
            </div>
        </div>
        <?php
    }

    /**
     * Renderizar página de planes y límites
     */
    public function render_plans_limits() {
        require_once DECANO_PLUGIN_DIR . 'admin/class-da-admin-management.php';

        // Procesar actualizaciones
        if (isset($_POST['da_update_limits'])) {
            check_admin_referer('da_plans_limits');

            $tier = sanitize_text_field($_POST['tier']);
            $limits = [
                'reports_per_month' => intval($_POST['reports_per_month']),
                'report_types' => isset($_POST['report_types']) ? array_map('sanitize_text_field', $_POST['report_types']) : [],
                'features' => isset($_POST['features']) ? array_map('sanitize_text_field', $_POST['features']) : []
            ];

            DA_Admin_Management::update_tier_limits($tier, $limits);
            echo '<div class="notice notice-success"><p>Límites actualizados correctamente.</p></div>';
        }

        $tier_limits = DA_Admin_Management::get_tier_limits();
        $report_types = DA_Admin_Management::get_report_types();

        ?>
        <div class="wrap">
            <h1>Configuración de Planes y Límites</h1>

            <p class="description">
                Configura los límites y características disponibles para cada tier de suscripción.
                Estos límites controlan cuántos informes pueden generar los usuarios cada mes y qué funcionalidades tienen acceso.
            </p>

            <!-- Tabs para cada tier -->
            <h2 class="nav-tab-wrapper">
                <a href="#tab-free" class="nav-tab nav-tab-active" onclick="switchTab(event, 'free')">Free</a>
                <a href="#tab-premium" class="nav-tab" onclick="switchTab(event, 'premium')">Premium</a>
                <a href="#tab-enterprise" class="nav-tab" onclick="switchTab(event, 'enterprise')">Enterprise</a>
            </h2>

            <?php foreach (['free', 'premium', 'enterprise'] as $tier): ?>
                <div id="tab-<?php echo $tier; ?>" class="tab-content" style="<?php echo $tier !== 'free' ? 'display: none;' : ''; ?>">
                    <form method="post">
                        <?php wp_nonce_field('da_plans_limits'); ?>
                        <input type="hidden" name="tier" value="<?php echo $tier; ?>" />

                        <table class="form-table">
                            <tr>
                                <th scope="row">
                                    <label>Plan</label>
                                </th>
                                <td>
                                    <strong style="font-size: 18px; text-transform: uppercase;">
                                        <?php echo esc_html($tier); ?>
                                    </strong>
                                    <?php if ($tier === 'free'): ?>
                                        <p class="description">Plan gratuito con acceso limitado al informe gancho.</p>
                                    <?php elseif ($tier === 'premium'): ?>
                                        <p class="description">Plan de pago con informes completos y descarga PDF.</p>
                                    <?php else: ?>
                                        <p class="description">Plan Enterprise con acceso ilimitado y soporte prioritario.</p>
                                    <?php endif; ?>
                                </td>
                            </tr>

                            <?php
                            $tier_data = isset($tier_limits[$tier]) && is_array($tier_limits[$tier]) ? $tier_limits[$tier] : [];
                            $reports_per_month = isset($tier_data['reports_per_month']) ? $tier_data['reports_per_month'] : 0;
                            ?>
                            <tr>
                                <th scope="row">
                                    <label for="reports_per_month_<?php echo $tier; ?>">Informes por Mes</label>
                                </th>
                                <td>
                                    <input
                                        type="number"
                                        id="reports_per_month_<?php echo $tier; ?>"
                                        name="reports_per_month"
                                        value="<?php echo esc_attr($reports_per_month); ?>"
                                        class="regular-text"
                                        min="-1"
                                    />
                                    <p class="description">Número máximo de informes que puede generar por mes. -1 = ilimitado.</p>
                                </td>
                            </tr>

                            <tr>
                                <th scope="row">
                                    <label>Tipos de Informe Disponibles</label>
                                </th>
                                <td>
                                    <?php
                                    $current_tier_limits = isset($tier_limits[$tier]) && is_array($tier_limits[$tier]) ? $tier_limits[$tier] : [];
                                    $selected_types = isset($current_tier_limits['report_types']) && is_array($current_tier_limits['report_types']) ? $current_tier_limits['report_types'] : [];
                                    if (!is_array($report_types) || isset($report_types['error'])) {
                                        echo '<p>No se pudieron cargar los tipos de informe.</p>';
                                    } else {
                                        foreach ($report_types as $type) {
                                            // Verificar que $type sea un array válido
                                            if (!is_array($type)) {
                                                continue;
                                            }
                                            $type_id = isset($type['type_id']) ? $type['type_id'] : '';
                                            $type_name = isset($type['name']) ? $type['name'] : $type_id;
                                            if (empty($type_id)) {
                                                continue;
                                            }
                                            $checked = in_array($type_id, $selected_types) || in_array('all', $selected_types);
                                            ?>
                                            <label style="display: block; margin-bottom: 5px;">
                                                <input
                                                    type="checkbox"
                                                    name="report_types[]"
                                                    value="<?php echo esc_attr($type_id); ?>"
                                                    <?php checked($checked); ?>
                                                />
                                                <?php echo esc_html($type_name); ?>
                                                <code><?php echo esc_html($type_id); ?></code>
                                            </label>
                                            <?php
                                        }
                                    }
                                    ?>
                                    <p class="description">Selecciona qué tipos de informe puede generar este tier.</p>
                                </td>
                            </tr>

                            <tr>
                                <th scope="row">
                                    <label>Características</label>
                                </th>
                                <td>
                                    <?php
                                    $all_features = [
                                        'geocoding' => 'Geocodificación automática',
                                        'save_profiles' => 'Guardar perfiles',
                                        'download_pdf' => 'Descargar PDF',
                                        'custom_modules' => 'Módulos personalizados',
                                        'priority_support' => 'Soporte prioritario',
                                        'api_access' => 'Acceso a API'
                                    ];
                                    $selected_features = isset($tier_data['features']) && is_array($tier_data['features']) ? $tier_data['features'] : [];

                                    foreach ($all_features as $feature_key => $feature_label) {
                                        $checked = isset($selected_features[$feature_key]) && $selected_features[$feature_key];
                                        ?>
                                        <label style="display: block; margin-bottom: 5px;">
                                            <input
                                                type="checkbox"
                                                name="features[<?php echo $feature_key; ?>]"
                                                value="1"
                                                <?php checked($checked); ?>
                                            />
                                            <?php echo esc_html($feature_label); ?>
                                        </label>
                                        <?php
                                    }
                                    ?>
                                </td>
                            </tr>
                        </table>

                        <p class="submit">
                            <input type="submit" name="da_update_limits" class="button button-primary" value="Guardar Límites de <?php echo ucfirst($tier); ?>" />
                        </p>
                    </form>
                </div>
            <?php endforeach; ?>
        </div>

        <script>
        function switchTab(event, tier) {
            event.preventDefault();

            // Ocultar todos los tabs
            document.querySelectorAll('.tab-content').forEach(function(tab) {
                tab.style.display = 'none';
            });

            // Remover clase activa de todos los nav-tabs
            document.querySelectorAll('.nav-tab').forEach(function(tab) {
                tab.classList.remove('nav-tab-active');
            });

            // Mostrar el tab seleccionado
            document.getElementById('tab-' + tier).style.display = 'block';

            // Añadir clase activa al tab clickeado
            event.target.classList.add('nav-tab-active');
        }
        </script>
        <?php
    }
}
