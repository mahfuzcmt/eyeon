/**
 * Expert Tech BD - Main JavaScript
 *
 * @package Expert_Tech_BD
 */

(function($) {
    'use strict';

    // Global object
    window.ExpertTech = window.ExpertTech || {};

    /**
     * Initialize all components
     */
    ExpertTech.init = function() {
        this.initMobileMenu();
        this.initStickyHeader();
        this.initHeroSlider();
        this.initProductsSlider();
        this.initBrandsSlider();
        this.initQuickView();
        this.initAjaxAddToCart();
        this.initLiveSearch();
        this.initBackToTop();
        this.initQuantityButtons();
        this.initNewsletterForm();
        this.initDropdownMenu();
        this.initLazyLoad();
    };

    /**
     * Mobile Menu
     */
    ExpertTech.initMobileMenu = function() {
        var $toggle = $('.mobile-menu-toggle');
        var $nav = $('.mobile-nav');
        var $overlay = $('.mobile-nav-overlay');
        var $close = $('.mobile-nav-close');

        function openMenu() {
            $nav.addClass('active');
            $overlay.addClass('active');
            $('body').addClass('menu-open');
        }

        function closeMenu() {
            $nav.removeClass('active');
            $overlay.removeClass('active');
            $('body').removeClass('menu-open');
        }

        $toggle.on('click', openMenu);
        $close.on('click', closeMenu);
        $overlay.on('click', closeMenu);

        // Close on escape key
        $(document).on('keydown', function(e) {
            if (e.keyCode === 27 && $nav.hasClass('active')) {
                closeMenu();
            }
        });

        // Submenu toggle for mobile
        $('.mobile-nav .menu-item-has-children > a').on('click', function(e) {
            if ($(window).width() < 992) {
                e.preventDefault();
                $(this).parent().toggleClass('submenu-open');
                $(this).siblings('.sub-menu').slideToggle(300);
            }
        });
    };

    /**
     * Sticky Header
     */
    ExpertTech.initStickyHeader = function() {
        var $header = $('.site-header');
        var headerHeight = $header.outerHeight();
        var scrollPos = 0;

        $(window).on('scroll', function() {
            var currentScroll = $(this).scrollTop();

            if (currentScroll > headerHeight) {
                $header.addClass('is-sticky');

                if (currentScroll > scrollPos) {
                    // Scrolling down
                    $header.addClass('is-hidden');
                } else {
                    // Scrolling up
                    $header.removeClass('is-hidden');
                }
            } else {
                $header.removeClass('is-sticky is-hidden');
            }

            scrollPos = currentScroll;
        });
    };

    /**
     * Hero Slider
     */
    ExpertTech.initHeroSlider = function() {
        if ($('.hero-swiper').length) {
            new Swiper('.hero-swiper', {
                loop: true,
                autoplay: {
                    delay: 5000,
                    disableOnInteraction: false,
                },
                effect: 'fade',
                fadeEffect: {
                    crossFade: true
                },
                pagination: {
                    el: '.swiper-pagination',
                    clickable: true,
                },
                navigation: {
                    nextEl: '.slider-next',
                    prevEl: '.slider-prev',
                },
            });
        }
    };

    /**
     * Products Slider
     */
    ExpertTech.initProductsSlider = function() {
        if ($('.products-swiper').length) {
            new Swiper('.products-swiper', {
                slidesPerView: 1,
                spaceBetween: 20,
                loop: true,
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                },
                breakpoints: {
                    576: {
                        slidesPerView: 2,
                    },
                    768: {
                        slidesPerView: 3,
                    },
                    1024: {
                        slidesPerView: 4,
                    },
                },
            });
        }
    };

    /**
     * Brands Slider
     */
    ExpertTech.initBrandsSlider = function() {
        if ($('.brands-swiper').length) {
            new Swiper('.brands-swiper', {
                slidesPerView: 2,
                spaceBetween: 30,
                loop: true,
                autoplay: {
                    delay: 3000,
                    disableOnInteraction: false,
                },
                breakpoints: {
                    480: {
                        slidesPerView: 3,
                    },
                    768: {
                        slidesPerView: 4,
                    },
                    1024: {
                        slidesPerView: 6,
                    },
                    1200: {
                        slidesPerView: 8,
                    },
                },
            });
        }
    };

    /**
     * Quick View Modal
     */
    ExpertTech.initQuickView = function() {
        var $modal = $('#quick-view-modal');
        var $content = $modal.find('.quick-view-content');

        // Open quick view
        $(document).on('click', '.quick-view-btn', function(e) {
            e.preventDefault();
            var productId = $(this).data('product-id');

            // Show loader
            $modal.addClass('active loading');
            $content.html('<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>');

            // Fetch product data
            $.ajax({
                url: expertTech.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'expert_tech_quick_view',
                    product_id: productId,
                    nonce: expertTech.nonce
                },
                success: function(response) {
                    $modal.removeClass('loading');
                    if (response.success) {
                        $content.html(response.data.html);
                    } else {
                        $content.html('<p class="error">' + response.data + '</p>');
                    }
                },
                error: function() {
                    $modal.removeClass('loading');
                    $content.html('<p class="error">Failed to load product</p>');
                }
            });
        });

        // Close quick view
        $modal.on('click', '.quick-view-close, .quick-view-overlay', function() {
            $modal.removeClass('active');
        });

        // Close on escape
        $(document).on('keydown', function(e) {
            if (e.keyCode === 27 && $modal.hasClass('active')) {
                $modal.removeClass('active');
            }
        });
    };

    /**
     * AJAX Add to Cart
     */
    ExpertTech.initAjaxAddToCart = function() {
        $(document).on('click', '.ajax-add-cart', function(e) {
            e.preventDefault();
            var $btn = $(this);
            var productId = $btn.data('product-id');
            var originalText = $btn.html();

            // Show loading
            $btn.addClass('loading').html('<i class="fas fa-spinner fa-spin"></i>');

            $.ajax({
                url: expertTech.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'expert_tech_add_to_cart',
                    product_id: productId,
                    quantity: 1,
                    nonce: expertTech.nonce
                },
                success: function(response) {
                    $btn.removeClass('loading');
                    if (response.success) {
                        // Update cart count
                        $('.cart-count').text(response.data.cart_count);
                        $('.cart-total').html(response.data.cart_total);

                        // Show success
                        $btn.addClass('added').html('<i class="fas fa-check"></i> Added');

                        // Show notification
                        ExpertTech.showNotification(response.data.message, 'success');

                        setTimeout(function() {
                            $btn.removeClass('added').html(originalText);
                        }, 2000);
                    } else {
                        $btn.html(originalText);
                        ExpertTech.showNotification(response.data, 'error');
                    }
                },
                error: function() {
                    $btn.removeClass('loading').html(originalText);
                    ExpertTech.showNotification('Failed to add to cart', 'error');
                }
            });
        });
    };

    /**
     * Live Search
     */
    ExpertTech.initLiveSearch = function() {
        var $searchForm = $('.header-search .search-form');
        var $searchInput = $searchForm.find('.search-field');
        var $dropdown = $('.search-results-dropdown');
        var searchTimeout;

        $searchInput.on('input', function() {
            var query = $(this).val();

            clearTimeout(searchTimeout);

            if (query.length < 3) {
                $dropdown.removeClass('active').empty();
                return;
            }

            searchTimeout = setTimeout(function() {
                $.ajax({
                    url: expertTech.ajaxUrl,
                    type: 'POST',
                    data: {
                        action: 'expert_tech_live_search',
                        search: query,
                        nonce: expertTech.nonce
                    },
                    success: function(response) {
                        if (response.success && response.data.products.length) {
                            var html = '<div class="search-results-list">';

                            response.data.products.forEach(function(product) {
                                html += '<a href="' + product.url + '" class="search-result-item">';
                                html += '<img src="' + product.image + '" alt="' + product.title + '">';
                                html += '<div class="search-result-info">';
                                html += '<h4>' + product.title + '</h4>';
                                html += '<span class="category">' + product.category + '</span>';
                                html += '<span class="price">' + product.price + '</span>';
                                html += '</div>';
                                html += '</a>';
                            });

                            html += '</div>';
                            html += '<a href="' + expertTech.homeUrl + '?s=' + query + '&post_type=product" class="view-all-results">View All Results</a>';

                            $dropdown.html(html).addClass('active');
                        } else {
                            $dropdown.html('<p class="no-results">No products found</p>').addClass('active');
                        }
                    }
                });
            }, 300);
        });

        // Close on click outside
        $(document).on('click', function(e) {
            if (!$(e.target).closest('.header-search').length) {
                $dropdown.removeClass('active');
            }
        });
    };

    /**
     * Back to Top Button
     */
    ExpertTech.initBackToTop = function() {
        var $btn = $('#back-to-top');

        $(window).on('scroll', function() {
            if ($(this).scrollTop() > 500) {
                $btn.addClass('visible');
            } else {
                $btn.removeClass('visible');
            }
        });

        $btn.on('click', function() {
            $('html, body').animate({ scrollTop: 0 }, 500);
        });
    };

    /**
     * Quantity Buttons
     */
    ExpertTech.initQuantityButtons = function() {
        $(document).on('click', '.quantity-btn', function() {
            var $input = $(this).siblings('input.qty');
            var currentVal = parseInt($input.val()) || 1;
            var min = parseInt($input.attr('min')) || 1;
            var max = parseInt($input.attr('max')) || 9999;

            if ($(this).hasClass('qty-plus')) {
                if (currentVal < max) {
                    $input.val(currentVal + 1).trigger('change');
                }
            } else {
                if (currentVal > min) {
                    $input.val(currentVal - 1).trigger('change');
                }
            }
        });
    };

    /**
     * Newsletter Form
     */
    ExpertTech.initNewsletterForm = function() {
        $('.newsletter-form').on('submit', function(e) {
            e.preventDefault();
            var $form = $(this);
            var email = $form.find('input[type="email"]').val();

            // Simple validation
            if (!email || !ExpertTech.isValidEmail(email)) {
                ExpertTech.showNotification('Please enter a valid email address', 'error');
                return;
            }

            // Submit (you can add your newsletter API here)
            ExpertTech.showNotification('Thank you for subscribing!', 'success');
            $form.find('input[type="email"]').val('');
        });
    };

    /**
     * Dropdown Menu Enhancement
     */
    ExpertTech.initDropdownMenu = function() {
        var $menuItems = $('.main-navigation .menu-item-has-children');

        $menuItems.each(function() {
            var $item = $(this);
            var $submenu = $item.find('> .sub-menu');

            // Check if submenu would go off screen
            $item.on('mouseenter', function() {
                var offset = $submenu.offset();
                var width = $submenu.outerWidth();
                var windowWidth = $(window).width();

                if (offset && (offset.left + width > windowWidth)) {
                    $submenu.addClass('submenu-left');
                }
            });
        });
    };

    /**
     * Lazy Loading Images
     */
    ExpertTech.initLazyLoad = function() {
        if ('IntersectionObserver' in window) {
            var lazyImages = document.querySelectorAll('img[data-src]');

            var imageObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        var image = entry.target;
                        image.src = image.dataset.src;
                        image.classList.remove('lazy');
                        imageObserver.unobserve(image);
                    }
                });
            });

            lazyImages.forEach(function(image) {
                imageObserver.observe(image);
            });
        }
    };

    /**
     * Show Notification
     */
    ExpertTech.showNotification = function(message, type) {
        type = type || 'info';

        var $notification = $('<div class="et-notification ' + type + '">' +
            '<span class="message">' + message + '</span>' +
            '<button class="close"><i class="fas fa-times"></i></button>' +
            '</div>');

        $('body').append($notification);

        setTimeout(function() {
            $notification.addClass('visible');
        }, 100);

        // Auto close after 5 seconds
        setTimeout(function() {
            $notification.removeClass('visible');
            setTimeout(function() {
                $notification.remove();
            }, 300);
        }, 5000);

        // Close on click
        $notification.find('.close').on('click', function() {
            $notification.removeClass('visible');
            setTimeout(function() {
                $notification.remove();
            }, 300);
        });
    };

    /**
     * Validate Email
     */
    ExpertTech.isValidEmail = function(email) {
        var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    /**
     * Debounce Function
     */
    ExpertTech.debounce = function(func, wait) {
        var timeout;
        return function() {
            var context = this;
            var args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                func.apply(context, args);
            }, wait);
        };
    };

    /**
     * Throttle Function
     */
    ExpertTech.throttle = function(func, limit) {
        var inThrottle;
        return function() {
            var args = arguments;
            var context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(function() {
                    inThrottle = false;
                }, limit);
            }
        };
    };

    // Initialize on DOM ready
    $(document).ready(function() {
        ExpertTech.init();
    });

    // Reinitialize on AJAX complete (for WooCommerce)
    $(document).ajaxComplete(function() {
        ExpertTech.initQuantityButtons();
    });

})(jQuery);
