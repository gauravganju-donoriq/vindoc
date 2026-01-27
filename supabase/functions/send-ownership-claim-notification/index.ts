import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClaimNotificationRequest {
  vehicleId: string;
  registrationNumber: string;
  makerModel?: string;
  claimantEmail: string;
  claimantPhone?: string;
  message?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const body: ClaimNotificationRequest = await req.json();
    const { vehicleId, registrationNumber, makerModel, claimantEmail, claimantPhone, message } = body;

    if (!vehicleId || !registrationNumber || !claimantEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the current owner's email
    const { data: vehicle, error: vehicleError } = await adminClient
      .from("vehicles")
      .select("user_id")
      .eq("id", vehicleId)
      .single();

    if (vehicleError || !vehicle) {
      console.error("Vehicle lookup error:", vehicleError);
      return new Response(
        JSON.stringify({ error: "Vehicle not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get owner's email from auth
    const { data: ownerData, error: ownerError } = await adminClient.auth.admin.getUserById(vehicle.user_id);
    
    if (ownerError || !ownerData?.user?.email) {
      console.error("Owner lookup error:", ownerError);
      return new Response(
        JSON.stringify({ error: "Could not find owner email" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ownerEmail = ownerData.user.email;

    // Build email content
    const vehicleDescription = makerModel 
      ? `${registrationNumber} (${makerModel})` 
      : registrationNumber;

    const contactInfo = claimantPhone 
      ? `Email: ${claimantEmail}\nPhone: ${claimantPhone}`
      : `Email: ${claimantEmail}`;

    const messageSection = message 
      ? `\n\nTheir message:\n"${message}"`
      : "";

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
          This email was sent by Cert Chaperone regarding your registered vehicle.
          If you have any questions, please contact our support team.
        </p>
      </div>
    `;

    // Send the email
    const { error: emailError } = await resend.emails.send({
      from: "Cert Chaperone <noreply@resend.dev>",
      to: [ownerEmail],
      subject: `Transfer Request for ${registrationNumber}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Email send error:", emailError);
      return new Response(
        JSON.stringify({ error: "Failed to send notification email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Ownership claim notification sent to ${ownerEmail} for vehicle ${registrationNumber}`);

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Notification error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
