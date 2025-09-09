const postmark = require('postmark');

class EmailService {
    constructor() {
        this.client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN);
        
        // Email addresses for different form types
        this.fromAddresses = {
            estimate: 'Estimate@AJLongElectric.com',
            schedule: 'Schedule@AJLongElectric.com',
            inquiry: 'Contact@AJLongElectric.com'
        };
        
        this.replyToAddresses = {
            estimate: 'Estimate@AJLongElectric.com',
            schedule: 'Schedule@AJLongElectric.com', 
            inquiry: 'Contact@AJLongElectric.com'
        };
    }

    // Send notification to customer
    async sendCustomerNotification(formType, customerData, submissionData) {
        try {
            const templateData = this.getCustomerTemplateData(formType, customerData, submissionData);
            
            await this.client.sendEmailWithTemplate({
                From: this.fromAddresses[formType],
                To: customerData.email,
                TemplateAlias: this.getCustomerTemplateAlias(formType),
                TemplateModel: templateData
            });

            console.log(`Customer notification sent to ${customerData.email} for ${formType}`);
        } catch (error) {
            console.error('Error sending customer notification:', error);
            throw error;
        }
    }

    // Send notification to admin team
    async sendAdminNotification(formType, customerData, submissionData, attachments = []) {
        try {
            const subject = this.getAdminSubject(formType, customerData);
            const htmlBody = this.getAdminHtmlBody(formType, customerData, submissionData);
            const textBody = this.getAdminTextBody(formType, customerData, submissionData);

            const emailData = {
                From: this.fromAddresses[formType],
                To: this.fromAddresses[formType], // Send to the same address for admin review
                Subject: subject,
                HtmlBody: htmlBody,
                TextBody: textBody,
                ReplyTo: customerData.email,
                Attachments: attachments.map(att => ({
                    Name: att.filename,
                    Content: att.content, // Base64 encoded content
                    ContentType: att.contentType
                }))
            };

            await this.client.sendEmail(emailData);
            console.log(`Admin notification sent for ${formType} submission`);
        } catch (error) {
            console.error('Error sending admin notification:', error);
            throw error;
        }
    }

    // Send response from admin to customer
    async sendAdminResponse(formType, customerData, responseText, adminEmail) {
        try {
            const subject = this.getResponseSubject(formType);
            const htmlBody = this.getResponseHtmlBody(formType, customerData, responseText, adminEmail);
            const textBody = this.getResponseTextBody(formType, customerData, responseText);

            await this.client.sendEmail({
                From: this.fromAddresses[formType],
                To: customerData.email,
                Subject: subject,
                HtmlBody: htmlBody,
                TextBody: textBody,
                ReplyTo: this.replyToAddresses[formType]
            });

            console.log(`Admin response sent to ${customerData.email}`);
        } catch (error) {
            console.error('Error sending admin response:', error);
            throw error;
        }
    }

    // Helper methods for template data
    getCustomerTemplateData(formType, customerData, submissionData) {
        const baseData = {
            customer_name: `${customerData.first_name} ${customerData.last_name}`,
            customer_email: customerData.email,
            submission_id: submissionData.id,
            form_type: formType,
            message: submissionData.message,
            created_at: new Date(submissionData.created_at).toLocaleString()
        };

        switch (formType) {
            case 'estimate':
                return {
                    ...baseData,
                    project_type: submissionData.project_type,
                    budget_range: submissionData.budget_range,
                    timeline: submissionData.timeline,
                    preferred_date: submissionData.preferred_date,
                    service_location: submissionData.service_location
                };
            case 'schedule':
                return {
                    ...baseData,
                    preferred_date: submissionData.preferred_date,
                    preferred_time: submissionData.preferred_time,
                    service_location: submissionData.service_location,
                    urgency: submissionData.urgency
                };
            case 'inquiry':
                return {
                    ...baseData,
                    subject: submissionData.subject
                };
            default:
                return baseData;
        }
    }

    getCustomerTemplateAlias(formType) {
        switch (formType) {
            case 'estimate':
                return 'estimate-confirmation';
            case 'schedule':
                return 'schedule-confirmation';
            case 'inquiry':
                return 'inquiry-confirmation';
            default:
                return 'general-confirmation';
        }
    }

    getAdminSubject(formType, customerData) {
        const name = `${customerData.first_name} ${customerData.last_name}`;
        switch (formType) {
            case 'estimate':
                return `🔧 New Estimate Request from ${name}`;
            case 'schedule':
                return `📅 New Service Scheduling Request from ${name}`;
            case 'inquiry':
                return `💬 New General Inquiry from ${name}`;
            default:
                return `📋 New Form Submission from ${name}`;
        }
    }

    getAdminHtmlBody(formType, customerData, submissionData) {
        const name = `${customerData.first_name} ${customerData.last_name}`;
        
        let html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #FF7200; padding: 20px; color: white;">
                <h2 style="margin: 0;">${this.getFormTypeTitle(formType)}</h2>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">New submission received</p>
            </div>
            
            <div style="padding: 20px; background: #f9f9f9;">
                <h3 style="color: #FF7200; margin-top: 0;">Customer Information</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 5px 10px 5px 0; font-weight: bold;">Name:</td><td style="padding: 5px 0;">${name}</td></tr>
                    <tr><td style="padding: 5px 10px 5px 0; font-weight: bold;">Email:</td><td style="padding: 5px 0;"><a href="mailto:${customerData.email}">${customerData.email}</a></td></tr>
                    <tr><td style="padding: 5px 10px 5px 0; font-weight: bold;">Phone:</td><td style="padding: 5px 0;"><a href="tel:${customerData.phone}">${customerData.phone}</a></td></tr>
                    ${customerData.address ? `<tr><td style="padding: 5px 10px 5px 0; font-weight: bold;">Address:</td><td style="padding: 5px 0;">${customerData.address}, ${customerData.city}, ${customerData.state} ${customerData.zip_code}</td></tr>` : ''}
                </table>
            </div>
            
            <div style="padding: 20px;">
                <h3 style="color: #FF7200; margin-top: 0;">Request Details</h3>
        `;

        // Add form-specific details
        if (formType === 'estimate') {
            html += `
                <p><strong>Project Type:</strong> ${submissionData.project_type || 'Not specified'}</p>
                <p><strong>Budget Range:</strong> ${submissionData.budget_range || 'Not specified'}</p>
                <p><strong>Timeline:</strong> ${submissionData.timeline || 'Not specified'}</p>
                <p><strong>Preferred Date:</strong> ${submissionData.preferred_date || 'Not specified'}</p>
                <p><strong>Service Location:</strong> ${submissionData.service_location || 'Not specified'}</p>
            `;
        } else if (formType === 'schedule') {
            html += `
                <p><strong>Preferred Date:</strong> ${submissionData.preferred_date || 'Not specified'}</p>
                <p><strong>Preferred Time:</strong> ${submissionData.preferred_time || 'Not specified'}</p>
                <p><strong>Service Location:</strong> ${submissionData.service_location || 'Not specified'}</p>
                <p><strong>Urgency:</strong> ${submissionData.urgency || 'Normal'}</p>
            `;
        } else if (formType === 'inquiry') {
            html += `<p><strong>Subject:</strong> ${submissionData.subject || 'General Inquiry'}</p>`;
        }

        html += `
                <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #FF7200; margin: 15px 0;">
                    <h4 style="margin-top: 0;">Message:</h4>
                    <p style="white-space: pre-wrap; margin-bottom: 0;">${submissionData.message}</p>
                </div>
                
                <p style="color: #666; font-size: 14px;">Submitted: ${new Date(submissionData.created_at).toLocaleString()}</p>
            </div>
        </div>`;

        return html;
    }

    getAdminTextBody(formType, customerData, submissionData) {
        const name = `${customerData.first_name} ${customerData.last_name}`;
        let text = `${this.getFormTypeTitle(formType)}\n\n`;
        
        text += `Customer Information:\n`;
        text += `Name: ${name}\n`;
        text += `Email: ${customerData.email}\n`;
        text += `Phone: ${customerData.phone}\n`;
        if (customerData.address) {
            text += `Address: ${customerData.address}, ${customerData.city}, ${customerData.state} ${customerData.zip_code}\n`;
        }
        text += `\n`;

        text += `Request Details:\n`;
        if (formType === 'estimate') {
            text += `Project Type: ${submissionData.project_type || 'Not specified'}\n`;
            text += `Budget Range: ${submissionData.budget_range || 'Not specified'}\n`;
            text += `Timeline: ${submissionData.timeline || 'Not specified'}\n`;
            text += `Preferred Date: ${submissionData.preferred_date || 'Not specified'}\n`;
            text += `Service Location: ${submissionData.service_location || 'Not specified'}\n`;
        } else if (formType === 'schedule') {
            text += `Preferred Date: ${submissionData.preferred_date || 'Not specified'}\n`;
            text += `Preferred Time: ${submissionData.preferred_time || 'Not specified'}\n`;
            text += `Service Location: ${submissionData.service_location || 'Not specified'}\n`;
            text += `Urgency: ${submissionData.urgency || 'Normal'}\n`;
        } else if (formType === 'inquiry') {
            text += `Subject: ${submissionData.subject || 'General Inquiry'}\n`;
        }

        text += `\nMessage:\n${submissionData.message}\n\n`;
        text += `Submitted: ${new Date(submissionData.created_at).toLocaleString()}`;

        return text;
    }

    getResponseSubject(formType) {
        switch (formType) {
            case 'estimate':
                return 'Re: Your Estimate Request - AJ Long Electric';
            case 'schedule':
                return 'Re: Your Service Appointment - AJ Long Electric';
            case 'inquiry':
                return 'Re: Your Inquiry - AJ Long Electric';
            default:
                return 'Re: Your Request - AJ Long Electric';
        }
    }

    getResponseHtmlBody(formType, customerData, responseText, adminEmail) {
        return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #FF7200; padding: 20px; color: white;">
                <h2 style="margin: 0;">AJ Long Electric</h2>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Response to your ${formType} request</p>
            </div>
            
            <div style="padding: 20px;">
                <p>Dear ${customerData.first_name},</p>
                
                <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #FF7200; margin: 20px 0;">
                    <p style="white-space: pre-wrap; margin: 0;">${responseText}</p>
                </div>
                
                <p>If you have any questions or need to schedule service, please don't hesitate to contact us:</p>
                
                <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
                    <p><strong>📞 Phone:</strong> <a href="tel:7039970026">(703) 997-0026</a></p>
                    <p><strong>✉️ Email:</strong> <a href="mailto:${this.fromAddresses[formType]}">${this.fromAddresses[formType]}</a></p>
                    <p><strong>🌐 Website:</strong> <a href="https://ajlongelectric.com">ajlongelectric.com</a></p>
                </div>
                
                <p>Thank you for choosing AJ Long Electric!</p>
                
                <div style="border-top: 1px solid #eee; padding-top: 15px; margin-top: 30px; color: #666; font-size: 12px;">
                    <p>AJ Long Electric | Licensed, Bonded & Insured</p>
                    <p>Serving Northern Virginia, DC & Maryland since 1996</p>
                </div>
            </div>
        </div>`;
    }

    getResponseTextBody(formType, customerData, responseText) {
        return `Dear ${customerData.first_name},

${responseText}

If you have any questions or need to schedule service, please don't hesitate to contact us:

Phone: (703) 997-0026
Email: ${this.fromAddresses[formType]}
Website: ajlongelectric.com

Thank you for choosing AJ Long Electric!

---
AJ Long Electric | Licensed, Bonded & Insured
Serving Northern Virginia, DC & Maryland since 1996`;
    }

    getFormTypeTitle(formType) {
        switch (formType) {
            case 'estimate':
                return 'New Estimate Request';
            case 'schedule':
                return 'New Service Scheduling Request';
            case 'inquiry':
                return 'New General Inquiry';
            default:
                return 'New Form Submission';
        }
    }
}

module.exports = new EmailService();