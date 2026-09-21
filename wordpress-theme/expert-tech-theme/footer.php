    </main><!-- #primary -->

    <footer id="colophon" class="site-footer">
        <!-- Main Footer -->
        <div class="footer-main">
            <div class="container">
                <div class="footer-grid">
                    <!-- Footer About -->
                    <div class="footer-widget footer-about">
                        <?php if (has_custom_logo()): ?>
                            <div class="footer-logo">
                                <?php the_custom_logo(); ?>
                            </div>
                        <?php else: ?>
                            <h3 class="site-title"><?php bloginfo('name'); ?></h3>
                        <?php endif; ?>

                        <?php
                        $about_text = get_theme_mod('expert_tech_footer_about', 'We are a leading provider of security and technology solutions in Bangladesh. BTRC authorized vendor with expert engineers and exceptional after-sales service.');
                        ?>
                        <p><?php echo esc_html($about_text); ?></p>

                        <ul class="footer-contact-info">
                            <?php
                            $address = get_theme_mod('expert_tech_address', 'House# 123, Road# 10, Dhanmondi, Dhaka-1205, Bangladesh');
                            $phone = get_theme_mod('expert_tech_phone', '01312-663333');
                            $email = get_theme_mod('expert_tech_email', 'info@example.com');
                            ?>
                            <?php if ($address): ?>
                                <li>
                                    <span class="icon"><i class="fas fa-map-marker-alt"></i></span>
                                    <span><?php echo wp_kses_post($address); ?></span>
                                </li>
                            <?php endif; ?>
                            <?php if ($phone): ?>
                                <li>
                                    <span class="icon"><i class="fas fa-phone-alt"></i></span>
                                    <a href="tel:<?php echo esc_attr(preg_replace('/[^0-9+]/', '', $phone)); ?>">
                                        <?php echo esc_html($phone); ?>
                                    </a>
                                </li>
                            <?php endif; ?>
                            <?php if ($email): ?>
                                <li>
                                    <span class="icon"><i class="fas fa-envelope"></i></span>
                                    <a href="mailto:<?php echo esc_attr($email); ?>">
                                        <?php echo esc_html($email); ?>
                                    </a>
                                </li>
                            <?php endif; ?>
                        </ul>

                        <div class="footer-social">
                            <?php
                            $social_links = array(
                                'facebook'  => array('icon' => 'fab fa-facebook-f', 'url' => get_theme_mod('expert_tech_facebook', '')),
                                'twitter'   => array('icon' => 'fab fa-twitter', 'url' => get_theme_mod('expert_tech_twitter', '')),
                                'instagram' => array('icon' => 'fab fa-instagram', 'url' => get_theme_mod('expert_tech_instagram', '')),
                                'linkedin'  => array('icon' => 'fab fa-linkedin-in', 'url' => get_theme_mod('expert_tech_linkedin', '')),
                                'youtube'   => array('icon' => 'fab fa-youtube', 'url' => get_theme_mod('expert_tech_youtube', '')),
                                'whatsapp'  => array('icon' => 'fab fa-whatsapp', 'url' => get_theme_mod('expert_tech_whatsapp', '')),
                            );

                            foreach ($social_links as $platform => $data) {
                                if (!empty($data['url'])) {
                                    ?>
                                    <a href="<?php echo esc_url($data['url']); ?>" target="_blank" rel="noopener noreferrer" aria-label="<?php echo esc_attr(ucfirst($platform)); ?>">
                                        <i class="<?php echo esc_attr($data['icon']); ?>"></i>
                                    </a>
                                    <?php
                                }
                            }
                            ?>
                        </div>
                    </div>

                    <!-- Quick Links -->
                    <div class="footer-widget">
                        <h4><?php esc_html_e('Quick Links', 'expert-tech-bd'); ?></h4>
                        <?php if (has_nav_menu('footer-1')): ?>
                            <?php
                            wp_nav_menu(array(
                                'theme_location' => 'footer-1',
                                'container'      => false,
                                'menu_class'     => 'footer-links',
                                'depth'          => 1,
                            ));
                            ?>
                        <?php else: ?>
                            <ul class="footer-links">
                                <li><a href="<?php echo esc_url(home_url('/about-us')); ?>"><?php esc_html_e('About Us', 'expert-tech-bd'); ?></a></li>
                                <li><a href="<?php echo esc_url(home_url('/contact')); ?>"><?php esc_html_e('Contact Us', 'expert-tech-bd'); ?></a></li>
                                <li><a href="<?php echo esc_url(home_url('/blog')); ?>"><?php esc_html_e('Blog', 'expert-tech-bd'); ?></a></li>
                                <li><a href="<?php echo esc_url(home_url('/faqs')); ?>"><?php esc_html_e('FAQs', 'expert-tech-bd'); ?></a></li>
                                <li><a href="<?php echo esc_url(home_url('/privacy-policy')); ?>"><?php esc_html_e('Privacy Policy', 'expert-tech-bd'); ?></a></li>
                                <li><a href="<?php echo esc_url(home_url('/terms-conditions')); ?>"><?php esc_html_e('Terms & Conditions', 'expert-tech-bd'); ?></a></li>
                            </ul>
                        <?php endif; ?>
                    </div>

                    <!-- Customer Service -->
                    <div class="footer-widget">
                        <h4><?php esc_html_e('Customer Service', 'expert-tech-bd'); ?></h4>
                        <?php if (has_nav_menu('footer-2')): ?>
                            <?php
                            wp_nav_menu(array(
                                'theme_location' => 'footer-2',
                                'container'      => false,
                                'menu_class'     => 'footer-links',
                                'depth'          => 1,
                            ));
                            ?>
                        <?php elseif (function_exists('WC')): ?>
                            <ul class="footer-links">
                                <li><a href="<?php echo esc_url(wc_get_page_permalink('myaccount')); ?>"><?php esc_html_e('My Account', 'expert-tech-bd'); ?></a></li>
                                <li><a href="<?php echo esc_url(home_url('/track-order')); ?>"><?php esc_html_e('Track Your Order', 'expert-tech-bd'); ?></a></li>
                                <li><a href="<?php echo esc_url(wc_get_cart_url()); ?>"><?php esc_html_e('Shopping Cart', 'expert-tech-bd'); ?></a></li>
                                <li><a href="<?php echo esc_url(home_url('/returns-refunds')); ?>"><?php esc_html_e('Returns & Refunds', 'expert-tech-bd'); ?></a></li>
                                <li><a href="<?php echo esc_url(home_url('/shipping-delivery')); ?>"><?php esc_html_e('Shipping & Delivery', 'expert-tech-bd'); ?></a></li>
                                <li><a href="<?php echo esc_url(home_url('/support')); ?>"><?php esc_html_e('Support', 'expert-tech-bd'); ?></a></li>
                            </ul>
                        <?php endif; ?>
                    </div>

                    <!-- Newsletter -->
                    <div class="footer-widget">
                        <h4><?php esc_html_e('Newsletter', 'expert-tech-bd'); ?></h4>
                        <p><?php esc_html_e('Subscribe to our newsletter for the latest updates, offers, and product news.', 'expert-tech-bd'); ?></p>
                        <div class="footer-newsletter">
                            <form action="#" method="post" class="newsletter-form">
                                <input type="email" name="email" placeholder="<?php esc_attr_e('Enter your email', 'expert-tech-bd'); ?>" required>
                                <button type="submit">
                                    <i class="fas fa-paper-plane"></i>
                                </button>
                            </form>
                        </div>

                        <?php if (is_active_sidebar('footer-4')): ?>
                            <?php dynamic_sidebar('footer-4'); ?>
                        <?php else: ?>
                            <div class="footer-certifications">
                                <h5><?php esc_html_e('We Are Certified', 'expert-tech-bd'); ?></h5>
                                <div class="certification-badges">
                                    <span class="badge">BTRC Authorized</span>
                                    <span class="badge">ISO Certified</span>
                                </div>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer Bottom -->
        <div class="footer-bottom">
            <div class="container">
                <p>
                    &copy; <?php echo date('Y'); ?> <?php bloginfo('name'); ?>.
                    <?php esc_html_e('All Rights Reserved.', 'expert-tech-bd'); ?>
                    <?php
                    $developer_name = get_theme_mod('expert_tech_developer_name', 'Web Innovation');
                    $developer_url = get_theme_mod('expert_tech_developer_url', '#');
                    ?>
                    <?php if ($developer_name): ?>
                        <?php esc_html_e('Developed by', 'expert-tech-bd'); ?>
                        <a href="<?php echo esc_url($developer_url); ?>" target="_blank" rel="noopener">
                            <?php echo esc_html($developer_name); ?>
                        </a>
                    <?php endif; ?>
                </p>

                <div class="payment-methods">
                    <?php
                    $payment_icons = array('bkash', 'nagad', 'visa', 'mastercard', 'amex', 'cod');
                    foreach ($payment_icons as $icon):
                        $icon_url = EXPERT_TECH_URI . '/assets/images/payments/' . $icon . '.png';
                        if (file_exists(EXPERT_TECH_DIR . '/assets/images/payments/' . $icon . '.png')):
                    ?>
                        <img src="<?php echo esc_url($icon_url); ?>" alt="<?php echo esc_attr(ucfirst($icon)); ?>">
                    <?php
                        endif;
                    endforeach;
                    ?>
                </div>
            </div>
        </div>
    </footer><!-- #colophon -->

</div><!-- #page -->

<!-- Quick View Modal -->
<div class="quick-view-modal" id="quick-view-modal">
    <div class="quick-view-overlay"></div>
    <div class="quick-view-container">
        <button class="quick-view-close">
            <i class="fas fa-times"></i>
        </button>
        <div class="quick-view-content">
            <!-- Content loaded via AJAX -->
        </div>
    </div>
</div>

<!-- Back to Top Button -->
<button class="back-to-top" id="back-to-top" aria-label="<?php esc_attr_e('Back to Top', 'expert-tech-bd'); ?>">
    <i class="fas fa-arrow-up"></i>
</button>

<?php wp_footer(); ?>

</body>
</html>
