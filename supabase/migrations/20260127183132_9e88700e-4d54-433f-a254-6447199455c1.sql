-- Create service_records table for tracking vehicle maintenance history
CREATE TABLE public.service_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  service_date DATE NOT NULL,
  odometer_reading INTEGER,
  service_type TEXT NOT NULL,
  description TEXT,
  cost DECIMAL(10,2),
  service_center TEXT,
  next_service_due_date DATE,
  next_service_due_km INTEGER,
  receipt_path TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.service_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own service records"
ON public.service_records
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own service records"
ON public.service_records
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own service records"
ON public.service_records
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own service records"
ON public.service_records
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_service_records_updated_at
BEFORE UPDATE ON public.service_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();