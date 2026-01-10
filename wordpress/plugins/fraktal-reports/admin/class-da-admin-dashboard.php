<?php
/**
 * Clase para el Dashboard de Administración
 *
 * @package Decano_Astrologico
 * @since 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class DA_Admin_Dashboard {

    /**
     * Obtener todas las estadísticas del dashboard
     *
     * @return array Estadísticas completas
     */
    public static function get_stats() {
        global $wpdb;

        $current_month = date('Y-m');
        $usage_table = $wpdb->prefix . 'da_plan_usage';
        $sessions_table = $wpdb->prefix . 'da_report_sessions';

        // Informes generados este mes
        $reports_this_month = 0;
        if ($wpdb->get_var("SHOW TABLES LIKE '$usage_table'") == $usage_table) {
            $reports_this_month = $wpdb->get_var($wpdb->prepare(
                "SELECT SUM(reports_count) FROM $usage_table WHERE month_year = %s",
                $current_month
            ));
        }

        // Usuarios activos (con al menos 1 informe este mes)
        $active_users = 0;
        if ($wpdb->get_var("SHOW TABLES LIKE '$usage_table'") == $usage_table) {
            $active_users = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(DISTINCT user_id) FROM $usage_table WHERE month_year = %s AND reports_count > 0",
                $current_month
            ));
        }

        // Total de usuarios registrados
        $total_users = count_users();
        $total_users_count = $total_users['total_users'];

        // Suscripciones activas
        $active_subscriptions = self::get_active_subscriptions_count();

        // Ingresos este mes
        $revenue_this_month = self::get_monthly_revenue();

        // Uso mensual últimos 6 meses
        $monthly_usage = self::get_monthly_usage(6);

        // Distribución de planes
        $plans_distribution = self::get_plans_distribution();

        // Informes por estado
        $reports_by_status = self::get_reports_by_status();

        // Últimos informes generados
        $recent_reports = self::get_recent_reports(10);

        return [
            'reports_this_month' => intval($reports_this_month),
            'active_users' => intval($active_users),
            'total_users' => intval($total_users_count),
            'active_subscriptions' => $active_subscriptions,
            'revenue_this_month' => floatval($revenue_this_month),
            'monthly_usage' => $monthly_usage,
            'plans_distribution' => $plans_distribution,
            'reports_by_status' => $reports_by_status,
            'recent_reports' => $recent_reports
        ];
    }

    /**
     * Obtener número de suscripciones activas
     *
     * @return int Número de suscripciones activas
     */
    private static function get_active_subscriptions_count() {
        if (!function_exists('wcs_get_subscriptions')) {
            return 0;
        }

        $subscriptions = wcs_get_subscriptions([
            'status' => 'active',
            'subscriptions_per_page' => -1
        ]);

        return count($subscriptions);
    }

    /**
     * Obtener ingresos del mes actual
     *
     * @return float Ingresos del mes
     */
    private static function get_monthly_revenue() {
        global $wpdb;

        $start_date = date('Y-m-01 00:00:00');
        $end_date = date('Y-m-t 23:59:59');

        $revenue = $wpdb->get_var($wpdb->prepare("
            SELECT SUM(meta.meta_value)
            FROM {$wpdb->prefix}posts as posts
            INNER JOIN {$wpdb->prefix}postmeta as meta ON posts.ID = meta.post_id
            WHERE posts.post_type = 'shop_order'
            AND posts.post_status IN ('wc-completed', 'wc-processing')
            AND meta.meta_key = '_order_total'
            AND posts.post_date >= %s
            AND posts.post_date <= %s
        ", $start_date, $end_date));

        return $revenue ?: 0;
    }

    /**
     * Obtener uso mensual de los últimos N meses
     *
     * @param int $months Número de meses a consultar
     * @return array Datos de uso mensual
     */
    private static function get_monthly_usage($months = 6) {
        global $wpdb;
        $usage_table = $wpdb->prefix . 'da_plan_usage';

        if ($wpdb->get_var("SHOW TABLES LIKE '$usage_table'") != $usage_table) {
            return [];
        }

        $results = $wpdb->get_results($wpdb->prepare("
            SELECT month_year, SUM(reports_count) as total
            FROM $usage_table
            WHERE month_year >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL %d MONTH), '%%Y-%%m')
            GROUP BY month_year
            ORDER BY month_year ASC
        ", $months));

        $data = [];
        foreach ($results as $row) {
            $data[] = [
                'month' => $row->month_year,
                'count' => intval($row->total)
            ];
        }

        return $data;
    }

    /**
     * Obtener distribución de usuarios por plan
     *
     * @return array Distribución de planes
     */
    private static function get_plans_distribution() {
        $distribution = [
            'free' => 0,
            'premium' => 0,
            'enterprise' => 0
        ];

        // Contar suscripciones activas por producto
        if (function_exists('wcs_get_subscriptions')) {
            foreach (['premium', 'enterprise'] as $tier) {
                $product_id = get_option("da_product_{$tier}_id");
                if (!$product_id) {
                    continue;
                }

                $subscriptions = wcs_get_subscriptions([
                    'product_id' => $product_id,
                    'status' => 'active',
                    'subscriptions_per_page' => -1
                ]);

                $distribution[$tier] = count($subscriptions);
            }
        }

        // Free = total usuarios - usuarios con suscripción
        $total_users = count_users();
        $paid_users = $distribution['premium'] + $distribution['enterprise'];
        $distribution['free'] = max(0, $total_users['total_users'] - $paid_users);

        return $distribution;
    }

    /**
     * Obtener informes agrupados por estado
     *
     * @return array Informes por estado
     */
    private static function get_reports_by_status() {
        global $wpdb;
        $sessions_table = $wpdb->prefix . 'da_report_sessions';

        if ($wpdb->get_var("SHOW TABLES LIKE '$sessions_table'") != $sessions_table) {
            return [];
        }

        $results = $wpdb->get_results("
            SELECT status, COUNT(*) as count
            FROM $sessions_table
            GROUP BY status
        ");

        $data = [];
        foreach ($results as $row) {
            $data[$row->status] = intval($row->count);
        }

        return $data;
    }

    /**
     * Obtener informes recientes
     *
     * @param int $limit Número de informes a obtener
     * @return array Informes recientes
     */
    private static function get_recent_reports($limit = 10) {
        global $wpdb;
        $sessions_table = $wpdb->prefix . 'da_report_sessions';

        if ($wpdb->get_var("SHOW TABLES LIKE '$sessions_table'") != $sessions_table) {
            return [];
        }

        $results = $wpdb->get_results($wpdb->prepare("
            SELECT
                s.session_id,
                s.user_id,
                s.status,
                s.created_at,
                u.display_name as user_name
            FROM $sessions_table s
            LEFT JOIN {$wpdb->prefix}users u ON s.user_id = u.ID
            ORDER BY s.created_at DESC
            LIMIT %d
        ", $limit));

        return $results;
    }

    /**
     * Obtener informes de un usuario específico
     *
     * @param int $user_id ID del usuario
     * @return array Informes del usuario
     */
    public static function get_user_reports($user_id) {
        global $wpdb;
        $sessions_table = $wpdb->prefix . 'da_report_sessions';

        if ($wpdb->get_var("SHOW TABLES LIKE '$sessions_table'") != $sessions_table) {
            return [];
        }

        $results = $wpdb->get_results($wpdb->prepare("
            SELECT
                session_id,
                status,
                created_at,
                updated_at
            FROM $sessions_table
            WHERE user_id = %d
            ORDER BY created_at DESC
        ", $user_id));

        return $results;
    }

    /**
     * Obtener uso mensual de un usuario
     *
     * @param int $user_id ID del usuario
     * @return array Uso mensual del usuario
     */
    public static function get_user_monthly_usage($user_id) {
        global $wpdb;
        $usage_table = $wpdb->prefix . 'da_plan_usage';
        $current_month = date('Y-m');

        if ($wpdb->get_var("SHOW TABLES LIKE '$usage_table'") != $usage_table) {
            return [
                'current_month' => 0,
                'history' => []
            ];
        }

        // Uso del mes actual
        $current = $wpdb->get_var($wpdb->prepare("
            SELECT reports_count
            FROM $usage_table
            WHERE user_id = %d AND month_year = %s
        ", $user_id, $current_month));

        // Historial últimos 6 meses
        $history = $wpdb->get_results($wpdb->prepare("
            SELECT month_year, reports_count
            FROM $usage_table
            WHERE user_id = %d
            AND month_year >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 6 MONTH), '%%Y-%%m')
            ORDER BY month_year DESC
        ", $user_id));

        return [
            'current_month' => intval($current),
            'history' => $history
        ];
    }
}
