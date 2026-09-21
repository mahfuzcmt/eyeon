<?php
/**
 * The template for displaying all pages
 *
 * @package Expert_Tech_BD
 */

get_header();
?>

<div class="content-area">
    <div class="container">
        <div class="page-content">
            <?php while (have_posts()): the_post(); ?>
                <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
                    <header class="page-header">
                        <h1 class="page-title"><?php the_title(); ?></h1>
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

                    <?php if (comments_open() || get_comments_number()): ?>
                        <div class="comments-section">
                            <?php comments_template(); ?>
                        </div>
                    <?php endif; ?>
                </article>
            <?php endwhile; ?>
        </div>
    </div>
</div>

<?php
get_footer();
