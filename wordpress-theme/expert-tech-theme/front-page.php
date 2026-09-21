<?php
/**
 * Front Page Template
 *
 * @package Expert_Tech_BD
 */

get_header();
?>

<!-- Hero Slider Section -->
<section class="hero-slider">
    <div class="swiper hero-swiper">
        <div class="swiper-wrapper">
            <?php
            // Get slider posts from ACF or fallback to static
            $slides = array();

            if (function_exists('get_field')) {
                $slides = get_field('hero_slides', 'option');
            }

            if (empty($slides)) {
                // Fallback static slides
                $slides = array(
                    array(
                        'image'     => EXPERT_TECH_URI . '/assets/images/slider-1.jpg',
                        'subtitle'  => 'Best Quality Products',
                        'title'     => 'Security & Surveillance Solutions',
                        'description' => 'Protect your home and business with our advanced CCTV and access control systems.',
                        'button_text' => 'Shop Now',
                        'button_url'  => function_exists('wc_get_page_permalink') ? wc_get_page_permalink('shop') : '#',
                    ),
                    array(
                        'image'     => EXPERT_TECH_URI . '/assets/images/slider-2.jpg',
                        'subtitle'  => 'BTRC Authorized',
                        'title'     => 'Professional Walkie Talkies',
                        'description' => 'Stay connected with our range of professional two-way radios for every need.',
                        'button_text' => 'Explore',
                        'button_url'  => home_url('/product-category/walkie-talkie'),
                    ),
                    array(
                        'image'     => EXPERT_TECH_URI . '/assets/images/slider-3.jpg',
                        'subtitle'  => 'Expert Support',
                        'title'     => 'Conference & PA Systems',
                        'description' => 'Complete audio solutions for conference rooms, events, and public address systems.',
                        'button_text' => 'View Products',
                        'button_url'  => home_url('/product-category/conference-systems'),
                    ),
                );
            }

            foreach ($slides as $slide):
            ?>
                <div class="swiper-slide hero-slide" style="background-image: url('<?php echo esc_url($slide['image']); ?>');">
                    <div class="container">
                        <div class="hero-content">
                            <?php if (!empty($slide['subtitle'])): ?>
                                <span class="subtitle"><?php echo esc_html($slide['subtitle']); ?></span>
                            <?php endif; ?>
                            <h1><?php echo esc_html($slide['title']); ?></h1>
                            <p><?php echo esc_html($slide['description']); ?></p>
                            <?php if (!empty($slide['button_text'])): ?>
                                <a href="<?php echo esc_url($slide['button_url']); ?>" class="btn btn-lg">
                                    <?php echo esc_html($slide['button_text']); ?>
                                    <i class="fas fa-arrow-right"></i>
                                </a>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
        <div class="swiper-pagination"></div>
        <button class="slider-nav slider-prev"><i class="fas fa-chevron-left"></i></button>
        <button class="slider-nav slider-next"><i class="fas fa-chevron-right"></i></button>
    </div>
</section>

<!-- Features Bar -->
<section class="features-bar">
    <div class="container">
        <div class="features-grid">
            <?php
            $features = array(
                array(
                    'icon'  => 'fas fa-check-circle',
                    'title' => __('Authorized Products', 'expert-tech-bd'),
                    'desc'  => __('100% Genuine & Authentic', 'expert-tech-bd'),
                ),
                array(
                    'icon'  => 'fas fa-tags',
                    'title' => __('Best Price Deal', 'expert-tech-bd'),
                    'desc'  => __('Competitive Market Prices', 'expert-tech-bd'),
                ),
                array(
                    'icon'  => 'fas fa-user-shield',
                    'title' => __('BTRC Authorized', 'expert-tech-bd'),
                    'desc'  => __('Licensed Vendor', 'expert-tech-bd'),
                ),
                array(
                    'icon'  => 'fas fa-headset',
                    'title' => __('Expert Support', 'expert-tech-bd'),
                    'desc'  => __('After Sales Service', 'expert-tech-bd'),
                ),
            );

            foreach ($features as $feature):
            ?>
                <div class="feature-item">
                    <div class="icon">
                        <i class="<?php echo esc_attr($feature['icon']); ?>"></i>
                    </div>
                    <div class="content">
                        <h4><?php echo esc_html($feature['title']); ?></h4>
                        <p><?php echo esc_html($feature['desc']); ?></p>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<!-- Categories Section -->
