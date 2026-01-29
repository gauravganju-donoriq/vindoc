import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Standardized CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Request validation schema
const RequestSchema = z.object({
  recipientEmail: z.string().email("Invalid email format"),
  senderName: z.string().min(1).max(100),
  vehicleNumber: z.string().min(1).max(20).transform(s => s.trim().toUpperCase()),
  vehicleModel: z.string().max(100).optional().nullable(),
  expiresAt: z.string().refine(val => !isNaN(Date.parse(val)), "Invalid date format"),
});

// Standardized error response
function errorResponse(message: string, status: number, errorCode: string) {
  return new Response(
    JSON.stringify({ success: false, message, errorCode }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============= PHASE 1: VALIDATE ENVIRONMENT =============
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.error(`[${requestId}] RESEND_API_KEY not configured`);
      return errorResponse("Email service not configured", 500, "CONFIG_ERROR");
    }

    const resend = new Resend(resendApiKey);

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

    const { recipientEmail, senderName, vehicleNumber, vehicleModel, expiresAt } = validation.data;

    console.log(`[${requestId}] Sending transfer notification to: ${recipientEmail}`);

    // ============= PHASE 3: FORMAT AND SEND EMAIL =============
    const expiryDate = new Date(expiresAt).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    const emailResponse = await resend.emails.send({
      from: "VinDoc <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `Vehicle Transfer Request: ${vehicleNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="background-color: #18181b; padding: 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🚗 Vehicle Transfer Request</h1>
            </div>
            <div style="padding: 32px;">
              <p style="color: #18181b; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                Hello,
              </p>
              <p style="color: #18181b; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                <strong>${senderName}</strong> wants to transfer the ownership of a vehicle to you.
              </p>
              
              <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h2 style="color: #18181b; font-size: 18px; margin: 0 0 12px;">Vehicle Details</h2>
                <p style="color: #71717a; font-size: 14px; margin: 0 0 8px;">
                  <strong>Registration Number:</strong> <span style="color: #18181b; font-family: monospace; font-size: 16px;">${vehicleNumber}</span>
                </p>
                ${vehicleModel ? `<p style="color: #71717a; font-size: 14px; margin: 0;">
                  <strong>Model:</strong> <span style="color: #18181b;">${vehicleModel}</span>
                </p>` : ""}
              </div>
              
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <p style="color: #92400e; font-size: 14px; margin: 0;">
                  ⏰ This transfer request will expire on <strong>${expiryDate}</strong>.
                </p>
              </div>
              
              <p style="color: #18181b; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                To accept or reject this transfer, please log in to your VinDoc account and go to your dashboard.
              </p>
              
              <p style="color: #71717a; font-size: 14px; margin: 0;">
                If you don't have an account yet, you can sign up using this email address to claim the transfer.
              </p>
            </div>
            <div style="background-color: #f4f4f5; padding: 16px; text-align: center;">
              <p style="color: #71717a; font-size: 12px; margin: 0;">
                This email was sent by VinDoc. If you didn't expect this email, you can safely ignore it.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Transfer notification email sent in ${duration}ms:`, emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] Error sending transfer notification after ${duration}ms:`, error);
    return errorResponse(
      error instanceof Error ? error.message : "Unknown error",
      500,
      "INTERNAL_ERROR"
    );
  }
});
