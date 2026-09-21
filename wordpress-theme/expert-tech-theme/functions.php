<?php
/**
 * Expert Tech BD Theme Functions
 *
 * @package Expert_Tech_BD
 * @version 1.0.0
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// Theme Constants
define('EXPERT_TECH_VERSION', '1.0.0');
define('EXPERT_TECH_DIR', get_template_directory());
define('EXPERT_TECH_URI', get_template_directory_uri());

/**
 * Theme Setup
 */
function expert_tech_setup() {
    // Make theme available for translation
    load_theme_textdomain('expert-tech-bd', EXPERT_TECH_DIR . '/languages');

    // Add default posts and comments RSS feed links to head
    add_theme_support('automatic-feed-links');

    // Let WordPress manage the document title
    add_theme_support('title-tag');

    // Enable support for Post Thumbnails
    add_theme_support('post-thumbnails');
    add_image_size('product-thumbnail', 400, 400, true);
    add_image_size('product-large', 800, 800, true);
    add_image_size('hero-slide', 1920, 600, true);
    add_image_size('category-icon', 100, 100, true);

    // Register Navigation Menus
    register_nav_menus(array(
        'primary'   => esc_html__('Primary Menu', 'expert-tech-bd'),
        'topbar'    => esc_html__('Top Bar Menu', 'expert-tech-bd'),
        'footer-1'  => esc_html__('Footer Menu 1', 'expert-tech-bd'),
        'footer-2'  => esc_html__('Footer Menu 2', 'expert-tech-bd'),
        'mobile'    => esc_html__('Mobile Menu', 'expert-tech-bd'),
    ));

    // HTML5 Support
    add_theme_support('html5', array(
        'search-form',
        'comment-form',
        'comment-list',
        'gallery',
        'caption',
        'style',
        'script',
    ));

    // Custom Logo
    add_theme_support('custom-logo', array(
        'height'      => 100,
        'width'       => 300,
        'flex-height' => true,
        'flex-width'  => true,
    ));

    // Custom Background
    add_theme_support('custom-background', array(
        'default-color' => 'f6f5f8',
    ));

    // Wide Alignment Support for Gutenberg
    add_theme_support('align-wide');

    // Responsive Embeds
    add_theme_support('responsive-embeds');

    // WooCommerce Support
    add_theme_support('woocommerce');
    add_theme_support('wc-product-gallery-zoom');
    add_theme_support('wc-product-gallery-lightbox');
    add_theme_support('wc-product-gallery-slider');
}
add_action('after_setup_theme', 'expert_tech_setup');

/**
 * Set Content Width
 */
function expert_tech_content_width() {
    $GLOBALS['content_width'] = apply_filters('expert_tech_content_width', 1320);
}
add_action('after_setup_theme', 'expert_tech_content_width', 0);

/**
 * Enqueue Scripts and Styles
 */
function expert_tech_scripts() {
    // Google Fonts
    wp_enqueue_style(
        'expert-tech-fonts',
        'https://fonts.googleapis.com/css2?family=Albert+Sans:wght@300;400;500;600;700&family=Urbanist:wght@400;500;600;700;800&display=swap',
        array(),
        null
    );

    // Font Awesome Icons
    wp_enqueue_style(
        'font-awesome',
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
        array(),
        '6.5.1'
    );

    // Swiper Slider
    wp_enqueue_style(
        'swiper',
        'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css',
        array(),
        '11.0.0'
    );

    // Theme Stylesheet
    wp_enqueue_style(
        'expert-tech-style',
        get_stylesheet_uri(),
        array(),
        EXPERT_TECH_VERSION
    );

    // Additional Custom CSS
    wp_enqueue_style(
        'expert-tech-custom',
        EXPERT_TECH_URI . '/assets/css/custom.css',
        array('expert-tech-style'),
        EXPERT_TECH_VERSION
    );

    // Swiper JS
    wp_enqueue_script(
        'swiper',
        'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js',
        array(),
        '11.0.0',
        true
    );

    // Theme Scripts
    wp_enqueue_script(
        'expert-tech-main',
        EXPERT_TECH_URI . '/assets/js/main.js',
        array('jquery', 'swiper'),
        EXPERT_TECH_VERSION,
        true
    );

    // Localize script for AJAX
    wp_localize_script('expert-tech-main', 'expertTech', array(
        'ajaxUrl'  => admin_url('admin-ajax.php'),
        'nonce'    => wp_create_nonce('expert_tech_nonce'),
        'homeUrl'  => home_url('/'),
        'currency' => function_exists('get_woocommerce_currency_symbol') ? get_woocommerce_currency_symbol() : '৳',
    ));

    // Comment Reply Script
    if (is_singular() && comments_open() && get_option('thread_comments')) {
        wp_enqueue_script('comment-reply');
    }
}
add_action('wp_enqueue_scripts', 'expert_tech_scripts');

