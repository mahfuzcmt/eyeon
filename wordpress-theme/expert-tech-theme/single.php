<?php
/**
 * The template for displaying single posts
 *
 * @package Expert_Tech_BD
 */

get_header();
?>

<div class="content-area single-post-area">
    <div class="container">
        <div class="content-wrapper <?php echo is_active_sidebar('sidebar-main') ? 'has-sidebar' : ''; ?>">
            <div class="main-content">
                <?php while (have_posts()): the_post(); ?>
                    <article id="post-<?php the_ID(); ?>" <?php post_class('single-post'); ?>>
                        <?php if (has_post_thumbnail()): ?>
                            <div class="post-featured-image">
                                <?php the_post_thumbnail('large'); ?>
                            </div>
                        <?php endif; ?>

                        <header class="entry-header">
                            <div class="entry-meta">
                                <span class="post-author">
                                    <i class="fas fa-user"></i>
                                    <?php the_author(); ?>
                                </span>
                                <span class="post-date">
                                    <i class="far fa-calendar-alt"></i>
                                    <?php echo get_the_date(); ?>
                                </span>
                                <span class="post-category">
                                    <i class="far fa-folder"></i>
                                    <?php the_category(', '); ?>
                                </span>
                                <?php if (comments_open()): ?>
                                    <span class="post-comments">
                                        <i class="far fa-comment"></i>
                                        <?php comments_number(); ?>
                                    </span>
                                <?php endif; ?>
                            </div>

                            <h1 class="entry-title"><?php the_title(); ?></h1>
                        </header>

                        <div class="entry-content">
                            <?php
                            the_content();

                            wp_link_pages(array(
                                'before' => '<div class="page-links">' . esc_html__('Pages:', 'expert-tech-bd'),
                                'after'  => '</div>',
                            ));
                            ?>
                        </div>

                        <?php if (has_tag()): ?>
                            <footer class="entry-footer">
                                <div class="post-tags">
                                    <span class="tags-label"><i class="fas fa-tags"></i> <?php esc_html_e('Tags:', 'expert-tech-bd'); ?></span>
                                    <?php the_tags('', '', ''); ?>
                                </div>
                            </footer>
                        <?php endif; ?>

                        <!-- Share Buttons -->
                        <div class="post-share">
                            <span class="share-label"><?php esc_html_e('Share:', 'expert-tech-bd'); ?></span>
                            <div class="share-buttons">
                                <a href="https://www.facebook.com/sharer/sharer.php?u=<?php the_permalink(); ?>" target="_blank" class="share-facebook">
                                    <i class="fab fa-facebook-f"></i>
                                </a>
                                <a href="https://twitter.com/intent/tweet?url=<?php the_permalink(); ?>&text=<?php the_title(); ?>" target="_blank" class="share-twitter">
                                    <i class="fab fa-twitter"></i>
                                </a>
                                <a href="https://www.linkedin.com/shareArticle?mini=true&url=<?php the_permalink(); ?>&title=<?php the_title(); ?>" target="_blank" class="share-linkedin">
                                    <i class="fab fa-linkedin-in"></i>
                                </a>
                                <a href="https://wa.me/?text=<?php the_title(); ?> <?php the_permalink(); ?>" target="_blank" class="share-whatsapp">
                                    <i class="fab fa-whatsapp"></i>
                                </a>
                            </div>
                        </div>

                        <!-- Author Box -->
                        <div class="author-box">
                            <div class="author-avatar">
                                <?php echo get_avatar(get_the_author_meta('ID'), 100); ?>
                            </div>
                            <div class="author-info">
                                <h4 class="author-name"><?php the_author(); ?></h4>
                                <p class="author-bio"><?php echo get_the_author_meta('description'); ?></p>
                            </div>
                        </div>

                        <!-- Post Navigation -->
                        <nav class="post-navigation">
                            <div class="nav-links">
                                <?php
                                $prev_post = get_previous_post();
                                $next_post = get_next_post();
                                ?>
                                <?php if ($prev_post): ?>
                                    <div class="nav-previous">
                                        <span class="nav-subtitle"><i class="fas fa-chevron-left"></i> <?php esc_html_e('Previous', 'expert-tech-bd'); ?></span>
                                        <a href="<?php echo get_permalink($prev_post->ID); ?>">
                                            <?php echo esc_html($prev_post->post_title); ?>
                                        </a>
                                    </div>
                                <?php endif; ?>
                                <?php if ($next_post): ?>
                                    <div class="nav-next">
                                        <span class="nav-subtitle"><?php esc_html_e('Next', 'expert-tech-bd'); ?> <i class="fas fa-chevron-right"></i></span>
                                        <a href="<?php echo get_permalink($next_post->ID); ?>">
                                            <?php echo esc_html($next_post->post_title); ?>
                                        </a>
                                    </div>
                                <?php endif; ?>
                            </div>
                        </nav>

                        <!-- Related Posts -->
                        <?php
                        $categories = get_the_category();
                        if (!empty($categories)):
                            $category_ids = array();
                            foreach ($categories as $category) {
                                $category_ids[] = $category->term_id;
                            }

                            $related_query = new WP_Query(array(
                                'post_type'      => 'post',
                                'category__in'   => $category_ids,
                                'post__not_in'   => array(get_the_ID()),
                                'posts_per_page' => 3,
                            ));

                            if ($related_query->have_posts()):
                        ?>
                            <div class="related-posts">
                                <h3><?php esc_html_e('Related Posts', 'expert-tech-bd'); ?></h3>
                                <div class="related-posts-grid">
                                    <?php while ($related_query->have_posts()): $related_query->the_post(); ?>
                                        <article class="related-post-card">
                                            <?php if (has_post_thumbnail()): ?>
                                                <a href="<?php the_permalink(); ?>" class="related-post-image">
                                                    <?php the_post_thumbnail('medium'); ?>
                                                </a>
                                            <?php endif; ?>
                                            <h4><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h4>
                                            <span class="date"><?php echo get_the_date(); ?></span>
                                        </article>
                                    <?php endwhile; wp_reset_postdata(); ?>
                                </div>
                            </div>
                        <?php endif; endif; ?>

                        <?php if (comments_open() || get_comments_number()): ?>
                            <div class="comments-section">
                                <?php comments_template(); ?>
                            </div>
                        <?php endif; ?>
                    </article>
                <?php endwhile; ?>
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
