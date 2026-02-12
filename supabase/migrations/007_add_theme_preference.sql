-- Add theme preference to user settings
-- Allows users to choose: light, dark, or follow system

ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS theme_preference text DEFAULT 'system'
  CHECK (theme_preference IN ('light', 'dark', 'system'));

-- Backfill existing rows
UPDATE public.user_settings
SET theme_preference = 'system'
WHERE theme_preference IS NULL;

-- Index for fast reads
CREATE INDEX IF NOT EXISTS user_settings_theme_idx
  ON public.user_settings(theme_preference);
