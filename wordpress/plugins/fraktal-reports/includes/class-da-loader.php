<?php
/**
 * Cargador de Hooks del Plugin
 *
 * @package Decano_Astrologico
 * @since 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class DA_Loader {

    /**
     * Constructor
     */
    public function __construct() {
        $this->load_dependencies();
        $this->define_admin_hooks();
        $this->define_public_hooks();
        $this->define_woocommerce_hooks();
        $this->define_cron_hooks();
    }

    /**
     * Cargar dependencias
     */
    private function load_dependencies() {
        // Clases Core
        require_once DECANO_PLUGIN_DIR . 'includes/class-da-debug.php';
        require_once DECANO_PLUGIN_DIR . 'includes/class-da-plan-manager.php';
        require_once DECANO_PLUGIN_DIR . 'includes/class-da-limits.php';
        require_once DECANO_PLUGIN_DIR . 'includes/class-da-rest-api.php';
        require_once DECANO_PLUGIN_DIR . 'includes/class-da-page-setup.php';

        // Admin
        if (is_admin()) {
            require_once DECANO_PLUGIN_DIR . 'admin/class-da-admin-dashboard.php';
            require_once DECANO_PLUGIN_DIR . 'admin/class-da-admin-users.php';
            require_once DECANO_PLUGIN_DIR . 'admin/class-da-admin.php';
        }

        // Public
        require_once DECANO_PLUGIN_DIR . 'public/class-da-public.php';
        require_once DECANO_PLUGIN_DIR . 'public/class-da-shortcodes.php';

        // API (mantener compatibilidad con código existente)
        // La clase Fraktal_Reports_Plugin existente maneja los AJAX endpoints

        // Registrar REST API endpoints
        add_action('rest_api_init', ['DA_REST_API', 'register_routes']);
    }

    /**
     * Hooks del admin
     */
    private function define_admin_hooks() {
        if (!is_admin()) {
            return;
        }

        $admin = new DA_Admin();

        add_action('admin_menu', [$admin, 'add_admin_menu']);
        add_action('admin_enqueue_scripts', [$admin, 'enqueue_styles']);
        add_action('admin_enqueue_scripts', [$admin, 'enqueue_scripts']);
    }

    /**
     * Hooks del frontend
     */
    private function define_public_hooks() {
        $public = new DA_Public();

        add_action('wp_enqueue_scripts', [$public, 'enqueue_styles']);
        add_action('wp_enqueue_scripts', [$public, 'enqueue_scripts']);

        // Shortcodes
        add_shortcode('decano-report-generator', ['DA_Shortcodes', 'report_generator_shortcode']);
        add_shortcode('decano-user-dashboard', ['DA_Shortcodes', 'user_dashboard_shortcode']);
        add_shortcode('decano-plans', ['DA_Shortcodes', 'plans_shortcode']);
        add_shortcode('decano-report-history', ['DA_Shortcodes', 'report_history_shortcode']);

        // Shortcodes para sistema de informe Free
        add_shortcode('decano-free-report-form', ['DA_Shortcodes', 'free_report_form_shortcode']);
        add_shortcode('decano-upgrade-landing', ['DA_Shortcodes', 'upgrade_landing_shortcode']);
        add_shortcode('decano-free-report-viewer', ['DA_Shortcodes', 'free_report_viewer_shortcode']);

        // Mantener compatibilidad con versión anterior
        add_shortcode('fraktal_panel', ['DA_Shortcodes', 'legacy_panel_shortcode']);
    }

    /**
     * Hooks de WooCommerce
     */
    private function define_woocommerce_hooks() {
        // Hook cuando se completa un pedido
        add_action('woocommerce_order_status_completed', [$this, 'on_order_completed'], 10, 1);

        // Hook cuando se activa/cancela una suscripción
        add_action('woocommerce_subscription_status_updated', [$this, 'on_subscription_status_changed'], 10, 3);

        // Limpiar cache del plan cuando cambia la suscripción
        add_action('woocommerce_subscription_status_active', [$this, 'clear_plan_cache_on_subscription_change'], 10, 1);
        add_action('woocommerce_subscription_status_cancelled', [$this, 'clear_plan_cache_on_subscription_change'], 10, 1);
        add_action('woocommerce_subscription_status_expired', [$this, 'clear_plan_cache_on_subscription_change'], 10, 1);
    }

    /**
     * Hooks de cron
     */
    private function define_cron_hooks() {
        // Reseteo mensual (limpieza de registros antiguos)
        add_action('da_monthly_usage_reset', ['DA_Limits', 'monthly_reset']);

        // Programar tarea si no existe
        if (!wp_next_scheduled('da_monthly_usage_reset')) {
            wp_schedule_event(strtotime('first day of next month midnight'), 'monthly', 'da_monthly_usage_reset');
        }
    }

    /**
     * Handler cuando se completa un pedido
     *
     * @param int $order_id ID del pedido
     */
    public function on_order_completed($order_id) {
        if (!function_exists('wc_get_order')) {
            return;
        }

        $order = wc_get_order($order_id);
        if (!$order) {
            return;
        }

        $user_id = $order->get_user_id();
        if ($user_id) {
            // Limpiar cache del plan del usuario
            DA_Plan_Manager::clear_user_plan_cache($user_id);
        }
    }

    /**
     * Handler cuando cambia el estado de una suscripción
     *
     * @param WC_Subscription $subscription Suscripción
     * @param string $new_status Nuevo estado
     * @param string $old_status Estado anterior
     */
    public function on_subscription_status_changed($subscription, $new_status, $old_status) {
        $user_id = $subscription->get_user_id();
        if ($user_id) {
            DA_Plan_Manager::clear_user_plan_cache($user_id);
        }
    }

    /**
     * Limpiar cache cuando cambia suscripción
     *
     * @param WC_Subscription $subscription Suscripción
     */
    public function clear_plan_cache_on_subscription_change($subscription) {
        $user_id = $subscription->get_user_id();
        if ($user_id) {
            DA_Plan_Manager::clear_user_plan_cache($user_id);
        }
    }

    /**
     * Ejecutar el plugin
     */
    public function run() {
        // El plugin está cargado y funcionando
    }
}
