import { supabase } from "@/integrations/supabase/client";

export type VehicleEventType =
  | "vehicle_added"
  | "vehicle_updated"
  | "data_refreshed"
  | "document_uploaded"
  | "document_deleted"
  | "transfer_initiated"
  | "transfer_accepted"
  | "transfer_rejected"
  | "transfer_cancelled"
  | "transfer_expired"
  | "details_updated"
  | "ai_extraction"
  | "vehicle_verified"
  | "verification_failed"
  | "service_added"
  | "service_updated"
  | "service_deleted"
  | "service_reminder"
  | "expiry_alert";

interface LogEventParams {
  vehicleId: string;
  eventType: VehicleEventType;
  description: string;
  metadata?: Record<string, unknown>;
}

export async function logVehicleEvent({
  vehicleId,
  eventType,
  description,
  metadata = {},
}: LogEventParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("Cannot log vehicle event: user not authenticated");
      return;
    }

    const { error } = await supabase.from("vehicle_history").insert({
      vehicle_id: vehicleId,
      user_id: user.id,
      event_type: eventType,
      event_description: description,
      metadata,
    } as any);

    if (error) {
      console.error("Failed to log vehicle event:", error);
    }
  } catch (error) {
    console.error("Error logging vehicle event:", error);
  }
}

export function getEventIcon(eventType: VehicleEventType): string {
  const icons: Record<VehicleEventType, string> = {
    vehicle_added: "🚗",
    vehicle_updated: "✏️",
    data_refreshed: "🔄",
    document_uploaded: "📄",
    document_deleted: "🗑️",
    transfer_initiated: "📤",
    transfer_accepted: "✅",
    transfer_rejected: "❌",
    transfer_cancelled: "🚫",
    transfer_expired: "⏰",
    details_updated: "📝",
    ai_extraction: "🤖",
    vehicle_verified: "✅",
    verification_failed: "⚠️",
    service_added: "🔧",
    service_updated: "🔧",
    service_deleted: "🗑️",
    service_reminder: "🔔",
    expiry_alert: "📬",
  };
  return icons[eventType] || "📝";
}

export function getEventColor(eventType: VehicleEventType): string {
  const colors: Record<VehicleEventType, string> = {
    vehicle_added: "text-green-600",
    vehicle_updated: "text-blue-600",
    data_refreshed: "text-blue-600",
    document_uploaded: "text-green-600",
    document_deleted: "text-red-600",
    transfer_initiated: "text-amber-600",
    transfer_accepted: "text-green-600",
    transfer_rejected: "text-red-600",
    transfer_cancelled: "text-muted-foreground",
    transfer_expired: "text-muted-foreground",
    details_updated: "text-blue-600",
    ai_extraction: "text-purple-600",
    vehicle_verified: "text-green-600",
    verification_failed: "text-amber-600",
    service_added: "text-green-600",
    service_updated: "text-blue-600",
    service_deleted: "text-red-600",
    service_reminder: "text-amber-600",
    expiry_alert: "text-amber-600",
  };
  return colors[eventType] || "text-foreground";
}
