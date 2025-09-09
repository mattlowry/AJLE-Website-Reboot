# AJ Long Electric - Website & Form Management System

A comprehensive website and form management system for AJ Long Electric, featuring a customer-facing website with multiple form types and a complete admin dashboard for managing submissions.

## 🚀 Features

### Customer Features
- **Enhanced Contact Page** with 3 form types:
  - Estimate Requests
  - Service Scheduling
  - General Inquiries
- **File Upload Support** with drag-and-drop functionality
- **Responsive Design** optimized for mobile and desktop
- **Real-time Form Validation**

### Admin Features
- **Secure Admin Dashboard** with JWT authentication
- **Real-time Notifications** for new submissions
- **Customer Message History** tracking
- **Status Management** (New, In Progress, Completed, Closed)
- **Email Response System** integrated with Postmark
- **File Attachment Management** with Cloudinary
- **Dashboard Analytics** and statistics

## 🛠 Tech Stack

- **Frontend**: HTML, CSS (Tailwind), Vanilla JavaScript
- **Backend**: Netlify Functions (Node.js)
- **Database**: Supabase (PostgreSQL)
- **Email**: Postmark
- **File Storage**: Cloudinary
- **Authentication**: JWT tokens
- **Deployment**: Netlify

## 📋 Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy the example environment file:
```bash
cp .env.example .env
```

Configure the following variables in `.env`:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon key
- `POSTMARK_SERVER_TOKEN` - Your Postmark server token
- `JWT_SECRET` - A secure random string for JWT tokens
- `CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Your Cloudinary API key
- `CLOUDINARY_API_SECRET` - Your Cloudinary API secret

### 3. Database Setup
1. Create a new Supabase project
2. Run the SQL schema from `/database/schema.sql` in your Supabase SQL editor
3. Create an admin user:
```sql
INSERT INTO admin_users (email, password_hash, name, role, is_active) 
VALUES (
    'admin@ajlongelectric.com',
    '$2a$10$your_bcrypt_hashed_password_here',
    'Admin User',
    'admin',
    true
);
```

### 4. Development
```bash
netlify dev
```

### 5. Deployment
```bash
netlify deploy --prod
```

## 📂 Project Structure

```
├── database/
│   └── schema.sql              # Database schema
├── dashboard/
│   ├── index.html             # Admin dashboard interface
│   └── js/admin-dashboard.js  # Dashboard functionality
├── netlify/functions/
│   ├── lib/
│   │   ├── database.js        # Database service layer
│   │   └── email.js           # Email service integration
│   ├── admin-auth.js          # Admin authentication
│   ├── admin-dashboard.js     # Dashboard API
│   ├── admin-notifications.js # Real-time notifications
│   ├── form-estimate.js       # Estimate form handler
│   ├── form-inquiry.js        # Inquiry form handler
│   └── form-schedule.js       # Schedule form handler
├── contact-new.html           # Enhanced contact page
├── .env.example              # Environment template
└── package.json              # Dependencies
```

## 🔧 API Endpoints

### Form Submission
- `POST /.netlify/functions/form-estimate` - Submit estimate requests
- `POST /.netlify/functions/form-schedule` - Submit scheduling requests
- `POST /.netlify/functions/form-inquiry` - Submit general inquiries

### Admin API
- `POST /.netlify/functions/admin-auth` - Admin authentication
- `GET/POST /.netlify/functions/admin-dashboard` - Dashboard data and actions
- `GET /.netlify/functions/admin-notifications` - Real-time notifications (SSE)

## 📧 Email Configuration

The system uses Postmark with dedicated email addresses:
- **Estimates**: Estimate@AJLongElectric.com
- **Scheduling**: Schedule@AJLongElectric.com
- **Inquiries**: Contact@AJLongElectric.com

## 🔐 Admin Access

Access the admin dashboard at `/dashboard/index.html` with your configured admin credentials.

## 📱 Mobile Support

The entire system is fully responsive and optimized for mobile devices, including touch-friendly form interactions and mobile-optimized admin dashboard.

## 🚀 Deployment on Netlify

1. Connect your GitHub repository to Netlify
2. Configure environment variables in Netlify dashboard
3. Set build command: `npm run build` (if applicable)
4. Set publish directory: `./` (root directory)
5. Deploy!

## 📞 Support

For technical support or questions about this system, contact the development team.

---

Built with ❤️ for AJ Long Electric