import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { getEventIcon, getEventColor, type VehicleEventType } from "@/lib/vehicleHistory";

interface ActivityItem {
  id: string;
  event_type: string;
  event_description: string;
  created_at: string;
  user_id: string;
  vehicle_id: string;
  userEmail: string;
  registrationNumber: string;
}

export function AdminActivity() {
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "admin-data?type=activity",
          { method: "GET" }
        );

        if (fnError) throw fnError;
        setActivity(data?.activity || []);
      } catch (err: any) {
        console.error("Failed to fetch activity:", err);
        setError(err.message || "Failed to load activity");
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity ({activity.length} events)</CardTitle>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No activity found</p>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {activity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                >
                  <span className="text-2xl">
                    {getEventIcon(item.event_type as VehicleEventType)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium ${getEventColor(item.event_type as VehicleEventType)}`}>
                        {item.event_type.replace(/_/g, " ")}
                      </span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {item.registrationNumber}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.event_description}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{item.userEmail}</span>
                      <span>•</span>
                      <span>{format(new Date(item.created_at), "dd MMM yyyy 'at' h:mm a")}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
