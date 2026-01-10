<?php
/**
 * Clase para Gestión de Informes
 *
 * @package Decano_Astrologico
 * @since 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class DA_Admin_Reports {

    /**
     * Obtener lista de informes con filtros
     *
     * @param array $args Argumentos de filtrado
     * @return array Lista de informes
     */
    public static function get_reports($args = []) {
        global $wpdb;
        $sessions_table = $wpdb->prefix . 'da_report_sessions';

        if ($wpdb->get_var("SHOW TABLES LIKE '$sessions_table'") != $sessions_table) {
            return [
                'reports' => [],
                'total' => 0,
                'pages' => 0
            ];
        }

        $defaults = [
            'number' => 20,
            'paged' => 1,
            'status' => '',
            'user_id' => '',
            'date_from' => '',
            'date_to' => '',
            'search' => '',
            'orderby' => 'created_at',
            'order' => 'DESC'
        ];

        $args = wp_parse_args($args, $defaults);

        // Construir WHERE clause
        $where = ['1=1'];
        $where_values = [];

        if (!empty($args['status'])) {
            $where[] = 's.status = %s';
            $where_values[] = $args['status'];
        }

        if (!empty($args['user_id'])) {
            $where[] = 's.user_id = %d';
            $where_values[] = intval($args['user_id']);
        }

        if (!empty($args['date_from'])) {
            $where[] = 's.created_at >= %s';
            $where_values[] = $args['date_from'] . ' 00:00:00';
        }

        if (!empty($args['date_to'])) {
            $where[] = 's.created_at <= %s';
            $where_values[] = $args['date_to'] . ' 23:59:59';
        }

        if (!empty($args['search'])) {
            $where[] = '(u.display_name LIKE %s OR u.user_email LIKE %s OR s.session_id LIKE %s)';
            $search_term = '%' . $wpdb->esc_like($args['search']) . '%';
            $where_values[] = $search_term;
            $where_values[] = $search_term;
            $where_values[] = $search_term;
        }

        $where_clause = implode(' AND ', $where);

        // Ordenamiento
        $orderby = in_array($args['orderby'], ['created_at', 'updated_at', 'status']) ? $args['orderby'] : 'created_at';
        $order = in_array(strtoupper($args['order']), ['ASC', 'DESC']) ? strtoupper($args['order']) : 'DESC';

        // Contar total
        $count_query = "
            SELECT COUNT(*)
            FROM $sessions_table s
            LEFT JOIN {$wpdb->prefix}users u ON s.user_id = u.ID
            WHERE $where_clause
        ";

        if (!empty($where_values)) {
            $count_query = $wpdb->prepare($count_query, $where_values);
        }

        $total = $wpdb->get_var($count_query);

        // Obtener informes
        $offset = ($args['paged'] - 1) * $args['number'];

        $query = "
            SELECT
                s.*,
                u.display_name as user_name,
                u.user_email
            FROM $sessions_table s
            LEFT JOIN {$wpdb->prefix}users u ON s.user_id = u.ID
            WHERE $where_clause
            ORDER BY s.$orderby $order
            LIMIT %d OFFSET %d
        ";

        $query_values = array_merge($where_values, [$args['number'], $offset]);
        $results = $wpdb->get_results($wpdb->prepare($query, $query_values));

        return [
            'reports' => $results,
            'total' => intval($total),
            'pages' => ceil($total / $args['number'])
        ];
    }

    /**
     * Obtener detalles de un informe
     *
     * @param string $session_id ID de sesión del informe
     * @return array|null Detalles del informe
     */
    public static function get_report_details($session_id) {
        global $wpdb;
        $sessions_table = $wpdb->prefix . 'da_report_sessions';

        if ($wpdb->get_var("SHOW TABLES LIKE '$sessions_table'") != $sessions_table) {
            return null;
        }

        $report = $wpdb->get_row($wpdb->prepare("
            SELECT
                s.*,
                u.display_name as user_name,
                u.user_email
            FROM $sessions_table s
            LEFT JOIN {$wpdb->prefix}users u ON s.user_id = u.ID
            WHERE s.session_id = %s
        ", $session_id));

        if (!$report) {
            return null;
        }

        // Obtener plan del usuario
        $plan = DA_Plan_Manager::get_user_plan($report->user_id);

        return [
            'report' => $report,
            'user_plan' => $plan
        ];
    }

    /**
     * Eliminar un informe
     *
     * @param string $session_id ID de sesión del informe
     * @return bool True si se eliminó correctamente
     */
    public static function delete_report($session_id) {
        global $wpdb;
        $sessions_table = $wpdb->prefix . 'da_report_sessions';

        if ($wpdb->get_var("SHOW TABLES LIKE '$sessions_table'") != $sessions_table) {
            return false;
        }

        $result = $wpdb->delete(
            $sessions_table,
            ['session_id' => $session_id],
            ['%s']
        );

        return $result !== false;
    }

    /**
     * Eliminar informes antiguos (más de X días)
     *
     * @param int $days Días de antigüedad
     * @return int Número de informes eliminados
     */
    public static function cleanup_old_reports($days = 90) {
        global $wpdb;
        $sessions_table = $wpdb->prefix . 'da_report_sessions';

        if ($wpdb->get_var("SHOW TABLES LIKE '$sessions_table'") != $sessions_table) {
            return 0;
        }

        $date_threshold = date('Y-m-d H:i:s', strtotime("-{$days} days"));

        $result = $wpdb->query($wpdb->prepare("
            DELETE FROM $sessions_table
            WHERE created_at < %s
            AND status IN ('completed', 'failed')
        ", $date_threshold));

        return $result ?: 0;
    }

    /**
     * Obtener estadísticas de informes
     *
     * @return array Estadísticas
     */
    public static function get_report_stats() {
        global $wpdb;
        $sessions_table = $wpdb->prefix . 'da_report_sessions';

        if ($wpdb->get_var("SHOW TABLES LIKE '$sessions_table'") != $sessions_table) {
            return [];
        }

        // Total de informes
        $total = $wpdb->get_var("SELECT COUNT(*) FROM $sessions_table");

        // Por estado
        $by_status = $wpdb->get_results("
            SELECT status, COUNT(*) as count
            FROM $sessions_table
            GROUP BY status
        ", OBJECT_K);

        // Últimos 30 días
        $last_30_days = $wpdb->get_var($wpdb->prepare("
            SELECT COUNT(*)
            FROM $sessions_table
            WHERE created_at >= %s
        ", date('Y-m-d H:i:s', strtotime('-30 days'))));

        // Promedio de informes por día (últimos 30 días)
        $avg_per_day = $last_30_days / 30;

        return [
            'total' => intval($total),
            'by_status' => $by_status,
            'last_30_days' => intval($last_30_days),
            'avg_per_day' => round($avg_per_day, 2)
        ];
    }

    /**
     * Exportar informes a CSV
     *
     * @param array $args Argumentos de filtrado
     * @return string Ruta del archivo CSV generado
     */
    public static function export_to_csv($args = []) {
        $data = self::get_reports(array_merge($args, [
            'number' => -1,
            'paged' => 1
        ]));

        $upload_dir = wp_upload_dir();
        $csv_file = $upload_dir['basedir'] . '/da-reports-export-' . date('Y-m-d-His') . '.csv';

        $fp = fopen($csv_file, 'w');

        // Encabezados
        fputcsv($fp, [
            'Session ID',
            'Usuario',
            'Email',
            'Estado',
            'Fecha Creación',
            'Fecha Actualización'
        ]);

        // Datos
        foreach ($data['reports'] as $report) {
            fputcsv($fp, [
                $report->session_id,
                $report->user_name,
                $report->user_email,
                $report->status,
                $report->created_at,
                $report->updated_at
            ]);
        }

        fclose($fp);

        return $csv_file;
    }
}
