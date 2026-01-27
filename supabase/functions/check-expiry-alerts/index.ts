import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Vehicle {
  id: string;
  user_id: string;
  registration_number: string;
  maker_model: string | null;
  fuel_type: string | null;
  registration_date: string | null;
  insurance_expiry: string | null;
  pucc_valid_upto: string | null;
  fitness_valid_upto: string | null;
  road_tax_valid_upto: string | null;
  vehicle_class: string | null;
}

interface ExpiringDocument {
  vehicle: Vehicle;
  documentType: "insurance" | "pucc" | "fitness" | "road_tax";
  expiryDate: string;
  daysUntilExpiry: number;
  notificationType: "30_day" | "7_day" | "expired";
}

interface AIContent {
  estimatedCost: string;
  tip: string;
  urgency: string;
  consequences: string;
}

interface UserAlert {
  userId: string;
  userEmail: string;
  documents: Array<ExpiringDocument & { aiContent: AIContent }>;
}

const DOCUMENT_LABELS: Record<string, string> = {
  insurance: "Insurance",
  pucc: "PUCC (Pollution Certificate)",
  fitness: "Fitness Certificate",
  road_tax: "Road Tax",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    console.log("Starting expiry alert check...");

    // Fetch all vehicles with their expiry dates
    const { data: vehicles, error: vehiclesError } = await supabase
      .from("vehicles")
      .select("id, user_id, registration_number, maker_model, fuel_type, registration_date, insurance_expiry, pucc_valid_upto, fitness_valid_upto, road_tax_valid_upto, vehicle_class");

    if (vehiclesError) {
      console.error("Error fetching vehicles:", vehiclesError);
      throw vehiclesError;
    }

    console.log(`Found ${vehicles?.length || 0} vehicles to check`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiringDocuments: ExpiringDocument[] = [];

    // Check each vehicle for expiring documents
    for (const vehicle of vehicles || []) {
      const documentFields = [
        { field: "insurance_expiry", type: "insurance" as const },
        { field: "pucc_valid_upto", type: "pucc" as const },
        { field: "fitness_valid_upto", type: "fitness" as const },
        { field: "road_tax_valid_upto", type: "road_tax" as const },
      ];

      for (const { field, type } of documentFields) {
        const expiryDateStr = vehicle[field as keyof Vehicle] as string | null;
        if (!expiryDateStr) continue;

        const expiryDate = new Date(expiryDateStr);
        expiryDate.setHours(0, 0, 0, 0);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let notificationType: "30_day" | "7_day" | "expired" | null = null;

        if (daysUntilExpiry <= 0) {
          notificationType = "expired";
        } else if (daysUntilExpiry <= 7) {
          notificationType = "7_day";
        } else if (daysUntilExpiry <= 30) {
          notificationType = "30_day";
        }

        if (notificationType) {
          expiringDocuments.push({
            vehicle,
            documentType: type,
            expiryDate: expiryDateStr,
            daysUntilExpiry,
            notificationType,
          });
        }
      }
    }

    console.log(`Found ${expiringDocuments.length} expiring documents`);

    if (expiringDocuments.length === 0) {
      return new Response(
        JSON.stringify({ message: "No expiring documents found", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter out already notified documents
    const { data: existingNotifications, error: notifError } = await supabase
      .from("expiry_notifications")
      .select("vehicle_id, document_type, notification_type");

    if (notifError) {
      console.error("Error fetching existing notifications:", notifError);
      throw notifError;
    }

    const notifiedSet = new Set(
      (existingNotifications || []).map(
        (n) => `${n.vehicle_id}-${n.document_type}-${n.notification_type}`
      )
    );

    const newDocuments = expiringDocuments.filter(
      (doc) => !notifiedSet.has(`${doc.vehicle.id}-${doc.documentType}-${doc.notificationType}`)
    );

    console.log(`${newDocuments.length} new documents to notify about`);

    if (newDocuments.length === 0) {
      return new Response(
        JSON.stringify({ message: "All expiring documents already notified", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group by user
    const userDocuments = new Map<string, ExpiringDocument[]>();
    for (const doc of newDocuments) {
      const userId = doc.vehicle.user_id;
      if (!userDocuments.has(userId)) {
        userDocuments.set(userId, []);
      }
      userDocuments.get(userId)!.push(doc);
    }

    console.log(`Processing alerts for ${userDocuments.size} users`);

    let emailsSent = 0;
    let notificationsLogged = 0;

    for (const [userId, docs] of userDocuments) {
      // Get user email from auth.users
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      
      if (userError || !userData?.user?.email) {
        console.error(`Could not get email for user ${userId}:`, userError);
        continue;
      }

      const userEmail = userData.user.email;
      console.log(`Processing ${docs.length} documents for user ${userEmail}`);

      // Generate AI content for each document
      const documentsWithAI: Array<ExpiringDocument & { aiContent: AIContent }> = [];

      for (const doc of docs) {
        try {
          const aiContent = await generateAIContent(doc, lovableApiKey);
          documentsWithAI.push({ ...doc, aiContent });
        } catch (aiError) {
          console.error(`AI generation failed for ${doc.documentType}:`, aiError);
          // Use fallback content
          documentsWithAI.push({
            ...doc,
            aiContent: {
              estimatedCost: "Contact your local RTO/insurer for pricing",
              tip: `Renew your ${DOCUMENT_LABELS[doc.documentType]} before it expires to avoid penalties.`,
              urgency: doc.notificationType === "expired" ? "Critical" : doc.notificationType === "7_day" ? "High" : "Medium",
              consequences: "Driving with expired documents may result in fines and legal issues.",
            },
          });
        }
      }

      // Send consolidated email
      try {
        await sendConsolidatedEmail(resend, userEmail, documentsWithAI);
        emailsSent++;
        console.log(`Email sent to ${userEmail}`);
      } catch (emailError) {
        console.error(`Failed to send email to ${userEmail}:`, emailError);
        continue;
      }

      // Log notifications to prevent duplicates
      for (const doc of documentsWithAI) {
        const { error: insertError } = await supabase
          .from("expiry_notifications")
          .insert({
            vehicle_id: doc.vehicle.id,
            user_id: userId,
            document_type: doc.documentType,
            notification_type: doc.notificationType,
            ai_content: doc.aiContent,
          });

        if (insertError) {
          console.error("Failed to log notification:", insertError);
        } else {
          notificationsLogged++;
        }
      }

      // Log to vehicle history
      for (const doc of documentsWithAI) {
        await supabase.from("vehicle_history").insert({
          vehicle_id: doc.vehicle.id,
          user_id: userId,
          event_type: "expiry_alert",
          event_description: `${doc.notificationType.replace("_", " ")} alert sent for ${DOCUMENT_LABELS[doc.documentType]}`,
          metadata: {
            document_type: doc.documentType,
            notification_type: doc.notificationType,
            days_until_expiry: doc.daysUntilExpiry,
          },
        });
      }
    }

    console.log(`Completed: ${emailsSent} emails sent, ${notificationsLogged} notifications logged`);

    return new Response(
      JSON.stringify({
        message: "Expiry alerts processed successfully",
        emailsSent,
        notificationsLogged,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in check-expiry-alerts:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function generateAIContent(doc: ExpiringDocument, apiKey: string): Promise<AIContent> {
  const vehicleAge = doc.vehicle.registration_date
    ? new Date().getFullYear() - new Date(doc.vehicle.registration_date).getFullYear()
    : null;

  const prompt = `You are an expert on Indian vehicle documentation and RTO procedures.

Generate renewal advice for this expiring document:

Vehicle: ${doc.vehicle.maker_model || doc.vehicle.registration_number}
Vehicle Class: ${doc.vehicle.vehicle_class || "Unknown"}
Fuel Type: ${doc.vehicle.fuel_type || "Unknown"}
Vehicle Age: ${vehicleAge ? `${vehicleAge} years` : "Unknown"}
Registration: ${doc.vehicle.registration_number}

Document: ${DOCUMENT_LABELS[doc.documentType]}
Expiry Date: ${doc.expiryDate}
Days Until Expiry: ${doc.daysUntilExpiry}
Status: ${doc.notificationType === "expired" ? "EXPIRED" : doc.notificationType === "7_day" ? "Expiring in 7 days or less" : "Expiring in 30 days or less"}

Provide practical, India-specific advice.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "You are a helpful assistant that provides vehicle document renewal advice for Indian vehicle owners. Always respond with valid JSON." },
        { role: "user", content: prompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "provide_renewal_advice",
            description: "Provide structured renewal advice for a vehicle document",
            parameters: {
              type: "object",
              properties: {
                estimatedCost: {
                  type: "string",
                  description: "Estimated renewal cost range in INR (e.g., '₹500 - ₹1,000')",
                },
                tip: {
                  type: "string",
                  description: "Practical tip for renewal (max 100 words)",
                },
                urgency: {
                  type: "string",
                  description: "Urgency level: Critical, High, or Medium",
                },
                consequences: {
                  type: "string",
                  description: "Consequences of not renewing (max 50 words)",
                },
              },
              required: ["estimatedCost", "tip", "urgency", "consequences"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "provide_renewal_advice" } },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI API error:", response.status, errorText);
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  
  if (!toolCall?.function?.arguments) {
    throw new Error("No tool call in AI response");
  }

  return JSON.parse(toolCall.function.arguments);
}

async function sendConsolidatedEmail(
  resend: InstanceType<typeof Resend>,
  email: string,
  documents: Array<ExpiringDocument & { aiContent: AIContent }>
): Promise<void> {
  const expiredCount = documents.filter((d) => d.notificationType === "expired").length;
  const urgentCount = documents.filter((d) => d.notificationType === "7_day").length;
  const upcomingCount = documents.filter((d) => d.notificationType === "30_day").length;

  const subject = expiredCount > 0
    ? `🚨 ${expiredCount} Document(s) Expired - Immediate Action Required`
    : urgentCount > 0
    ? `⚠️ ${urgentCount} Document(s) Expiring Soon - Action Needed`
    : `📋 ${upcomingCount} Document(s) Expiring in 30 Days`;

  const documentRows = documents
    .map((doc) => {
      const statusEmoji = doc.notificationType === "expired" ? "🔴" : doc.notificationType === "7_day" ? "🟠" : "🟡";
      const statusText = doc.notificationType === "expired"
        ? "EXPIRED"
        : doc.daysUntilExpiry === 1
        ? "Expires tomorrow"
        : `Expires in ${doc.daysUntilExpiry} days`;

      return `
        <tr>
          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 600; color: #1f2937;">${doc.vehicle.registration_number}</div>
            <div style="font-size: 14px; color: #6b7280;">${doc.vehicle.maker_model || "Vehicle"}</div>
          </td>
          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 500;">${DOCUMENT_LABELS[doc.documentType]}</div>
          </td>
          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
            <div>${statusEmoji} ${statusText}</div>
            <div style="font-size: 12px; color: #6b7280;">Expiry: ${new Date(doc.expiryDate).toLocaleDateString("en-IN")}</div>
          </td>
        </tr>
        <tr>
          <td colspan="3" style="padding: 16px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
            <div style="margin-bottom: 8px;">
              <strong>💰 Estimated Cost:</strong> ${doc.aiContent.estimatedCost}
            </div>
            <div style="margin-bottom: 8px;">
              <strong>💡 Tip:</strong> ${doc.aiContent.tip}
            </div>
            <div style="color: ${doc.aiContent.urgency === "Critical" ? "#dc2626" : doc.aiContent.urgency === "High" ? "#ea580c" : "#ca8a04"};">
              <strong>⚠️ ${doc.aiContent.urgency}:</strong> ${doc.aiContent.consequences}
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🚗 Vehicle Document Alert</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Your documents need attention</p>
      </div>
      
      <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
        <div style="display: flex; gap: 16px; margin-bottom: 24px; text-align: center;">
          ${expiredCount > 0 ? `<div style="flex: 1; background: #fef2f2; padding: 12px; border-radius: 8px;"><div style="font-size: 24px; font-weight: bold; color: #dc2626;">${expiredCount}</div><div style="font-size: 12px; color: #991b1b;">Expired</div></div>` : ""}
          ${urgentCount > 0 ? `<div style="flex: 1; background: #fff7ed; padding: 12px; border-radius: 8px;"><div style="font-size: 24px; font-weight: bold; color: #ea580c;">${urgentCount}</div><div style="font-size: 12px; color: #9a3412;">Within 7 days</div></div>` : ""}
          ${upcomingCount > 0 ? `<div style="flex: 1; background: #fefce8; padding: 12px; border-radius: 8px;"><div style="font-size: 24px; font-weight: bold; color: #ca8a04;">${upcomingCount}</div><div style="font-size: 12px; color: #854d0e;">Within 30 days</div></div>` : ""}
        </div>

        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #374151;">Vehicle</th>
              <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #374151;">Document</th>
              <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #374151;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${documentRows}
          </tbody>
        </table>

        <div style="margin-top: 24px; text-align: center;">
          <a href="https://cert-chaperone.lovable.app" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">View All Documents →</a>
        </div>
      </div>

      <div style="background: #f9fafb; padding: 16px; border-radius: 0 0 12px 12px; text-align: center; font-size: 12px; color: #6b7280; border: 1px solid #e5e7eb; border-top: none;">
        <p style="margin: 0;">This is an automated reminder from Cert Chaperone.</p>
        <p style="margin: 4px 0 0 0;">Keep your vehicle documents up to date to avoid penalties.</p>
      </div>
    </body>
    </html>
  `;

  const { error } = await resend.emails.send({
    from: "Cert Chaperone <notifications@resend.dev>",
    to: [email],
    subject,
    html,
  });

  if (error) {
    throw error;
  }
}
