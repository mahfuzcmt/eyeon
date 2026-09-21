<?php
/**
 * Theme Customizer
 *
 * @package Expert_Tech_BD
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Add postMessage support for site title and description
 */
function expert_tech_customize_register($wp_customize) {
    $wp_customize->get_setting('blogname')->transport         = 'postMessage';
    $wp_customize->get_setting('blogdescription')->transport  = 'postMessage';
    $wp_customize->get_setting('header_textcolor')->transport = 'postMessage';

    // Selective Refresh
    if (isset($wp_customize->selective_refresh)) {
        $wp_customize->selective_refresh->add_partial('blogname', array(
            'selector'        => '.site-title a',
            'render_callback' => 'expert_tech_customize_partial_blogname',
        ));
        $wp_customize->selective_refresh->add_partial('blogdescription', array(
            'selector'        => '.site-description',
            'render_callback' => 'expert_tech_customize_partial_blogdescription',
        ));
    }

    // ========================================
    // Contact Information Section
    // ========================================
    $wp_customize->add_section('expert_tech_contact', array(
        'title'    => __('Contact Information', 'expert-tech-bd'),
        'priority' => 30,
    ));

    // Phone
    $wp_customize->add_setting('expert_tech_phone', array(
        'default'           => '01312-663333',
        'sanitize_callback' => 'sanitize_text_field',
        'transport'         => 'postMessage',
    ));

    $wp_customize->add_control('expert_tech_phone', array(
        'label'   => __('Phone Number', 'expert-tech-bd'),
        'section' => 'expert_tech_contact',
        'type'    => 'text',
    ));

    // Email
    $wp_customize->add_setting('expert_tech_email', array(
        'default'           => 'info@example.com',
        'sanitize_callback' => 'sanitize_email',
        'transport'         => 'postMessage',
    ));

    $wp_customize->add_control('expert_tech_email', array(
        'label'   => __('Email Address', 'expert-tech-bd'),
        'section' => 'expert_tech_contact',
        'type'    => 'email',
    ));

    // Address
    $wp_customize->add_setting('expert_tech_address', array(
        'default'           => 'House# 123, Road# 10, Dhanmondi, Dhaka-1205, Bangladesh',
        'sanitize_callback' => 'sanitize_textarea_field',
        'transport'         => 'postMessage',
    ));

    $wp_customize->add_control('expert_tech_address', array(
        'label'   => __('Address', 'expert-tech-bd'),
        'section' => 'expert_tech_contact',
        'type'    => 'textarea',
    ));

    // WhatsApp Number
    $wp_customize->add_setting('expert_tech_whatsapp', array(
        'default'           => '',
        'sanitize_callback' => 'esc_url_raw',
    ));

    $wp_customize->add_control('expert_tech_whatsapp', array(
        'label'       => __('WhatsApp Link', 'expert-tech-bd'),
        'description' => __('Format: https://wa.me/8801xxxxxxxxx', 'expert-tech-bd'),
        'section'     => 'expert_tech_contact',
        'type'        => 'url',
    ));

    // ========================================
    // Social Media Section
    // ========================================
    $wp_customize->add_section('expert_tech_social', array(
        'title'    => __('Social Media Links', 'expert-tech-bd'),
        'priority' => 35,
    ));

    $social_networks = array(
        'facebook'  => 'Facebook',
        'twitter'   => 'Twitter',
        'instagram' => 'Instagram',
        'linkedin'  => 'LinkedIn',
        'youtube'   => 'YouTube',
    );

    foreach ($social_networks as $network => $label) {
        $wp_customize->add_setting('expert_tech_' . $network, array(
            'default'           => '',
            'sanitize_callback' => 'esc_url_raw',
        ));

        $wp_customize->add_control('expert_tech_' . $network, array(
            'label'   => $label,
            'section' => 'expert_tech_social',
            'type'    => 'url',
        ));
    }

    // ========================================
    // Theme Colors Section
    // ========================================
    $wp_customize->add_section('expert_tech_colors', array(
        'title'    => __('Theme Colors', 'expert-tech-bd'),
        'priority' => 40,
    ));

    // Primary Color
    $wp_customize->add_setting('expert_tech_primary_color', array(
        'default'           => '#04509f',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));

    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'expert_tech_primary_color', array(
        'label'   => __('Primary Color', 'expert-tech-bd'),
        'section' => 'expert_tech_colors',
    )));

    // Secondary Color
    $wp_customize->add_setting('expert_tech_secondary_color', array(
        'default'           => '#29b2e8',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));

    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'expert_tech_secondary_color', array(
        'label'   => __('Secondary Color', 'expert-tech-bd'),
        'section' => 'expert_tech_colors',
    )));

    // Accent Color
    $wp_customize->add_setting('expert_tech_accent_color', array(
        'default'           => '#ff6b35',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));

    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'expert_tech_accent_color', array(
        'label'   => __('Accent Color', 'expert-tech-bd'),
        'section' => 'expert_tech_colors',
    )));

    // ========================================
    // Header Settings
    // ========================================
    $wp_customize->add_section('expert_tech_header', array(
        'title'    => __('Header Settings', 'expert-tech-bd'),
        'priority' => 45,
    ));

    // Sticky Header
    $wp_customize->add_setting('expert_tech_sticky_header', array(
        'default'           => true,
        'sanitize_callback' => 'expert_tech_sanitize_checkbox',
    ));

    $wp_customize->add_control('expert_tech_sticky_header', array(
        'label'   => __('Enable Sticky Header', 'expert-tech-bd'),
        'section' => 'expert_tech_header',
        'type'    => 'checkbox',
    ));

    // Show Top Bar
    $wp_customize->add_setting('expert_tech_show_topbar', array(
        'default'           => true,
        'sanitize_callback' => 'expert_tech_sanitize_checkbox',
    ));

    $wp_customize->add_control('expert_tech_show_topbar', array(
        'label'   => __('Show Top Bar', 'expert-tech-bd'),
        'section' => 'expert_tech_header',
        'type'    => 'checkbox',
    ));

    // ========================================
    // Footer Settings
    // ========================================
    $wp_customize->add_section('expert_tech_footer', array(
        'title'    => __('Footer Settings', 'expert-tech-bd'),
        'priority' => 50,
    ));

    // Footer About Text
    $wp_customize->add_setting('expert_tech_footer_about', array(
        'default'           => 'We are a leading provider of security and technology solutions in Bangladesh. BTRC authorized vendor with expert engineers and exceptional after-sales service.',
        'sanitize_callback' => 'sanitize_textarea_field',
    ));

    $wp_customize->add_control('expert_tech_footer_about', array(
        'label'   => __('Footer About Text', 'expert-tech-bd'),
        'section' => 'expert_tech_footer',
        'type'    => 'textarea',
    ));

    // Copyright Text
    $wp_customize->add_setting('expert_tech_copyright', array(
        'default'           => '',
        'sanitize_callback' => 'sanitize_text_field',
    ));

    $wp_customize->add_control('expert_tech_copyright', array(
        'label'       => __('Copyright Text', 'expert-tech-bd'),
        'description' => __('Leave empty to use default', 'expert-tech-bd'),
        'section'     => 'expert_tech_footer',
        'type'        => 'text',
    ));

    // Developer Name
    $wp_customize->add_setting('expert_tech_developer_name', array(
        'default'           => 'Web Innovation',
        'sanitize_callback' => 'sanitize_text_field',
    ));

    $wp_customize->add_control('expert_tech_developer_name', array(
        'label'   => __('Developer Name', 'expert-tech-bd'),
        'section' => 'expert_tech_footer',
        'type'    => 'text',
    ));

    // Developer URL
    $wp_customize->add_setting('expert_tech_developer_url', array(
        'default'           => '#',
        'sanitize_callback' => 'esc_url_raw',
    ));

    $wp_customize->add_control('expert_tech_developer_url', array(
        'label'   => __('Developer URL', 'expert-tech-bd'),
        'section' => 'expert_tech_footer',
        'type'    => 'url',
    ));

    // ========================================
    // Shop Settings (WooCommerce)
    // ========================================
    if (class_exists('WooCommerce')) {
        $wp_customize->add_section('expert_tech_shop', array(
            'title'    => __('Shop Settings', 'expert-tech-bd'),
            'priority' => 55,
        ));

        // Products Per Page
        $wp_customize->add_setting('expert_tech_products_per_page', array(
            'default'           => 12,
            'sanitize_callback' => 'absint',
        ));

        $wp_customize->add_control('expert_tech_products_per_page', array(
            'label'   => __('Products Per Page', 'expert-tech-bd'),
            'section' => 'expert_tech_shop',
            'type'    => 'number',
            'input_attrs' => array(
                'min' => 4,
                'max' => 48,
            ),
        ));

        // Products Per Row
        $wp_customize->add_setting('expert_tech_products_per_row', array(
            'default'           => 4,
            'sanitize_callback' => 'absint',
        ));

        $wp_customize->add_control('expert_tech_products_per_row', array(
            'label'   => __('Products Per Row', 'expert-tech-bd'),
            'section' => 'expert_tech_shop',
            'type'    => 'select',
            'choices' => array(
                3 => '3',
                4 => '4',
                5 => '5',
            ),
        ));

        // Show Shop Sidebar
        $wp_customize->add_setting('expert_tech_shop_sidebar', array(
            'default'           => true,
            'sanitize_callback' => 'expert_tech_sanitize_checkbox',
        ));

        $wp_customize->add_control('expert_tech_shop_sidebar', array(
            'label'   => __('Show Shop Sidebar', 'expert-tech-bd'),
            'section' => 'expert_tech_shop',
            'type'    => 'checkbox',
        ));
    }
}
add_action('customize_register', 'expert_tech_customize_register');

