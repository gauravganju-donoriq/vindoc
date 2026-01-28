-- Add new columns for webhook data to voice_call_logs
ALTER TABLE voice_call_logs 
ADD COLUMN IF NOT EXISTS transcript text,
ADD COLUMN IF NOT EXISTS recording_url text,
ADD COLUMN IF NOT EXISTS hangup_reason text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create trigger to auto-update updated_at
CREATE OR REPLACE TRIGGER update_voice_call_logs_updated_at
BEFORE UPDATE ON voice_call_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();