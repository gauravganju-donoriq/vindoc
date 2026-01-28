-- Create voice_agent_config table for admin-managed Bolna agent settings
CREATE TABLE public.voice_agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bolna_agent_id TEXT,
  agent_name TEXT NOT NULL DEFAULT 'CertChaperone Reminder',
  voice_provider TEXT NOT NULL DEFAULT 'sarvam',
  voice_id TEXT,
  voice_name TEXT,
  language TEXT NOT NULL DEFAULT 'hi',
  system_prompt TEXT NOT NULL,
  welcome_message TEXT NOT NULL,
  call_terminate_seconds INTEGER DEFAULT 60,
  hangup_after_silence INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_agent_config ENABLE ROW LEVEL SECURITY;

-- Only super_admin can manage voice config
CREATE POLICY "Super admins can view voice config" 
ON public.voice_agent_config 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert voice config" 
ON public.voice_agent_config 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update voice config" 
ON public.voice_agent_config 
FOR UPDATE 
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete voice config" 
ON public.voice_agent_config 
FOR DELETE 
USING (has_role(auth.uid(), 'super_admin'));

-- Create trigger for updating updated_at
CREATE TRIGGER update_voice_agent_config_updated_at
BEFORE UPDATE ON public.voice_agent_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default configuration
INSERT INTO public.voice_agent_config (
  agent_name,
  voice_provider,
  language,
  system_prompt,
  welcome_message,
  call_terminate_seconds,
  hangup_after_silence
) VALUES (
  'CertChaperone Reminder',
  'sarvam',
  'hi',
  'You are a helpful assistant from CertChaperone, a vehicle document management app. You are calling {{owner_name}} about their vehicle {{vehicle_number}}. The {{document_type}} {{days_message}}. Be warm, helpful, and keep the conversation brief. Speak in a mix of Hindi and English (Hinglish) that is natural for Indian users.',
  'Namaste {{owner_name}} ji! CertChaperone se bol rahe hain. Aapki gaadi {{vehicle_number}} ke documents ke baare mein ek important update hai.',
  60,
  10
);