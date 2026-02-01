-- Add 'daily' and 'annually' options to catchup_frequency enum
-- Maintains chronological order: daily, weekly, biweekly, monthly, quarterly, biannually, annually

-- Add new enum values
ALTER TYPE catchup_frequency ADD VALUE IF NOT EXISTS 'daily' BEFORE 'weekly';
ALTER TYPE catchup_frequency ADD VALUE IF NOT EXISTS 'annually' AFTER 'biannually';
