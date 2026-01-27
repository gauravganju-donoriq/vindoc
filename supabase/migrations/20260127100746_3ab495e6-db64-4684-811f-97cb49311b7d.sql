-- Add additional vehicle fields for comprehensive tracking and resale value
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS engine_number text,
ADD COLUMN IF NOT EXISTS chassis_number text,
ADD COLUMN IF NOT EXISTS color text,
ADD COLUMN IF NOT EXISTS seating_capacity integer,
ADD COLUMN IF NOT EXISTS cubic_capacity integer,
ADD COLUMN IF NOT EXISTS owner_count integer,
ADD COLUMN IF NOT EXISTS emission_norms text,
ADD COLUMN IF NOT EXISTS is_financed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS financer text,
ADD COLUMN IF NOT EXISTS noc_details text,
ADD COLUMN IF NOT EXISTS vehicle_category text,
ADD COLUMN IF NOT EXISTS body_type text,
ADD COLUMN IF NOT EXISTS wheelbase text,
ADD COLUMN IF NOT EXISTS gross_vehicle_weight text,
ADD COLUMN IF NOT EXISTS unladen_weight text;