<?php
/**
 * Fix Missing Product Images - Version 2
 * Direct image download with multiple fallback methods
 *
 * Upload to WordPress root and visit as admin
 * DELETE AFTER USE!
 */

set_time_limit(0);
ini_set('memory_limit', '512M');

require_once('wp-load.php');
require_once(ABSPATH . 'wp-admin/includes/media.php');
require_once(ABSPATH . 'wp-admin/includes/file.php');
require_once(ABSPATH . 'wp-admin/includes/image.php');

if (!current_user_can('manage_options')) {
    wp_die('Admin access required.');
}

define('SOURCE_SITE', 'https://experttechnologiesbd.com');

?>
<!DOCTYPE html>
<html>
<head>
    <title>Fix Product Images V2</title>
    <style>
        body { font-family: monospace; background: #1e1e1e; color: #00ff00; padding: 20px; }
        .log { white-space: pre-wrap; line-height: 1.6; }
        .success { color: #00ff00; }
        .error { color: #ff4444; }
        .warning { color: #ffaa00; }
        .info { color: #00aaff; }
        a { color: #00aaff; }
    </style>
</head>
<body>
<div class="log">
<?php

echo "=== FIX PRODUCT IMAGES V2 ===\n";
echo "Source: " . SOURCE_SITE . "\n";
echo "Time: " . date('Y-m-d H:i:s') . "\n\n";

// Get products without images
$products_without_images = get_posts([
    'post_type' => 'product',
    'posts_per_page' => -1,
    'post_status' => 'publish',
    'meta_query' => [
        'relation' => 'OR',
        [
            'key' => '_thumbnail_id',
            'compare' => 'NOT EXISTS'
        ],
        [
            'key' => '_thumbnail_id',
            'value' => '',
            'compare' => '='
        ],
        [
            'key' => '_thumbnail_id',
            'value' => '0',
            'compare' => '='
        ]
    ]
]);

echo "Found " . count($products_without_images) . " products without images\n\n";

if (empty($products_without_images)) {
    // Also check for products where thumbnail doesn't exist
    $all_products = get_posts([
        'post_type' => 'product',
        'posts_per_page' => -1,
        'post_status' => 'publish'
    ]);

    $broken = [];
    foreach ($all_products as $p) {
        $thumb_id = get_post_thumbnail_id($p->ID);
        if (!$thumb_id || !wp_get_attachment_url($thumb_id)) {
            $broken[] = $p;
        }
    }

    if (!empty($broken)) {
        echo "Found " . count($broken) . " products with broken/missing image attachments\n\n";
        $products_without_images = $broken;
    }
}

$fixed = 0;
$failed = 0;

foreach ($products_without_images as $index => $product) {
    $progress = round(($index + 1) / count($products_without_images) * 100);
    echo "[{$progress}%] Processing: " . $product->post_title . "\n";

    // Method 1: Try stored source URL
    $source_url = get_post_meta($product->ID, '_source_url', true);

    // Method 2: Generate URL from product title
    if (empty($source_url)) {
        $slug = sanitize_title($product->post_title);
        $source_url = SOURCE_SITE . '/product/' . $slug . '/';
        echo "  Generated URL: {$source_url}\n";
    }

    // Fetch product page
    echo "  Fetching: {$source_url}\n";

    $response = wp_remote_get($source_url, [
        'timeout' => 30,
        'user-agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'sslverify' => false
    ]);

    if (is_wp_error($response)) {
        echo "  <span class='error'>[ERROR] Failed to fetch page: " . $response->get_error_message() . "</span>\n";

        // Try alternate URL patterns
        $alt_slugs = [
            sanitize_title($product->post_title),
            sanitize_title(str_replace(['৳', '/', '\\', '|'], '', $product->post_title)),
            strtolower(preg_replace('/[^a-z0-9]+/i', '-', $product->post_title))
        ];

        foreach ($alt_slugs as $alt_slug) {
            $alt_url = SOURCE_SITE . '/product/' . trim($alt_slug, '-') . '/';
            if ($alt_url != $source_url) {
                echo "  Trying: {$alt_url}\n";
                $response = wp_remote_get($alt_url, ['timeout' => 30, 'sslverify' => false]);
                if (!is_wp_error($response) && wp_remote_retrieve_response_code($response) == 200) {
                    $source_url = $alt_url;
                    break;
                }
            }
        }

        if (is_wp_error($response)) {
            $failed++;
            echo "\n";
            continue;
        }
    }

    $html = wp_remote_retrieve_body($response);
    $status_code = wp_remote_retrieve_response_code($response);

    if ($status_code != 200) {
        echo "  <span class='error'>[ERROR] HTTP {$status_code}</span>\n\n";
        $failed++;
        continue;
    }

    // Extract image URLs (multiple patterns)
    $image_url = null;

    // Pattern 1: WooCommerce gallery main image
    if (preg_match('/class="[^"]*woocommerce-product-gallery__image[^"]*"[^>]*data-thumb="([^"]+)"/', $html, $m)) {
        $image_url = $m[1];
        echo "  Found via gallery data-thumb\n";
    }

    // Pattern 2: data-large_image attribute
    if (!$image_url && preg_match('/data-large_image="([^"]+)"/', $html, $m)) {
        $image_url = $m[1];
        echo "  Found via data-large_image\n";
    }

    // Pattern 3: wp-post-image class
    if (!$image_url && preg_match('/<img[^>]*class="[^"]*wp-post-image[^"]*"[^>]*src="([^"]+)"/', $html, $m)) {
        $image_url = $m[1];
        echo "  Found via wp-post-image\n";
    }

    // Pattern 4: attachment-woocommerce_single
    if (!$image_url && preg_match('/<img[^>]*class="[^"]*attachment-woocommerce[^"]*"[^>]*src="([^"]+)"/', $html, $m)) {
        $image_url = $m[1];
        echo "  Found via attachment-woocommerce\n";
    }

    // Pattern 5: Any image in product gallery div
    if (!$image_url && preg_match('/<div[^>]*class="[^"]*product[^"]*images[^"]*"[^>]*>.*?<img[^>]*src="([^"]+)"/is', $html, $m)) {
        $image_url = $m[1];
        echo "  Found via product images div\n";
    }

    // Pattern 6: og:image meta tag
    if (!$image_url && preg_match('/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/', $html, $m)) {
        $image_url = $m[1];
        echo "  Found via og:image\n";
    }

    // Pattern 7: data-src (lazy loading)
    if (!$image_url && preg_match('/class="[^"]*wp-post-image[^"]*"[^>]*data-src="([^"]+)"/', $html, $m)) {
        $image_url = $m[1];
        echo "  Found via data-src (lazy load)\n";
    }

    if (!$image_url) {
        echo "  <span class='error'>[ERROR] No image URL found in page</span>\n\n";
        $failed++;
        continue;
    }

    // Clean URL
    $image_url = html_entity_decode($image_url);

    // Skip placeholder images
    if (strpos($image_url, 'placeholder') !== false || strpos($image_url, 'woocommerce-placeholder') !== false) {
        echo "  <span class='warning'>[SKIP] Placeholder image</span>\n\n";
        $failed++;
        continue;
    }

    echo "  Image URL: {$image_url}\n";

    // Download image
    echo "  Downloading...\n";

    $tmp = download_url($image_url, 60);

    if (is_wp_error($tmp)) {
        echo "  <span class='error'>[ERROR] Download failed: " . $tmp->get_error_message() . "</span>\n";

        // Try with different URL format (remove size suffix)
        $alt_image_url = preg_replace('/-\d+x\d+\./', '.', $image_url);
        if ($alt_image_url != $image_url) {
            echo "  Trying full-size: {$alt_image_url}\n";
            $tmp = download_url($alt_image_url, 60);
        }

        if (is_wp_error($tmp)) {
            $failed++;
            echo "\n";
            continue;
        }
    }

    // Get filename
    $filename = basename(parse_url($image_url, PHP_URL_PATH));
    if (empty($filename) || strlen($filename) < 5) {
        $filename = sanitize_file_name($product->post_title) . '.jpg';
    }

    $file_array = [
        'name' => $filename,
        'tmp_name' => $tmp
    ];

    // Upload to media library
    $attachment_id = media_handle_sideload($file_array, $product->ID, $product->post_title);

    if (is_wp_error($attachment_id)) {
        @unlink($tmp);
        echo "  <span class='error'>[ERROR] Upload failed: " . $attachment_id->get_error_message() . "</span>\n\n";
        $failed++;
        continue;
    }

    // Set as featured image
    set_post_thumbnail($product->ID, $attachment_id);

    // Store source for future reference
    update_post_meta($product->ID, '_source_url', $source_url);
    update_post_meta($product->ID, '_source_image', $image_url);

    echo "  <span class='success'>[OK] Image set! Attachment ID: {$attachment_id}</span>\n\n";
    $fixed++;

    // Small delay to be nice to the server
    usleep(500000);

    flush();
}

// Clear WooCommerce caches
if (function_exists('wc_delete_product_transients')) {
    wc_delete_product_transients();
}

echo "\n=== COMPLETE ===\n";
echo "<span class='success'>Fixed: {$fixed}</span>\n";
echo "<span class='error'>Failed: {$failed}</span>\n";
echo "\nTotal processed: " . count($products_without_images) . "\n";

if ($failed > 0) {
    echo "\n<span class='warning'>Some images failed. You may need to:</span>\n";
    echo "1. Check if products exist on source site with same name\n";
    echo "2. Manually add images via WordPress admin\n";
    echo "3. Run this script again\n";
}

echo "\n<span class='error'>DELETE THIS FILE NOW!</span>\n";

?>
</div>
</body>
</html>
