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

interface ServiceRecord {
  id: string;
  vehicle_id: string;
  user_id: string;
  service_type: string;
  service_date: string;
  next_service_due_date: string | null;
  next_service_due_km: number | null;
  odometer_reading: number | null;
  service_center: string | null;
}

interface ExpiringDocument {
  vehicle: Vehicle;
  documentType: "insurance" | "pucc" | "fitness" | "road_tax";
  expiryDate: string;
  daysUntilExpiry: number;
  notificationType: "30_day" | "7_day" | "expired";
}

interface ServiceReminder {
  vehicle: Vehicle;
  serviceRecord: ServiceRecord;
  dueDate: string;
  daysUntilDue: number;
  notificationType: "30_day" | "7_day" | "overdue";
}

interface LifespanAlert {
  vehicle: Vehicle;
  vehicleAge: number;
  maxLifespan: number;
  yearsRemaining: number;
  fuelType: string;
  alertType: "approaching" | "exceeded";
}

interface AIContent {
  estimatedCost: string;
  tip: string;
  urgency: string;
  consequences: string;
}

interface ServiceAIContent {
  reminder: string;
  tip: string;
  urgency: string;
}

interface LifespanAIContent {
  advice: string;
  options: string;
  urgency: string;
  estimatedValue: string;
}

interface UserAlert {
  userId: string;
  userEmail: string;
  documents: Array<ExpiringDocument & { aiContent: AIContent }>;
  services: Array<ServiceReminder & { aiContent: ServiceAIContent }>;
  lifespanAlerts: Array<LifespanAlert & { aiContent: LifespanAIContent }>;
}

const DOCUMENT_LABELS: Record<string, string> = {
  insurance: "Insurance",
  pucc: "PUCC (Pollution Certificate)",
  fitness: "Fitness Certificate",
  road_tax: "Road Tax",
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  regular_service: "Regular Service",
  oil_change: "Oil Change",
  tire_replacement: "Tire Replacement",
  brake_service: "Brake Service",
  battery_replacement: "Battery Replacement",
  repair: "Repair",
  body_work: "Body Work",
  electrical: "Electrical",
  ac_service: "AC Service",
  other: "Other Service",
};

// Vehicle lifespan limits based on Indian regulations (in years)
// Using stricter metro limits by default
const VEHICLE_LIFESPAN_LIMITS: Record<string, { metro: number | null; nonMetro: number | null }> = {
  DIESEL: { metro: 10, nonMetro: 15 },
  PETROL: { metro: 15, nonMetro: 20 },
  CNG: { metro: 15, nonMetro: 20 },
  LPG: { metro: 15, nonMetro: 20 },
  ELECTRIC: { metro: null, nonMetro: null }, // No limit for EVs
  HYBRID: { metro: 15, nonMetro: 20 },
};

