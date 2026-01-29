-- Create assistance_requests table
CREATE TABLE IF NOT EXISTS public.assistance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  request_type text NOT NULL DEFAULT 'other',
  description text,
  location_text text NOT NULL,
  location_lat numeric,
  location_lng numeric,
  urgency text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  assigned_to text,
  assigned_phone text,
  assigned_at timestamptz,
  admin_notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assistance_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can create their own assistance requests"
  ON public.assistance_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own assistance requests"
  ON public.assistance_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can cancel their pending requests"
  ON public.assistance_requests FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (status = 'cancelled');

CREATE POLICY "Super admins can view all assistance requests"
  ON public.assistance_requests FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update assistance requests"
  ON public.assistance_requests FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'));

-- Add updated_at trigger
CREATE TRIGGER update_assistance_requests_updated_at
  BEFORE UPDATE ON public.assistance_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes for faster queries
CREATE INDEX idx_assistance_requests_user_id ON public.assistance_requests(user_id);
CREATE INDEX idx_assistance_requests_vehicle_id ON public.assistance_requests(vehicle_id);
CREATE INDEX idx_assistance_requests_status ON public.assistance_requests(status);
CREATE INDEX idx_assistance_requests_created_at ON public.assistance_requests(created_at DESC);