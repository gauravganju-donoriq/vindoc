import { supabase } from "@/integrations/supabase/client";

export async function checkUserSuspension(userId: string): Promise<{ isSuspended: boolean; reason?: string }> {
  const { data, error } = await supabase
    .from("user_suspensions")
    .select("id, reason")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error checking suspension status:", error);
    return { isSuspended: false };
  }

  return {
    isSuspended: !!data,
    reason: data?.reason || undefined,
  };
}