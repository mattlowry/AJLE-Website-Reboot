-- AJ Long Electric Form Management System Database Schema
-- Compatible with PostgreSQL (Supabase)

-- Create enum types for form types and status
CREATE TYPE form_type AS ENUM ('estimate', 'schedule', 'inquiry');
CREATE TYPE submission_status AS ENUM ('new', 'in_progress', 'completed', 'closed');

-- Migration note: If you have an existing database with the old enum values, run:
-- ALTER TYPE submission_status ADD VALUE 'completed';
-- ALTER TYPE submission_status ADD VALUE 'closed';
-- UPDATE form_submissions SET status = 'completed' WHERE status = 'resolved';
-- UPDATE form_submissions SET status = 'closed' WHERE status = 'archived';

-- Create customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(10),
    zip_code VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create form submissions table
CREATE TABLE form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    form_type form_type NOT NULL,
    status submission_status DEFAULT 'new',
    subject VARCHAR(255),
    message TEXT NOT NULL,
    project_type VARCHAR(100),
    budget_range VARCHAR(50),
    timeline VARCHAR(50),
    preferred_date DATE,
    preferred_time VARCHAR(50),
    service_location TEXT,
    urgency VARCHAR(20) DEFAULT 'normal',
    metadata JSONB, -- For storing additional form-specific data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create file attachments table
CREATE TABLE file_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin responses table
CREATE TABLE admin_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
    admin_email VARCHAR(255) NOT NULL,
    response_text TEXT NOT NULL,
    response_type VARCHAR(50) DEFAULT 'email', -- email, phone, in_person
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin users table
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_form_submissions_customer_id ON form_submissions(customer_id);
CREATE INDEX idx_form_submissions_form_type ON form_submissions(form_type);
CREATE INDEX idx_form_submissions_status ON form_submissions(status);
CREATE INDEX idx_form_submissions_created_at ON form_submissions(created_at DESC);
CREATE INDEX idx_file_attachments_submission_id ON file_attachments(submission_id);
CREATE INDEX idx_admin_responses_submission_id ON admin_responses(submission_id);
CREATE INDEX idx_admin_users_email ON admin_users(email);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_submissions_updated_at BEFORE UPDATE ON form_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create your admin user with this command after setup:
-- 
-- First, generate a secure password hash using bcrypt:
-- Node.js: node -e "console.log(require('bcryptjs').hashSync('YourSecurePassword123!', 10))"
-- Online: Use bcrypt-generator.com with cost factor 10
--
-- Then run:
-- INSERT INTO admin_users (email, password_hash, first_name, last_name, role, is_active) 
-- VALUES (
--     'your-email@ajlongelectric.com',
--     'your_bcrypt_hashed_password_here',
--     'Your',
--     'Name',
--     'admin',
--     true
-- );

-- Create view for customer summary with submission counts
CREATE VIEW customer_summary AS
SELECT 
    c.*,
    COUNT(fs.id) as total_submissions,
    COUNT(CASE WHEN fs.status = 'new' THEN 1 END) as new_submissions,
    COUNT(CASE WHEN fs.status = 'in_progress' THEN 1 END) as in_progress_submissions,
    COUNT(CASE WHEN fs.status = 'resolved' THEN 1 END) as resolved_submissions,
    MAX(fs.created_at) as last_submission_date
FROM customers c
LEFT JOIN form_submissions fs ON c.id = fs.customer_id
GROUP BY c.id;

-- Create view for submission details with customer info
CREATE VIEW submission_details AS
SELECT 
    fs.*,
    c.first_name,
    c.last_name,
    c.email,
    c.phone,
    c.address,
    c.city,
    c.state,
    c.zip_code,
    COUNT(fa.id) as attachment_count,
    COUNT(ar.id) as response_count
FROM form_submissions fs
JOIN customers c ON fs.customer_id = c.id
LEFT JOIN file_attachments fa ON fs.id = fa.submission_id
LEFT JOIN admin_responses ar ON fs.id = ar.submission_id
GROUP BY fs.id, c.id;