// Check if a vehicle is approaching its end-of-life
function checkVehicleLifespan(vehicle: Vehicle): LifespanAlert | null {
  if (!vehicle.registration_date || !vehicle.fuel_type) return null;

  const fuelType = vehicle.fuel_type.toUpperCase();
  const limits = VEHICLE_LIFESPAN_LIMITS[fuelType];
  
  // If no limit defined or EV (no limit), skip
  if (!limits || !limits.metro) return null;

  const registrationDate = new Date(vehicle.registration_date);
  const registrationYear = registrationDate.getFullYear();
  const currentYear = new Date().getFullYear();
  const vehicleAge = currentYear - registrationYear;
  const maxLifespan = limits.metro; // Use stricter metro limit
  const yearsRemaining = maxLifespan - vehicleAge;

  // Alert if vehicle is within 2 years of limit or has exceeded it
  if (yearsRemaining <= 2) {
    return {
      vehicle,
      vehicleAge,
      maxLifespan,
      yearsRemaining,
      fuelType,
      alertType: yearsRemaining <= 0 ? "exceeded" : "approaching",
    };
  }
  
  return null;
}

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

    console.log("Starting expiry, service, and lifespan alert check...");

    // Fetch all vehicles with their expiry dates
    const { data: vehicles, error: vehiclesError } = await supabase
      .from("vehicles")
      .select("id, user_id, registration_number, maker_model, fuel_type, registration_date, insurance_expiry, pucc_valid_upto, fitness_valid_upto, road_tax_valid_upto, vehicle_class");

    if (vehiclesError) {
      console.error("Error fetching vehicles:", vehiclesError);
      throw vehiclesError;
    }

    // Fetch all service records with upcoming due dates
    const { data: serviceRecords, error: serviceError } = await supabase
      .from("service_records")
      .select("id, vehicle_id, user_id, service_type, service_date, next_service_due_date, next_service_due_km, odometer_reading, service_center")
      .not("next_service_due_date", "is", null);

    if (serviceError) {
      console.error("Error fetching service records:", serviceError);
      throw serviceError;
    }

    console.log(`Found ${vehicles?.length || 0} vehicles and ${serviceRecords?.length || 0} service records to check`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiringDocuments: ExpiringDocument[] = [];
    const serviceReminders: ServiceReminder[] = [];
    const lifespanAlerts: LifespanAlert[] = [];

    // Check each vehicle for expiring documents and lifespan
    for (const vehicle of vehicles || []) {
      // Check document expiries
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

      // Check vehicle lifespan
      const lifespanAlert = checkVehicleLifespan(vehicle);
      if (lifespanAlert) {
        lifespanAlerts.push(lifespanAlert);
      }
    }

    // Check each service record for upcoming due dates
    const vehicleMap = new Map((vehicles || []).map(v => [v.id, v]));
    
    for (const record of serviceRecords || []) {
      if (!record.next_service_due_date) continue;

      const vehicle = vehicleMap.get(record.vehicle_id);
      if (!vehicle) continue;

      const dueDate = new Date(record.next_service_due_date);
      dueDate.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let notificationType: "30_day" | "7_day" | "overdue" | null = null;

      if (daysUntilDue <= 0) {
        notificationType = "overdue";
      } else if (daysUntilDue <= 7) {
        notificationType = "7_day";
      } else if (daysUntilDue <= 30) {
        notificationType = "30_day";
      }

      if (notificationType) {
        serviceReminders.push({
          vehicle,
          serviceRecord: record,
          dueDate: record.next_service_due_date,
          daysUntilDue,
          notificationType,
        });
      }
    }

    console.log(`Found ${expiringDocuments.length} expiring documents, ${serviceReminders.length} service reminders, and ${lifespanAlerts.length} lifespan alerts`);

    if (expiringDocuments.length === 0 && serviceReminders.length === 0 && lifespanAlerts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No expiring documents, service reminders, or lifespan alerts found", processed: 0 }),
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

    const newServiceReminders = serviceReminders.filter(
      (reminder) => !notifiedSet.has(`${reminder.vehicle.id}-service_${reminder.serviceRecord.id}-${reminder.notificationType}`)
    );

    const newLifespanAlerts = lifespanAlerts.filter(
      (alert) => !notifiedSet.has(`${alert.vehicle.id}-lifespan-${alert.alertType}`)
    );

    console.log(`${newDocuments.length} new documents, ${newServiceReminders.length} new service reminders, and ${newLifespanAlerts.length} new lifespan alerts to notify about`);

    if (newDocuments.length === 0 && newServiceReminders.length === 0 && newLifespanAlerts.length === 0) {
      return new Response(
        JSON.stringify({ message: "All alerts already notified", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group by user
    const userAlerts = new Map<string, { documents: ExpiringDocument[], services: ServiceReminder[], lifespanAlerts: LifespanAlert[] }>();
    
    for (const doc of newDocuments) {
      const userId = doc.vehicle.user_id;
      if (!userAlerts.has(userId)) {
        userAlerts.set(userId, { documents: [], services: [], lifespanAlerts: [] });
      }
      userAlerts.get(userId)!.documents.push(doc);
    }

    for (const reminder of newServiceReminders) {
      const userId = reminder.vehicle.user_id;
      if (!userAlerts.has(userId)) {
        userAlerts.set(userId, { documents: [], services: [], lifespanAlerts: [] });
      }
      userAlerts.get(userId)!.services.push(reminder);
    }

    for (const alert of newLifespanAlerts) {
      const userId = alert.vehicle.user_id;
      if (!userAlerts.has(userId)) {
        userAlerts.set(userId, { documents: [], services: [], lifespanAlerts: [] });
      }
      userAlerts.get(userId)!.lifespanAlerts.push(alert);
    }

    console.log(`Processing alerts for ${userAlerts.size} users`);

    let emailsSent = 0;
    let notificationsLogged = 0;

    for (const [userId, alerts] of userAlerts) {
      // Get user email from auth.users
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      
      if (userError || !userData?.user?.email) {
        console.error(`Could not get email for user ${userId}:`, userError);
        continue;
      }

      const userEmail = userData.user.email;
      console.log(`Processing ${alerts.documents.length} documents, ${alerts.services.length} services, and ${alerts.lifespanAlerts.length} lifespan alerts for user ${userEmail}`);

      // Generate AI content for each document
      const documentsWithAI: Array<ExpiringDocument & { aiContent: AIContent }> = [];
      for (const doc of alerts.documents) {
        try {
          const aiContent = await generateDocumentAIContent(doc, lovableApiKey);
          documentsWithAI.push({ ...doc, aiContent });
        } catch (aiError) {
          console.error(`AI generation failed for ${doc.documentType}:`, aiError);
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

      // Generate AI content for each service reminder
      const servicesWithAI: Array<ServiceReminder & { aiContent: ServiceAIContent }> = [];
      for (const reminder of alerts.services) {
        try {
          const aiContent = await generateServiceAIContent(reminder, lovableApiKey);
          servicesWithAI.push({ ...reminder, aiContent });
        } catch (aiError) {
          console.error(`AI generation failed for service:`, aiError);
          servicesWithAI.push({
            ...reminder,
            aiContent: {
              reminder: `Your ${SERVICE_TYPE_LABELS[reminder.serviceRecord.service_type] || "service"} is ${reminder.notificationType === "overdue" ? "overdue" : "due soon"}.`,
              tip: "Regular maintenance keeps your vehicle running smoothly and prevents costly repairs.",
              urgency: reminder.notificationType === "overdue" ? "High" : reminder.notificationType === "7_day" ? "Medium" : "Low",
            },
          });
        }
      }

      // Generate AI content for each lifespan alert
      const lifespanAlertsWithAI: Array<LifespanAlert & { aiContent: LifespanAIContent }> = [];
      for (const alert of alerts.lifespanAlerts) {
        try {
          const aiContent = await generateLifespanAIContent(alert, lovableApiKey);
          lifespanAlertsWithAI.push({ ...alert, aiContent });
        } catch (aiError) {
          console.error(`AI generation failed for lifespan alert:`, aiError);
          lifespanAlertsWithAI.push({
            ...alert,
            aiContent: {
              advice: alert.alertType === "exceeded" 
                ? "Your vehicle has exceeded the permissible lifespan in metro cities. Consider options like scrapping or re-registration."
                : `Your vehicle will reach its ${alert.maxLifespan}-year limit in ${alert.yearsRemaining} year(s). Start planning now.`,
              options: "1. Scrap the vehicle through authorized centers\n2. Apply for re-registration (if eligible)\n3. Sell before end-of-life date",
              urgency: alert.alertType === "exceeded" ? "Critical" : "High",
              estimatedValue: "Scrap value typically ranges from ₹15,000 - ₹40,000 depending on vehicle condition and weight.",
            },
          });
        }
      }

      // Send consolidated email
      try {
        await sendConsolidatedEmail(resend, userEmail, documentsWithAI, servicesWithAI, lifespanAlertsWithAI);
        emailsSent++;
        console.log(`Email sent to ${userEmail}`);
      } catch (emailError) {
        console.error(`Failed to send email to ${userEmail}:`, emailError);
        continue;
      }

      // Log document notifications
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

      // Log service notifications
      for (const reminder of servicesWithAI) {
        const { error: insertError } = await supabase
          .from("expiry_notifications")
          .insert({
            vehicle_id: reminder.vehicle.id,
            user_id: userId,
            document_type: `service_${reminder.serviceRecord.id}`,
            notification_type: reminder.notificationType,
            ai_content: reminder.aiContent,
          });

        if (insertError) {
          console.error("Failed to log service notification:", insertError);
        } else {
          notificationsLogged++;
        }
      }

      // Log lifespan notifications
      for (const alert of lifespanAlertsWithAI) {
        const { error: insertError } = await supabase
          .from("expiry_notifications")
          .insert({
            vehicle_id: alert.vehicle.id,
            user_id: userId,
            document_type: "lifespan",
            notification_type: alert.alertType,
            ai_content: alert.aiContent,
          });

        if (insertError) {
          console.error("Failed to log lifespan notification:", insertError);
        } else {
          notificationsLogged++;
        }
      }

      // Log to vehicle history for documents
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

      // Log to vehicle history for services
      for (const reminder of servicesWithAI) {
        await supabase.from("vehicle_history").insert({
          vehicle_id: reminder.vehicle.id,
          user_id: userId,
          event_type: "service_reminder",
          event_description: `Service reminder sent: ${SERVICE_TYPE_LABELS[reminder.serviceRecord.service_type] || "Service"} ${reminder.notificationType === "overdue" ? "overdue" : `due in ${reminder.daysUntilDue} days`}`,
          metadata: {
            service_type: reminder.serviceRecord.service_type,
            notification_type: reminder.notificationType,
            days_until_due: reminder.daysUntilDue,
            service_record_id: reminder.serviceRecord.id,
          },
        });
      }

      // Log to vehicle history for lifespan alerts
      for (const alert of lifespanAlertsWithAI) {
        await supabase.from("vehicle_history").insert({
          vehicle_id: alert.vehicle.id,
          user_id: userId,
          event_type: "lifespan_alert",
          event_description: `Vehicle lifespan alert: ${alert.fuelType} vehicle is ${alert.vehicleAge} years old (${alert.alertType === "exceeded" ? "exceeded" : "approaching"} ${alert.maxLifespan}-year limit)`,
          metadata: {
            fuel_type: alert.fuelType,
            vehicle_age: alert.vehicleAge,
            max_lifespan: alert.maxLifespan,
            years_remaining: alert.yearsRemaining,
            alert_type: alert.alertType,
          },
        });
      }
    }

    console.log(`Completed: ${emailsSent} emails sent, ${notificationsLogged} notifications logged`);

    return new Response(
      JSON.stringify({
        message: "Expiry, service, and lifespan alerts processed successfully",
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

async function generateDocumentAIContent(doc: ExpiringDocument, apiKey: string): Promise<AIContent> {
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

${vehicleAge && vehicleAge >= 10 ? `Note: This is an older vehicle (${vehicleAge} years). Consider mentioning:
- Higher insurance premiums for older vehicles
- For diesel vehicles in metros: 10-year limit may apply
- For petrol vehicles in metros: 15-year limit may apply
- Importance of keeping fitness certificate updated for older vehicles` : ""}

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
                  description: "Estimated renewal cost range in INR (e.g., '₹500 - ₹1,000'). For older vehicles, mention if premiums may be higher.",
                },
                tip: {
                  type: "string",
                  description: "Practical tip for renewal (max 100 words). Include specific advice for older vehicles if applicable.",
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

async function generateServiceAIContent(reminder: ServiceReminder, apiKey: string): Promise<ServiceAIContent> {
  const serviceType = SERVICE_TYPE_LABELS[reminder.serviceRecord.service_type] || reminder.serviceRecord.service_type;
  
  const prompt = `You are an expert on vehicle maintenance in India.

Generate a service reminder for:

Vehicle: ${reminder.vehicle.maker_model || reminder.vehicle.registration_number}
Fuel Type: ${reminder.vehicle.fuel_type || "Unknown"}
Registration: ${reminder.vehicle.registration_number}

Service Type: ${serviceType}
Last Service Date: ${reminder.serviceRecord.service_date}
Last Odometer: ${reminder.serviceRecord.odometer_reading ? `${reminder.serviceRecord.odometer_reading.toLocaleString()} km` : "Unknown"}
Service Center: ${reminder.serviceRecord.service_center || "Not specified"}
Due Date: ${reminder.dueDate}
Days Until Due: ${reminder.daysUntilDue}
Status: ${reminder.notificationType === "overdue" ? "OVERDUE" : reminder.notificationType === "7_day" ? "Due within 7 days" : "Due within 30 days"}

Provide a helpful, India-specific maintenance reminder.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "You are a helpful assistant that provides vehicle maintenance advice for Indian vehicle owners. Always respond with valid JSON." },
        { role: "user", content: prompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "provide_service_reminder",
            description: "Provide structured service reminder for a vehicle",
            parameters: {
              type: "object",
              properties: {
                reminder: {
                  type: "string",
                  description: "A friendly reminder message about the upcoming service (max 50 words)",
                },
                tip: {
                  type: "string",
                  description: "Practical maintenance tip relevant to this service type (max 80 words)",
                },
                urgency: {
                  type: "string",
                  description: "Urgency level: High, Medium, or Low",
                },
              },
              required: ["reminder", "tip", "urgency"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "provide_service_reminder" } },
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

async function generateLifespanAIContent(alert: LifespanAlert, apiKey: string): Promise<LifespanAIContent> {
  const prompt = `You are an expert on Indian vehicle regulations and the vehicle scrappage policy.

Generate advice for a vehicle approaching its end-of-life:

Vehicle: ${alert.vehicle.maker_model || alert.vehicle.registration_number}
Registration: ${alert.vehicle.registration_number}
Vehicle Class: ${alert.vehicle.vehicle_class || "Personal"}
Fuel Type: ${alert.fuelType}
Vehicle Age: ${alert.vehicleAge} years
Maximum Lifespan (Metro): ${alert.maxLifespan} years
Years Remaining: ${alert.yearsRemaining}
Status: ${alert.alertType === "exceeded" ? "EXCEEDED the permissible lifespan" : `Approaching end-of-life (${alert.yearsRemaining} years remaining)`}

Context:
- In India, diesel vehicles in metro cities have a 10-year lifespan (15 years in non-metros)
- Petrol/CNG vehicles in metros have a 15-year lifespan (20 years in non-metros)
- The Vehicle Scrappage Policy offers incentives for scrapping old vehicles
- Vehicles can sometimes be re-registered in non-metro areas

Provide practical advice for the owner.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "You are a helpful assistant that provides advice on vehicle lifespan and scrappage policies in India. Always respond with valid JSON." },
        { role: "user", content: prompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "provide_lifespan_advice",
            description: "Provide structured advice for a vehicle approaching end-of-life",
            parameters: {
              type: "object",
              properties: {
                advice: {
                  type: "string",
                  description: "Main advice for the vehicle owner based on the lifespan status (max 80 words)",
                },
                options: {
                  type: "string",
                  description: "List of options available to the owner (scrap, re-register, sell, etc.) with brief explanation (max 100 words)",
                },
                urgency: {
                  type: "string",
                  description: "Urgency level: Critical (exceeded), High (1 year or less), or Medium (2 years)",
                },
                estimatedValue: {
                  type: "string",
                  description: "Estimated scrap value or resale value range in INR",
                },
              },
              required: ["advice", "options", "urgency", "estimatedValue"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "provide_lifespan_advice" } },
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
  documents: Array<ExpiringDocument & { aiContent: AIContent }>,
  services: Array<ServiceReminder & { aiContent: ServiceAIContent }>,
  lifespanAlerts: Array<LifespanAlert & { aiContent: LifespanAIContent }>
): Promise<void> {
  const expiredCount = documents.filter((d) => d.notificationType === "expired").length;
  const urgentDocCount = documents.filter((d) => d.notificationType === "7_day").length;
  const upcomingDocCount = documents.filter((d) => d.notificationType === "30_day").length;
  
  const overdueServiceCount = services.filter((s) => s.notificationType === "overdue").length;
  const urgentServiceCount = services.filter((s) => s.notificationType === "7_day").length;
  const upcomingServiceCount = services.filter((s) => s.notificationType === "30_day").length;

  const exceededLifespanCount = lifespanAlerts.filter((l) => l.alertType === "exceeded").length;
  const approachingLifespanCount = lifespanAlerts.filter((l) => l.alertType === "approaching").length;

  const hasDocuments = documents.length > 0;
  const hasServices = services.length > 0;
  const hasLifespanAlerts = lifespanAlerts.length > 0;

  let subject: string;
  if (exceededLifespanCount > 0 || expiredCount > 0 || overdueServiceCount > 0) {
    const parts = [];
    if (exceededLifespanCount > 0) parts.push(`${exceededLifespanCount} Vehicle(s) Past Lifespan`);
    if (expiredCount > 0) parts.push(`${expiredCount} Expired Document(s)`);
    if (overdueServiceCount > 0) parts.push(`${overdueServiceCount} Overdue Service(s)`);
    subject = `🚨 Action Required: ${parts.join(" & ")}`;
  } else if (urgentDocCount > 0 || urgentServiceCount > 0 || approachingLifespanCount > 0) {
    subject = `⚠️ Reminder: ${urgentDocCount + urgentServiceCount + approachingLifespanCount} Item(s) Need Attention`;
  } else {
    subject = `📋 Upcoming: ${upcomingDocCount + upcomingServiceCount} Item(s) Due Soon`;
  }

  // Document rows
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

  // Service rows
  const serviceRows = services
    .map((reminder) => {
      const statusEmoji = reminder.notificationType === "overdue" ? "🔴" : reminder.notificationType === "7_day" ? "🟠" : "🟡";
      const statusText = reminder.notificationType === "overdue"
        ? "OVERDUE"
        : reminder.daysUntilDue === 1
        ? "Due tomorrow"
        : `Due in ${reminder.daysUntilDue} days`;

      return `
        <tr>
          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 600; color: #1f2937;">${reminder.vehicle.registration_number}</div>
            <div style="font-size: 14px; color: #6b7280;">${reminder.vehicle.maker_model || "Vehicle"}</div>
          </td>
          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 500;">🔧 ${SERVICE_TYPE_LABELS[reminder.serviceRecord.service_type] || "Service"}</div>
            ${reminder.serviceRecord.service_center ? `<div style="font-size: 12px; color: #6b7280;">at ${reminder.serviceRecord.service_center}</div>` : ""}
          </td>
          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
            <div>${statusEmoji} ${statusText}</div>
            <div style="font-size: 12px; color: #6b7280;">Due: ${new Date(reminder.dueDate).toLocaleDateString("en-IN")}</div>
          </td>
        </tr>
        <tr>
          <td colspan="3" style="padding: 16px; background-color: #fef3c7; border-bottom: 1px solid #e5e7eb;">
            <div style="margin-bottom: 8px;">
              <strong>🔔 ${reminder.aiContent.reminder}</strong>
            </div>
            <div style="color: #92400e;">
              <strong>💡 Tip:</strong> ${reminder.aiContent.tip}
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  // Lifespan alert rows
  const lifespanRows = lifespanAlerts
    .map((alert) => {
      const statusEmoji = alert.alertType === "exceeded" ? "🔴" : "🟠";
      const statusText = alert.alertType === "exceeded"
        ? `EXCEEDED (${alert.vehicleAge} years old)`
        : `${alert.yearsRemaining} year(s) remaining`;

      return `
        <tr>
          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 600; color: #1f2937;">${alert.vehicle.registration_number}</div>
            <div style="font-size: 14px; color: #6b7280;">${alert.vehicle.maker_model || "Vehicle"}</div>
          </td>
          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 500;">${alert.fuelType} Vehicle</div>
            <div style="font-size: 12px; color: #6b7280;">Metro limit: ${alert.maxLifespan} years</div>
          </td>
          <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
            <div>${statusEmoji} ${statusText}</div>
            <div style="font-size: 12px; color: #6b7280;">Age: ${alert.vehicleAge} years</div>
          </td>
        </tr>
        <tr>
          <td colspan="3" style="padding: 16px; background-color: ${alert.alertType === "exceeded" ? "#fef2f2" : "#fff7ed"}; border-bottom: 1px solid #e5e7eb;">
            <div style="margin-bottom: 8px;">
              <strong>📢 ${alert.aiContent.advice}</strong>
            </div>
            <div style="margin-bottom: 8px;">
              <strong>📋 Options:</strong><br/>
              <span style="white-space: pre-line;">${alert.aiContent.options}</span>
            </div>
            <div style="color: #047857;">
              <strong>💰 ${alert.aiContent.estimatedValue}</strong>
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
        <h1 style="color: white; margin: 0; font-size: 24px;">🚗 Vehicle Reminder</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Documents, Services & Lifespan Updates</p>
      </div>
      
      <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
        <div style="display: flex; gap: 16px; margin-bottom: 24px; text-align: center;">
          ${exceededLifespanCount > 0 ? `<div style="flex: 1; background: #fef2f2; padding: 12px; border-radius: 8px;"><div style="font-size: 24px; font-weight: bold; color: #dc2626;">${exceededLifespanCount}</div><div style="font-size: 12px; color: #991b1b;">Past Lifespan</div></div>` : ""}
          ${expiredCount > 0 ? `<div style="flex: 1; background: #fef2f2; padding: 12px; border-radius: 8px;"><div style="font-size: 24px; font-weight: bold; color: #dc2626;">${expiredCount}</div><div style="font-size: 12px; color: #991b1b;">Expired</div></div>` : ""}
          ${overdueServiceCount > 0 ? `<div style="flex: 1; background: #fef2f2; padding: 12px; border-radius: 8px;"><div style="font-size: 24px; font-weight: bold; color: #dc2626;">${overdueServiceCount}</div><div style="font-size: 12px; color: #991b1b;">Overdue</div></div>` : ""}
          ${urgentDocCount + urgentServiceCount + approachingLifespanCount > 0 ? `<div style="flex: 1; background: #fff7ed; padding: 12px; border-radius: 8px;"><div style="font-size: 24px; font-weight: bold; color: #ea580c;">${urgentDocCount + urgentServiceCount + approachingLifespanCount}</div><div style="font-size: 12px; color: #9a3412;">Urgent</div></div>` : ""}
          ${upcomingDocCount + upcomingServiceCount > 0 ? `<div style="flex: 1; background: #fefce8; padding: 12px; border-radius: 8px;"><div style="font-size: 24px; font-weight: bold; color: #ca8a04;">${upcomingDocCount + upcomingServiceCount}</div><div style="font-size: 12px; color: #854d0e;">This Month</div></div>` : ""}
        </div>

        ${hasLifespanAlerts ? `
        <h2 style="font-size: 18px; color: #1f2937; margin: 24px 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #dc2626;">⏰ Vehicle Lifespan Alerts</h2>
        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
          <thead>
            <tr style="background: #fef2f2;">
              <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #991b1b;">Vehicle</th>
              <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #991b1b;">Type</th>
              <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #991b1b;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${lifespanRows}
          </tbody>
        </table>
        ` : ""}

        ${hasDocuments ? `
        <h2 style="font-size: 18px; color: #1f2937; margin: 24px 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">📄 Document Renewals</h2>
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
        ` : ""}

        ${hasServices ? `
        <h2 style="font-size: 18px; color: #1f2937; margin: 24px 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">🔧 Service Reminders</h2>
        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
          <thead>
            <tr style="background: #fef3c7;">
              <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #92400e;">Vehicle</th>
              <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #92400e;">Service</th>
              <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #92400e;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${serviceRows}
          </tbody>
        </table>
        ` : ""}

        <div style="margin-top: 24px; text-align: center;">
          <a href="https://cert-chaperone.lovable.app" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">View All Vehicles →</a>
        </div>
      </div>

      <div style="background: #f9fafb; padding: 16px; border-radius: 0 0 12px 12px; text-align: center; font-size: 12px; color: #6b7280; border: 1px solid #e5e7eb; border-top: none;">
        <p style="margin: 0;">This is an automated reminder from Cert Chaperone.</p>
        <p style="margin: 4px 0 0 0;">Keep your vehicle documents and maintenance up to date.</p>
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
