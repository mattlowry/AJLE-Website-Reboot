import formidable from 'formidable';
import { v2 as cloudinary } from 'cloudinary';

// Initialize Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper function to upload files to Cloudinary
async function uploadToCloudinary(file, folder) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: `ajlong-electric/${folder}` },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    
    uploadStream.write(file.data);
    uploadStream.end();
  });
}

// Helper function to send email notifications
async function sendEmailNotification(data, fileUrls) {
  // This would use a service like SendGrid, Mailchimp, etc.
  // Example with SendGrid:
  /*
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  
  await sgMail.send({
    to: data.email,
    from: 'info@ajlongelectric.com',
    subject: 'Your Estimate Request Confirmation',
    text: `Thank you for your estimate request, ${data.name}. We'll be in touch within 24 hours.`,
    html: `<p>Thank you for your estimate request, ${data.name}.</p>
           <p>We'll be in touch within 24 hours with your detailed estimate.</p>`,
  });
  
  // Notification to the company
  await sgMail.send({
    to: 'estimates@ajlongelectric.com',
    from: 'info@ajlongelectric.com',
    subject: 'New Estimate Request',
    text: `New estimate request from ${data.name} for ${data.service}`,
    html: `<p>New estimate request received:</p>
           <ul>
             <li>Name: ${data.name}</li>
             <li>Email: ${data.email}</li>
             <li>Phone: ${data.phone}</li>
             <li>Service: ${data.service}</li>
           </ul>`,
  });
  */
  
  console.log('Email notification would be sent here');
  return true;
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Parse the form data with formidable
    const form = formidable({ 
      multiples: true,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024 // 10MB max file size
    });
    
    // Parse the form
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    // Create a unique ID for this estimate
    const estimateId = Date.now().toString();
    
    // Store the form data (in a real implementation, this would go to a database)
    const formData = {
      id: estimateId,
      name: fields.name,
      email: fields.email,
      phone: fields.phone,
      address: `${fields.address}, ${fields.city}, ${fields.zip}`,
      service: fields.service,
      timeline: fields.timeline,
      description: fields.description,
      created: new Date().toISOString()
    };
    
    console.log('Estimate request received:', formData);
    
    // Process file uploads
    let fileUrls = [];
    
    if (files.media) {
      // Handle if media is an array or single file
      const mediaFiles = Array.isArray(files.media) ? files.media : [files.media];
      
      // Upload each file to Cloudinary
      const uploadPromises = mediaFiles.map(file => 
        uploadToCloudinary(file, `estimates/${estimateId}`)
      );
      
      const uploadResults = await Promise.all(uploadPromises);
      
      // Store the URLs
      fileUrls = uploadResults.map(result => result.secure_url);
      
      console.log(`Uploaded ${fileUrls.length} files to Cloudinary`);
    }
    
    // Send confirmation emails
    await sendEmailNotification(formData, fileUrls);
    
    // Return success response
    return res.status(200).json({ 
      success: true, 
      message: 'Estimate request submitted successfully',
      estimateId
    });
    
  } catch (error) {
    console.error('Error processing estimate form:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'There was an error processing your request. Please try again.'
    });
  }
}

// Disable body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
}; 