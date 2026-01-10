<?php
/**
 * Clase de Shortcodes del Plugin
 *
 * @package Decano_Astrologico
 * @since 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class DA_Shortcodes {

    /**
     * [decano-report-generator]
     * Generador completo de informes con wizard
     */
    public static function report_generator_shortcode($atts) {
        $atts = shortcode_atts([
            'plan_check' => 'true',
            'show_upgrade' => 'true'
        ], $atts);

        if (!is_user_logged_in()) {
            return '<div class="decano-login-required"><p>Debes iniciar sesión para generar informes.</p><a href="' . wp_login_url(get_permalink()) . '">Iniciar sesión</a></div>';
        }

        ob_start();
        ?>
        <div
            id="decano-report-generator"
            data-component="ReportGenerator"
            data-plan-check="<?php echo esc_attr($atts['plan_check']); ?>"
            data-show-upgrade="<?php echo esc_attr($atts['show_upgrade']); ?>"
        ></div>
        <?php
        return ob_get_clean();
    }

    /**
     * [decano-user-dashboard]
     * Dashboard del usuario con stats e informes
     */
    public static function user_dashboard_shortcode($atts) {
        if (!is_user_logged_in()) {
            return '<div class="decano-login-required"><p>Debes iniciar sesión para ver tu dashboard.</p><a href="' . wp_login_url(get_permalink()) . '">Iniciar sesión</a></div>';
        }

        ob_start();
        ?>
        <div
            id="decano-user-dashboard"
            data-component="UserDashboard"
        ></div>
        <?php
        return ob_get_clean();
    }

    /**
     * [decano-plans]
     * Selector de planes con comparación
     */
    public static function plans_shortcode($atts) {
        $atts = shortcode_atts([
            'highlighted' => 'premium'
        ], $atts);

        ob_start();
        ?>
        <div
            id="decano-plans"
            data-component="PlanSelector"
            data-highlighted="<?php echo esc_attr($atts['highlighted']); ?>"
        ></div>
        <?php
        return ob_get_clean();
    }

    /**
     * [decano-report-history]
     * Historial de informes (usa el mismo componente que el dashboard)
     */
    public static function report_history_shortcode($atts) {
        if (!is_user_logged_in()) {
            return '<div class="decano-login-required"><p>Debes iniciar sesión.</p><a href="' . wp_login_url(get_permalink()) . '">Iniciar sesión</a></div>';
        }

        // Por ahora reutilizamos UserDashboard que incluye el historial
        return self::user_dashboard_shortcode($atts);
    }

    /**
     * [fraktal_panel] - Compatibilidad con versión anterior
     * Redirige al nuevo shortcode de generador
     */
    public static function legacy_panel_shortcode($atts) {
        return self::report_generator_shortcode($atts);
    }
}
