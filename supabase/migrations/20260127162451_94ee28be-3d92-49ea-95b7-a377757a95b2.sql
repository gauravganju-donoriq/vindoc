-- Allow users to check their own suspension status
CREATE POLICY "Users can check their own suspension status"
ON public.user_suspensions
FOR SELECT
USING (auth.uid() = user_id);