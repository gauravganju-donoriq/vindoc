-- Create vehicle_listings table for sell module
CREATE TABLE public.vehicle_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  ai_estimated_price NUMERIC,
  expected_price NUMERIC NOT NULL,
  additional_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add constraint to ensure only one active listing per vehicle
CREATE UNIQUE INDEX unique_active_listing_per_vehicle 
ON public.vehicle_listings (vehicle_id) 
WHERE status IN ('pending', 'approved', 'on_hold');

-- Add check constraint for valid status values
ALTER TABLE public.vehicle_listings 
ADD CONSTRAINT valid_listing_status 
CHECK (status IN ('pending', 'approved', 'rejected', 'on_hold', 'cancelled'));

-- Enable Row Level Security
ALTER TABLE public.vehicle_listings ENABLE ROW LEVEL SECURITY;

-- Policy: Owners can view their own listings
CREATE POLICY "Owners can view their own listings"
ON public.vehicle_listings
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Super admins can view all listings
CREATE POLICY "Super admins can view all listings"
ON public.vehicle_listings
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'));

-- Policy: Owners can create listings for verified vehicles only
CREATE POLICY "Owners can create listings for verified vehicles"
ON public.vehicle_listings
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.vehicles 
    WHERE id = vehicle_id 
    AND user_id = auth.uid() 
    AND is_verified = true
  )
);

-- Policy: Owners can cancel their pending listings
CREATE POLICY "Owners can cancel pending listings"
ON public.vehicle_listings
FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (status = 'cancelled');

-- Policy: Super admins can update all listings
CREATE POLICY "Super admins can update listings"
ON public.vehicle_listings
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_vehicle_listings_updated_at
BEFORE UPDATE ON public.vehicle_listings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();