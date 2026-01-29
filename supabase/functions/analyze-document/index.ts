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
  documentBase64: z.string().min(1, "Document is required"),
  documentType: z.enum(["auto", "insurance", "rc", "pucc", "fitness", "other"]).default("auto"),
  vehicleContext: z.object({
    registration_number: z.string().optional(),
  }).optional().nullable(),
  mimeType: z.string().optional(),
});

// Universal field list - all possible vehicle fields that can be extracted
const allFields = [
  "owner_name", "insurance_company", "insurance_expiry", "chassis_number", 
  "engine_number", "registration_date", "manufacturer", "maker_model", 
  "fuel_type", "color", "seating_capacity", "cubic_capacity", "vehicle_class", 
  "body_type", "vehicle_category", "gross_vehicle_weight", "unladen_weight", 
  "pucc_valid_upto", "fitness_valid_upto", "road_tax_valid_upto", "emission_norms"
];

// Field mappings by document type
const fieldsByDocumentType: Record<string, string[]> = {
  auto: allFields,
  insurance: ["insurance_company", "insurance_expiry", "owner_name"],
  rc: [
    "owner_name", "chassis_number", "engine_number", "registration_date",
    "manufacturer", "maker_model", "fuel_type", "color", "seating_capacity",
    "cubic_capacity", "vehicle_class", "body_type", "vehicle_category",
    "gross_vehicle_weight", "unladen_weight"
  ],
  pucc: ["pucc_valid_upto", "emission_norms"],
  fitness: ["fitness_valid_upto"],
  other: allFields
};

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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
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

    const { documentBase64, documentType, vehicleContext, mimeType } = validation.data;

    // Validate base64 size
    const base64Size = Math.round((documentBase64.length * 3) / 4 / 1024);
    console.log(`[${requestId}] Processing image: ~${base64Size}KB, type: ${mimeType || "unknown"}, docType: ${documentType}`);

    if (base64Size > 4096) {
      return errorResponse(
        "Image too large. Please upload an image smaller than 4MB.",
        400,
        "image_too_large"
      );
    }

    // ============= PHASE 3: PREPARE AI REQUEST =============
    const isAutoMode = documentType === "auto" || !fieldsByDocumentType[documentType];
    const fieldsToExtract = isAutoMode ? allFields : fieldsByDocumentType[documentType];

    const systemPrompt = isAutoMode 
      ? `You are a specialized document analyzer for Indian vehicle documents. 

IMPORTANT INSTRUCTIONS:
1. First, IDENTIFY what type of document this is:
   - Insurance Policy (vehicle insurance document)
   - Registration Certificate / RC (vehicle registration document)
   - PUCC Certificate (Pollution Under Control Certificate)
   - Fitness Certificate (vehicle fitness/roadworthiness certificate)
   - Other (any other vehicle-related document)

2. Then, extract ALL visible fields from the document that match vehicle data.

EXTRACTION RULES:
- Extract EVERY field you can clearly read from the document
- For dates, use YYYY-MM-DD format
- For text fields, extract exactly as written (preserve case)
- If a field is not visible or unclear, do not include it
- Be accurate - this data will update official vehicle records

Vehicle Registration Number for reference: ${vehicleContext?.registration_number || "Unknown"}`
      : `You are a specialized document analyzer for Indian vehicle documents. 
Your task is to extract specific fields from the uploaded document image.

IMPORTANT INSTRUCTIONS:
- Extract ONLY the fields specified in the tool definition
- For dates, use YYYY-MM-DD format
- For text fields, extract exactly as written (preserve case)
- If a field is not visible or unclear, do not include it
- Be accurate - this data will update official vehicle records
- The document is an Indian vehicle document (Insurance, RC, PUCC, Fitness Certificate)

Vehicle Registration Number for reference: ${vehicleContext?.registration_number || "Unknown"}`;

    const documentTypeLabel = isAutoMode ? "vehicle document" :
      documentType === "rc" ? "Registration Certificate (RC)" : 
      documentType === "pucc" ? "Pollution Under Control Certificate (PUCC)" :
      documentType === "fitness" ? "Fitness Certificate" :
      documentType === "insurance" ? "Insurance Policy" : "vehicle document";

    const userPrompt = isAutoMode 
      ? `Analyze this document image. First identify what type of vehicle document it is, then extract ALL visible vehicle-related information.

Look for these fields if they appear: ${fieldsToExtract.join(", ")}`
      : `Analyze this ${documentTypeLabel} and extract the relevant information.

Extract these fields if visible: ${fieldsToExtract.join(", ")}`;

    // Determine the correct media type
    let mediaType = mimeType || "image/jpeg";
    if (!mediaType.startsWith("image/")) {
      mediaType = "image/jpeg";
    }

    console.log(`[${requestId}] Sending request to AI gateway (auto mode: ${isAutoMode})`);

    // ============= PHASE 4: CALL AI WITH TIMEOUT =============
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
                    url: `data:${mediaType};base64,${documentBase64}` 
                  } 
                }
              ]
            }
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_document_fields",
                description: "Extract fields from the vehicle document",
                parameters: {
                  type: "object",
                  properties: {
                    extracted_fields: {
                      type: "object",
                      description: "The extracted fields from the document",
                      properties: {
                        owner_name: { type: "string", description: "Name of the vehicle owner" },
                        insurance_company: { type: "string", description: "Insurance company name" },
                        insurance_expiry: { type: "string", description: "Insurance expiry date (YYYY-MM-DD)" },
                        chassis_number: { type: "string", description: "Chassis number of the vehicle" },
                        engine_number: { type: "string", description: "Engine number of the vehicle" },
                        registration_date: { type: "string", description: "Vehicle registration date (YYYY-MM-DD)" },
                        manufacturer: { type: "string", description: "Vehicle manufacturer/make" },
                        maker_model: { type: "string", description: "Vehicle model name" },
                        fuel_type: { type: "string", description: "Fuel type (Petrol/Diesel/CNG/Electric)" },
                        color: { type: "string", description: "Vehicle color" },
                        seating_capacity: { type: "number", description: "Number of seats" },
                        cubic_capacity: { type: "number", description: "Engine cubic capacity in cc" },
                        vehicle_class: { type: "string", description: "Vehicle class/type" },
                        body_type: { type: "string", description: "Body type of vehicle" },
                        vehicle_category: { type: "string", description: "Vehicle category" },
                        gross_vehicle_weight: { type: "string", description: "Gross vehicle weight" },
                        unladen_weight: { type: "string", description: "Unladen weight of vehicle" },
                        pucc_valid_upto: { type: "string", description: "PUCC validity date (YYYY-MM-DD)" },
                        fitness_valid_upto: { type: "string", description: "Fitness certificate validity (YYYY-MM-DD)" },
                        road_tax_valid_upto: { type: "string", description: "Road tax validity date (YYYY-MM-DD)" },
                        emission_norms: { type: "string", description: "Emission norms (BS4/BS6 etc)" }
                      }
                    },
                    confidence: {
                      type: "string",
                      enum: ["high", "medium", "low"],
                      description: "Overall confidence in the extraction"
                    },
                    document_type_detected: {
                      type: "string",
                      enum: ["insurance", "rc", "pucc", "fitness", "other"],
                      description: "The type of document detected"
                    }
                  },
                  required: ["extracted_fields", "confidence", "document_type_detected"]
                }
              }
            }
          ],
          tool_choice: { type: "function", function: { name: "extract_document_fields" } }
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
        if (response.status === 402) {
          return errorResponse(
            "AI service payment required. Please contact support.",
            402,
            "payment_required"
          );
        }
        
        let errorMessage = "AI analysis failed. Please try again.";
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson?.error?.message?.includes("Unable to process")) {
            errorMessage = "Could not process the image. Please ensure it's a clear, readable document photo.";
          }
        } catch {
          // Use default error message
        }
        
        return errorResponse(errorMessage, 500, "ai_error");
      }

      const aiResponse = await response.json();
      console.log(`[${requestId}] AI Response received successfully`);

      // Extract the tool call result
      const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall || toolCall.function.name !== "extract_document_fields") {
        console.error(`[${requestId}] Unexpected AI response structure`);
        return errorResponse("AI did not return expected extraction results", 500, "ai_error");
      }

      const extractedData = JSON.parse(toolCall.function.arguments);
      const detectedType = extractedData.document_type_detected || documentType;

      // Filter to relevant fields only
      const filteredFields: Record<string, unknown> = {};
      const relevantFields = isAutoMode ? allFields : fieldsToExtract;
      
      for (const field of relevantFields) {
        if (extractedData.extracted_fields[field] !== undefined && 
            extractedData.extracted_fields[field] !== null &&
            extractedData.extracted_fields[field] !== "") {
          filteredFields[field] = extractedData.extracted_fields[field];
        }
      }

      const duration = Date.now() - startTime;
      console.log(`[${requestId}] Extracted ${Object.keys(filteredFields).length} fields with ${extractedData.confidence} confidence in ${duration}ms`);

      return new Response(
        JSON.stringify({
          success: true,
          extractedFields: filteredFields,
          confidence: extractedData.confidence || "medium",
          documentTypeDetected: detectedType
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        console.error(`[${requestId}] AI request timed out after ${AI_TIMEOUT_MS}ms`);
        return errorResponse("AI analysis timed out. Please try again.", 504, "timeout");
      }
      throw fetchError;
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] Error in analyze-document after ${duration}ms:`, error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to analyze document",
      500,
      "unknown"
    );
  }
});
