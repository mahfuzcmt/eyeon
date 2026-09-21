<?php
/**
 * WooCommerce Integration
 *
 * @package Expert_Tech_BD
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * WooCommerce setup function
 */
function expert_tech_woocommerce_setup() {
    add_theme_support('woocommerce', array(
        'thumbnail_image_width' => 400,
        'single_image_width'    => 800,
        'product_grid'          => array(
            'default_rows'    => 3,
            'min_rows'        => 1,
            'default_columns' => 4,
            'min_columns'     => 1,
            'max_columns'     => 5,
        ),
    ));

    add_theme_support('wc-product-gallery-zoom');
    add_theme_support('wc-product-gallery-lightbox');
    add_theme_support('wc-product-gallery-slider');
}
add_action('after_setup_theme', 'expert_tech_woocommerce_setup');

/**
 * WooCommerce specific styles
 */
function expert_tech_woocommerce_styles() {
    wp_enqueue_style(
        'expert-tech-woocommerce',
        EXPERT_TECH_URI . '/assets/css/woocommerce.css',
        array('expert-tech-style'),
        EXPERT_TECH_VERSION
    );
}
add_action('wp_enqueue_scripts', 'expert_tech_woocommerce_styles');

/**
 * Products per page
 */
function expert_tech_products_per_page($cols) {
    return get_theme_mod('expert_tech_products_per_page', 12);
}
add_filter('loop_shop_per_page', 'expert_tech_products_per_page');

/**
 * Products per row
 */
function expert_tech_loop_columns() {
    return get_theme_mod('expert_tech_products_per_row', 4);
}
add_filter('loop_shop_columns', 'expert_tech_loop_columns');

/**
 * Related products args
 */
function expert_tech_related_products_args($args) {
    $args['posts_per_page'] = 4;
    $args['columns'] = 4;
    return $args;
}
add_filter('woocommerce_output_related_products_args', 'expert_tech_related_products_args');

/**
 * Remove default WooCommerce wrapper
 */
remove_action('woocommerce_before_main_content', 'woocommerce_output_content_wrapper', 10);
remove_action('woocommerce_after_main_content', 'woocommerce_output_content_wrapper_end', 10);

/**
 * Add custom wrapper
 */
function expert_tech_woocommerce_wrapper_before() {
    ?>
    <div class="woocommerce-content">
        <div class="container">
            <div class="woocommerce-wrapper <?php echo is_active_sidebar('sidebar-shop') && get_theme_mod('expert_tech_shop_sidebar', true) ? 'has-sidebar' : ''; ?>">
                <div class="woocommerce-main">
    <?php
}
add_action('woocommerce_before_main_content', 'expert_tech_woocommerce_wrapper_before');

function expert_tech_woocommerce_wrapper_after() {
    ?>
                </div>
                <?php if (is_active_sidebar('sidebar-shop') && get_theme_mod('expert_tech_shop_sidebar', true) && !is_product()): ?>
                    <aside class="woocommerce-sidebar sidebar">
                        <?php dynamic_sidebar('sidebar-shop'); ?>
                    </aside>
                <?php endif; ?>
            </div>
        </div>
    </div>
    <?php
}
add_action('woocommerce_after_main_content', 'expert_tech_woocommerce_wrapper_after');

/**
 * Remove default sidebar
 */
remove_action('woocommerce_sidebar', 'woocommerce_get_sidebar', 10);

/**
 * Product Loop - Add wrapper
 */
function expert_tech_before_shop_loop_item() {
    echo '<div class="product-inner">';
}
add_action('woocommerce_before_shop_loop_item', 'expert_tech_before_shop_loop_item', 5);

function expert_tech_after_shop_loop_item() {
    echo '</div>';
}
add_action('woocommerce_after_shop_loop_item', 'expert_tech_after_shop_loop_item', 25);

/**
 * Product Loop - Quick View Button
 */
function expert_tech_quick_view_button() {
    global $product;
    ?>
    <div class="product-quick-actions">
        <button class="quick-view-btn" data-product-id="<?php echo esc_attr($product->get_id()); ?>" title="<?php esc_attr_e('Quick View', 'expert-tech-bd'); ?>">
            <i class="fas fa-eye"></i>
        </button>
        <?php if (function_exists('YITH_WCWL')): ?>
            <?php echo do_shortcode('[yith_wcwl_add_to_wishlist]'); ?>
        <?php endif; ?>
        <?php if (function_exists('woosc_init')): ?>
            <?php echo do_shortcode('[woosc id="' . $product->get_id() . '"]'); ?>
        <?php endif; ?>
    </div>
    <?php
}
add_action('woocommerce_before_shop_loop_item_title', 'expert_tech_quick_view_button', 15);

/**
 * Product Loop - Sale Badge with Percentage
 */