/**
 * Register Widget Areas
 */
function expert_tech_widgets_init() {
    // Main Sidebar
    register_sidebar(array(
        'name'          => esc_html__('Main Sidebar', 'expert-tech-bd'),
        'id'            => 'sidebar-main',
        'description'   => esc_html__('Add widgets here for main sidebar.', 'expert-tech-bd'),
        'before_widget' => '<div id="%1$s" class="widget %2$s">',
        'after_widget'  => '</div>',
        'before_title'  => '<h3 class="widget-title">',
        'after_title'   => '</h3>',
    ));

    // Shop Sidebar
    register_sidebar(array(
        'name'          => esc_html__('Shop Sidebar', 'expert-tech-bd'),
        'id'            => 'sidebar-shop',
        'description'   => esc_html__('Add widgets here for shop pages.', 'expert-tech-bd'),
        'before_widget' => '<div id="%1$s" class="widget %2$s">',
        'after_widget'  => '</div>',
        'before_title'  => '<h3 class="widget-title">',
        'after_title'   => '</h3>',
    ));

    // Footer Widgets
    for ($i = 1; $i <= 4; $i++) {
        register_sidebar(array(
            'name'          => sprintf(esc_html__('Footer Widget %d', 'expert-tech-bd'), $i),
            'id'            => 'footer-' . $i,
            'description'   => sprintf(esc_html__('Footer column %d widget area.', 'expert-tech-bd'), $i),
            'before_widget' => '<div id="%1$s" class="widget footer-widget %2$s">',
            'after_widget'  => '</div>',
            'before_title'  => '<h4 class="widget-title">',
            'after_title'   => '</h4>',
        ));
    }
}
add_action('widgets_init', 'expert_tech_widgets_init');

/**
 * Include Required Files
 */
require_once EXPERT_TECH_DIR . '/inc/customizer.php';
require_once EXPERT_TECH_DIR . '/inc/template-functions.php';
require_once EXPERT_TECH_DIR . '/inc/template-tags.php';
require_once EXPERT_TECH_DIR . '/inc/walker-nav-menu.php';

// WooCommerce Integration
if (class_exists('WooCommerce')) {
    require_once EXPERT_TECH_DIR . '/inc/woocommerce.php';
}

/**
 * Custom Walker for Primary Navigation
 */
