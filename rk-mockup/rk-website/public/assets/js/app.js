/**
 * Rashed Khan Website - Frontend JavaScript
 */

(function() {
    'use strict';

    // DOM Ready
    document.addEventListener('DOMContentLoaded', function() {
        initMobileMenu();
        initSmoothScroll();
        initFormValidation();
        initLazyImages();
        initBackToTop();
        initAlertDismiss();
    });

    /**
     * Mobile Menu Toggle
     */
    function initMobileMenu() {
        const menuButton = document.getElementById('mobile-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');
        const closeButton = document.getElementById('mobile-menu-close');

        if (!menuButton || !mobileMenu) return;

        menuButton.addEventListener('click', function() {
            mobileMenu.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        });

        if (closeButton) {
            closeButton.addEventListener('click', function() {
                mobileMenu.classList.add('hidden');
                document.body.style.overflow = '';
            });
        }

        // Close on overlay click
        mobileMenu.addEventListener('click', function(e) {
            if (e.target === mobileMenu) {
                mobileMenu.classList.add('hidden');
                document.body.style.overflow = '';
            }
        });

        // Close on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && !mobileMenu.classList.contains('hidden')) {
                mobileMenu.classList.add('hidden');
                document.body.style.overflow = '';
            }
        });
    }

    /**
     * Smooth Scroll for Anchor Links
     */
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
            anchor.addEventListener('click', function(e) {
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;

                const target = document.querySelector(targetId);
                if (!target) return;

                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            });
        });
    }

    /**
     * Form Validation Helpers
     */
    function initFormValidation() {
        // Phone number validation (Bangladesh)
        document.querySelectorAll('input[type="tel"]').forEach(function(input) {
            input.addEventListener('blur', function() {
                const value = this.value.trim();
                const isValid = /^01[3-9]\d{8}$/.test(value);

                if (value && !isValid) {
                    this.classList.add('border-red-500');
                    showInputError(this, 'সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)');
                } else {
                    this.classList.remove('border-red-500');
                    hideInputError(this);
                }
            });
        });

        // Email validation
        document.querySelectorAll('input[type="email"]').forEach(function(input) {
            input.addEventListener('blur', function() {
                const value = this.value.trim();
                const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

                if (value && !isValid) {
                    this.classList.add('border-red-500');
                    showInputError(this, 'সঠিক ইমেইল ঠিকানা দিন');
                } else {
                    this.classList.remove('border-red-500');
                    hideInputError(this);
                }
            });
        });
    }

    function showInputError(input, message) {
        hideInputError(input);
        const error = document.createElement('p');
        error.className = 'text-xs text-red-500 mt-1 input-error';
        error.textContent = message;
        input.parentNode.appendChild(error);
    }

    function hideInputError(input) {
        const existing = input.parentNode.querySelector('.input-error');
        if (existing) existing.remove();
    }

    /**
     * Lazy Load Images
     */
    function initLazyImages() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                        }
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            });

            document.querySelectorAll('img.lazy').forEach(function(img) {
                imageObserver.observe(img);
            });
        } else {
            // Fallback for older browsers
            document.querySelectorAll('img.lazy').forEach(function(img) {
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                }
            });
        }
    }

    /**
     * Back to Top Button
     */
    function initBackToTop() {
        const button = document.getElementById('back-to-top');
        if (!button) return;

        window.addEventListener('scroll', function() {
            if (window.scrollY > 300) {
                button.classList.remove('hidden');
            } else {
                button.classList.add('hidden');
            }
        });

        button.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    /**
     * Alert/Flash Message Dismiss
     */
    function initAlertDismiss() {
        document.querySelectorAll('[data-dismiss="alert"]').forEach(function(button) {
            button.addEventListener('click', function() {
                const alert = this.closest('.alert');
                if (alert) {
                    alert.style.opacity = '0';
                    alert.style.transform = 'translateY(-10px)';
                    setTimeout(function() {
                        alert.remove();
                    }, 300);
                }
            });
        });

        // Auto-dismiss after 5 seconds
        document.querySelectorAll('.alert[data-auto-dismiss]').forEach(function(alert) {
            setTimeout(function() {
                if (alert.parentNode) {
                    alert.style.opacity = '0';
                    setTimeout(function() {
                        if (alert.parentNode) alert.remove();
                    }, 300);
                }
            }, 5000);
        });
    }

    /**
     * Convert numbers to Bengali digits
     */
    window.toBengaliDigits = function(number) {
        const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
        return String(number).replace(/\d/g, function(d) {
            return bengaliDigits[parseInt(d)];
        });
    };

    /**
     * Format date in Bengali
     */
    window.formatBengaliDate = function(dateString) {
        const bengaliMonths = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
            'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

        const date = new Date(dateString);
        const day = toBengaliDigits(date.getDate());
        const month = bengaliMonths[date.getMonth()];
        const year = toBengaliDigits(date.getFullYear());

        return day + ' ' + month + ', ' + year;
    };

    /**
     * Copy to clipboard
     */
    window.copyToClipboard = function(text, successMessage) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(function() {
                if (successMessage) {
                    showToast(successMessage, 'success');
                }
            });
        } else {
            // Fallback
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            textArea.remove();
            if (successMessage) {
                showToast(successMessage, 'success');
            }
        }
    };

    /**
     * Show Toast Notification
     */
    window.showToast = function(message, type) {
        type = type || 'info';

        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };

        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 px-6 py-3 rounded-lg text-white shadow-lg z-50 ' +
            colors[type] + ' animate-slide-up';
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(function() {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            toast.style.transition = 'all 0.3s';
            setTimeout(function() {
                toast.remove();
            }, 300);
        }, 3000);
    };

    /**
     * Debounce function for performance
     */
    window.debounce = function(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                func.apply(context, args);
            }, wait);
        };
    };

    /**
     * Format file size
     */
    window.formatFileSize = function(bytes) {
        if (bytes === 0) return '০ বাইট';
        const k = 1024;
        const sizes = ['বাইট', 'কেবি', 'এমবি', 'জিবি'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return toBengaliDigits(parseFloat((bytes / Math.pow(k, i)).toFixed(2))) + ' ' + sizes[i];
    };

    /**
     * Check if element is in viewport
     */
    window.isInViewport = function(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    };

    /**
     * AJAX form submission helper
     */
    window.submitFormAjax = function(form, options) {
        options = options || {};

        const formData = new FormData(form);
        const submitBtn = form.querySelector('[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.innerHTML : '';

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<svg class="animate-spin h-5 w-5 inline mr-2" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>অপেক্ষা করুন...';
        }

        fetch(form.action, {
            method: 'POST',
            body: formData
        })
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                }

                if (options.onSuccess) {
                    options.onSuccess(data);
                }
            })
            .catch(function(error) {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                }

                if (options.onError) {
                    options.onError(error);
                } else {
                    showToast('একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'error');
                }
            });
    };

})();
