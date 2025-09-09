/**
 * Accessibility Enhancements for AJ Long Electric Website
 * WCAG 2.1 Level AA Compliance Implementation
 */

(function() {
    'use strict';

    // Initialize accessibility features when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAccessibility);
    } else {
        initAccessibility();
    }

    function initAccessibility() {
        addSkipNavigation();
        enhanceFormAccessibility();
        improveMobileMenuAccessibility();
        setupFocusManagement();
        addAriaLabels();
        setupLiveRegions();
        enhanceKeyboardNavigation();
        setupFocusVisible();
        announcePageChanges();
    }

    /**
     * Add skip navigation links for keyboard users
     */
    function addSkipNavigation() {
        const skipNav = document.createElement('a');
        skipNav.href = '#main-content';
        skipNav.className = 'skip-link';
        skipNav.textContent = 'Skip to main content';
        skipNav.setAttribute('tabindex', '0');
        
        document.body.insertBefore(skipNav, document.body.firstChild);

        // Ensure main content has proper ID
        let mainContent = document.getElementById('main-content');
        if (!mainContent) {
            mainContent = document.querySelector('main') || 
                        document.querySelector('[role="main"]') ||
                        document.querySelector('.container').parentElement;
            if (mainContent) {
                mainContent.id = 'main-content';
                mainContent.setAttribute('tabindex', '-1');
            }
        }
    }

    /**
     * Enhance form accessibility with proper labels and error handling
     */
    function enhanceFormAccessibility() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            // Add ARIA attributes to required fields
            const requiredFields = form.querySelectorAll('[required]');
            requiredFields.forEach(field => {
                field.setAttribute('aria-required', 'true');
                
                // Add error message container
                const errorId = field.id + '-error';
                if (!document.getElementById(errorId)) {
                    const errorDiv = document.createElement('div');
                    errorDiv.id = errorId;
                    errorDiv.className = 'error-message';
                    errorDiv.setAttribute('role', 'alert');
                    errorDiv.setAttribute('aria-live', 'polite');
                    field.parentNode.appendChild(errorDiv);
                    field.setAttribute('aria-describedby', errorId);
                }
            });

            // Enhance file upload fields
            const fileInputs = form.querySelectorAll('input[type="file"]');
            fileInputs.forEach(enhanceFileInput);

            // Add form validation
            form.addEventListener('submit', handleFormSubmit);
            
            // Real-time validation for better UX
            const inputs = form.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                input.addEventListener('blur', validateField);
                input.addEventListener('input', clearFieldError);
            });
        });
    }

    /**
     * Enhance file input accessibility
     */
    function enhanceFileInput(fileInput) {
        const wrapper = document.createElement('div');
        wrapper.className = 'file-upload-wrapper';
        
        const label = document.createElement('label');
        label.setAttribute('for', fileInput.id);
        label.className = 'file-upload-label';
        label.innerHTML = `
            <i class="fas fa-cloud-upload-alt" aria-hidden="true"></i>
            <span>Choose files or drag and drop</span>
            <span class="sr-only">Supported formats: ${fileInput.accept || 'all file types'}</span>
        `;
        
        fileInput.parentNode.insertBefore(wrapper, fileInput);
        wrapper.appendChild(fileInput);
        wrapper.appendChild(label);
        
        fileInput.className = 'file-upload-input';
        
        // Add drag and drop accessibility
        wrapper.addEventListener('dragover', (e) => {
            e.preventDefault();
            wrapper.classList.add('drag-over');
        });
        
        wrapper.addEventListener('dragleave', () => {
            wrapper.classList.remove('drag-over');
        });
        
        wrapper.addEventListener('drop', (e) => {
            e.preventDefault();
            wrapper.classList.remove('drag-over');
            fileInput.files = e.dataTransfer.files;
            announceFileSelection(fileInput);
        });
        
        fileInput.addEventListener('change', () => {
            announceFileSelection(fileInput);
        });
    }

    /**
     * Announce file selection to screen readers
     */
    function announceFileSelection(fileInput) {
        const count = fileInput.files.length;
        let message = '';
        
        if (count === 0) {
            message = 'No files selected';
        } else if (count === 1) {
            message = `1 file selected: ${fileInput.files[0].name}`;
        } else {
            message = `${count} files selected`;
        }
        
        announceToScreenReader(message);
    }

    /**
     * Improve mobile menu accessibility
     */
    function improveMobileMenuAccessibility() {
        const menuToggle = document.getElementById('menu-toggle') || 
                          document.querySelector('[data-menu-toggle]') ||
                          document.querySelector('.menu-toggle');
        const mobileMenu = document.getElementById('mobile-menu') ||
                          document.querySelector('.mobile-menu');
        
        if (menuToggle && mobileMenu) {
            // Add proper ARIA attributes
            menuToggle.setAttribute('aria-expanded', 'false');
            menuToggle.setAttribute('aria-controls', 'mobile-menu');
            menuToggle.setAttribute('aria-label', 'Open navigation menu');
            
            mobileMenu.setAttribute('aria-hidden', 'true');
            mobileMenu.setAttribute('role', 'navigation');
            mobileMenu.setAttribute('aria-label', 'Main navigation');
            
            // Add click handler
            menuToggle.addEventListener('click', toggleMobileMenu);
            
            // Add keyboard support
            menuToggle.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleMobileMenu();
                }
            });
            
            // Close menu on escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
                    closeMobileMenu();
                    menuToggle.focus();
                }
            });
            
            // Focus trap for mobile menu
            setupFocusTrap(mobileMenu);
        }
    }

    /**
     * Toggle mobile menu with proper accessibility
     */
    function toggleMobileMenu() {
        const menuToggle = document.getElementById('menu-toggle') || 
                          document.querySelector('[data-menu-toggle]');
        const mobileMenu = document.getElementById('mobile-menu') ||
                          document.querySelector('.mobile-menu');
        
        if (mobileMenu.classList.contains('active')) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }
    }

    function openMobileMenu() {
        const menuToggle = document.getElementById('menu-toggle') || 
                          document.querySelector('[data-menu-toggle]');
        const mobileMenu = document.getElementById('mobile-menu') ||
                          document.querySelector('.mobile-menu');
        
        mobileMenu.classList.add('active');
        menuToggle.setAttribute('aria-expanded', 'true');
        menuToggle.setAttribute('aria-label', 'Close navigation menu');
        mobileMenu.setAttribute('aria-hidden', 'false');
        
        // Focus first menu item
        const firstMenuItem = mobileMenu.querySelector('a, button');
        if (firstMenuItem) {
            firstMenuItem.focus();
        }
        
        announceToScreenReader('Navigation menu opened');
    }

    function closeMobileMenu() {
        const menuToggle = document.getElementById('menu-toggle') || 
                          document.querySelector('[data-menu-toggle]');
        const mobileMenu = document.getElementById('mobile-menu') ||
                          document.querySelector('.mobile-menu');
        
        mobileMenu.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'Open navigation menu');
        mobileMenu.setAttribute('aria-hidden', 'true');
        
        announceToScreenReader('Navigation menu closed');
    }

    /**
     * Setup focus trap for modal dialogs and mobile menu
     */
    function setupFocusTrap(container) {
        if (!container) return;
        
        const focusableElements = container.querySelectorAll(
            'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
        );
        
        if (focusableElements.length === 0) return;
        
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];
        
        container.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        e.preventDefault();
                        lastFocusable.focus();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        e.preventDefault();
                        firstFocusable.focus();
                    }
                }
            }
        });
    }

    /**
     * Setup comprehensive focus management
     */
    function setupFocusManagement() {
        // Track focus for accessibility
        let isUsingMouse = false;
        
        document.addEventListener('mousedown', () => {
            isUsingMouse = true;
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                isUsingMouse = false;
            }
        });
        
        // Skip to main content functionality
        const skipLink = document.querySelector('.skip-link');
        if (skipLink) {
            skipLink.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(skipLink.getAttribute('href'));
                if (target) {
                    target.focus();
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
    }

    /**
     * Add missing ARIA labels and roles
     */
    function addAriaLabels() {
        // Add labels to social media links
        const socialLinks = document.querySelectorAll('a[href*="facebook"], a[href*="instagram"], a[href*="google"]');
        socialLinks.forEach(link => {
            if (!link.getAttribute('aria-label')) {
                const href = link.href;
                let platform = 'social media';
                if (href.includes('facebook')) platform = 'Facebook';
                else if (href.includes('instagram')) platform = 'Instagram';
                else if (href.includes('google')) platform = 'Google';
                
                link.setAttribute('aria-label', `Visit our ${platform} page (opens in new window)`);
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            }
        });
        
        // Add labels to phone links
        const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
        phoneLinks.forEach(link => {
            if (!link.getAttribute('aria-label')) {
                const phoneNumber = link.textContent.trim();
                link.setAttribute('aria-label', `Call us at ${phoneNumber}`);
            }
        });
        
        // Add labels to email links
        const emailLinks = document.querySelectorAll('a[href^="mailto:"]');
        emailLinks.forEach(link => {
            if (!link.getAttribute('aria-label')) {
                const email = link.textContent.trim();
                link.setAttribute('aria-label', `Send email to ${email}`);
            }
        });
        
        // Add ARIA landmarks
        const header = document.querySelector('header');
        if (header && !header.getAttribute('role')) {
            header.setAttribute('role', 'banner');
        }
        
        const nav = document.querySelector('nav');
        if (nav && !nav.getAttribute('role')) {
            nav.setAttribute('role', 'navigation');
            nav.setAttribute('aria-label', 'Main navigation');
        }
        
        const footer = document.querySelector('footer');
        if (footer && !footer.getAttribute('role')) {
            footer.setAttribute('role', 'contentinfo');
        }
        
        const main = document.querySelector('main') || document.getElementById('main-content');
        if (main && !main.getAttribute('role')) {
            main.setAttribute('role', 'main');
        }
    }

    /**
     * Setup live regions for dynamic content announcements
     */
    function setupLiveRegions() {
        // Create global live region for announcements
        if (!document.getElementById('live-region')) {
            const liveRegion = document.createElement('div');
            liveRegion.id = 'live-region';
            liveRegion.className = 'sr-only';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            document.body.appendChild(liveRegion);
        }
    }

    /**
     * Enhance keyboard navigation
     */
    function enhanceKeyboardNavigation() {
        // Add keyboard support for custom buttons
        const customButtons = document.querySelectorAll('[role="button"]:not(button)');
        customButtons.forEach(button => {
            if (!button.getAttribute('tabindex')) {
                button.setAttribute('tabindex', '0');
            }
            
            button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    button.click();
                }
            });
        });
        
        // Improve focus visibility
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });
        
        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });
    }

    /**
     * Setup focus-visible polyfill behavior
     */
    function setupFocusVisible() {
        // Add focus-visible class for better focus management
        document.body.classList.add('js-focus-visible');
    }

    /**
     * Form validation and error handling
     */
    function validateField(event) {
        const field = event.target;
        const errorDiv = document.getElementById(field.id + '-error');
        
        if (field.hasAttribute('required') && !field.value.trim()) {
            showFieldError(field, `${getFieldLabel(field)} is required`);
            return false;
        }
        
        if (field.type === 'email' && field.value && !isValidEmail(field.value)) {
            showFieldError(field, 'Please enter a valid email address');
            return false;
        }
        
        if (field.type === 'tel' && field.value && !isValidPhone(field.value)) {
            showFieldError(field, 'Please enter a valid phone number');
            return false;
        }
        
        clearFieldError(field);
        return true;
    }

    function clearFieldError(event) {
        const field = event.target;
        const errorDiv = document.getElementById(field.id + '-error');
        
        if (errorDiv) {
            errorDiv.textContent = '';
            errorDiv.classList.remove('visible');
        }
        
        field.parentElement.classList.remove('error');
        field.setAttribute('aria-invalid', 'false');
    }

    function showFieldError(field, message) {
        const errorDiv = document.getElementById(field.id + '-error');
        
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.add('visible');
        }
        
        field.parentElement.classList.add('error');
        field.setAttribute('aria-invalid', 'true');
    }

    function handleFormSubmit(event) {
        const form = event.target;
        const fields = form.querySelectorAll('input, textarea, select');
        let hasErrors = false;
        
        fields.forEach(field => {
            if (!validateField({ target: field })) {
                hasErrors = true;
            }
        });
        
        if (hasErrors) {
            event.preventDefault();
            announceToScreenReader('Please correct the errors in the form');
            
            // Focus first error field
            const firstError = form.querySelector('.error input, .error textarea, .error select');
            if (firstError) {
                firstError.focus();
            }
        }
    }

    /**
     * Utility functions
     */
    function getFieldLabel(field) {
        const label = document.querySelector(`label[for="${field.id}"]`);
        return label ? label.textContent.replace('*', '').trim() : field.name || 'Field';
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function isValidPhone(phone) {
        return /^[\+]?[1-9][\d]{0,15}$/.test(phone.replace(/\D/g, ''));
    }

    function announceToScreenReader(message) {
        const liveRegion = document.getElementById('live-region');
        if (liveRegion) {
            liveRegion.textContent = message;
            
            // Clear after announcement
            setTimeout(() => {
                liveRegion.textContent = '';
            }, 1000);
        }
    }

    function announcePageChanges() {
        // Announce page title changes for SPA-like navigation
        const originalTitle = document.title;
        
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.target === document.head) {
                    const titleElement = document.querySelector('title');
                    if (titleElement && titleElement.textContent !== originalTitle) {
                        announceToScreenReader(`Page changed to: ${titleElement.textContent}`);
                    }
                }
            });
        });
        
        observer.observe(document.head, { childList: true, subtree: true });
    }

    // Export functions for external use if needed
    window.AccessibilityEnhancements = {
        announceToScreenReader,
        validateField,
        toggleMobileMenu,
        setupFocusTrap
    };

})();