class Expert_Tech_Walker_Nav_Menu extends Walker_Nav_Menu {
    public function start_el(&$output, $item, $depth = 0, $args = null, $id = 0) {
        $classes = empty($item->classes) ? array() : (array) $item->classes;
        $classes[] = 'menu-item-' . $item->ID;

        if (in_array('menu-item-has-children', $classes)) {
            $classes[] = 'has-dropdown';
        }

        $class_names = join(' ', apply_filters('nav_menu_css_class', array_filter($classes), $item, $args, $depth));
        $class_names = $class_names ? ' class="' . esc_attr($class_names) . '"' : '';

        $output .= '<li' . $class_names . '>';

        $atts = array(
            'title'  => !empty($item->attr_title) ? $item->attr_title : '',
            'target' => !empty($item->target) ? $item->target : '',
            'rel'    => !empty($item->xfn) ? $item->xfn : '',
            'href'   => !empty($item->url) ? $item->url : '',
        );

        $atts = apply_filters('nav_menu_link_attributes', $atts, $item, $args, $depth);

        $attributes = '';
        foreach ($atts as $attr => $value) {
            if (!empty($value)) {
                $value = ('href' === $attr) ? esc_url($value) : esc_attr($value);
                $attributes .= ' ' . $attr . '="' . $value . '"';
            }
        }

        $item_output = $args->before;
        $item_output .= '<a' . $attributes . '>';
        $item_output .= $args->link_before . apply_filters('the_title', $item->title, $item->ID) . $args->link_after;

        // Add dropdown icon
        if (in_array('menu-item-has-children', $classes) && $depth === 0) {
            $item_output .= ' <i class="fas fa-chevron-down"></i>';
        }

        $item_output .= '</a>';
        $item_output .= $args->after;

        $output .= apply_filters('walker_nav_menu_start_el', $item_output, $item, $depth, $args);
    }
}

/**
 * Breadcrumbs
 */
function expert_tech_breadcrumbs() {
    if (is_front_page()) {
        return;
    }

    echo '<nav class="breadcrumbs" aria-label="Breadcrumb">';
    echo '<div class="container">';
    echo '<ol class="breadcrumb-list">';

    // Home
    echo '<li class="breadcrumb-item"><a href="' . esc_url(home_url('/')) . '"><i class="fas fa-home"></i> ' . esc_html__('Home', 'expert-tech-bd') . '</a></li>';

    if (is_category() || is_single()) {
        $categories = get_the_category();
        if (!empty($categories)) {
            echo '<li class="breadcrumb-item"><a href="' . esc_url(get_category_link($categories[0]->term_id)) . '">' . esc_html($categories[0]->name) . '</a></li>';
        }
        if (is_single()) {
            echo '<li class="breadcrumb-item active">' . get_the_title() . '</li>';
        }
    } elseif (is_page()) {
        echo '<li class="breadcrumb-item active">' . get_the_title() . '</li>';
    } elseif (is_search()) {
        echo '<li class="breadcrumb-item active">' . esc_html__('Search Results', 'expert-tech-bd') . '</li>';
    } elseif (is_404()) {
        echo '<li class="breadcrumb-item active">' . esc_html__('404 Not Found', 'expert-tech-bd') . '</li>';
    } elseif (function_exists('is_shop') && is_shop()) {
        echo '<li class="breadcrumb-item active">' . esc_html__('Shop', 'expert-tech-bd') . '</li>';
    } elseif (function_exists('is_product_category') && is_product_category()) {
        $current_term = get_queried_object();
        if ($current_term->parent) {
            $parent_term = get_term($current_term->parent, 'product_cat');
            echo '<li class="breadcrumb-item"><a href="' . esc_url(get_term_link($parent_term)) . '">' . esc_html($parent_term->name) . '</a></li>';
        }
        echo '<li class="breadcrumb-item active">' . esc_html($current_term->name) . '</li>';
    } elseif (function_exists('is_product') && is_product()) {
        $terms = get_the_terms(get_the_ID(), 'product_cat');
        if (!empty($terms) && !is_wp_error($terms)) {
            $term = array_shift($terms);
            echo '<li class="breadcrumb-item"><a href="' . esc_url(get_term_link($term)) . '">' . esc_html($term->name) . '</a></li>';
        }
        echo '<li class="breadcrumb-item active">' . get_the_title() . '</li>';
    }

    echo '</ol>';
    echo '</div>';
    echo '</nav>';
}

/**
 * Custom Excerpt Length
 */
function expert_tech_excerpt_length($length) {
    return 20;
}
add_filter('excerpt_length', 'expert_tech_excerpt_length');

/**
 * Custom Excerpt More
 */
