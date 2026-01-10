<?php
/**
 * Plugin Name: Decano Astrológico - Diagnóstico Mínimo
 * Plugin URI: https://app.programafraktal.com
 * Description: Versión de diagnóstico MÍNIMA para identificar problemas de instalación.
 * Version: 1.0.0-diagnostic
 * Author: Decano Team
 * Author URI: https://app.programafraktal.com
 * License: GPL-2.0+
 * Requires at least: 6.0
 * Requires PHP: 8.0
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * VERSIÓN ULTRA SIMPLIFICADA PARA DIAGNÓSTICO
 *
 * Este plugin NO hace nada excepto:
 * 1. Verificar PHP y WordPress
 * 2. Verificar WooCommerce
 * 3. Escribir en el log
 * 4. Mostrarte el resultado
 */

/**
 * Activación ultra simple
 */
function decano_minimal_activate() {
    // Escribir directamente a error_log de PHP
    error_log('========================================');
    error_log('DECANO MINIMAL ACTIVATION START');
    error_log('========================================');
    error_log('Timestamp: ' . date('Y-m-d H:i:s'));

    // Paso 1: PHP
    error_log('STEP 1: Checking PHP...');
    error_log('PHP Version: ' . PHP_VERSION);

    if (version_compare(PHP_VERSION, '8.0', '<')) {
        error_log('ERROR: PHP version is too old');
        wp_die(
            '<h1>❌ PHP Versión Insuficiente</h1>' .
            '<p>Este plugin requiere <strong>PHP 8.0</strong> o superior.</p>' .
            '<p>Tu versión actual: <strong>' . PHP_VERSION . '</strong></p>' .
            '<p><a href="' . admin_url('plugins.php') . '">← Volver a Plugins</a></p>'
        );
    }
    error_log('✓ PHP version OK');

    // Paso 2: WordPress
    error_log('STEP 2: Checking WordPress...');
    global $wp_version;
    error_log('WordPress Version: ' . $wp_version);
    error_log('✓ WordPress OK');

    // Paso 3: WooCommerce
    error_log('STEP 3: Checking WooCommerce...');

    if (!class_exists('WooCommerce')) {
        error_log('ERROR: WooCommerce not found');
        wp_die(
            '<h1>❌ WooCommerce No Instalado</h1>' .
            '<p>Este plugin requiere <strong>WooCommerce</strong> instalado y activado.</p>' .
            '<p>Instala WooCommerce desde: <a href="' . admin_url('plugin-install.php?s=woocommerce&tab=search&type=term') . '">Plugins > Añadir nuevo</a></p>' .
            '<hr>' .
            '<h3>📋 Log de Diagnóstico</h3>' .
            '<p>Se han guardado detalles en el log de PHP.</p>' .
            '<p>Ubicaciones posibles:</p>' .
            '<ul>' .
            '<li><code>/wp-content/debug.log</code></li>' .
            '<li><code>error_log</code> de tu hosting (pregunta a soporte)</li>' .
            '</ul>' .
            '<p><a href="' . admin_url('plugins.php') . '">← Volver a Plugins</a></p>'
        );
    }

    error_log('✓ WooCommerce found');
    error_log('WooCommerce Version: ' . WC()->version);

    // Paso 4: Verificar permisos de escritura
    error_log('STEP 4: Checking file permissions...');
    $upload_dir = wp_upload_dir();
    error_log('Upload dir: ' . $upload_dir['basedir']);
    error_log('Upload writable: ' . (is_writable($upload_dir['basedir']) ? 'YES' : 'NO'));

    // Paso 5: Crear opción simple en BD
    error_log('STEP 5: Testing database write...');
    $test_value = 'diagnostic_' . time();
    update_option('decano_minimal_test', $test_value);
    $read_value = get_option('decano_minimal_test');

    if ($read_value === $test_value) {
        error_log('✓ Database write/read OK');
    } else {
        error_log('ERROR: Database write/read FAILED');
        error_log('Written: ' . $test_value);
        error_log('Read: ' . $read_value);
    }

    error_log('========================================');
    error_log('DECANO MINIMAL ACTIVATION SUCCESS');
    error_log('========================================');

    // Mostrar mensaje de éxito con instrucciones
    wp_die(
        '<h1>✅ Activación Exitosa - Plugin de Diagnóstico</h1>' .
        '<p><strong>El plugin de diagnóstico se activó correctamente.</strong></p>' .
        '<hr>' .
        '<h3>📋 Información Recopilada:</h3>' .
        '<ul>' .
        '<li><strong>PHP:</strong> ' . PHP_VERSION . ' ✓</li>' .
        '<li><strong>WordPress:</strong> ' . $wp_version . ' ✓</li>' .
        '<li><strong>WooCommerce:</strong> ' . WC()->version . ' ✓</li>' .
        '<li><strong>Upload Dir:</strong> ' . (is_writable($upload_dir['basedir']) ? 'Escribible ✓' : 'NO escribible ❌') . '</li>' .
        '<li><strong>Database:</strong> ' . ($read_value === $test_value ? 'OK ✓' : 'ERROR ❌') . '</li>' .
        '</ul>' .
        '<hr>' .
        '<h3>🔍 Próximos Pasos:</h3>' .
        '<ol>' .
        '<li>Copia esta información completa</li>' .
        '<li>Ve al log de errores de PHP</li>' .
        '<li>Busca las líneas entre <code>DECANO MINIMAL ACTIVATION START</code> y <code>SUCCESS</code></li>' .
        '<li>Envía toda esta información</li>' .
        '</ol>' .
        '<p><a href="' . admin_url('plugins.php') . '" class="button button-primary">← Volver a Plugins</a></p>',
        'Diagnóstico Completado',
        ['response' => 200, 'back_link' => true]
    );
}
register_activation_hook(__FILE__, 'decano_minimal_activate');

