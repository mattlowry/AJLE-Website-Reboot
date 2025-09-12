/**
 * Enhanced Admin Dashboard with Modular Architecture
 * Integrates secure authentication, real-time notifications, and modern UI patterns
 */
class AdminDashboard {
    constructor() {
        // Initialize managers
        this.authManager = new AuthManager();
        this.uiManager = new UIManager();
        this.dataManager = new DataManager(this.authManager);
        this.notificationManager = new NotificationManager(this.authManager, this.dataManager);
        this.autoSaveManager = new AutoSaveManager();
        this.validationManager = new ValidationManager();
        this.dashboardWidgets = null; // Initialize after dashboard is shown
        
        // Make managers available globally for debugging and component communication
        window.dashboardAuth = this.authManager;
        window.dashboardUI = this.uiManager;
        window.dashboardData = this.dataManager;
        window.dashboardNotifications = this.notificationManager;
        window.dashboardAutoSave = this.autoSaveManager;
        window.dashboardValidation = this.validationManager;
        
        // Will be set when dashboard is shown
        window.dashboardWidgets = null;
        
        this.init();
    }

    /**
     * Initialize the dashboard
     */
    async init() {
        try {
            this.bindLoginEvents();
            this.bindLogoutEvents();
            
            // Check if user is already authenticated
            const authResult = await this.authManager.verifyAuth();
            
            if (authResult.success) {
                this.showDashboard(authResult.admin);
            } else {
                this.showLoginScreen();
            }
            
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            this.showLoginScreen();
            Toast.error('Dashboard initialization failed. Please refresh the page.');
        }
    }

