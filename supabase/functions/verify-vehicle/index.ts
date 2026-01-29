import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Standardized CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Request validation schema
const RequestSchema = z.object({
  imageBase64: z.string().min(1, "Image is required"),
  mimeType: z.string().optional(),
  expectedRegistrationNumber: z.string().min(1, "Registration number is required").max(20),
  vehicleId: z.string().uuid("Invalid vehicle ID format"),
});

// Standardized error response
function errorResponse(message: string, status: number, errorType: string) {
  return new Response(
    JSON.stringify({ error: message, errorType, success: false }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// AI request timeout (30 seconds)
const AI_TIMEOUT_MS = 30000;

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============= PHASE 1: AUTHENTICATION =============
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log(`[${requestId}] Missing authorization header`);
      return errorResponse("Unauthorized", 401, "auth_missing");
    }

    // Validate environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error(`[${requestId}] Missing Supabase configuration`);
      return errorResponse("Server configuration error", 500, "config_error");
    }

    if (!lovableApiKey) {
      console.error(`[${requestId}] LOVABLE_API_KEY not configured`);
      return errorResponse("AI service not configured", 500, "config_error");
    }

    // Verify the user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      console.log(`[${requestId}] Invalid token:`, claimsError?.message);
      return errorResponse("Invalid token", 401, "auth_invalid");
    }

    const userId = claimsData.claims.sub as string;
    console.log(`[${requestId}] Authenticated user: ${userId}`);

    // ============= PHASE 2: VALIDATE INPUT =============
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400, "invalid_json");
    }

    const validation = RequestSchema.safeParse(rawBody);
    if (!validation.success) {
      const errorMessage = validation.error.errors[0]?.message || "Invalid input";
      return errorResponse(errorMessage, 400, "validation_error");
    }

    const { imageBase64, mimeType, expectedRegistrationNumber, vehicleId } = validation.data;

    // ============= PHASE 3: VERIFY VEHICLE OWNERSHIP =============
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: vehicle, error: vehicleError } = await adminClient
      .from("vehicles")
      .select("user_id, registration_number")
      .eq("id", vehicleId)
      .maybeSingle();

    if (vehicleError) {
      console.error(`[${requestId}] Vehicle lookup error:`, vehicleError);
      return errorResponse("Failed to verify vehicle ownership", 500, "lookup_error");
    }

    if (!vehicle) {
      return errorResponse("Vehicle not found", 404, "not_found");
    }

    if (vehicle.user_id !== userId) {
      console.log(`[${requestId}] User ${userId} does not own vehicle ${vehicleId}`);
      return errorResponse("You don't have permission to verify this vehicle", 403, "forbidden");
    }

    // ============= PHASE 4: VALIDATE IMAGE =============
    const base64Size = Math.round((imageBase64.length * 3) / 4 / 1024);
    console.log(`[${requestId}] Processing verification image: ~${base64Size}KB`);

    if (base64Size > 4096) {
      return errorResponse(
        "Image too large. Please upload an image smaller than 4MB.",
        400,
        "image_too_large"
      );
    }

    // ============= PHASE 5: AI VERIFICATION =============
    const normalizedExpected = expectedRegistrationNumber.toUpperCase().replace(/[\s-]/g, "");

    const systemPrompt = `You are a vehicle number plate recognition expert. Your task is to:
1. Identify and read the vehicle registration number plate from the image
2. Compare it with the expected registration number
3. Determine if they match

IMPORTANT INSTRUCTIONS:
- Extract the complete registration number from the vehicle's number plate
- Indian registration numbers typically follow formats like: MH12AB1234, KA01MF5678, DL1CAB1234
- Ignore spaces, hyphens, and case differences when comparing
- Report the exact text you see on the number plate
- Be accurate - this is for vehicle verification purposes

The expected registration number is: ${expectedRegistrationNumber}`;

    const userPrompt = `Analyze this vehicle photo and extract the registration number from the number plate. 
Compare it with the expected number: ${expectedRegistrationNumber}

Instructions:
1. Look for the number plate on the vehicle
2. Read the registration number exactly as shown
3. Compare it with the expected number (ignoring spaces, hyphens, case)
4. Determine if this is the same vehicle`;

    // Determine the correct media type
    let mediaType = mimeType || "image/jpeg";
    if (!mediaType.startsWith("image/")) {
      mediaType = "image/jpeg";
    }

    console.log(`[${requestId}] Sending verification request to AI gateway`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            { 
              role: "user", 
              content: [
                { type: "text", text: userPrompt },
                { 
                  type: "image_url", 
                  image_url: { 
                    url: `data:${mediaType};base64,${imageBase64}` 
                  } 
                }
              ]
            }
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "verify_number_plate",
                description: "Report the results of number plate verification",
                parameters: {
                  type: "object",
                  properties: {
                    detected_plate: { 
                      type: "string", 
                      description: "The registration number detected on the vehicle's number plate (exactly as seen)" 
                    },
                    plate_readable: {
                      type: "boolean",
                      description: "Whether a number plate was found and readable in the image"
                    },
                    matches_expected: {
                      type: "boolean",
                      description: "Whether the detected plate matches the expected registration number"
                    },
                    confidence: {
                      type: "string",
                      enum: ["high", "medium", "low"],
                      description: "Confidence in the plate reading"
                    },
                    reason: {
                      type: "string",
                      description: "Explanation of the verification result, especially if not matched"
                    }
                  },
                  required: ["detected_plate", "plate_readable", "matches_expected", "confidence", "reason"]
                }
              }
            }
          ],
          tool_choice: { type: "function", function: { name: "verify_number_plate" } }
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${requestId}] AI gateway error:`, response.status, errorText);
        
        if (response.status === 429) {
          return errorResponse(
            "Rate limit exceeded. Please try again in a few moments.",
            429,
            "rate_limit"
          );
        }
        
        return errorResponse(
          "AI verification failed. Please try again.",
          500,
          "ai_error"
        );
      }

      const aiResponse = await response.json();
      console.log(`[${requestId}] AI verification response received`);

      // Extract the tool call result
      const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall || toolCall.function.name !== "verify_number_plate") {
        console.error(`[${requestId}] Unexpected AI response structure`);
        return errorResponse("AI did not return expected verification results", 500, "ai_error");
      }

      const result = JSON.parse(toolCall.function.arguments);

      // Additional validation: normalize and compare
      let verified = result.matches_expected;
      if (result.plate_readable && result.detected_plate) {
        const normalizedDetected = result.detected_plate.toUpperCase().replace(/[\s-]/g, "");
        verified = normalizedDetected === normalizedExpected;
      }

      const duration = Date.now() - startTime;
      console.log(`[${requestId}] Verification result: detected=${result.detected_plate}, expected=${expectedRegistrationNumber}, verified=${verified} in ${duration}ms`);

      return new Response(
        JSON.stringify({
          success: true,
          verified: verified && result.plate_readable,
          detectedPlate: result.detected_plate,
          expectedPlate: expectedRegistrationNumber,
          confidence: result.confidence,
          reason: !result.plate_readable 
            ? "Could not find or read a number plate in the image"
            : !verified 
              ? `Detected plate "${result.detected_plate}" does not match expected "${expectedRegistrationNumber}"`
              : result.reason,
          plateReadable: result.plate_readable,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        console.error(`[${requestId}] AI request timed out after ${AI_TIMEOUT_MS}ms`);
        return errorResponse("AI verification timed out. Please try again.", 504, "timeout");
      }
      throw fetchError;
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] Error in verify-vehicle after ${duration}ms:`, error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to verify vehicle",
      500,
      "unknown"
    );
  }
});
