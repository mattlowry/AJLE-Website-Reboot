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
        console.log('Processing inquiry form submission...');

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
        const requiredFields = ['first_name', 'last_name', 'email'];
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
            form_type: 'inquiry',
            subject: Array.isArray(fields.subject) ? fields.subject[0] : (fields.subject || 'General Inquiry'),
            message: Array.isArray(fields.message) ? fields.message[0] : fields.message,
            service_location: customerData.address ? `${customerData.address}, ${customerData.city}, ${customerData.state} ${customerData.zip_code}` : null,
            urgency: Array.isArray(fields.urgency) ? fields.urgency[0] : (fields.urgency || 'normal'),
            metadata: {
                form_source: 'website_inquiry_form',
                user_agent: event.headers['user-agent'],
                ip_address: event.headers['x-forwarded-for'] || event.headers['x-real-ip'],
                inquiry_category: Array.isArray(fields.category) ? fields.category[0] : fields.category,
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
                    message: 'Message is required'
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
                        folder: `ajlong-electric/inquiries/${submission.id}`,
                        public_id: `${Date.now()}_${file.originalFilename}`,
                        resource_type: 'auto'
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
                }
            }
        }

        // Send email notifications
        try {
            // Send confirmation to customer
            await emailService.sendCustomerNotification('inquiry', customerData, submission);
            console.log('Customer notification sent');

            // Send notification to admin
            await emailService.sendAdminNotification('inquiry', customerData, submission, attachments);
            console.log('Admin notification sent');
        } catch (emailError) {
            console.error('Error sending email notifications:', emailError);
        }

        // Return success response
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Inquiry submitted successfully',
                submissionId: submission.id,
                attachmentCount: attachments.length
            })
        };

    } catch (error) {
        console.error('Error processing inquiry form:', error);
        
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