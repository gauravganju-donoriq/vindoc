import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Standardized CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Request validation schema
const RequestSchema = z.object({
  registrationNumber: z.string()
    .min(1, "Registration number is required")
    .max(20, "Registration number too long")
    .transform(s => s.trim().toUpperCase().replace(/\s+/g, "")),
});

// Standardized error response
function errorResponse(message: string, status: number, errorCode: string, debug?: object) {
  return new Response(
    JSON.stringify({ success: false, message, errorCode, debug }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// API request timeout (10 seconds)
const API_TIMEOUT_MS = 10000;

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============= PHASE 1: AUTHENTICATION =============
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log(`[${requestId}] Missing authorization header`);
      return errorResponse("Unauthorized", 401, "AUTH_MISSING");
    }

    // Validate environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error(`[${requestId}] Missing Supabase configuration`);
      return errorResponse("Server configuration error", 500, "CONFIG_ERROR");
    }

    if (!rapidApiKey) {
      console.error(`[${requestId}] RAPIDAPI_KEY not configured`);
      return errorResponse("API configuration error", 500, "CONFIG_ERROR");
    }

    // Verify the user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

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

    const { registrationNumber } = validation.data;
    console.log(`[${requestId}] Fetching vehicle details for: ${registrationNumber}`);

    // ============= PHASE 3: CALL RTO API WITH TIMEOUT =============
    const payload = JSON.stringify({ vehicle_number: registrationNumber });
    console.log(`[${requestId}] Making request to rto-vehicle-details API...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const response = await fetch("https://rto-vehicle-details.p.rapidapi.com/api3", {
        method: "POST",
        headers: {
          "x-rapidapi-key": rapidApiKey,
          "x-rapidapi-host": "rto-vehicle-details.p.rapidapi.com",
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: payload,
      });

      clearTimeout(timeoutId);

      console.log(`[${requestId}] Response status:`, response.status);

      // Get raw response
      const rawText = await response.text();
      console.log(`[${requestId}] Raw response length:`, rawText.length);

      if (!response.ok) {
        console.error(`[${requestId}] API returned error status:`, response.status);
        return errorResponse(
          "Could not fetch vehicle details",
          404,
          "API_ERROR",
          { status: response.status, preview: rawText.substring(0, 200) }
        );
      }

      // Parse JSON
      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        console.error(`[${requestId}] JSON parse error`);
        return errorResponse("Invalid response format", 500, "PARSE_ERROR");
      }

      console.log(`[${requestId}] Successfully parsed response`);

      // Map the API response to our database fields
      const vehicleData = {
        owner_name: data.owner_name || null,
        vehicle_class: data.class || null,
        fuel_type: data.fuel_type || null,
        maker_model: data.brand_model && data.brand_model !== "Not Available" ? data.brand_model : null,
        manufacturer: data.brand_name || null,
        registration_date: parseIndianDate(data.registration_date),
        insurance_company: data.insurance_company || null,
        insurance_expiry: parseIndianDate(data.insurance_expiry),
        pucc_valid_upto: parseIndianDate(data.pucc_upto),
        fitness_valid_upto: null,
        road_tax_valid_upto: parseIndianDate(data.tax_paid_upto || data.tax_upto),
        rc_status: data.rc_status || null,
        engine_number: data.engine_number && data.engine_number !== "NA" ? data.engine_number : null,
        chassis_number: data.chassis_number && data.chassis_number !== "NA" ? data.chassis_number : null,
        color: data.color || null,
        seating_capacity: data.seating_capacity ? parseInt(data.seating_capacity) : null,
        cubic_capacity: data.cubic_capacity ? parseInt(data.cubic_capacity) : null,
        owner_count: data.owner_count ? parseInt(data.owner_count) : null,
        emission_norms: data.norms && data.norms !== "Not Available" ? data.norms : null,
        is_financed: data.is_financed === "1",
        financer: data.financer || null,
        noc_details: data.noc_details && data.noc_details !== "NA" ? data.noc_details : null,
      };

      const duration = Date.now() - startTime;
      console.log(`[${requestId}] Vehicle data mapped successfully in ${duration}ms`);

      return new Response(
        JSON.stringify({ success: true, vehicleData, rawData: data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        console.error(`[${requestId}] API request timed out after ${API_TIMEOUT_MS}ms`);
        return errorResponse("Request timed out. Please try again.", 504, "TIMEOUT");
      }
      throw fetchError;
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] Unexpected error after ${duration}ms:`, error);
    return errorResponse(
      error instanceof Error ? error.message : "Unknown error",
      500,
      "INTERNAL_ERROR"
    );
  }
});

function parseIndianDate(dateValue: string | null | undefined): string | null {
  if (!dateValue || dateValue === "NA" || dateValue === "null") return null;
  
  const months: Record<string, string> = {
    "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04",
    "May": "05", "Jun": "06", "Jul": "07", "Aug": "08",
    "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12"
  };
  
  try {
    const parts = dateValue.split("-");
    if (parts.length === 3) {
      const day = parts[0].padStart(2, "0");
      const month = months[parts[1]];
      const year = parts[2];
      if (month && year.length === 4) {
        return `${year}-${month}-${day}`;
      }
    }
  } catch {
    // ignore parse errors
  }
  
  return null;
}
