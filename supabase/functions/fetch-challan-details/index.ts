import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simple validation for Indian vehicle registration numbers
const isValidRegistrationNumber = (regNo: string): boolean => {
  // Pattern: 2 letters (state) + 1-2 digits (district) + 1-3 letters (series) + 4 digits
  const pattern = /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/i;
  return pattern.test(regNo.replace(/\s+/g, ''));
};

interface ChallanApiResponse {
  status: string;
  txn_id: string;
  status_code: number;
  message: string;
  result?: {
    pending_challan: Array<{
      challan_no: string;
      challan_date_time: string;
      challan_place: string;
      challan_status: string;
      sent_to_reg_court: string;
      remark: string;
      fine_imposed: string;
      dl_no: string | null;
      driver_name: string | null;
      owner_name: string;
      name_of_violator: string;
      department: string;
      state_code: string;
      document_impounded: string;
      offence_details: Array<{ act: string | null; name: string }>;
      amount_of_fine_imposed: string | null;
      court_address: string | null;
      court_name: string | null;
      date_of_proceeding: string | null;
      sent_to_court_on: string | null;
      sent_to_virtual_court: string;
      rto_distric_name: string;
    }>;
    disposed_challan: Array<{
      challan_no: string;
      challan_date_time: string;
      challan_place: string;
      challan_status: string;
      sent_to_reg_court: string;
      remark: string;
      fine_imposed: string;
      dl_no: string | null;
      driver_name: string | null;
      owner_name: string;
      name_of_violator: string;
      department: string;
      state_code: string;
      document_impounded: string;
      offence_details: Array<{ act: string | null; name: string }>;
      amount_of_fine_imposed: string | null;
      court_address: string | null;
      court_name: string | null;
      date_of_proceeding: string | null;
      sent_to_court_on: string | null;
      sent_to_virtual_court: string;
      rto_distric_name: string;
    }>;
  };
}

interface ChallanData {
  challanNo: string;
  dateTime: string;
  place: string;
  status: 'Pending' | 'Disposed';
  remark: string;
  fineImposed: number;
  driverName: string | null;
  ownerName: string;
  department: string;
  stateCode: string;
  offences: Array<{ act: string | null; name: string }>;
  sentToCourt: boolean;
  courtDetails: {
    address: string | null;
    name: string | null;
    dateOfProceeding: string | null;
  } | null;
  rawData: Record<string, unknown>;
}

interface RawChallan {
  challan_no: string;
  challan_date_time: string;
  challan_place: string;
  challan_status: string;
  sent_to_reg_court: string;
  remark: string;
  fine_imposed: string;
  dl_no: string | null;
  driver_name: string | null;
  owner_name: string;
  name_of_violator: string;
  department: string;
  state_code: string;
  document_impounded: string;
  offence_details: Array<{ act: string | null; name: string }>;
  amount_of_fine_imposed: string | null;
  court_address: string | null;
  court_name: string | null;
  date_of_proceeding: string | null;
  sent_to_court_on: string | null;
  sent_to_virtual_court: string;
  rto_distric_name: string;
}

const mapChallanData = (
  challan: RawChallan,
  status: 'Pending' | 'Disposed'
): ChallanData => {
  return {
    challanNo: challan.challan_no,
    dateTime: challan.challan_date_time,
    place: challan.challan_place,
    status,
    remark: challan.remark,
    fineImposed: parseFloat(challan.fine_imposed) || 0,
    driverName: challan.driver_name,
    ownerName: challan.owner_name,
    department: challan.department,
    stateCode: challan.state_code,
    offences: challan.offence_details || [],
    sentToCourt: challan.sent_to_reg_court === 'Yes' || challan.sent_to_virtual_court === 'Yes',
    courtDetails: challan.court_name || challan.court_address ? {
      address: challan.court_address,
      name: challan.court_name,
      dateOfProceeding: challan.date_of_proceeding,
    } : null,
    rawData: challan as unknown as Record<string, unknown>,
  };
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;

    // Parse request body
    const body = await req.json();
    const { registration_number, vehicle_id } = body;

    if (!registration_number) {
      return new Response(
        JSON.stringify({ success: false, error: 'Registration number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate registration number format
    const cleanRegNo = registration_number.replace(/\s+/g, '').toUpperCase();
    if (!isValidRegistrationNumber(cleanRegNo)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid registration number format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify vehicle belongs to user if vehicle_id provided
    if (vehicle_id) {
      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id, user_id')
        .eq('id', vehicle_id)
        .single();

      if (vehicleError || !vehicle || vehicle.user_id !== userId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Vehicle not found or access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get RapidAPI key
    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    if (!rapidApiKey) {
      console.error('RAPIDAPI_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call RapidAPI Challan endpoint with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      console.log(`Fetching challan details for: ${cleanRegNo}`);
      
      const apiResponse = await fetch('https://rto-challan-details-api.p.rapidapi.com/api/v1/challan', {
        method: 'POST',
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': 'rto-challan-details-api.p.rapidapi.com',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reg_no: cleanRegNo,
          consent: 'Y',
          consent_text: 'I hereby declare my consent agreement for fetching my information via VAHAN API',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!apiResponse.ok) {
        console.error(`API error: ${apiResponse.status} ${apiResponse.statusText}`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Could not fetch challan details. Please try again later.' 
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data: ChallanApiResponse = await apiResponse.json();
      console.log(`API response status: ${data.status}, message: ${data.message}`);

      // Handle API response
      if (data.status !== 'success' || data.status_code !== 100) {
        // Check for "No Challan Found" message
        if (data.message?.toLowerCase().includes('no challan') || 
            data.message?.toLowerCase().includes('not found')) {
          return new Response(
            JSON.stringify({
              success: true,
              message: 'No challans found',
              pending_challans: [],
              disposed_challans: [],
              total_pending_fine: 0,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: false, 
            error: data.message || 'Could not fetch challan details' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Map challans to structured format
      const pendingChallans = (data.result?.pending_challan || []).map(c => mapChallanData(c, 'Pending'));
      const disposedChallans = (data.result?.disposed_challan || []).map(c => mapChallanData(c, 'Disposed'));

      // Calculate total pending fine
      const totalPendingFine = pendingChallans.reduce((sum, c) => sum + c.fineImposed, 0);

      return new Response(
        JSON.stringify({
          success: true,
          message: data.message,
          pending_challans: pendingChallans,
          disposed_challans: disposedChallans,
          total_pending_fine: totalPendingFine,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return new Response(
          JSON.stringify({ success: false, error: 'Request timed out. Please try again.' }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw fetchError;
    }

  } catch (error) {
    console.error('Error in fetch-challan-details:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'An unexpected error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
