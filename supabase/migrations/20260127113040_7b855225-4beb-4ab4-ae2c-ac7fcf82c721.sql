-- Add unique constraint on registration_number (system-wide)
ALTER TABLE public.vehicles
ADD CONSTRAINT vehicles_registration_number_unique 
UNIQUE (registration_number);

-- Add timestamp column for tracking last API fetch
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS data_last_fetched_at 
TIMESTAMP WITH TIME ZONE DEFAULT NULL;