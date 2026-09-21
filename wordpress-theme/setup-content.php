<?php
/**
 * Expert Tech BD - Content Setup Script
 *
 * Upload this file to your WordPress root directory and run it once.
 * URL: https://sticketing.xyz/lms/setup-content.php
 *
 * DELETE THIS FILE AFTER RUNNING!
 */

// Load WordPress
require_once('wp-load.php');

// Check if user is admin
if (!current_user_can('manage_options')) {
    wp_die('You must be logged in as admin to run this script.');
}

echo "<h1>Expert Tech BD - Content Setup</h1>";
echo "<pre>";

// ============================================================
// 1. CREATE PRODUCT CATEGORIES
// ============================================================
echo "\n=== Creating Product Categories ===\n";

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
            echo "Created category: {$cat['name']}\n";
        } else {
            echo "Error creating {$cat['name']}: {$result->get_error_message()}\n";
        }
    } else {
        echo "Category exists: {$cat['name']}\n";
    }
}

// ============================================================
// 2. CREATE BRANDS
// ============================================================
echo "\n=== Creating Brands ===\n";

$brands = [
    ['name' => 'Hikvision', 'description' => 'World leading video surveillance brand'],
    ['name' => 'Dahua', 'description' => 'Professional security solutions provider'],
    ['name' => 'ZKTeco', 'description' => 'Biometric and security technology leader'],
    ['name' => 'Concox', 'description' => 'GPS tracking device manufacturer'],
    ['name' => 'Motorola', 'description' => 'Communication and radio equipment'],
    ['name' => 'Baofeng', 'description' => 'Affordable two-way radio brand'],
    ['name' => 'TP-Link', 'description' => 'Networking equipment manufacturer'],
    ['name' => 'Uniview', 'description' => 'IP video surveillance solutions'],
    ['name' => 'Tenda', 'description' => 'Networking devices and solutions'],
    ['name' => 'D-Link', 'description' => 'Network and connectivity solutions'],
];

foreach ($brands as $brand) {
    $existing = get_page_by_title($brand['name'], OBJECT, 'brand');
    if (!$existing) {
        $post_id = wp_insert_post([
            'post_title' => $brand['name'],
            'post_content' => $brand['description'],
            'post_status' => 'publish',
            'post_type' => 'brand'
        ]);
        if ($post_id) {
            echo "Created brand: {$brand['name']}\n";
        }
    } else {
        echo "Brand exists: {$brand['name']}\n";
    }
}

// ============================================================
// 3. CREATE PAGES
// ============================================================
echo "\n=== Creating Pages ===\n";

