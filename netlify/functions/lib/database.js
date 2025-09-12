const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Database helper functions
class DatabaseService {
    // Customer operations
    async findOrCreateCustomer(customerData) {
        try {
            const { first_name, last_name, email, phone, address, city, state, zip_code } = customerData;
            
            // First try to find existing customer by email
            const { data: existingCustomer, error: findError } = await supabase
                .from('customers')
                .select('*')
                .eq('email', email)
                .single();

            if (existingCustomer && !findError) {
                // Update customer info if provided
                const { data: updatedCustomer, error: updateError } = await supabase
                    .from('customers')
                    .update({
                        first_name: first_name || existingCustomer.first_name,
                        last_name: last_name || existingCustomer.last_name,
                        phone: phone || existingCustomer.phone,
                        address: address || existingCustomer.address,
                        city: city || existingCustomer.city,
                        state: state || existingCustomer.state,
                        zip_code: zip_code || existingCustomer.zip_code,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingCustomer.id)
                    .select()
                    .single();

                return updatedCustomer;
            }

            // Create new customer
            const { data: newCustomer, error: createError } = await supabase
                .from('customers')
                .insert([{
                    first_name,
                    last_name,
                    email,
                    phone,
                    address,
                    city,
                    state,
                    zip_code
                }])
                .select()
                .single();

            if (createError) {
                throw new Error(`Error creating customer: ${createError.message}`);
            }

            return newCustomer;
        } catch (error) {
            console.error('Error in findOrCreateCustomer:', error);
            throw error;
        }
    }

    // Form submission operations
    async createFormSubmission(submissionData) {
        try {
            const { data, error } = await supabase
                .from('form_submissions')
                .insert([submissionData])
                .select()
                .single();

            if (error) {
                throw new Error(`Error creating form submission: ${error.message}`);
            }

            return data;
        } catch (error) {
            console.error('Error in createFormSubmission:', error);
            throw error;
        }
    }

    async getSubmissions(filters = {}) {
        try {
            let query = supabase
                .from('submission_details')
                .select('*')
                .order('created_at', { ascending: false });

            // Apply filters
            if (filters.form_type) {
                query = query.eq('form_type', filters.form_type);
            }
            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            if (filters.customer_id) {
                query = query.eq('customer_id', filters.customer_id);
            }
            if (filters.limit) {
                query = query.limit(filters.limit);
            }

            const { data, error } = await query;

            if (error) {
                throw new Error(`Error fetching submissions: ${error.message}`);
            }

            return data;
        } catch (error) {
            console.error('Error in getSubmissions:', error);
            throw error;
        }
    }

    async getSubmissionById(id) {
        try {
            const { data, error } = await supabase
                .from('submission_details')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                throw new Error(`Error fetching submission: ${error.message}`);
            }

            return data;
        } catch (error) {
            console.error('Error in getSubmissionById:', error);
            throw error;
        }
    }

    async updateSubmissionStatus(submissionId, status, notes = null, adminId = null) {
        try {
            const updateData = { 
                status,
                updated_at: new Date().toISOString()
            };

            if (notes) {
                updateData.admin_notes = notes;
            }

            if (adminId) {
                updateData.admin_id = adminId;
            }

            const { data, error } = await supabase
                .from('form_submissions')
                .update(updateData)
                .eq('id', submissionId)
                .select()
                .single();

            if (error) {
                throw new Error(`Error updating submission status: ${error.message}`);
            }

            return data;
        } catch (error) {
            console.error('Error in updateSubmissionStatus:', error);
            throw error;
        }
    }

    async getFormSubmissions(options = {}) {
        try {
            const { page = 1, limit = 20, status, formType } = options;
            const offset = (page - 1) * limit;

            let query = supabase
                .from('submission_details')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            // Apply filters
            if (status) {
                query = query.eq('status', status);
            }
            if (formType) {
                query = query.eq('form_type', formType);
            }

            const { data, error, count } = await query;

            if (error) {
                throw new Error(`Error fetching form submissions: ${error.message}`);
            }

            return {
                submissions: data,
                total: count
            };
        } catch (error) {
            console.error('Error in getFormSubmissions:', error);
            throw error;
        }
    }

    // File attachment operations
    async createFileAttachment(attachmentData) {
        try {
            const { data, error } = await supabase
                .from('file_attachments')
                .insert([attachmentData])
                .select()
                .single();

            if (error) {
                throw new Error(`Error creating file attachment: ${error.message}`);
            }

            return data;
        } catch (error) {
            console.error('Error in createFileAttachment:', error);
            throw error;
        }
    }

