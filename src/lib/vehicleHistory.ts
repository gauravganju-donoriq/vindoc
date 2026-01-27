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
  | "transfer_expired";

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
  };
  return colors[eventType] || "text-foreground";
}
