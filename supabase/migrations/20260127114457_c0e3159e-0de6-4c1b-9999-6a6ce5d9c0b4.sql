-- Create table to track sent expiry notifications (prevent duplicates)
CREATE TABLE public.expiry_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('insurance', 'pucc', 'fitness', 'road_tax')),
    notification_type TEXT NOT NULL CHECK (notification_type IN ('30_day', '7_day', 'expired')),
    ai_content JSONB,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient duplicate checking
CREATE INDEX idx_expiry_notifications_lookup 
ON public.expiry_notifications(vehicle_id, document_type, notification_type);

-- Create index for user queries
CREATE INDEX idx_expiry_notifications_user 
ON public.expiry_notifications(user_id);

-- Enable Row Level Security
ALTER TABLE public.expiry_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notification history
CREATE POLICY "Users can view their own notifications"
ON public.expiry_notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can insert (edge function uses service role)
-- No INSERT policy needed for regular users as notifications are system-generated