    async getAttachmentsBySubmission(submissionId) {
        try {
            const { data, error } = await supabase
                .from('file_attachments')
                .select('*')
                .eq('submission_id', submissionId)
                .order('uploaded_at', { ascending: true });

            if (error) {
                throw new Error(`Error fetching attachments: ${error.message}`);
            }

            return data;
        } catch (error) {
            console.error('Error in getAttachmentsBySubmission:', error);
            throw error;
        }
    }

    // Admin response operations
    async createAdminResponse(responseData) {
        try {
            const { data, error } = await supabase
                .from('admin_responses')
                .insert([responseData])
                .select()
                .single();

            if (error) {
                throw new Error(`Error creating admin response: ${error.message}`);
            }

            return data;
        } catch (error) {
            console.error('Error in createAdminResponse:', error);
            throw error;
        }
    }

    async getResponsesBySubmission(submissionId) {
        try {
            const { data, error } = await supabase
                .from('admin_responses')
                .select('*')
                .eq('submission_id', submissionId)
                .order('sent_at', { ascending: true });

            if (error) {
                throw new Error(`Error fetching responses: ${error.message}`);
            }

            return data;
        } catch (error) {
            console.error('Error in getResponsesBySubmission:', error);
            throw error;
        }
    }

    // Customer operations
    async getCustomers(filters = {}) {
        try {
            let query = supabase
                .from('customer_summary')
                .select('*')
                .order('last_submission_date', { ascending: false });

            if (filters.limit) {
                query = query.limit(filters.limit);
            }

            const { data, error } = await query;

            if (error) {
                throw new Error(`Error fetching customers: ${error.message}`);
            }

            return data;
        } catch (error) {
            console.error('Error in getCustomers:', error);
            throw error;
        }
    }

    async getCustomerHistory(customerId) {
        try {
            const { data, error } = await supabase
                .from('submission_details')
                .select('*')
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false });

            if (error) {
                throw new Error(`Error fetching customer history: ${error.message}`);
            }