$pages = [
    [
        'title' => 'Home',
        'slug' => 'home',
        'content' => '',
        'template' => ''
    ],
    [
        'title' => 'About Us',
        'slug' => 'about-us',
        'content' => '<h2>Welcome to Expert Tech BD</h2>
<p>Expert Tech BD is a leading provider of security and technology solutions in Bangladesh. We specialize in GPS tracking systems, CCTV cameras, access control systems, walkie-talkies, and PA systems.</p>

<h3>Our Mission</h3>
<p>To provide cutting-edge security and communication technology solutions that help businesses and individuals protect their assets and stay connected.</p>

<h3>Why Choose Us?</h3>
<ul>
<li><strong>Expert Team:</strong> Our technicians are trained and certified</li>
<li><strong>Quality Products:</strong> We only sell genuine branded products</li>
<li><strong>After-Sales Support:</strong> 24/7 technical support available</li>
<li><strong>Competitive Prices:</strong> Best prices in Bangladesh</li>
<li><strong>Installation Service:</strong> Professional installation nationwide</li>
</ul>

<h3>Our Services</h3>
<ul>
<li>GPS Vehicle Tracking Solutions</li>
<li>CCTV Installation & Maintenance</li>
<li>Access Control System Setup</li>
<li>Network Infrastructure</li>
<li>Two-Way Radio Solutions</li>
</ul>'
    ],
    [
        'title' => 'Contact Us',
        'slug' => 'contact-us',
        'content' => '<h2>Get In Touch</h2>
<p>Have questions about our products or services? Contact us today!</p>

<h3>Our Office</h3>
<p><strong>Address:</strong> House #12, Road #5, Sector #10, Uttara, Dhaka-1230, Bangladesh</p>
<p><strong>Phone:</strong> +880 1XXX-XXXXXX</p>
<p><strong>Email:</strong> info@experttechbd.com</p>
<p><strong>Working Hours:</strong> Saturday - Thursday: 10:00 AM - 8:00 PM</p>

<h3>Send Us a Message</h3>
[contact-form-7 id="contact-form" title="Contact Form"]'
    ],
    [
        'title' => 'Shop',
        'slug' => 'shop',
        'content' => ''
    ],
    [
        'title' => 'Cart',
        'slug' => 'cart',
        'content' => '[woocommerce_cart]'
    ],
    [
        'title' => 'Checkout',
        'slug' => 'checkout',
        'content' => '[woocommerce_checkout]'
    ],
    [
        'title' => 'My Account',
        'slug' => 'my-account',
        'content' => '[woocommerce_my_account]'
    ],
    [
        'title' => 'FAQ',
        'slug' => 'faq',
        'content' => '<h2>Frequently Asked Questions</h2>
[expert_faq limit="20"]'
    ],
    [
        'title' => 'Privacy Policy',
        'slug' => 'privacy-policy',
        'content' => '<h2>Privacy Policy</h2>
<p>Your privacy is important to us. This policy explains how we collect, use, and protect your personal information.</p>

<h3>Information We Collect</h3>
<p>We collect information you provide when placing orders, creating accounts, or contacting us.</p>

<h3>How We Use Your Information</h3>
<p>We use your information to process orders, provide customer support, and improve our services.</p>

<h3>Data Protection</h3>
<p>We implement security measures to protect your personal information from unauthorized access.</p>'
    ],
    [
        'title' => 'Terms & Conditions',
        'slug' => 'terms-conditions',
        'content' => '<h2>Terms & Conditions</h2>
<p>By using our website and services, you agree to these terms and conditions.</p>

<h3>Orders & Payment</h3>
<p>All orders are subject to availability. Payment must be made before delivery.</p>

<h3>Shipping & Delivery</h3>
<p>We deliver nationwide. Delivery times vary by location.</p>

<h3>Returns & Refunds</h3>
<p>Products can be returned within 7 days if unopened and in original condition.</p>

<h3>Warranty</h3>
<p>All products come with manufacturer warranty. Warranty terms vary by product.</p>'
    ],
    [
        'title' => 'Services',
        'slug' => 'services',
        'content' => '<h2>Our Services</h2>

<h3>GPS Vehicle Tracking</h3>
<p>Real-time vehicle tracking solutions for personal and fleet management. Monitor your vehicles 24/7 from anywhere.</p>

<h3>CCTV Installation</h3>
<p>Professional CCTV camera installation for homes, offices, and businesses. We handle everything from consultation to installation.</p>

<h3>Access Control Systems</h3>
<p>Secure your premises with our biometric and card-based access control solutions.</p>

<h3>Network Setup</h3>
<p>Complete networking solutions including router setup, cabling, and WiFi configuration.</p>

<h3>Maintenance & Support</h3>
<p>Annual maintenance contracts and 24/7 technical support for all our products.</p>'
    ],
];

foreach ($pages as $page) {
    $existing = get_page_by_path($page['slug']);
    if (!$existing) {
        $page_data = [
            'post_title' => $page['title'],
            'post_name' => $page['slug'],
            'post_content' => $page['content'],
            'post_status' => 'publish',
            'post_type' => 'page'
        ];

        $page_id = wp_insert_post($page_data);

        if ($page_id && isset($page['template']) && $page['template']) {
            update_post_meta($page_id, '_wp_page_template', $page['template']);
        }

        echo "Created page: {$page['title']}\n";
    } else {
        echo "Page exists: {$page['title']}\n";
    }
}

// Set homepage
$home_page = get_page_by_path('home');
if ($home_page) {
    update_option('show_on_front', 'page');
    update_option('page_on_front', $home_page->ID);
    echo "Set homepage\n";
}

// Set shop page
$shop_page = get_page_by_path('shop');
if ($shop_page) {
    update_option('woocommerce_shop_page_id', $shop_page->ID);
}

// ============================================================
// 4. CREATE SAMPLE PRODUCTS
// ============================================================
echo "\n=== Creating Sample Products ===\n";

