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
     * Verificar si la página tiene algún shortcode de Decano
     */
    private function has_decano_shortcode() {
        global $post;

        if (!$post) {
            return false;
        }

        $shortcodes = [
            'decano-free-report-form',
            'decano-free-report-viewer',
            'decano-upgrade-landing',
            'decano-report-generator',
            'decano-user-dashboard',
            'decano-plans',
            'decano-report-history',
            'fraktal_panel' // Compatibilidad con versión anterior
        ];

        foreach ($shortcodes as $shortcode) {
            if (has_shortcode($post->post_content, $shortcode)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Cargar estilos del frontend
     */
    public function enqueue_styles() {
        // Solo cargar si hay contenido del plugin en la página
        if (!$this->has_decano_shortcode()) {
            return;
        }

        // Estilos legacy
        wp_enqueue_style(
            'decano-public',
            DECANO_PLUGIN_URL . 'public/css/da-public.css',
            [],
            DECANO_VERSION
        );

        // Estilos de React compilados (da-app.css)
        $react_css_path = DECANO_PLUGIN_DIR . 'public/build/da-app.css';
        if (file_exists($react_css_path)) {
            wp_enqueue_style(
                'decano-react-app',
                DECANO_PLUGIN_URL . 'public/build/da-app.css',
                [],
                DECANO_VERSION
            );
        } else {
            // Fallback: buscar en assets/ con glob (builds anteriores)
            $css_dir = DECANO_PLUGIN_DIR . 'public/build/assets/';
            if (is_dir($css_dir)) {
                $css_files = glob($css_dir . '*.css');
                if (!empty($css_files)) {
                    foreach ($css_files as $index => $css_file) {
                        $css_url = DECANO_PLUGIN_URL . 'public/build/assets/' . basename($css_file);
                        wp_enqueue_style(
                            'decano-react-' . $index,
                            $css_url,
                            [],
                            DECANO_VERSION
                        );
                    }
                }
            }
        }
    }

    /**
     * Cargar scripts del frontend
     */
    public function enqueue_scripts() {
        // Solo cargar si hay contenido del plugin en la página
        if (!$this->has_decano_shortcode()) {
            return;
        }

        // Script legacy
        wp_enqueue_script(
            'decano-public',
            DECANO_PLUGIN_URL . 'public/js/da-public.js',
            ['jquery'],
            DECANO_VERSION,
            true
        );

        // Script de React compilado (da-app.js)
        if (file_exists(DECANO_PLUGIN_DIR . 'public/build/da-app.js')) {
            wp_enqueue_script(
                'decano-react-app',
                DECANO_PLUGIN_URL . 'public/build/da-app.js',
                [],
                DECANO_VERSION,
                true
            );
        }

        // Inyectar configuración para JavaScript
        $config = [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'restUrl' => rest_url(),
            'restNonce' => wp_create_nonce('wp_rest'),
            'downloadUrl' => admin_url('admin-post.php?action=fraktal_reports_download'),
            'nonce' => wp_create_nonce('fraktal_reports_nonce'),
            'apiUrl' => get_option('da_api_url', ''),
            'currentUser' => [
                'id' => get_current_user_id(),
                'name' => wp_get_current_user()->display_name,
                'email' => wp_get_current_user()->user_email,
                'isLoggedIn' => is_user_logged_in(),
                'plan' => is_user_logged_in() ? DA_Plan_Manager::get_user_plan(get_current_user_id()) : 'free'
            ],
            'strings' => [
                'loginRequired' => __('Debes iniciar sesión para usar esta funcionalidad.', 'decano'),
                'error' => __('Error', 'decano'),
                'success' => __('Éxito', 'decano')
            ]
        ];

        wp_localize_script('decano-public', 'DecanoConfig', $config);

        // También inyectar para React si existe
        if (file_exists(DECANO_PLUGIN_DIR . 'public/build/da-app.js')) {
            wp_localize_script('decano-react-app', 'wpApiSettings', [
                'root' => rest_url(),
                'nonce' => wp_create_nonce('wp_rest')
            ]);
            wp_localize_script('decano-react-app', 'decanoSettings', $config);
        }
    }
}
