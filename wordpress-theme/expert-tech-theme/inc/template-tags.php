<?php
/**
 * Template Tags
 *
 * @package Expert_Tech_BD
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Display posted on date
 */
function expert_tech_posted_on() {
    $time_string = '<time class="entry-date published updated" datetime="%1$s">%2$s</time>';

    if (get_the_time('U') !== get_the_modified_time('U')) {
        $time_string = '<time class="entry-date published" datetime="%1$s">%2$s</time><time class="updated" datetime="%3$s">%4$s</time>';
    }

    $time_string = sprintf(
        $time_string,
        esc_attr(get_the_date(DATE_W3C)),
        esc_html(get_the_date()),
        esc_attr(get_the_modified_date(DATE_W3C)),
        esc_html(get_the_modified_date())
    );

    echo '<span class="posted-on">';
    echo '<i class="far fa-calendar-alt"></i> ';
    printf(
        '<a href="%1$s" rel="bookmark">%2$s</a>',
        esc_url(get_permalink()),
        $time_string
    );
    echo '</span>';
}

/**
 * Display posted by author
 */
function expert_tech_posted_by() {
    echo '<span class="byline">';
    echo '<i class="far fa-user"></i> ';
    printf(
        '<a href="%1$s">%2$s</a>',
        esc_url(get_author_posts_url(get_the_author_meta('ID'))),
        esc_html(get_the_author())
    );
    echo '</span>';
}

/**
 * Display categories
 */
function expert_tech_entry_categories() {
    if ('post' === get_post_type()) {
        $categories_list = get_the_category_list(', ');
        if ($categories_list) {
            echo '<span class="cat-links">';
            echo '<i class="far fa-folder"></i> ';
            echo $categories_list;
            echo '</span>';
        }
    }
}

/**
 * Display tags
 */
function expert_tech_entry_tags() {
    if ('post' === get_post_type()) {
        $tags_list = get_the_tag_list('', ', ');
        if ($tags_list) {
            echo '<span class="tags-links">';
            echo '<i class="fas fa-tags"></i> ';
            echo $tags_list;
            echo '</span>';
        }
    }
}

/**
 * Display comment count
 */
function expert_tech_comment_count() {
    if (!post_password_required() && (comments_open() || get_comments_number())) {
        echo '<span class="comments-link">';
        echo '<i class="far fa-comment"></i> ';
        comments_popup_link(
            sprintf(
                wp_kses(
                    __('Leave a Comment<span class="screen-reader-text"> on %s</span>', 'expert-tech-bd'),
                    array('span' => array('class' => array()))
                ),
                wp_kses_post(get_the_title())
            )
        );
        echo '</span>';
    }
}

/**
 * Display entry footer
 */
function expert_tech_entry_footer() {
    // Hide tag text for pages.
    if ('post' === get_post_type()) {
        $tags_list = get_the_tag_list('', esc_html_x(', ', 'list item separator', 'expert-tech-bd'));
        if ($tags_list) {
            printf('<span class="tags-links"><i class="fas fa-tags"></i> %s</span>', $tags_list);
        }
    }

    edit_post_link(
        sprintf(
            wp_kses(
                __('Edit <span class="screen-reader-text">%s</span>', 'expert-tech-bd'),
                array('span' => array('class' => array()))
            ),
            wp_kses_post(get_the_title())
        ),
        '<span class="edit-link">',
        '</span>'
    );
}

/**
 * Display post thumbnail
 */
function expert_tech_post_thumbnail($size = 'large') {
    if (post_password_required() || is_attachment() || !has_post_thumbnail()) {
        return;
    }

    if (is_singular()) {
        ?>
        <div class="post-thumbnail">
            <?php the_post_thumbnail($size); ?>
        </div>
        <?php
    } else {
        ?>
        <a class="post-thumbnail" href="<?php the_permalink(); ?>" aria-hidden="true" tabindex="-1">
            <?php
            the_post_thumbnail($size, array(
                'alt' => the_title_attribute(array('echo' => false)),
            ));
            ?>
        </a>
        <?php
    }
}

/**
 * Display category badge
 */
function expert_tech_category_badge() {
    $categories = get_the_category();
    if (!empty($categories)) {
        $category = $categories[0];
        printf(
            '<a href="%1$s" class="category-badge">%2$s</a>',
            esc_url(get_category_link($category->term_id)),
            esc_html($category->name)
        );
    }
}

/**
 * Display author avatar
 */
function expert_tech_author_avatar($size = 50) {
    echo get_avatar(get_the_author_meta('ID'), $size);
}

/**
 * Display author box
 */
function expert_tech_author_box() {
    $author_id = get_the_author_meta('ID');
    $author_description = get_the_author_meta('description');

    if (empty($author_description)) {
        return;
    }
    ?>
    <div class="author-box">
        <div class="author-avatar">
            <?php echo get_avatar($author_id, 100); ?>
        </div>
        <div class="author-info">
            <h4 class="author-name">
                <a href="<?php echo esc_url(get_author_posts_url($author_id)); ?>">
                    <?php the_author(); ?>
                </a>
            </h4>
            <p class="author-description"><?php echo wp_kses_post($author_description); ?></p>
            <?php
            $author_website = get_the_author_meta('url');
            if ($author_website) {
                printf(
                    '<a href="%1$s" class="author-website" target="_blank" rel="noopener noreferrer">%2$s</a>',
                    esc_url($author_website),
                    esc_html__('Visit Website', 'expert-tech-bd')
                );
            }
            ?>
        </div>
    </div>
    <?php
}

