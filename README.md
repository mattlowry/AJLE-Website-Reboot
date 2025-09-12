# AJ Long Electric - Form Management System

A professional form management system with admin dashboard for AJ Long Electric, built with modern web technologies and deployed on Netlify.

## 🚀 Deployment Guide

### Prerequisites
1. **Netlify Account** - Sign up at [netlify.com](https://netlify.com)
2. **Supabase Account** - Sign up at [supabase.com](https://supabase.com)
3. **GitHub Repository** - Already set up at https://github.com/mattlowry/AJLE-Website-Reboot.git

### Step 1: Set Up Supabase

1. **Create a new Supabase project**:
   - Go to [app.supabase.com](https://app.supabase.com)
   - Click "New Project"
   - Fill in project details
   - Save the database password securely

2. **Run the database schema**:
   - Go to SQL Editor in Supabase dashboard
   - Copy contents from `database/schema.sql`
   - Run the SQL to create tables

3. **Get your Supabase credentials**:
   - Go to Settings → API
   - Copy the following:
     - Project URL
     - anon public key
     - service_role key (keep this secret!)

### Step 2: Deploy to Netlify

1. **Connect GitHub to Netlify**:
   - Log in to Netlify
   - Click "Add new site" → "Import an existing project"
   - Choose GitHub and select your repository

2. **Configure build settings**:
   - Build command: (leave empty)
   - Publish directory: `.`
   - Functions directory: `netlify/functions`

3. **Set environment variables in Netlify**:
   Go to Site Settings → Environment Variables and add:
   
   ```
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_KEY=your_service_key
   JWT_SECRET=generate_a_32_char_random_string
   JWT_REFRESH_SECRET=generate_another_32_char_random_string
   ```

   To generate secure secrets, use:
   ```bash
   openssl rand -base64 32
   ```

4. **Deploy the site**:
   - Click "Deploy site"
   - Wait for deployment to complete
   - Your site will be live at `https://your-site-name.netlify.app`

### Step 3: Create Admin User

1. **Access Supabase SQL Editor**
2. **Run this SQL to create an admin user**:
   ```sql
   INSERT INTO admins (email, password_hash, first_name, last_name, role)
   VALUES (
     'admin@ajlongelectric.com',
     crypt('YourSecurePassword123!', gen_salt('bf')),
     'Admin',
     'User',
     'super_admin'
   );
   ```
   **IMPORTANT**: Change the email and password immediately!

### Step 4: Test Your Deployment

1. **Visit your site**: `https://your-site-name.netlify.app`
2. **Test form submissions**: Try each form type
3. **Access admin dashboard**: `/dashboard`
4. **Log in with your admin credentials**
5. **Verify all features work**:
   - Form submissions appear
   - Filters and search work
   - Status updates save
   - Responses can be sent

## 🔧 Configuration

### Email Notifications (Optional)

To enable email notifications, add these environment variables:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_specific_password
EMAIL_FROM=noreply@ajlongelectric.com
```

### Custom Domain

1. Go to Netlify Site Settings → Domain Management
2. Add your custom domain
3. Update DNS settings with your domain provider
4. Enable HTTPS (automatic with Netlify)

## 📱 Features

### Public Forms
- **Estimate Requests** - Get project quotes
- **Schedule Service** - Book appointments
- **General Inquiries** - Contact form

### Admin Dashboard
- **Secure Authentication** - JWT-based auth with refresh tokens
- **Real-time Updates** - Live notifications for new submissions
- **Advanced Search** - Full-text search across all data
- **Bulk Operations** - Update multiple submissions at once
- **Data Export** - Export to CSV/JSON
- **Keyboard Shortcuts** - Power user features
- **Auto-save** - Never lose draft responses
- **Dashboard Widgets** - Quick insights and analytics

## 🔐 Security

- **Input Validation** - Comprehensive client and server-side validation
- **XSS Protection** - All inputs sanitized
- **SQL Injection Prevention** - Parameterized queries
- **HTTPS Only** - Enforced by Netlify
- **Secure Headers** - CSP, X-Frame-Options, etc.
- **Rate Limiting** - Prevent abuse
- **HttpOnly Cookies** - Secure token storage

## 🛠️ Maintenance

### Update Environment Variables
1. Go to Netlify dashboard
2. Site Settings → Environment Variables
3. Update values
4. Trigger redeploy

### Database Migrations
1. New migrations in `database/migrations/`
2. Run via Supabase SQL Editor
3. Test thoroughly before production

### Monitor Performance
- Check Netlify Analytics
- Monitor Supabase dashboard
- Review function logs in Netlify

## 📞 Support

For issues or questions:
1. Check Netlify function logs
2. Review Supabase logs
3. Open issue on GitHub

## 📄 License

© 2024 AJ Long Electric. All rights reserved.