function expert_tech_excerpt_more($more) {
    return '...';
}
add_filter('excerpt_more', 'expert_tech_excerpt_more');

/**
 * Add Category Icons ACF Field (if ACF is installed)
 */
function expert_tech_category_icon_field() {
    if (!function_exists('acf_add_local_field_group')) {
        return;
    }

    acf_add_local_field_group(array(
        'key' => 'group_category_icon',
        'title' => 'Category Settings',
        'fields' => array(
            array(
                'key' => 'field_category_icon',
                'label' => 'Category Icon',
                'name' => 'category_icon',
                'type' => 'image',
                'return_format' => 'url',
            ),
            array(
                'key' => 'field_category_color',
                'label' => 'Category Color',
                'name' => 'category_color',
                'type' => 'color_picker',
                'default_value' => '#04509f',
            ),
        ),
        'location' => array(
            array(
                array(
                    'param' => 'taxonomy',
                    'operator' => '==',
                    'value' => 'product_cat',
                ),
            ),
        ),
    ));
}
add_action('acf/init', 'expert_tech_category_icon_field');

/**
 * AJAX Quick View Handler
 */
function expert_tech_quick_view() {
    check_ajax_referer('expert_tech_nonce', 'nonce');

    $product_id = isset($_POST['product_id']) ? intval($_POST['product_id']) : 0;

    if (!$product_id) {
        wp_send_json_error('Invalid product ID');
    }

    $product = wc_get_product($product_id);

    if (!$product) {
        wp_send_json_error('Product not found');
    }

    ob_start();
    ?>
    <div class="quick-view-content">
        <div class="quick-view-image">
            <?php echo $product->get_image('large'); ?>
        </div>
        <div class="quick-view-info">
            <h2 class="product-title"><?php echo esc_html($product->get_name()); ?></h2>
            <div class="product-price"><?php echo $product->get_price_html(); ?></div>
            <div class="product-description"><?php echo wp_kses_post($product->get_short_description()); ?></div>
            <?php if ($product->is_in_stock()): ?>
                <form class="cart" action="<?php echo esc_url($product->get_permalink()); ?>" method="post">
                    <div class="quantity">
                        <input type="number" class="input-text qty text" name="quantity" value="1" min="1" max="<?php echo esc_attr($product->get_stock_quantity() ?: 9999); ?>">
                    </div>
                    <button type="submit" name="add-to-cart" value="<?php echo esc_attr($product_id); ?>" class="btn btn-primary">
                        <i class="fas fa-shopping-cart"></i> <?php esc_html_e('Add to Cart', 'expert-tech-bd'); ?>
                    </button>
                </form>
            <?php else: ?>
                <p class="out-of-stock"><?php esc_html_e('Out of Stock', 'expert-tech-bd'); ?></p>
            <?php endif; ?>
            <a href="<?php echo esc_url($product->get_permalink()); ?>" class="btn btn-outline">
                <?php esc_html_e('View Full Details', 'expert-tech-bd'); ?>
            </a>
        </div>
    </div>
    <?php
    $html = ob_get_clean();

    wp_send_json_success(array('html' => $html));
}
add_action('wp_ajax_expert_tech_quick_view', 'expert_tech_quick_view');
add_action('wp_ajax_nopriv_expert_tech_quick_view', 'expert_tech_quick_view');

/**
 * AJAX Add to Cart
 */
function expert_tech_ajax_add_to_cart() {
    check_ajax_referer('expert_tech_nonce', 'nonce');

    $product_id = isset($_POST['product_id']) ? intval($_POST['product_id']) : 0;
    $quantity = isset($_POST['quantity']) ? intval($_POST['quantity']) : 1;

    if (!$product_id) {
        wp_send_json_error('Invalid product');
    }

    $cart_item_key = WC()->cart->add_to_cart($product_id, $quantity);

    if ($cart_item_key) {
        wp_send_json_success(array(
            'cart_count' => WC()->cart->get_cart_contents_count(),
            'cart_total' => WC()->cart->get_cart_total(),
            'message'    => esc_html__('Product added to cart!', 'expert-tech-bd'),
        ));
    } else {
        wp_send_json_error(esc_html__('Failed to add product to cart', 'expert-tech-bd'));
    }
}
add_action('wp_ajax_expert_tech_add_to_cart', 'expert_tech_ajax_add_to_cart');
add_action('wp_ajax_nopriv_expert_tech_add_to_cart', 'expert_tech_ajax_add_to_cart');

