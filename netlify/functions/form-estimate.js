const formidable = require('formidable');
const { v2: cloudinary } = require('cloudinary');
const database = require('./lib/database');
const emailService = require('./lib/email');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
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
        console.log('Processing estimate form submission...');

        // Parse form data
        const form = formidable({
            multiples: true,
            keepExtensions: true,
            maxFileSize: 10 * 1024 * 1024 // 10MB max file size
        });

        // Convert event to a format formidable can handle
        const req = {
            headers: event.headers,
            method: event.httpMethod,
            url: event.path,
            body: event.body
        };

        const [fields, files] = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                resolve([fields, files]);
            });
        });

        console.log('Form fields parsed:', Object.keys(fields));

        // Extract and validate required fields
        const customerData = {
            first_name: Array.isArray(fields.firstName) ? fields.firstName[0] : fields.firstName,
            last_name: Array.isArray(fields.lastName) ? fields.lastName[0] : fields.lastName,
            email: Array.isArray(fields.email) ? fields.email[0] : fields.email,
            phone: Array.isArray(fields.phone) ? fields.phone[0] : fields.phone,
            address: Array.isArray(fields.address) ? fields.address[0] : fields.address,
            city: Array.isArray(fields.city) ? fields.city[0] : fields.city,
            state: Array.isArray(fields.state) ? fields.state[0] : fields.state,
            zip_code: Array.isArray(fields.zip) ? fields.zip[0] : fields.zip
        };

        // Validate required fields
        const requiredFields = ['first_name', 'last_name', 'email', 'phone'];
        for (const field of requiredFields) {
            if (!customerData[field]) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        message: `Missing required field: ${field}`
                    })
                };
            }
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customerData.email)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Invalid email address format'
                })
            };
        }

        console.log('Customer data validated:', customerData.email);

        // Create or update customer
        const customer = await database.findOrCreateCustomer(customerData);
        console.log('Customer created/updated:', customer.id);

        // Prepare submission data
        const submissionData = {
            customer_id: customer.id,
            form_type: 'estimate',
            subject: Array.isArray(fields.subject) ? fields.subject[0] : (fields.subject || 'Estimate Request'),
            message: Array.isArray(fields.description) ? fields.description[0] : fields.description,
            project_type: Array.isArray(fields.projectType) ? fields.projectType[0] : fields.projectType,
            budget_range: Array.isArray(fields.budgetRange) ? fields.budgetRange[0] : fields.budgetRange,
            timeline: Array.isArray(fields.timeline) ? fields.timeline[0] : fields.timeline,
            preferred_date: Array.isArray(fields.scheduledDate) ? fields.scheduledDate[0] : fields.scheduledDate,
            preferred_time: Array.isArray(fields.timeSlot) ? fields.timeSlot[0] : fields.timeSlot,
            service_location: customerData.address ? `${customerData.address}, ${customerData.city}, ${customerData.state} ${customerData.zip_code}` : null,
            urgency: Array.isArray(fields.urgency) ? fields.urgency[0] : (fields.urgency || 'normal'),
            metadata: {
                form_source: 'website_estimate_form',
                user_agent: event.headers['user-agent'],
                ip_address: event.headers['x-forwarded-for'] || event.headers['x-real-ip'],
                additional_fields: fields
            }
        };

        // Validate message
        if (!submissionData.message) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Project description is required'
                })
            };
        }

        // Create form submission
        const submission = await database.createFormSubmission(submissionData);
        console.log('Form submission created:', submission.id);

        // Process file uploads if any
        let attachments = [];
        if (files.attachments || files.media) {
            const uploadedFiles = files.attachments || files.media;
            const fileArray = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];

            console.log(`Processing ${fileArray.length} file uploads...`);

            for (const file of fileArray) {
                try {
                    // Upload to Cloudinary
                    const uploadResult = await cloudinary.uploader.upload(file.filepath, {
                        folder: `ajlong-electric/estimates/${submission.id}`,
                        public_id: `${Date.now()}_${file.originalFilename}`,
                        resource_type: 'auto' // Handles images, videos, and other file types
                    });

                    // Save attachment record
                    const attachmentData = {
                        submission_id: submission.id,
                        filename: `${Date.now()}_${file.originalFilename}`,
                        original_filename: file.originalFilename,
                        file_url: uploadResult.secure_url,
                        file_size: file.size,
                        mime_type: file.mimetype
                    };

                    const attachment = await database.createFileAttachment(attachmentData);
                    attachments.push(attachment);

                    console.log(`File uploaded: ${file.originalFilename}`);
                } catch (uploadError) {
                    console.error(`Error uploading file ${file.originalFilename}:`, uploadError);
                    // Continue with other files even if one fails
                }
            }
        }

        // Send email notifications
        try {
            // Send confirmation to customer
            await emailService.sendCustomerNotification('estimate', customerData, submission);
            console.log('Customer notification sent');

            // Send notification to admin
            await emailService.sendAdminNotification('estimate', customerData, submission, attachments);
            console.log('Admin notification sent');
        } catch (emailError) {
            console.error('Error sending email notifications:', emailError);
            // Don't fail the entire request if email fails
        }

        // Return success response
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Estimate request submitted successfully',
                submissionId: submission.id,
                attachmentCount: attachments.length
            })
        };

    } catch (error) {
        console.error('Error processing estimate form:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'There was an error processing your request. Please try again or contact us directly at (703) 997-0026.',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            })
        };
    }
};