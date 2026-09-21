<?php
/**
 * Plugin Name: Expert Tech BD Features
 * Plugin URI: https://yourwebsite.com/
 * Description: Essential features plugin for Expert Tech BD theme - includes custom post types, widgets, shortcodes, and WooCommerce enhancements.
 * Version: 1.0.0
 * Author: Web Innovation
 * Author URI: https://yourwebsite.com/
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: expert-tech-plugin
 * Domain Path: /languages
 * Requires at least: 6.0
 * Requires PHP: 8.0
 */

if (!defined('ABSPATH')) {
    exit;
}

// Plugin Constants
define('ETP_VERSION', '1.0.0');
define('ETP_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('ETP_PLUGIN_URL', plugin_dir_url(__FILE__));
define('ETP_PLUGIN_FILE', __FILE__);

/**
 * Main Plugin Class
 */
final class Expert_Tech_Plugin {

    /**
     * Instance
     */
    private static $instance = null;

    /**
     * Get instance
     */
    public static function instance() {
        if (is_null(self::$instance)) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor
     */
    private function __construct() {
        $this->init_hooks();
    }

    /**
     * Initialize hooks
     */
    private function init_hooks() {
        add_action('init', array($this, 'load_textdomain'));
        add_action('init', array($this, 'register_post_types'));
        add_action('init', array($this, 'register_taxonomies'));
        add_action('widgets_init', array($this, 'register_widgets'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));

        // Shortcodes
        add_shortcode('expert_products', array($this, 'products_shortcode'));
        add_shortcode('expert_categories', array($this, 'categories_shortcode'));
        add_shortcode('expert_brands', array($this, 'brands_shortcode'));
        add_shortcode('expert_contact', array($this, 'contact_shortcode'));
        add_shortcode('expert_faq', array($this, 'faq_shortcode'));
        add_shortcode('expert_testimonials', array($this, 'testimonials_shortcode'));
        add_shortcode('expert_team', array($this, 'team_shortcode'));

        // WooCommerce hooks
        if (class_exists('WooCommerce')) {
            add_action('woocommerce_product_options_general_product_data', array($this, 'add_product_fields'));
            add_action('woocommerce_process_product_meta', array($this, 'save_product_fields'));
        }

        // Activation/Deactivation
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }

    /**
     * Load textdomain
     */
    public function load_textdomain() {
        load_plugin_textdomain('expert-tech-plugin', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }

    /**
     * Register Custom Post Types
     */
    public function register_post_types() {
        // Testimonials
        register_post_type('testimonial', array(
            'labels' => array(
                'name'               => __('Testimonials', 'expert-tech-plugin'),
                'singular_name'      => __('Testimonial', 'expert-tech-plugin'),
                'add_new'            => __('Add New', 'expert-tech-plugin'),
                'add_new_item'       => __('Add New Testimonial', 'expert-tech-plugin'),
                'edit_item'          => __('Edit Testimonial', 'expert-tech-plugin'),
                'new_item'           => __('New Testimonial', 'expert-tech-plugin'),
                'view_item'          => __('View Testimonial', 'expert-tech-plugin'),
                'search_items'       => __('Search Testimonials', 'expert-tech-plugin'),
                'not_found'          => __('No testimonials found', 'expert-tech-plugin'),
                'not_found_in_trash' => __('No testimonials found in trash', 'expert-tech-plugin'),
            ),
            'public'             => false,
            'show_ui'            => true,
            'show_in_menu'       => true,
            'menu_icon'          => 'dashicons-format-quote',
            'supports'           => array('title', 'editor', 'thumbnail'),
            'has_archive'        => false,
        ));

        // Team Members
        register_post_type('team', array(
            'labels' => array(
                'name'               => __('Team Members', 'expert-tech-plugin'),
                'singular_name'      => __('Team Member', 'expert-tech-plugin'),
                'add_new'            => __('Add New', 'expert-tech-plugin'),
                'add_new_item'       => __('Add New Team Member', 'expert-tech-plugin'),
                'edit_item'          => __('Edit Team Member', 'expert-tech-plugin'),
                'new_item'           => __('New Team Member', 'expert-tech-plugin'),
                'view_item'          => __('View Team Member', 'expert-tech-plugin'),
                'search_items'       => __('Search Team Members', 'expert-tech-plugin'),
                'not_found'          => __('No team members found', 'expert-tech-plugin'),
                'not_found_in_trash' => __('No team members found in trash', 'expert-tech-plugin'),
            ),
            'public'             => false,
            'show_ui'            => true,
            'show_in_menu'       => true,
            'menu_icon'          => 'dashicons-groups',
            'supports'           => array('title', 'editor', 'thumbnail'),
            'has_archive'        => false,
        ));

        // FAQs
        register_post_type('faq', array(
            'labels' => array(
                'name'               => __('FAQs', 'expert-tech-plugin'),
                'singular_name'      => __('FAQ', 'expert-tech-plugin'),
                'add_new'            => __('Add New', 'expert-tech-plugin'),
                'add_new_item'       => __('Add New FAQ', 'expert-tech-plugin'),
                'edit_item'          => __('Edit FAQ', 'expert-tech-plugin'),
                'new_item'           => __('New FAQ', 'expert-tech-plugin'),
                'view_item'          => __('View FAQ', 'expert-tech-plugin'),
                'search_items'       => __('Search FAQs', 'expert-tech-plugin'),
                'not_found'          => __('No FAQs found', 'expert-tech-plugin'),
                'not_found_in_trash' => __('No FAQs found in trash', 'expert-tech-plugin'),
            ),
            'public'             => false,
            'show_ui'            => true,
            'show_in_menu'       => true,
            'menu_icon'          => 'dashicons-editor-help',
            'supports'           => array('title', 'editor'),
            'has_archive'        => false,
        ));

        // Brands
        register_post_type('brand', array(
            'labels' => array(
                'name'               => __('Brands', 'expert-tech-plugin'),
                'singular_name'      => __('Brand', 'expert-tech-plugin'),
                'add_new'            => __('Add New', 'expert-tech-plugin'),
                'add_new_item'       => __('Add New Brand', 'expert-tech-plugin'),
                'edit_item'          => __('Edit Brand', 'expert-tech-plugin'),
                'new_item'           => __('New Brand', 'expert-tech-plugin'),
                'view_item'          => __('View Brand', 'expert-tech-plugin'),
                'search_items'       => __('Search Brands', 'expert-tech-plugin'),
                'not_found'          => __('No brands found', 'expert-tech-plugin'),
                'not_found_in_trash' => __('No brands found in trash', 'expert-tech-plugin'),
            ),
            'public'             => true,
            'show_ui'            => true,
            'show_in_menu'       => true,
            'menu_icon'          => 'dashicons-tag',
            'supports'           => array('title', 'thumbnail'),
            'has_archive'        => true,
            'rewrite'            => array('slug' => 'brand'),
        ));

        // Slider (Hero)
        register_post_type('slider', array(
            'labels' => array(
                'name'               => __('Sliders', 'expert-tech-plugin'),
                'singular_name'      => __('Slider', 'expert-tech-plugin'),
                'add_new'            => __('Add New', 'expert-tech-plugin'),
                'add_new_item'       => __('Add New Slider', 'expert-tech-plugin'),
                'edit_item'          => __('Edit Slider', 'expert-tech-plugin'),
                'new_item'           => __('New Slider', 'expert-tech-plugin'),
                'view_item'          => __('View Slider', 'expert-tech-plugin'),
                'search_items'       => __('Search Sliders', 'expert-tech-plugin'),
            ),
            'public'             => false,
            'show_ui'            => true,
            'show_in_menu'       => true,
            'menu_icon'          => 'dashicons-images-alt2',
            'supports'           => array('title', 'thumbnail'),
            'has_archive'        => false,
        ));
    }

    /**
     * Register Taxonomies
     */
    public function register_taxonomies() {
        // FAQ Category
        register_taxonomy('faq_category', 'faq', array(
            'labels' => array(
                'name'              => __('FAQ Categories', 'expert-tech-plugin'),
                'singular_name'     => __('FAQ Category', 'expert-tech-plugin'),
                'search_items'      => __('Search Categories', 'expert-tech-plugin'),
                'all_items'         => __('All Categories', 'expert-tech-plugin'),
                'edit_item'         => __('Edit Category', 'expert-tech-plugin'),
                'update_item'       => __('Update Category', 'expert-tech-plugin'),
                'add_new_item'      => __('Add New Category', 'expert-tech-plugin'),
                'new_item_name'     => __('New Category Name', 'expert-tech-plugin'),
            ),
            'hierarchical'      => true,
            'show_ui'           => true,
            'show_admin_column' => true,
            'query_var'         => true,
            'rewrite'           => array('slug' => 'faq-category'),
        ));

        // Team Department
        register_taxonomy('department', 'team', array(
            'labels' => array(
                'name'              => __('Departments', 'expert-tech-plugin'),
                'singular_name'     => __('Department', 'expert-tech-plugin'),
            ),
            'hierarchical'      => true,
            'show_ui'           => true,
            'show_admin_column' => true,
            'query_var'         => true,
            'rewrite'           => array('slug' => 'department'),
        ));
    }

    /**
     * Register Widgets
     */
    public function register_widgets() {
        register_widget('Expert_Tech_Products_Widget');
        register_widget('Expert_Tech_Contact_Widget');
        register_widget('Expert_Tech_Social_Widget');
        register_widget('Expert_Tech_Opening_Hours_Widget');
    }

    /**
     * Add Admin Menu
     */
    public function add_admin_menu() {
        add_menu_page(
            __('Expert Tech Settings', 'expert-tech-plugin'),
            __('Expert Tech', 'expert-tech-plugin'),
            'manage_options',
            'expert-tech-settings',
            array($this, 'settings_page'),
            'dashicons-admin-generic',
            80
        );
    }

    /**
     * Register Settings
     */
    public function register_settings() {
        register_setting('expert_tech_options', 'expert_tech_options', array(
            'sanitize_callback' => array($this, 'sanitize_options'),
        ));

        // General Section
        add_settings_section(
            'expert_tech_general',
            __('General Settings', 'expert-tech-plugin'),
            null,
            'expert-tech-settings'
        );

        // Phone
        add_settings_field(
            'phone',
            __('Phone Number', 'expert-tech-plugin'),
            array($this, 'text_field_callback'),
            'expert-tech-settings',
            'expert_tech_general',
            array('field' => 'phone')
        );

        // Email
        add_settings_field(
            'email',
            __('Email Address', 'expert-tech-plugin'),
            array($this, 'text_field_callback'),
            'expert-tech-settings',
            'expert_tech_general',
            array('field' => 'email')
        );

        // Address
        add_settings_field(
            'address',
            __('Address', 'expert-tech-plugin'),
            array($this, 'textarea_field_callback'),
            'expert-tech-settings',
            'expert_tech_general',
            array('field' => 'address')
        );

        // Social Section
        add_settings_section(
            'expert_tech_social',
            __('Social Media Links', 'expert-tech-plugin'),
            null,
            'expert-tech-settings'
        );

        $social_networks = array('facebook', 'twitter', 'instagram', 'linkedin', 'youtube', 'whatsapp');
        foreach ($social_networks as $network) {
            add_settings_field(
                $network,
                ucfirst($network),
                array($this, 'url_field_callback'),
                'expert-tech-settings',
                'expert_tech_social',
                array('field' => $network)
            );
        }
    }

    /**
     * Text field callback
     */
    public function text_field_callback($args) {
        $options = get_option('expert_tech_options', array());
        $value = isset($options[$args['field']]) ? $options[$args['field']] : '';
        ?>
        <input type="text" name="expert_tech_options[<?php echo esc_attr($args['field']); ?>]"
               value="<?php echo esc_attr($value); ?>" class="regular-text">
        <?php
    }

    /**
     * Textarea field callback
     */
    public function textarea_field_callback($args) {
        $options = get_option('expert_tech_options', array());
        $value = isset($options[$args['field']]) ? $options[$args['field']] : '';
        ?>
        <textarea name="expert_tech_options[<?php echo esc_attr($args['field']); ?>]"
                  class="large-text" rows="3"><?php echo esc_textarea($value); ?></textarea>
        <?php
    }

    /**
     * URL field callback
     */
    public function url_field_callback($args) {
        $options = get_option('expert_tech_options', array());
        $value = isset($options[$args['field']]) ? $options[$args['field']] : '';
        ?>
        <input type="url" name="expert_tech_options[<?php echo esc_attr($args['field']); ?>]"
               value="<?php echo esc_url($value); ?>" class="regular-text">
        <?php
    }

    /**
     * Sanitize options
     */
    public function sanitize_options($input) {
        $sanitized = array();

        if (isset($input['phone'])) {
            $sanitized['phone'] = sanitize_text_field($input['phone']);
        }
        if (isset($input['email'])) {
            $sanitized['email'] = sanitize_email($input['email']);
        }
        if (isset($input['address'])) {
            $sanitized['address'] = sanitize_textarea_field($input['address']);
        }

        $social_networks = array('facebook', 'twitter', 'instagram', 'linkedin', 'youtube', 'whatsapp');
        foreach ($social_networks as $network) {
            if (isset($input[$network])) {
                $sanitized[$network] = esc_url_raw($input[$network]);
            }
        }

        return $sanitized;
    }

    /**
     * Settings Page
     */
    public function settings_page() {
        ?>
        <div class="wrap">
            <h1><?php esc_html_e('Expert Tech Settings', 'expert-tech-plugin'); ?></h1>
            <form method="post" action="options.php">
                <?php
                settings_fields('expert_tech_options');
                do_settings_sections('expert-tech-settings');
                submit_button();
                ?>
            </form>
        </div>
        <?php
    }

    /**
     * Products Shortcode
     */
    public function products_shortcode($atts) {
        if (!class_exists('WooCommerce')) {
            return '';
        }

        $atts = shortcode_atts(array(
            'limit'    => 8,
            'columns'  => 4,
            'category' => '',
            'orderby'  => 'date',
            'order'    => 'DESC',
            'featured' => false,
            'on_sale'  => false,
        ), $atts);

        $args = array(
            'post_type'      => 'product',
            'post_status'    => 'publish',
            'posts_per_page' => intval($atts['limit']),
            'orderby'        => $atts['orderby'],
            'order'          => $atts['order'],
        );

        if (!empty($atts['category'])) {
            $args['tax_query'] = array(
                array(
                    'taxonomy' => 'product_cat',
                    'field'    => 'slug',
                    'terms'    => explode(',', $atts['category']),
                ),
            );
        }

        if ($atts['featured']) {
            $args['meta_key'] = '_featured';
            $args['meta_value'] = 'yes';
        }

        $query = new WP_Query($args);

        ob_start();
        ?>
        <div class="expert-products-grid columns-<?php echo esc_attr($atts['columns']); ?>">
            <?php
            if ($query->have_posts()) {
                while ($query->have_posts()) {
                    $query->the_post();
                    wc_get_template_part('content', 'product');
                }
                wp_reset_postdata();
            }
            ?>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Categories Shortcode
     */
    public function categories_shortcode($atts) {
        if (!class_exists('WooCommerce')) {
            return '';
        }

        $atts = shortcode_atts(array(
            'limit'   => 6,
            'columns' => 6,
            'parent'  => 0,
        ), $atts);

        $categories = get_terms(array(
            'taxonomy'   => 'product_cat',
            'hide_empty' => true,
            'parent'     => intval($atts['parent']),
            'number'     => intval($atts['limit']),
            'exclude'    => get_option('default_product_cat'),
        ));

        ob_start();
        ?>
        <div class="expert-categories-grid columns-<?php echo esc_attr($atts['columns']); ?>">
            <?php
            foreach ($categories as $category) {
                $thumbnail_id = get_term_meta($category->term_id, 'thumbnail_id', true);
                $image = wp_get_attachment_url($thumbnail_id);
                ?>
                <a href="<?php echo esc_url(get_term_link($category)); ?>" class="category-card">
                    <div class="category-image">
                        <?php if ($image): ?>
                            <img src="<?php echo esc_url($image); ?>" alt="<?php echo esc_attr($category->name); ?>">
                        <?php else: ?>
                            <img src="<?php echo esc_url(wc_placeholder_img_src()); ?>" alt="<?php echo esc_attr($category->name); ?>">
                        <?php endif; ?>
                    </div>
                    <h3><?php echo esc_html($category->name); ?></h3>
                    <span class="count"><?php echo esc_html($category->count); ?> <?php esc_html_e('Products', 'expert-tech-plugin'); ?></span>
                </a>
                <?php
            }
            ?>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Brands Shortcode
     */
    public function brands_shortcode($atts) {
        $atts = shortcode_atts(array(
            'limit' => -1,
        ), $atts);

        $brands = get_posts(array(
            'post_type'      => 'brand',
            'posts_per_page' => intval($atts['limit']),
            'post_status'    => 'publish',
        ));

        ob_start();
        ?>
        <div class="expert-brands-grid">
            <?php foreach ($brands as $brand): ?>
                <div class="brand-item">
                    <?php if (has_post_thumbnail($brand->ID)): ?>
                        <?php echo get_the_post_thumbnail($brand->ID, 'thumbnail'); ?>
                    <?php endif; ?>
                </div>
            <?php endforeach; ?>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Contact Shortcode
     */
    public function contact_shortcode($atts) {
        $options = get_option('expert_tech_options', array());

        ob_start();
        ?>
        <div class="expert-contact-info">
            <?php if (!empty($options['phone'])): ?>
                <div class="contact-item">
                    <i class="fas fa-phone-alt"></i>
                    <span><?php echo esc_html($options['phone']); ?></span>
                </div>
            <?php endif; ?>
            <?php if (!empty($options['email'])): ?>
                <div class="contact-item">
                    <i class="fas fa-envelope"></i>
                    <a href="mailto:<?php echo esc_attr($options['email']); ?>">
                        <?php echo esc_html($options['email']); ?>
                    </a>
                </div>
            <?php endif; ?>
            <?php if (!empty($options['address'])): ?>
                <div class="contact-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span><?php echo wp_kses_post($options['address']); ?></span>
                </div>
            <?php endif; ?>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * FAQ Shortcode
     */
    public function faq_shortcode($atts) {
        $atts = shortcode_atts(array(
            'category' => '',
            'limit'    => -1,
        ), $atts);

        $args = array(
            'post_type'      => 'faq',
            'posts_per_page' => intval($atts['limit']),
            'post_status'    => 'publish',
        );

        if (!empty($atts['category'])) {
            $args['tax_query'] = array(
                array(
                    'taxonomy' => 'faq_category',
                    'field'    => 'slug',
                    'terms'    => $atts['category'],
                ),
            );
        }

        $faqs = get_posts($args);

        ob_start();
        ?>
        <div class="expert-faq-accordion">
            <?php foreach ($faqs as $index => $faq): ?>
                <div class="faq-item">
                    <button class="faq-question" data-index="<?php echo esc_attr($index); ?>">
                        <?php echo esc_html($faq->post_title); ?>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="faq-answer">
                        <?php echo wp_kses_post(apply_filters('the_content', $faq->post_content)); ?>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Testimonials Shortcode
     */
    public function testimonials_shortcode($atts) {
        $atts = shortcode_atts(array(
            'limit'   => 4,
            'columns' => 2,
        ), $atts);

        $testimonials = get_posts(array(
            'post_type'      => 'testimonial',
            'posts_per_page' => intval($atts['limit']),
            'post_status'    => 'publish',
        ));

        ob_start();
        ?>
        <div class="expert-testimonials-grid columns-<?php echo esc_attr($atts['columns']); ?>">
            <?php foreach ($testimonials as $testimonial): ?>
                <div class="testimonial-card">
                    <?php if (has_post_thumbnail($testimonial->ID)): ?>
                        <div class="testimonial-avatar">
                            <?php echo get_the_post_thumbnail($testimonial->ID, 'thumbnail'); ?>
                        </div>
                    <?php endif; ?>
                    <div class="testimonial-content">
                        <p>"<?php echo wp_kses_post($testimonial->post_content); ?>"</p>
                    </div>
                    <div class="testimonial-author">
                        <strong><?php echo esc_html($testimonial->post_title); ?></strong>
                        <?php
                        $position = get_post_meta($testimonial->ID, '_testimonial_position', true);
                        if ($position):
                        ?>
                            <span><?php echo esc_html($position); ?></span>
                        <?php endif; ?>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Team Shortcode
     */
    public function team_shortcode($atts) {
        $atts = shortcode_atts(array(
            'limit'      => 4,
            'columns'    => 4,
            'department' => '',
        ), $atts);

        $args = array(
            'post_type'      => 'team',
            'posts_per_page' => intval($atts['limit']),
            'post_status'    => 'publish',
        );

        if (!empty($atts['department'])) {
            $args['tax_query'] = array(
                array(
                    'taxonomy' => 'department',
                    'field'    => 'slug',
                    'terms'    => $atts['department'],
                ),
            );
        }

        $team = get_posts($args);

        ob_start();
        ?>
        <div class="expert-team-grid columns-<?php echo esc_attr($atts['columns']); ?>">
            <?php foreach ($team as $member): ?>
                <div class="team-card">
                    <?php if (has_post_thumbnail($member->ID)): ?>
                        <div class="team-image">
                            <?php echo get_the_post_thumbnail($member->ID, 'medium'); ?>
                        </div>
                    <?php endif; ?>
                    <div class="team-info">
                        <h4><?php echo esc_html($member->post_title); ?></h4>
                        <?php
                        $position = get_post_meta($member->ID, '_team_position', true);
                        if ($position):
                        ?>
                            <span class="position"><?php echo esc_html($position); ?></span>
                        <?php endif; ?>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Add custom product fields
     */
    public function add_product_fields() {
        woocommerce_wp_text_input(array(
            'id'          => '_warranty_period',
            'label'       => __('Warranty Period', 'expert-tech-plugin'),
            'placeholder' => __('e.g., 1 Year', 'expert-tech-plugin'),
            'desc_tip'    => true,
            'description' => __('Enter the warranty period for this product.', 'expert-tech-plugin'),
        ));

        woocommerce_wp_text_input(array(
            'id'          => '_model_number',
            'label'       => __('Model Number', 'expert-tech-plugin'),
            'placeholder' => __('e.g., GT06-N', 'expert-tech-plugin'),
        ));

        woocommerce_wp_checkbox(array(
            'id'          => '_btrc_approved',
            'label'       => __('BTRC Approved', 'expert-tech-plugin'),
            'description' => __('Check if this product is BTRC approved.', 'expert-tech-plugin'),
        ));
    }

    /**
     * Save custom product fields
     */
    public function save_product_fields($post_id) {
        if (isset($_POST['_warranty_period'])) {
            update_post_meta($post_id, '_warranty_period', sanitize_text_field($_POST['_warranty_period']));
        }
        if (isset($_POST['_model_number'])) {
            update_post_meta($post_id, '_model_number', sanitize_text_field($_POST['_model_number']));
        }
        $btrc = isset($_POST['_btrc_approved']) ? 'yes' : 'no';
        update_post_meta($post_id, '_btrc_approved', $btrc);
    }

    /**
     * Plugin Activation
     */
    public function activate() {
        $this->register_post_types();
        $this->register_taxonomies();
        flush_rewrite_rules();
    }

    /**
     * Plugin Deactivation
     */
    public function deactivate() {
        flush_rewrite_rules();
    }
}

/**
 * Products Widget
 */
class Expert_Tech_Products_Widget extends WP_Widget {

    public function __construct() {
        parent::__construct(
            'expert_tech_products',
            __('Expert Tech - Products', 'expert-tech-plugin'),
            array('description' => __('Display featured or recent products.', 'expert-tech-plugin'))
        );
    }

    public function widget($args, $instance) {
        if (!class_exists('WooCommerce')) {
            return;
        }

        echo $args['before_widget'];

        if (!empty($instance['title'])) {
            echo $args['before_title'] . esc_html($instance['title']) . $args['after_title'];
        }

        $product_args = array(
            'post_type'      => 'product',
            'posts_per_page' => isset($instance['number']) ? intval($instance['number']) : 4,
            'post_status'    => 'publish',
        );

        if (!empty($instance['featured'])) {
            $product_args['meta_key'] = '_featured';
            $product_args['meta_value'] = 'yes';
        }

        $products = new WP_Query($product_args);

        if ($products->have_posts()) {
            echo '<ul class="product-widget-list">';
            while ($products->have_posts()) {
                $products->the_post();
                $product = wc_get_product(get_the_ID());
                ?>
                <li>
                    <a href="<?php the_permalink(); ?>">
                        <?php the_post_thumbnail('thumbnail'); ?>
                        <span class="product-title"><?php the_title(); ?></span>
                        <span class="product-price"><?php echo $product->get_price_html(); ?></span>
                    </a>
                </li>
                <?php
            }
            echo '</ul>';
            wp_reset_postdata();
        }

        echo $args['after_widget'];
    }

    public function form($instance) {
        $title = isset($instance['title']) ? $instance['title'] : '';
        $number = isset($instance['number']) ? $instance['number'] : 4;
        $featured = isset($instance['featured']) ? $instance['featured'] : false;
        ?>
        <p>
            <label for="<?php echo $this->get_field_id('title'); ?>"><?php esc_html_e('Title:', 'expert-tech-plugin'); ?></label>
            <input class="widefat" id="<?php echo $this->get_field_id('title'); ?>" name="<?php echo $this->get_field_name('title'); ?>" type="text" value="<?php echo esc_attr($title); ?>">
        </p>
        <p>
            <label for="<?php echo $this->get_field_id('number'); ?>"><?php esc_html_e('Number of products:', 'expert-tech-plugin'); ?></label>
            <input class="tiny-text" id="<?php echo $this->get_field_id('number'); ?>" name="<?php echo $this->get_field_name('number'); ?>" type="number" value="<?php echo esc_attr($number); ?>" min="1" max="20">
        </p>
        <p>
            <input type="checkbox" id="<?php echo $this->get_field_id('featured'); ?>" name="<?php echo $this->get_field_name('featured'); ?>" <?php checked($featured); ?>>
            <label for="<?php echo $this->get_field_id('featured'); ?>"><?php esc_html_e('Show featured products only', 'expert-tech-plugin'); ?></label>
        </p>
        <?php
    }

    public function update($new_instance, $old_instance) {
        $instance = array();
        $instance['title'] = sanitize_text_field($new_instance['title']);
        $instance['number'] = absint($new_instance['number']);
        $instance['featured'] = isset($new_instance['featured']) ? true : false;
        return $instance;
    }
}

/**
 * Contact Widget
 */
class Expert_Tech_Contact_Widget extends WP_Widget {

    public function __construct() {
        parent::__construct(
            'expert_tech_contact',
            __('Expert Tech - Contact Info', 'expert-tech-plugin'),
            array('description' => __('Display contact information.', 'expert-tech-plugin'))
        );
    }

    public function widget($args, $instance) {
        $options = get_option('expert_tech_options', array());

        echo $args['before_widget'];

        if (!empty($instance['title'])) {
            echo $args['before_title'] . esc_html($instance['title']) . $args['after_title'];
        }

        echo '<ul class="contact-widget-list">';

        if (!empty($options['phone'])) {
            echo '<li><i class="fas fa-phone-alt"></i> <a href="tel:' . esc_attr(preg_replace('/[^0-9+]/', '', $options['phone'])) . '">' . esc_html($options['phone']) . '</a></li>';
        }

        if (!empty($options['email'])) {
            echo '<li><i class="fas fa-envelope"></i> <a href="mailto:' . esc_attr($options['email']) . '">' . esc_html($options['email']) . '</a></li>';
        }

        if (!empty($options['address'])) {
            echo '<li><i class="fas fa-map-marker-alt"></i> ' . wp_kses_post($options['address']) . '</li>';
        }

        echo '</ul>';

        echo $args['after_widget'];
    }

    public function form($instance) {
        $title = isset($instance['title']) ? $instance['title'] : __('Contact Us', 'expert-tech-plugin');
        ?>
        <p>
            <label for="<?php echo $this->get_field_id('title'); ?>"><?php esc_html_e('Title:', 'expert-tech-plugin'); ?></label>
            <input class="widefat" id="<?php echo $this->get_field_id('title'); ?>" name="<?php echo $this->get_field_name('title'); ?>" type="text" value="<?php echo esc_attr($title); ?>">
        </p>
        <p class="description"><?php esc_html_e('Contact information is managed in Expert Tech > Settings.', 'expert-tech-plugin'); ?></p>
        <?php
    }

    public function update($new_instance, $old_instance) {
        $instance = array();
        $instance['title'] = sanitize_text_field($new_instance['title']);
        return $instance;
    }
}

/**
 * Social Widget
 */
class Expert_Tech_Social_Widget extends WP_Widget {

    public function __construct() {
        parent::__construct(
            'expert_tech_social',
            __('Expert Tech - Social Links', 'expert-tech-plugin'),
            array('description' => __('Display social media links.', 'expert-tech-plugin'))
        );
    }

    public function widget($args, $instance) {
        $options = get_option('expert_tech_options', array());

        echo $args['before_widget'];

        if (!empty($instance['title'])) {
            echo $args['before_title'] . esc_html($instance['title']) . $args['after_title'];
        }

        $social_links = array(
            'facebook'  => 'fab fa-facebook-f',
            'twitter'   => 'fab fa-twitter',
            'instagram' => 'fab fa-instagram',
            'linkedin'  => 'fab fa-linkedin-in',
            'youtube'   => 'fab fa-youtube',
            'whatsapp'  => 'fab fa-whatsapp',
        );

        echo '<div class="social-widget-links">';

        foreach ($social_links as $platform => $icon) {
            if (!empty($options[$platform])) {
                echo '<a href="' . esc_url($options[$platform]) . '" target="_blank" rel="noopener noreferrer"><i class="' . esc_attr($icon) . '"></i></a>';
            }
        }

        echo '</div>';

        echo $args['after_widget'];
    }

    public function form($instance) {
        $title = isset($instance['title']) ? $instance['title'] : __('Follow Us', 'expert-tech-plugin');
        ?>
        <p>
            <label for="<?php echo $this->get_field_id('title'); ?>"><?php esc_html_e('Title:', 'expert-tech-plugin'); ?></label>
            <input class="widefat" id="<?php echo $this->get_field_id('title'); ?>" name="<?php echo $this->get_field_name('title'); ?>" type="text" value="<?php echo esc_attr($title); ?>">
        </p>
        <p class="description"><?php esc_html_e('Social links are managed in Expert Tech > Settings.', 'expert-tech-plugin'); ?></p>
        <?php
    }

    public function update($new_instance, $old_instance) {
        $instance = array();
        $instance['title'] = sanitize_text_field($new_instance['title']);
        return $instance;
    }
}

/**
 * Opening Hours Widget
 */
class Expert_Tech_Opening_Hours_Widget extends WP_Widget {

    public function __construct() {
        parent::__construct(
            'expert_tech_hours',
            __('Expert Tech - Opening Hours', 'expert-tech-plugin'),
            array('description' => __('Display business opening hours.', 'expert-tech-plugin'))
        );
    }

    public function widget($args, $instance) {
        echo $args['before_widget'];

        if (!empty($instance['title'])) {
            echo $args['before_title'] . esc_html($instance['title']) . $args['after_title'];
        }

        echo '<ul class="opening-hours-list">';

        $days = array(
            'saturday'  => __('Saturday', 'expert-tech-plugin'),
            'sunday'    => __('Sunday', 'expert-tech-plugin'),
            'monday'    => __('Monday', 'expert-tech-plugin'),
            'tuesday'   => __('Tuesday', 'expert-tech-plugin'),
            'wednesday' => __('Wednesday', 'expert-tech-plugin'),
            'thursday'  => __('Thursday', 'expert-tech-plugin'),
            'friday'    => __('Friday', 'expert-tech-plugin'),
        );

        foreach ($days as $day => $label) {
            $hours = isset($instance[$day]) ? $instance[$day] : '10:00 AM - 8:00 PM';
            echo '<li><span class="day">' . esc_html($label) . '</span><span class="hours">' . esc_html($hours) . '</span></li>';
        }

        echo '</ul>';

        echo $args['after_widget'];
    }

    public function form($instance) {
        $title = isset($instance['title']) ? $instance['title'] : __('Opening Hours', 'expert-tech-plugin');
        $days = array(
            'saturday'  => __('Saturday', 'expert-tech-plugin'),
            'sunday'    => __('Sunday', 'expert-tech-plugin'),
            'monday'    => __('Monday', 'expert-tech-plugin'),
            'tuesday'   => __('Tuesday', 'expert-tech-plugin'),
            'wednesday' => __('Wednesday', 'expert-tech-plugin'),
            'thursday'  => __('Thursday', 'expert-tech-plugin'),
            'friday'    => __('Friday', 'expert-tech-plugin'),
        );
        ?>
        <p>
            <label for="<?php echo $this->get_field_id('title'); ?>"><?php esc_html_e('Title:', 'expert-tech-plugin'); ?></label>
            <input class="widefat" id="<?php echo $this->get_field_id('title'); ?>" name="<?php echo $this->get_field_name('title'); ?>" type="text" value="<?php echo esc_attr($title); ?>">
        </p>
        <?php foreach ($days as $day => $label): ?>
            <p>
                <label for="<?php echo $this->get_field_id($day); ?>"><?php echo esc_html($label); ?>:</label>
                <input class="widefat" id="<?php echo $this->get_field_id($day); ?>" name="<?php echo $this->get_field_name($day); ?>" type="text" value="<?php echo esc_attr(isset($instance[$day]) ? $instance[$day] : '10:00 AM - 8:00 PM'); ?>">
            </p>
        <?php endforeach;
    }

    public function update($new_instance, $old_instance) {
        $instance = array();
        $instance['title'] = sanitize_text_field($new_instance['title']);
        $days = array('saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday');
        foreach ($days as $day) {
            $instance[$day] = sanitize_text_field($new_instance[$day]);
        }
        return $instance;
    }
}

// Initialize Plugin
Expert_Tech_Plugin::instance();