<?php if (function_exists('WC')): ?>
<section class="category-section section">
    <div class="container">
        <div class="section-title">
            <h2><?php esc_html_e('Shop By Category', 'expert-tech-bd'); ?></h2>
            <p><?php esc_html_e('Browse our wide range of security and technology products', 'expert-tech-bd'); ?></p>
        </div>

        <div class="category-grid">
            <?php
            $categories = expert_tech_get_featured_categories(6);

            if (!is_wp_error($categories) && !empty($categories)) {
                foreach ($categories as $category) {
                    expert_tech_category_card($category);
                }
            }
            ?>
        </div>
    </div>
</section>

<!-- Featured Products Section -->
<section class="products-section section" style="background: var(--bg-white);">
    <div class="container">
        <div class="section-title">
            <h2><?php esc_html_e('Featured Products', 'expert-tech-bd'); ?></h2>
            <p><?php esc_html_e('Discover our best-selling and most popular products', 'expert-tech-bd'); ?></p>
        </div>

        <div class="products-grid">
            <?php
            $featured_products = expert_tech_get_featured_products(8);

            if ($featured_products->have_posts()) {
                while ($featured_products->have_posts()) {
                    $featured_products->the_post();
                    expert_tech_product_card();
                }
                wp_reset_postdata();
            }
            ?>
        </div>

        <div class="section-action">
            <a href="<?php echo esc_url(wc_get_page_permalink('shop')); ?>" class="btn btn-primary btn-lg">
                <?php esc_html_e('View All Products', 'expert-tech-bd'); ?>
                <i class="fas fa-arrow-right"></i>
            </a>
        </div>
    </div>
</section>

<!-- Banner Section -->
<section class="banner-section section">
    <div class="container">
        <div class="banner-grid">
            <div class="banner-card banner-large" style="background-image: url('<?php echo esc_url(EXPERT_TECH_URI); ?>/assets/images/banner-1.jpg');">
                <div class="banner-content">
                    <span class="tag"><?php esc_html_e('Special Offer', 'expert-tech-bd'); ?></span>
                    <h3><?php esc_html_e('CCTV Packages', 'expert-tech-bd'); ?></h3>
                    <p><?php esc_html_e('Up to 30% off on selected surveillance systems', 'expert-tech-bd'); ?></p>
                    <a href="<?php echo esc_url(home_url('/product-category/cctv-surveillance')); ?>" class="btn btn-primary">
                        <?php esc_html_e('Shop Now', 'expert-tech-bd'); ?>
                    </a>
                </div>
            </div>
            <div class="banner-card" style="background-image: url('<?php echo esc_url(EXPERT_TECH_URI); ?>/assets/images/banner-2.jpg');">
                <div class="banner-content">
                    <span class="tag"><?php esc_html_e('New Arrival', 'expert-tech-bd'); ?></span>
                    <h3><?php esc_html_e('Access Control', 'expert-tech-bd'); ?></h3>
                    <a href="<?php echo esc_url(home_url('/product-category/access-control')); ?>" class="btn btn-sm btn-outline">
                        <?php esc_html_e('Explore', 'expert-tech-bd'); ?>
                    </a>
                </div>
            </div>
            <div class="banner-card" style="background-image: url('<?php echo esc_url(EXPERT_TECH_URI); ?>/assets/images/banner-3.jpg');">
                <div class="banner-content">
                    <span class="tag"><?php esc_html_e('Best Seller', 'expert-tech-bd'); ?></span>
                    <h3><?php esc_html_e('Walkie Talkies', 'expert-tech-bd'); ?></h3>
                    <a href="<?php echo esc_url(home_url('/product-category/walkie-talkie')); ?>" class="btn btn-sm btn-outline">
                        <?php esc_html_e('Explore', 'expert-tech-bd'); ?>
                    </a>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- On Sale Products -->
<section class="products-section section">
    <div class="container">
        <div class="section-title">
            <h2><?php esc_html_e('On Sale Now', 'expert-tech-bd'); ?></h2>
            <p><?php esc_html_e('Grab these amazing deals before they are gone!', 'expert-tech-bd'); ?></p>
        </div>

        <div class="products-slider">
            <div class="swiper products-swiper">
                <div class="swiper-wrapper">
                    <?php
                    $sale_products = expert_tech_get_sale_products(12);

                    if ($sale_products->have_posts()) {
                        while ($sale_products->have_posts()) {
                            $sale_products->the_post();
                            echo '<div class="swiper-slide">';
                            expert_tech_product_card();
                            echo '</div>';
                        }
                        wp_reset_postdata();
                    }
                    ?>
                </div>
                <div class="swiper-button-prev"></div>
                <div class="swiper-button-next"></div>
            </div>
        </div>
    </div>
