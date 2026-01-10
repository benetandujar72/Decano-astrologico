<?php
/**
 * Gestor de Planes de Usuario
 *
 * @package Decano_Astrologico
 * @since 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class DA_Plan_Manager {

    /**
     * Cache key prefix
     */
    const CACHE_PREFIX = 'da_user_plan_';
    const CACHE_DURATION = 300; // 5 minutos

    /**
     * Obtener el plan actual del usuario
     *
     * @param int $user_id ID del usuario
     * @return string 'free', 'premium' o 'enterprise'
     */
    public static function get_user_plan($user_id) {
        if (empty($user_id)) {
            return 'free';
        }

        // Verificar cache
        $cache_key = self::CACHE_PREFIX . $user_id;
        $cached_plan = get_transient($cache_key);
        if ($cached_plan !== false) {
            return $cached_plan;
        }

        // Administradores tienen plan enterprise automáticamente
        $user = get_user_by('ID', $user_id);
        if ($user && (user_can($user_id, 'manage_options') || in_array('administrator', (array) $user->roles, true))) {
            set_transient($cache_key, 'enterprise', self::CACHE_DURATION);
            return 'enterprise';
        }

        // Verificar suscripciones activas de WooCommerce
        $plan = self::get_plan_from_subscriptions($user_id);

        // Cachear resultado
        set_transient($cache_key, $plan, self::CACHE_DURATION);

        return $plan;
    }

    /**
     * Obtener plan desde suscripciones de WooCommerce
     *
     * @param int $user_id ID del usuario
     * @return string Plan tier
     */
    private static function get_plan_from_subscriptions($user_id) {
        if (!function_exists('wcs_get_users_subscriptions')) {
            return 'free';
        }

        $subscriptions = wcs_get_users_subscriptions($user_id);

        // Prioridad: enterprise > premium > free
        $highest_plan = 'free';

        foreach ($subscriptions as $subscription) {
            if ($subscription->get_status() !== 'active') {
                continue;
            }

            foreach ($subscription->get_items() as $item) {
                $product_id = $item->get_product_id();
                $plan_tier = get_post_meta($product_id, 'da_plan_tier', true);

                if ($plan_tier === 'enterprise') {
                    return 'enterprise'; // Máxima prioridad, retornar inmediatamente
                }

                if ($plan_tier === 'premium' && $highest_plan === 'free') {
                    $highest_plan = 'premium';
                }
            }
        }

        return $highest_plan;
    }

    /**
     * Verificar si un usuario puede generar un tipo de informe
     *
     * @param int $user_id ID del usuario
     * @param string $report_type Tipo de informe
     * @return bool
     */
    public static function can_generate_report($user_id, $report_type) {
        $plan = self::get_user_plan($user_id);
        $limits = self::get_plan_limits($plan);

        // Verificar si el tipo de informe está permitido
        $allowed_types = $limits['report_types'];

        if (in_array('all', $allowed_types, true)) {
            return true;
        }

        return in_array($report_type, $allowed_types, true);
    }

    /**
     * Obtener límites y capacidades de un plan
     *
     * @param string $plan_tier Tier del plan
     * @return array Límites del plan
     */
    public static function get_plan_limits($plan_tier) {
        $limits = [
            'free' => [
                'max_reports_per_month' => 1,
                'report_types' => ['carta_natal_resumida'],
                'can_use_templates' => false,
                'max_templates' => 0,
                'can_use_advanced_css' => false,
                'can_access_api' => false,
                'features' => [
                    '1 informe resumido/mes',
                    'Carta natal básica',
                    'Posiciones planetarias',
                    'Aspectos principales'
                ]
            ],
            'premium' => [
                'max_reports_per_month' => -1, // Ilimitado
                'report_types' => ['all'], // Todos menos enterprise-exclusivos
                'can_use_templates' => true,
                'max_templates' => 5,
                'can_use_advanced_css' => false,
                'can_access_api' => false,
                'features' => [
                    'Informes ilimitados',
                    'Informes completos',
                    'Plantillas personalizadas (5 máx)',
                    'Técnicas avanzadas',
                    'Exportación PDF/DOCX',
                    'Soporte prioritario'
                ]
            ],
            'enterprise' => [
                'max_reports_per_month' => -1, // Ilimitado
                'report_types' => ['all'],
                'can_use_templates' => true,
                'max_templates' => -1, // Ilimitado
                'can_use_advanced_css' => true,
                'can_access_api' => true,
                'features' => [
                    'Todo de Premium',
                    'Informes personalizados',
                    'API REST completa',
                    'Prompts personalizados',
                    'Soporte 24/7',
                    'Gestor de cuenta dedicado',
                    'Plantillas ilimitadas',
                    'CSS personalizado'
                ]
            ]
        ];

        return $limits[$plan_tier] ?? $limits['free'];
    }

    /**
     * Obtener información completa del plan del usuario
     *
     * @param int $user_id ID del usuario
     * @return array Información del plan
     */
    public static function get_user_plan_info($user_id) {
        $tier = self::get_user_plan($user_id);
        $limits = self::get_plan_limits($tier);

        // Obtener producto WooCommerce
        $product_id = get_option("da_product_{$tier}_id");
        $price = 0;
        $name = ucfirst($tier);

        if ($product_id) {
            $product = wc_get_product($product_id);
            if ($product) {
                $price = floatval($product->get_price());
                $name = $product->get_name();
            }
        }

        return [
            'tier' => $tier,
            'name' => $name,
            'price' => $price,
            'limits' => $limits,
            'product_id' => $product_id
        ];
    }

    /**
     * Limpiar cache del plan de un usuario
     *
     * @param int $user_id ID del usuario
     */
    public static function clear_user_plan_cache($user_id) {
        $cache_key = self::CACHE_PREFIX . $user_id;
        delete_transient($cache_key);
    }

    /**
     * Verificar si usuario ha alcanzado límite de plantillas
     *
     * @param int $user_id ID del usuario
     * @return bool
     */
    public static function can_create_template($user_id) {
        $plan = self::get_user_plan($user_id);
        $limits = self::get_plan_limits($plan);

        if (!$limits['can_use_templates']) {
            return false;
        }

        $max_templates = $limits['max_templates'];

        // Ilimitado
        if ($max_templates === -1) {
            return true;
        }

        // Contar plantillas del usuario
        global $wpdb;
        $count = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->prefix}da_templates WHERE user_id = %d AND deleted_at IS NULL",
            $user_id
        ));

        return intval($count) < $max_templates;
    }
}
