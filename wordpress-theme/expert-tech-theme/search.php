<?php
/**
 * The template for displaying search results
 *
 * @package Expert_Tech_BD
 */

get_header();
?>

<div class="content-area search-area">
    <div class="container">
        <header class="search-header">
            <h1 class="search-title">
                <?php
                printf(
                    esc_html__('Search Results for: %s', 'expert-tech-bd'),
                    '<span>' . get_search_query() . '</span>'
                );
                ?>
            </h1>
            <p class="search-count">
                <?php
                global $wp_query;
                printf(
                    _n('%d result found', '%d results found', $wp_query->found_posts, 'expert-tech-bd'),
                    $wp_query->found_posts
                );
                ?>
            </p>
        </header>

        <div class="search-form-container">
            <form role="search" method="get" class="search-form" action="<?php echo esc_url(home_url('/')); ?>">
                <input type="search"
                       class="search-field"
                       placeholder="<?php esc_attr_e('Search...', 'expert-tech-bd'); ?>"
                       value="<?php echo get_search_query(); ?>"
                       name="s">
                <button type="submit" class="search-submit">
                    <i class="fas fa-search"></i>
                    <?php esc_html_e('Search', 'expert-tech-bd'); ?>
                </button>
            </form>
        </div>

        <div class="content-wrapper <?php echo is_active_sidebar('sidebar-main') ? 'has-sidebar' : ''; ?>">
            <div class="main-content">
                <?php if (have_posts()): ?>
                    <div class="search-results-list">
                        <?php while (have_posts()): the_post(); ?>
                            <article id="post-<?php the_ID(); ?>" <?php post_class('search-result-item'); ?>>
                                <?php if (has_post_thumbnail()): ?>
                                    <div class="result-thumbnail">
                                        <a href="<?php the_permalink(); ?>">
                                            <?php the_post_thumbnail('thumbnail'); ?>
                                        </a>
                                    </div>
                                <?php endif; ?>

                                <div class="result-content">
                                    <span class="result-type">
                                        <?php echo get_post_type_object(get_post_type())->labels->singular_name; ?>
                                    </span>

                                    <h2 class="result-title">
                                        <a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
                                    </h2>

                                    <div class="result-excerpt">
                                        <?php the_excerpt(); ?>
                                    </div>

                                    <a href="<?php the_permalink(); ?>" class="result-link">
                                        <?php esc_html_e('View', 'expert-tech-bd'); ?>
                                        <i class="fas fa-arrow-right"></i>
                                    </a>
                                </div>
                            </article>
                        <?php endwhile; ?>
                    </div>

                    <?php
                    the_posts_pagination(array(
                        'mid_size'  => 2,
                        'prev_text' => '<i class="fas fa-chevron-left"></i>',
                        'next_text' => '<i class="fas fa-chevron-right"></i>',
                    ));
                    ?>
                <?php else: ?>
                    <div class="no-results">
                        <i class="fas fa-search"></i>
                        <h2><?php esc_html_e('Nothing Found', 'expert-tech-bd'); ?></h2>
                        <p><?php esc_html_e('Sorry, no results were found. Please try a different search term.', 'expert-tech-bd'); ?></p>
                    </div>
                <?php endif; ?>
            </div>

            <?php if (is_active_sidebar('sidebar-main')): ?>
                <aside class="sidebar">
                    <?php dynamic_sidebar('sidebar-main'); ?>
                </aside>
            <?php endif; ?>
        </div>
    </div>
</div>

<?php
get_footer();
