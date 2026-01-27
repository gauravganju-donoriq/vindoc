-- Create user_suspensions table to track suspended users
CREATE TABLE public.user_suspensions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  suspended_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  suspended_by UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_suspensions ENABLE ROW LEVEL SECURITY;

-- Only super admins can view suspensions
CREATE POLICY "Super admins can view all suspensions"
ON public.user_suspensions
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

-- Only super admins can suspend users
CREATE POLICY "Super admins can suspend users"
ON public.user_suspensions
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Only super admins can unsuspend users
CREATE POLICY "Super admins can unsuspend users"
ON public.user_suspensions
FOR DELETE
USING (public.has_role(auth.uid(), 'super_admin'));