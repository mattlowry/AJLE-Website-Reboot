-- Migration: Fix status enum values to match frontend
-- Run this ONLY if you have an existing database with the old enum values

-- Check current enum values
SELECT unnest(enum_range(NULL::submission_status));

-- Add new enum values if they don't exist
DO $$
BEGIN
    BEGIN
        ALTER TYPE submission_status ADD VALUE 'completed';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER TYPE submission_status ADD VALUE 'closed';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
END$$;

-- Update existing data to use new status values
UPDATE form_submissions SET status = 'completed' WHERE status = 'resolved';
UPDATE form_submissions SET status = 'closed' WHERE status = 'archived';

-- Verify the migration
SELECT status, COUNT(*) as count
FROM form_submissions 
GROUP BY status
ORDER BY status;