$products = [
    // GPS Trackers
    [
        'name' => 'Concox GT06N GPS Tracker',
        'slug' => 'concox-gt06n-gps-tracker',
        'price' => '3500',
        'regular_price' => '4000',
        'category' => 'gps-tracker',
        'description' => 'Real-time GPS vehicle tracker with ACC detection, fuel cut-off, and SOS button. Perfect for car, motorcycle, and fleet tracking.',
        'short_description' => 'Real-time GPS tracker with remote engine cut-off feature.',
        'sku' => 'GT06N-001',
        'featured' => true
    ],
    [
        'name' => 'Concox GT06E GPS Tracker',
        'slug' => 'concox-gt06e-gps-tracker',
        'price' => '4500',
        'regular_price' => '5000',
        'category' => 'gps-tracker',
        'description' => 'Advanced GPS tracker with multiple I/O ports, fuel monitoring, and driver behavior analysis.',
        'short_description' => 'Advanced GPS tracker with fuel monitoring.',
        'sku' => 'GT06E-001',
        'featured' => true
    ],
    [
        'name' => 'Concox WeTrack2 Personal Tracker',
        'slug' => 'concox-wetrack2-personal-tracker',
        'price' => '2800',
        'regular_price' => '3200',
        'category' => 'gps-tracker',
        'description' => 'Portable personal GPS tracker for kids, elderly, and asset tracking. Long battery life with SOS button.',
        'short_description' => 'Portable personal GPS tracker with SOS.',
        'sku' => 'WT2-001'
    ],

    // CCTV Cameras
    [
        'name' => 'Hikvision DS-2CD1043G0-I 4MP IP Camera',
        'slug' => 'hikvision-ds-2cd1043g0-i-4mp',
        'price' => '4200',
        'regular_price' => '4800',
        'category' => 'ip-camera',
        'description' => '4MP IP bullet camera with 30m IR range, IP67 weatherproof rating. Perfect for outdoor surveillance.',
        'short_description' => '4MP outdoor IP bullet camera.',
        'sku' => 'HIK-1043G0-001',
        'featured' => true
    ],
    [
        'name' => 'Hikvision DS-2CE16D0T-ITPF 2MP Dome Camera',
        'slug' => 'hikvision-ds-2ce16d0t-dome',
        'price' => '1800',
        'regular_price' => '2200',
        'category' => 'cctv-camera',
        'description' => '2MP indoor dome camera with 20m IR range. Ideal for indoor surveillance.',
        'short_description' => '2MP indoor dome camera.',
        'sku' => 'HIK-16D0T-001'
    ],
    [
        'name' => 'Dahua DH-HAC-HFW1200RP 2MP Bullet Camera',
        'slug' => 'dahua-dh-hac-hfw1200rp-bullet',
        'price' => '1600',
        'regular_price' => '2000',
        'category' => 'cctv-camera',
        'description' => '2MP HDCVI bullet camera with 20m IR range and IP67 weatherproof rating.',
        'short_description' => '2MP outdoor bullet camera.',
        'sku' => 'DAH-HFW1200-001'
    ],
    [
        'name' => 'Hikvision DS-7104HGHI-K1 4CH DVR',
        'slug' => 'hikvision-ds-7104hghi-k1-dvr',
        'price' => '5500',
        'regular_price' => '6500',
        'category' => 'dvr-nvr',
        'description' => '4 Channel Turbo HD DVR with H.265+ compression. Supports up to 4MP cameras.',
        'short_description' => '4 Channel HD DVR.',
        'sku' => 'HIK-7104-001',
        'featured' => true
    ],
    [
        'name' => 'Dahua DHI-NVR1108HS-8P-S3 8CH NVR',
        'slug' => 'dahua-dhi-nvr1108hs-nvr',
        'price' => '12000',
        'regular_price' => '14000',
        'category' => 'dvr-nvr',
        'description' => '8 Channel Network Video Recorder with 8 PoE ports. Supports up to 8MP cameras.',
        'short_description' => '8 Channel PoE NVR.',
        'sku' => 'DAH-NVR1108-001'
    ],

    // Access Control
    [
        'name' => 'ZKTeco K40 Fingerprint Attendance Machine',
        'slug' => 'zkteco-k40-fingerprint',
        'price' => '8500',
        'regular_price' => '9500',
        'category' => 'fingerprint-device',
        'description' => 'Fingerprint and password attendance machine with 1000 fingerprint capacity. Built-in battery backup.',
        'short_description' => 'Fingerprint attendance with battery backup.',
        'sku' => 'ZK-K40-001',
        'featured' => true
    ],
    [
        'name' => 'ZKTeco MB20 Face Recognition Terminal',
        'slug' => 'zkteco-mb20-face-recognition',
        'price' => '18000',
        'regular_price' => '20000',
        'category' => 'face-recognition',
        'description' => 'Multi-biometric time attendance with face, fingerprint, and card recognition. Visible light facial recognition.',
        'short_description' => 'Face recognition attendance terminal.',
        'sku' => 'ZK-MB20-001',
        'featured' => true
    ],
    [
        'name' => 'ZKTeco ML10 Smart Lock',
        'slug' => 'zkteco-ml10-smart-lock',
        'price' => '12000',
        'regular_price' => '14000',
        'category' => 'door-lock',
        'description' => 'Smart fingerprint door lock with Bluetooth app control. Multiple unlock methods.',
        'short_description' => 'Smart fingerprint door lock.',
        'sku' => 'ZK-ML10-001'
    ],

    // Walkie Talkies
    [
        'name' => 'Motorola T82 Extreme Walkie Talkie',
        'slug' => 'motorola-t82-extreme',
        'price' => '8500',
        'regular_price' => '9500',
        'category' => 'walkie-talkie',
        'description' => 'Rugged PMR446 walkie talkie with 10km range. IPX4 water resistant with torch.',
        'short_description' => 'Rugged walkie talkie with 10km range.',
        'sku' => 'MOT-T82-001',
        'featured' => true
    ],
    [
        'name' => 'Baofeng BF-888S Two Way Radio',
        'slug' => 'baofeng-bf-888s-radio',
        'price' => '1200',
        'regular_price' => '1500',
        'category' => 'walkie-talkie',
        'description' => 'Affordable UHF two-way radio with 5W power. Perfect for small businesses and events.',
        'short_description' => 'Affordable UHF two-way radio.',
        'sku' => 'BAO-888S-001'
    ],
    [
        'name' => 'Baofeng UV-5R Dual Band Radio',
        'slug' => 'baofeng-uv-5r-dual-band',
        'price' => '2500',
        'regular_price' => '3000',
        'category' => 'walkie-talkie',
        'description' => 'Dual band VHF/UHF radio with 5W power and FM radio function.',
        'short_description' => 'Dual band amateur radio.',
        'sku' => 'BAO-UV5R-001'
    ],

    // Networking
    [
        'name' => 'TP-Link TL-SG1005D 5-Port Gigabit Switch',
        'slug' => 'tp-link-tl-sg1005d-switch',
        'price' => '1200',
        'regular_price' => '1500',
        'category' => 'networking',
        'description' => '5-Port Gigabit Desktop Switch with auto MDI/MDIX and green technology.',
        'short_description' => '5-Port Gigabit switch.',
        'sku' => 'TPL-SG1005D-001'
    ],
    [
        'name' => 'TP-Link Archer C6 AC1200 Router',
        'slug' => 'tp-link-archer-c6-router',
        'price' => '3500',
        'regular_price' => '4000',
        'category' => 'networking',
        'description' => 'AC1200 Wireless MU-MIMO Gigabit Router with 4 external antennas.',
        'short_description' => 'AC1200 dual band WiFi router.',
        'sku' => 'TPL-C6-001'
    ],
];

