const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const database = require('./lib/database');

// JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development';

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
                return await handleLogin(email, password, headers);
            case 'verify':
                return await handleTokenVerification(token, headers);
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

async function handleLogin(email, password, headers) {
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

        // Update last login
        await database.updateAdminLastLogin(admin.id);

        // Generate JWT token
        const token = jwt.sign(
            { 
                adminId: admin.id,
                email: admin.email,
                role: admin.role
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                token,
                admin: {
                    id: admin.id,
                    email: admin.email,
                    name: admin.name,
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

async function handleTokenVerification(token, headers) {
    if (!token) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Token required'
            })
        };
    }

    try {
        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Check if admin still exists and is active
        const admin = await database.findAdminById(decoded.adminId);
        
        if (!admin || !admin.is_active) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Invalid token'
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
                    name: admin.name,
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
                message: 'Invalid token'
            })
        };
    }
}

async function handleLogout(headers) {
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            message: 'Logged out successfully'
        })
    };
}

// Middleware function for protecting other admin routes
function verifyAdminToken(token) {
    if (!token) {
        throw new Error('No token provided');
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    } catch (error) {
        throw new Error('Invalid token');
    }
}

module.exports = { verifyAdminToken };