/**
 * AJAX Live Search
 */
function expert_tech_live_search() {
    check_ajax_referer('expert_tech_nonce', 'nonce');

    $search_term = isset($_POST['search']) ? sanitize_text_field($_POST['search']) : '';

    if (strlen($search_term) < 3) {
        wp_send_json_error('Search term too short');
    }

    $args = array(
        'post_type'      => 'product',
        'post_status'    => 'publish',
        's'              => $search_term,
        'posts_per_page' => 8,
    );

    $query = new WP_Query($args);
    $results = array();

    if ($query->have_posts()) {
        while ($query->have_posts()) {
            $query->the_post();
            $product = wc_get_product(get_the_ID());

            $results[] = array(
                'id'        => get_the_ID(),
                'title'     => get_the_title(),
                'url'       => get_permalink(),
                'image'     => get_the_post_thumbnail_url(get_the_ID(), 'thumbnail'),
                'price'     => $product->get_price_html(),
                'category'  => strip_tags(wc_get_product_category_list(get_the_ID())),
            );
        }
        wp_reset_postdata();
    }

    wp_send_json_success(array('products' => $results));
}
add_action('wp_ajax_expert_tech_live_search', 'expert_tech_live_search');
add_action('wp_ajax_nopriv_expert_tech_live_search', 'expert_tech_live_search');

/**
 * Get Featured Categories
 */
function expert_tech_get_featured_categories($limit = 6) {
    $args = array(
        'taxonomy'   => 'product_cat',
        'orderby'    => 'count',
        'order'      => 'DESC',
        'hide_empty' => true,
        'number'     => $limit,
        'exclude'    => get_option('default_product_cat'),
    );

    return get_terms($args);
}

/**
 * Get Featured Products
 */
function expert_tech_get_featured_products($limit = 8) {
    $args = array(
        'post_type'      => 'product',
        'post_status'    => 'publish',
        'posts_per_page' => $limit,
        'meta_key'       => '_featured',
        'meta_value'     => 'yes',
    );

    // Try featured products first
    $query = new WP_Query($args);

    // If no featured products, get latest
    if (!$query->have_posts()) {
        $args = array(
            'post_type'      => 'product',
            'post_status'    => 'publish',
            'posts_per_page' => $limit,
            'orderby'        => 'date',
            'order'          => 'DESC',
        );
        $query = new WP_Query($args);
    }

    return $query;
}

/**
 * Get On Sale Products
 */
function expert_tech_get_sale_products($limit = 8) {
    $args = array(
        'post_type'      => 'product',
        'post_status'    => 'publish',
        'posts_per_page' => $limit,
        'meta_query'     => array(
            'relation' => 'OR',
            array(
                'key'     => '_sale_price',
                'value'   => 0,
                'compare' => '>',
                'type'    => 'NUMERIC',
            ),
        ),
    );

    return new WP_Query($args);
}

/**
 * Product Card Template
 */
