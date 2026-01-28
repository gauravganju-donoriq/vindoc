import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { getEventIcon, getEventColor, VehicleEventType } from "@/lib/vehicleHistory";

interface HistoryEvent {
  id: string;
  event_type: VehicleEventType;
  event_description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface VehicleHistoryProps {
  vehicleId: string;
  variant?: "card" | "inline";
}

export default function VehicleHistory({ vehicleId, variant = "card" }: VehicleHistoryProps) {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [vehicleId]);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicle_history")
        .select("id, event_type, event_description, metadata, created_at")
        .eq("vehicle_id", vehicleId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setEvents((data as HistoryEvent[]) || []);
    } catch (error) {
      console.error("Error fetching vehicle history:", error);
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <History className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-medium">Activity History</h3>
        {events.length > 0 && (
          <span className="text-sm font-normal text-muted-foreground">
            ({events.length} events)
          </span>
        )}
      </div>

      {loading ? (
        <div className="animate-pulse text-muted-foreground text-sm">Loading history...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
          <History className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No activity recorded yet</p>
        </div>
      ) : (
        <ScrollArea className="h-[500px] pr-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="relative pl-10">
                  {/* Timeline dot */}
                  <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-background border-2 border-primary" />
                  
                  <div className="bg-muted/30 rounded-lg p-3 border border-border">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg" role="img" aria-label={event.event_type}>
                          {getEventIcon(event.event_type)}
                        </span>
                        <p className={`font-medium text-sm ${getEventColor(event.event_type)}`}>
                          {event.event_description}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1" title={format(new Date(event.created_at), "PPpp")}>
                      {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                    </p>
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground bg-background/50 rounded p-2 border border-border">
                        {Object.entries(event.metadata).map(([key, value]) => (
                          <div key={key} className="flex gap-2">
                            <span className="font-medium capitalize">{key.replace(/_/g, " ")}:</span>
                            <span>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      )}
    </>
  );

  if (variant === "inline") {
    return (
      <div className="bg-background border border-border rounded-lg p-6">
        {content}
      </div>
    );
  }

  return (
    <Card className="mt-6">
      <CardContent className="pt-6">
        {content}
      </CardContent>
    </Card>
  );
}
