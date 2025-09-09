const database = require('./lib/database');
const { verifyAdminToken } = require('./admin-auth');

exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        // Verify admin token
        const authHeader = event.headers.authorization || event.headers.Authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Authorization required'
                })
            };
        }

        const token = authHeader.substring(7);
        const adminData = verifyAdminToken(token);

        // Route based on HTTP method and query parameters
        const { action, page = 1, limit = 20, status, formType, customerId } = event.queryStringParameters || {};

        switch (event.httpMethod) {
            case 'GET':
                if (action === 'stats') {
                    return await getDashboardStats(headers);
                } else if (action === 'submissions') {
                    return await getFormSubmissions(headers, { page, limit, status, formType });
                } else if (action === 'customer-history' && customerId) {
                    return await getCustomerHistory(headers, customerId);
                } else {
                    return await getDashboardData(headers, { page, limit, status, formType });
                }

            case 'POST':
                const body = JSON.parse(event.body);
                if (body.action === 'respond') {
                    return await createAdminResponse(headers, body, adminData.adminId);
                } else if (body.action === 'update-status') {
                    return await updateSubmissionStatus(headers, body, adminData.adminId);
                }
                break;

            default:
                return {
                    statusCode: 405,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        message: 'Method not allowed'
                    })
                };
        }
    } catch (error) {
        console.error('Dashboard error:', error);
        
        if (error.message === 'Invalid token' || error.message === 'No token provided') {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Unauthorized'
                })
            };
        }

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Dashboard error'
            })
        };
    }
};

async function getDashboardStats(headers) {
    try {
        const stats = await database.getDashboardStats();
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                stats
            })
        };
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        throw error;
    }
}

async function getFormSubmissions(headers, options) {
    try {
        const { submissions, total } = await database.getFormSubmissions(options);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                submissions,
                pagination: {
                    page: parseInt(options.page),
                    limit: parseInt(options.limit),
                    total,
                    pages: Math.ceil(total / parseInt(options.limit))
                }
            })
        };
    } catch (error) {
        console.error('Error fetching form submissions:', error);
        throw error;
    }
}

async function getCustomerHistory(headers, customerId) {
    try {
        const history = await database.getCustomerHistory(customerId);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                history
            })
        };
    } catch (error) {
        console.error('Error fetching customer history:', error);
        throw error;
    }
}

async function getDashboardData(headers, options) {
    try {
        const [stats, { submissions, total }] = await Promise.all([
            database.getDashboardStats(),
            database.getFormSubmissions(options)
        ]);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                stats,
                submissions,
                pagination: {
                    page: parseInt(options.page),
                    limit: parseInt(options.limit),
                    total,
                    pages: Math.ceil(total / parseInt(options.limit))
                }
            })
        };
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        throw error;
    }
}

async function createAdminResponse(headers, body, adminId) {
    try {
        const { submissionId, message, sendEmail = false } = body;
        
        if (!submissionId || !message) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Submission ID and message are required'
                })
            };
        }

        const response = await database.createAdminResponse({
            submission_id: submissionId,
            admin_id: adminId,
            message,
            send_email: sendEmail
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                response
            })
        };
    } catch (error) {
        console.error('Error creating admin response:', error);
        throw error;
    }
}

async function updateSubmissionStatus(headers, body, adminId) {
    try {
        const { submissionId, status, notes } = body;
        
        if (!submissionId || !status) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Submission ID and status are required'
                })
            };
        }

        const updated = await database.updateSubmissionStatus(submissionId, status, notes, adminId);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                submission: updated
            })
        };
    } catch (error) {
        console.error('Error updating submission status:', error);
        throw error;
    }
}