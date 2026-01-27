-- Create vehicle_transfers table to track ownership transfer requests
CREATE TABLE public.vehicle_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_phone TEXT,
  recipient_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.vehicle_transfers ENABLE ROW LEVEL SECURITY;

-- Sender can view their own transfer requests
CREATE POLICY "Senders can view their transfers"
ON public.vehicle_transfers
FOR SELECT
USING (auth.uid() = sender_id);

-- Recipients can view transfers sent to them (matched by email)
CREATE POLICY "Recipients can view transfers to them"
ON public.vehicle_transfers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email = vehicle_transfers.recipient_email
  )
);

-- Only sender can create transfers for their own vehicles
CREATE POLICY "Senders can create transfers"
ON public.vehicle_transfers
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id 
  AND EXISTS (
    SELECT 1 FROM public.vehicles 
    WHERE vehicles.id = vehicle_id 
    AND vehicles.user_id = auth.uid()
  )
);

-- Sender can cancel their pending transfers
CREATE POLICY "Senders can cancel their transfers"
ON public.vehicle_transfers
FOR UPDATE
USING (auth.uid() = sender_id AND status = 'pending');

-- Recipients can accept/reject transfers sent to them
CREATE POLICY "Recipients can respond to transfers"
ON public.vehicle_transfers
FOR UPDATE
USING (
  status = 'pending'
  AND EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email = vehicle_transfers.recipient_email
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_vehicle_transfers_updated_at
BEFORE UPDATE ON public.vehicle_transfers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_vehicle_transfers_recipient_email ON public.vehicle_transfers(recipient_email);
CREATE INDEX idx_vehicle_transfers_status ON public.vehicle_transfers(status);
CREATE INDEX idx_vehicle_transfers_expires_at ON public.vehicle_transfers(expires_at);