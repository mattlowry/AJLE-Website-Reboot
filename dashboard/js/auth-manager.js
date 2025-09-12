/**
 * Secure Authentication Manager for Admin Dashboard
 * Handles cookie-based authentication with token refresh
 */
class AuthManager {
    constructor() {
        this.currentAdmin = null;
        this.refreshTimer = null;
        this.refreshInterval = 14 * 60 * 1000; // Refresh every 14 minutes (before 15min expiry)
    }

    /**
     * Login with email and password
     */
    async login(email, password) {
        const response = await fetch('/.netlify/functions/admin-auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // Important: include cookies
            body: JSON.stringify({
                action: 'login',
                email,
                password
            })
        });

        const data = await response.json();

        if (data.success) {
            this.currentAdmin = data.admin;
            this.startTokenRefresh();
            return { success: true, admin: data.admin };
        } else {
            return { success: false, message: data.message };
        }
    }

    /**
     * Verify current authentication status
     */
    async verifyAuth() {
        try {
            const response = await fetch('/.netlify/functions/admin-auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    action: 'verify'
                })
            });

            const data = await response.json();

            if (data.success) {
                this.currentAdmin = data.admin;
                this.startTokenRefresh();
                return { success: true, admin: data.admin };
            } else {
                this.currentAdmin = null;
                this.stopTokenRefresh();
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('Auth verification error:', error);
            this.currentAdmin = null;
            this.stopTokenRefresh();
            return { success: false, message: 'Authentication verification failed' };
        }
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshToken() {
        try {
            const response = await fetch('/.netlify/functions/admin-auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    action: 'refresh'
                })
            });

            const data = await response.json();

            if (data.success) {
                this.currentAdmin = data.admin;
                return { success: true, admin: data.admin };
            } else {
                // Refresh failed, user needs to log in again
                this.logout();
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            this.logout();
            return { success: false, message: 'Token refresh failed' };
        }
    }

    /**
     * Logout and clear cookies
     */
    async logout() {
        try {
            await fetch('/.netlify/functions/admin-auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    action: 'logout'
                })
            });
        } catch (error) {
            console.error('Logout error:', error);
        }

        this.currentAdmin = null;
        this.stopTokenRefresh();
        
        // Redirect to login
        if (typeof window !== 'undefined' && window.dashboard) {
            window.dashboard.showLoginScreen();
        }
    }

    /**
     * Start automatic token refresh
     */
    startTokenRefresh() {
        this.stopTokenRefresh(); // Clear any existing timer
        
        this.refreshTimer = setInterval(async () => {
            const result = await this.refreshToken();
            if (!result.success) {
                console.warn('Token refresh failed, logging out');
                this.logout();
            }
        }, this.refreshInterval);
    }

    /**
     * Stop automatic token refresh
     */
    stopTokenRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    /**
     * Make authenticated API request
     */
    async apiRequest(url, options = {}) {
        const defaultOptions = {
            credentials: 'include', // Include cookies
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const requestOptions = { ...defaultOptions, ...options };

        try {
            let response = await fetch(url, requestOptions);

            // If token expired, try to refresh and retry
            if (response.status === 401) {
                const refreshResult = await this.refreshToken();
                if (refreshResult.success) {
                    // Retry the original request
                    response = await fetch(url, requestOptions);
                } else {
                    // Refresh failed, redirect to login
                    this.logout();
                    throw new Error('Authentication required');
                }
            }

            return response;
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    /**
     * Get current admin info
     */
    getCurrentAdmin() {
        return this.currentAdmin;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.currentAdmin !== null;
    }

    /**
     * Validate email format
     */
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate password strength
     */
    static validatePassword(password) {
        if (password.length < 8) {
            return { valid: false, message: 'Password must be at least 8 characters long' };
        }
        
        if (!/[A-Z]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one uppercase letter' };
        }
        
        if (!/[a-z]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one lowercase letter' };
        }
        
        if (!/[\d!@#$%^&*]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one number or special character' };
        }
        
        return { valid: true };
    }

    /**
     * Sanitize input to prevent XSS
     */
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/[<>]/g, '') // Remove < and >
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .trim()
            .substring(0, 1000); // Limit length
    }
}