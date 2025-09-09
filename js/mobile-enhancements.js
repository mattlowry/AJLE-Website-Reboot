// AJ Long Electric - Mobile Enhancement Scripts

(function() {
    'use strict';

    // Check if device is mobile
    const isMobile = {
        Android: function() {
            return navigator.userAgent.match(/Android/i);
        },
        iOS: function() {
            return navigator.userAgent.match(/iPhone|iPad|iPod/i);
        },
        any: function() {
            return (isMobile.Android() || isMobile.iOS() || window.innerWidth <= 768);
        }
    };

    // Initialize mobile enhancements
    document.addEventListener('DOMContentLoaded', function() {
        if (isMobile.any()) {
            initMobileEnhancements();
        }

        // Re-check on resize
        let resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                if (window.innerWidth <= 768) {
                    initMobileEnhancements();
                } else {
                    removeMobileEnhancements();
                }
            }, 250);
        });
    });

    function initMobileEnhancements() {
        // 1. Fix viewport height for mobile browsers
        fixViewportHeight();
        
        // 2. Improve form interactions
        enhanceForms();
        
        // 3. Add swipe gestures to mobile menu
        addSwipeGestures();
        
        // 4. Optimize images for mobile
        optimizeImages();
        
        // 5. Fix position fixed elements
        fixPositionFixed();
        
        // 6. Add tap feedback
        addTapFeedback();
        
        // 7. Improve scrolling performance
        improveScrolling();
        
        // 8. Handle orientation changes
        handleOrientationChange();
        
        // 9. Add pull-to-refresh prevention
        preventPullToRefresh();
        
        // 10. Optimize animations
        optimizeAnimations();
    }

    // 1. Fix viewport height (100vh issue on mobile)
    function fixViewportHeight() {
        const setViewportHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };

        setViewportHeight();
        window.addEventListener('resize', setViewportHeight);
        window.addEventListener('orientationchange', setViewportHeight);

        // Apply to hero sections
        const heroSections = document.querySelectorAll('.hero-section, .min-h-screen');
        heroSections.forEach(section => {
            section.style.minHeight = 'calc(var(--vh, 1vh) * 100)';
        });
    }

    // 2. Enhance form interactions
    function enhanceForms() {
        // Auto-zoom prevention
        const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="number"], textarea, select');
        inputs.forEach(input => {
            // Ensure font size is at least 16px to prevent zoom
            const computedStyle = window.getComputedStyle(input);
            if (parseInt(computedStyle.fontSize) < 16) {
                input.style.fontSize = '16px';
            }

            // Add floating labels if needed
            if (input.placeholder && !input.getAttribute('data-enhanced')) {
                addFloatingLabel(input);
                input.setAttribute('data-enhanced', 'true');
            }
        });

        // Improve number input on mobile
        const numberInputs = document.querySelectorAll('input[type="number"]');
        numberInputs.forEach(input => {
            input.setAttribute('pattern', '[0-9]*');
            input.setAttribute('inputmode', 'numeric');
        });

        // Phone number formatting
        const phoneInputs = document.querySelectorAll('input[type="tel"]');
        phoneInputs.forEach(input => {
            input.setAttribute('inputmode', 'tel');
            input.addEventListener('input', formatPhoneNumber);
        });
    }

    // Add floating label effect
    function addFloatingLabel(input) {
        const wrapper = document.createElement('div');
        wrapper.className = 'floating-label-wrapper';
        
        const label = document.createElement('label');
        label.textContent = input.placeholder;
        label.className = 'floating-label';
        
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);
        wrapper.appendChild(label);
        
        input.addEventListener('focus', () => wrapper.classList.add('focused'));
        input.addEventListener('blur', () => {
            if (!input.value) wrapper.classList.remove('focused');
        });
        
        if (input.value) wrapper.classList.add('focused');
    }

    // Format phone numbers as user types
    function formatPhoneNumber(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 0) {
            if (value.length <= 3) {
                value = `(${value}`;
            } else if (value.length <= 6) {
                value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
            } else {
                value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
            }
        }
        e.target.value = value;
    }

    // 3. Add swipe gestures
    function addSwipeGestures() {
        const mobileMenu = document.getElementById('mobile-menu');
        if (!mobileMenu) return;

        let touchStartX = 0;
        let touchEndX = 0;

        mobileMenu.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        mobileMenu.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });

        function handleSwipe() {
            const swipeThreshold = 50;
            const diff = touchStartX - touchEndX;

            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0) {
                    // Swiped left - close menu
                    closeMobileMenu();
                }
            }
        }
    }

    // Close mobile menu helper
    function closeMobileMenu() {
        const mobileMenu = document.getElementById('mobile-menu');
        const menuOverlay = document.getElementById('menu-overlay');
        
        if (mobileMenu && mobileMenu.classList.contains('active')) {
            mobileMenu.classList.remove('active');
            if (menuOverlay) menuOverlay.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    // 4. Optimize images for mobile
    function optimizeImages() {
        const images = document.querySelectorAll('img[data-mobile-src]');
        images.forEach(img => {
            if (window.innerWidth <= 768) {
                const mobileSrc = img.getAttribute('data-mobile-src');
                if (mobileSrc && img.src !== mobileSrc) {
                    img.src = mobileSrc;
                }
            }
        });
    }

    // 5. Fix position fixed elements
    function fixPositionFixed() {
        // Handle iOS keyboard issues with fixed elements
        if (isMobile.iOS()) {
            const fixedElements = document.querySelectorAll('.fixed-bottom, .fixed.bottom-0');
            
            const inputs = document.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                input.addEventListener('focus', () => {
                    fixedElements.forEach(el => {
                        el.style.position = 'absolute';
                    });
                });
                
                input.addEventListener('blur', () => {
                    setTimeout(() => {
                        fixedElements.forEach(el => {
                            el.style.position = 'fixed';
                        });
                    }, 300);
                });
            });
        }
    }

    // 6. Add tap feedback
    function addTapFeedback() {
        const tapTargets = document.querySelectorAll('a, button, .btn, .clickable');
        
        tapTargets.forEach(target => {
            target.addEventListener('touchstart', function() {
                this.classList.add('tapped');
            }, { passive: true });
            
            target.addEventListener('touchend', function() {
                setTimeout(() => {
                    this.classList.remove('tapped');
                }, 300);
            }, { passive: true });
        });
    }

    // 7. Improve scrolling performance
    function improveScrolling() {
        // Add momentum scrolling to scrollable areas
        const scrollableElements = document.querySelectorAll('.overflow-auto, .overflow-y-auto, .overflow-x-auto');
        scrollableElements.forEach(el => {
            el.style.webkitOverflowScrolling = 'touch';
            el.style.overflowScrolling = 'touch';
        });

        // Passive scroll listeners for better performance
        let ticking = false;
        function updateScrollPosition() {
            // Handle scroll-based UI updates here
            ticking = false;
        }

        document.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(updateScrollPosition);
                ticking = true;
            }
        }, { passive: true });
    }

    // 8. Handle orientation changes
    function handleOrientationChange() {
        window.addEventListener('orientationchange', () => {
            // Force re-layout after orientation change
            setTimeout(() => {
                window.scrollTo(0, window.scrollY + 1);
                window.scrollTo(0, window.scrollY - 1);
            }, 500);
        });
    }

    // 9. Prevent pull-to-refresh on certain elements
    function preventPullToRefresh() {
        let startY = 0;
        
        document.addEventListener('touchstart', e => {
            startY = e.touches[0].pageY;
        }, { passive: true });
        
        document.addEventListener('touchmove', e => {
            const y = e.touches[0].pageY;
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            // Prevent pull-to-refresh when at the top and pulling down
            if (scrollTop === 0 && y > startY && !e.target.closest('.scrollable')) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    // 10. Optimize animations for mobile
    function optimizeAnimations() {
        // Reduce animation complexity on low-end devices
        if ('connection' in navigator && navigator.connection.saveData) {
            document.documentElement.classList.add('reduce-motion');
        }

        // Disable parallax effects on mobile
        const parallaxElements = document.querySelectorAll('[data-parallax]');
        parallaxElements.forEach(el => {
            el.style.transform = 'none';
            el.removeAttribute('data-parallax');
        });
    }

    // Remove mobile enhancements (for resize to desktop)
    function removeMobileEnhancements() {
        // Remove mobile-specific classes
        document.documentElement.classList.remove('mobile-enhanced');
        
        // Reset viewport height
        const heroSections = document.querySelectorAll('.hero-section, .min-h-screen');
        heroSections.forEach(section => {
            section.style.minHeight = '';
        });
    }

    // Utility: Debounce function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Export for use in other scripts
    window.mobileEnhancements = {
        isMobile: isMobile,
        closeMobileMenu: closeMobileMenu,
        formatPhoneNumber: formatPhoneNumber
    };
})();