function expert_tech_sale_flash($html, $post, $product) {
    if ($product->is_on_sale()) {
        $regular_price = floatval($product->get_regular_price());
        $sale_price    = floatval($product->get_sale_price());

        if ($regular_price > 0 && !empty($sale_price)) {
            $percentage = round((($regular_price - $sale_price) / $regular_price) * 100);
            return '<span class="onsale">-' . $percentage . '%</span>';
        }
    }
    return $html;
}
add_filter('woocommerce_sale_flash', 'expert_tech_sale_flash', 10, 3);

/**
 * Product Loop - New Badge
 */
function expert_tech_new_badge() {
    global $product;

    $created = strtotime($product->get_date_created());
    $thirty_days_ago = strtotime('-30 days');

    if ($created > $thirty_days_ago) {
        echo '<span class="new-badge">' . esc_html__('New', 'expert-tech-bd') . '</span>';
    }
}
add_action('woocommerce_before_shop_loop_item_title', 'expert_tech_new_badge', 8);

/**
 * Product Loop - Category before title
 */
function expert_tech_product_category() {
    global $product;
    echo '<div class="product-category">' . wc_get_product_category_list($product->get_id(), ', ') . '</div>';
}
add_action('woocommerce_shop_loop_item_title', 'expert_tech_product_category', 5);

/**
 * Product Loop - Rating after title
 */
remove_action('woocommerce_after_shop_loop_item_title', 'woocommerce_template_loop_rating', 5);
add_action('woocommerce_after_shop_loop_item_title', 'woocommerce_template_loop_rating', 8);

/**
 * Single Product - Gallery classes
 */
function expert_tech_single_product_image_gallery_classes($classes) {
    $classes[] = 'expert-tech-gallery';
    return $classes;
}
add_filter('woocommerce_single_product_image_gallery_classes', 'expert_tech_single_product_image_gallery_classes');

/**
 * Add to Cart AJAX fragment for cart count
 */
function expert_tech_cart_count_fragments($fragments) {
    $fragments['.cart-count'] = '<span class="count cart-count">' . WC()->cart->get_cart_contents_count() . '</span>';
    $fragments['.cart-total'] = '<span class="cart-total">' . WC()->cart->get_cart_total() . '</span>';
    return $fragments;
}
add_filter('woocommerce_add_to_cart_fragments', 'expert_tech_cart_count_fragments');

/**
 * Checkout - Remove order notes
 */
add_filter('woocommerce_enable_order_notes_field', '__return_false');

/**
 * Checkout - Custom fields labels
 */
function expert_tech_checkout_fields($fields) {
    // Customize field labels if needed
    return $fields;
}
add_filter('woocommerce_checkout_fields', 'expert_tech_checkout_fields');

/**
 * Change "Add to Cart" text
 */
function expert_tech_add_to_cart_text($text, $product) {
    if ($product->is_type('simple')) {
        return __('Add to Cart', 'expert-tech-bd');
    }
    return $text;
}
add_filter('woocommerce_product_add_to_cart_text', 'expert_tech_add_to_cart_text', 10, 2);

/**
 * Single Product - Add to Cart text
 */
function expert_tech_single_add_to_cart_text($text, $product) {
    return __('Add to Cart', 'expert-tech-bd');
}
add_filter('woocommerce_product_single_add_to_cart_text', 'expert_tech_single_add_to_cart_text', 10, 2);

/**
 * Remove breadcrumbs (we use our own)
 */
remove_action('woocommerce_before_main_content', 'woocommerce_breadcrumb', 20);

/**
 * Shop page title
 */
function expert_tech_shop_page_title($page_title) {
    if (is_search()) {
        return sprintf(__('Search Results: "%s"', 'expert-tech-bd'), get_search_query());
    }
    return $page_title;
}
add_filter('woocommerce_page_title', 'expert_tech_shop_page_title');

/**
 * Empty cart message
 */
function expert_tech_empty_cart_message() {
    ?>
    <div class="cart-empty-message">
        <i class="fas fa-shopping-cart"></i>
        <p class="cart-empty"><?php esc_html_e('Your cart is currently empty.', 'expert-tech-bd'); ?></p>
        <a href="<?php echo esc_url(wc_get_page_permalink('shop')); ?>" class="btn btn-primary">
            <?php esc_html_e('Return to Shop', 'expert-tech-bd'); ?>
        </a>
    </div>
    <?php
}
remove_action('woocommerce_cart_is_empty', 'wc_empty_cart_message', 10);
add_action('woocommerce_cart_is_empty', 'expert_tech_empty_cart_message', 10);

/**
 * Mini Cart
 */
function expert_tech_mini_cart() {
    if (!class_exists('WooCommerce')) {
        return;
    }

    $cart_count = WC()->cart->get_cart_contents_count();
    ?>
    <div class="mini-cart">
        <div class="mini-cart-header">
            <h4><?php esc_html_e('Shopping Cart', 'expert-tech-bd'); ?></h4>
            <span class="item-count"><?php printf(_n('%s item', '%s items', $cart_count, 'expert-tech-bd'), $cart_count); ?></span>
        </div>
        <div class="mini-cart-items">
            <?php woocommerce_mini_cart(); ?>
        </div>
    </div>
    <?php
}

