-- Add vehicle verification columns
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS verification_photo_path text;

-- Add verification event type to the check constraint
ALTER TABLE public.vehicle_history DROP CONSTRAINT IF EXISTS vehicle_history_event_type_check;
ALTER TABLE public.vehicle_history ADD CONSTRAINT vehicle_history_event_type_check 
CHECK (event_type IN (
  'vehicle_added', 
  'vehicle_updated', 
  'data_refreshed', 
  'document_uploaded', 
  'document_deleted',
  'transfer_initiated', 
  'transfer_accepted', 
  'transfer_rejected', 
  'transfer_cancelled',
  'transfer_expired',
  'details_updated',
  'ai_extraction',
  'vehicle_verified',
  'verification_failed'
));