/**
 * Display post navigation
 */
function expert_tech_post_navigation() {
    $prev_post = get_previous_post();
    $next_post = get_next_post();

    if (!$prev_post && !$next_post) {
        return;
    }
    ?>
    <nav class="post-navigation" aria-label="<?php esc_attr_e('Post Navigation', 'expert-tech-bd'); ?>">
        <div class="nav-links">
            <?php if ($prev_post): ?>
                <div class="nav-previous">
                    <span class="nav-subtitle">
                        <i class="fas fa-arrow-left"></i>
                        <?php esc_html_e('Previous Post', 'expert-tech-bd'); ?>
                    </span>
                    <a href="<?php echo esc_url(get_permalink($prev_post->ID)); ?>" rel="prev">
                        <?php echo esc_html($prev_post->post_title); ?>
                    </a>
                </div>
            <?php endif; ?>

            <?php if ($next_post): ?>
                <div class="nav-next">
                    <span class="nav-subtitle">
                        <?php esc_html_e('Next Post', 'expert-tech-bd'); ?>
                        <i class="fas fa-arrow-right"></i>
                    </span>
                    <a href="<?php echo esc_url(get_permalink($next_post->ID)); ?>" rel="next">
                        <?php echo esc_html($next_post->post_title); ?>
                    </a>
                </div>
            <?php endif; ?>
        </div>
    </nav>
    <?php
}

/**
 * Display share buttons
 */
function expert_tech_share_buttons() {
    $url = urlencode(get_permalink());
    $title = urlencode(get_the_title());
    ?>
    <div class="share-buttons">
        <span class="share-label"><?php esc_html_e('Share:', 'expert-tech-bd'); ?></span>
        <a href="https://www.facebook.com/sharer/sharer.php?u=<?php echo $url; ?>"
           target="_blank" rel="noopener noreferrer" class="share-facebook" title="<?php esc_attr_e('Share on Facebook', 'expert-tech-bd'); ?>">
            <i class="fab fa-facebook-f"></i>
        </a>
        <a href="https://twitter.com/intent/tweet?url=<?php echo $url; ?>&text=<?php echo $title; ?>"
           target="_blank" rel="noopener noreferrer" class="share-twitter" title="<?php esc_attr_e('Share on Twitter', 'expert-tech-bd'); ?>">
            <i class="fab fa-twitter"></i>
        </a>
        <a href="https://www.linkedin.com/shareArticle?mini=true&url=<?php echo $url; ?>&title=<?php echo $title; ?>"
           target="_blank" rel="noopener noreferrer" class="share-linkedin" title="<?php esc_attr_e('Share on LinkedIn', 'expert-tech-bd'); ?>">
            <i class="fab fa-linkedin-in"></i>
        </a>
        <a href="https://wa.me/?text=<?php echo $title; ?> <?php echo $url; ?>"
           target="_blank" rel="noopener noreferrer" class="share-whatsapp" title="<?php esc_attr_e('Share on WhatsApp', 'expert-tech-bd'); ?>">
            <i class="fab fa-whatsapp"></i>
        </a>
        <a href="mailto:?subject=<?php echo $title; ?>&body=<?php echo $url; ?>"
           class="share-email" title="<?php esc_attr_e('Share via Email', 'expert-tech-bd'); ?>">
            <i class="fas fa-envelope"></i>
        </a>
    </div>
    <?php
}

/**
 * Display related posts
 */
function expert_tech_related_posts($post_id = null, $count = 3) {
    $post_id = $post_id ?: get_the_ID();
    $categories = get_the_category($post_id);

    if (empty($categories)) {
        return;
    }

    $category_ids = array();
    foreach ($categories as $category) {
        $category_ids[] = $category->term_id;
    }

    $args = array(
        'post_type'      => 'post',
        'posts_per_page' => $count,
        'post__not_in'   => array($post_id),
        'category__in'   => $category_ids,
    );

    $query = new WP_Query($args);

    if (!$query->have_posts()) {
        return;
    }
    ?>
    <div class="related-posts">
        <h3><?php esc_html_e('Related Posts', 'expert-tech-bd'); ?></h3>
        <div class="related-posts-grid">
            <?php while ($query->have_posts()): $query->the_post(); ?>
                <article class="related-post-card">
                    <?php if (has_post_thumbnail()): ?>
                        <a href="<?php the_permalink(); ?>" class="related-post-thumbnail">
                            <?php the_post_thumbnail('medium'); ?>
                        </a>
                    <?php endif; ?>
                    <div class="related-post-content">
                        <h4><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h4>
                        <span class="related-post-date"><?php echo get_the_date(); ?></span>
                    </div>
                </article>
            <?php endwhile; wp_reset_postdata(); ?>
        </div>
    </div>
    <?php
}

/**
 * Display product rating
 */
function expert_tech_product_rating($product_id = null) {
    if (!class_exists('WooCommerce')) {
        return;
    }

    $product = wc_get_product($product_id ?: get_the_ID());

    if (!$product) {
        return;
    }

    $rating = $product->get_average_rating();
    $count = $product->get_review_count();

    if ($rating > 0) {
        echo expert_tech_render_stars($rating, $count);
    }
}
