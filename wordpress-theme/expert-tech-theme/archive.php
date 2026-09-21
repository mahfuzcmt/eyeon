<?php
/**
 * The template for displaying archive pages
 *
 * @package Expert_Tech_BD
 */

get_header();
?>

<div class="content-area archive-area">
    <div class="container">
        <header class="archive-header">
            <?php
            the_archive_title('<h1 class="archive-title">', '</h1>');
            the_archive_description('<div class="archive-description">', '</div>');
            ?>
        </header>

        <div class="content-wrapper <?php echo is_active_sidebar('sidebar-main') ? 'has-sidebar' : ''; ?>">
            <div class="main-content">
                <?php if (have_posts()): ?>
                    <div class="posts-grid">
                        <?php while (have_posts()): the_post(); ?>
                            <article id="post-<?php the_ID(); ?>" <?php post_class('post-card'); ?>>
                                <?php if (has_post_thumbnail()): ?>
                                    <div class="post-thumbnail">
                                        <a href="<?php the_permalink(); ?>">
                                            <?php the_post_thumbnail('large'); ?>
                                        </a>
                                    </div>
                                <?php endif; ?>

                                <div class="post-content">
                                    <div class="post-meta">
                                        <span class="post-date">
                                            <i class="far fa-calendar-alt"></i>
                                            <?php echo get_the_date(); ?>
                                        </span>
                                    </div>

                                    <h2 class="post-title">
                                        <a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
                                    </h2>

                                    <div class="post-excerpt">
                                        <?php the_excerpt(); ?>
                                    </div>

                                    <a href="<?php the_permalink(); ?>" class="btn btn-outline btn-sm">
                                        <?php esc_html_e('Read More', 'expert-tech-bd'); ?>
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
                    <div class="no-posts">
                        <h2><?php esc_html_e('Nothing Found', 'expert-tech-bd'); ?></h2>
                        <p><?php esc_html_e('No posts matched your criteria.', 'expert-tech-bd'); ?></p>
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