/**
 * Agregar menú de diagnóstico
 */
function decano_minimal_menu() {
    add_menu_page(
        'Decano Diagnóstico',
        'Decano Diagnóstico',
        'manage_options',
        'decano-minimal',
        'decano_minimal_page',
        'dashicons-warning',
        30
    );
}
add_action('admin_menu', 'decano_minimal_menu');

/**
 * Página de diagnóstico
 */
function decano_minimal_page() {
    global $wp_version;
    $upload_dir = wp_upload_dir();

    ?>
    <div class="wrap">
        <h1>🔍 Diagnóstico Decano Astrológico</h1>

        <div class="notice notice-info">
            <p><strong>Esta es una versión de diagnóstico.</strong> Solo muestra información del sistema.</p>
        </div>

        <table class="widefat" style="max-width: 800px;">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Valor</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>PHP Version</strong></td>
                    <td><code><?php echo PHP_VERSION; ?></code></td>
                    <td><?php echo version_compare(PHP_VERSION, '8.0', '>=') ? '✅ OK' : '❌ FAIL'; ?></td>
                </tr>
                <tr>
                    <td><strong>WordPress Version</strong></td>
                    <td><code><?php echo $wp_version; ?></code></td>
                    <td>✅ OK</td>
                </tr>
                <tr>
                    <td><strong>WooCommerce</strong></td>
                    <td><?php echo class_exists('WooCommerce') ? '<code>' . WC()->version . '</code>' : 'No instalado'; ?></td>
                    <td><?php echo class_exists('WooCommerce') ? '✅ OK' : '❌ MISSING'; ?></td>
                </tr>
                <tr>
                    <td><strong>WooCommerce Subscriptions</strong></td>
                    <td><?php echo class_exists('WC_Subscriptions') ? '<code>' . (WC_Subscriptions::$version ?? 'unknown') . '</code>' : 'No instalado'; ?></td>
                    <td><?php echo class_exists('WC_Subscriptions') ? '✅ OK' : '⚠️ OPTIONAL'; ?></td>
                </tr>
                <tr>
                    <td><strong>Upload Directory</strong></td>
                    <td><code><?php echo $upload_dir['basedir']; ?></code></td>
                    <td><?php echo is_writable($upload_dir['basedir']) ? '✅ Writable' : '❌ Not Writable'; ?></td>
                </tr>
                <tr>
                    <td><strong>Memory Limit</strong></td>
                    <td><code><?php echo ini_get('memory_limit'); ?></code></td>
                    <td>✅ OK</td>
                </tr>
                <tr>
                    <td><strong>Max Execution Time</strong></td>
                    <td><code><?php echo ini_get('max_execution_time'); ?>s</code></td>
                    <td>✅ OK</td>
                </tr>
            </tbody>
        </table>

        <hr>

        <h2>📝 Instrucciones</h2>
        <p><strong>Si todo está en verde (✅), tu servidor está listo para el plugin completo.</strong></p>

        <p>Copia esta información y envíala:</p>
        <textarea readonly style="width: 100%; height: 200px; font-family: monospace; font-size: 12px;">
=== DIAGNÓSTICO DECANO ===
PHP: <?php echo PHP_VERSION; ?> <?php echo version_compare(PHP_VERSION, '8.0', '>=') ? 'OK' : 'FAIL'; ?>

WordPress: <?php echo $wp_version; ?> OK
WooCommerce: <?php echo class_exists('WooCommerce') ? WC()->version . ' OK' : 'MISSING'; ?>

WC Subscriptions: <?php echo class_exists('WC_Subscriptions') ? 'Installed' : 'Not Installed'; ?>

Upload Dir: <?php echo is_writable($upload_dir['basedir']) ? 'Writable' : 'Not Writable'; ?>

Memory: <?php echo ini_get('memory_limit'); ?>

Max Execution: <?php echo ini_get('max_execution_time'); ?>s
        </textarea>

        <p>
            <a href="<?php echo admin_url('plugins.php'); ?>" class="button button-primary">← Volver a Plugins</a>
        </p>
    </div>
    <?php
}
