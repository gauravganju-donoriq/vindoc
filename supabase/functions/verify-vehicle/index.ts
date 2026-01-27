import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType, expectedRegistrationNumber, vehicleId } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided", success: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!expectedRegistrationNumber) {
      return new Response(
        JSON.stringify({ error: "Expected registration number is required", success: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate base64 and log size
    const base64Size = Math.round((imageBase64.length * 3) / 4 / 1024);
    console.log(`Processing verification image: ~${base64Size}KB`);

    if (base64Size > 4096) {
      return new Response(
        JSON.stringify({ 
          error: "Image too large. Please upload an image smaller than 4MB.", 
          errorType: "image_too_large",
          success: false 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Normalize the expected registration number for comparison
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

    console.log(`Sending verification request to AI gateway`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Rate limit exceeded. Please try again in a few moments.", 
            errorType: "rate_limit",
            success: false 
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: "AI verification failed. Please try again.", 
          errorType: "ai_error",
          success: false 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    console.log("AI verification response received");

    // Extract the tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "verify_number_plate") {
      console.error("Unexpected AI response structure:", JSON.stringify(aiResponse, null, 2));
      throw new Error("AI did not return expected verification results");
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Additional validation: normalize and compare
    let verified = result.matches_expected;
    if (result.plate_readable && result.detected_plate) {
      const normalizedDetected = result.detected_plate.toUpperCase().replace(/[\s-]/g, "");
      verified = normalizedDetected === normalizedExpected;
    }

    console.log(`Verification result: detected=${result.detected_plate}, expected=${expectedRegistrationNumber}, verified=${verified}`);

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

  } catch (error) {
    console.error("Error in verify-vehicle:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to verify vehicle",
        errorType: "unknown",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
