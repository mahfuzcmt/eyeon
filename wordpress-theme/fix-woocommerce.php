<?php
/**
 * Disable WooCommerce Coming Soon Mode & Fix Shop
 * URL: https://sticketing.xyz/lms/fix-woocommerce.php
 * DELETE THIS FILE AFTER RUNNING!
 */

require_once('wp-load.php');

if (!current_user_can('manage_options')) {
    wp_die('You must be logged in as admin.');
}

echo "<h1>Fixing WooCommerce Shop</h1><pre>";

// ============================================================
// 1. DISABLE COMING SOON MODE
// ============================================================
echo "=== Disabling Coming Soon Mode ===\n";

// WooCommerce Coming Soon options
delete_option('woocommerce_coming_soon');
update_option('woocommerce_coming_soon', 'no');

// Additional coming soon settings
delete_option('woocommerce_store_pages_only');
update_option('woocommerce_store_pages_only', 'no');

// Remove coming soon page setting
delete_option('woocommerce_coming_soon_page_id');

echo "Coming Soon mode DISABLED\n";

// ============================================================
// 2. FIX SHOP PAGE SETTINGS
// ============================================================
echo "\n=== Fixing Shop Page ===\n";

// Get or create shop page
$shop_page = get_page_by_path('shop');
if (!$shop_page) {
    $shop_id = wp_insert_post([
        'post_title' => 'Shop',
        'post_name' => 'shop',
        'post_status' => 'publish',
        'post_type' => 'page',
        'post_content' => ''
    ]);
    echo "Created new Shop page (ID: {$shop_id})\n";
} else {
    $shop_id = $shop_page->ID;

    // Make sure shop page has no Coming Soon content
    wp_update_post([
        'ID' => $shop_id,
        'post_content' => ''
    ]);
    echo "Shop page exists (ID: {$shop_id})\n";
}

// Set as WooCommerce shop page
update_option('woocommerce_shop_page_id', $shop_id);
echo "Set as WooCommerce shop page\n";

// ============================================================
// 3. FIX OTHER WOOCOMMERCE PAGES
// ============================================================
echo "\n=== Setting Other WooCommerce Pages ===\n";

$woo_pages = [
    'cart' => [
        'option' => 'woocommerce_cart_page_id',
        'content' => '[woocommerce_cart]'
    ],
    'checkout' => [
        'option' => 'woocommerce_checkout_page_id',
        'content' => '[woocommerce_checkout]'
    ],
    'my-account' => [
        'option' => 'woocommerce_myaccount_page_id',
        'content' => '[woocommerce_my_account]'
    ]
];

foreach ($woo_pages as $slug => $config) {
    $page = get_page_by_path($slug);
    if ($page) {
        update_option($config['option'], $page->ID);
        echo "Set {$slug} page (ID: {$page->ID})\n";
    } else {
        $page_id = wp_insert_post([
            'post_title' => ucwords(str_replace('-', ' ', $slug)),
            'post_name' => $slug,
            'post_status' => 'publish',
            'post_type' => 'page',
            'post_content' => $config['content']
        ]);
        update_option($config['option'], $page_id);
        echo "Created {$slug} page (ID: {$page_id})\n";
    }
}

// ============================================================
// 4. FIX PRODUCT VISIBILITY
// ============================================================
echo "\n=== Fixing Product Visibility ===\n";

$products = get_posts([
    'post_type' => 'product',
    'posts_per_page' => -1,
    'post_status' => 'any'
]);

echo "Found " . count($products) . " products\n";

foreach ($products as $product) {
    // Make sure product is published
    if ($product->post_status !== 'publish') {
        wp_update_post([
            'ID' => $product->ID,
            'post_status' => 'publish'
        ]);
        echo "Published: {$product->post_title}\n";
    }

    // Set visibility
    update_post_meta($product->ID, '_visibility', 'visible');
    update_post_meta($product->ID, '_stock_status', 'instock');

    // Remove any catalog exclusions
    wp_remove_object_terms($product->ID, ['exclude-from-search', 'exclude-from-catalog'], 'product_visibility');

    // Ensure it's a simple product
    wp_set_object_terms($product->ID, 'simple', 'product_type');
}

echo "All products set to visible\n";

// ============================================================
// 5. WOOCOMMERCE SETTINGS
// ============================================================
echo "\n=== Updating WooCommerce Settings ===\n";

// Currency
update_option('woocommerce_currency', 'BDT');
update_option('woocommerce_currency_pos', 'left_space');
update_option('woocommerce_price_thousand_sep', ',');
update_option('woocommerce_price_decimal_sep', '.');
update_option('woocommerce_price_num_decimals', '0');

// Country
update_option('woocommerce_default_country', 'BD');

// Catalog visibility
update_option('woocommerce_shop_page_display', '');
update_option('woocommerce_category_archive_display', '');
update_option('woocommerce_default_catalog_orderby', 'menu_order');

// Enable reviews
update_option('woocommerce_enable_reviews', 'yes');

// Stock management
update_option('woocommerce_manage_stock', 'no');
update_option('woocommerce_hide_out_of_stock_items', 'no');

echo "WooCommerce settings updated\n";

// ============================================================
// 6. CLEAR ALL CACHES
// ============================================================
echo "\n=== Clearing Caches ===\n";

// WooCommerce transients
if (function_exists('wc_delete_product_transients')) {
    wc_delete_product_transients();
}
delete_transient('wc_products_onsale');
delete_transient('wc_featured_products');
delete_transient('woocommerce_cache_prefix');

// WordPress transients
global $wpdb;
$wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '%_transient_%'");

// Object cache
if (function_exists('wp_cache_flush')) {
    wp_cache_flush();
}

echo "All caches cleared\n";

// ============================================================
// 7. FLUSH REWRITE RULES
// ============================================================
echo "\n=== Flushing Rewrite Rules ===\n";
flush_rewrite_rules(true);
echo "Rewrite rules flushed\n";

// ============================================================
// 8. VERIFY PRODUCTS
// ============================================================
echo "\n=== Verifying Products ===\n";

$visible_products = wc_get_products([
    'status' => 'publish',
    'limit' => -1,
    'visibility' => 'visible'
]);

echo "Visible products in catalog: " . count($visible_products) . "\n";

if (count($visible_products) > 0) {
    echo "\nProducts list:\n";
    foreach ($visible_products as $prod) {
        echo "  - {$prod->get_name()} (ID: {$prod->get_id()}, Price: " . $prod->get_price() . " BDT)\n";
    }
}

// ============================================================
// DONE
// ============================================================
echo "\n=== COMPLETE ===\n";
echo "WooCommerce Coming Soon mode DISABLED!\n";
echo "Shop should now display products.\n";
echo "\nVisit: " . home_url('/shop/') . "\n";
echo "\n*** DELETE THIS FILE NOW! ***\n";

echo "</pre>";

echo "<p><a href='" . home_url('/shop/') . "' style='font-size:20px;'>→ Go to Shop</a></p>";
?>
