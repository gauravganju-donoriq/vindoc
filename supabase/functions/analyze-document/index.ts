import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

// Universal field list - all possible vehicle fields that can be extracted
const allFields = [
  "owner_name", "insurance_company", "insurance_expiry", "chassis_number", 
  "engine_number", "registration_date", "manufacturer", "maker_model", 
  "fuel_type", "color", "seating_capacity", "cubic_capacity", "vehicle_class", 
  "body_type", "vehicle_category", "gross_vehicle_weight", "unladen_weight", 
  "pucc_valid_upto", "fitness_valid_upto", "road_tax_valid_upto", "emission_norms"
];

// Field mappings by document type (for when user explicitly selects a type)
const fieldsByDocumentType: Record<string, string[]> = {
  auto: allFields, // Universal extraction
  insurance: ["insurance_company", "insurance_expiry", "owner_name"],
  rc: [
    "owner_name", "chassis_number", "engine_number", "registration_date",
    "manufacturer", "maker_model", "fuel_type", "color", "seating_capacity",
    "cubic_capacity", "vehicle_class", "body_type", "vehicle_category",
    "gross_vehicle_weight", "unladen_weight"
  ],
  pucc: ["pucc_valid_upto", "emission_norms"],
  fitness: ["fitness_valid_upto"],
  other: allFields // Treat "other" as universal extraction too
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentBase64, documentType, vehicleContext, mimeType } = await req.json();

    if (!documentBase64) {
      return new Response(
        JSON.stringify({ error: "No document provided", success: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate base64 and log size for debugging
    const base64Size = Math.round((documentBase64.length * 3) / 4 / 1024);
    console.log(`Processing image: ~${base64Size}KB, type: ${mimeType || "unknown"}, docType: ${documentType}`);

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

    // Use universal extraction for "auto" mode or unrecognized types
    const isAutoMode = documentType === "auto" || !fieldsByDocumentType[documentType];
    const fieldsToExtract = isAutoMode ? allFields : fieldsByDocumentType[documentType];

    // Build the prompt for document analysis
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

    // Determine the correct media type - ensure it's a valid type
    let mediaType = mimeType || "image/jpeg";
    if (!mediaType.startsWith("image/")) {
      mediaType = "image/jpeg";
    }

    console.log(`Sending request to AI gateway with model google/gemini-2.5-pro (auto mode: ${isAutoMode})`);

    // Use Gemini Pro which has strongest document/image understanding
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
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "AI service payment required. Please contact support.", 
            errorType: "payment_required",
            success: false 
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Parse error to give more specific message
      let errorMessage = "AI analysis failed. Please try again.";
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson?.error?.message?.includes("Unable to process")) {
          errorMessage = "Could not process the image. Please ensure it's a clear, readable document photo.";
        }
      } catch {
        // Use default error message
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage, 
          errorType: "ai_error",
          success: false 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    console.log("AI Response received successfully");

    // Extract the tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "extract_document_fields") {
      console.error("Unexpected AI response structure:", JSON.stringify(aiResponse, null, 2));
      throw new Error("AI did not return expected extraction results");
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    const detectedType = extractedData.document_type_detected || documentType;

    // For auto mode, return all extracted fields
    // For specific document types, filter to relevant fields only
    const filteredFields: Record<string, any> = {};
    const relevantFields = isAutoMode ? allFields : fieldsToExtract;
    
    for (const field of relevantFields) {
      if (extractedData.extracted_fields[field] !== undefined && 
          extractedData.extracted_fields[field] !== null &&
          extractedData.extracted_fields[field] !== "") {
        filteredFields[field] = extractedData.extracted_fields[field];
      }
    }

    console.log(`Extracted ${Object.keys(filteredFields).length} fields with ${extractedData.confidence} confidence, detected type: ${detectedType}`);

    return new Response(
      JSON.stringify({
        success: true,
        extractedFields: filteredFields,
        confidence: extractedData.confidence || "medium",
        documentTypeDetected: detectedType
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-document:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to analyze document",
        errorType: "unknown",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
