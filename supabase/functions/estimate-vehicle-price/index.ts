import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { vehicleId } = body;

    if (!vehicleId) {
      return new Response(
        JSON.stringify({ error: "vehicleId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch vehicle data and verify ownership + verification status
    const { data: vehicle, error: vehicleError } = await userClient
      .from("vehicles")
      .select("*")
      .eq("id", vehicleId)
      .single();

    if (vehicleError || !vehicle) {
      console.error("Vehicle fetch error:", vehicleError);
      return new Response(
        JSON.stringify({ error: "Vehicle not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the vehicle is verified
    if (!vehicle.is_verified) {
      return new Response(
        JSON.stringify({ error: "Vehicle must be verified before listing for sale" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate vehicle age
    let vehicleAge = "Unknown";
    if (vehicle.registration_date) {
      const regDate = new Date(vehicle.registration_date);
      const now = new Date();
      const years = Math.floor((now.getTime() - regDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      const months = Math.floor(((now.getTime() - regDate.getTime()) % (365.25 * 24 * 60 * 60 * 1000)) / (30 * 24 * 60 * 60 * 1000));
      vehicleAge = `${years} years ${months} months`;
    }

    // Build prompt for AI
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

    console.log("Calling Lovable AI for price estimation...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: vehicleDetails },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service quota exceeded." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to get price estimate from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response:", aiData);
      return new Response(
        JSON.stringify({ error: "Invalid AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON response
    let priceEstimate;
    try {
      // Clean up potential markdown formatting
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
      console.error("Failed to parse AI response:", content, parseError);
      return new Response(
        JSON.stringify({ error: "Failed to parse price estimate" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Price estimate generated:", priceEstimate);

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
  } catch (error) {
    console.error("Price estimation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
