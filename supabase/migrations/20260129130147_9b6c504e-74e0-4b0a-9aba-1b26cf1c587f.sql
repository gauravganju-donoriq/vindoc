-- Create vehicle_challans table
CREATE TABLE IF NOT EXISTS public.vehicle_challans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  challan_no text NOT NULL,
  challan_date_time timestamptz,
  challan_place text,
  challan_status text NOT NULL DEFAULT 'Pending',
  remark text,
  fine_imposed numeric,
  driver_name text,
  owner_name text,
  department text,
  state_code text,
  offence_details jsonb DEFAULT '[]'::jsonb,
  sent_to_court boolean DEFAULT false,
  court_details jsonb,
  raw_api_data jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(vehicle_id, challan_no)
);

-- Enable RLS
ALTER TABLE public.vehicle_challans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own challans"
  ON public.vehicle_challans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challans"
  ON public.vehicle_challans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challans"
  ON public.vehicle_challans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own challans"
  ON public.vehicle_challans FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_vehicle_challans_updated_at
  BEFORE UPDATE ON public.vehicle_challans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_vehicle_challans_vehicle_id ON public.vehicle_challans(vehicle_id);
CREATE INDEX idx_vehicle_challans_user_id ON public.vehicle_challans(user_id);