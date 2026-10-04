-- ====================================================================
-- SHANTHIBAVANAM HOSTEL MANAGEMENT SYSTEM
-- Migration: Add Hostel Admission Application fields to student_profiles
-- ====================================================================

-- 1. Add new columns to public.student_profiles safely
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS programme_of_study TEXT,
  ADD COLUMN IF NOT EXISTS institute TEXT,
  ADD COLUMN IF NOT EXISTS firm_details TEXT,
  ADD COLUMN IF NOT EXISTS parent_guardian_name TEXT,
  ADD COLUMN IF NOT EXISTS relationship TEXT,
  ADD COLUMN IF NOT EXISTS occupation TEXT,
  ADD COLUMN IF NOT EXISTS parent_contact TEXT,
  ADD COLUMN IF NOT EXISTS parent_address TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_usage TEXT DEFAULT 'No',
  ADD COLUMN IF NOT EXISTS date_of_admission DATE,
  ADD COLUMN IF NOT EXISTS declaration_accepted BOOLEAN DEFAULT FALSE;

-- 2. Verify columns
COMMENT ON COLUMN public.student_profiles.age IS 'Applicant age in years';
COMMENT ON COLUMN public.student_profiles.date_of_birth IS 'Applicant date of birth';
COMMENT ON COLUMN public.student_profiles.programme_of_study IS 'Programme / course of study';
COMMENT ON COLUMN public.student_profiles.institute IS 'College / Institute name';
COMMENT ON COLUMN public.student_profiles.firm_details IS 'Employer or workplace firm details for working residents';
COMMENT ON COLUMN public.student_profiles.parent_guardian_name IS 'Name of parent or guardian';
COMMENT ON COLUMN public.student_profiles.relationship IS 'Relationship to applicant (e.g. Father, Mother, Guardian)';
COMMENT ON COLUMN public.student_profiles.occupation IS 'Parent / guardian occupation';
COMMENT ON COLUMN public.student_profiles.parent_contact IS 'Parent / guardian contact phone number';
COMMENT ON COLUMN public.student_profiles.parent_address IS 'Parent / guardian residential address';
COMMENT ON COLUMN public.student_profiles.vehicle_usage IS 'Vehicle usage in hostel (Yes / No)';
COMMENT ON COLUMN public.student_profiles.date_of_admission IS 'Date of hostel admission';
COMMENT ON COLUMN public.student_profiles.declaration_accepted IS 'Whether applicant agreed to the hostel admission declaration';
