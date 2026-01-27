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

    const data = await response.json();
    console.log("API Response status:", response.status);

    if (!response.ok || !data) {
      console.error("API Error:", data);
      return new Response(
        JSON.stringify({ success: false, message: "Could not fetch vehicle details" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the API response and extract relevant fields
    // The exact field names may vary based on the API response structure
    const result = data.result || data.data || data;
    
    const vehicleData = {
      owner_name: result.owner_name || result.ownerName || result.owner || null,
      vehicle_class: result.vehicle_class || result.vehicleClass || result.class || null,
      fuel_type: result.fuel_type || result.fuelType || result.fuel || null,
      maker_model: result.maker_model || result.makerModel || result.model || result.vehicleModel || null,
      manufacturer: result.manufacturer || result.maker || result.vehicleMaker || null,
      registration_date: parseDate(result.registration_date || result.registrationDate || result.regDate),
      insurance_company: result.insurance_company || result.insuranceCompany || result.insurer || null,
      insurance_expiry: parseDate(result.insurance_upto || result.insuranceUpto || result.insuranceExpiry),
      pucc_valid_upto: parseDate(result.pucc_upto || result.puccUpto || result.puccValidUpto),
      fitness_valid_upto: parseDate(result.fitness_upto || result.fitnessUpto || result.fitnessValidUpto),
      road_tax_valid_upto: parseDate(result.tax_upto || result.taxUpto || result.roadTaxValidUpto),
      rc_status: result.rc_status || result.rcStatus || result.status || null,
    };

    console.log("Parsed vehicle data:", vehicleData);

    return new Response(
      JSON.stringify({ success: true, vehicleData, rawData: result }),
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

// Helper function to parse various date formats
function parseDate(dateValue: string | null | undefined): string | null {
  if (!dateValue) return null;
  
  try {
    // Handle DD-MM-YYYY format
    if (dateValue.includes('-')) {
      const parts = dateValue.split('-');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        if (day.length === 2 && month.length === 2 && year.length === 4) {
          return `${year}-${month}-${day}`;
        }
        // Already in YYYY-MM-DD format
        if (parts[0].length === 4) {
          return dateValue;
        }
      }
    }
    
    // Handle DD/MM/YYYY format
    if (dateValue.includes('/')) {
      const parts = dateValue.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    
    // Try parsing as ISO date
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    return null;
  } catch {
    return null;
  }
}
