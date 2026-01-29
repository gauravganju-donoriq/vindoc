import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Standardized CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Request validation schema
const RequestSchema = z.object({
  vehicleId: z.string().uuid("Invalid vehicle ID format"),
});

// Standardized error response
function errorResponse(message: string, status: number, errorCode: string, details?: object) {
  return new Response(
    JSON.stringify({ success: false, error: message, errorCode, ...details }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// AI request timeout (30 seconds)
const AI_TIMEOUT_MS = 30000;

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============= PHASE 1: AUTHENTICATION =============
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("Unauthorized", 401, "AUTH_MISSING");
    }

    // Validate environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error(`[${requestId}] Missing Supabase configuration`);
      return errorResponse("Server configuration error", 500, "CONFIG_ERROR");
    }

    if (!lovableApiKey) {
      console.error(`[${requestId}] LOVABLE_API_KEY not configured`);
      return errorResponse("AI service not configured", 500, "CONFIG_ERROR");
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      console.log(`[${requestId}] Invalid token:`, claimsError?.message);
      return errorResponse("Invalid token", 401, "AUTH_INVALID");
    }

    const userId = claimsData.claims.sub as string;
    console.log(`[${requestId}] Authenticated user: ${userId}`);

    // ============= PHASE 2: VALIDATE INPUT =============
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400, "INVALID_JSON");
    }

    const validation = RequestSchema.safeParse(rawBody);
    if (!validation.success) {
      const errorMessage = validation.error.errors[0]?.message || "Invalid input";
      return errorResponse(errorMessage, 400, "VALIDATION_ERROR");
    }

    const { vehicleId } = validation.data;

    // ============= PHASE 3: FETCH VEHICLE & VERIFY OWNERSHIP =============
    const { data: vehicle, error: vehicleError } = await userClient
      .from("vehicles")
      .select("*")
      .eq("id", vehicleId)
      .maybeSingle();

    if (vehicleError) {
      console.error(`[${requestId}] Vehicle fetch error:`, vehicleError);
      return errorResponse("Vehicle not found or access denied", 404, "NOT_FOUND");
    }

    if (!vehicle) {
      return errorResponse("Vehicle not found or access denied", 404, "NOT_FOUND");
    }

    // ============= PHASE 4: VERIFY VEHICLE IS FULLY VERIFIED =============
    const requiredIdentityFields = ["registration_number", "owner_name", "manufacturer", "maker_model", "registration_date"];
    const requiredTechnicalFields = ["chassis_number", "engine_number", "fuel_type", "color", "seating_capacity", "cubic_capacity", "vehicle_class"];
    const requiredOwnershipFields = ["owner_count", "rc_status"];

    const hasValue = (val: unknown) => val !== null && val !== undefined && val !== "";
    
    const identityCount = requiredIdentityFields.filter(f => hasValue(vehicle[f])).length;
    const technicalCount = requiredTechnicalFields.filter(f => hasValue(vehicle[f])).length;
    const ownershipCount = requiredOwnershipFields.filter(f => hasValue(vehicle[f])).length;

    const isFullyVerified = 
      vehicle.is_verified === true &&
      identityCount >= 4 &&
      technicalCount >= 5 &&
      ownershipCount >= 2;

    if (!isFullyVerified) {
      const missingSteps = [];
      if (!vehicle.is_verified) missingSteps.push("Photo Verification");
      if (identityCount < 4) missingSteps.push(`Vehicle Identity (${identityCount}/4 fields)`);
      if (technicalCount < 5) missingSteps.push(`Technical Specs (${technicalCount}/5 fields)`);
      if (ownershipCount < 2) missingSteps.push(`Ownership Details (${ownershipCount}/2 fields)`);

      return errorResponse(
        "Vehicle must be 100% verified before listing for sale",
        400,
        "INCOMPLETE_VERIFICATION",
        { missingSteps }
      );
    }

    // ============= PHASE 5: CALCULATE VEHICLE AGE =============
    let vehicleAge = "Unknown";
    if (vehicle.registration_date) {
      const regDate = new Date(vehicle.registration_date);
      const now = new Date();
      const years = Math.floor((now.getTime() - regDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      const months = Math.floor(((now.getTime() - regDate.getTime()) % (365.25 * 24 * 60 * 60 * 1000)) / (30 * 24 * 60 * 60 * 1000));
      vehicleAge = `${years} years ${months} months`;
    }

    // ============= PHASE 6: CALL AI FOR PRICE ESTIMATION =============
    const vehicleDetails = `
Vehicle Details for Price Estimation:
- Registration Number: ${vehicle.registration_number}
- Manufacturer: ${vehicle.manufacturer || "Unknown"}
- Model: ${vehicle.maker_model || "Unknown"}
- Registration Date: ${vehicle.registration_date || "Unknown"} (Age: ${vehicleAge})
- Fuel Type: ${vehicle.fuel_type || "Unknown"}
- Owner Count: ${vehicle.owner_count || "Unknown"} (${vehicle.owner_count === 1 ? "Single owner" : "Multiple owners"})
- Body Type: ${vehicle.body_type || "Unknown"}
- Color: ${vehicle.color || "Unknown"}
- Seating Capacity: ${vehicle.seating_capacity || "Unknown"}
- Cubic Capacity: ${vehicle.cubic_capacity || "Unknown"} cc
- Vehicle Category: ${vehicle.vehicle_category || "Unknown"}
- Vehicle Class: ${vehicle.vehicle_class || "Unknown"}
- Emission Norms: ${vehicle.emission_norms || "Unknown"}
- Is Financed: ${vehicle.is_financed ? "Yes (has outstanding loan)" : "No (clear title)"}
- Financer: ${vehicle.financer || "None"}
- RC Status: ${vehicle.rc_status || "Unknown"}
- Insurance Status: ${vehicle.insurance_expiry ? (new Date(vehicle.insurance_expiry) > new Date() ? "Valid" : "Expired") : "Unknown"}
`.trim();

    const systemPrompt = `You are an expert used car valuation specialist for the Indian market. You have deep knowledge of:
- Current market trends for used vehicles in India
- Regional price variations
- Brand value and depreciation curves
- Fuel type preferences (petrol vs diesel vs CNG vs electric)
- Impact of ownership count on resale value
- Finance and loan implications on sale

Based on the vehicle details provided, estimate the current fair market value in Indian Rupees (INR).

Consider these factors:
1. Age of vehicle - typical depreciation is 15-20% first year, then 10-15% per year
2. Brand reputation - premium brands (Maruti, Hyundai, Honda, Toyota) retain value better
3. Model popularity - popular models like Swift, i20, City have higher demand
4. Fuel type trends - diesel has declined in value; petrol and CNG are preferred; EVs are rising
5. Ownership count - single owner vehicles command 5-10% premium
6. Financing status - clear title vehicles are preferred
7. Vehicle condition (assume average condition if not specified)

IMPORTANT: You must respond with ONLY a valid JSON object, no markdown formatting, no code blocks.

Response format:
{
  "estimated_price_low": <number in INR>,
  "estimated_price_high": <number in INR>,
  "recommended_price": <number in INR - your best estimate>,
  "confidence": "high" | "medium" | "low",
  "factors": ["list of key factors affecting this valuation"]
}`;

    console.log(`[${requestId}] Calling AI for price estimation...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    try {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: vehicleDetails },
          ],
        }),
      });

      clearTimeout(timeoutId);

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error(`[${requestId}] AI API error:`, aiResponse.status, errorText);
        
        if (aiResponse.status === 429) {
          return errorResponse("Rate limit exceeded. Please try again later.", 429, "RATE_LIMIT");
        }
        if (aiResponse.status === 402) {
          return errorResponse("AI service quota exceeded.", 402, "QUOTA_EXCEEDED");
        }
        
        return errorResponse("Failed to get price estimate from AI", 500, "AI_ERROR");
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content;

      if (!content) {
        console.error(`[${requestId}] No content in AI response:`, aiData);
        return errorResponse("Invalid AI response", 500, "AI_ERROR");
      }

      // Parse the JSON response
      let priceEstimate;
      try {
        let cleanContent = content.trim();
        if (cleanContent.startsWith("```json")) {
          cleanContent = cleanContent.slice(7);
        }
        if (cleanContent.startsWith("```")) {
          cleanContent = cleanContent.slice(3);
        }
        if (cleanContent.endsWith("```")) {
          cleanContent = cleanContent.slice(0, -3);
        }
        cleanContent = cleanContent.trim();
        
        priceEstimate = JSON.parse(cleanContent);
      } catch (parseError) {
        console.error(`[${requestId}] Failed to parse AI response:`, content, parseError);
        return errorResponse("Failed to parse price estimate", 500, "PARSE_ERROR");
      }

      const duration = Date.now() - startTime;
      console.log(`[${requestId}] Price estimate generated in ${duration}ms:`, priceEstimate);

      return new Response(
        JSON.stringify({
          success: true,
          estimate: {
            low: priceEstimate.estimated_price_low,
            high: priceEstimate.estimated_price_high,
            recommended: priceEstimate.recommended_price,
            confidence: priceEstimate.confidence,
            factors: priceEstimate.factors,
          },
          vehicleInfo: {
            registrationNumber: vehicle.registration_number,
            manufacturer: vehicle.manufacturer,
            model: vehicle.maker_model,
            age: vehicleAge,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        console.error(`[${requestId}] AI request timed out after ${AI_TIMEOUT_MS}ms`);
        return errorResponse("AI request timed out. Please try again.", 504, "TIMEOUT");
      }
      throw fetchError;
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] Price estimation error after ${duration}ms:`, error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500,
      "INTERNAL_ERROR"
    );
  }
});