/**
 * Product Category Thumbnail
 */
function expert_tech_category_thumbnail($category) {
    $thumbnail_id = get_term_meta($category->term_id, 'thumbnail_id', true);
    $image = wp_get_attachment_url($thumbnail_id);

    if ($image) {
        echo '<img src="' . esc_url($image) . '" alt="' . esc_attr($category->name) . '" />';
    } else {
        echo '<img src="' . esc_url(wc_placeholder_img_src()) . '" alt="' . esc_attr($category->name) . '" />';
    }
}

/**
 * Product tabs
 */
function expert_tech_product_tabs($tabs) {
    // Rename tabs
    if (isset($tabs['description'])) {
        $tabs['description']['title'] = __('Description', 'expert-tech-bd');
        $tabs['description']['priority'] = 10;
    }

    if (isset($tabs['additional_information'])) {
        $tabs['additional_information']['title'] = __('Specifications', 'expert-tech-bd');
        $tabs['additional_information']['priority'] = 20;
    }

    if (isset($tabs['reviews'])) {
        $tabs['reviews']['title'] = __('Reviews', 'expert-tech-bd');
        $tabs['reviews']['priority'] = 30;
    }

    return $tabs;
}
add_filter('woocommerce_product_tabs', 'expert_tech_product_tabs', 98);

/**
 * Order tracking shortcode
 */
function expert_tech_order_tracking_shortcode() {
    ob_start();
    ?>
    <div class="order-tracking-form">
        <h2><?php esc_html_e('Track Your Order', 'expert-tech-bd'); ?></h2>
        <p><?php esc_html_e('Enter your order ID and billing email to track your order.', 'expert-tech-bd'); ?></p>
        <?php echo do_shortcode('[woocommerce_order_tracking]'); ?>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('expert_order_tracking', 'expert_tech_order_tracking_shortcode');

/**
 * Add Bangladesh-specific payment gateways notice
 */
function expert_tech_bd_payment_notice() {
    ?>
    <div class="bd-payment-notice">
        <p><strong><?php esc_html_e('Bangladesh Payment Options:', 'expert-tech-bd'); ?></strong></p>
        <ul>
            <li><?php esc_html_e('bKash - Send money to 01712-XXXXXX', 'expert-tech-bd'); ?></li>
            <li><?php esc_html_e('Nagad - Send money to 01712-XXXXXX', 'expert-tech-bd'); ?></li>
            <li><?php esc_html_e('Bank Transfer - Contact us for bank details', 'expert-tech-bd'); ?></li>
            <li><?php esc_html_e('Cash on Delivery - Available in Dhaka', 'expert-tech-bd'); ?></li>
        </ul>
    </div>
    <?php
}
// Uncomment to add payment notice on checkout
// add_action('woocommerce_review_order_before_payment', 'expert_tech_bd_payment_notice');

/**
 * BDT Currency Symbol
 */
function expert_tech_bdt_currency_symbol($currency_symbol, $currency) {
    if ($currency === 'BDT') {
        return '৳';
    }
    return $currency_symbol;
}
add_filter('woocommerce_currency_symbol', 'expert_tech_bdt_currency_symbol', 10, 2);

/**
 * Set default country to Bangladesh
 */
function expert_tech_default_checkout_country() {
    return 'BD';
}
add_filter('default_checkout_billing_country', 'expert_tech_default_checkout_country');
add_filter('default_checkout_shipping_country', 'expert_tech_default_checkout_country');

/**
 * Add product SKU to loop
 */
function expert_tech_show_sku_in_loop() {
    global $product;
    if ($product->get_sku()) {
        echo '<div class="product-sku">' . esc_html__('SKU:', 'expert-tech-bd') . ' ' . esc_html($product->get_sku()) . '</div>';
    }
}
// Uncomment to show SKU in product loop
// add_action('woocommerce_after_shop_loop_item_title', 'expert_tech_show_sku_in_loop', 7);

/**
 * Stock status badge
 */
function expert_tech_stock_status_badge() {
    global $product;

    if (!$product->is_in_stock()) {
        echo '<span class="stock-badge out-of-stock">' . esc_html__('Out of Stock', 'expert-tech-bd') . '</span>';
    } elseif ($product->get_stock_quantity() && $product->get_stock_quantity() <= 5) {
        echo '<span class="stock-badge low-stock">' . sprintf(esc_html__('Only %d left', 'expert-tech-bd'), $product->get_stock_quantity()) . '</span>';
    }
}
add_action('woocommerce_before_shop_loop_item_title', 'expert_tech_stock_status_badge', 12);