function expert_tech_product_card($product_id = null) {
    $product = $product_id ? wc_get_product($product_id) : wc_get_product(get_the_ID());

    if (!$product) {
        return;
    }

    $is_on_sale = $product->is_on_sale();
    $is_new = (strtotime($product->get_date_created()) > strtotime('-30 days'));
    ?>
    <div class="product-card" data-product-id="<?php echo esc_attr($product->get_id()); ?>">
        <?php if ($is_on_sale || $is_new): ?>
            <div class="product-badge">
                <?php if ($is_on_sale): ?>
                    <?php
                    $regular_price = floatval($product->get_regular_price());
                    $sale_price = floatval($product->get_sale_price());
                    $percentage = $regular_price > 0 ? round((($regular_price - $sale_price) / $regular_price) * 100) : 0;
                    ?>
                    <span class="sale">-<?php echo esc_html($percentage); ?>%</span>
                <?php endif; ?>
                <?php if ($is_new): ?>
                    <span class="new"><?php esc_html_e('New', 'expert-tech-bd'); ?></span>
                <?php endif; ?>
            </div>
        <?php endif; ?>

        <div class="product-image">
            <a href="<?php echo esc_url($product->get_permalink()); ?>">
                <?php echo $product->get_image('product-thumbnail'); ?>
            </a>
        </div>

        <div class="product-actions">
            <button class="quick-view-btn" data-product-id="<?php echo esc_attr($product->get_id()); ?>" title="<?php esc_attr_e('Quick View', 'expert-tech-bd'); ?>">
                <i class="fas fa-eye"></i>
            </button>
            <?php if (function_exists('YITH_WCWL')): ?>
                <?php echo do_shortcode('[yith_wcwl_add_to_wishlist product_id="' . $product->get_id() . '"]'); ?>
            <?php endif; ?>
            <?php if (function_exists('woosc_init')): ?>
                <?php echo do_shortcode('[woosc id="' . $product->get_id() . '"]'); ?>
            <?php endif; ?>
        </div>

        <div class="product-info">
            <div class="product-category">
                <?php echo wc_get_product_category_list($product->get_id()); ?>
            </div>

            <h3 class="product-title">
                <a href="<?php echo esc_url($product->get_permalink()); ?>">
                    <?php echo esc_html($product->get_name()); ?>
                </a>
            </h3>

            <?php if ($product->get_average_rating()): ?>
                <div class="product-rating">
                    <span class="stars">
                        <?php
                        $rating = $product->get_average_rating();
                        for ($i = 1; $i <= 5; $i++) {
                            if ($i <= $rating) {
                                echo '<i class="fas fa-star"></i>';
                            } elseif ($i - 0.5 <= $rating) {
                                echo '<i class="fas fa-star-half-alt"></i>';
                            } else {
                                echo '<i class="far fa-star"></i>';
                            }
                        }
                        ?>
                    </span>
                    <span class="count">(<?php echo esc_html($product->get_review_count()); ?>)</span>
                </div>
            <?php endif; ?>

            <div class="product-price">
                <?php echo $product->get_price_html(); ?>
            </div>

            <?php if ($product->is_in_stock()): ?>
                <button class="btn-add-cart ajax-add-cart" data-product-id="<?php echo esc_attr($product->get_id()); ?>">
                    <i class="fas fa-shopping-cart"></i>
                    <?php esc_html_e('Add to Cart', 'expert-tech-bd'); ?>
                </button>
            <?php else: ?>
                <span class="out-of-stock-badge"><?php esc_html_e('Out of Stock', 'expert-tech-bd'); ?></span>
            <?php endif; ?>
        </div>
    </div>
    <?php
}

/**
 * Category Card Template
 */
function expert_tech_category_card($category) {
    $thumbnail_id = get_term_meta($category->term_id, 'thumbnail_id', true);
    $image = wp_get_attachment_url($thumbnail_id);
    $icon = function_exists('get_field') ? get_field('category_icon', 'product_cat_' . $category->term_id) : '';
    ?>
    <a href="<?php echo esc_url(get_term_link($category)); ?>" class="category-card">
        <div class="icon">
            <?php if ($icon): ?>
                <img src="<?php echo esc_url($icon); ?>" alt="<?php echo esc_attr($category->name); ?>">
            <?php elseif ($image): ?>
                <img src="<?php echo esc_url($image); ?>" alt="<?php echo esc_attr($category->name); ?>">
            <?php else: ?>
                <i class="fas fa-folder"></i>
            <?php endif; ?>
        </div>
        <h3><?php echo esc_html($category->name); ?></h3>
        <span class="count"><?php echo esc_html($category->count); ?> <?php esc_html_e('Products', 'expert-tech-bd'); ?></span>
    </a>
    <?php
}

