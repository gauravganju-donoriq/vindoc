-- Create profiles table for user preferences
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT,
  phone_verified BOOLEAN DEFAULT false,
  voice_reminders_enabled BOOLEAN DEFAULT true,
  preferred_language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Create voice_call_logs table
CREATE TABLE public.voice_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL,
  document_type TEXT,
  bolna_call_id TEXT,
  status TEXT DEFAULT 'initiated',
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on voice_call_logs
ALTER TABLE public.voice_call_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for voice_call_logs
CREATE POLICY "Users can view own call logs" ON public.voice_call_logs FOR SELECT USING (auth.uid() = user_id);

-- Create trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();