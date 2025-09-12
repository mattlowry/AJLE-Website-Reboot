const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development';
const ACCESS_TOKEN_EXPIRES = '15m'; // Short-lived access token
const REFRESH_TOKEN_EXPIRES = '7d'; // Longer-lived refresh token

class AuthUtils {
    static generateTokens(adminData) {
        const payload = {
            adminId: adminData.id,
            email: adminData.email,
            role: adminData.role
        };

        const accessToken = jwt.sign(payload, JWT_SECRET, { 
            expiresIn: ACCESS_TOKEN_EXPIRES,
            issuer: 'ajlong-electric-admin'
        });

        const refreshToken = jwt.sign(
            { adminId: adminData.id, type: 'refresh' }, 
            JWT_SECRET, 
            { 
                expiresIn: REFRESH_TOKEN_EXPIRES,
                issuer: 'ajlong-electric-admin'
            }
        );

        return { accessToken, refreshToken };
    }

    static verifyAccessToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET, {
                issuer: 'ajlong-electric-admin'
            });
        } catch (error) {
            throw new Error('Invalid access token');
        }
    }

    static verifyRefreshToken(token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET, {
                issuer: 'ajlong-electric-admin'
            });
            
            if (decoded.type !== 'refresh') {
                throw new Error('Invalid refresh token type');
            }
            
            return decoded;
        } catch (error) {
            throw new Error('Invalid refresh token');
        }
    }

    static createSecureCookies(accessToken, refreshToken) {
        const isProduction = process.env.NODE_ENV === 'production';
        
        const cookieOptions = {
            httpOnly: true,
            secure: isProduction, // Only send over HTTPS in production
            sameSite: 'strict',
            path: '/'
        };

        const accessCookie = `access_token=${accessToken}; ${this.formatCookieOptions({
            ...cookieOptions,
            maxAge: 15 * 60 // 15 minutes
        })}`;

        const refreshCookie = `refresh_token=${refreshToken}; ${this.formatCookieOptions({
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 // 7 days
        })}`;

        return [accessCookie, refreshCookie];
    }

    static formatCookieOptions(options) {
        const parts = [];
        
        if (options.maxAge) parts.push(`Max-Age=${options.maxAge}`);
        if (options.httpOnly) parts.push('HttpOnly');
        if (options.secure) parts.push('Secure');
        if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
        if (options.path) parts.push(`Path=${options.path}`);
        
        return parts.join('; ');
    }

    static clearAuthCookies() {
        const clearCookie = (name) => `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=strict`;
        return [
            clearCookie('access_token'),
            clearCookie('refresh_token')
        ];
    }

    static parseCookies(cookieHeader) {
        if (!cookieHeader) return {};
        
        return cookieHeader.split(';').reduce((cookies, cookie) => {
            const [name, value] = cookie.trim().split('=');
            if (name && value) {
                cookies[name] = decodeURIComponent(value);
            }
            return cookies;
        }, {});
    }

    static extractTokenFromRequest(event) {
        // First try to get from cookies (preferred)
        const cookies = this.parseCookies(event.headers.cookie);
        if (cookies.access_token) {
            return cookies.access_token;
        }

        // Fallback to Authorization header for backward compatibility
        const authHeader = event.headers.authorization || event.headers.Authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }

        return null;
    }

    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        // Basic HTML sanitization
        return input
            .replace(/[<>]/g, '') // Remove < and >
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .trim()
            .substring(0, 1000); // Limit length
    }

    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static isPasswordStrong(password) {
        // Minimum 8 characters, at least one uppercase, one lowercase, one number
        const minLength = password.length >= 8;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*]/.test(password);

        return minLength && hasUpper && hasLower && (hasNumber || hasSpecial);
    }

    static createRateLimiter() {
        const attempts = new Map();
        const MAX_ATTEMPTS = 5;
        const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

        return {
            isAllowed: (identifier) => {
                const now = Date.now();
                const userAttempts = attempts.get(identifier) || [];
                
                // Clean old attempts
                const recentAttempts = userAttempts.filter(time => now - time < WINDOW_MS);
                
                if (recentAttempts.length >= MAX_ATTEMPTS) {
                    return false;
                }
                
                // Add current attempt
                recentAttempts.push(now);
                attempts.set(identifier, recentAttempts);
                
                return true;
            },
            
            reset: (identifier) => {
                attempts.delete(identifier);
            }
        };
    }
}

module.exports = AuthUtils;