            return data;
        } catch (error) {
            console.error('Error in getCustomerHistory:', error);
            throw error;
        }
    }

    // Admin user operations
    async findAdminByEmail(email) {
        try {
            const { data, error } = await supabase
                .from('admin_users')
                .select('*')
                .eq('email', email)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
                throw new Error(`Error finding admin: ${error.message}`);
            }

            return data;
        } catch (error) {
            console.error('Error in findAdminByEmail:', error);
            throw error;
        }
    }

    async findAdminById(id) {
        try {
            const { data, error } = await supabase
                .from('admin_users')
                .select('*')
                .eq('id', id)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw new Error(`Error finding admin: ${error.message}`);
            }

            return data;
        } catch (error) {
            console.error('Error in findAdminById:', error);
            throw error;
        }
    }

    async updateAdminLastLogin(adminId) {
        try {
            const { data, error } = await supabase
                .from('admin_users')
                .update({ 
                    last_login_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', adminId)
                .select()
                .single();

            if (error) {
                throw new Error(`Error updating admin last login: ${error.message}`);
            }

            return data;
        } catch (error) {
            console.error('Error in updateAdminLastLogin:', error);
            throw error;
        }
    }

    // Dashboard statistics
    async getDashboardStats() {
        try {
            // Get submission counts by status
            const { data: statusCounts, error: statusError } = await supabase
                .from('form_submissions')
                .select('status')
                .then(result => {
                    if (result.error) return { data: [], error: result.error };
                    
                    const counts = result.data.reduce((acc, submission) => {
                        acc[submission.status] = (acc[submission.status] || 0) + 1;
                        return acc;
                    }, {});
                    
                    return { data: counts, error: null };
                });

            // Get submission counts by form type
            const { data: typeCounts, error: typeError } = await supabase
                .from('form_submissions')
                .select('form_type')
                .then(result => {
                    if (result.error) return { data: [], error: result.error };
                    
                    const counts = result.data.reduce((acc, submission) => {
                        acc[submission.form_type] = (acc[submission.form_type] || 0) + 1;
                        return acc;
                    }, {});
                    
                    return { data: counts, error: null };
                });

            // Get recent submissions
            const { data: recentSubmissions, error: recentError } = await supabase
                .from('submission_details')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);

            if (statusError || typeError || recentError) {
                throw new Error('Error fetching dashboard statistics');
            }

            return {
                statusCounts,
                typeCounts,
                recentSubmissions
            };
        } catch (error) {
            console.error('Error in getDashboardStats:', error);
            throw error;
        }
    }

    // Enhanced search functionality
    async searchFormSubmissions(query, options = {}) {
        try {
            const { page = 1, limit = 20, status, formType, dateFrom, dateTo } = options;
            const offset = (page - 1) * limit;

            // Use the existing submission_details view for search
            let supabaseQuery = supabase
                .from('submission_details')
                .select('*', { count: 'exact' })
                .or(`subject.ilike.%${query}%,message.ilike.%${query}%,customer_name.ilike.%${query}%,customer_email.ilike.%${query}%`)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            // Apply additional filters
            if (status) {
                supabaseQuery = supabaseQuery.eq('status', status);
            }
            if (formType) {
                supabaseQuery = supabaseQuery.eq('form_type', formType);
            }
            if (dateFrom) {
                supabaseQuery = supabaseQuery.gte('created_at', dateFrom);
            }
            if (dateTo) {
                supabaseQuery = supabaseQuery.lte('created_at', dateTo);
            }

            const { data: submissions, error, count } = await supabaseQuery;

            if (error) {
                throw new Error(`Error searching submissions: ${error.message}`);
            }

            return {
                submissions: submissions || [],
                total: count || 0
            };
        } catch (error) {
            console.error('Error in searchFormSubmissions:', error);
            throw error;
        }
    }

    // Bulk operations
    async bulkUpdateSubmissionStatus(ids, status, notes = null, adminId = null) {
        try {
            const updates = [];
            
            for (const id of ids) {
                const updateData = {
                    status,
                    updated_at: new Date().toISOString()
                };

                if (notes) {
                    updateData.admin_notes = notes;
                }

                if (adminId) {
                    updateData.admin_id = adminId;
                }

                const { data, error } = await supabase
                    .from('form_submissions')
                    .update(updateData)
                    .eq('id', id)
                    .select()
                    .single();

                if (error) {
                    console.error(`Error updating submission ${id}:`, error);
                    continue;
                }

                updates.push(data);
            }

            return updates;
        } catch (error) {
            console.error('Error in bulkUpdateSubmissionStatus:', error);
            throw error;
        }
    }

    async bulkCreateAdminResponses(submissionIds, message, adminId, sendEmail = false) {
        try {
            const responses = [];
            
            for (const submissionId of submissionIds) {
                const responseData = {
                    submission_id: submissionId,
                    admin_id: adminId,
                    message,
                    send_email: sendEmail
                };

                const { data, error } = await supabase
                    .from('admin_responses')
                    .insert([responseData])
                    .select()
                    .single();

                if (error) {
                    console.error(`Error creating response for submission ${submissionId}:`, error);
                    continue;
                }

                responses.push(data);
            }

            return responses;
        } catch (error) {
            console.error('Error in bulkCreateAdminResponses:', error);
            throw error;
        }
    }

    // Export functionality
    async exportFormSubmissions(format, filters = {}) {
        try {
            let query = supabase
                .from('submission_details')
                .select('*')
                .order('created_at', { ascending: false });

            // Apply filters
            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            if (filters.formType) {
                query = query.eq('form_type', filters.formType);
            }
            if (filters.dateFrom) {
                query = query.gte('created_at', filters.dateFrom);
            }
            if (filters.dateTo) {
                query = query.lte('created_at', filters.dateTo);
            }

            const { data, error } = await query;

            if (error) {
                throw new Error(`Error fetching export data: ${error.message}`);
            }

            switch (format) {
                case 'csv':
                    return this.formatAsCSV(data);
                case 'json':
                    return data;
                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }
        } catch (error) {
            console.error('Error in exportFormSubmissions:', error);
            throw error;
        }
    }

    formatAsCSV(data) {
        if (!data || data.length === 0) {
            return 'No data to export';
        }

        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(',');
        
        const csvRows = data.map(row => {
            return headers.map(header => {
                let value = row[header];
                if (value === null || value === undefined) {
                    value = '';
                } else if (typeof value === 'string') {
                    // Escape quotes and wrap in quotes if contains comma
                    value = value.replace(/"/g, '""');
                    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                        value = `"${value}"`;
                    }
                }
                return value;
            }).join(',');
        });

        return [csvHeaders, ...csvRows].join('\n');
    }
}

module.exports = new DatabaseService();