-- Add contact info columns to connections table
-- These support importing contacts from the Android contacts picker

ALTER TABLE public.connections
  ADD COLUMN phone_number text,
  ADD COLUMN email text,
  ADD COLUMN preferred_contact_method varchar(20);

-- Add check constraint for preferred_contact_method
ALTER TABLE public.connections
  ADD CONSTRAINT valid_contact_method
  CHECK (preferred_contact_method IN ('call', 'whatsapp', 'text', 'email') OR preferred_contact_method IS NULL);
