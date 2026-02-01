-- Add E.164 normalized phone number column
-- phone_raw stores the original user-entered number (for display)
-- phone_e164 stores the E.164 normalized number (for actions like WhatsApp)

-- Rename existing phone_number to phone_raw
ALTER TABLE public.connections
  RENAME COLUMN phone_number TO phone_raw;

-- Add new phone_e164 column for normalized numbers
ALTER TABLE public.connections
  ADD COLUMN phone_e164 text;

-- Add index for phone_e164 lookups
CREATE INDEX idx_connections_phone_e164 ON public.connections(phone_e164);

-- Add comment explaining the columns
COMMENT ON COLUMN public.connections.phone_raw IS 'Original phone number as entered/imported (for display)';
COMMENT ON COLUMN public.connections.phone_e164 IS 'E.164 normalized phone number for actions (e.g., +447911123456)';
