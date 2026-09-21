<?php
/**
 * Fix Product Categories - Run AFTER installing WooCommerce
 * URL: https://sticketing.xyz/lms/fix-categories.php
 * DELETE THIS FILE AFTER RUNNING!
 */

require_once('wp-load.php');

if (!current_user_can('manage_options')) {
    wp_die('You must be logged in as admin.');
}

echo "<h1>Creating Product Categories</h1><pre>";

$categories = [
    ['name' => 'GPS Tracker', 'slug' => 'gps-tracker', 'description' => 'Vehicle GPS tracking devices and solutions'],
    ['name' => 'CCTV Camera', 'slug' => 'cctv-camera', 'description' => 'Security cameras and surveillance systems'],
    ['name' => 'IP Camera', 'slug' => 'ip-camera', 'description' => 'Network IP cameras for remote monitoring', 'parent' => 'cctv-camera'],
    ['name' => 'DVR/NVR', 'slug' => 'dvr-nvr', 'description' => 'Digital and Network Video Recorders', 'parent' => 'cctv-camera'],
    ['name' => 'Access Control', 'slug' => 'access-control', 'description' => 'Door access control and attendance systems'],
    ['name' => 'Fingerprint Device', 'slug' => 'fingerprint-device', 'description' => 'Biometric fingerprint attendance machines', 'parent' => 'access-control'],
    ['name' => 'Face Recognition', 'slug' => 'face-recognition', 'description' => 'Face recognition attendance systems', 'parent' => 'access-control'],
    ['name' => 'Door Lock', 'slug' => 'door-lock', 'description' => 'Smart door locks and access systems', 'parent' => 'access-control'],
    ['name' => 'Walkie Talkie', 'slug' => 'walkie-talkie', 'description' => 'Two-way radio communication devices'],
    ['name' => 'PA System', 'slug' => 'pa-system', 'description' => 'Public address and sound systems'],
    ['name' => 'Networking', 'slug' => 'networking', 'description' => 'Network switches, routers, and accessories'],
    ['name' => 'Accessories', 'slug' => 'accessories', 'description' => 'Cables, adapters, and other accessories'],
];

// Check if WooCommerce is active
if (!taxonomy_exists('product_cat')) {
    echo "ERROR: WooCommerce is not installed or activated!\n";
    echo "Please install and activate WooCommerce first, then run this script again.\n";
    echo "</pre>";
    exit;
}

foreach ($categories as $cat) {
    $parent_id = 0;
    if (isset($cat['parent'])) {
        $parent_term = get_term_by('slug', $cat['parent'], 'product_cat');
        if ($parent_term) {
            $parent_id = $parent_term->term_id;
        }
    }

    $existing = get_term_by('slug', $cat['slug'], 'product_cat');
    if (!$existing) {
        $result = wp_insert_term($cat['name'], 'product_cat', [
            'slug' => $cat['slug'],
            'description' => $cat['description'],
            'parent' => $parent_id
        ]);
        if (!is_wp_error($result)) {
            echo "Created: {$cat['name']}\n";
        } else {
            echo "Error: {$cat['name']} - {$result->get_error_message()}\n";
        }
    } else {
        echo "Exists: {$cat['name']}\n";
    }
}

// Assign categories to products
echo "\n=== Assigning Categories to Products ===\n";

$product_categories = [
    'concox-gt06n-gps-tracker' => 'gps-tracker',
    'concox-gt06e-gps-tracker' => 'gps-tracker',
    'concox-wetrack2-personal-tracker' => 'gps-tracker',
    'hikvision-ds-2cd1043g0-i-4mp' => 'ip-camera',
    'hikvision-ds-2ce16d0t-dome' => 'cctv-camera',
    'dahua-dh-hac-hfw1200rp-bullet' => 'cctv-camera',
    'hikvision-ds-7104hghi-k1-dvr' => 'dvr-nvr',
    'dahua-dhi-nvr1108hs-nvr' => 'dvr-nvr',
    'zkteco-k40-fingerprint' => 'fingerprint-device',
    'zkteco-mb20-face-recognition' => 'face-recognition',
    'zkteco-ml10-smart-lock' => 'door-lock',
    'motorola-t82-extreme' => 'walkie-talkie',
    'baofeng-bf-888s-radio' => 'walkie-talkie',
    'baofeng-uv-5r-dual-band' => 'walkie-talkie',
    'tp-link-tl-sg1005d-switch' => 'networking',
    'tp-link-archer-c6-router' => 'networking',
];

foreach ($product_categories as $product_slug => $cat_slug) {
    $product = get_page_by_path($product_slug, OBJECT, 'product');
    $cat = get_term_by('slug', $cat_slug, 'product_cat');

    if ($product && $cat) {
        wp_set_object_terms($product->ID, [$cat->term_id], 'product_cat');
        echo "Assigned {$product_slug} → {$cat_slug}\n";
    }
}

echo "\n=== DONE ===\n";
echo "Categories created and assigned!\n";
echo "DELETE THIS FILE NOW!\n";
echo "</pre>";
?>
