<?php
/**
 * Template Functions
 *
 * @package Expert_Tech_BD
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Display pagination
 */
function expert_tech_pagination($query = null) {
    global $wp_query;

    $query = $query ?: $wp_query;

    if ($query->max_num_pages <= 1) {
        return;
    }

    $paged = get_query_var('paged') ?: 1;
    $max   = intval($query->max_num_pages);

    if ($paged >= 1) {
        $links[] = $paged;
    }

    if ($paged >= 3) {
        $links[] = $paged - 1;
        $links[] = $paged - 2;
    }

    if (($paged + 2) <= $max) {
        $links[] = $paged + 2;
        $links[] = $paged + 1;
    }

    echo '<nav class="pagination">';
    echo '<ul class="pagination-list">';

    if ($paged > 1) {
        printf(
            '<li class="page-item"><a class="page-link prev" href="%s"><i class="fas fa-chevron-left"></i></a></li>',
            get_pagenum_link($paged - 1)
        );
    }

    if (!in_array(1, $links)) {
        $class = 1 == $paged ? ' active' : '';
        printf('<li class="page-item%s"><a class="page-link" href="%s">%s</a></li>', $class, get_pagenum_link(1), '1');

        if (!in_array(2, $links)) {
            echo '<li class="page-item dots"><span>...</span></li>';
        }
    }

    sort($links);
    foreach ($links as $link) {
        $class = $paged == $link ? ' active' : '';
        printf('<li class="page-item%s"><a class="page-link" href="%s">%s</a></li>', $class, get_pagenum_link($link), $link);
    }

    if (!in_array($max, $links)) {
        if (!in_array($max - 1, $links)) {
            echo '<li class="page-item dots"><span>...</span></li>';
        }

        $class = $paged == $max ? ' active' : '';
        printf('<li class="page-item%s"><a class="page-link" href="%s">%s</a></li>', $class, get_pagenum_link($max), $max);
    }

    if ($paged < $max) {
        printf(
            '<li class="page-item"><a class="page-link next" href="%s"><i class="fas fa-chevron-right"></i></a></li>',
            get_pagenum_link($paged + 1)
        );
    }

    echo '</ul>';
    echo '</nav>';
}

/**
 * Format price for Bangladesh
 */
function expert_tech_format_price($price) {
    return '৳ ' . number_format($price, 0, '.', ',');
}

/**
 * Get reading time
 */
function expert_tech_reading_time($post_id = null) {
    $post_id = $post_id ?: get_the_ID();
    $content = get_post_field('post_content', $post_id);
    $word_count = str_word_count(strip_tags($content));
    $reading_time = ceil($word_count / 200);

    return sprintf(
        _n('%d min read', '%d min read', $reading_time, 'expert-tech-bd'),
        $reading_time
    );
}

/**
 * Truncate text
 */
function expert_tech_truncate($string, $length = 100, $append = '...') {
    $string = trim(strip_tags($string));

    if (strlen($string) > $length) {
        $string = substr($string, 0, $length);
        $string = substr($string, 0, strrpos($string, ' '));
        $string .= $append;
    }

    return $string;
}

/**
 * Get social share links
 */
function expert_tech_share_links($post_id = null) {
    $post_id = $post_id ?: get_the_ID();
    $url = get_permalink($post_id);
    $title = get_the_title($post_id);
    $encoded_url = urlencode($url);
    $encoded_title = urlencode($title);

    return array(
        'facebook'  => "https://www.facebook.com/sharer/sharer.php?u={$encoded_url}",
        'twitter'   => "https://twitter.com/intent/tweet?url={$encoded_url}&text={$encoded_title}",
        'linkedin'  => "https://www.linkedin.com/shareArticle?mini=true&url={$encoded_url}&title={$encoded_title}",
        'whatsapp'  => "https://wa.me/?text={$encoded_title}%20{$encoded_url}",
        'pinterest' => "https://pinterest.com/pin/create/button/?url={$encoded_url}&description={$encoded_title}",
        'email'     => "mailto:?subject={$encoded_title}&body={$encoded_url}",
    );
}

/**
 * Check if is WooCommerce page
 */
function expert_tech_is_woocommerce() {
    if (!class_exists('WooCommerce')) {
        return false;
    }

    return is_woocommerce() || is_cart() || is_checkout() || is_account_page();
}

/**
 * Get first category
 */
function expert_tech_get_first_category($post_id = null) {
    $post_id = $post_id ?: get_the_ID();
    $categories = get_the_category($post_id);

    if (!empty($categories)) {
        return $categories[0];
    }

    return null;
}

/**
 * Print inline SVG
 */
function expert_tech_inline_svg($path) {
    $full_path = EXPERT_TECH_DIR . '/assets/images/' . $path;

    if (file_exists($full_path)) {
        return file_get_contents($full_path);
    }

    return '';
}

/**
 * Generate schema markup
 */
