-- Create vehicle_history table to track all vehicle events
CREATE TABLE public.vehicle_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'vehicle_added',
    'vehicle_updated',
    'data_refreshed',
    'document_uploaded',
    'document_deleted',
    'transfer_initiated',
    'transfer_accepted',
    'transfer_rejected',
    'transfer_cancelled',
    'transfer_expired'
  )),
  event_description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.vehicle_history ENABLE ROW LEVEL SECURITY;

-- Users can view history for vehicles they own or have owned
CREATE POLICY "Users can view history for their vehicles"
ON public.vehicle_history
FOR SELECT
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.vehicles 
    WHERE vehicles.id = vehicle_id 
    AND vehicles.user_id = auth.uid()
  )
);

-- Users can insert history for their own actions
CREATE POLICY "Users can insert their own history"
ON public.vehicle_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create indexes for faster lookups
CREATE INDEX idx_vehicle_history_vehicle_id ON public.vehicle_history(vehicle_id);
CREATE INDEX idx_vehicle_history_created_at ON public.vehicle_history(created_at DESC);