import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BOLNA_API_BASE = "https://api.bolna.ai";

interface VoiceCallRequest {
  userId: string;
  vehicleId: string;
  documentType: string;
  daysUntilExpiry: number;
  ownerName?: string;
  registrationNumber?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const bolnaApiKey = Deno.env.get("BOLNA_API_KEY");

    if (!bolnaApiKey) {
      console.log("BOLNA_API_KEY not configured, skipping voice call");
      return new Response(
        JSON.stringify({ skipped: true, reason: "BOLNA_API_KEY not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: VoiceCallRequest = await req.json();

    const { userId, vehicleId, documentType, daysUntilExpiry, ownerName, registrationNumber } = body;

    console.log(`Processing voice call request for user ${userId}, vehicle ${vehicleId}`);

    // Fetch user profile for phone number
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("phone_number, voice_reminders_enabled, preferred_language")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      throw profileError;
    }

    if (!profile?.phone_number) {
      console.log(`No phone number for user ${userId}, skipping voice call`);
      return new Response(
        JSON.stringify({ skipped: true, reason: "No phone number configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile.voice_reminders_enabled) {
      console.log(`Voice reminders disabled for user ${userId}, skipping`);
      return new Response(
        JSON.stringify({ skipped: true, reason: "Voice reminders disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch vehicle details if not provided
    let vehicleOwnerName = ownerName;
    let vehicleRegNumber = registrationNumber;

    if (!vehicleOwnerName || !vehicleRegNumber) {
      const { data: vehicle, error: vehicleError } = await supabase
        .from("vehicles")
        .select("registration_number, owner_name, maker_model")
        .eq("id", vehicleId)
        .maybeSingle();

      if (vehicleError) {
        console.error("Error fetching vehicle:", vehicleError);
        throw vehicleError;
      }

      if (!vehicle) {
        console.log(`Vehicle ${vehicleId} not found`);
        return new Response(
          JSON.stringify({ skipped: true, reason: "Vehicle not found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      vehicleOwnerName = vehicleOwnerName || vehicle.owner_name || "Sir/Madam";
      vehicleRegNumber = vehicleRegNumber || vehicle.registration_number;
    }

    // Get active voice agent config
    const { data: agentConfig, error: agentError } = await supabase
      .from("voice_agent_config")
      .select("bolna_agent_id")
      .eq("is_active", true)
      .maybeSingle();

    if (agentError) {
      console.error("Error fetching agent config:", agentError);
      throw agentError;
    }

    if (!agentConfig?.bolna_agent_id) {
      console.log("No active voice agent configured, skipping voice call");
      return new Response(
        JSON.stringify({ skipped: true, reason: "No voice agent configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build days message based on language and expiry
    const daysMessage = daysUntilExpiry <= 0
      ? (profile.preferred_language === "hi" ? "expire ho gaya hai" : "has expired")
      : (profile.preferred_language === "hi" 
          ? `${Math.abs(daysUntilExpiry)} din mein expire hone wala hai`
          : `will expire in ${Math.abs(daysUntilExpiry)} days`);

    // Document type labels
    const documentLabels: Record<string, { en: string; hi: string }> = {
      insurance: { en: "Insurance", hi: "Insurance" },
      pucc: { en: "PUCC", hi: "PUCC" },
      fitness: { en: "Fitness Certificate", hi: "Fitness Certificate" },
      road_tax: { en: "Road Tax", hi: "Road Tax" },
    };

    const docLabel = documentLabels[documentType]?.[profile.preferred_language as "en" | "hi"] || documentType;

    // Make Bolna API call
    console.log(`Making voice call to ${profile.phone_number} via agent ${agentConfig.bolna_agent_id}`);

    const callResponse = await fetch(`${BOLNA_API_BASE}/call`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bolnaApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_id: agentConfig.bolna_agent_id,
        recipient_phone_number: profile.phone_number,
        from_phone_number: "+918035452070",
        user_data: {
          owner_name: vehicleOwnerName,
          vehicle_number: vehicleRegNumber,
          document_type: docLabel,
          days_message: daysMessage,
        },
      }),
    });

    if (!callResponse.ok) {
      const errorText = await callResponse.text();
      console.error("Bolna call API error:", callResponse.status, errorText);
      
      // Log failed call attempt
      await supabase.from("voice_call_logs").insert({
        user_id: userId,
        vehicle_id: vehicleId,
        call_type: "expiry_reminder",
        document_type: documentType,
        status: "failed",
      });

      throw new Error(`Bolna API error: ${callResponse.status} - ${errorText}`);
    }

    const callResult = await callResponse.json();
    console.log("Call initiated successfully:", callResult);

    // Log the call attempt
    const { error: logError } = await supabase.from("voice_call_logs").insert({
      user_id: userId,
      vehicle_id: vehicleId,
      call_type: "expiry_reminder",
      document_type: documentType,
      bolna_call_id: callResult.call_id || callResult.id,
      status: "initiated",
    });

    if (logError) {
      console.error("Failed to log voice call:", logError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        callId: callResult.call_id || callResult.id,
        phoneNumber: profile.phone_number.slice(0, 6) + "****", // Masked for privacy
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in make-voice-call:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