function expert_tech_schema_markup() {
    if (is_singular('product') && class_exists('WooCommerce')) {
        global $product;

        if (!$product) {
            return;
        }

        $schema = array(
            '@context'    => 'https://schema.org/',
            '@type'       => 'Product',
            'name'        => $product->get_name(),
            'image'       => wp_get_attachment_url($product->get_image_id()),
            'description' => wp_strip_all_tags($product->get_short_description()),
            'sku'         => $product->get_sku(),
            'brand'       => array(
                '@type' => 'Brand',
                'name'  => get_bloginfo('name'),
            ),
            'offers'      => array(
                '@type'         => 'Offer',
                'url'           => $product->get_permalink(),
                'priceCurrency' => get_woocommerce_currency(),
                'price'         => $product->get_price(),
                'availability'  => $product->is_in_stock() ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            ),
        );

        echo '<script type="application/ld+json">' . wp_json_encode($schema) . '</script>';
    }
}
add_action('wp_head', 'expert_tech_schema_markup');

/**
 * Get contact information
 */
function expert_tech_get_contact_info($field = 'phone') {
    $defaults = array(
        'phone'   => '01312-663333',
        'email'   => 'info@example.com',
        'address' => 'Dhaka, Bangladesh',
    );

    $value = get_theme_mod('expert_tech_' . $field, $defaults[$field] ?? '');

    return $value;
}

/**
 * Render stars rating
 */
function expert_tech_render_stars($rating, $count = 0) {
    $output = '<div class="star-rating">';
    $output .= '<span class="stars">';

    for ($i = 1; $i <= 5; $i++) {
        if ($i <= $rating) {
            $output .= '<i class="fas fa-star"></i>';
        } elseif ($i - 0.5 <= $rating) {
            $output .= '<i class="fas fa-star-half-alt"></i>';
        } else {
            $output .= '<i class="far fa-star"></i>';
        }
    }

    $output .= '</span>';

    if ($count > 0) {
        $output .= '<span class="count">(' . esc_html($count) . ')</span>';
    }

    $output .= '</div>';

    return $output;
}

/**
 * Get post views count (if using a views plugin)
 */
function expert_tech_get_post_views($post_id = null) {
    $post_id = $post_id ?: get_the_ID();
    $count = get_post_meta($post_id, 'post_views_count', true);

    return $count ?: 0;
}

/**
 * Set post views count
 */
function expert_tech_set_post_views($post_id = null) {
    $post_id = $post_id ?: get_the_ID();

    if (!is_singular()) {
        return;
    }

    $count = (int) get_post_meta($post_id, 'post_views_count', true);
    update_post_meta($post_id, 'post_views_count', $count + 1);
}
add_action('wp_head', 'expert_tech_set_post_views');

/**
 * Check if device is mobile
 */
function expert_tech_is_mobile() {
    return wp_is_mobile();
}

/**
 * Add async/defer to scripts
 */
function expert_tech_add_async_defer($tag, $handle) {
    $async_handles = array('expert-tech-main');
    $defer_handles = array('font-awesome');

    if (in_array($handle, $async_handles)) {
        return str_replace(' src', ' async src', $tag);
    }

    if (in_array($handle, $defer_handles)) {
        return str_replace(' src', ' defer src', $tag);
    }

    return $tag;
}
add_filter('script_loader_tag', 'expert_tech_add_async_defer', 10, 2);

/**
 * Format date for Bangladesh
 */
function expert_tech_format_date($date = null) {
    if (!$date) {
        $date = get_the_date('c');
    }

    $timestamp = strtotime($date);
    $format = get_option('date_format');

    return date_i18n($format, $timestamp);
}

/**
 * Get theme option with default
 */
function expert_tech_option($key, $default = '') {
    return get_theme_mod('expert_tech_' . $key, $default);
}

/**
 * Check if sidebar should be displayed
 */
function expert_tech_show_sidebar() {
    if (is_front_page()) {
        return false;
    }

    if (function_exists('is_product') && is_product()) {
        return false;
    }

    if (function_exists('is_cart') && is_cart()) {
        return false;
    }

    if (function_exists('is_checkout') && is_checkout()) {
        return false;
    }

    return true;
}

/**
 * Generate random product order
 */
function expert_tech_random_products($limit = 4, $exclude = array()) {
    $args = array(
        'post_type'      => 'product',
        'post_status'    => 'publish',
        'posts_per_page' => $limit,
        'orderby'        => 'rand',
        'post__not_in'   => $exclude,
    );

    return new WP_Query($args);
}

/**
 * Get product discount percentage
 */
function expert_tech_get_discount_percentage($product) {
    if (!$product->is_on_sale()) {
        return 0;
    }

    $regular_price = floatval($product->get_regular_price());
    $sale_price = floatval($product->get_sale_price());

    if ($regular_price > 0 && !empty($sale_price)) {
        return round((($regular_price - $sale_price) / $regular_price) * 100);
    }

    return 0;
}