    /**
     * Bind login form events
     */
    bindLoginEvents() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin();
            });
        }
    }

    /**
     * Bind logout events
     */
    bindLogoutEvents() {
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', async () => {
                await this.handleLogout();
            });
        }
    }

    /**
     * Handle login form submission
     */
    async handleLogin() {
        const emailEl = document.getElementById('email');
        const passwordEl = document.getElementById('password');
        const loginButton = document.getElementById('loginButton');
        
        if (!emailEl || !passwordEl || !loginButton) {
            Toast.error('Login form elements not found');
            return;
        }

        // Validate inputs
        const email = AuthManager.sanitizeInput(emailEl.value);
        const password = passwordEl.value; // Don't sanitize password

        if (!email || !password) {
            Toast.warning('Please enter both email and password');
            return;
        }

        if (!AuthManager.validateEmail(email)) {
            Toast.error('Please enter a valid email address');
            return;
        }

        const passwordValidation = AuthManager.validatePassword(password);
        if (!passwordValidation.valid) {
            Toast.warning(passwordValidation.message);
            return;
        }

        try {
            // Disable form during login
            loginButton.disabled = true;
            loginButton.textContent = 'Signing in...';
            
            const result = await this.authManager.login(email, password);
            
            if (result.success) {
                this.showDashboard(result.admin);
                Toast.success('Login successful!');
            } else {
                Toast.error(result.message || 'Login failed');
            }
            
        } catch (error) {
            console.error('Login error:', error);
            Toast.error('Login failed. Please try again.');
        } finally {
            // Re-enable form
            loginButton.disabled = false;
            loginButton.textContent = 'Sign in';
        }
    }

    /**
     * Handle logout
     */
    async handleLogout() {
        try {
            await this.authManager.logout();
            Toast.info('Logged out successfully');
        } catch (error) {
            console.error('Logout error:', error);
            // Still show login screen even if logout API call fails
            this.showLoginScreen();
        }
    }

    /**
     * Show login screen
     */
    showLoginScreen() {
        this.notificationManager.stop();
        this.uiManager.showLoginScreen();
    }

    /**
     * Show dashboard screen
     */
    showDashboard(admin) {
        this.uiManager.showDashboard(admin);
        this.loadInitialData();
        this.notificationManager.start();
        
        // Initialize dashboard widgets and validation after a delay to ensure DOM is ready
        setTimeout(() => {
            this.dashboardWidgets = new DashboardWidgets(this.dataManager);
            window.dashboardWidgets = this.dashboardWidgets;
            
            // Initialize form validation
            this.validationManager.initializePageValidation();
        }, 500);
    }

    /**
     * Load initial dashboard data
     */
    async loadInitialData() {
        try {
            const data = await this.dataManager.loadDashboardData();
            
            if (data.stats) {
                this.uiManager.updateDashboardStats(data.stats);
            }
            
            if (data.submissions) {
                this.uiManager.renderSubmissions(data.submissions);
            }
            
            if (data.pagination) {
                this.uiManager.updatePagination(data.pagination);
            }
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            Toast.error('Failed to load dashboard data');
        }
    }

    /**
     * Show submission detail modal
     */
    async showSubmissionDetail(submissionId) {
        try {
            const result = await this.dataManager.getSubmissionDetail(submissionId);
            this.uiManager.renderSubmissionDetail(result.submission, result.history);
        } catch (error) {
            console.error('Error loading submission detail:', error);
            Toast.error('Failed to load submission details');
        }
    }

    /**
     * Go to specific page
     */
    async goToPage(page) {
        this.uiManager.setCurrentPage(page);
        
        try {
            const filters = this.uiManager.getCurrentFilters();
            const data = await this.dataManager.loadFilteredData(filters, page);
            
            if (data.submissions) {
                this.uiManager.renderSubmissions(data.submissions);
            }
            
            if (data.pagination) {
                this.uiManager.updatePagination(data.pagination);
            }
            
        } catch (error) {
            console.error('Error loading page:', error);
            Toast.error('Failed to load page');
        }
    }

    /**
     * Search submissions
     */
    async searchSubmissions(query) {
        try {
            const data = await this.dataManager.searchSubmissions(query);
            
            if (data && data.submissions) {
                this.uiManager.renderSubmissions(data.submissions);
                
                if (data.pagination) {
                    this.uiManager.updatePagination(data.pagination);
                }
                
                Toast.success(`Found ${data.submissions.length} results`);
            }
            
        } catch (error) {
            console.error('Search error:', error);
            // Error already handled by DataManager
        }
    }

    /**
     * Export submissions
     */
    async exportSubmissions(format = 'csv') {
        try {
            const filters = this.uiManager.getCurrentFilters();
            await this.dataManager.exportSubmissions(format, filters);
        } catch (error) {
            console.error('Export error:', error);
            // Error already handled by DataManager
        }
    }

    /**
     * Bulk update submissions
     */
    async bulkUpdateStatus(submissionIds, status) {
        try {
            const success = await this.dataManager.bulkUpdateStatus(submissionIds, status);
            if (success) {
                // Refresh the current view
                await this.loadInitialData();
            }
        } catch (error) {
            console.error('Bulk update error:', error);
            // Error already handled by DataManager
        }
    }

    /**
     * Refresh dashboard data
     */
    async refreshDashboard() {
        try {
            await this.dataManager.refreshDashboard();
            Toast.success('Dashboard refreshed');
        } catch (error) {
            console.error('Refresh error:', error);
            Toast.error('Failed to refresh dashboard');
        }
    }

    /**
     * Get dashboard status for debugging
     */
    getStatus() {
        return {
            authenticated: this.authManager.isAuthenticated(),
            currentAdmin: this.authManager.getCurrentAdmin(),
            notificationStatus: this.notificationManager.getStatus(),
            cacheStats: this.dataManager.getCacheStats()
        };
    }

    /**
     * Handle window visibility changes
     */
    handleVisibilityChange() {
        if (document.hidden) {
            // Page is hidden, reduce notification frequency
            this.notificationManager.stop();
        } else {
            // Page is visible, resume notifications if authenticated
            if (this.authManager.isAuthenticated()) {
                this.notificationManager.start();
                // Refresh data when page becomes visible
                this.refreshDashboard();
            }
        }
    }

    /**
     * Handle window focus/blur events
     */
    handleWindowFocus() {
        if (this.authManager.isAuthenticated()) {
            this.notificationManager.start();
            this.refreshDashboard();
        }
    }

    handleWindowBlur() {
        // Optionally reduce activity when window loses focus
    }

    /**
     * Handle online/offline events
     */
    handleOnline() {
        Toast.success('Connection restored');
        if (this.authManager.isAuthenticated()) {
            this.notificationManager.start();
            this.refreshDashboard();
        }
    }

    handleOffline() {
        Toast.warning('You are offline. Some features may not work.');
        this.notificationManager.stop();
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.notificationManager.stop();
        this.authManager.stopTokenRefresh();
        this.dataManager.clearCache();
        this.autoSaveManager.destroy();
        
        if (this.dashboardWidgets) {
            this.dashboardWidgets.destroy();
        }
        
        // Remove event listeners
        document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        window.removeEventListener('focus', this.handleWindowFocus.bind(this));
        window.removeEventListener('blur', this.handleWindowBlur.bind(this));
        window.removeEventListener('online', this.handleOnline.bind(this));
        window.removeEventListener('offline', this.handleOffline.bind(this));
    }
}

// Global error handler for unhandled promises
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Don't show user-facing errors for certain types of failures
    const ignoredErrors = ['AbortError', 'NetworkError'];
    if (!ignoredErrors.some(type => event.reason?.name?.includes(type))) {
        Toast.error('An unexpected error occurred. Please refresh the page if problems persist.');
    }
});

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
    Toast.error('A system error occurred. Please refresh the page.');
});

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the dashboard
    window.dashboard = new AdminDashboard();
    
    // Add event listeners for page visibility and connectivity
    document.addEventListener('visibilitychange', () => {
        if (window.dashboard) {
            window.dashboard.handleVisibilityChange();
        }
    });
    
    window.addEventListener('focus', () => {
        if (window.dashboard) {
            window.dashboard.handleWindowFocus();
        }
    });
    
    window.addEventListener('blur', () => {
        if (window.dashboard) {
            window.dashboard.handleWindowBlur();
        }
    });
    
    window.addEventListener('online', () => {
        if (window.dashboard) {
            window.dashboard.handleOnline();
        }
    });
    
    window.addEventListener('offline', () => {
        if (window.dashboard) {
            window.dashboard.handleOffline();
        }
    });
});

// Cleanup when page unloads
window.addEventListener('beforeunload', () => {
    if (window.dashboard) {
        window.dashboard.destroy();
    }
});