foreach ($products as $product) {
    $existing = get_page_by_path($product['slug'], OBJECT, 'product');
    if (!$existing) {
        $post_id = wp_insert_post([
            'post_title' => $product['name'],
            'post_name' => $product['slug'],
            'post_content' => $product['description'],
            'post_excerpt' => $product['short_description'],
            'post_status' => 'publish',
            'post_type' => 'product'
        ]);

        if ($post_id) {
            // Set product data
            update_post_meta($post_id, '_price', $product['price']);
            update_post_meta($post_id, '_regular_price', $product['regular_price']);
            update_post_meta($post_id, '_sale_price', $product['price']);
            update_post_meta($post_id, '_sku', $product['sku']);
            update_post_meta($post_id, '_stock_status', 'instock');
            update_post_meta($post_id, '_manage_stock', 'no');
            update_post_meta($post_id, '_visibility', 'visible');

            // Set category
            $cat = get_term_by('slug', $product['category'], 'product_cat');
            if ($cat) {
                wp_set_object_terms($post_id, [$cat->term_id], 'product_cat');
            }

            // Set featured
            if (isset($product['featured']) && $product['featured']) {
                update_post_meta($post_id, '_featured', 'yes');
            }

            echo "Created product: {$product['name']}\n";
        }
    } else {
        echo "Product exists: {$product['name']}\n";
    }
}

