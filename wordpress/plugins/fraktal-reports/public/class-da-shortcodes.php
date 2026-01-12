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

    /**
     * [decano-free-report-form]
     * Formulario simplificado para informe gratuito (usuarios Free)
     */
    public static function free_report_form_shortcode($atts) {
        $atts = shortcode_atts([
            'redirect_after' => '' // URL opcional para redirigir después de generar
        ], $atts);

        // No requiere login para mostrar el formulario (el usuario se registra en el proceso)
        ob_start();
        ?>
        <div
            id="decano-free-report-form"
            data-component="FreeReportForm"
            data-redirect-after="<?php echo esc_attr($atts['redirect_after']); ?>"
        ></div>
        <?php
        return ob_get_clean();
    }

    /**
     * [decano-upgrade-landing]
     * Landing page con pricing para upgrade de Free a Premium
     */
    public static function upgrade_landing_shortcode($atts) {
        $atts = shortcode_atts([
            'show_free_cta' => 'true',
            'highlight' => 'revolucion_solar_2026' // Plan destacado por defecto
        ], $atts);

        ob_start();
        ?>
        <div
            id="decano-upgrade-landing"
            data-component="UpgradeLanding"
            data-show-free-cta="<?php echo esc_attr($atts['show_free_cta']); ?>"
            data-highlight="<?php echo esc_attr($atts['highlight']); ?>"
        ></div>
        <?php
        return ob_get_clean();
    }

    /**
     * [decano-free-report-viewer]
     * Visualizador del informe gratuito generado
     */
    public static function free_report_viewer_shortcode($atts) {
        if (!is_user_logged_in()) {
            return '<div class="decano-login-required"><p>Debes iniciar sesión para ver tu informe.</p><a href="' . wp_login_url(get_permalink()) . '">Iniciar sesión</a></div>';
        }

        $atts = shortcode_atts([
            'session_id' => '', // ID de sesión del informe a mostrar
            'show_upgrade_cta' => 'true'
        ], $atts);

        ob_start();
        ?>
        <div
            id="decano-free-report-viewer"
            data-component="FreeReportViewer"
            data-session-id="<?php echo esc_attr($atts['session_id']); ?>"
            data-show-upgrade-cta="<?php echo esc_attr($atts['show_upgrade_cta']); ?>"
        ></div>
        <?php
        return ob_get_clean();
    }
}
