<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="profile" href="https://gmpg.org/xfn/11">
    <?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<div id="page" class="site">
    <a class="skip-link screen-reader-text" href="#primary"><?php esc_html_e('Skip to content', 'expert-tech-bd'); ?></a>

    <header id="masthead" class="site-header">
        <!-- Top Bar -->
        <div class="header-top-bar">
            <div class="container">
                <div class="top-bar-left">
                    <?php
                    $phone = get_theme_mod('expert_tech_phone', '01312-663333');
                    $email = get_theme_mod('expert_tech_email', 'info@example.com');
                    ?>
                    <?php if ($phone): ?>
                        <a href="tel:<?php echo esc_attr(preg_replace('/[^0-9+]/', '', $phone)); ?>">
                            <i class="fas fa-phone-alt"></i>
                            <?php echo esc_html($phone); ?>
                        </a>
                    <?php endif; ?>
                    <?php if ($email): ?>
                        <a href="mailto:<?php echo esc_attr($email); ?>">
                            <i class="fas fa-envelope"></i>
                            <?php echo esc_html($email); ?>
                        </a>
                    <?php endif; ?>
                </div>
                <div class="top-bar-right">
                    <?php if (has_nav_menu('topbar')): ?>
                        <nav class="top-bar-menu">
                            <?php
                            wp_nav_menu(array(
                                'theme_location' => 'topbar',
                                'container'      => false,
                                'menu_class'     => '',
                                'items_wrap'     => '%3$s',
                                'depth'          => 1,
                            ));
                            ?>
                        </nav>
                    <?php else: ?>
                        <nav class="top-bar-menu">
                            <a href="<?php echo esc_url(home_url('/about-us')); ?>"><?php esc_html_e('About Us', 'expert-tech-bd'); ?></a>
                            <a href="<?php echo esc_url(home_url('/blog')); ?>"><?php esc_html_e('Blog', 'expert-tech-bd'); ?></a>
                            <a href="<?php echo esc_url(home_url('/brands')); ?>"><?php esc_html_e('Brands', 'expert-tech-bd'); ?></a>
                            <a href="<?php echo esc_url(home_url('/track-order')); ?>"><?php esc_html_e('Track Order', 'expert-tech-bd'); ?></a>
                            <a href="<?php echo esc_url(home_url('/contact')); ?>"><?php esc_html_e('Contact', 'expert-tech-bd'); ?></a>
                            <a href="<?php echo esc_url(home_url('/faqs')); ?>"><?php esc_html_e('FAQs', 'expert-tech-bd'); ?></a>
                        </nav>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <!-- Main Header -->
        <div class="header-main">
            <div class="container">
                <!-- Logo -->
                <div class="site-logo">
                    <?php if (has_custom_logo()): ?>
                        <?php the_custom_logo(); ?>
                    <?php else: ?>
                        <a href="<?php echo esc_url(home_url('/')); ?>" rel="home">
                            <h1 class="site-title"><?php bloginfo('name'); ?></h1>
                        </a>
                    <?php endif; ?>
                </div>

                <!-- Search Bar -->
                <div class="header-search">
                    <form role="search" method="get" class="search-form" action="<?php echo esc_url(home_url('/')); ?>">
                        <input type="search"
                               class="search-field"
                               placeholder="<?php esc_attr_e('Search products...', 'expert-tech-bd'); ?>"
                               value="<?php echo get_search_query(); ?>"
                               name="s"
                               id="header-search"
                               autocomplete="off">
                        <input type="hidden" name="post_type" value="product">
                        <button type="submit" class="search-submit">
                            <i class="fas fa-search"></i>
                        </button>
                    </form>
                    <div class="search-results-dropdown"></div>
                </div>

                <!-- Header Actions -->
                <div class="header-actions">
                    <?php if (function_exists('WC')): ?>
                        <!-- Account -->
                        <a href="<?php echo esc_url(wc_get_page_permalink('myaccount')); ?>" class="header-action-item">
                            <span class="icon">
                                <i class="fas fa-user"></i>
                            </span>
                            <span class="text">
                                <?php if (is_user_logged_in()): ?>
                                    <?php $current_user = wp_get_current_user(); ?>
                                    <small><?php esc_html_e('Hello', 'expert-tech-bd'); ?></small>
                                    <?php echo esc_html($current_user->display_name); ?>
                                <?php else: ?>
                                    <small><?php esc_html_e('Login', 'expert-tech-bd'); ?></small>
                                    <?php esc_html_e('My Account', 'expert-tech-bd'); ?>
                                <?php endif; ?>
                            </span>
                        </a>

                        <!-- Wishlist (if YITH Wishlist is active) -->
                        <?php if (function_exists('YITH_WCWL')): ?>
                            <a href="<?php echo esc_url(YITH_WCWL()->get_wishlist_url()); ?>" class="header-action-item">
                                <span class="icon">
                                    <i class="fas fa-heart"></i>
                                    <span class="count"><?php echo esc_html(YITH_WCWL()->count_products()); ?></span>
                                </span>
                                <span class="text">
                                    <small><?php esc_html_e('Wishlist', 'expert-tech-bd'); ?></small>
                                    <?php esc_html_e('Items', 'expert-tech-bd'); ?>
                                </span>
                            </a>
                        <?php endif; ?>

                        <!-- Cart -->
                        <a href="<?php echo esc_url(wc_get_cart_url()); ?>" class="header-action-item cart-link">
                            <span class="icon">
                                <i class="fas fa-shopping-cart"></i>
                                <span class="count cart-count"><?php echo WC()->cart->get_cart_contents_count(); ?></span>
                            </span>
                            <span class="text">
                                <small><?php esc_html_e('Cart', 'expert-tech-bd'); ?></small>
                                <span class="cart-total"><?php echo WC()->cart->get_cart_total(); ?></span>
                            </span>
                        </a>
                    <?php endif; ?>
                </div>

                <!-- Mobile Menu Toggle -->
                <button class="mobile-menu-toggle" aria-label="<?php esc_attr_e('Toggle Menu', 'expert-tech-bd'); ?>">
                    <i class="fas fa-bars"></i>
                </button>
            </div>
        </div>

        <!-- Main Navigation -->
        <nav class="header-nav" aria-label="<?php esc_attr_e('Primary Navigation', 'expert-tech-bd'); ?>">
            <div class="container">
                <div class="main-navigation">
                    <?php
                    if (has_nav_menu('primary')) {
                        wp_nav_menu(array(
                            'theme_location' => 'primary',
                            'container'      => false,
                            'menu_class'     => 'primary-menu',
                            'walker'         => new Expert_Tech_Walker_Nav_Menu(),
                            'fallback_cb'    => false,
                        ));
                    } elseif (function_exists('WC')) {
                        // Fallback to product categories
                        $categories = get_terms(array(
                            'taxonomy'   => 'product_cat',
                            'hide_empty' => true,
                            'parent'     => 0,
                            'number'     => 8,
                        ));

                        if (!is_wp_error($categories) && !empty($categories)) {
                            echo '<ul class="primary-menu">';
                            foreach ($categories as $category) {
                                $children = get_terms(array(
                                    'taxonomy'   => 'product_cat',
                                    'hide_empty' => true,
                                    'parent'     => $category->term_id,
                                ));

                                $has_children = !is_wp_error($children) && !empty($children);
                                ?>
                                <li class="<?php echo $has_children ? 'has-dropdown menu-item-has-children' : ''; ?>">
                                    <a href="<?php echo esc_url(get_term_link($category)); ?>">
                                        <?php echo esc_html($category->name); ?>
                                        <?php if ($has_children): ?>
                                            <i class="fas fa-chevron-down"></i>
                                        <?php endif; ?>
                                    </a>
                                    <?php if ($has_children): ?>
                                        <ul class="sub-menu">
                                            <?php foreach ($children as $child): ?>
                                                <li>
                                                    <a href="<?php echo esc_url(get_term_link($child)); ?>">
                                                        <?php echo esc_html($child->name); ?>
                                                    </a>
                                                </li>
                                            <?php endforeach; ?>
                                        </ul>
                                    <?php endif; ?>
                                </li>
                                <?php
                            }
                            echo '</ul>';
                        }
                    }
                    ?>
                </div>
            </div>
        </nav>
    </header>

    <!-- Mobile Navigation Overlay -->
    <div class="mobile-nav-overlay"></div>
    <nav class="mobile-nav">
        <div class="mobile-nav-header">
            <?php if (has_custom_logo()): ?>
                <?php the_custom_logo(); ?>
            <?php else: ?>
                <span class="site-title"><?php bloginfo('name'); ?></span>
            <?php endif; ?>
            <button class="mobile-nav-close">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="mobile-nav-content">
            <?php
            if (has_nav_menu('mobile')) {
                wp_nav_menu(array(
                    'theme_location' => 'mobile',
                    'container'      => false,
                    'menu_class'     => 'mobile-menu',
                ));
            } elseif (has_nav_menu('primary')) {
                wp_nav_menu(array(
                    'theme_location' => 'primary',
                    'container'      => false,
                    'menu_class'     => 'mobile-menu',
                ));
            }
            ?>
        </div>
    </nav>

    <?php if (!is_front_page()): ?>
        <?php expert_tech_breadcrumbs(); ?>
    <?php endif; ?>

    <main id="primary" class="site-main">
