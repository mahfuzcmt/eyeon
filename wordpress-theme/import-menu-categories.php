<?php
/**
 * Import Categories & Create Navigation Menu
 * Source: experttechnologiesbd.com
 *
 * Upload to WordPress root, run as admin, DELETE after!
 */

set_time_limit(0);
ini_set('memory_limit', '512M');

require_once('wp-load.php');

if (!current_user_can('manage_options')) {
    wp_die('Admin access required.');
}

?>
<!DOCTYPE html>
<html>
<head>
    <title>Import Categories & Menu</title>
    <style>
        body { font-family: monospace; background: #1e1e1e; color: #00ff00; padding: 20px; }
        .success { color: #00ff00; }
        .error { color: #ff4444; }
        .warning { color: #ffaa00; }
        .info { color: #00aaff; }
        h2 { color: #ffffff; border-bottom: 1px solid #444; padding-bottom: 10px; }
    </style>
</head>
<body>
<pre>
<?php

echo "=== IMPORTING CATEGORIES & MENU ===\n";
echo "Time: " . date('Y-m-d H:i:s') . "\n\n";

// ============================================================
// COMPLETE CATEGORY STRUCTURE
// ============================================================

$categories = [
    'Access Control' => [
        'slug' => 'access-control',
        'children' => [
            'Controller' => 'controller',
            'EM Lock' => 'em-lock',
            'Exit Button' => 'exit-button',
            'Face Recognition' => 'face-recognition',
            'Fingerprint Scanner' => 'fingerprint-scanner',
            'Fingerprint Time Attendance' => 'fingerprint-time-attendance',
            'IRIS Access Control' => 'iris-access-control',
            'Palm Recognition' => 'palm-recognition',
            'Readers & Accessories' => 'readers-accessories',
            'RFID Card' => 'rfid-card',
            'Software' => 'software',
        ]
    ],

    'CCTV Surveillance' => [
        'slug' => 'cctv-surveillance',
        'children' => [
            'Accessories' => 'accessories',
            'DVR' => 'dvr',
            'HD Camera' => 'hd-camera',
            'HDD' => 'hdd',
            'IP Camera' => 'ip-camera',
            'NVR' => 'nvr',
            'Power Adapter' => 'power-adapter',
            'Wifi Camera' => 'wifi-camera',
        ]
    ],

    'Conference System' => [
        'slug' => 'conference-system',
        'children' => [
            'Audio Conference System' => [
                'slug' => 'audio-conference-system',
                'children' => [
                    'AHUJA Conference System' => 'ahuja-conference-system',
                    'BOSCH Conference System' => 'bosch-conference-system',
                    'BXB Conference System' => 'bxb-conference-system',
                    'CMX Conference System' => 'cmx-conference-system',
                    'HTDZ Conference System' => 'htdz-conference-system',
                    'ITC Conference System' => 'itc-conference-system',
                    'TOA Conference System' => 'toa-conference-system',
                    'YARMEE Conference System' => 'yarmee-conference-system',
                ]
            ],
            'Video Conference System' => [
                'slug' => 'video-conference-system',
                'children' => [
                    'Aver Video Conference' => 'aver-video-conference',
                    'GRANDSTREAM Conference System' => 'grandstream-conference-system',
                    'JABRA Conference System' => 'jabra-conference-system',
                    'Logitech Video Conference' => 'logitech-video-conference',
                ]
            ],
            'Wireless Conference System' => [
                'slug' => 'wireless-conference-system',
                'children' => [
                    'AHUJA Wireless Conference' => 'ahuja-wireless-conference',
                    'BOSCH Wireless Conference' => 'bosch-wireless-conference',
                    'YARMEE Wireless Conference' => 'yarmee-wireless-conference',
                ]
            ],
        ]
    ],

    'PA System' => [
        'slug' => 'pa-system',
        'children' => [
            'Amplifier' => [
                'slug' => 'amplifier',
                'children' => [
                    'Booster Amplifier' => 'booster-amplifier',
                    'Mixer Amplifier' => 'mixer-amplifier',
                    'Power Amplifier' => 'power-amplifier',
                    'Zone Amplifier' => 'zone-amplifier',
                ]
            ],
            'Analogue PA System' => [
                'slug' => 'analogue-pa-system',
                'children' => [
                    'Ceiling Speaker' => 'ceiling-speaker',
                    'Clip/Lavalier Microphone' => 'clip-lavalier-microphone',
                    'Column Speaker' => 'column-speaker',
                    'Garden Speaker' => 'garden-speaker',
                    'Handheld Microphone' => 'handheld-microphone',
                    'Headworn Microphone' => 'headworn-microphone',
                    'Horn Speaker' => 'horn-speaker',
                    'Megaphone' => 'megaphone',
                    'Pendant Speaker' => 'pendant-speaker',
                    'Podium Microphone' => 'podium-microphone',
                    'Portable Speaker' => 'portable-speaker',
                    'Wall Mount Speaker' => 'wall-mount-speaker',
                    'Wireless Microphone' => 'wireless-microphone',
                ]
            ],
            'IP PA System' => [
                'slug' => 'ip-pa-system',
                'children' => [
                    'IP Based PA System Server' => 'ip-based-pa-system-server',
                    'IP Network Active Speakers' => 'ip-network-active-speakers',
                    'Microphone' => 'microphone',
                    'Network Paging Gateway' => 'network-paging-gateway',
                    'POE Ceiling Speaker' => 'poe-ceiling-speaker',
                    'POE Garden Speaker' => 'poe-garden-speaker',
                    'POE Horn Speaker' => 'poe-horn-speaker',
                    'POE Pendant Speaker' => 'poe-pendant-speaker',
                    'POE Wall Mount Speaker' => 'poe-wall-mount-speaker',
                ]
            ],
        ]
    ],

    'Walkie Talkie' => [
        'slug' => 'walkie-talkie',
        'children' => [
            'SBR Walkie Talkie' => 'sbr-walkie-talkie',
            'PMR Walkie Talkie' => 'pmr-walkie-talkie',
            'Satellite Phone' => 'satellite-phone',
            'Repeater' => 'repeater',
            'Walkie Talkie Tower' => 'walkie-talkie-tower',
            'Base Station' => 'base-station',
            'Accessories' => 'walkie-talkie-accessories',
        ]
    ],

    'Networking' => [
        'slug' => 'networking',
        'children' => [
            'Router' => 'router',
            'Cable Manager' => 'cable-manager',
            'Crimping Tools' => 'crimping-tools',
            'Face Plate' => 'face-plate',
            'Patch Cord' => 'patch-cord',
            'POE Switch' => 'poe-switch',
            'Switch' => 'switch',
            'UTP Cable' => 'utp-cable',
        ]
    ],

    'PABX & IP Phone' => [
        'slug' => 'pabx-ip-phone',
        'children' => [
            'PABX' => [
                'slug' => 'pabx',
                'children' => [
                    'Excelltel PABX' => 'excelltel-pabx',
                    'Gaoxinqi PABX' => 'gaoxinqi-pabx',
                    'Hellotel PABX' => 'hellotel-pabx',
                    'IKE PABX' => 'ike-pabx',
                    'Miracall PABX' => 'miracall-pabx',
                    'Panasonic PABX' => 'panasonic-pabx',
                    'TCS PABX' => 'tcs-pabx',
                ]
            ],
            'IP Phone' => [
                'slug' => 'ip-phone',
                'children' => [
                    'Dinstar IP Phone' => 'dinstar-ip-phone',
                    'Fanvil IP Phone' => 'fanvil-ip-phone',
                    'Flyingvoice IP Phone' => 'flyingvoice-ip-phone',
                    'Grandstream IP Phone' => 'grandstream-ip-phone',
                    'Snom IP Phone' => 'snom-ip-phone',
                ]
            ],
        ]
    ],

    'Security Solutions' => [
        'slug' => 'security-solutions',
        'children' => [
            'Archway Gate' => 'archway-gate',
            'Baggage Scanner' => 'baggage-scanner',
            'Boom Barrier' => 'boom-barrier',
            'Flap Barrier Gate' => 'flap-barrier-gate',
            'Guard Tour Control System' => 'guard-tour-control-system',
            'Hand Metal Detector' => 'hand-metal-detector',
            'Parking Barrier' => 'parking-barrier',
            'Speed Gate' => 'speed-gate',
            'Swing Barrier' => 'swing-barrier',
            'Tripod Turnstile' => 'tripod-turnstile',
            'Turnstile Dual Lane Gate' => 'turnstile-dual-lane-gate',
            'Turnstile Gate' => 'turnstile-gate',
            'Under Vehicle Surveillance System' => 'under-vehicle-surveillance-system',
        ]
    ],

    'Office Equipment' => [
        'slug' => 'office-equipment',
        'children' => [
            'Interactive & Visual Display' => 'interactive-visual-display',
            'Smart Display Solution' => 'smart-display-solution',
        ]
    ],
];

// ============================================================
// STEP 1: CREATE PRODUCT CATEGORIES
// ============================================================

echo "<h2>Step 1: Creating Product Categories</h2>\n";

$category_ids = []; // Store category IDs for menu creation

function create_category($name, $slug, $parent_id = 0) {
    global $category_ids;

    // Check if exists
    $term = get_term_by('slug', $slug, 'product_cat');

    if ($term) {
        echo "<span class='warning'>[EXISTS]</span> {$name} (ID: {$term->term_id})\n";
        $category_ids[$slug] = $term->term_id;
        return $term->term_id;
    }

    // Create new
    $result = wp_insert_term($name, 'product_cat', [
        'slug' => $slug,
        'parent' => $parent_id
    ]);

    if (is_wp_error($result)) {
        echo "<span class='error'>[ERROR]</span> {$name}: " . $result->get_error_message() . "\n";
        return false;
    }

    echo "<span class='success'>[CREATED]</span> {$name} (ID: {$result['term_id']})\n";
    $category_ids[$slug] = $result['term_id'];
    return $result['term_id'];
}

function process_categories($categories, $parent_id = 0, $indent = '') {
    foreach ($categories as $name => $data) {
        if (is_array($data) && isset($data['slug'])) {
            // Has children
            $slug = $data['slug'];
            echo $indent;
            $cat_id = create_category($name, $slug, $parent_id);

            if ($cat_id && isset($data['children'])) {
                process_categories($data['children'], $cat_id, $indent . '  ');
            }
        } else {
            // Simple child (name => slug)
            $slug = $data;
            echo $indent;
            create_category($name, $slug, $parent_id);
        }
    }
}

process_categories($categories);

echo "\n<span class='info'>Total categories created/found: " . count($category_ids) . "</span>\n";

// ============================================================
// STEP 2: CREATE NAVIGATION MENU
// ============================================================

echo "\n<h2>Step 2: Creating Navigation Menu</h2>\n";

$menu_name = 'Main Menu';
$menu_location = 'primary'; // Common theme location

// Check if menu exists
$menu = wp_get_nav_menu_object($menu_name);

if ($menu) {
    echo "<span class='warning'>Menu '{$menu_name}' already exists. Deleting and recreating...</span>\n";
    wp_delete_nav_menu($menu->term_id);
}

// Create new menu
$menu_id = wp_create_nav_menu($menu_name);

if (is_wp_error($menu_id)) {
    echo "<span class='error'>Failed to create menu: " . $menu_id->get_error_message() . "</span>\n";
} else {
    echo "<span class='success'>Created menu: {$menu_name} (ID: {$menu_id})</span>\n";

    // Add menu items
    $menu_order = 1;

    foreach ($categories as $name => $data) {
        $slug = is_array($data) ? $data['slug'] : $data;
        $cat_id = isset($category_ids[$slug]) ? $category_ids[$slug] : 0;

        if (!$cat_id) {
            $term = get_term_by('slug', $slug, 'product_cat');
            if ($term) $cat_id = $term->term_id;
        }

        if ($cat_id) {
            // Add parent menu item
            $parent_menu_item = wp_update_nav_menu_item($menu_id, 0, [
                'menu-item-title' => $name,
                'menu-item-object' => 'product_cat',
                'menu-item-object-id' => $cat_id,
                'menu-item-type' => 'taxonomy',
                'menu-item-status' => 'publish',
                'menu-item-position' => $menu_order++
            ]);

            echo "  <span class='success'>[+]</span> {$name}\n";

            // Add children
            if (is_array($data) && isset($data['children'])) {
                foreach ($data['children'] as $child_name => $child_data) {
                    $child_slug = is_array($child_data) ? $child_data['slug'] : $child_data;
                    $child_cat_id = isset($category_ids[$child_slug]) ? $category_ids[$child_slug] : 0;

                    if (!$child_cat_id) {
                        $term = get_term_by('slug', $child_slug, 'product_cat');
                        if ($term) $child_cat_id = $term->term_id;
                    }

                    if ($child_cat_id) {
                        $child_menu_item = wp_update_nav_menu_item($menu_id, 0, [
                            'menu-item-title' => $child_name,
                            'menu-item-object' => 'product_cat',
                            'menu-item-object-id' => $child_cat_id,
                            'menu-item-type' => 'taxonomy',
                            'menu-item-status' => 'publish',
                            'menu-item-parent-id' => $parent_menu_item,
                            'menu-item-position' => $menu_order++
                        ]);

                        echo "    <span class='info'>[+]</span> {$child_name}\n";

                        // Add grandchildren (3rd level)
                        if (is_array($child_data) && isset($child_data['children'])) {
                            foreach ($child_data['children'] as $grandchild_name => $grandchild_slug) {
                                $gc_cat_id = isset($category_ids[$grandchild_slug]) ? $category_ids[$grandchild_slug] : 0;

                                if (!$gc_cat_id) {
                                    $term = get_term_by('slug', $grandchild_slug, 'product_cat');
                                    if ($term) $gc_cat_id = $term->term_id;
                                }

                                if ($gc_cat_id) {
                                    wp_update_nav_menu_item($menu_id, 0, [
                                        'menu-item-title' => $grandchild_name,
                                        'menu-item-object' => 'product_cat',
                                        'menu-item-object-id' => $gc_cat_id,
                                        'menu-item-type' => 'taxonomy',
                                        'menu-item-status' => 'publish',
                                        'menu-item-parent-id' => $child_menu_item,
                                        'menu-item-position' => $menu_order++
                                    ]);

                                    echo "      <span class='info'>[+]</span> {$grandchild_name}\n";
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Assign menu to location
    $locations = get_theme_mod('nav_menu_locations');
    if (!is_array($locations)) $locations = [];

    // Try multiple common menu locations
    $possible_locations = ['primary', 'main-menu', 'primary-menu', 'main', 'header-menu', 'primary_navigation'];

    foreach ($possible_locations as $loc) {
        $locations[$loc] = $menu_id;
    }

    set_theme_mod('nav_menu_locations', $locations);

    echo "\n<span class='success'>Menu assigned to theme locations!</span>\n";
}

// ============================================================
// STEP 3: ADD ADDITIONAL PAGES TO MENU
// ============================================================

echo "\n<h2>Step 3: Adding Additional Menu Items</h2>\n";

// Add top menu items
$top_pages = [
    'About Us' => '/about-us/',
    'Blog' => '/blog/',
    'Brands' => '/brands/',
    'Track Your Order' => '/track-your-order/',
    'Contact Us' => '/contact-us/',
    'FAQs' => '/faqs/',
];

// Create a secondary menu for top bar
$top_menu_name = 'Top Menu';
$top_menu = wp_get_nav_menu_object($top_menu_name);
if ($top_menu) {
    wp_delete_nav_menu($top_menu->term_id);
}

$top_menu_id = wp_create_nav_menu($top_menu_name);

if (!is_wp_error($top_menu_id)) {
    echo "<span class='success'>Created menu: {$top_menu_name}</span>\n";

    $order = 1;
    foreach ($top_pages as $title => $url) {
        // Check if page exists
        $page = get_page_by_path(trim($url, '/'));

        if ($page) {
            wp_update_nav_menu_item($top_menu_id, 0, [
                'menu-item-title' => $title,
                'menu-item-object' => 'page',
                'menu-item-object-id' => $page->ID,
                'menu-item-type' => 'post_type',
                'menu-item-status' => 'publish',
                'menu-item-position' => $order++
            ]);
            echo "  <span class='success'>[+]</span> {$title} (Page)\n";
        } else {
            // Add as custom link
            wp_update_nav_menu_item($top_menu_id, 0, [
                'menu-item-title' => $title,
                'menu-item-url' => home_url($url),
                'menu-item-type' => 'custom',
                'menu-item-status' => 'publish',
                'menu-item-position' => $order++
            ]);
            echo "  <span class='info'>[+]</span> {$title} (Custom Link)\n";
        }
    }

    // Assign to secondary/top locations
    $locations = get_theme_mod('nav_menu_locations');
    if (!is_array($locations)) $locations = [];

    $top_locations = ['secondary', 'top-menu', 'top', 'topbar', 'header-top'];
    foreach ($top_locations as $loc) {
        $locations[$loc] = $top_menu_id;
    }

    set_theme_mod('nav_menu_locations', $locations);
}

// ============================================================
// STEP 4: CLEAR CACHES
// ============================================================

echo "\n<h2>Step 4: Clearing Caches</h2>\n";

// Clear WooCommerce caches
if (function_exists('wc_delete_product_transients')) {
    wc_delete_product_transients();
    echo "<span class='success'>Cleared WooCommerce transients</span>\n";
}

// Clear object cache
if (function_exists('wp_cache_flush')) {
    wp_cache_flush();
    echo "<span class='success'>Cleared object cache</span>\n";
}

// Clear rewrite rules
flush_rewrite_rules();
echo "<span class='success'>Flushed rewrite rules</span>\n";

// ============================================================
// DONE
// ============================================================

echo "\n<h2>=== COMPLETE ===</h2>\n";
echo "<span class='success'>Categories and menus have been imported!</span>\n\n";

echo "Next steps:\n";
echo "1. Go to Appearance > Menus to verify\n";
echo "2. Assign menus to correct locations if needed\n";
echo "3. Check your theme settings for menu display\n";
echo "4. <span class='error'>DELETE THIS FILE!</span>\n";

?>
</pre>
</body>
</html>
