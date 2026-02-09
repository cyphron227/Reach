-- Add mood tracking to interactions
ALTER TABLE public.interactions
ADD COLUMN IF NOT EXISTS mood TEXT CHECK (mood IN ('happy', 'neutral', 'sad'));
