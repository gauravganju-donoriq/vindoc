import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Standardized CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-webhook-secret",
};

// Webhook payload validation schema
const WebhookPayloadSchema = z.object({
  execution_id: z.string().optional(),
  call_id: z.string().optional(),
  id: z.string().optional(),
  status: z.string().optional(),
  call_status: z.string().optional(),
  transcript: z.string().optional().nullable(),
  conversation_transcript: z.string().optional().nullable(),
  conversation_time: z.number().optional().nullable(),
  duration: z.number().optional().nullable(),
  telephony_data: z.object({
    recording_url: z.string().optional().nullable(),
    hangup_reason: z.string().optional().nullable(),
    duration: z.number().optional().nullable(),
  }).optional().nullable(),
  recording_url: z.string().optional().nullable(),
  hangup_reason: z.string().optional().nullable(),
}).passthrough();

// Standardized error response
function errorResponse(message: string, status: number, errorCode: string) {
  return new Response(
    JSON.stringify({ success: false, error: message, errorCode }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ============= PHASE 1: WEBHOOK AUTHENTICATION =============
    // Check for webhook secret in header or verify Bolna signature
    const webhookSecret = Deno.env.get("BOLNA_WEBHOOK_SECRET");
    const providedSecret = req.headers.get("x-webhook-secret");
    
    // If webhook secret is configured, validate it
    if (webhookSecret && webhookSecret !== providedSecret) {
      console.log(`[${requestId}] Invalid or missing webhook secret`);
      return errorResponse("Unauthorized webhook request", 401, "WEBHOOK_AUTH_FAILED");
    }

    // ============= PHASE 2: VALIDATE ENVIRONMENT =============
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[${requestId}] Missing required environment variables`);
      return errorResponse("Server configuration error", 500, "CONFIG_ERROR");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ============= PHASE 3: PARSE AND VALIDATE PAYLOAD =============
    let rawPayload: unknown;
    try {
      rawPayload = await req.json();
    } catch {
      console.log(`[${requestId}] Invalid JSON payload`);
      return errorResponse("Invalid JSON payload", 400, "INVALID_JSON");
    }

    console.log(`[${requestId}] Bolna webhook received:`, JSON.stringify(rawPayload, null, 2));

    const validation = WebhookPayloadSchema.safeParse(rawPayload);
    if (!validation.success) {
      console.log(`[${requestId}] Payload validation failed:`, validation.error.errors);
      return errorResponse("Invalid payload structure", 400, "VALIDATION_ERROR");
    }

    const payload = validation.data;

    // Extract relevant fields - Bolna sends various formats
    const executionId = payload.execution_id || payload.call_id || payload.id;
    const status = payload.status || payload.call_status;
    const transcript = payload.transcript || payload.conversation_transcript;
    const conversationTime = payload.conversation_time || payload.duration;
    const telephonyData = payload.telephony_data || {};
    const recordingUrl = telephonyData?.recording_url || payload.recording_url;
    const hangupReason = payload.hangup_reason || telephonyData?.hangup_reason;

    if (!executionId) {
      console.log(`[${requestId}] No execution_id in payload, acknowledging without update`);
      return new Response(
        JSON.stringify({ success: true, message: "No execution_id found, no update needed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============= PHASE 4: IDEMPOTENCY CHECK =============
    // Check if we've already processed this exact status update
    const { data: existingLog } = await supabase
      .from("voice_call_logs")
      .select("id, status, updated_at")
      .eq("bolna_call_id", executionId)
      .maybeSingle();

    if (!existingLog) {
      console.log(`[${requestId}] No call log found for execution_id: ${executionId}`);
      return new Response(
        JSON.stringify({ success: true, message: "Call log not found, may have been processed already" }),
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
    } else if (status === "in-progress" || status === "in_progress") {
      mappedStatus = "in_progress";
    }

    // Skip if status hasn't changed (idempotency)
    if (existingLog.status === mappedStatus) {
      console.log(`[${requestId}] Status unchanged (${mappedStatus}), skipping duplicate update`);
      return new Response(
        JSON.stringify({ success: true, message: "Status unchanged, no update needed", execution_id: executionId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============= PHASE 5: UPDATE CALL LOG =============
    // Calculate duration
    const durationSeconds = conversationTime 
      ? Math.round(conversationTime)
      : telephonyData?.duration 
        ? Math.round(telephonyData.duration)
        : null;

    const updatePayload: Record<string, unknown> = {
      status: mappedStatus,
      updated_at: new Date().toISOString(),
    };

    // Only update fields if they have values
    if (durationSeconds !== null) updatePayload.duration_seconds = durationSeconds;
    if (transcript) updatePayload.transcript = transcript;
    if (recordingUrl) updatePayload.recording_url = recordingUrl;
    if (hangupReason) updatePayload.hangup_reason = hangupReason;

    const { data: updateData, error: updateError } = await supabase
      .from("voice_call_logs")
      .update(updatePayload)
      .eq("bolna_call_id", executionId)
      .select();

    if (updateError) {
      console.error(`[${requestId}] Error updating call log:`, updateError);
      return errorResponse("Failed to update call log", 500, "UPDATE_FAILED");
    }

    console.log(`[${requestId}] Updated call log for ${executionId}:`, updateData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated: updateData?.length || 0,
        execution_id: executionId,
        new_status: mappedStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[${requestId}] Error in bolna-webhook:`, error);
    return errorResponse(
      error instanceof Error ? error.message : "Unknown error",
      500,
      "INTERNAL_ERROR"
    );
  }
});
