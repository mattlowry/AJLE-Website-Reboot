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
        // Verify admin token using the new secure method
        const adminData = verifyAdminToken(event);

        // Route based on HTTP method and query parameters
        const { action, page = 1, limit = 20, status, formType, customerId, q, dateFrom, dateTo } = event.queryStringParameters || {};

        switch (event.httpMethod) {
            case 'GET':
                if (action === 'stats') {
                    return await getDashboardStats(headers);
                } else if (action === 'submissions') {
                    return await getFormSubmissions(headers, { page, limit, status, formType, q, dateFrom, dateTo });
                } else if (action === 'search') {
                    return await searchSubmissions(headers, { q, page, limit, status, formType, dateFrom, dateTo });
                } else if (action === 'customer-history' && customerId) {
                    return await getCustomerHistory(headers, customerId);
                } else if (action === 'export') {
                    return await exportSubmissions(headers, event.queryStringParameters);
                } else {
                    return await getDashboardData(headers, { page, limit, status, formType });
                }

            case 'POST':
                const body = JSON.parse(event.body);
                if (body.action === 'respond') {
                    return await createAdminResponse(headers, body, adminData.adminId);
                } else if (body.action === 'update-status') {
                    return await updateSubmissionStatus(headers, body, adminData.adminId);
                } else if (body.action === 'bulk-update') {
                    return await bulkUpdateSubmissions(headers, body, adminData.adminId);
                } else if (body.action === 'bulk-respond') {
                    return await bulkRespondSubmissions(headers, body, adminData.adminId);
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

async function searchSubmissions(headers, options) {
    try {
        const { q, page = 1, limit = 20, status, formType, dateFrom, dateTo } = options;
        
        if (!q || q.trim().length < 2) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Search query must be at least 2 characters'
                })
            };
        }

        const { submissions, total } = await database.searchFormSubmissions(q.trim(), {
            page: parseInt(page),
            limit: parseInt(limit),
            status,
            formType,
            dateFrom,
            dateTo
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                submissions,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                },
                query: q.trim()
            })
        };
    } catch (error) {
        console.error('Error searching submissions:', error);
        throw error;
    }
}

async function bulkUpdateSubmissions(headers, body, adminId) {
    try {
        const { ids, status, notes } = body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Submission IDs are required'
                })
            };
        }

        if (!status) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Status is required'
                })
            };
        }

        const results = await database.bulkUpdateSubmissionStatus(ids, status, notes, adminId);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                updated: results.length,
                results
            })
        };
    } catch (error) {
        console.error('Error in bulk update:', error);
        throw error;
    }
}

async function bulkRespondSubmissions(headers, body, adminId) {
    try {
        const { ids, message, sendEmail = false } = body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Submission IDs are required'
                })
            };
        }

        if (!message || !message.trim()) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Response message is required'
                })
            };
        }

        const results = await database.bulkCreateAdminResponses(ids, message.trim(), adminId, sendEmail);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                sent: results.length,
                results
            })
        };
    } catch (error) {
        console.error('Error in bulk respond:', error);
        throw error;
    }
}

async function exportSubmissions(headers, queryParams) {
    try {
        const { format = 'csv', status, formType, dateFrom, dateTo } = queryParams;
        
        const filters = {
            status,
            formType,
            dateFrom,
            dateTo
        };

        const data = await database.exportFormSubmissions(format, filters);
        
        const contentTypes = {
            'csv': 'text/csv',
            'json': 'application/json',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        };

        const filename = `form_submissions_${new Date().toISOString().split('T')[0]}.${format}`;
        
        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': contentTypes[format] || 'text/plain',
                'Content-Disposition': `attachment; filename="${filename}"`
            },
            body: format === 'json' ? JSON.stringify(data) : data
        };
    } catch (error) {
        console.error('Error exporting submissions:', error);
        throw error;
    }
}