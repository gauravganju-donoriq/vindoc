import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Standardized CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Request validation schema
const RequestSchema = z.object({
  vehicleId: z.string().uuid("Invalid vehicle ID format"),
  registrationNumber: z.string().min(1).max(20).transform(s => s.trim().toUpperCase()),
  makerModel: z.string().max(100).optional().nullable(),
  claimantEmail: z.string().email("Invalid email format"),
  claimantPhone: z.string().max(20).optional().nullable(),
  message: z.string().max(1000).optional().nullable(),
});

// Standardized error response
function errorResponse(message: string, status: number, errorCode: string) {
  return new Response(
    JSON.stringify({ success: false, error: message, errorCode }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============= PHASE 1: VALIDATE ENVIRONMENT =============
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!resendApiKey) {
      console.error(`[${requestId}] RESEND_API_KEY not configured`);
      return errorResponse("Email service not configured", 500, "CONFIG_ERROR");
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[${requestId}] Missing Supabase configuration`);
      return errorResponse("Server configuration error", 500, "CONFIG_ERROR");
    }

    const resend = new Resend(resendApiKey);
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

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

    const { vehicleId, registrationNumber, makerModel, claimantEmail, claimantPhone, message } = validation.data;

    console.log(`[${requestId}] Processing ownership claim notification for vehicle ${registrationNumber}`);

    // ============= PHASE 3: GET OWNER INFO =============
    const { data: vehicle, error: vehicleError } = await adminClient
      .from("vehicles")
      .select("user_id")
      .eq("id", vehicleId)
      .maybeSingle();

    if (vehicleError) {
      console.error(`[${requestId}] Vehicle lookup error:`, vehicleError);
      return errorResponse("Vehicle not found", 404, "NOT_FOUND");
    }

    if (!vehicle) {
      return errorResponse("Vehicle not found", 404, "NOT_FOUND");
    }

    // Get owner's email from auth
    const { data: ownerData, error: ownerError } = await adminClient.auth.admin.getUserById(vehicle.user_id);
    
    if (ownerError || !ownerData?.user?.email) {
      console.error(`[${requestId}] Owner lookup error:`, ownerError);
      return errorResponse("Could not find owner email", 404, "OWNER_NOT_FOUND");
    }

    const ownerEmail = ownerData.user.email;

    // ============= PHASE 4: BUILD AND SEND EMAIL =============
    const vehicleDescription = makerModel 
      ? `${registrationNumber} (${makerModel})` 
      : registrationNumber;

    const contactInfo = claimantPhone 
      ? `Email: ${claimantEmail}\nPhone: ${claimantPhone}`
      : `Email: ${claimantEmail}`;

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">
          Someone is requesting ownership of your vehicle
        </h1>
        
        <p style="color: #333; font-size: 16px; line-height: 1.6;">
          Someone has indicated that they are the new owner of your vehicle 
          <strong>${vehicleDescription}</strong> and is requesting you to transfer ownership.
        </p>
        
        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; color: #333;">Claimant's Contact Information:</h3>
          <p style="margin: 0; color: #555; white-space: pre-line;">${contactInfo}</p>
          ${message ? `
          <h4 style="margin: 16px 0 8px 0; color: #333;">Their Message:</h4>
          <p style="margin: 0; color: #555; font-style: italic;">"${message}"</p>
          ` : ""}
        </div>
        
        <h2 style="color: #1a1a1a; font-size: 18px; margin-top: 24px;">What should you do?</h2>
        
        <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; color: #2e7d32;">
            <strong>If you sold this vehicle:</strong><br>
            Log in to your dashboard and initiate a transfer to complete the ownership change.
          </p>
        </div>
        
        <div style="background: #fff3e0; border-left: 4px solid #ff9800; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; color: #e65100;">
            <strong>If you still own this vehicle:</strong><br>
            You can safely ignore this email. No action will be taken without your explicit approval.
          </p>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 24px;">
          This request will expire in 14 days if no action is taken.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;">
        
        <p style="color: #999; font-size: 12px;">
          This email was sent by VinDoc regarding your registered vehicle.
          If you have any questions, please contact our support team.
        </p>
      </div>
    `;

    const { error: emailError } = await resend.emails.send({
      from: "VinDoc <noreply@resend.dev>",
      to: [ownerEmail],
      subject: `Transfer Request for ${registrationNumber}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error(`[${requestId}] Email send error:`, emailError);
      return errorResponse("Failed to send notification email", 500, "EMAIL_FAILED");
    }

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Ownership claim notification sent to ${ownerEmail} for vehicle ${registrationNumber} in ${duration}ms`);

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] Notification error after ${duration}ms:`, error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500, "INTERNAL_ERROR");
  }
});
