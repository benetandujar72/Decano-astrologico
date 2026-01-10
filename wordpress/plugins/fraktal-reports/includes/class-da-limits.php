<?php
/**
 * Control de Límites de Uso
 *
 * @package Decano_Astrologico
 * @since 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class DA_Limits {

    /**
     * Verificar si el usuario ha alcanzado el límite mensual de informes
     *
     * @param int $user_id ID del usuario
     * @return bool True si puede generar, False si alcanzó el límite
     */
    public static function check_monthly_limit($user_id) {
        $plan = DA_Plan_Manager::get_user_plan($user_id);
        $limits = DA_Plan_Manager::get_plan_limits($plan);

        $max_reports = $limits['max_reports_per_month'];

        // Ilimitado
        if ($max_reports === -1) {
            return true;
        }

        // Obtener uso actual del mes
        $usage = self::get_monthly_usage($user_id);
        $current_count = $usage['reports_count'];

        return $current_count < $max_reports;
    }

    /**
     * Obtener uso del mes actual
     *
     * @param int $user_id ID del usuario
     * @return array Datos de uso
     */
    public static function get_monthly_usage($user_id) {
        global $wpdb;

        $table = $wpdb->prefix . 'da_plan_usage';
        $month_year = date('Y-m');

        $row = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table WHERE user_id = %d AND month_year = %s",
            $user_id,
            $month_year
        ), ARRAY_A);

        if (!$row) {
            return [
                'reports_count' => 0,
                'month_year' => $month_year,
                'plan_tier' => DA_Plan_Manager::get_user_plan($user_id)
            ];
        }

        return [
            'reports_count' => intval($row['reports_count']),
            'month_year' => $row['month_year'],
            'plan_tier' => $row['plan_tier']
        ];
    }

    /**
     * Incrementar contador de uso mensual
     *
     * @param int $user_id ID del usuario
     * @return bool Success
     */
    public static function increment_usage($user_id) {
        global $wpdb;

        $table = $wpdb->prefix . 'da_plan_usage';
        $month_year = date('Y-m');
        $plan = DA_Plan_Manager::get_user_plan($user_id);

        // Intentar actualizar registro existente
        $updated = $wpdb->query($wpdb->prepare(
            "UPDATE $table SET reports_count = reports_count + 1, plan_tier = %s WHERE user_id = %d AND month_year = %s",
            $plan,
            $user_id,
            $month_year
        ));

        // Si no existe, crear nuevo registro
        if ($updated === 0) {
            $wpdb->insert(
                $table,
                [
                    'user_id' => $user_id,
                    'month_year' => $month_year,
                    'reports_count' => 1,
                    'plan_tier' => $plan,
                    'last_reset' => current_time('mysql')
                ],
                ['%d', '%s', '%d', '%s', '%s']
            );
        }

        return true;
    }

    /**
     * Obtener estadísticas de uso de un usuario
     *
     * @param int $user_id ID del usuario
     * @param int $months Número de meses a consultar
     * @return array Historial de uso
     */
    public static function get_usage_stats($user_id, $months = 6) {
        global $wpdb;

        $table = $wpdb->prefix . 'da_plan_usage';

        $results = $wpdb->get_results($wpdb->prepare(
            "SELECT month_year, reports_count, plan_tier
             FROM $table
             WHERE user_id = %d
             AND month_year >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL %d MONTH), '%%Y-%%m')
             ORDER BY month_year DESC",
            $user_id,
            $months
        ), ARRAY_A);

        return $results;
    }

    /**
     * Resetear contador mensual (ejecutar vía cron al inicio de cada mes)
     */
    public static function monthly_reset() {
        // No es necesario resetear porque usamos month_year como clave única
        // Los registros antiguos se mantienen para historial
        // Opcionalmente limpiar registros muy antiguos (> 12 meses)

        global $wpdb;
        $table = $wpdb->prefix . 'da_plan_usage';

        $wpdb->query(
            "DELETE FROM $table
             WHERE month_year < DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 12 MONTH), '%Y-%m')"
        );
    }

    /**
     * Obtener información completa de límites y uso del usuario
     *
     * @param int $user_id ID del usuario
     * @return array
     */
    public static function get_user_limits_info($user_id) {
        $plan = DA_Plan_Manager::get_user_plan($user_id);
        $limits = DA_Plan_Manager::get_plan_limits($plan);
        $usage = self::get_monthly_usage($user_id);

        $max_reports = $limits['max_reports_per_month'];
        $current_count = $usage['reports_count'];

        return [
            'plan' => $plan,
            'max_reports_per_month' => $max_reports,
            'reports_used_this_month' => $current_count,
            'reports_remaining' => $max_reports === -1 ? -1 : max(0, $max_reports - $current_count),
            'can_generate' => self::check_monthly_limit($user_id),
            'unlimited' => $max_reports === -1
        ];
    }

    /**
     * Verificar si puede usar una característica específica
     *
     * @param int $user_id ID del usuario
     * @param string $feature Característica a verificar
     * @return bool
     */
    public static function can_use_feature($user_id, $feature) {
        $plan = DA_Plan_Manager::get_user_plan($user_id);
        $limits = DA_Plan_Manager::get_plan_limits($plan);

        switch ($feature) {
            case 'templates':
                return $limits['can_use_templates'];
            case 'advanced_css':
                return $limits['can_use_advanced_css'];
            case 'api':
                return $limits['can_access_api'];
            default:
                return false;
        }
    }
}
