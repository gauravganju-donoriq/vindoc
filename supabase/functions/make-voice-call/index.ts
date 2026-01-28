import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BOLNA_API_BASE = "https://api.bolna.ai";
const INDIAN_CALLER_ID = "+918035452070";
const MAX_CALLS_PER_DAY = 2;
const COOLDOWN_HOURS = 24;

interface VoiceCallRequest {
  userId: string;
  vehicleId: string;
  documentType: string;
  daysUntilExpiry: number;
  ownerName?: string;
  registrationNumber?: string;
}

// Document type labels in multiple languages
const DOCUMENT_LABELS: Record<string, Record<string, string>> = {
  insurance: { en: "Insurance", hi: "Insurance", ta: "Insurance", te: "Insurance" },
  pucc: { en: "PUCC", hi: "PUCC", ta: "PUCC", te: "PUCC" },
  fitness: { en: "Fitness Certificate", hi: "Fitness Certificate", ta: "Fitness Certificate", te: "Fitness Certificate" },
  road_tax: { en: "Road Tax", hi: "Road Tax", ta: "Road Tax", te: "Road Tax" },
};

// Days message in multiple languages
function getDaysMessage(daysUntilExpiry: number, language: string): string {
  if (daysUntilExpiry <= 0) {
    switch (language) {
      case "hi": return "expire ho gaya hai";
      case "ta": return "expire aagiruchu";
      case "te": return "expire ayyindi";
      default: return "has expired";
    }
  }
  const days = Math.abs(daysUntilExpiry);
  switch (language) {
    case "hi": return `${days} din mein expire hone wala hai`;
    case "ta": return `${days} naal la expire aagum`;
    case "te": return `${days} rojullo expire avthundi`;
    default: return `will expire in ${days} days`;
  }
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

    console.log(`Processing voice call request for user ${userId}, vehicle ${vehicleId}, document ${documentType}`);

    // ============= PHASE 1: VALIDATION CHECKS =============

    // 1. Check if user is suspended
    const { data: suspension } = await supabase
      .from("user_suspensions")
      .select("id, reason")
      .eq("user_id", userId)
      .maybeSingle();

    if (suspension) {
      console.log(`User ${userId} is suspended, skipping voice call`);
      return new Response(
        JSON.stringify({ skipped: true, reason: "User account suspended" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch user profile for phone number and preferences
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

    // 3. Check if voice reminders are enabled
    if (!profile.voice_reminders_enabled) {
      console.log(`Voice reminders disabled for user ${userId}, skipping`);
      return new Response(
        JSON.stringify({ skipped: true, reason: "Voice reminders disabled by user" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Validate phone number format (must be 10 digits after +91)
    const phoneDigits = profile.phone_number.replace(/^\+91/, "").replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      console.log(`Invalid phone number format for user ${userId}: ${profile.phone_number}`);
      return new Response(
        JSON.stringify({ skipped: true, reason: "Invalid phone number format" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============= PHASE 2: RATE LIMITING =============

    // 5. Check cooldown - skip if called within 24 hours for same document/vehicle
    const { data: recentCooldown } = await supabase
      .from("voice_call_cooldowns")
      .select("last_call_at")
      .eq("user_id", userId)
      .eq("vehicle_id", vehicleId)
      .eq("document_type", documentType)
      .maybeSingle();

    if (recentCooldown) {
      const hoursSinceLast = (Date.now() - new Date(recentCooldown.last_call_at).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLast < COOLDOWN_HOURS) {
        console.log(`Cooldown active for user ${userId}, vehicle ${vehicleId}, document ${documentType}. Hours since last: ${hoursSinceLast.toFixed(1)}`);
        return new Response(
          JSON.stringify({ 
            skipped: true, 
            reason: `Already called within ${COOLDOWN_HOURS} hours for this document`,
            hoursRemaining: Math.ceil(COOLDOWN_HOURS - hoursSinceLast)
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 6. Check daily limit - max calls per user per day
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    
    const { count: todayCallCount } = await supabase
      .from("voice_call_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", todayStart)
      .neq("status", "failed");

    if ((todayCallCount || 0) >= MAX_CALLS_PER_DAY) {
      console.log(`Daily call limit reached for user ${userId}. Count: ${todayCallCount}`);
      return new Response(
        JSON.stringify({ 
          skipped: true, 
          reason: `Daily call limit reached (${MAX_CALLS_PER_DAY} per day)` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============= PHASE 3: FETCH REQUIRED DATA =============

    // 7. Fetch vehicle details if not provided
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

    // 8. Get active voice agent config
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

    // ============= PHASE 4: LANGUAGE-AWARE CONTENT =============

    const userLanguage = profile.preferred_language || "en";

    // 9. Fetch language template with all fields
    const { data: languageTemplate } = await supabase
      .from("voice_language_templates")
      .select("system_prompt, welcome_message, language_instruction")
      .eq("language_code", userLanguage)
      .eq("is_active", true)
      .maybeSingle();

    // Fallback to English if user's language not found
    let activeTemplate = languageTemplate;
    if (!activeTemplate && userLanguage !== "en") {
      const { data: englishTemplate } = await supabase
        .from("voice_language_templates")
        .select("system_prompt, welcome_message, language_instruction")
        .eq("language_code", "en")
        .eq("is_active", true)
        .maybeSingle();
      activeTemplate = englishTemplate;
    }

    // Build language-specific content
    const daysMessage = getDaysMessage(daysUntilExpiry, userLanguage);
    const docLabel = DOCUMENT_LABELS[documentType]?.[userLanguage] || DOCUMENT_LABELS[documentType]?.["en"] || documentType;
    
    // Helper function to replace template placeholders
    const replacePlaceholders = (template: string): string => {
      return template
        .replace(/\{\{owner_name\}\}/g, vehicleOwnerName || "Sir/Madam")
        .replace(/\{\{vehicle_number\}\}/g, vehicleRegNumber || "your vehicle")
        .replace(/\{\{document_type\}\}/g, docLabel)
        .replace(/\{\{days_message\}\}/g, daysMessage);
    };

    // Build final content with placeholders replaced
    const languageInstruction = activeTemplate?.language_instruction || "Speak in clear, professional English.";
    const welcomeMessage = activeTemplate?.welcome_message 
      ? replacePlaceholders(activeTemplate.welcome_message)
      : `Hello ${vehicleOwnerName}! This is CertChaperone calling about your vehicle ${vehicleRegNumber}.`;
    const systemPromptOverride = activeTemplate?.system_prompt 
      ? replacePlaceholders(activeTemplate.system_prompt)
      : null;

    // ============= PHASE 5: MAKE THE CALL =============

    console.log(`Making voice call to ${profile.phone_number.slice(0, 6)}**** via agent ${agentConfig.bolna_agent_id} in ${userLanguage}`);
    console.log(`Using welcome message: "${welcomeMessage.slice(0, 50)}..."`);

    // Build request body with dynamic content
    const callRequestBody: Record<string, unknown> = {
      agent_id: agentConfig.bolna_agent_id,
      recipient_phone_number: profile.phone_number,
      from_phone_number: INDIAN_CALLER_ID,
      user_data: {
        owner_name: vehicleOwnerName,
        vehicle_number: vehicleRegNumber,
        document_type: docLabel,
        days_message: daysMessage,
        language: userLanguage,
        language_instruction: languageInstruction,
        welcome_message: welcomeMessage,
      },
    };

    // Add dynamic agent prompt if we have a language-specific system prompt
    if (systemPromptOverride) {
      callRequestBody.agent_prompt = systemPromptOverride;
    }

    const callResponse = await fetch(`${BOLNA_API_BASE}/call`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bolnaApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(callRequestBody),
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
        language_used: userLanguage,
      });

      throw new Error(`Bolna API error: ${callResponse.status} - ${errorText}`);
    }

    const callResult = await callResponse.json();
    console.log("Call initiated successfully:", callResult);

    // ============= PHASE 6: LOG AND UPDATE COOLDOWN =============

    // Log the successful call
    const { error: logError } = await supabase.from("voice_call_logs").insert({
      user_id: userId,
      vehicle_id: vehicleId,
      call_type: "expiry_reminder",
      document_type: documentType,
      bolna_call_id: callResult.call_id || callResult.id,
      status: "initiated",
      language_used: userLanguage,
    });

    if (logError) {
      console.error("Failed to log voice call:", logError);
    }

    // Update or insert cooldown record
    const { error: cooldownError } = await supabase
      .from("voice_call_cooldowns")
      .upsert(
        {
          user_id: userId,
          vehicle_id: vehicleId,
          document_type: documentType,
          last_call_at: new Date().toISOString(),
          call_count: 1,
        },
        {
          onConflict: "user_id,vehicle_id,document_type",
        }
      );

    if (cooldownError) {
      console.error("Failed to update cooldown:", cooldownError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        callId: callResult.call_id || callResult.id,
        phoneNumber: profile.phone_number.slice(0, 6) + "****",
        language: userLanguage,
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