// ============================================================
// 5. CREATE HERO SLIDERS
// ============================================================
echo "\n=== Creating Hero Sliders ===\n";

$sliders = [
    [
        'title' => 'GPS Vehicle Tracking',
        'subtitle' => 'Real-Time Monitoring',
        'description' => 'Track your vehicles 24/7 from anywhere. Get real-time location, speed alerts, and fuel monitoring.',
        'button_text' => 'Shop Now',
        'button_url' => '/shop/?category=gps-tracker'
    ],
    [
        'title' => 'CCTV Security Solutions',
        'subtitle' => 'Protect What Matters',
        'description' => 'Professional CCTV cameras and DVR systems for home and business security.',
        'button_text' => 'Explore',
        'button_url' => '/shop/?category=cctv-camera'
    ],
    [
        'title' => 'Access Control Systems',
        'subtitle' => 'Smart Security',
        'description' => 'Biometric attendance and door access control solutions for modern offices.',
        'button_text' => 'Learn More',
        'button_url' => '/shop/?category=access-control'
    ],
];

foreach ($sliders as $slider) {
    $existing = get_page_by_title($slider['title'], OBJECT, 'slider');
    if (!$existing) {
        $post_id = wp_insert_post([
            'post_title' => $slider['title'],
            'post_status' => 'publish',
            'post_type' => 'slider'
        ]);

        if ($post_id) {
            update_post_meta($post_id, '_slider_subtitle', $slider['subtitle']);
            update_post_meta($post_id, '_slider_description', $slider['description']);
            update_post_meta($post_id, '_slider_button_text', $slider['button_text']);
            update_post_meta($post_id, '_slider_button_url', $slider['button_url']);
            echo "Created slider: {$slider['title']}\n";
        }
    } else {
        echo "Slider exists: {$slider['title']}\n";
    }
}

// ============================================================
// 6. CREATE FAQs
// ============================================================
echo "\n=== Creating FAQs ===\n";

$faqs = [
    [
        'question' => 'How does GPS tracking work?',
        'answer' => 'GPS trackers use satellite signals to determine the exact location of your vehicle. The tracker sends this data to our servers via cellular network, and you can view the location in real-time on our web platform or mobile app.'
    ],
    [
        'question' => 'What is the monthly fee for GPS tracking?',
        'answer' => 'Our GPS tracking service costs BDT 300-500 per month per vehicle, depending on the features you need. This includes real-time tracking, history playback, and basic alerts.'
    ],
    [
        'question' => 'Do you provide installation service?',
        'answer' => 'Yes, we provide professional installation service for all our products. Our technicians will come to your location and install the device properly. Installation charges vary by product and location.'
    ],
    [
        'question' => 'What warranty do you offer?',
        'answer' => 'All our products come with manufacturer warranty. GPS trackers have 1 year warranty, CCTV cameras have 2 years warranty, and networking products have 3 years warranty.'
    ],
    [
        'question' => 'Can I track multiple vehicles?',
        'answer' => 'Yes, our platform supports unlimited vehicles. You can track all your vehicles from a single dashboard. We offer special pricing for fleet customers.'
    ],
    [
        'question' => 'Do you deliver outside Dhaka?',
        'answer' => 'Yes, we deliver nationwide through courier service. Delivery within Dhaka takes 1-2 days, and outside Dhaka takes 3-5 days.'
    ],
    [
        'question' => 'What payment methods do you accept?',
        'answer' => 'We accept bKash, Nagad, bank transfer, and cash on delivery (COD) within Dhaka. For large orders, we also accept cheque payments.'
    ],
    [
        'question' => 'Can I see a demo before buying?',
        'answer' => 'Yes, you can visit our showroom for a live demonstration of any product. You can also request an online demo via video call.'
    ],
];

