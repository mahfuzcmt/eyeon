<?php
/**
 * Site Migration Script: experttechnologiesbd.com -> tech-solutionbd.net
 *
 * This script scrapes products, categories, brands, and images from the source site
 * and imports them into the destination WooCommerce site.
 *
 * USAGE:
 * 1. Upload this file to your WordPress root directory
 * 2. Login as admin
 * 3. Visit: https://tech-solutionbd.net/migrate-site.php
 * 4. DELETE THIS FILE AFTER MIGRATION!
 */

// Increase limits
set_time_limit(0);
ini_set('memory_limit', '512M');
ini_set('max_execution_time', 0);

// Load WordPress
require_once('wp-load.php');
require_once(ABSPATH . 'wp-admin/includes/media.php');
require_once(ABSPATH . 'wp-admin/includes/file.php');
require_once(ABSPATH . 'wp-admin/includes/image.php');

// Security check
if (!current_user_can('manage_options')) {
    wp_die('You must be logged in as admin to run this script.');
}

// Source site
define('SOURCE_SITE', 'https://experttechnologiesbd.com');

?>
<!DOCTYPE html>
<html>
<head>
    <title>Site Migration Tool</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 20px auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 2px solid #0073aa; padding-bottom: 10px; }
        h2 { color: #0073aa; margin-top: 30px; }
        .log { background: #1e1e1e; color: #00ff00; padding: 20px; border-radius: 4px; font-family: monospace; font-size: 13px; max-height: 500px; overflow-y: auto; white-space: pre-wrap; }
        .success { color: #00ff00; }
        .error { color: #ff4444; }
        .warning { color: #ffaa00; }
        .info { color: #00aaff; }
        .btn { background: #0073aa; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; margin: 5px; }
        .btn:hover { background: #005a87; }
        .btn-danger { background: #dc3545; }
        .btn-danger:hover { background: #c82333; }
        .progress { background: #ddd; border-radius: 4px; height: 25px; margin: 10px 0; }
        .progress-bar { background: #0073aa; height: 100%; border-radius: 4px; transition: width 0.3s; text-align: center; color: white; line-height: 25px; }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
        .stat-box { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #0073aa; }
        .stat-box h3 { margin: 0; font-size: 32px; color: #0073aa; }
        .stat-box p { margin: 5px 0 0; color: #666; }
    </style>
</head>
<body>
<div class="container">
    <h1>🚀 Site Migration Tool</h1>
    <p><strong>Source:</strong> <?php echo SOURCE_SITE; ?><br>
    <strong>Destination:</strong> <?php echo home_url(); ?></p>

    <?php
    $action = isset($_GET['action']) ? $_GET['action'] : '';

    if (empty($action)) {
        // Show main menu
        ?>
        <h2>Migration Steps</h2>
        <p>Run these in order:</p>

        <div style="margin: 20px 0;">
            <a href="?action=scan" class="btn">1. Scan Source Site</a>
            <a href="?action=brands" class="btn">2. Import Brands</a>
            <a href="?action=categories" class="btn">3. Import Categories</a>
            <a href="?action=products" class="btn">4. Import Products</a>
            <a href="?action=sliders" class="btn">5. Import Sliders</a>
            <a href="?action=pages" class="btn">6. Import Pages</a>
            <a href="?action=all" class="btn" style="background: #28a745;">Run All Steps</a>
        </div>

        <h2>Utilities</h2>
        <div style="margin: 20px 0;">
            <a href="?action=fix_images" class="btn">Fix Missing Images</a>
            <a href="?action=cleanup" class="btn btn-danger">Reset & Clean Up</a>
        </div>
        <?php
    } else {
        echo '<div class="log">';
        ob_implicit_flush(true);

        switch($action) {
            case 'scan':
                scan_source_site();
                break;
            case 'brands':
                import_brands();
                break;
            case 'categories':
                import_categories();
                break;
            case 'products':
                import_products();
                break;
            case 'sliders':
                import_sliders();
                break;
            case 'pages':
                import_pages();
                break;
            case 'all':
                scan_source_site();
                import_brands();
                import_categories();
                import_products();
                import_sliders();
                import_pages();
                break;
            case 'fix_images':
                fix_missing_images();
                break;
            case 'cleanup':
                cleanup_data();
                break;
        }

        echo '</div>';
        echo '<p><a href="?" class="btn">← Back to Menu</a></p>';
    }
    ?>
</div>
</body>
</html>
<?php

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function log_msg($msg, $type = 'info') {
    $colors = ['success' => '#00ff00', 'error' => '#ff4444', 'warning' => '#ffaa00', 'info' => '#00aaff'];
    $color = isset($colors[$type]) ? $colors[$type] : '#ffffff';
    echo "<span style='color: {$color}'>" . date('[H:i:s] ') . htmlspecialchars($msg) . "</span>\n";
    flush();
}

function fetch_url($url) {
    $response = wp_remote_get($url, [
        'timeout' => 60,
        'user-agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    ]);

    if (is_wp_error($response)) {
        return false;
    }

    return wp_remote_retrieve_body($response);
}

function download_image($url, $post_id = 0, $description = '') {
    if (empty($url)) return false;

    // Check if already downloaded
    global $wpdb;
    $existing = $wpdb->get_var($wpdb->prepare(
        "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = '_source_url' AND meta_value = %s",
        $url
    ));

    if ($existing) {
        return $existing;
    }

    $tmp = download_url($url, 60);
    if (is_wp_error($tmp)) {
        return false;
    }

    $file_array = [
        'name' => basename(parse_url($url, PHP_URL_PATH)),
        'tmp_name' => $tmp
    ];

    $attachment_id = media_handle_sideload($file_array, $post_id, $description);

    if (is_wp_error($attachment_id)) {
        @unlink($tmp);
        return false;
    }

    // Store source URL to avoid re-downloading
    update_post_meta($attachment_id, '_source_url', $url);

    return $attachment_id;
}

function extract_products_from_html($html) {
    $products = [];

    // Match product entries
    preg_match_all('/<li[^>]*class="[^"]*product[^"]*"[^>]*>.*?<\/li>/s', $html, $matches);

    foreach ($matches[0] as $product_html) {
        $product = [];

        // Extract URL
        if (preg_match('/href="([^"]*\/product\/[^"]*)"/', $product_html, $m)) {
            $product['url'] = $m[1];
        }

        // Extract title
        if (preg_match('/<h2[^>]*class="[^"]*woocommerce-loop-product__title[^"]*"[^>]*>([^<]+)</i', $product_html, $m)) {
            $product['title'] = trim(html_entity_decode($m[1]));
        } elseif (preg_match('/<h2[^>]*>([^<]+)</i', $product_html, $m)) {
            $product['title'] = trim(html_entity_decode($m[1]));
        }

        // Extract image
        if (preg_match('/data-src="([^"]+)"/', $product_html, $m)) {
            $product['image'] = $m[1];
        } elseif (preg_match('/<img[^>]*src="([^"]+)"/', $product_html, $m)) {
            $product['image'] = $m[1];
        }

        // Extract prices
        if (preg_match('/<del[^>]*>.*?([০-৯0-9,\.]+).*?<\/del>/s', $product_html, $m)) {
            $product['regular_price'] = convert_bengali_number($m[1]);
        }
        if (preg_match('/<ins[^>]*>.*?([০-৯0-9,\.]+).*?<\/ins>/s', $product_html, $m)) {
            $product['sale_price'] = convert_bengali_number($m[1]);
        } elseif (preg_match('/bdi[^>]*>.*?([০-৯0-9,\.]+)/s', $product_html, $m)) {
            $price = convert_bengali_number($m[1]);
            if (empty($product['sale_price'])) {
                $product['sale_price'] = $price;
            }
            if (empty($product['regular_price'])) {
                $product['regular_price'] = $price;
            }
        }

        if (!empty($product['url']) && !empty($product['title'])) {
            $products[] = $product;
        }
    }

    return $products;
}

function convert_bengali_number($str) {
    $bengali = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    $english = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    $str = str_replace($bengali, $english, $str);
    $str = preg_replace('/[^0-9.]/', '', $str);
    return floatval($str);
}

function get_product_details($url) {
    $html = fetch_url($url);
    if (!$html) return false;

    $product = ['url' => $url];

    // Title
    if (preg_match('/<h1[^>]*class="[^"]*product_title[^"]*"[^>]*>([^<]+)</i', $html, $m)) {
        $product['title'] = trim(html_entity_decode($m[1]));
    }

    // Description
    if (preg_match('/<div[^>]*class="[^"]*woocommerce-product-details__short-description[^"]*"[^>]*>(.*?)<\/div>/s', $html, $m)) {
        $product['short_description'] = trim(strip_tags($m[1], '<p><br><ul><li><strong><em>'));
    }

    // Full description
    if (preg_match('/<div[^>]*id="tab-description"[^>]*>(.*?)<\/div>/s', $html, $m)) {
        $product['description'] = trim(strip_tags($m[1], '<p><br><ul><li><strong><em><h2><h3><h4><table><tr><td><th>'));
    }

    // SKU
    if (preg_match('/SKU[^<]*<[^>]*>([^<]+)</i', $html, $m)) {
        $product['sku'] = trim($m[1]);
    }

    // Categories
    if (preg_match_all('/product-category\/([^\/]+)\//', $html, $m)) {
        $product['categories'] = array_unique($m[1]);
    }

    // Main image
    if (preg_match('/class="[^"]*woocommerce-product-gallery__image[^"]*"[^>]*data-thumb="([^"]+)"/', $html, $m)) {
        $product['image'] = $m[1];
    } elseif (preg_match('/wp-post-image[^>]*src="([^"]+)"/', $html, $m)) {
        $product['image'] = $m[1];
    }

    // Gallery images
    $product['gallery'] = [];
    if (preg_match_all('/data-large_image="([^"]+)"/', $html, $m)) {
        $product['gallery'] = array_unique($m[1]);
    }

    // Prices
    if (preg_match('/<del[^>]*>.*?<bdi>([^<]+)<\/bdi>.*?<\/del>/s', $html, $m)) {
        $product['regular_price'] = convert_bengali_number($m[1]);
    }
    if (preg_match('/<ins[^>]*>.*?<bdi>([^<]+)<\/bdi>.*?<\/ins>/s', $html, $m)) {
        $product['sale_price'] = convert_bengali_number($m[1]);
    }

    // Brand
    if (preg_match('/brand\/([^\/]+)\//', $html, $m)) {
        $product['brand'] = urldecode($m[1]);
    }

    return $product;
}

// ============================================================
// MIGRATION FUNCTIONS
// ============================================================

function scan_source_site() {
    log_msg("=== SCANNING SOURCE SITE ===", 'info');

    $all_products = [];
    $page = 1;

    while ($page <= 20) { // Max 20 pages
        $url = SOURCE_SITE . "/shop/page/{$page}/";
        log_msg("Fetching: {$url}");

        $html = fetch_url($url);
        if (!$html || strpos($html, 'No products were found') !== false) {
            log_msg("No more products found at page {$page}", 'warning');
            break;
        }

        $products = extract_products_from_html($html);
        if (empty($products)) {
            break;
        }

        $all_products = array_merge($all_products, $products);
        log_msg("Found " . count($products) . " products on page {$page}", 'success');

        $page++;
        usleep(500000); // 0.5 second delay
    }

    // Store in transient for later use
    set_transient('migration_products', $all_products, HOUR_IN_SECONDS);

    log_msg("\n=== SCAN COMPLETE ===", 'success');
    log_msg("Total products found: " . count($all_products), 'success');
}

function import_brands() {
    log_msg("=== IMPORTING BRANDS ===", 'info');

    $brands_url = SOURCE_SITE . '/brands/';
    $html = fetch_url($brands_url);

    if (!$html) {
        log_msg("Failed to fetch brands page", 'error');
        return;
    }

    // Extract brand data
    $brands = [];

    // Pattern for brand items with images
    preg_match_all('/<a[^>]*href="[^"]*\/brand\/([^\/]+)\/"[^>]*>.*?<img[^>]*src="([^"]+)"[^>]*>.*?<\/a>/s', $html, $matches, PREG_SET_ORDER);

    foreach ($matches as $match) {
        $brands[] = [
            'slug' => $match[1],
            'name' => ucwords(str_replace('-', ' ', urldecode($match[1]))),
            'image' => $match[2]
        ];
    }

    // Also get text-only brands
    preg_match_all('/<a[^>]*href="[^"]*\/brand\/([^\/]+)\/"[^>]*>([^<]+)<\/a>/i', $html, $matches, PREG_SET_ORDER);

    foreach ($matches as $match) {
        $slug = $match[1];
        if (!in_array($slug, array_column($brands, 'slug'))) {
            $brands[] = [
                'slug' => $slug,
                'name' => trim($match[2]),
                'image' => ''
            ];
        }
    }

    log_msg("Found " . count($brands) . " brands");

    // Create brand taxonomy if not exists
    if (!taxonomy_exists('product_brand')) {
        log_msg("Creating product_brand taxonomy...");
        // Will be created by WooCommerce Brands plugin or theme
    }

    // Import each brand
    $imported = 0;
    foreach ($brands as $brand) {
        // Check if exists
        $term = get_term_by('slug', $brand['slug'], 'product_brand');

        if (!$term) {
            $result = wp_insert_term($brand['name'], 'product_brand', [
                'slug' => $brand['slug']
            ]);

            if (!is_wp_error($result)) {
                $term_id = $result['term_id'];

                // Download and attach image
                if (!empty($brand['image'])) {
                    $attachment_id = download_image($brand['image'], 0, $brand['name'] . ' logo');
                    if ($attachment_id) {
                        update_term_meta($term_id, 'thumbnail_id', $attachment_id);
                    }
                }

                log_msg("[OK] Created brand: {$brand['name']}", 'success');
                $imported++;
            } else {
                log_msg("[ERROR] Failed to create brand: {$brand['name']}", 'error');
            }
        } else {
            log_msg("[SKIP] Brand exists: {$brand['name']}", 'warning');
        }

        usleep(100000); // 0.1 second delay
    }

    log_msg("\n=== BRANDS IMPORT COMPLETE ===", 'success');
    log_msg("Imported: {$imported} | Skipped: " . (count($brands) - $imported), 'info');
}

function import_categories() {
    log_msg("=== IMPORTING CATEGORIES ===", 'info');

    // Fetch category pages
    $categories_to_import = [
        'access-control' => 'Access Control',
        'cctv-surveillance' => 'CCTV Surveillance',
        'conference-system' => 'Conference System',
        'pa-system' => 'PA System',
        'walkie-talkie' => 'Walkie Talkie',
        'networking' => 'Networking',
        'pabx-ip-phone' => 'PABX & IP Phone',
        'security-solutions' => 'Security Solutions',
        'office-equipment' => 'Office Equipment',
    ];

    $imported = 0;
    foreach ($categories_to_import as $slug => $name) {
        // Check if exists
        $term = get_term_by('slug', $slug, 'product_cat');

        if (!$term) {
            $result = wp_insert_term($name, 'product_cat', [
                'slug' => $slug
            ]);

            if (!is_wp_error($result)) {
                log_msg("[OK] Created category: {$name}", 'success');
                $imported++;

                // Fetch subcategories
                $cat_url = SOURCE_SITE . "/product-category/{$slug}/";
                $html = fetch_url($cat_url);

                if ($html) {
                    // Extract subcategories
                    preg_match_all('/product-category\/' . preg_quote($slug, '/') . '\/([^\/]+)\//', $html, $matches);
                    $subcats = array_unique($matches[1]);

                    foreach ($subcats as $subcat_slug) {
                        $subcat_name = ucwords(str_replace('-', ' ', $subcat_slug));
                        $sub_term = get_term_by('slug', $subcat_slug, 'product_cat');

                        if (!$sub_term) {
                            wp_insert_term($subcat_name, 'product_cat', [
                                'slug' => $subcat_slug,
                                'parent' => $result['term_id']
                            ]);
                            log_msg("  └─ [OK] Created subcategory: {$subcat_name}", 'success');
                        }
                    }
                }
            }
        } else {
            log_msg("[SKIP] Category exists: {$name}", 'warning');
        }

        usleep(200000);
    }

    log_msg("\n=== CATEGORIES IMPORT COMPLETE ===", 'success');
}

function import_products() {
    log_msg("=== IMPORTING PRODUCTS ===", 'info');

    // Get cached product list
    $products = get_transient('migration_products');

    if (empty($products)) {
        log_msg("No products in cache. Please run 'Scan Source Site' first.", 'error');
        return;
    }

    log_msg("Processing " . count($products) . " products...\n");

    $imported = 0;
    $skipped = 0;
    $failed = 0;

    foreach ($products as $index => $product_basic) {
        $progress = round(($index + 1) / count($products) * 100);
        log_msg("[{$progress}%] Processing: " . ($product_basic['title'] ?? 'Unknown'));

        // Check if already imported
        $existing = get_page_by_title($product_basic['title'], OBJECT, 'product');
        if ($existing) {
            log_msg("  [SKIP] Product already exists", 'warning');
            $skipped++;
            continue;
        }

        // Fetch full product details
        $product = get_product_details($product_basic['url']);

        if (!$product || empty($product['title'])) {
            log_msg("  [ERROR] Failed to fetch product details", 'error');
            $failed++;
            continue;
        }

        // Create WooCommerce product
        $post_data = [
            'post_title' => $product['title'],
            'post_content' => $product['description'] ?? '',
            'post_excerpt' => $product['short_description'] ?? '',
            'post_status' => 'publish',
            'post_type' => 'product'
        ];

        $post_id = wp_insert_post($post_data);

        if (is_wp_error($post_id)) {
            log_msg("  [ERROR] Failed to create product", 'error');
            $failed++;
            continue;
        }

        // Set product type
        wp_set_object_terms($post_id, 'simple', 'product_type');

        // Set prices
        $regular_price = $product['regular_price'] ?? $product_basic['regular_price'] ?? '';
        $sale_price = $product['sale_price'] ?? $product_basic['sale_price'] ?? '';

        if ($regular_price) {
            update_post_meta($post_id, '_regular_price', $regular_price);
            update_post_meta($post_id, '_price', $sale_price ?: $regular_price);
        }
        if ($sale_price && $sale_price != $regular_price) {
            update_post_meta($post_id, '_sale_price', $sale_price);
        }

        // Set SKU
        if (!empty($product['sku'])) {
            update_post_meta($post_id, '_sku', $product['sku']);
        }

        // Set stock
        update_post_meta($post_id, '_stock_status', 'instock');
        update_post_meta($post_id, '_manage_stock', 'no');
        update_post_meta($post_id, '_visibility', 'visible');

        // Set categories
        if (!empty($product['categories'])) {
            $cat_ids = [];
            foreach ($product['categories'] as $cat_slug) {
                $term = get_term_by('slug', $cat_slug, 'product_cat');
                if ($term) {
                    $cat_ids[] = $term->term_id;
                }
            }
            if (!empty($cat_ids)) {
                wp_set_object_terms($post_id, $cat_ids, 'product_cat');
            }
        }

        // Set brand
        if (!empty($product['brand'])) {
            $brand_term = get_term_by('slug', $product['brand'], 'product_brand');
            if ($brand_term) {
                wp_set_object_terms($post_id, [$brand_term->term_id], 'product_brand');
            }
        }

        // Download and set featured image
        $image_url = $product['image'] ?? $product_basic['image'] ?? '';
        if ($image_url) {
            $attachment_id = download_image($image_url, $post_id, $product['title']);
            if ($attachment_id) {
                set_post_thumbnail($post_id, $attachment_id);
            }
        }

        // Download gallery images
        if (!empty($product['gallery'])) {
            $gallery_ids = [];
            foreach (array_slice($product['gallery'], 0, 5) as $gallery_url) { // Max 5 gallery images
                if ($gallery_url != $image_url) {
                    $gallery_id = download_image($gallery_url, $post_id, $product['title'] . ' gallery');
                    if ($gallery_id) {
                        $gallery_ids[] = $gallery_id;
                    }
                }
            }
            if (!empty($gallery_ids)) {
                update_post_meta($post_id, '_product_image_gallery', implode(',', $gallery_ids));
            }
        }

        // Store source URL for reference
        update_post_meta($post_id, '_source_url', $product['url']);

        log_msg("  [OK] Created product ID: {$post_id}", 'success');
        $imported++;

        // Rate limiting
        usleep(500000); // 0.5 second delay between products
    }

    // Clear WooCommerce caches
    if (function_exists('wc_delete_product_transients')) {
        wc_delete_product_transients();
    }

    log_msg("\n=== PRODUCTS IMPORT COMPLETE ===", 'success');
    log_msg("Imported: {$imported} | Skipped: {$skipped} | Failed: {$failed}", 'info');
}

function import_sliders() {
    log_msg("=== IMPORTING SLIDERS ===", 'info');

    // Fetch homepage to get slider images
    $html = fetch_url(SOURCE_SITE);

    if (!$html) {
        log_msg("Failed to fetch homepage", 'error');
        return;
    }

    // Extract slider images (common slider patterns)
    $slider_images = [];

    // Revolution Slider
    preg_match_all('/data-lazyload="([^"]+)"|data-bgfit="[^"]*"[^>]*style="[^"]*background-image:\s*url\([\'"]?([^\'")\s]+)/i', $html, $matches);

    // Smart Slider
    preg_match_all('/<img[^>]*class="[^"]*n2-ss-slide-background[^"]*"[^>]*src="([^"]+)"/i', $html, $matches2);

    // MetaSlider
    preg_match_all('/<img[^>]*class="[^"]*slider[^"]*"[^>]*src="([^"]+)"/i', $html, $matches3);

    // Generic large images in slider containers
    preg_match_all('/<div[^>]*class="[^"]*slider[^"]*"[^>]*>.*?<img[^>]*src="([^"]+)"/is', $html, $matches4);

    // Combine all matches
    $all_images = array_merge(
        array_filter($matches[1]),
        array_filter($matches[2]),
        $matches2[1] ?? [],
        $matches3[1] ?? [],
        $matches4[1] ?? []
    );

    $slider_images = array_unique(array_filter($all_images));

    log_msg("Found " . count($slider_images) . " potential slider images");

    // Download slider images
    $downloaded = 0;
    foreach ($slider_images as $img_url) {
        // Skip small images
        if (strpos($img_url, 'thumb') !== false || strpos($img_url, '150x') !== false) {
            continue;
        }

        // Make absolute URL
        if (strpos($img_url, 'http') !== 0) {
            $img_url = SOURCE_SITE . '/' . ltrim($img_url, '/');
        }

        log_msg("Downloading: " . basename($img_url));

        $attachment_id = download_image($img_url, 0, 'Slider image');
        if ($attachment_id) {
            update_post_meta($attachment_id, '_slider_image', 'yes');
            log_msg("  [OK] Downloaded as attachment #{$attachment_id}", 'success');
            $downloaded++;
        } else {
            log_msg("  [ERROR] Failed to download", 'error');
        }

        usleep(300000);
    }

    log_msg("\n=== SLIDERS IMPORT COMPLETE ===", 'success');
    log_msg("Downloaded: {$downloaded} slider images", 'info');
    log_msg("NOTE: You may need to manually configure sliders in your theme/plugin", 'warning');
}

function import_pages() {
    log_msg("=== IMPORTING PAGES ===", 'info');

    $pages_to_import = [
        '/about-us/' => 'About Us',
        '/contact-us/' => 'Contact Us',
        '/faqs/' => 'FAQs',
    ];

    foreach ($pages_to_import as $path => $title) {
        $url = SOURCE_SITE . $path;
        log_msg("Fetching: {$url}");

        $html = fetch_url($url);
        if (!$html) {
            log_msg("  [ERROR] Failed to fetch page", 'error');
            continue;
        }

        // Check if page exists
        $existing = get_page_by_title($title, OBJECT, 'page');
        if ($existing) {
            log_msg("  [SKIP] Page already exists", 'warning');
            continue;
        }

        // Extract main content
        $content = '';
        if (preg_match('/<article[^>]*>(.*?)<\/article>/is', $html, $m)) {
            $content = $m[1];
        } elseif (preg_match('/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>(.*?)<\/div>/is', $html, $m)) {
            $content = $m[1];
        } elseif (preg_match('/<div[^>]*class="[^"]*page-content[^"]*"[^>]*>(.*?)<\/div>/is', $html, $m)) {
            $content = $m[1];
        }

        // Clean content
        $content = preg_replace('/<script[^>]*>.*?<\/script>/is', '', $content);
        $content = preg_replace('/<style[^>]*>.*?<\/style>/is', '', $content);

        $post_id = wp_insert_post([
            'post_title' => $title,
            'post_name' => sanitize_title($title),
            'post_content' => $content,
            'post_status' => 'publish',
            'post_type' => 'page'
        ]);

        if (!is_wp_error($post_id)) {
            log_msg("  [OK] Created page: {$title} (ID: {$post_id})", 'success');
        } else {
            log_msg("  [ERROR] Failed to create page", 'error');
        }

        usleep(500000);
    }

    log_msg("\n=== PAGES IMPORT COMPLETE ===", 'success');
}

function fix_missing_images() {
    log_msg("=== FIXING MISSING IMAGES ===", 'info');

    // Get products without featured images
    $products = get_posts([
        'post_type' => 'product',
        'posts_per_page' => -1,
        'meta_query' => [
            [
                'key' => '_thumbnail_id',
                'compare' => 'NOT EXISTS'
            ]
        ]
    ]);

    log_msg("Found " . count($products) . " products without images");

    $fixed = 0;
    foreach ($products as $product) {
        $source_url = get_post_meta($product->ID, '_source_url', true);

        if ($source_url) {
            log_msg("Re-fetching: " . $product->post_title);

            $details = get_product_details($source_url);
            if ($details && !empty($details['image'])) {
                $attachment_id = download_image($details['image'], $product->ID, $product->post_title);
                if ($attachment_id) {
                    set_post_thumbnail($product->ID, $attachment_id);
                    log_msg("  [OK] Fixed image", 'success');
                    $fixed++;
                }
            }
        }

        usleep(300000);
    }

    log_msg("\n=== COMPLETE ===", 'success');
    log_msg("Fixed: {$fixed} images", 'info');
}

function cleanup_data() {
    log_msg("=== CLEANUP ===", 'warning');
    log_msg("This will delete all imported products, brands, and categories!", 'error');

    if (!isset($_GET['confirm'])) {
        echo "\n\n<a href='?action=cleanup&confirm=1' class='btn btn-danger'>Click here to confirm deletion</a>\n";
        return;
    }

    // Delete products
    $products = get_posts([
        'post_type' => 'product',
        'posts_per_page' => -1,
        'fields' => 'ids'
    ]);

    foreach ($products as $product_id) {
        wp_delete_post($product_id, true);
    }
    log_msg("Deleted " . count($products) . " products", 'success');

    // Delete brands
    $brands = get_terms(['taxonomy' => 'product_brand', 'hide_empty' => false]);
    foreach ($brands as $brand) {
        wp_delete_term($brand->term_id, 'product_brand');
    }
    log_msg("Deleted " . count($brands) . " brands", 'success');

    // Clear transients
    delete_transient('migration_products');

    // Clear WooCommerce caches
    if (function_exists('wc_delete_product_transients')) {
        wc_delete_product_transients();
    }

    log_msg("\n=== CLEANUP COMPLETE ===", 'success');
}
