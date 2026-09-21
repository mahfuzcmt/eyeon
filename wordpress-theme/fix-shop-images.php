<?php
/**
 * Fix Shop & Add Product Images
 * URL: https://sticketing.xyz/lms/fix-shop-images.php
 * DELETE THIS FILE AFTER RUNNING!
 */

// Increase limits for image downloads
set_time_limit(300);
ini_set('memory_limit', '256M');

require_once('wp-load.php');
require_once(ABSPATH . 'wp-admin/includes/media.php');
require_once(ABSPATH . 'wp-admin/includes/file.php');
require_once(ABSPATH . 'wp-admin/includes/image.php');

if (!current_user_can('manage_options')) {
    wp_die('You must be logged in as admin.');
}

echo "<h1>Fixing Shop & Adding Images</h1><pre>";

// ============================================================
// 1. CHECK AND FIX WOOCOMMERCE SETTINGS
// ============================================================
echo "=== Checking WooCommerce ===\n";

if (!class_exists('WooCommerce')) {
    echo "ERROR: WooCommerce is NOT installed!\n";
    echo "Please install WooCommerce first.\n";
    echo "</pre>";
    exit;
}

echo "WooCommerce is active.\n";

// Ensure shop page is set
$shop_page = get_page_by_path('shop');
if ($shop_page) {
    update_option('woocommerce_shop_page_id', $shop_page->ID);
    echo "Shop page set (ID: {$shop_page->ID})\n";
} else {
    // Create shop page if missing
    $shop_id = wp_insert_post([
        'post_title' => 'Shop',
        'post_name' => 'shop',
        'post_status' => 'publish',
        'post_type' => 'page',
        'post_content' => ''
    ]);
    update_option('woocommerce_shop_page_id', $shop_id);
    echo "Created Shop page (ID: {$shop_id})\n";
}

// Set other WooCommerce pages
$woo_pages = [
    'cart' => 'woocommerce_cart_page_id',
    'checkout' => 'woocommerce_checkout_page_id',
    'my-account' => 'woocommerce_myaccount_page_id'
];

foreach ($woo_pages as $slug => $option) {
    $page = get_page_by_path($slug);
    if ($page) {
        update_option($option, $page->ID);
        echo "Set {$slug} page (ID: {$page->ID})\n";
    }
}

// Enable catalog mode off
update_option('woocommerce_catalog_visibility', 'visible');
update_option('woocommerce_shop_page_display', '');
update_option('woocommerce_category_archive_display', '');

echo "\n";

// ============================================================
// 2. PRODUCT IMAGES MAPPING
// ============================================================
$product_images = [
    // GPS Trackers
    'concox-gt06n-gps-tracker' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/01312-66-3333-6.jpg',
    'concox-gt06e-gps-tracker' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/01312-66-3333-7.jpg',
    'concox-wetrack2-personal-tracker' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/01312-66-3333-8.jpg',

    // CCTV / IP Cameras
    'hikvision-ds-2cd1043g0-i-4mp' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/07/01312-66-3333-2026-07-23T163205.864.jpg',
    'hikvision-ds-2ce16d0t-dome' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/0fbfabcb-5ee1-4ffb-98e6-e9dbd6a38d2b-800x800.jpg',
    'dahua-dh-hac-hfw1200rp-bullet' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/01312-66-3333-9.jpg',

    // DVR/NVR
    'hikvision-ds-7104hghi-k1-dvr' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/01312-66-3333-10.jpg',
    'dahua-dhi-nvr1108hs-nvr' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/01312-66-3333-11.jpg',

    // Access Control
    'zkteco-k40-fingerprint' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/07/01312-66-3333-2026-07-22T185132.063.jpg',
    'zkteco-mb20-face-recognition' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/07/01312-66-3333-96.jpg',
    'zkteco-ml10-smart-lock' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/07/01312-66-3333-2026-07-22T180920.653.jpg',

    // Walkie Talkies
    'motorola-t82-extreme' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/07/01312-66-3333-2026-07-25T143148.758-800x800.jpg',
    'baofeng-bf-888s-radio' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/01312-66-3333-5.jpg',
    'baofeng-uv-5r-dual-band' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/01312-66-3333-3-1.jpg',

    // Networking
    'tp-link-tl-sg1005d-switch' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/01312-66-3333-20.jpg',
    'tp-link-archer-c6-router' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/01312-66-3333-21.jpg',
];

// Fallback images if specific ones fail
$fallback_images = [
    'gps' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/01312-66-3333-6.jpg',
    'cctv' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/0fbfabcb-5ee1-4ffb-98e6-e9dbd6a38d2b-800x800.jpg',
    'access' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/07/01312-66-3333-96.jpg',
    'walkie' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/01312-66-3333-5.jpg',
    'network' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/07/01312-66-3333-2026-07-25T144218.998-800x800.jpg',
];

