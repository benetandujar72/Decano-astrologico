<?php
/**
 * Clase Public del Plugin
 *
 * @package Decano_Astrologico
 * @since 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class DA_Public {

    /**
     * Cargar estilos del frontend
     */
    public function enqueue_styles() {
        // Solo cargar si hay contenido del plugin en la página
        global $post;
        if (!$post || !has_shortcode($post->post_content, 'fraktal_panel')) {
            return;
        }

        wp_enqueue_style(
            'decano-public',
            DECANO_PLUGIN_URL . 'public/css/da-public.css',
            [],
            DECANO_VERSION
        );
    }

    /**
     * Cargar scripts del frontend
     */
    public function enqueue_scripts() {
        // Solo cargar si hay contenido del plugin en la página
        global $post;
        if (!$post || !has_shortcode($post->post_content, 'fraktal_panel')) {
            return;
        }

        wp_enqueue_script(
            'decano-public',
            DECANO_PLUGIN_URL . 'public/js/da-public.js',
            ['jquery'],
            DECANO_VERSION,
            true
        );

        // Inyectar configuración para JavaScript
        wp_localize_script('decano-public', 'DecanoConfig', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'downloadUrl' => admin_url('admin-post.php?action=fraktal_reports_download'),
            'nonce' => wp_create_nonce('fraktal_reports_nonce'),
            'currentUser' => [
                'id' => get_current_user_id(),
                'name' => wp_get_current_user()->display_name,
                'plan' => DA_Plan_Manager::get_user_plan(get_current_user_id())
            ],
            'strings' => [
                'loginRequired' => __('Debes iniciar sesión para usar esta funcionalidad.', 'decano'),
                'error' => __('Error', 'decano'),
                'success' => __('Éxito', 'decano')
            ]
        ]);
    }
}
