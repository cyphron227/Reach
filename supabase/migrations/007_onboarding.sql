-- Migration: Add onboarding tracking to users table
-- This tracks whether a user has completed the onboarding flow

-- Add onboarding_completed_at column to users table
-- NULL = onboarding not completed, timestamp = when onboarding was completed
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- For existing users, mark them as having completed onboarding
-- (they don't need to see the new onboarding flow)
UPDATE public.users
SET onboarding_completed_at = created_at
WHERE onboarding_completed_at IS NULL;

-- Add feature flag for onboarding_v2 (default OFF)
INSERT INTO public.feature_flags (id, description, is_enabled, rollout_percentage)
VALUES ('onboarding_v2', 'New onboarding flow with philosophy screens and guided connection setup', false, 0)
ON CONFLICT (id) DO NOTHING;
