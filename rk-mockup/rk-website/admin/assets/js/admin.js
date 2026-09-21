/**
 * Admin Panel JavaScript
 */

(function() {
    'use strict';

    // DOM Ready
    document.addEventListener('DOMContentLoaded', function() {
        initSidebar();
        initDropdowns();
        initAlerts();
        initDeleteConfirm();
        initFormValidation();
        initDataTables();
        initTooltips();
    });

    /**
     * Sidebar Toggle (Mobile)
     */
    function initSidebar() {
        const toggleBtn = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');

        if (!toggleBtn || !sidebar) return;

        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('open');
            if (overlay) {
                overlay.classList.toggle('open');
            }
            document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
        });

        if (overlay) {
            overlay.addEventListener('click', function() {
                sidebar.classList.remove('open');
                overlay.classList.remove('open');
                document.body.style.overflow = '';
            });
        }

        // Close on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                if (overlay) overlay.classList.remove('open');
                document.body.style.overflow = '';
            }
        });
    }

    /**
     * Dropdown Menus
     */
    function initDropdowns() {
        document.querySelectorAll('.dropdown-toggle').forEach(function(toggle) {
            toggle.addEventListener('click', function(e) {
                e.stopPropagation();
                const dropdown = this.closest('.dropdown');

                // Close other dropdowns
                document.querySelectorAll('.dropdown.open').forEach(function(d) {
                    if (d !== dropdown) d.classList.remove('open');
                });

                dropdown.classList.toggle('open');
            });
        });

        // Close dropdowns on outside click
        document.addEventListener('click', function() {
            document.querySelectorAll('.dropdown.open').forEach(function(d) {
                d.classList.remove('open');
            });
        });
    }

    /**
     * Alert Dismissal
     */
    function initAlerts() {
        document.querySelectorAll('.alert .close-btn, .alert [data-dismiss="alert"]').forEach(function(btn) {
            btn.addEventListener('click', function() {
                const alert = this.closest('.alert');
                if (alert) {
                    alert.style.opacity = '0';
                    alert.style.transform = 'translateY(-10px)';
                    alert.style.transition = 'all 0.3s';
                    setTimeout(function() {
                        alert.remove();
                    }, 300);
                }
            });
        });

        // Auto-dismiss alerts after 5 seconds
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
     * Delete Confirmation
     */
    function initDeleteConfirm() {
        document.querySelectorAll('[data-confirm]').forEach(function(element) {
            element.addEventListener('click', function(e) {
                const message = this.dataset.confirm || 'এটি মুছে ফেলতে চান?';
                if (!confirm(message)) {
                    e.preventDefault();
                    return false;
                }
            });
        });
    }

    /**
     * Form Validation
     */
    function initFormValidation() {
        document.querySelectorAll('form[data-validate]').forEach(function(form) {
            form.addEventListener('submit', function(e) {
                let isValid = true;

                // Check required fields
                form.querySelectorAll('[required]').forEach(function(field) {
                    if (!field.value.trim()) {
                        isValid = false;
                        field.classList.add('error');
                    } else {
                        field.classList.remove('error');
                    }
                });

                // Check email fields
                form.querySelectorAll('input[type="email"]').forEach(function(field) {
                    const value = field.value.trim();
                    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                        isValid = false;
                        field.classList.add('error');
                    }
                });

                if (!isValid) {
                    e.preventDefault();
                    showToast('সব প্রয়োজনীয় ক্ষেত্র পূরণ করুন।', 'error');
                }
            });
        });

        // Remove error class on input
        document.querySelectorAll('.form-input').forEach(function(input) {
            input.addEventListener('input', function() {
                this.classList.remove('error');
            });
        });
    }

    /**
     * Data Tables Enhancement
     */
    function initDataTables() {
        // Select all checkbox
        document.querySelectorAll('[data-select-all]').forEach(function(checkbox) {
            checkbox.addEventListener('change', function() {
                const table = this.closest('table');
                const checkboxes = table.querySelectorAll('tbody input[type="checkbox"]');
                checkboxes.forEach(function(cb) {
                    cb.checked = checkbox.checked;
                });
            });
        });

        // Row click to select
        document.querySelectorAll('table[data-row-select] tbody tr').forEach(function(row) {
            row.addEventListener('click', function(e) {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;
                const checkbox = this.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            });
        });
    }

    /**
     * Tooltips
     */
    function initTooltips() {
        document.querySelectorAll('[title]').forEach(function(element) {
            const title = element.getAttribute('title');
            if (title) {
                element.setAttribute('data-tooltip', title);
                element.removeAttribute('title');
            }
        });
    }

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
            colors[type] + ' fade-in';
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
     * AJAX Request Helper
     */
    window.ajaxRequest = function(options) {
        const defaults = {
            method: 'POST',
            url: '',
            data: null,
            success: function() {},
            error: function() {}
        };

        options = Object.assign(defaults, options);

        const xhr = new XMLHttpRequest();
        xhr.open(options.method, options.url, true);

        if (options.method === 'POST' && !(options.data instanceof FormData)) {
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        }

        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    options.success(response);
                } catch (e) {
                    options.success(xhr.responseText);
                }
            } else {
                options.error(xhr.statusText);
            }
        };

        xhr.onerror = function() {
            options.error('Network Error');
        };

        xhr.send(options.data);
    };

    /**
     * Confirm Dialog
     */
    window.confirmDialog = function(message, callback) {
        if (confirm(message)) {
            callback();
        }
    };

    /**
     * Format Number to Bengali
     */
    window.toBengaliDigits = function(number) {
        const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
        return String(number).replace(/\d/g, function(d) {
            return bengaliDigits[parseInt(d)];
        });
    };

    /**
     * Copy to Clipboard
     */
    window.copyToClipboard = function(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(function() {
                showToast('কপি করা হয়েছে', 'success');
            });
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            textArea.remove();
            showToast('কপি করা হয়েছে', 'success');
        }
    };

    /**
     * Loading State Helper
     */
    window.setLoading = function(element, loading) {
        if (loading) {
            element.dataset.originalText = element.innerHTML;
            element.disabled = true;
            element.innerHTML = '<svg class="animate-spin h-5 w-5 inline mr-2" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>অপেক্ষা করুন...';
        } else {
            element.disabled = false;
            if (element.dataset.originalText) {
                element.innerHTML = element.dataset.originalText;
            }
        }
    };

    /**
     * Debounce Function
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
     * Format File Size
     */
    window.formatFileSize = function(bytes) {
        if (bytes === 0) return '০ বাইট';
        const k = 1024;
        const sizes = ['বাইট', 'কেবি', 'এমবি', 'জিবি'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return toBengaliDigits(parseFloat((bytes / Math.pow(k, i)).toFixed(2))) + ' ' + sizes[i];
    };

    /**
     * Image Preview on File Select
     */
    window.previewImage = function(input, previewId) {
        const preview = document.getElementById(previewId);
        if (!preview) return;

        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.src = e.target.result;
                preview.classList.remove('hidden');
            };
            reader.readAsDataURL(input.files[0]);
        }
    };

})();
