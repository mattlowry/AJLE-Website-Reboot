/**
 * Modern Toast Notification System
 * Replaces basic alert() calls with professional notifications
 */
class ToastManager {
    constructor() {
        this.container = this.createContainer();
        this.toasts = new Map();
        this.nextId = 1;
    }

    /**
     * Create the toast container
     */
    createContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'fixed top-4 right-4 z-50 space-y-2 max-w-sm';
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * Show a toast notification
     */
    show(message, type = 'info', options = {}) {
        const id = this.nextId++;
        const {
            duration = this.getDefaultDuration(type),
            dismissible = true,
            persistent = false
        } = options;

        const toast = this.createToast(id, message, type, dismissible);
        this.container.appendChild(toast);
        this.toasts.set(id, toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('animate-slide-in');
        });

        // Auto-dismiss unless persistent
        if (!persistent && duration > 0) {
            setTimeout(() => this.dismiss(id), duration);
        }

        return id;
    }

    /**
     * Create a toast element
     */
    createToast(id, message, type, dismissible) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} transform translate-x-full transition-all duration-300 ease-in-out`;
        
        const config = this.getTypeConfig(type);
        
        toast.innerHTML = `
            <div class="flex items-start p-4 rounded-lg shadow-lg ${config.bgClass} ${config.borderClass}">
                <div class="flex-shrink-0">
                    <i class="${config.icon} ${config.iconColor}"></i>
                </div>
                <div class="ml-3 flex-1">
                    <p class="${config.textColor} text-sm font-medium leading-5">
                        ${this.escapeHtml(message)}
                    </p>
                </div>
                ${dismissible ? `
                    <div class="ml-4 flex-shrink-0">
                        <button 
                            class="toast-close inline-flex ${config.closeColor} hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded"
                            data-toast-id="${id}"
                        >
                            <span class="sr-only">Close</span>
                            <i class="fas fa-times text-sm"></i>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        // Add click handler for dismiss button
        if (dismissible) {
            const closeBtn = toast.querySelector('.toast-close');
            closeBtn.addEventListener('click', () => this.dismiss(id));
        }

        return toast;
    }

    /**
     * Get configuration for toast type
     */
    getTypeConfig(type) {
        const configs = {
            success: {
                bgClass: 'bg-green-50 border-green-200',
                borderClass: 'border-l-4 border-green-400',
                textColor: 'text-green-800',
                iconColor: 'text-green-400',
                closeColor: 'text-green-500',
                icon: 'fas fa-check-circle'
            },
            error: {
                bgClass: 'bg-red-50 border-red-200',
                borderClass: 'border-l-4 border-red-400',
                textColor: 'text-red-800',
                iconColor: 'text-red-400',
                closeColor: 'text-red-500',
                icon: 'fas fa-exclamation-circle'
            },
            warning: {
                bgClass: 'bg-yellow-50 border-yellow-200',
                borderClass: 'border-l-4 border-yellow-400',
                textColor: 'text-yellow-800',
                iconColor: 'text-yellow-400',
                closeColor: 'text-yellow-500',
                icon: 'fas fa-exclamation-triangle'
            },
            info: {
                bgClass: 'bg-blue-50 border-blue-200',
                borderClass: 'border-l-4 border-blue-400',
                textColor: 'text-blue-800',
                iconColor: 'text-blue-400',
                closeColor: 'text-blue-500',
                icon: 'fas fa-info-circle'
            }
        };

        return configs[type] || configs.info;
    }

    /**
     * Get default duration based on type
     */
    getDefaultDuration(type) {
        const durations = {
            success: 4000,
            error: 8000,
            warning: 6000,
            info: 5000
        };
        return durations[type] || 5000;
    }

    /**
     * Dismiss a toast
     */
    dismiss(id) {
        const toast = this.toasts.get(id);
        if (!toast) return;

        // Animate out
        toast.classList.add('animate-slide-out');
        
        // Remove after animation
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            this.toasts.delete(id);
        }, 300);
    }

    /**
     * Dismiss all toasts
     */
    dismissAll() {
        this.toasts.forEach((toast, id) => {
            this.dismiss(id);
        });
    }

    /**
     * Convenience methods for different types
     */
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    error(message, options = {}) {
        return this.show(message, 'error', options);
    }

    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }

    info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    /**
     * Show loading toast (persistent until dismissed)
     */
    loading(message, options = {}) {
        const toast = document.createElement('div');
        toast.className = 'toast toast-loading transform translate-x-full transition-all duration-300 ease-in-out';
        
        toast.innerHTML = `
            <div class="flex items-center p-4 rounded-lg shadow-lg bg-white border border-gray-200">
                <div class="flex-shrink-0">
                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
                <div class="ml-3">
                    <p class="text-gray-700 text-sm font-medium">
                        ${this.escapeHtml(message)}
                    </p>
                </div>
            </div>
        `;

        const id = this.nextId++;
        this.container.appendChild(toast);
        this.toasts.set(id, toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('animate-slide-in');
        });

        return id;
    }

    /**
     * Show confirmation toast with action buttons
     */
    confirm(message, onConfirm, onCancel = null, options = {}) {
        const id = this.nextId++;
        const toast = document.createElement('div');
        toast.className = 'toast toast-confirm transform translate-x-full transition-all duration-300 ease-in-out';
        
        toast.innerHTML = `
            <div class="flex flex-col p-4 rounded-lg shadow-lg bg-white border border-gray-200">
                <div class="flex items-start mb-3">
                    <div class="flex-shrink-0">
                        <i class="fas fa-question-circle text-blue-400"></i>
                    </div>
                    <div class="ml-3">
                        <p class="text-gray-700 text-sm font-medium">
                            ${this.escapeHtml(message)}
                        </p>
                    </div>
                </div>
                <div class="flex space-x-2 justify-end">
                    <button class="confirm-cancel px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded">
                        Cancel
                    </button>
                    <button class="confirm-ok px-3 py-1 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded">
                        Confirm
                    </button>
                </div>
            </div>
        `;

        // Add event handlers
        const confirmBtn = toast.querySelector('.confirm-ok');
        const cancelBtn = toast.querySelector('.confirm-cancel');

        confirmBtn.addEventListener('click', () => {
            this.dismiss(id);
            if (onConfirm) onConfirm();
        });

        cancelBtn.addEventListener('click', () => {
            this.dismiss(id);
            if (onCancel) onCancel();
        });

        this.container.appendChild(toast);
        this.toasts.set(id, toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('animate-slide-in');
        });

        return id;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Add CSS animations if not already added
     */
    static addStyles() {
        if (document.getElementById('toast-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'toast-styles';
        styles.textContent = `
            .animate-slide-in {
                transform: translateX(0) !important;
            }
            .animate-slide-out {
                transform: translateX(100%) !important;
                opacity: 0;
            }
            .toast {
                transition: all 0.3s ease-in-out;
            }
        `;
        document.head.appendChild(styles);
    }
}

// Initialize styles when loaded
if (typeof document !== 'undefined') {
    ToastManager.addStyles();
}

// Global instance
window.Toast = new ToastManager();