<?php
/**
 * Fix Images for Manually Created Products
 * These products don't exist on source site - using direct image URLs
 *
 * Upload to WordPress root, run as admin, DELETE after!
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

?>
<!DOCTYPE html>
<html>
<head>
    <title>Fix Manual Product Images</title>
    <style>
        body { font-family: monospace; background: #1e1e1e; color: #00ff00; padding: 20px; }
        .success { color: #00ff00; }
        .error { color: #ff4444; }
        .warning { color: #ffaa00; }
        .info { color: #00aaff; }
        h2 { color: #fff; }
        .option { background: #333; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .btn { background: #0073aa; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 5px; display: inline-block; }
        .btn-danger { background: #dc3545; }
    </style>
</head>
<body>
<pre>
<?php

// Direct image URLs for the manual products
// Using images from experttechnologiesbd.com where similar products exist
$product_images = [
    // GPS Trackers - using generic tracker images
    'Concox GT06N GPS Tracker' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/01312-66-3333-6.jpg',
    'Concox GT06E GPS Tracker' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/01312-66-3333-7.jpg',
    'Concox WeTrack2 Personal Tracker' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/01312-66-3333-8.jpg',

    // Hikvision Cameras/DVR
    'Hikvision DS-2CD1043G0-I 4MP IP Camera' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/07/01312-66-3333-2026-07-23T163205.864.jpg',
    'Hikvision DS-2CE16D0T-ITPF 2MP Dome Camera' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/0fbfabcb-5ee1-4ffb-98e6-e9dbd6a38d2b-800x800.jpg',
    'Hikvision DS-7104HGHI-K1 4CH DVR' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/01312-66-3333-10.jpg',

    // Dahua
    'Dahua DH-HAC-HFW1200RP 2MP Bullet Camera' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/01312-66-3333-9.jpg',
    'Dahua DHI-NVR1108HS-8P-S3 8CH NVR' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/01312-66-3333-11.jpg',

    // ZKTeco
    'ZKTeco K40 Fingerprint Attendance Machine' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/07/01312-66-3333-2026-07-22T185132.063.jpg',
    'ZKTeco MB20 Face Recognition Terminal' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/07/01312-66-3333-96.jpg',
    'ZKTeco ML10 Smart Lock' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/07/01312-66-3333-2026-07-22T180920.653.jpg',

    // Walkie Talkies
    'Motorola T82 Extreme Walkie Talkie' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/07/01312-66-3333-2026-07-25T143148.758-800x800.jpg',
    'Baofeng BF-888S Two Way Radio' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/01312-66-3333-5.jpg',
    'Baofeng UV-5R Dual Band Radio' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/01312-66-3333-3-1.jpg',

    // Networking
    'TP-Link TL-SG1005D 5-Port Gigabit Switch' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/01312-66-3333-20.jpg',
    'TP-Link Archer C6 AC1200 Router' => 'https://experttechnologiesbd.com/wp-content/uploads/2026/05/01312-66-3333-21.jpg',
];

$action = isset($_GET['action']) ? $_GET['action'] : '';

if (empty($action)) {
    echo "<h2>Fix Manual Product Images</h2>\n\n";
    echo "These 16 products were manually created and don't exist on the source site.\n";
    echo "Choose an action:\n\n";

    echo "<div class='option'>";
    echo "<strong>Option 1: Add Images from Similar Products</strong>\n";
    echo "Downloads images from experttechnologiesbd.com for similar product types.\n";
    echo "<a href='?action=fix' class='btn'>Add Images</a>";
    echo "</div>\n";

    echo "<div class='option'>";
    echo "<strong>Option 2: Delete These Products</strong>\n";
    echo "Removes these 16 manually created products (they'll be re-imported from source).\n";
    echo "<a href='?action=delete' class='btn btn-danger'>Delete Products</a>";
    echo "</div>\n";

    echo "<div class='option'>";
    echo "<strong>Option 3: View Products</strong>\n";
    echo "See which products are affected.\n";
    echo "<a href='?action=list' class='btn'>List Products</a>";
    echo "</div>\n";

} elseif ($action == 'list') {
    echo "<h2>Products Without Images</h2>\n\n";

    foreach ($product_images as $title => $url) {
        $product = get_page_by_title($title, OBJECT, 'product');
        if ($product) {
            $has_image = has_post_thumbnail($product->ID) ? '<span class="success">[HAS IMAGE]</span>' : '<span class="error">[NO IMAGE]</span>';
            echo "{$has_image} {$title} (ID: {$product->ID})\n";
            echo "  → Image URL: {$url}\n\n";
        } else {
            echo "<span class='warning'>[NOT FOUND]</span> {$title}\n\n";
        }
    }

    echo "\n<a href='?' class='btn'>← Back</a>";

} elseif ($action == 'fix') {
    echo "<h2>Adding Images to Products</h2>\n\n";

    $fixed = 0;
    $failed = 0;

    foreach ($product_images as $title => $image_url) {
        echo "Processing: {$title}\n";

        // Find product
        $product = get_page_by_title($title, OBJECT, 'product');

        if (!$product) {
            echo "  <span class='warning'>[SKIP] Product not found</span>\n\n";
            continue;
        }

        // Check if already has image
        if (has_post_thumbnail($product->ID)) {
            echo "  <span class='info'>[SKIP] Already has image</span>\n\n";
            continue;
        }

        echo "  Downloading: {$image_url}\n";

        // Download image
        $tmp = download_url($image_url, 60);

        if (is_wp_error($tmp)) {
            echo "  <span class='error'>[ERROR] Download failed: " . $tmp->get_error_message() . "</span>\n\n";
            $failed++;
            continue;
        }

        $file_array = [
            'name' => sanitize_file_name($title) . '.jpg',
            'tmp_name' => $tmp
        ];

        $attachment_id = media_handle_sideload($file_array, $product->ID, $title);

        if (is_wp_error($attachment_id)) {
            @unlink($tmp);
            echo "  <span class='error'>[ERROR] Upload failed</span>\n\n";
            $failed++;
            continue;
        }

        set_post_thumbnail($product->ID, $attachment_id);

        echo "  <span class='success'>[OK] Image added! (Attachment: {$attachment_id})</span>\n\n";
        $fixed++;

        usleep(300000);
    }

    // Clear caches
    if (function_exists('wc_delete_product_transients')) {
        wc_delete_product_transients();
    }

    echo "\n=== COMPLETE ===\n";
    echo "<span class='success'>Fixed: {$fixed}</span>\n";
    echo "<span class='error'>Failed: {$failed}</span>\n";

    echo "\n<a href='?' class='btn'>← Back</a>";

} elseif ($action == 'delete') {
    if (!isset($_GET['confirm'])) {
        echo "<h2>Confirm Deletion</h2>\n\n";
        echo "<span class='warning'>This will permanently delete these 16 products!</span>\n\n";

        foreach ($product_images as $title => $url) {
            $product = get_page_by_title($title, OBJECT, 'product');
            if ($product) {
                echo "• {$title} (ID: {$product->ID})\n";
            }
        }

        echo "\n<a href='?action=delete&confirm=1' class='btn btn-danger'>Yes, Delete All</a>";
        echo "<a href='?' class='btn'>Cancel</a>";
    } else {
        echo "<h2>Deleting Products</h2>\n\n";

        $deleted = 0;
        foreach ($product_images as $title => $url) {
            $product = get_page_by_title($title, OBJECT, 'product');
            if ($product) {
                wp_delete_post($product->ID, true);
                echo "<span class='success'>[DELETED]</span> {$title}\n";
                $deleted++;
            }
        }

        echo "\n=== COMPLETE ===\n";
        echo "Deleted: {$deleted} products\n";
        echo "\nNow run the main migration script to re-import products from source.\n";

        echo "\n<a href='?' class='btn'>← Back</a>";
    }
}

echo "\n\n<span class='error'>DELETE THIS FILE WHEN DONE!</span>\n";
?>
</pre>
</body>
</html>
