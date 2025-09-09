const database = require('./lib/database');
const { verifyAdminToken } = require('./admin-auth');

// In-memory store for active connections (in production, use Redis or similar)
const activeConnections = new Map();

exports.handler = async (event, context) => {
    // Set CORS and SSE headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
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
        // Verify admin token
        const authHeader = event.headers.authorization || event.headers.Authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                statusCode: 401,
                headers,
                body: 'data: {"error": "Authorization required"}\n\n'
            };
        }

        const token = authHeader.substring(7);
        const adminData = verifyAdminToken(token);

        // Get query parameters
        const { lastCheck } = event.queryStringParameters || {};
        
        // Get recent submissions since last check
        const recentSubmissions = await getRecentSubmissions(lastCheck);
        
        // Format as SSE data
        let sseData = '';
        
        if (recentSubmissions.length > 0) {
            sseData += `data: ${JSON.stringify({
                type: 'new_submissions',
                data: recentSubmissions,
                timestamp: new Date().toISOString()
            })}\n\n`;
        }

        // Send heartbeat to keep connection alive
        sseData += `data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
        })}\n\n`;

        return {
            statusCode: 200,
            headers,
            body: sseData
        };

    } catch (error) {
        console.error('Notification error:', error);
        
        if (error.message === 'Invalid token' || error.message === 'No token provided') {
            return {
                statusCode: 401,
                headers,
                body: 'data: {"error": "Unauthorized"}\n\n'
            };
        }

        return {
            statusCode: 500,
            headers,
            body: 'data: {"error": "Server error"}\n\n'
        };
    }
};

async function getRecentSubmissions(lastCheck) {
    try {
        const filters = {
            limit: 10
        };

        // If lastCheck is provided, only get submissions newer than that
        if (lastCheck) {
            const lastCheckDate = new Date(lastCheck);
            // This would need to be implemented in the database service
            // For now, we'll get the most recent submissions
        }

        const submissions = await database.getSubmissions(filters);
        
        // Filter to only new submissions from the last 5 minutes if no lastCheck
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        return submissions.filter(submission => {
            const submissionDate = new Date(submission.created_at);
            const checkDate = lastCheck ? new Date(lastCheck) : fiveMinutesAgo;
            return submissionDate > checkDate;
        });
        
    } catch (error) {
        console.error('Error fetching recent submissions:', error);
        return [];
    }
}