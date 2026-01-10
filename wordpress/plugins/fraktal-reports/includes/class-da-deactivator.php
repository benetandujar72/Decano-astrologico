<?php
/**
 * Desactivador del plugin Decano Astrológico
 *
 * @package Decano_Astrologico
 * @since 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class DA_Deactivator {

    /**
     * Ejecutar al desactivar el plugin
     */
    public static function deactivate() {
        // Limpiar tareas programadas
        wp_clear_scheduled_hook('da_monthly_usage_reset');
        wp_clear_scheduled_hook('da_cleanup_old_sessions');

        // Flush rewrite rules
        flush_rewrite_rules();

        // Nota: NO eliminamos tablas ni productos para preservar datos
        // Si se requiere eliminación completa, usar uninstall.php
    }
}
