import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VehicleRequest {
  registrationNumber: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { registrationNumber }: VehicleRequest = await req.json();

    if (!registrationNumber) {
      return new Response(
        JSON.stringify({ success: false, message: "Registration number is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    if (!rapidApiKey) {
      console.error("RAPIDAPI_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, message: "API configuration error" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching vehicle details for: ${registrationNumber}`);
    console.log(`API Key configured, length: ${rapidApiKey.length}`);

    const requestBody = JSON.stringify({ vehicle_number: registrationNumber });
    
    // Use plain object format for headers as per RapidAPI documentation

    console.log('Making request to RapidAPI...');
    
    const response = await fetch('https://vehicle-rc-information-v2.p.rapidapi.com/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': 'vehicle-rc-information-v2.p.rapidapi.com'
      },
      body: requestBody,
    });

    console.log("Response status:", response.status);

    // Get raw response
    const rawText = await response.text();
    console.log("Raw response length:", rawText.length);
    console.log("Raw response preview:", rawText.substring(0, 300));

    if (!response.ok) {
      console.error("API returned error status:", response.status);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Could not fetch vehicle details",
          debug: { status: response.status, preview: rawText.substring(0, 200) }
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      console.error("JSON parse error:", e);
      return new Response(
        JSON.stringify({ success: false, message: "Invalid response format" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Successfully parsed response");

    // Map the API response to our database fields
    const vehicleData = {
      owner_name: data.owner_name || null,
      vehicle_class: data.class || null,
      fuel_type: data.fuel_type || null,
      maker_model: data.brand_model || null,
      manufacturer: data.brand_name || null,
      registration_date: parseIndianDate(data.registration_date),
      insurance_company: data.insurance_company || null,
      insurance_expiry: parseIndianDate(data.insurance_expiry),
      pucc_valid_upto: parseIndianDate(data.pucc_upto),
      fitness_valid_upto: null,
      road_tax_valid_upto: parseIndianDate(data.tax_paid_upto || data.tax_upto),
      rc_status: data.rc_status || null,
    };

    console.log("Vehicle data mapped successfully");

    return new Response(
      JSON.stringify({ success: true, vehicleData, rawData: data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, message: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function parseIndianDate(dateValue: string | null | undefined): string | null {
  if (!dateValue || dateValue === "NA" || dateValue === "null") return null;
  
  const months: Record<string, string> = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };
  
  try {
    const parts = dateValue.split('-');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
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
