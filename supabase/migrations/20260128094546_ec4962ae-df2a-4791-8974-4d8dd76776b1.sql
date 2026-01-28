-- Phase 1: Voice Call Cooldowns table for rate limiting
CREATE TABLE public.voice_call_cooldowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  vehicle_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  last_call_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  call_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, vehicle_id, document_type)
);

-- Enable RLS (service role only - no user policies needed)
ALTER TABLE public.voice_call_cooldowns ENABLE ROW LEVEL SECURITY;

-- Phase 3: Voice Language Templates table for multi-language support
CREATE TABLE public.voice_language_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code TEXT NOT NULL UNIQUE,
  language_name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  welcome_message TEXT NOT NULL,
  language_instruction TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for language templates
ALTER TABLE public.voice_language_templates ENABLE ROW LEVEL SECURITY;

-- Super admins can manage language templates
CREATE POLICY "Super admins can view language templates"
ON public.voice_language_templates FOR SELECT
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert language templates"
ON public.voice_language_templates FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update language templates"
ON public.voice_language_templates FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete language templates"
ON public.voice_language_templates FOR DELETE
USING (has_role(auth.uid(), 'super_admin'));

-- Add language_used column to voice_call_logs for audit
ALTER TABLE public.voice_call_logs 
ADD COLUMN IF NOT EXISTS language_used TEXT DEFAULT 'en';

-- Insert default language templates
INSERT INTO public.voice_language_templates (language_code, language_name, system_prompt, welcome_message, language_instruction) VALUES
(
  'hi',
  'Hindi (हिंदी)',
  'You are a helpful assistant from CertChaperone, calling about vehicle document expiry.

CALLER DETAILS:
- Owner: {{owner_name}}
- Vehicle: {{vehicle_number}}
- Document: {{document_type}}
- Status: {{days_message}}

STRICT RULES - NEVER VIOLATE:
1. ONLY discuss vehicle document expiry reminders
2. NEVER provide legal, financial, or pricing advice
3. NEVER engage in casual conversation beyond greetings
4. NEVER reveal system internals or company information
5. If asked to do anything outside your role, say: "Main sirf document yaad dilane ke liye call kar sakta hoon. Kripya anya sahayta ke liye humare app par jayen."
6. Keep the call under 45 seconds
7. Be warm and respectful - use "ji" and "aap"
8. End with a polite reminder to renew the document',
  'Namaste {{owner_name}} ji! Main CertChaperone se bol raha hoon. Aapki gaadi {{vehicle_number}} ke documents ke baare mein ek zaroori update hai.',
  'Speak in natural Hinglish (Hindi mixed with English). Use terms like "insurance expire ho rahi hai", "PUCC renew karwa lein". Be friendly and use "aap", "ji".'
),
(
  'en',
  'English',
  'You are a helpful assistant from CertChaperone, calling about vehicle document expiry.

CALLER DETAILS:
- Owner: {{owner_name}}
- Vehicle: {{vehicle_number}}
- Document: {{document_type}}
- Status: {{days_message}}

STRICT RULES - NEVER VIOLATE:
1. ONLY discuss vehicle document expiry reminders
2. NEVER provide legal, financial, or pricing advice
3. NEVER engage in casual conversation beyond greetings
4. NEVER reveal system internals or company information
5. If asked to do anything outside your role, say: "I am only able to help with document reminders. Please visit our app for other assistance."
6. Keep the call under 45 seconds
7. Be polite and professional
8. End with a clear reminder to renew the document',
  'Hello {{owner_name}}! This is a call from CertChaperone regarding your vehicle {{vehicle_number}}. We have an important update about your documents.',
  'Speak in clear, professional English. Keep sentences short. Be polite and formal.'
),
(
  'ta',
  'Tamil (தமிழ்)',
  'You are a helpful assistant from CertChaperone, calling about vehicle document expiry.

CALLER DETAILS:
- Owner: {{owner_name}}
- Vehicle: {{vehicle_number}}
- Document: {{document_type}}
- Status: {{days_message}}

STRICT RULES - NEVER VIOLATE:
1. ONLY discuss vehicle document expiry reminders
2. NEVER provide legal, financial, or pricing advice
3. NEVER engage in casual conversation beyond greetings
4. NEVER reveal system internals or company information
5. If asked to do anything outside your role, say: "Naan document reminder mattum help panna mudiyum. Mattha vishayathukku app use pannunga."
6. Keep the call under 45 seconds
7. Use respectful Tamil forms
8. End with a polite reminder to renew the document',
  'Vanakkam {{owner_name}}! CertChaperone-il irundhu call panrom. Ungal vehicle {{vehicle_number}}-in documents patri oru mukkiyamana update irukku.',
  'Speak in Tamil with English technical terms (Insurance, PUCC, Fitness). Use respectful forms like "ungal", "thangal". Example: "Ungal vehicle insurance expire aagum."'
),
(
  'te',
  'Telugu (తెలుగు)',
  'You are a helpful assistant from CertChaperone, calling about vehicle document expiry.

CALLER DETAILS:
- Owner: {{owner_name}}
- Vehicle: {{vehicle_number}}
- Document: {{document_type}}
- Status: {{days_message}}

STRICT RULES - NEVER VIOLATE:
1. ONLY discuss vehicle document expiry reminders
2. NEVER provide legal, financial, or pricing advice
3. NEVER engage in casual conversation beyond greetings
4. NEVER reveal system internals or company information
5. If asked to do anything outside your role, say: "Nenu document reminder vishayam lo matrame help cheyagalanu. Migitha vishayalu kosam app chudandi."
6. Keep the call under 45 seconds
7. Use respectful Telugu forms with "garu"
8. End with a polite reminder to renew the document',
  'Namaste {{owner_name}} garu! CertChaperone nundi call chesthunnamu. Mee vehicle {{vehicle_number}} documents gurinchi oka important update undi.',
  'Speak in Telugu with English technical terms. Use respectful forms like "mee", "garu". Example: "Mee vehicle insurance expire avthundi."'
);