// ============================================================
// 3. DOWNLOAD AND ATTACH IMAGES TO PRODUCTS
// ============================================================
echo "=== Downloading & Attaching Product Images ===\n";

function download_and_attach_image($url, $post_id, $product_name) {
    // Check if product already has a thumbnail
    if (has_post_thumbnail($post_id)) {
        echo "  [SKIP] {$product_name} already has image\n";
        return true;
    }

    echo "  Downloading image for: {$product_name}... ";

    // Download the image
    $tmp = download_url($url, 30);

    if (is_wp_error($tmp)) {
        echo "FAILED (download error)\n";
        return false;
    }

    // Get file info
    $file_array = [
        'name' => basename(parse_url($url, PHP_URL_PATH)),
        'tmp_name' => $tmp
    ];

    // Upload to media library
    $attachment_id = media_handle_sideload($file_array, $post_id, $product_name);

    if (is_wp_error($attachment_id)) {
        @unlink($tmp);
        echo "FAILED (upload error)\n";
        return false;
    }

    // Set as featured image
    set_post_thumbnail($post_id, $attachment_id);
    echo "OK (ID: {$attachment_id})\n";

    return true;
}

// Process each product
$products = get_posts([
    'post_type' => 'product',
    'posts_per_page' => -1,
    'post_status' => 'publish'
]);

echo "Found " . count($products) . " products\n\n";

foreach ($products as $product) {
    $slug = $product->post_name;
    $name = $product->post_title;

    // Try specific image first
    if (isset($product_images[$slug])) {
        $result = download_and_attach_image($product_images[$slug], $product->ID, $name);
        if ($result) continue;
    }

    // Try fallback based on product name
    $image_url = null;
    $name_lower = strtolower($name);

    if (strpos($name_lower, 'gps') !== false || strpos($name_lower, 'tracker') !== false || strpos($name_lower, 'concox') !== false) {
        $image_url = $fallback_images['gps'];
    } elseif (strpos($name_lower, 'camera') !== false || strpos($name_lower, 'hikvision') !== false || strpos($name_lower, 'dahua') !== false || strpos($name_lower, 'dvr') !== false || strpos($name_lower, 'nvr') !== false) {
        $image_url = $fallback_images['cctv'];
    } elseif (strpos($name_lower, 'zkteco') !== false || strpos($name_lower, 'fingerprint') !== false || strpos($name_lower, 'face') !== false || strpos($name_lower, 'lock') !== false) {
        $image_url = $fallback_images['access'];
    } elseif (strpos($name_lower, 'walkie') !== false || strpos($name_lower, 'motorola') !== false || strpos($name_lower, 'baofeng') !== false || strpos($name_lower, 'radio') !== false) {
        $image_url = $fallback_images['walkie'];
    } elseif (strpos($name_lower, 'tp-link') !== false || strpos($name_lower, 'switch') !== false || strpos($name_lower, 'router') !== false) {
        $image_url = $fallback_images['network'];
    }

    if ($image_url) {
        download_and_attach_image($image_url, $product->ID, $name);
    } else {
        echo "  [NO IMAGE] {$name}\n";
    }
}

// ============================================================
// 4. FIX PRODUCT VISIBILITY
// ============================================================
echo "\n=== Fixing Product Visibility ===\n";

foreach ($products as $product) {
    // Make sure products are visible in catalog
    update_post_meta($product->ID, '_visibility', 'visible');
    update_post_meta($product->ID, '_stock_status', 'instock');

    // If using WooCommerce 3.0+
    $terms = ['exclude-from-search', 'exclude-from-catalog'];
    wp_remove_object_terms($product->ID, $terms, 'product_visibility');

    // Ensure product is simple type
    wp_set_object_terms($product->ID, 'simple', 'product_type');
}

echo "Fixed visibility for " . count($products) . " products\n";

// ============================================================
// 5. FLUSH REWRITE RULES
// ============================================================
echo "\n=== Flushing Rewrite Rules ===\n";
flush_rewrite_rules();
echo "Rewrite rules flushed\n";

// ============================================================
// 6. CLEAR CACHES
// ============================================================
echo "\n=== Clearing Caches ===\n";

// Clear WooCommerce transients
wc_delete_product_transients();
delete_transient('wc_products_onsale');
delete_transient('wc_featured_products');

// Clear object cache if available
if (function_exists('wp_cache_flush')) {
    wp_cache_flush();
}

echo "Caches cleared\n";

// ============================================================
// DONE
// ============================================================
echo "\n=== COMPLETE ===\n";
echo "Shop should now be working!\n";
echo "\nVisit: " . home_url('/shop/') . "\n";
echo "\nNOW DELETE THIS FILE!\n";

echo "</pre>";
?>
