-- Create vehicles table
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  registration_number TEXT NOT NULL,
  owner_name TEXT,
  vehicle_class TEXT,
  fuel_type TEXT,
  maker_model TEXT,
  manufacturer TEXT,
  registration_date DATE,
  insurance_company TEXT,
  insurance_expiry DATE,
  pucc_valid_upto DATE,
  fitness_valid_upto DATE,
  road_tax_valid_upto DATE,
  rc_status TEXT,
  raw_api_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create documents table for storing uploaded files
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL, -- 'insurance', 'rc', 'pucc', 'fitness', 'other'
  document_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for vehicles table
CREATE POLICY "Users can view their own vehicles"
ON public.vehicles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vehicles"
ON public.vehicles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vehicles"
ON public.vehicles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vehicles"
ON public.vehicles
FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for documents table
CREATE POLICY "Users can view their own documents"
ON public.documents
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
ON public.documents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
ON public.documents
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
ON public.documents
FOR DELETE
USING (auth.uid() = user_id);

-- Create storage bucket for vehicle documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-documents', 'vehicle-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for vehicle documents
CREATE POLICY "Users can view their own vehicle documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'vehicle-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own vehicle documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'vehicle-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own vehicle documents"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'vehicle-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own vehicle documents"
ON storage.objects
FOR DELETE
USING (bucket_id = 'vehicle-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_vehicles_updated_at
BEFORE UPDATE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();