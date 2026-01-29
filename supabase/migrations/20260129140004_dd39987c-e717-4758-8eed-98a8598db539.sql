-- Create parts_requests table
CREATE TABLE IF NOT EXISTS public.parts_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  part_name text NOT NULL,
  part_category text NOT NULL DEFAULT 'other',
  condition_preference text NOT NULL DEFAULT 'any',
  quantity integer NOT NULL DEFAULT 1,
  urgency text NOT NULL DEFAULT 'medium',
  description text,
  status text NOT NULL DEFAULT 'pending',
  quoted_price numeric,
  admin_notes text,
  vendor_info text,
  estimated_delivery date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.parts_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can create their own parts requests"
  ON public.parts_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own parts requests"
  ON public.parts_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can cancel their pending requests"
  ON public.parts_requests FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (status = 'cancelled');

CREATE POLICY "Super admins can view all parts requests"
  ON public.parts_requests FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update parts requests"
  ON public.parts_requests FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'));

-- Add updated_at trigger
CREATE TRIGGER update_parts_requests_updated_at
  BEFORE UPDATE ON public.parts_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes for faster queries
CREATE INDEX idx_parts_requests_user_id ON public.parts_requests(user_id);
CREATE INDEX idx_parts_requests_vehicle_id ON public.parts_requests(vehicle_id);
CREATE INDEX idx_parts_requests_status ON public.parts_requests(status);
CREATE INDEX idx_parts_requests_created_at ON public.parts_requests(created_at DESC);