$faq_cat = get_term_by('slug', 'general', 'faq_category');
if (!$faq_cat) {
    $faq_cat = wp_insert_term('General', 'faq_category', ['slug' => 'general']);
    if (!is_wp_error($faq_cat)) {
        $faq_cat_id = $faq_cat['term_id'];
    }
} else {
    $faq_cat_id = $faq_cat->term_id;
}

foreach ($faqs as $faq) {
    $existing = get_page_by_title($faq['question'], OBJECT, 'faq');
    if (!$existing) {
        $post_id = wp_insert_post([
            'post_title' => $faq['question'],
            'post_content' => $faq['answer'],
            'post_status' => 'publish',
            'post_type' => 'faq'
        ]);

        if ($post_id && isset($faq_cat_id)) {
            wp_set_object_terms($post_id, [$faq_cat_id], 'faq_category');
        }

        echo "Created FAQ: {$faq['question']}\n";
    } else {
        echo "FAQ exists: {$faq['question']}\n";
    }
}

// ============================================================
// 7. CREATE NAVIGATION MENUS
// ============================================================
echo "\n=== Creating Navigation Menus ===\n";

// Primary Menu
$menu_name = 'Primary Menu';
$menu_exists = wp_get_nav_menu_object($menu_name);

if (!$menu_exists) {
    $menu_id = wp_create_nav_menu($menu_name);

    // Home
    wp_update_nav_menu_item($menu_id, 0, [
        'menu-item-title' => 'Home',
        'menu-item-url' => home_url('/'),
        'menu-item-status' => 'publish',
        'menu-item-type' => 'custom'
    ]);

    // Shop
    $shop_item = wp_update_nav_menu_item($menu_id, 0, [
        'menu-item-title' => 'Shop',
        'menu-item-url' => home_url('/shop/'),
        'menu-item-status' => 'publish',
        'menu-item-type' => 'custom'
    ]);

    // Shop submenu items
    $categories_menu = ['GPS Tracker', 'CCTV Camera', 'Access Control', 'Walkie Talkie', 'Networking'];
    foreach ($categories_menu as $cat_name) {
        $cat = get_term_by('name', $cat_name, 'product_cat');
        if ($cat) {
            wp_update_nav_menu_item($menu_id, 0, [
                'menu-item-title' => $cat_name,
                'menu-item-url' => get_term_link($cat),
                'menu-item-status' => 'publish',
                'menu-item-type' => 'custom',
                'menu-item-parent-id' => $shop_item
            ]);
        }
    }

    // Services
    wp_update_nav_menu_item($menu_id, 0, [
        'menu-item-title' => 'Services',
        'menu-item-url' => home_url('/services/'),
        'menu-item-status' => 'publish',
        'menu-item-type' => 'custom'
    ]);

    // About
    wp_update_nav_menu_item($menu_id, 0, [
        'menu-item-title' => 'About Us',
        'menu-item-url' => home_url('/about-us/'),
        'menu-item-status' => 'publish',
        'menu-item-type' => 'custom'
    ]);

    // Contact
    wp_update_nav_menu_item($menu_id, 0, [
        'menu-item-title' => 'Contact',
        'menu-item-url' => home_url('/contact-us/'),
        'menu-item-status' => 'publish',
        'menu-item-type' => 'custom'
    ]);

    // Assign to location
    $locations = get_theme_mod('nav_menu_locations');
    $locations['primary'] = $menu_id;
    set_theme_mod('nav_menu_locations', $locations);

    echo "Created menu: {$menu_name}\n";
} else {
    echo "Menu exists: {$menu_name}\n";
}

// Footer Menu 1
$footer_menu_name = 'Quick Links';
$footer_menu_exists = wp_get_nav_menu_object($footer_menu_name);

