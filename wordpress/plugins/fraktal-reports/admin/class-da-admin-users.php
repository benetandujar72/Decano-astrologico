<?php
/**
 * Clase para Gestión de Usuarios
 *
 * @package Decano_Astrologico
 * @since 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

// Cargar dependencias necesarias
require_once DECANO_PLUGIN_DIR . 'admin/class-da-admin-dashboard.php';

class DA_Admin_Users {

    /**
     * Obtener lista de usuarios con información de planes
     *
     * @param array $args Argumentos de filtrado
     * @return array Lista de usuarios
     */
    public static function get_users_with_plans($args = []) {
        $defaults = [
            'number' => 20,
            'paged' => 1,
            'plan_filter' => '',
            'search' => '',
            'orderby' => 'registered',
            'order' => 'DESC'
        ];

        $args = wp_parse_args($args, $defaults);

        // Query de usuarios
        $user_query_args = [
            'number' => $args['number'],
            'paged' => $args['paged'],
            'orderby' => $args['orderby'],
            'order' => $args['order']
        ];

        if (!empty($args['search'])) {
            $user_query_args['search'] = '*' . esc_attr($args['search']) . '*';
            $user_query_args['search_columns'] = ['user_login', 'user_email', 'display_name'];
        }

        $user_query = new WP_User_Query($user_query_args);
        $users = $user_query->get_results();
        $total_users = $user_query->get_total();

        $users_data = [];

        foreach ($users as $user) {
            $plan_tier = DA_Plan_Manager::get_user_plan($user->ID);

            // Aplicar filtro de plan si está activo
            if (!empty($args['plan_filter']) && $plan_tier !== $args['plan_filter']) {
                continue;
            }

            $usage = DA_Admin_Dashboard::get_user_monthly_usage($user->ID);
            $subscription = self::get_user_subscription($user->ID);

            $users_data[] = [
                'ID' => $user->ID,
                'display_name' => $user->display_name,
                'user_email' => $user->user_email,
                'user_login' => $user->user_login,
                'plan_tier' => $plan_tier,
                'reports_this_month' => $usage['current_month'],
                'subscription' => $subscription,
                'next_payment_date' => $subscription ? $subscription['next_payment_date'] : null,
                'registered' => $user->user_registered
            ];
        }

        return [
            'users' => $users_data,
            'total' => $total_users,
            'pages' => ceil($total_users / $args['number'])
        ];
    }

    /**
     * Obtener información de suscripción de un usuario
     *
     * @param int $user_id ID del usuario
     * @return array|null Información de suscripción
     */
    private static function get_user_subscription($user_id) {
        if (!function_exists('wcs_get_users_subscriptions')) {
            return null;
        }

        $subscriptions = wcs_get_users_subscriptions($user_id);

        foreach ($subscriptions as $subscription) {
            if ($subscription->get_status() === 'active') {
                return [
                    'id' => $subscription->get_id(),
                    'status' => $subscription->get_status(),
                    'next_payment_date' => $subscription->get_date('next_payment'),
                    'end_date' => $subscription->get_date('end'),
                    'total' => $subscription->get_total()
                ];
            }
        }

        return null;
    }

    /**
     * Cambiar plan de un usuario manualmente
     *
     * @param int $user_id ID del usuario
     * @param string $new_plan Nuevo plan (free, premium, enterprise)
     * @return bool|WP_Error True si se cambió, WP_Error si hubo error
     */
    public static function change_user_plan($user_id, $new_plan) {
        if (!in_array($new_plan, ['free', 'premium', 'enterprise'])) {
            return new WP_Error('invalid_plan', 'Plan inválido');
        }

        // Si el plan es free, cancelar suscripciones activas
        if ($new_plan === 'free') {
            if (function_exists('wcs_get_users_subscriptions')) {
                $subscriptions = wcs_get_users_subscriptions($user_id);
                foreach ($subscriptions as $subscription) {
                    if ($subscription->get_status() === 'active') {
                        $subscription->update_status('cancelled', 'Plan cambiado manualmente por administrador');
                    }
                }
            }

            // Limpiar cache
            DA_Plan_Manager::clear_user_plan_cache($user_id);
            return true;
        }

        // Para planes premium/enterprise, crear o modificar suscripción
        $product_id = get_option("da_product_{$new_plan}_id");
        if (!$product_id) {
            return new WP_Error('product_not_found', 'Producto no encontrado para el plan seleccionado');
        }

        // TODO: Implementar creación/modificación de suscripción
        // Por ahora solo limpiamos el cache para que se recalcule
        DA_Plan_Manager::clear_user_plan_cache($user_id);

        return true;
    }

    /**
     * Obtener detalles completos de un usuario
     *
     * @param int $user_id ID del usuario
     * @return array|null Detalles del usuario
     */
    public static function get_user_details($user_id) {
        $user = get_userdata($user_id);
        if (!$user) {
            return null;
        }

        $plan_tier = DA_Plan_Manager::get_user_plan($user_id);
        $limits = DA_Plan_Manager::get_plan_limits($plan_tier);
        $usage = DA_Admin_Dashboard::get_user_monthly_usage($user_id);
        $reports = DA_Admin_Dashboard::get_user_reports($user_id);
        $subscription = self::get_user_subscription($user_id);

        return [
            'user' => $user,
            'plan_tier' => $plan_tier,
            'limits' => $limits,
            'usage' => $usage,
            'reports' => $reports,
            'subscription' => $subscription
        ];
    }

    /**
     * Resetear contador de uso mensual de un usuario
     *
     * @param int $user_id ID del usuario
     * @return bool True si se reseteo correctamente
     */
    public static function reset_user_monthly_usage($user_id) {
        global $wpdb;
        $usage_table = $wpdb->prefix . 'da_plan_usage';
        $current_month = date('Y-m');

        if ($wpdb->get_var("SHOW TABLES LIKE '$usage_table'") != $usage_table) {
            return false;
        }

        $result = $wpdb->update(
            $usage_table,
            ['reports_count' => 0],
            [
                'user_id' => $user_id,
                'month_year' => $current_month
            ],
            ['%d'],
            ['%d', '%s']
        );

        return $result !== false;
    }
}
