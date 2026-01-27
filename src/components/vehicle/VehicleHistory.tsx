import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, ChevronDown, ChevronUp } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { getEventIcon, getEventColor, VehicleEventType } from "@/lib/vehicleHistory";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface HistoryEvent {
  id: string;
  event_type: VehicleEventType;
  event_description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface VehicleHistoryProps {
  vehicleId: string;
}

export default function VehicleHistory({ vehicleId }: VehicleHistoryProps) {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

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

  if (loading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Activity History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse text-muted-foreground text-sm">Loading history...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Activity History
                {events.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    ({events.length} events)
                  </span>
                )}
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No activity recorded yet</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                  
                  <div className="space-y-4">
                    {events.map((event, index) => (
                      <div key={event.id} className="relative pl-10">
                        {/* Timeline dot */}
                        <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-background border-2 border-primary" />
                        
                        <div className="bg-muted/30 rounded-lg p-3">
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
                            <div className="mt-2 text-xs text-muted-foreground bg-background/50 rounded p-2">
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
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
