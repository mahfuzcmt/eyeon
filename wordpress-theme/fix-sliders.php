<?php
/**
 * Add Slider Background Images
 * URL: https://sticketing.xyz/lms/fix-sliders.php
 * DELETE THIS FILE AFTER RUNNING!
 */

set_time_limit(120);
ini_set('memory_limit', '256M');

require_once('wp-load.php');
require_once(ABSPATH . 'wp-admin/includes/media.php');
require_once(ABSPATH . 'wp-admin/includes/file.php');
require_once(ABSPATH . 'wp-admin/includes/image.php');

if (!current_user_can('manage_options')) {
    wp_die('You must be logged in as admin.');
}

echo "<h1>Adding Slider Images</h1><pre>";

// Correct slider images from experttechnologiesbd.com
$slider_images = [
    'GPS Vehicle Tracking' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/moto.jpg',
    'CCTV Security Solutions' => 'https://experttechnologiesbd.com/wp-content/uploads/2025/01/mplc-slider-slide-2-opt.jpg',
    'Access Control Systems' => 'https://experttechnologiesbd.com/wp-content/uploads/2025/01/mplc-slider-slide-3-opt.jpg',
];

// Alternative fallback images
$fallback_images = [
    'https://experttechnologiesbd.com/wp-content/uploads/2026/05/moto-1.jpg',
    'https://experttechnologiesbd.com/wp-content/uploads/2026/05/1.png',
];

function download_slider_image($url, $post_id, $title, $fallbacks = []) {
    if (has_post_thumbnail($post_id)) {
        echo "[SKIP] {$title} already has image\n";
        return true;
    }

    echo "Downloading: {$title}... ";

    // Try primary URL
    $tmp = download_url($url, 60);

    // If failed, try fallbacks
    if (is_wp_error($tmp) && !empty($fallbacks)) {
        echo "trying fallback... ";
        foreach ($fallbacks as $fallback_url) {
            $tmp = download_url($fallback_url, 60);
            if (!is_wp_error($tmp)) {
                $url = $fallback_url;
                break;
            }
        }
    }

    if (is_wp_error($tmp)) {
        echo "FAILED - " . $tmp->get_error_message() . "\n";
        return false;
    }

    // Determine extension
    $path_info = pathinfo(parse_url($url, PHP_URL_PATH));
    $ext = isset($path_info['extension']) ? $path_info['extension'] : 'jpg';

    $file_array = [
        'name' => 'slider-' . sanitize_title($title) . '.' . $ext,
        'tmp_name' => $tmp
    ];

    $attachment_id = media_handle_sideload($file_array, $post_id, $title);

    if (is_wp_error($attachment_id)) {
        @unlink($tmp);
        echo "UPLOAD FAILED - " . $attachment_id->get_error_message() . "\n";
        return false;
    }

    set_post_thumbnail($post_id, $attachment_id);
    echo "OK (ID: {$attachment_id})\n";
    return true;
}

// Get all sliders
$sliders = get_posts([
    'post_type' => 'slider',
    'posts_per_page' => -1,
    'post_status' => 'publish'
]);

echo "Found " . count($sliders) . " sliders\n\n";

foreach ($sliders as $slider) {
    $title = $slider->post_title;

    if (isset($slider_images[$title])) {
        download_slider_image($slider_images[$title], $slider->ID, $title, $fallback_images);
    } else {
        // Use first image as fallback
        $first_url = reset($slider_images);
        download_slider_image($first_url, $slider->ID, $title, $fallback_images);
    }
}

// ============================================================
// ADD BRAND LOGOS
// ============================================================
echo "\n=== Adding Brand Logos ===\n";

$brand_logos = [
    'Hikvision' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/hikvision-logo.png',
    'Dahua' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/dahua-logo.png',
    'ZKTeco' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/zkteco-logo.png',
    'TP-Link' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/tp-link-logo.png',
    'Motorola' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/motorola-logo.png',
];

// Generic tech brand logos as fallback (from Wikipedia commons - free to use)
$generic_brand_fallbacks = [
    'Hikvision' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Hikvision_logo.svg/200px-Hikvision_logo.svg.png',
    'Dahua' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Dahua_Technology_logo.svg/200px-Dahua_Technology_logo.svg.png',
];

$brands = get_posts([
    'post_type' => 'brand',
    'posts_per_page' => -1,
    'post_status' => 'publish'
]);

echo "Found " . count($brands) . " brands\n";

foreach ($brands as $brand) {
    $title = $brand->post_title;

    if (has_post_thumbnail($brand->ID)) {
        echo "[SKIP] {$title} already has logo\n";
        continue;
    }

    // Try to find a logo URL
    $logo_url = null;
    if (isset($brand_logos[$title])) {
        $logo_url = $brand_logos[$title];
    } elseif (isset($generic_brand_fallbacks[$title])) {
        $logo_url = $generic_brand_fallbacks[$title];
    }

    if ($logo_url) {
        echo "Downloading logo for {$title}... ";

        $tmp = download_url($logo_url, 30);
        if (!is_wp_error($tmp)) {
            $file_array = [
                'name' => 'brand-' . sanitize_title($title) . '.png',
                'tmp_name' => $tmp
            ];
            $attachment_id = media_handle_sideload($file_array, $brand->ID, $title . ' Logo');
            if (!is_wp_error($attachment_id)) {
                set_post_thumbnail($brand->ID, $attachment_id);
                echo "OK\n";
            } else {
                echo "FAILED\n";
            }
        } else {
            echo "FAILED\n";
        }
    } else {
        echo "[NO LOGO URL] {$title}\n";
    }
}

echo "\n=== DONE ===\n";
echo "DELETE THIS FILE NOW!\n";

echo "</pre>";
?>