/**
 * Contact Info Shortcode
 */
function expert_tech_contact_info_shortcode($atts) {
    $atts = shortcode_atts(array(
        'type' => 'phone', // phone, email, address, hours
    ), $atts);

    $options = get_option('expert_tech_options', array());

    switch ($atts['type']) {
        case 'phone':
            return isset($options['phone']) ? esc_html($options['phone']) : '';
        case 'email':
            return isset($options['email']) ? esc_html($options['email']) : '';
        case 'address':
            return isset($options['address']) ? wp_kses_post($options['address']) : '';
        case 'hours':
            return isset($options['hours']) ? esc_html($options['hours']) : '';
        default:
            return '';
    }
}
add_shortcode('contact_info', 'expert_tech_contact_info_shortcode');

/**
 * Social Links Shortcode
 */
function expert_tech_social_links_shortcode($atts) {
    $atts = shortcode_atts(array(
        'class' => '',
    ), $atts);

    $options = get_option('expert_tech_options', array());

    $social_links = array(
        'facebook'  => 'fab fa-facebook-f',
        'twitter'   => 'fab fa-twitter',
        'instagram' => 'fab fa-instagram',
        'linkedin'  => 'fab fa-linkedin-in',
        'youtube'   => 'fab fa-youtube',
        'whatsapp'  => 'fab fa-whatsapp',
    );

    $output = '<div class="social-links ' . esc_attr($atts['class']) . '">';

    foreach ($social_links as $platform => $icon) {
        if (!empty($options[$platform])) {
            $output .= '<a href="' . esc_url($options[$platform]) . '" target="_blank" rel="noopener noreferrer">';
            $output .= '<i class="' . esc_attr($icon) . '"></i>';
            $output .= '</a>';
        }
    }

    $output .= '</div>';

    return $output;
}
add_shortcode('social_links', 'expert_tech_social_links_shortcode');

/**
 * Disable Gutenberg for WooCommerce
 */
function expert_tech_disable_gutenberg_products($use_block_editor, $post) {
    if ($post->post_type === 'product') {
        return false;
    }
    return $use_block_editor;
}
add_filter('use_block_editor_for_post', 'expert_tech_disable_gutenberg_products', 10, 2);

/**
 * Admin Notice for Required Plugins
 */
function expert_tech_admin_notice() {
    if (!class_exists('WooCommerce')) {
        ?>
        <div class="notice notice-warning is-dismissible">
            <p><?php esc_html_e('Expert Tech BD theme requires WooCommerce to be installed and activated for full functionality.', 'expert-tech-bd'); ?></p>
        </div>
        <?php
    }
}
add_action('admin_notices', 'expert_tech_admin_notice');

/**
 * Body Classes
 */
function expert_tech_body_classes($classes) {
    if (is_front_page()) {
        $classes[] = 'front-page';
    }

    if (function_exists('is_shop') && is_shop()) {
        $classes[] = 'shop-page';
    }

    if (function_exists('is_product') && is_product()) {
        $classes[] = 'single-product-page';
    }

    if (is_active_sidebar('sidebar-shop')) {
        $classes[] = 'has-sidebar';
    }

    return $classes;
}
add_filter('body_class', 'expert_tech_body_classes');

/**
 * SVG Upload Support
 */
function expert_tech_mime_types($mimes) {
    $mimes['svg'] = 'image/svg+xml';
    return $mimes;
}
add_filter('upload_mimes', 'expert_tech_mime_types');

/**
 * Preload Critical Assets
 */
function expert_tech_preload_assets() {
    ?>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="dns-prefetch" href="//cdnjs.cloudflare.com">
    <?php
}
add_action('wp_head', 'expert_tech_preload_assets', 1);