</section>
<?php endif; ?>

<!-- CTA Section -->
<section class="cta-section">
    <div class="container">
        <h2><?php esc_html_e('Need Help Choosing the Right Product?', 'expert-tech-bd'); ?></h2>
        <p><?php esc_html_e('Our expert team is here to help you find the perfect security solution for your needs.', 'expert-tech-bd'); ?></p>
        <div class="cta-buttons">
            <a href="<?php echo esc_url(home_url('/contact')); ?>" class="btn btn-lg">
                <i class="fas fa-phone-alt"></i>
                <?php esc_html_e('Contact Us', 'expert-tech-bd'); ?>
            </a>
            <a href="tel:<?php echo esc_attr(preg_replace('/[^0-9+]/', '', get_theme_mod('expert_tech_phone', '01312663333'))); ?>" class="btn btn-lg btn-outline" style="background: transparent; border-color: white; color: white;">
                <?php echo esc_html(get_theme_mod('expert_tech_phone', '01312-663333')); ?>
            </a>
        </div>
    </div>
</section>

<!-- Brands Section -->
<section class="brands-section section">
    <div class="container">
        <div class="section-title">
            <h2><?php esc_html_e('Our Brands', 'expert-tech-bd'); ?></h2>
            <p><?php esc_html_e('We partner with leading global brands to bring you the best products', 'expert-tech-bd'); ?></p>
        </div>

        <div class="brands-slider">
            <div class="swiper brands-swiper">
                <div class="swiper-wrapper">
                    <?php
                    $brands = array('hikvision', 'dahua', 'zkteco', 'motorola', 'hytera', 'toa', 'bosch', 'ubiquiti', 'cisco');

                    foreach ($brands as $brand):
                    ?>
                        <div class="swiper-slide brand-item">
                            <img src="<?php echo esc_url(EXPERT_TECH_URI . '/assets/images/brands/' . $brand . '.png'); ?>" alt="<?php echo esc_attr(ucfirst($brand)); ?>">
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Latest Blog Posts -->
<?php
$latest_posts = new WP_Query(array(
    'posts_per_page' => 3,
    'post_status'    => 'publish',
));

if ($latest_posts->have_posts()):
?>
<section class="blog-section section" style="background: var(--bg-white);">
    <div class="container">
        <div class="section-title">
            <h2><?php esc_html_e('Latest News & Updates', 'expert-tech-bd'); ?></h2>
            <p><?php esc_html_e('Stay informed with our latest articles and industry news', 'expert-tech-bd'); ?></p>
        </div>

        <div class="blog-grid">
            <?php while ($latest_posts->have_posts()): $latest_posts->the_post(); ?>
                <article class="blog-card">
                    <?php if (has_post_thumbnail()): ?>
                        <div class="blog-image">
                            <a href="<?php the_permalink(); ?>">
                                <?php the_post_thumbnail('medium_large'); ?>
                            </a>
                        </div>
                    <?php endif; ?>
                    <div class="blog-content">
                        <div class="blog-meta">
                            <span class="date">
                                <i class="far fa-calendar-alt"></i>
                                <?php echo get_the_date(); ?>
                            </span>
                        </div>
                        <h3><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h3>
                        <p><?php echo wp_trim_words(get_the_excerpt(), 15); ?></p>
                        <a href="<?php the_permalink(); ?>" class="read-more">
                            <?php esc_html_e('Read More', 'expert-tech-bd'); ?>
                            <i class="fas fa-arrow-right"></i>
                        </a>
                    </div>
                </article>
            <?php endwhile; wp_reset_postdata(); ?>
        </div>

        <div class="section-action">
            <a href="<?php echo esc_url(get_permalink(get_option('page_for_posts'))); ?>" class="btn btn-outline btn-lg">
                <?php esc_html_e('View All Posts', 'expert-tech-bd'); ?>
            </a>
        </div>
    </div>
</section>
<?php endif; ?>

<?php
get_footer();
