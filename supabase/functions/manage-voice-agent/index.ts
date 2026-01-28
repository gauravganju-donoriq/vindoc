import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BOLNA_API_BASE = "https://api.bolna.ai";

interface VoiceAgentConfig {
  id?: string;
  bolna_agent_id: string | null;
  agent_name: string;
  voice_provider: string;
  voice_id: string | null;
  voice_name: string | null;
  language: string;
  system_prompt: string;
  welcome_message: string;
  call_terminate_seconds: number;
  hangup_after_silence: number;
  is_active: boolean;
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
      throw new Error("BOLNA_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // Check if user is super_admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Super admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Handle GET requests
    if (req.method === "GET") {
      if (action === "voices") {
        // Fetch available voices from Bolna
        const voicesResponse = await fetch(`${BOLNA_API_BASE}/me/voices`, {
          headers: {
            Authorization: `Bearer ${bolnaApiKey}`,
          },
        });

        if (!voicesResponse.ok) {
          const errorText = await voicesResponse.text();
          console.error("Bolna voices API error:", voicesResponse.status, errorText);
          throw new Error(`Failed to fetch voices: ${voicesResponse.status}`);
        }

        const voices = await voicesResponse.json();
        return new Response(
          JSON.stringify(voices),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "config") {
        // Get current voice agent config
        const { data: config, error: configError } = await supabase
          .from("voice_agent_config")
          .select("*")
          .eq("is_active", true)
          .maybeSingle();

        if (configError) {
          throw configError;
        }

        return new Response(
          JSON.stringify(config || null),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (action === "logs") {
        // Get recent call logs
        const { data: logs, error: logsError } = await supabase
          .from("voice_call_logs")
          .select(`
            id,
            user_id,
            vehicle_id,
            call_type,
            document_type,
            bolna_call_id,
            status,
            duration_seconds,
            created_at,
            vehicles (registration_number)
          `)
          .order("created_at", { ascending: false })
          .limit(50);

        if (logsError) {
          throw logsError;
        }

        // Get user emails
        const userIds = [...new Set(logs?.map(l => l.user_id) || [])];
        const userEmails: Record<string, string> = {};
        
        for (const uid of userIds) {
          const { data: userData } = await supabase.auth.admin.getUserById(uid);
          if (userData?.user?.email) {
            userEmails[uid] = userData.user.email;
          }
        }

        const logsWithEmails = logs?.map(log => ({
          ...log,
          user_email: userEmails[log.user_id] || "Unknown",
        }));

        return new Response(
          JSON.stringify(logsWithEmails || []),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Handle POST requests
    if (req.method === "POST") {
      const body = await req.json();
      const postAction = body.action;

      if (postAction === "create" || postAction === "update") {
        const config = body.config as Partial<VoiceAgentConfig>;

        // Build Bolna agent payload with correct structure
        const bolnaPayload = {
          agent_config: {
            agent_name: config.agent_name || "CertChaperone Reminder",
            agent_welcome_message: config.welcome_message,
            agent_type: "other",
            tasks: [
              {
                task_type: "conversation",
                tools_config: {
                  llm_agent: {
                    agent_type: "simple_llm_agent",
                    agent_flow_type: "streaming",
                    llm_config: {
                      provider: "openai",
                      model: "gpt-4.1-mini",
                      temperature: 0.3,
                      max_tokens: 150,
                    },
                  },
                  synthesizer: {
                    provider: config.voice_provider || "elevenlabs",
                    provider_config: config.voice_provider === "sarvam" 
                      ? {
                          voice: config.voice_id || "meera",
                          model: "bulbul:v1",
                        }
                      : {
                          voice: config.voice_id || "Nila",
                          voice_id: "V9LCAAi4tTlqe9JadbCo",
                          model: "eleven_turbo_v2_5",
                        },
                    stream: true,
                    buffer_size: 250,
                  },
                  transcriber: {
                    provider: "deepgram",
                    model: "nova-3",
                    language: config.language || "hi",
                    stream: true,
                    sampling_rate: 16000,
                    encoding: "linear16",
                  },
                  input: {
                    provider: "default",
                    format: "wav",
                  },
                  output: {
                    provider: "default",
                    format: "wav",
                  },
                },
                toolchain: {
                  execution: "parallel",
                  pipelines: [["transcriber", "llm", "synthesizer"]],
                },
                task_config: {
                  call_terminate: config.call_terminate_seconds || 60,
                  hangup_after_silence: config.hangup_after_silence || 10,
                  incremental_delay: 400,
                  number_of_words_for_interruption: 2,
                },
              },
            ],
          },
          agent_prompts: {
            task_1: {
              system_prompt: config.system_prompt,
            },
          },
        };

        let bolnaAgentId = config.bolna_agent_id;

        if (postAction === "create" || !bolnaAgentId) {
          // Create new agent in Bolna
          console.log("Creating new Bolna agent...");
          const createResponse = await fetch(`${BOLNA_API_BASE}/v2/agent`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${bolnaApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(bolnaPayload),
          });

          if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.error("Bolna create agent error:", createResponse.status, errorText);
            throw new Error(`Failed to create Bolna agent: ${createResponse.status} - ${errorText}`);
          }

          const createResult = await createResponse.json();
          bolnaAgentId = createResult.agent_id || createResult.id;
          console.log("Created Bolna agent:", bolnaAgentId);
        } else {
          // Update existing agent in Bolna
          console.log("Updating Bolna agent:", bolnaAgentId);
          const updateResponse = await fetch(`${BOLNA_API_BASE}/v2/agent/${bolnaAgentId}`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${bolnaApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(bolnaPayload),
          });

          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error("Bolna update agent error:", updateResponse.status, errorText);
            throw new Error(`Failed to update Bolna agent: ${updateResponse.status} - ${errorText}`);
          }
          console.log("Updated Bolna agent:", bolnaAgentId);
        }

        // Upsert config in database
        const { data: existingConfig } = await supabase
          .from("voice_agent_config")
          .select("id")
          .eq("is_active", true)
          .maybeSingle();

        const configData = {
          bolna_agent_id: bolnaAgentId,
          agent_name: config.agent_name || "CertChaperone Reminder",
          voice_provider: config.voice_provider || "sarvam",
          voice_id: config.voice_id,
          voice_name: config.voice_name,
          language: config.language || "hi",
          system_prompt: config.system_prompt!,
          welcome_message: config.welcome_message!,
          call_terminate_seconds: config.call_terminate_seconds || 60,
          hangup_after_silence: config.hangup_after_silence || 10,
          is_active: true,
        };

        let savedConfig;
        if (existingConfig) {
          const { data, error } = await supabase
            .from("voice_agent_config")
            .update(configData)
            .eq("id", existingConfig.id)
            .select()
            .single();

          if (error) throw error;
          savedConfig = data;
        } else {
          const { data, error } = await supabase
            .from("voice_agent_config")
            .insert(configData)
            .select()
            .single();

          if (error) throw error;
          savedConfig = data;
        }

        return new Response(
          JSON.stringify({ success: true, config: savedConfig }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (postAction === "test") {
        const phoneNumber = body.phoneNumber;
        
        if (!phoneNumber) {
          return new Response(
            JSON.stringify({ error: "Phone number required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get active agent config
        const { data: config, error: configError } = await supabase
          .from("voice_agent_config")
          .select("*")
          .eq("is_active", true)
          .maybeSingle();

        if (configError || !config?.bolna_agent_id) {
          return new Response(
            JSON.stringify({ error: "No active voice agent configured. Save configuration first." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Make test call
        console.log("Making test call to:", phoneNumber);
        const callResponse = await fetch(`${BOLNA_API_BASE}/call`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${bolnaApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            agent_id: config.bolna_agent_id,
            recipient_phone_number: phoneNumber,
            user_data: {
              owner_name: "Admin",
              vehicle_number: "KL01XX0000",
              document_type: "Insurance",
              days_message: "7 din mein expire hone wala hai",
            },
          }),
        });

        if (!callResponse.ok) {
          const errorText = await callResponse.text();
          console.error("Bolna call error:", callResponse.status, errorText);
          throw new Error(`Failed to make call: ${callResponse.status} - ${errorText}`);
        }

        const callResult = await callResponse.json();
        console.log("Test call initiated:", callResult);

        // Log the call
        await supabase.from("voice_call_logs").insert({
          user_id: userId,
          call_type: "test_call",
          bolna_call_id: callResult.call_id || callResult.id,
          status: "initiated",
        });

        return new Response(
          JSON.stringify({ success: true, callId: callResult.call_id || callResult.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (postAction === "deactivate") {
        const { error } = await supabase
          .from("voice_agent_config")
          .update({ is_active: false })
          .eq("is_active", true);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in manage-voice-agent:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
