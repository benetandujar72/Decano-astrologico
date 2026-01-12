<?php
/**
 * Script para resetear y recrear los productos del plugin
 *
 * INSTRUCCIONES DE USO:
 * 1. Sube este archivo a: wp-content/plugins/fraktal-reports/reset-products.php
 * 2. Accede a: https://programafraktal.com/wp-content/plugins/fraktal-reports/reset-products.php
 * 3. El script eliminará los productos antiguos y recreará todos los planes
 * 4. BORRA ESTE ARCHIVO después de usarlo por seguridad
 *
 * @package Decano_Astrologico
 * @since 1.0.0
 */

// Cargar WordPress
require_once('../../../../wp-load.php');

// Verificar que el usuario es administrador
if (!current_user_can('manage_options')) {
    wp_die('No tienes permisos para ejecutar este script.');
}

echo '<html><head><title>Reset de Productos - Decano Astrológico</title>';
echo '<style>body{font-family:sans-serif;max-width:800px;margin:50px auto;padding:20px;}';
echo 'h1{color:#333;}pre{background:#f5f5f5;padding:15px;border-radius:5px;overflow:auto;}';
echo '.success{color:#28a745;}.error{color:#dc3545;}.info{color:#007bff;}</style></head><body>';

echo '<h1>🔄 Reset de Productos - Decano Astrológico</h1>';
echo '<p>Este script eliminará los productos antiguos y recreará todos los planes (Free, Premium, Enterprise).</p>';
echo '<hr>';

// Cargar clases necesarias
require_once(DECANO_PLUGIN_DIR . 'includes/class-da-debug.php');
require_once(DECANO_PLUGIN_DIR . 'includes/class-da-activator.php');

DA_Debug::init();

echo '<h2>Paso 1: Eliminar productos antiguos</h2>';

$tiers = ['free', 'premium', 'enterprise'];
foreach ($tiers as $tier) {
    $product_id = get_option("da_product_{$tier}_id");

    if ($product_id) {
        echo "<p class='info'>📦 Encontrado producto $tier (ID: $product_id)</p>";

        $product = wc_get_product($product_id);
        if ($product) {
            $product->delete(true); // true = forzar eliminación permanente
            delete_option("da_product_{$tier}_id");
            echo "<p class='success'>✓ Producto $tier eliminado</p>";
        } else {
            echo "<p class='error'>✗ No se pudo obtener el producto $tier</p>";
        }
    } else {
        echo "<p class='info'>ℹ️ No existe producto guardado para $tier</p>";
    }
}

echo '<h2>Paso 2: Resetear marca de productos creados</h2>';
delete_option('da_products_created');
echo '<p class="success">✓ Marca de productos eliminada</p>';

echo '<h2>Paso 3: Recrear todos los productos</h2>';
echo '<pre>';

// Capturar logs en el output
ob_start();

try {
    // Llamar directamente al método privado usando reflexión
    $reflection = new ReflectionClass('DA_Activator');
    $method = $reflection->getMethod('create_subscription_products');
    $method->setAccessible(true);
    $method->invoke(null);

    echo "✓ Productos recreados exitosamente\n";

} catch (Exception $e) {
    echo "✗ ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}

$output = ob_get_clean();
echo htmlspecialchars($output);
echo '</pre>';

echo '<h2>Paso 4: Verificar productos creados</h2>';
echo '<table border="1" cellpadding="10" cellspacing="0" style="width:100%;border-collapse:collapse;">';
echo '<tr style="background:#f0f0f0;"><th>Plan</th><th>ID</th><th>Nombre</th><th>Precio</th><th>Estado</th></tr>';

foreach ($tiers as $tier) {
    $product_id = get_option("da_product_{$tier}_id");

    if ($product_id) {
        $product = wc_get_product($product_id);
        if ($product) {
            $color = $product->get_status() === 'publish' ? '#28a745' : '#dc3545';
            echo "<tr>";
            echo "<td><strong>" . ucfirst($tier) . "</strong></td>";
            echo "<td>{$product_id}</td>";
            echo "<td>{$product->get_name()}</td>";
            echo "<td>" . wc_price($product->get_price()) . "</td>";
            echo "<td style='color:$color'>{$product->get_status()}</td>";
            echo "</tr>";
        } else {
            echo "<tr><td>" . ucfirst($tier) . "</td><td colspan='4' style='color:#dc3545'>Error: No se pudo cargar el producto</td></tr>";
        }
    } else {
        echo "<tr><td>" . ucfirst($tier) . "</td><td colspan='4' style='color:#dc3545'>No creado</td></tr>";
    }
}

echo '</table>';

echo '<hr>';
echo '<h2>✅ Proceso Completado</h2>';
echo '<p><strong style="color:#dc3545;">IMPORTANTE:</strong> Por seguridad, borra este archivo inmediatamente:</p>';
echo '<pre>rm /home/u791640010/domains/programafraktal.com/public_html/wp-content/plugins/fraktal-reports/reset-products.php</pre>';
echo '<p>O desde el Administrador de Archivos de tu hosting.</p>';
echo '<p><a href="/wp-admin/admin.php?page=decano">← Volver al Dashboard de Decano</a></p>';

echo '</body></html>';
