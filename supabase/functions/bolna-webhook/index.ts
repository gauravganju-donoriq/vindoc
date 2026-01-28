import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse webhook payload from Bolna
    const payload = await req.json();
    console.log("Bolna webhook received:", JSON.stringify(payload, null, 2));

    // Extract relevant fields - Bolna sends various formats
    const executionId = payload.execution_id || payload.call_id || payload.id;
    const status = payload.status || payload.call_status;
    const transcript = payload.transcript || payload.conversation_transcript;
    const conversationTime = payload.conversation_time || payload.duration;
    const telephonyData = payload.telephony_data || {};
    const recordingUrl = telephonyData.recording_url || payload.recording_url;
    const hangupReason = payload.hangup_reason || telephonyData.hangup_reason;

    if (!executionId) {
      console.log("No execution_id in payload, skipping update");
      return new Response(
        JSON.stringify({ success: true, message: "No execution_id found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map Bolna status to our status values
    let mappedStatus = status;
    if (status === "call-completed" || status === "completed") {
      mappedStatus = "completed";
    } else if (status === "call-failed" || status === "failed") {
      mappedStatus = "failed";
    } else if (status === "no-answer" || status === "no_answer") {
      mappedStatus = "no_answer";
    } else if (status === "busy") {
      mappedStatus = "busy";
    }

    // Calculate duration
    const durationSeconds = conversationTime 
      ? Math.round(conversationTime)
      : telephonyData.duration 
        ? Math.round(telephonyData.duration)
        : null;

    // Update the call log by execution_id (bolna_call_id)
    const { data: updateData, error: updateError } = await supabase
      .from("voice_call_logs")
      .update({
        status: mappedStatus,
        duration_seconds: durationSeconds,
        transcript: transcript,
        recording_url: recordingUrl,
        hangup_reason: hangupReason,
        updated_at: new Date().toISOString(),
      })
      .eq("bolna_call_id", executionId)
      .select();

    if (updateError) {
      console.error("Error updating call log:", updateError);
      throw updateError;
    }

    console.log("Updated call log:", updateData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated: updateData?.length || 0,
        execution_id: executionId 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in bolna-webhook:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
