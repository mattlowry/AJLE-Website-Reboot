const bcrypt = require('bcryptjs');
const database = require('./lib/database');
const AuthUtils = require('./lib/auth-utils');

// Rate limiter for login attempts
const rateLimiter = AuthUtils.createRateLimiter();

exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: 'Method not allowed' 
            })
        };
    }

    try {
        const { action, email, password, token } = JSON.parse(event.body);

        switch (action) {
            case 'login':
                return await handleLogin(email, password, headers, event);
            case 'verify':
                return await handleTokenVerification(event, headers);
            case 'refresh':
                return await handleTokenRefresh(event, headers);
            case 'logout':
                return await handleLogout(headers);
            default:
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        message: 'Invalid action'
                    })
                };
        }
    } catch (error) {
        console.error('Error in admin auth:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Authentication error'
            })
        };
    }
};

async function handleLogin(email, password, headers, event) {
    // Input validation and sanitization
    if (!email || !password) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Email and password are required'
            })
        };
    }

    // Sanitize inputs
    email = AuthUtils.sanitizeInput(email);
    password = AuthUtils.sanitizeInput(password);

    // Validate email format
    if (!AuthUtils.validateEmail(email)) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Invalid email format'
            })
        };
    }

    // Rate limiting
    const clientIP = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';
    if (!rateLimiter.isAllowed(clientIP)) {
        return {
            statusCode: 429,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Too many login attempts. Please try again in 15 minutes.'
            })
        };
    }

    try {
        // Find admin user
        const admin = await database.findAdminByEmail(email);
        
        if (!admin || !admin.is_active) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Invalid credentials'
                })
            };
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, admin.password_hash);
        
        if (!passwordMatch) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Invalid credentials'
                })
            };
        }

        // Reset rate limit on successful login
        rateLimiter.reset(clientIP);

        // Update last login
        await database.updateAdminLastLogin(admin.id);

        // Generate secure tokens
        const { accessToken, refreshToken } = AuthUtils.generateTokens(admin);
        const cookies = AuthUtils.createSecureCookies(accessToken, refreshToken);

        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Set-Cookie': cookies
            },
            body: JSON.stringify({
                success: true,
                admin: {
                    id: admin.id,
                    email: admin.email,
                    first_name: admin.first_name,
                    last_name: admin.last_name,
                    role: admin.role
                }
            })
        };

    } catch (error) {
        console.error('Login error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Login failed'
            })
        };
    }
}

async function handleTokenVerification(event, headers) {
    try {
        const token = AuthUtils.extractTokenFromRequest(event);
        
        if (!token) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'No token provided'
                })
            };
        }

        // Verify access token
        const decoded = AuthUtils.verifyAccessToken(token);
        
        // Check if admin still exists and is active
        const admin = await database.findAdminById(decoded.adminId);
        
        if (!admin || !admin.is_active) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Admin account not found or inactive'
                })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                admin: {
                    id: admin.id,
                    email: admin.email,
                    first_name: admin.first_name,
                    last_name: admin.last_name,
                    role: admin.role
                }
            })
        };

    } catch (error) {
        console.error('Token verification error:', error);
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Invalid or expired token'
            })
        };
    }
}

async function handleTokenRefresh(event, headers) {
    try {
        const cookies = AuthUtils.parseCookies(event.headers.cookie);
        const refreshToken = cookies.refresh_token;
        
        if (!refreshToken) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'No refresh token provided'
                })
            };
        }

        // Verify refresh token
        const decoded = AuthUtils.verifyRefreshToken(refreshToken);
        
        // Check if admin still exists and is active
        const admin = await database.findAdminById(decoded.adminId);
        
        if (!admin || !admin.is_active) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Admin account not found or inactive'
                })
            };
        }

        // Generate new tokens
        const { accessToken, refreshToken: newRefreshToken } = AuthUtils.generateTokens(admin);
        const cookies_new = AuthUtils.createSecureCookies(accessToken, newRefreshToken);

        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Set-Cookie': cookies_new
            },
            body: JSON.stringify({
                success: true,
                admin: {
                    id: admin.id,
                    email: admin.email,
                    first_name: admin.first_name,
                    last_name: admin.last_name,
                    role: admin.role
                }
            })
        };

    } catch (error) {
        console.error('Token refresh error:', error);
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Invalid refresh token'
            })
        };
    }
}

async function handleLogout(headers) {
    const clearCookies = AuthUtils.clearAuthCookies();
    
    return {
        statusCode: 200,
        headers: {
            ...headers,
            'Set-Cookie': clearCookies
        },
        body: JSON.stringify({
            success: true,
            message: 'Logged out successfully'
        })
    };
}

// Middleware function for protecting other admin routes
function verifyAdminToken(event) {
    const token = AuthUtils.extractTokenFromRequest(event);
    
    if (!token) {
        throw new Error('No token provided');
    }

    try {
        const decoded = AuthUtils.verifyAccessToken(token);
        return decoded;
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
}

module.exports = { verifyAdminToken, AuthUtils };