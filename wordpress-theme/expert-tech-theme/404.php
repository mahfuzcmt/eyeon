<?php
/**
 * The template for displaying 404 pages
 *
 * @package Expert_Tech_BD
 */

get_header();
?>

<div class="content-area error-404-area">
    <div class="container">
        <div class="error-404-content">
            <div class="error-icon">
                <span class="error-code">404</span>
            </div>

            <h1><?php esc_html_e('Page Not Found', 'expert-tech-bd'); ?></h1>

            <p><?php esc_html_e('Oops! The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.', 'expert-tech-bd'); ?></p>

            <div class="error-actions">
                <a href="<?php echo esc_url(home_url('/')); ?>" class="btn btn-primary btn-lg">
                    <i class="fas fa-home"></i>
                    <?php esc_html_e('Go to Homepage', 'expert-tech-bd'); ?>
                </a>

                <?php if (function_exists('wc_get_page_permalink')): ?>
                    <a href="<?php echo esc_url(wc_get_page_permalink('shop')); ?>" class="btn btn-outline btn-lg">
                        <i class="fas fa-shopping-bag"></i>
                        <?php esc_html_e('Browse Products', 'expert-tech-bd'); ?>
                    </a>
                <?php endif; ?>
            </div>

            <div class="error-search">
                <p><?php esc_html_e('Or try searching:', 'expert-tech-bd'); ?></p>
                <form role="search" method="get" class="search-form" action="<?php echo esc_url(home_url('/')); ?>">
                    <input type="search"
                           class="search-field"
                           placeholder="<?php esc_attr_e('Search...', 'expert-tech-bd'); ?>"
                           name="s">
                    <button type="submit" class="search-submit">
                        <i class="fas fa-search"></i>
                    </button>
                </form>
            </div>

            <?php if (function_exists('WC')): ?>
                <div class="error-products">
                    <h3><?php esc_html_e('Popular Products', 'expert-tech-bd'); ?></h3>
                    <?php
                    $args = array(
                        'post_type'      => 'product',
                        'posts_per_page' => 4,
                        'meta_key'       => 'total_sales',
                        'orderby'        => 'meta_value_num',
                        'order'          => 'DESC',
                    );
                    $popular = new WP_Query($args);

                    if ($popular->have_posts()):
                    ?>
                        <div class="products-grid mini-grid">
                            <?php while ($popular->have_posts()): $popular->the_post();
                                $product = wc_get_product(get_the_ID());
                            ?>
                                <div class="mini-product">
                                    <a href="<?php the_permalink(); ?>">
                                        <?php the_post_thumbnail('thumbnail'); ?>
                                        <h4><?php the_title(); ?></h4>
                                        <span class="price"><?php echo $product->get_price_html(); ?></span>
                                    </a>
                                </div>
                            <?php endwhile; wp_reset_postdata(); ?>
                        </div>
                    <?php endif; ?>
                </div>
            <?php endif; ?>
        </div>
    </div>
</div>

<style>
.error-404-area {
    padding: var(--spacing-3xl) 0;
    text-align: center;
}

.error-404-content {
    max-width: 800px;
    margin: 0 auto;
}

.error-icon {
    margin-bottom: var(--spacing-xl);
}

.error-code {
    font-size: 8rem;
    font-weight: 800;
    color: var(--primary-color);
    line-height: 1;
    font-family: var(--font-secondary);
}

.error-404-content h1 {
    font-size: 2rem;
    margin-bottom: var(--spacing-md);
}

.error-404-content > p {
    color: var(--text-secondary);
    font-size: 1.125rem;
    margin-bottom: var(--spacing-xl);
}

.error-actions {
    display: flex;
    gap: var(--spacing-md);
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: var(--spacing-2xl);
}

.error-search {
    background: var(--bg-white);
    padding: var(--spacing-xl);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-2xl);
}

.error-search p {
    margin-bottom: var(--spacing-md);
    color: var(--text-secondary);
}

.error-search .search-form {
    display: flex;
    max-width: 500px;
    margin: 0 auto;
    border: 2px solid var(--border-color);
    border-radius: var(--radius-md);
    overflow: hidden;
}

.error-search .search-field {
    flex: 1;
    padding: 15px 20px;
    border: none;
    font-size: 1rem;
    outline: none;
}

.error-search .search-submit {
    background: var(--primary-color);
    color: var(--bg-white);
    border: none;
    padding: 15px 25px;
    font-size: 1rem;
    cursor: pointer;
}

.error-products {
    text-align: center;
}

.error-products h3 {
    margin-bottom: var(--spacing-lg);
}

.mini-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--spacing-md);
}

.mini-product {
    background: var(--bg-white);
    border-radius: var(--radius-md);
    padding: var(--spacing-md);
    text-align: center;
}

.mini-product img {
    width: 100px;
    height: 100px;
    object-fit: contain;
    margin: 0 auto var(--spacing-sm);
}

.mini-product h4 {
    font-size: 0.875rem;
    margin-bottom: var(--spacing-xs);
}

.mini-product a {
    color: var(--text-primary);
}

.mini-product .price {
    color: var(--primary-color);
    font-weight: 600;
}

@media (max-width: 767px) {
    .error-code {
        font-size: 5rem;
    }

    .mini-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}
</style>

<?php
get_footer();
