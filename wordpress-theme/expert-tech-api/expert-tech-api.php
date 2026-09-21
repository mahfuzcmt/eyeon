<?php
/**
 * Plugin Name: Expert Tech API
 * Description: REST API for managing WordPress content programmatically - pages, products, categories, menus, and more.
 * Version: 1.0.0
 * Author: Web Innovation
 * Requires at least: 6.0
 * Requires PHP: 8.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class Expert_Tech_API {

    private $api_key;
    private $namespace = 'expert-tech/v1';

    public function __construct() {
        $this->api_key = get_option('expert_tech_api_key', '');

        add_action('rest_api_init', array($this, 'register_routes'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));

        // Generate API key on activation
        register_activation_hook(__FILE__, array($this, 'activate'));
    }

    /**
     * Plugin activation - generate API key
     */
    public function activate() {
        if (empty(get_option('expert_tech_api_key'))) {
            update_option('expert_tech_api_key', wp_generate_password(32, false));
        }
    }

    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_submenu_page(
            'tools.php',
            'Expert Tech API',
            'Expert Tech API',
            'manage_options',
            'expert-tech-api',
            array($this, 'admin_page')
        );
    }

    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('expert_tech_api_settings', 'expert_tech_api_key');
    }

    /**
     * Admin page
     */
    public function admin_page() {
        $api_key = get_option('expert_tech_api_key', '');
        $site_url = get_site_url();
        ?>
        <div class="wrap">
            <h1>Expert Tech API</h1>
            <p>Use this API key to interact with your WordPress site programmatically.</p>

            <table class="form-table">
                <tr>
                    <th>API Key</th>
                    <td>
                        <input type="text" value="<?php echo esc_attr($api_key); ?>" class="large-text" readonly>
                        <p class="description">Include this in the X-API-Key header for all requests.</p>
                    </td>
                </tr>
                <tr>
                    <th>API Endpoint</th>
                    <td>
                        <code><?php echo esc_url($site_url); ?>/wp-json/expert-tech/v1/</code>
                    </td>
                </tr>
            </table>

            <h2>Available Endpoints</h2>
            <table class="widefat">
                <thead>
                    <tr>
                        <th>Method</th>
                        <th>Endpoint</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>GET</td><td>/status</td><td>Check API status</td></tr>
                    <tr><td>POST</td><td>/page</td><td>Create a page</td></tr>
                    <tr><td>POST</td><td>/post</td><td>Create a post</td></tr>
                    <tr><td>POST</td><td>/product</td><td>Create a WooCommerce product</td></tr>
                    <tr><td>POST</td><td>/category</td><td>Create a product category</td></tr>
                    <tr><td>POST</td><td>/menu</td><td>Create/update a menu</td></tr>
                    <tr><td>POST</td><td>/menu-item</td><td>Add item to menu</td></tr>
                    <tr><td>POST</td><td>/widget</td><td>Add a widget</td></tr>
                    <tr><td>POST</td><td>/option</td><td>Update site option</td></tr>
                    <tr><td>POST</td><td>/media</td><td>Upload media from URL</td></tr>
                    <tr><td>POST</td><td>/brand</td><td>Create a brand</td></tr>
                    <tr><td>POST</td><td>/faq</td><td>Create a FAQ</td></tr>
                    <tr><td>POST</td><td>/testimonial</td><td>Create a testimonial</td></tr>
                    <tr><td>POST</td><td>/slider</td><td>Create a slider</td></tr>
                    <tr><td>POST</td><td>/bulk</td><td>Bulk create multiple items</td></tr>
                    <tr><td>GET</td><td>/info</td><td>Get site info</td></tr>
                </tbody>
            </table>

            <h3>Regenerate API Key</h3>
            <form method="post" action="">
                <?php wp_nonce_field('regenerate_api_key'); ?>
                <input type="submit" name="regenerate_key" class="button" value="Regenerate API Key">
            </form>
            <?php
            if (isset($_POST['regenerate_key']) && wp_verify_nonce($_POST['_wpnonce'], 'regenerate_api_key')) {
                $new_key = wp_generate_password(32, false);
                update_option('expert_tech_api_key', $new_key);
                echo '<div class="notice notice-success"><p>API Key regenerated: <strong>' . esc_html($new_key) . '</strong></p></div>';
            }
            ?>
        </div>
        <?php
    }

    /**
     * Register REST routes
     */
    public function register_routes() {
        // Status check
        register_rest_route($this->namespace, '/status', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_status'),
            'permission_callback' => array($this, 'check_permission'),
        ));

        // Site info
        register_rest_route($this->namespace, '/info', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_info'),
            'permission_callback' => array($this, 'check_permission'),
        ));

        // Create page
        register_rest_route($this->namespace, '/page', array(
            'methods' => 'POST',
            'callback' => array($this, 'create_page'),
            'permission_callback' => array($this, 'check_permission'),
        ));

        // Create post
        register_rest_route($this->namespace, '/post', array(
            'methods' => 'POST',
            'callback' => array($this, 'create_post'),
            'permission_callback' => array($this, 'check_permission'),
        ));

        // Create product
        register_rest_route($this->namespace, '/product', array(
            'methods' => 'POST',
            'callback' => array($this, 'create_product'),
            'permission_callback' => array($this, 'check_permission'),
        ));

        // Create category
        register_rest_route($this->namespace, '/category', array(
            'methods' => 'POST',
            'callback' => array($this, 'create_category'),
            'permission_callback' => array($this, 'check_permission'),
        ));

        // Create/update menu
        register_rest_route($this->namespace, '/menu', array(
            'methods' => 'POST',
            'callback' => array($this, 'create_menu'),
            'permission_callback' => array($this, 'check_permission'),
        ));

        // Add menu item
        register_rest_route($this->namespace, '/menu-item', array(
            'methods' => 'POST',
            'callback' => array($this, 'add_menu_item'),
            'permission_callback' => array($this, 'check_permission'),
        ));

        // Update option
        register_rest_route($this->namespace, '/option', array(
            'methods' => 'POST',
            'callback' => array($this, 'update_option'),
            'permission_callback' => array($this, 'check_permission'),
        ));

        // Upload media
        register_rest_route($this->namespace, '/media', array(
            'methods' => 'POST',
            'callback' => array($this, 'upload_media'),
            'permission_callback' => array($this, 'check_permission'),
        ));

        // Create brand
        register_rest_route($this->namespace, '/brand', array(
            'methods' => 'POST',
            'callback' => array($this, 'create_brand'),
            'permission_callback' => array($this, 'check_permission'),
        ));

        // Create FAQ
        register_rest_route($this->namespace, '/faq', array(
            'methods' => 'POST',
            'callback' => array($this, 'create_faq'),
            'permission_callback' => array($this, 'check_permission'),
        ));

        // Create testimonial
        register_rest_route($this->namespace, '/testimonial', array(
            'methods' => 'POST',
            'callback' => array($this, 'create_testimonial'),
            'permission_callback' => array($this, 'check_permission'),
        ));

        // Create slider
        register_rest_route($this->namespace, '/slider', array(
            'methods' => 'POST',
            'callback' => array($this, 'create_slider'),
            'permission_callback' => array($this, 'check_permission'),
        ));

        // Bulk operations
        register_rest_route($this->namespace, '/bulk', array(
            'methods' => 'POST',
            'callback' => array($this, 'bulk_create'),
            'permission_callback' => array($this, 'check_permission'),
        ));

        // Setup theme
        register_rest_route($this->namespace, '/setup-theme', array(
            'methods' => 'POST',
            'callback' => array($this, 'setup_theme'),
            'permission_callback' => array($this, 'check_permission'),
        ));

        // Assign menu location
        register_rest_route($this->namespace, '/menu-location', array(
            'methods' => 'POST',
            'callback' => array($this, 'assign_menu_location'),
            'permission_callback' => array($this, 'check_permission'),
        ));
    }

    /**
     * Check API key permission
     */
    public function check_permission($request) {
        $api_key = $request->get_header('X-API-Key');
        $stored_key = get_option('expert_tech_api_key', '');

        if (empty($stored_key) || $api_key !== $stored_key) {
            return new WP_Error('unauthorized', 'Invalid API key', array('status' => 401));
        }

        return true;
    }

    /**
     * Get status
     */
    public function get_status($request) {
        return array(
            'status' => 'ok',
            'message' => 'Expert Tech API is running',
            'version' => '1.0.0',
            'wordpress' => get_bloginfo('version'),
            'woocommerce' => class_exists('WooCommerce') ? WC()->version : 'not installed',
            'theme' => wp_get_theme()->get('Name'),
        );
    }

    /**
     * Get site info
     */
    public function get_info($request) {
        $menus = wp_get_nav_menus();
        $menu_data = array();
        foreach ($menus as $menu) {
            $menu_data[] = array(
                'id' => $menu->term_id,
                'name' => $menu->name,
                'slug' => $menu->slug,
            );
        }

        $categories = array();
        if (class_exists('WooCommerce')) {
            $terms = get_terms(array(
                'taxonomy' => 'product_cat',
                'hide_empty' => false,
            ));
            foreach ($terms as $term) {
                $categories[] = array(
                    'id' => $term->term_id,
                    'name' => $term->name,
                    'slug' => $term->slug,
                    'parent' => $term->parent,
                    'count' => $term->count,
                );
            }
        }

        $pages = get_pages();
        $page_data = array();
        foreach ($pages as $page) {
            $page_data[] = array(
                'id' => $page->ID,
                'title' => $page->post_title,
                'slug' => $page->post_name,
            );
        }

        return array(
            'site_name' => get_bloginfo('name'),
            'site_url' => get_site_url(),
            'admin_email' => get_option('admin_email'),
            'menus' => $menu_data,
            'categories' => $categories,
            'pages' => $page_data,
            'theme' => wp_get_theme()->get('Name'),
            'plugins' => array(
                'woocommerce' => class_exists('WooCommerce'),
                'expert_tech_plugin' => class_exists('Expert_Tech_Plugin'),
            ),
        );
    }

    /**
     * Create page
     */
    public function create_page($request) {
        $params = $request->get_json_params();

        $page_data = array(
            'post_title'   => sanitize_text_field($params['title'] ?? 'Untitled'),
            'post_content' => wp_kses_post($params['content'] ?? ''),
            'post_status'  => $params['status'] ?? 'publish',
            'post_type'    => 'page',
            'post_name'    => sanitize_title($params['slug'] ?? ''),
        );

        if (!empty($params['parent'])) {
            $page_data['post_parent'] = intval($params['parent']);
        }

        if (!empty($params['template'])) {
            $page_data['page_template'] = sanitize_text_field($params['template']);
        }

        $page_id = wp_insert_post($page_data);

        if (is_wp_error($page_id)) {
            return new WP_Error('create_failed', $page_id->get_error_message(), array('status' => 500));
        }

        // Set featured image if provided
        if (!empty($params['image_url'])) {
            $this->set_featured_image($page_id, $params['image_url']);
        }

        // Set as front page if specified
        if (!empty($params['set_as_front_page'])) {
            update_option('show_on_front', 'page');
            update_option('page_on_front', $page_id);
        }

        return array(
            'success' => true,
            'id' => $page_id,
            'url' => get_permalink($page_id),
            'message' => 'Page created successfully',
        );
    }

    /**
     * Create post
     */
    public function create_post($request) {
        $params = $request->get_json_params();

        $post_data = array(
            'post_title'   => sanitize_text_field($params['title'] ?? 'Untitled'),
            'post_content' => wp_kses_post($params['content'] ?? ''),
            'post_excerpt' => sanitize_textarea_field($params['excerpt'] ?? ''),
            'post_status'  => $params['status'] ?? 'publish',
            'post_type'    => 'post',
            'post_name'    => sanitize_title($params['slug'] ?? ''),
        );

        $post_id = wp_insert_post($post_data);

        if (is_wp_error($post_id)) {
            return new WP_Error('create_failed', $post_id->get_error_message(), array('status' => 500));
        }

        // Set categories
        if (!empty($params['categories'])) {
            wp_set_post_categories($post_id, (array) $params['categories']);
        }

        // Set tags
        if (!empty($params['tags'])) {
            wp_set_post_tags($post_id, $params['tags']);
        }

        // Set featured image
        if (!empty($params['image_url'])) {
            $this->set_featured_image($post_id, $params['image_url']);
        }

        return array(
            'success' => true,
            'id' => $post_id,
            'url' => get_permalink($post_id),
            'message' => 'Post created successfully',
        );
    }

    /**
     * Create WooCommerce product
     */
    public function create_product($request) {
        if (!class_exists('WooCommerce')) {
            return new WP_Error('woocommerce_required', 'WooCommerce is not installed', array('status' => 400));
        }

        $params = $request->get_json_params();

        $product = new WC_Product_Simple();

        $product->set_name(sanitize_text_field($params['title'] ?? 'Untitled Product'));
        $product->set_description(wp_kses_post($params['description'] ?? ''));
        $product->set_short_description(wp_kses_post($params['short_description'] ?? ''));
        $product->set_status($params['status'] ?? 'publish');

        if (!empty($params['slug'])) {
            $product->set_slug(sanitize_title($params['slug']));
        }

        if (isset($params['regular_price'])) {
            $product->set_regular_price($params['regular_price']);
        }

        if (isset($params['sale_price'])) {
            $product->set_sale_price($params['sale_price']);
        }

        if (!empty($params['sku'])) {
            $product->set_sku(sanitize_text_field($params['sku']));
        }

        if (isset($params['stock_quantity'])) {
            $product->set_stock_quantity(intval($params['stock_quantity']));
            $product->set_manage_stock(true);
        }

        if (isset($params['in_stock'])) {
            $product->set_stock_status($params['in_stock'] ? 'instock' : 'outofstock');
        }

        if (!empty($params['weight'])) {
            $product->set_weight($params['weight']);
        }

        if (!empty($params['featured'])) {
            $product->set_featured(true);
        }

        $product_id = $product->save();

        // Set categories
        if (!empty($params['categories'])) {
            $category_ids = array();
            foreach ((array) $params['categories'] as $cat) {
                if (is_numeric($cat)) {
                    $category_ids[] = intval($cat);
                } else {
                    $term = get_term_by('slug', $cat, 'product_cat');
                    if ($term) {
                        $category_ids[] = $term->term_id;
                    }
                }
            }
            wp_set_object_terms($product_id, $category_ids, 'product_cat');
        }

        // Set featured image
        if (!empty($params['image_url'])) {
            $this->set_featured_image($product_id, $params['image_url']);
        }

        // Set gallery images
        if (!empty($params['gallery_urls']) && is_array($params['gallery_urls'])) {
            $gallery_ids = array();
            foreach ($params['gallery_urls'] as $url) {
                $image_id = $this->upload_image_from_url($url);
                if ($image_id) {
                    $gallery_ids[] = $image_id;
                }
            }
            $product->set_gallery_image_ids($gallery_ids);
            $product->save();
        }

        // Custom meta fields
        if (!empty($params['warranty'])) {
            update_post_meta($product_id, '_warranty_period', sanitize_text_field($params['warranty']));
        }
        if (!empty($params['model'])) {
            update_post_meta($product_id, '_model_number', sanitize_text_field($params['model']));
        }
        if (!empty($params['btrc_approved'])) {
            update_post_meta($product_id, '_btrc_approved', 'yes');
        }

        return array(
            'success' => true,
            'id' => $product_id,
            'url' => get_permalink($product_id),
            'message' => 'Product created successfully',
        );
    }

    /**
     * Create product category
     */
    public function create_category($request) {
        $params = $request->get_json_params();

        $taxonomy = $params['taxonomy'] ?? 'product_cat';

        $args = array(
            'description' => sanitize_textarea_field($params['description'] ?? ''),
            'slug' => sanitize_title($params['slug'] ?? ''),
        );

        if (!empty($params['parent'])) {
            if (is_numeric($params['parent'])) {
                $args['parent'] = intval($params['parent']);
            } else {
                $parent_term = get_term_by('slug', $params['parent'], $taxonomy);
                if ($parent_term) {
                    $args['parent'] = $parent_term->term_id;
                }
            }
        }

        $result = wp_insert_term(
            sanitize_text_field($params['name'] ?? 'Untitled'),
            $taxonomy,
            $args
        );

        if (is_wp_error($result)) {
            // If term exists, get it
            if ($result->get_error_code() === 'term_exists') {
                $term = get_term_by('slug', $args['slug'] ?: sanitize_title($params['name']), $taxonomy);
                return array(
                    'success' => true,
                    'id' => $term->term_id,
                    'message' => 'Category already exists',
                    'existing' => true,
                );
            }
            return new WP_Error('create_failed', $result->get_error_message(), array('status' => 500));
        }

        $term_id = $result['term_id'];

        // Set category image
        if (!empty($params['image_url']) && $taxonomy === 'product_cat') {
            $image_id = $this->upload_image_from_url($params['image_url']);
            if ($image_id) {
                update_term_meta($term_id, 'thumbnail_id', $image_id);
            }
        }

        return array(
            'success' => true,
            'id' => $term_id,
            'message' => 'Category created successfully',
        );
    }

    /**
     * Create menu
     */
    public function create_menu($request) {
        $params = $request->get_json_params();

        $menu_name = sanitize_text_field($params['name'] ?? 'Main Menu');

        // Check if menu exists
        $menu = wp_get_nav_menu_object($menu_name);

        if (!$menu) {
            $menu_id = wp_create_nav_menu($menu_name);
            if (is_wp_error($menu_id)) {
                return new WP_Error('create_failed', $menu_id->get_error_message(), array('status' => 500));
            }
        } else {
            $menu_id = $menu->term_id;
        }

        // Assign to location if specified
        if (!empty($params['location'])) {
            $locations = get_theme_mod('nav_menu_locations', array());
            $locations[$params['location']] = $menu_id;
            set_theme_mod('nav_menu_locations', $locations);
        }

        return array(
            'success' => true,
            'id' => $menu_id,
            'message' => 'Menu created/updated successfully',
        );
    }

    /**
     * Add menu item
     */
    public function add_menu_item($request) {
        $params = $request->get_json_params();

        $menu_id = intval($params['menu_id'] ?? 0);

        if (!$menu_id) {
            // Try to find menu by name
            $menu = wp_get_nav_menu_object($params['menu_name'] ?? '');
            if ($menu) {
                $menu_id = $menu->term_id;
            } else {
                return new WP_Error('menu_not_found', 'Menu not found', array('status' => 404));
            }
        }

        $item_data = array(
            'menu-item-title' => sanitize_text_field($params['title'] ?? ''),
            'menu-item-status' => 'publish',
            'menu-item-position' => intval($params['position'] ?? 0),
        );

        // Set item type
        if (!empty($params['url'])) {
            $item_data['menu-item-type'] = 'custom';
            $item_data['menu-item-url'] = esc_url($params['url']);
        } elseif (!empty($params['page_id'])) {
            $item_data['menu-item-type'] = 'post_type';
            $item_data['menu-item-object'] = 'page';
            $item_data['menu-item-object-id'] = intval($params['page_id']);
        } elseif (!empty($params['category_id'])) {
            $item_data['menu-item-type'] = 'taxonomy';
            $item_data['menu-item-object'] = $params['taxonomy'] ?? 'product_cat';
            $item_data['menu-item-object-id'] = intval($params['category_id']);
        }

        // Set parent for dropdown
        if (!empty($params['parent_id'])) {
            $item_data['menu-item-parent-id'] = intval($params['parent_id']);
        }

        $item_id = wp_update_nav_menu_item($menu_id, 0, $item_data);

        if (is_wp_error($item_id)) {
            return new WP_Error('create_failed', $item_id->get_error_message(), array('status' => 500));
        }

        return array(
            'success' => true,
            'id' => $item_id,
            'message' => 'Menu item added successfully',
        );
    }

    /**
     * Assign menu to location
     */
    public function assign_menu_location($request) {
        $params = $request->get_json_params();

        $menu_id = intval($params['menu_id'] ?? 0);
        $location = sanitize_key($params['location'] ?? '');

        if (!$menu_id || !$location) {
            return new WP_Error('invalid_params', 'Menu ID and location are required', array('status' => 400));
        }

        $locations = get_theme_mod('nav_menu_locations', array());
        $locations[$location] = $menu_id;
        set_theme_mod('nav_menu_locations', $locations);

        return array(
            'success' => true,
            'message' => "Menu assigned to location: $location",
        );
    }

    /**
     * Update option
     */
    public function update_option($request) {
        $params = $request->get_json_params();

        $allowed_options = array(
            'blogname', 'blogdescription', 'admin_email',
            'show_on_front', 'page_on_front', 'page_for_posts',
            'posts_per_page', 'timezone_string', 'date_format', 'time_format',
            'woocommerce_shop_page_id', 'woocommerce_cart_page_id',
            'woocommerce_checkout_page_id', 'woocommerce_myaccount_page_id',
            'expert_tech_options',
        );

        $option_name = sanitize_key($params['name'] ?? '');

        if (!in_array($option_name, $allowed_options) && strpos($option_name, 'expert_tech_') !== 0) {
            return new WP_Error('not_allowed', 'This option cannot be modified', array('status' => 403));
        }

        $value = $params['value'];

        update_option($option_name, $value);

        return array(
            'success' => true,
            'message' => "Option '$option_name' updated successfully",
        );
    }

    /**
     * Upload media from URL
     */
    public function upload_media($request) {
        $params = $request->get_json_params();

        $url = esc_url($params['url'] ?? '');
        $title = sanitize_text_field($params['title'] ?? '');

        if (empty($url)) {
            return new WP_Error('invalid_url', 'URL is required', array('status' => 400));
        }

        $image_id = $this->upload_image_from_url($url, $title);

        if (!$image_id) {
            return new WP_Error('upload_failed', 'Failed to upload media', array('status' => 500));
        }

        return array(
            'success' => true,
            'id' => $image_id,
            'url' => wp_get_attachment_url($image_id),
            'message' => 'Media uploaded successfully',
        );
    }

    /**
     * Create brand
     */
    public function create_brand($request) {
        $params = $request->get_json_params();

        $post_data = array(
            'post_title'  => sanitize_text_field($params['name'] ?? 'Untitled'),
            'post_status' => 'publish',
            'post_type'   => 'brand',
        );

        $post_id = wp_insert_post($post_data);

        if (is_wp_error($post_id)) {
            return new WP_Error('create_failed', $post_id->get_error_message(), array('status' => 500));
        }

        if (!empty($params['logo_url'])) {
            $this->set_featured_image($post_id, $params['logo_url']);
        }

        if (!empty($params['website'])) {
            update_post_meta($post_id, '_brand_website', esc_url($params['website']));
        }

        return array(
            'success' => true,
            'id' => $post_id,
            'message' => 'Brand created successfully',
        );
    }

    /**
     * Create FAQ
     */
    public function create_faq($request) {
        $params = $request->get_json_params();

        $post_data = array(
            'post_title'   => sanitize_text_field($params['question'] ?? 'Untitled'),
            'post_content' => wp_kses_post($params['answer'] ?? ''),
            'post_status'  => 'publish',
            'post_type'    => 'faq',
        );

        $post_id = wp_insert_post($post_data);

        if (is_wp_error($post_id)) {
            return new WP_Error('create_failed', $post_id->get_error_message(), array('status' => 500));
        }

        if (!empty($params['category'])) {
            wp_set_object_terms($post_id, $params['category'], 'faq_category');
        }

        return array(
            'success' => true,
            'id' => $post_id,
            'message' => 'FAQ created successfully',
        );
    }

    /**
     * Create testimonial
     */
    public function create_testimonial($request) {
        $params = $request->get_json_params();

        $post_data = array(
            'post_title'   => sanitize_text_field($params['name'] ?? 'Anonymous'),
            'post_content' => sanitize_textarea_field($params['content'] ?? ''),
            'post_status'  => 'publish',
            'post_type'    => 'testimonial',
        );

        $post_id = wp_insert_post($post_data);

        if (is_wp_error($post_id)) {
            return new WP_Error('create_failed', $post_id->get_error_message(), array('status' => 500));
        }

        if (!empty($params['position'])) {
            update_post_meta($post_id, '_testimonial_position', sanitize_text_field($params['position']));
        }

        if (!empty($params['company'])) {
            update_post_meta($post_id, '_testimonial_company', sanitize_text_field($params['company']));
        }

        if (!empty($params['rating'])) {
            update_post_meta($post_id, '_testimonial_rating', intval($params['rating']));
        }

        if (!empty($params['image_url'])) {
            $this->set_featured_image($post_id, $params['image_url']);
        }

        return array(
            'success' => true,
            'id' => $post_id,
            'message' => 'Testimonial created successfully',
        );
    }

    /**
     * Create slider
     */
    public function create_slider($request) {
        $params = $request->get_json_params();

        $post_data = array(
            'post_title'  => sanitize_text_field($params['title'] ?? 'Slide'),
            'post_status' => 'publish',
            'post_type'   => 'slider',
        );

        $post_id = wp_insert_post($post_data);

        if (is_wp_error($post_id)) {
            return new WP_Error('create_failed', $post_id->get_error_message(), array('status' => 500));
        }

        // Set meta fields
        if (!empty($params['subtitle'])) {
            update_post_meta($post_id, '_slider_subtitle', sanitize_text_field($params['subtitle']));
        }
        if (!empty($params['description'])) {
            update_post_meta($post_id, '_slider_description', sanitize_textarea_field($params['description']));
        }
        if (!empty($params['button_text'])) {
            update_post_meta($post_id, '_slider_button_text', sanitize_text_field($params['button_text']));
        }
        if (!empty($params['button_url'])) {
            update_post_meta($post_id, '_slider_button_url', esc_url($params['button_url']));
        }
        if (!empty($params['image_url'])) {
            $this->set_featured_image($post_id, $params['image_url']);
        }

        return array(
            'success' => true,
            'id' => $post_id,
            'message' => 'Slider created successfully',
        );
    }

    /**
     * Bulk create items
     */
    public function bulk_create($request) {
        $params = $request->get_json_params();
        $results = array();

        if (!empty($params['pages'])) {
            foreach ($params['pages'] as $page) {
                $sub_request = new WP_REST_Request('POST');
                $sub_request->set_body(json_encode($page));
                $sub_request->set_header('Content-Type', 'application/json');
                $results['pages'][] = $this->create_page($sub_request);
            }
        }

        if (!empty($params['categories'])) {
            foreach ($params['categories'] as $cat) {
                $sub_request = new WP_REST_Request('POST');
                $sub_request->set_body(json_encode($cat));
                $sub_request->set_header('Content-Type', 'application/json');
                $results['categories'][] = $this->create_category($sub_request);
            }
        }

        if (!empty($params['products'])) {
            foreach ($params['products'] as $product) {
                $sub_request = new WP_REST_Request('POST');
                $sub_request->set_body(json_encode($product));
                $sub_request->set_header('Content-Type', 'application/json');
                $results['products'][] = $this->create_product($sub_request);
            }
        }

        if (!empty($params['faqs'])) {
            foreach ($params['faqs'] as $faq) {
                $sub_request = new WP_REST_Request('POST');
                $sub_request->set_body(json_encode($faq));
                $sub_request->set_header('Content-Type', 'application/json');
                $results['faqs'][] = $this->create_faq($sub_request);
            }
        }

        return array(
            'success' => true,
            'results' => $results,
            'message' => 'Bulk operation completed',
        );
    }

    /**
     * Setup theme - comprehensive setup
     */
    public function setup_theme($request) {
        $params = $request->get_json_params();
        $results = array();

        // Set site title and tagline
        if (!empty($params['site_title'])) {
            update_option('blogname', sanitize_text_field($params['site_title']));
            $results[] = 'Site title updated';
        }

        if (!empty($params['tagline'])) {
            update_option('blogdescription', sanitize_text_field($params['tagline']));
            $results[] = 'Tagline updated';
        }

        // Update theme mods
        if (!empty($params['theme_mods'])) {
            foreach ($params['theme_mods'] as $key => $value) {
                set_theme_mod($key, $value);
            }
            $results[] = 'Theme mods updated';
        }

        // Update Expert Tech options
        if (!empty($params['expert_tech_options'])) {
            update_option('expert_tech_options', $params['expert_tech_options']);
            $results[] = 'Expert Tech options updated';
        }

        return array(
            'success' => true,
            'results' => $results,
            'message' => 'Theme setup completed',
        );
    }

    /**
     * Helper: Upload image from URL
     */
    private function upload_image_from_url($url, $title = '') {
        require_once(ABSPATH . 'wp-admin/includes/file.php');
        require_once(ABSPATH . 'wp-admin/includes/media.php');
        require_once(ABSPATH . 'wp-admin/includes/image.php');

        $tmp = download_url($url);

        if (is_wp_error($tmp)) {
            return false;
        }

        $file_array = array(
            'name' => basename(parse_url($url, PHP_URL_PATH)),
            'tmp_name' => $tmp,
        );

        $id = media_handle_sideload($file_array, 0, $title);

        if (is_wp_error($id)) {
            @unlink($tmp);
            return false;
        }

        return $id;
    }

    /**
     * Helper: Set featured image from URL
     */
    private function set_featured_image($post_id, $url) {
        $image_id = $this->upload_image_from_url($url);
        if ($image_id) {
            set_post_thumbnail($post_id, $image_id);
            return $image_id;
        }
        return false;
    }
}

// Initialize
new Expert_Tech_API();
