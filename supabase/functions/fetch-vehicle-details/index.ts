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

    const response = await fetch('https://vehicle-rc-information-v2.p.rapidapi.com/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'vehicle-rc-information-v2.p.rapidapi.com',
        'x-rapidapi-key': rapidApiKey,
      },
      body: JSON.stringify({ vehicle_number: registrationNumber }),
    });

    console.log("API Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error:", errorText);
      return new Response(
        JSON.stringify({ success: false, message: "Could not fetch vehicle details" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log("API Response data:", JSON.stringify(data));

    if (!data) {
      return new Response(
        JSON.stringify({ success: false, message: "No data returned from API" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      fitness_valid_upto: null, // Not in this API response
      road_tax_valid_upto: parseIndianDate(data.tax_paid_upto || data.tax_upto),
      rc_status: data.rc_status || null,
    };

    console.log("Parsed vehicle data:", vehicleData);

    return new Response(
      JSON.stringify({ success: true, vehicleData, rawData: data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in fetch-vehicle-details:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Parse Indian date format like "24-Nov-2017" or "23-Feb-2024" to YYYY-MM-DD
function parseIndianDate(dateValue: string | null | undefined): string | null {
  if (!dateValue || dateValue === "NA" || dateValue === "null") return null;
  
  try {
    const months: { [key: string]: string } = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    
    // Handle "DD-Mon-YYYY" format (e.g., "24-Nov-2017")
    const parts = dateValue.split('-');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const monthStr = parts[1];
      const year = parts[2];
      
      const month = months[monthStr];
      if (month && year.length === 4) {
        return `${year}-${month}-${day}`;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}