/**
 * Render the site title for the selective refresh partial
 */
function expert_tech_customize_partial_blogname() {
    bloginfo('name');
}

/**
 * Render the site tagline for the selective refresh partial
 */
function expert_tech_customize_partial_blogdescription() {
    bloginfo('description');
}

/**
 * Sanitize checkbox
 */
function expert_tech_sanitize_checkbox($checked) {
    return ((isset($checked) && true == $checked) ? true : false);
}

/**
 * Binds JS handlers to make Theme Customizer preview reload changes asynchronously
 */
function expert_tech_customize_preview_js() {
    wp_enqueue_script(
        'expert-tech-customizer',
        EXPERT_TECH_URI . '/assets/js/customizer.js',
        array('customize-preview'),
        EXPERT_TECH_VERSION,
        true
    );
}
add_action('customize_preview_init', 'expert_tech_customize_preview_js');

/**
 * Output custom CSS from customizer settings
 */
function expert_tech_customizer_css() {
    $primary_color   = get_theme_mod('expert_tech_primary_color', '#04509f');
    $secondary_color = get_theme_mod('expert_tech_secondary_color', '#29b2e8');
    $accent_color    = get_theme_mod('expert_tech_accent_color', '#ff6b35');

    ?>
    <style type="text/css">
        :root {
            --primary-color: <?php echo esc_attr($primary_color); ?>;
            --secondary-color: <?php echo esc_attr($secondary_color); ?>;
            --accent-color: <?php echo esc_attr($accent_color); ?>;
        }
    </style>
    <?php
}
add_action('wp_head', 'expert_tech_customizer_css');
