-- Drop the problematic policies that query auth.users
DROP POLICY IF EXISTS "Recipients can view transfers to them" ON public.vehicle_transfers;
DROP POLICY IF EXISTS "Recipients can respond to transfers" ON public.vehicle_transfers;

-- Recreate with JWT-based email check (no auth.users access needed)
CREATE POLICY "Recipients can view transfers to them"
ON public.vehicle_transfers
FOR SELECT
USING ((auth.jwt()->>'email') = recipient_email);

CREATE POLICY "Recipients can respond to transfers"
ON public.vehicle_transfers
FOR UPDATE
USING (
  status = 'pending'
  AND (auth.jwt()->>'email') = recipient_email
);