if (!$footer_menu_exists) {
    $footer_menu_id = wp_create_nav_menu($footer_menu_name);

    $footer_links = [
        'Home' => '/',
        'Shop' => '/shop/',
        'About Us' => '/about-us/',
        'Services' => '/services/',
        'Contact' => '/contact-us/'
    ];

    foreach ($footer_links as $title => $url) {
        wp_update_nav_menu_item($footer_menu_id, 0, [
            'menu-item-title' => $title,
            'menu-item-url' => home_url($url),
            'menu-item-status' => 'publish',
            'menu-item-type' => 'custom'
        ]);
    }

    $locations = get_theme_mod('nav_menu_locations');
    $locations['footer-1'] = $footer_menu_id;
    set_theme_mod('nav_menu_locations', $locations);

    echo "Created menu: {$footer_menu_name}\n";
}

// Footer Menu 2 - Customer Service
$cs_menu_name = 'Customer Service';
$cs_menu_exists = wp_get_nav_menu_object($cs_menu_name);

if (!$cs_menu_exists) {
    $cs_menu_id = wp_create_nav_menu($cs_menu_name);

    $cs_links = [
        'My Account' => '/my-account/',
        'Track Order' => '/my-account/orders/',
        'FAQ' => '/faq/',
        'Privacy Policy' => '/privacy-policy/',
        'Terms & Conditions' => '/terms-conditions/'
    ];

    foreach ($cs_links as $title => $url) {
        wp_update_nav_menu_item($cs_menu_id, 0, [
            'menu-item-title' => $title,
            'menu-item-url' => home_url($url),
            'menu-item-status' => 'publish',
            'menu-item-type' => 'custom'
        ]);
    }

    $locations = get_theme_mod('nav_menu_locations');
    $locations['footer-2'] = $cs_menu_id;
    set_theme_mod('nav_menu_locations', $locations);

    echo "Created menu: {$cs_menu_name}\n";
}

// ============================================================
// 8. UPDATE THEME OPTIONS
// ============================================================
echo "\n=== Updating Theme Options ===\n";

// Set Customizer options
set_theme_mod('expert_tech_phone', '+880 1XXX-XXXXXX');
set_theme_mod('expert_tech_email', 'info@experttechbd.com');
set_theme_mod('expert_tech_address', 'House #12, Road #5, Sector #10, Uttara, Dhaka-1230');
set_theme_mod('expert_tech_whatsapp', 'https://wa.me/8801XXXXXXXXX');
set_theme_mod('expert_tech_facebook', 'https://facebook.com/experttechbd');
set_theme_mod('expert_tech_youtube', 'https://youtube.com/@experttechbd');
set_theme_mod('expert_tech_footer_about', 'Expert Tech BD is your trusted partner for GPS tracking, CCTV, and security solutions in Bangladesh. We provide quality products with professional installation and after-sales support.');
set_theme_mod('expert_tech_copyright', '© 2024 Expert Tech BD. All rights reserved.');

echo "Theme options updated\n";

// ============================================================
// 9. SET WOOCOMMERCE OPTIONS
// ============================================================
echo "\n=== Setting WooCommerce Options ===\n";

update_option('woocommerce_currency', 'BDT');
update_option('woocommerce_currency_pos', 'left_space');
update_option('woocommerce_price_thousand_sep', ',');
update_option('woocommerce_price_decimal_sep', '.');
update_option('woocommerce_price_num_decimals', '0');
update_option('woocommerce_default_country', 'BD');

// Set WooCommerce pages
$cart_page = get_page_by_path('cart');
$checkout_page = get_page_by_path('checkout');
$account_page = get_page_by_path('my-account');

if ($cart_page) update_option('woocommerce_cart_page_id', $cart_page->ID);
if ($checkout_page) update_option('woocommerce_checkout_page_id', $checkout_page->ID);
if ($account_page) update_option('woocommerce_myaccount_page_id', $account_page->ID);

echo "WooCommerce options set\n";

// ============================================================
// DONE
// ============================================================
echo "\n=== SETUP COMPLETE ===\n";
echo "\nAll content has been created successfully!\n";
echo "\nNext steps:\n";
echo "1. Go to Appearance > Customize to upload your logo\n";
echo "2. Go to Products to add product images\n";
echo "3. Go to Sliders to add slider background images\n";
echo "4. Update contact information in Appearance > Customize\n";
echo "5. DELETE THIS FILE (setup-content.php) for security!\n";

echo "</pre>";
?>
