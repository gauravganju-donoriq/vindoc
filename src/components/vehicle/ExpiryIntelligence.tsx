import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp,
  Lightbulb,
  Calendar,
  Fuel,
  Car
} from "lucide-react";
import { differenceInDays, isPast, format } from "date-fns";

interface Vehicle {
  id: string;
  registration_number: string;
  fuel_type: string | null;
  registration_date: string | null;
  insurance_expiry: string | null;
  pucc_valid_upto: string | null;
  fitness_valid_upto: string | null;
  road_tax_valid_upto: string | null;
  maker_model: string | null;
}

interface AIContent {
  estimatedCost?: string;
  tip?: string;
  urgency?: string;
  consequences?: string;
  advice?: string;
  options?: string;
  estimatedValue?: string;
}

interface ExpiryNotification {
  id: string;
  vehicle_id: string;
  document_type: string;
  notification_type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ai_content: AIContent | null;
  sent_at: string;
}

interface ExpiryIntelligenceProps {
  vehicle: Vehicle;
}

// Vehicle lifespan limits (using metro limits as default)
const VEHICLE_LIFESPAN_LIMITS: Record<string, number> = {
  DIESEL: 10,
  PETROL: 15,
  CNG: 15,
  LPG: 15,
  HYBRID: 15,
};

const DOCUMENT_LABELS: Record<string, string> = {
  insurance: "Insurance",
  pucc: "PUCC Certificate",
  fitness: "Fitness Certificate",
  road_tax: "Road Tax",
};

interface ExpiryItem {
  type: string;
  label: string;
  date: string | null;
  daysUntilExpiry: number;
  status: "expired" | "expiring" | "valid" | "unknown";
  aiContent?: AIContent | null;
}

const ExpiryIntelligence = ({ vehicle }: ExpiryIntelligenceProps) => {
  const [notifications, setNotifications] = useState<ExpiryNotification[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [vehicle.id]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("expiry_notifications")
        .select("*")
        .eq("vehicle_id", vehicle.id)
        .order("sent_at", { ascending: false });

      if (error) throw error;
      // Cast the data to our expected type
      setNotifications((data || []) as unknown as ExpiryNotification[]);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate vehicle age and lifespan status
  const getLifespanStatus = () => {
    if (!vehicle.registration_date || !vehicle.fuel_type) return null;

    const fuelType = vehicle.fuel_type.toUpperCase();
    const maxLifespan = VEHICLE_LIFESPAN_LIMITS[fuelType];
    
    if (!maxLifespan) return null; // Electric or unknown

    const registrationYear = new Date(vehicle.registration_date).getFullYear();
    const currentYear = new Date().getFullYear();
    const vehicleAge = currentYear - registrationYear;
    const yearsRemaining = maxLifespan - vehicleAge;
    const lifespanPercentage = Math.min(100, (vehicleAge / maxLifespan) * 100);

    return {
      vehicleAge,
      maxLifespan,
      yearsRemaining,
      lifespanPercentage,
      fuelType,
      status: yearsRemaining <= 0 ? "exceeded" : yearsRemaining <= 2 ? "approaching" : "safe",
    };
  };

  // Calculate expiry items
  const getExpiryItems = (): ExpiryItem[] => {
    const today = new Date();
    const items: ExpiryItem[] = [];

    const documentFields = [
      { field: "insurance_expiry", type: "insurance" },
      { field: "pucc_valid_upto", type: "pucc" },
      { field: "fitness_valid_upto", type: "fitness" },
      { field: "road_tax_valid_upto", type: "road_tax" },
    ];

    for (const { field, type } of documentFields) {
      const dateValue = vehicle[field as keyof Vehicle] as string | null;
      let daysUntilExpiry = 0;
      let status: "expired" | "expiring" | "valid" | "unknown" = "unknown";

      if (dateValue) {
        const expiryDate = new Date(dateValue);
        daysUntilExpiry = differenceInDays(expiryDate, today);

        if (isPast(expiryDate)) {
          status = "expired";
        } else if (daysUntilExpiry <= 30) {
          status = "expiring";
        } else {
          status = "valid";
        }
      }

      // Find AI content for this document type
      const notification = notifications.find(n => n.document_type === type);

      items.push({
        type,
        label: DOCUMENT_LABELS[type],
        date: dateValue,
        daysUntilExpiry,
        status,
        aiContent: notification?.ai_content,
      });
    }

    return items.sort((a, b) => {
      // Sort by status priority, then by days until expiry
      const statusOrder = { expired: 0, expiring: 1, valid: 2, unknown: 3 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return a.daysUntilExpiry - b.daysUntilExpiry;
    });
  };

  const expiryItems = getExpiryItems();
  const lifespanStatus = getLifespanStatus();
  const urgentItems = expiryItems.filter(item => item.status === "expired" || item.status === "expiring");
  const mostUrgent = expiryItems[0];

  // Get lifespan AI content if available
  const lifespanNotification = notifications.find(n => n.document_type === "lifespan");

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="py-4">
          <div className="animate-pulse flex items-center gap-2">
            <div className="h-5 w-5 bg-muted rounded" />
            <div className="h-4 w-48 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Expiry Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Section */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {expiryItems.map((item) => (
            <div
              key={item.type}
              className={`p-3 rounded-lg border ${
                item.status === "expired"
                  ? "bg-destructive/10 border-destructive/30"
                  : item.status === "expiring"
                  ? "bg-secondary/50 border-secondary"
                  : item.status === "valid"
                  ? "bg-accent/30 border-accent"
                  : "bg-muted border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{item.label}</span>
                {item.status === "expired" && (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                )}
                {item.status === "expiring" && (
                  <Clock className="h-4 w-4 text-secondary-foreground" />
                )}
                {item.status === "valid" && (
                  <CheckCircle className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {item.date ? (
                  <>
                    {item.status === "expired" ? (
                      <span className="text-destructive font-medium">
                        Expired {Math.abs(item.daysUntilExpiry)} days ago
                      </span>
                    ) : item.status === "expiring" ? (
                      <span className="text-secondary-foreground font-medium">
                        {item.daysUntilExpiry === 0
                          ? "Expires today"
                          : item.daysUntilExpiry === 1
                          ? "Expires tomorrow"
                          : `${item.daysUntilExpiry} days left`}
                      </span>
                    ) : (
                      <span className="text-primary">
                        Valid until {format(new Date(item.date), "dd MMM yyyy")}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="italic">Not set</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Vehicle Lifespan Section */}
        {lifespanStatus && (
          <div
            className={`p-4 rounded-lg border ${
              lifespanStatus.status === "exceeded"
                ? "bg-destructive/10 border-destructive/30"
                : lifespanStatus.status === "approaching"
                ? "bg-secondary/50 border-secondary"
                : "bg-muted/50 border-border"
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Vehicle Lifespan</span>
                <Badge
                  variant={
                    lifespanStatus.status === "exceeded"
                      ? "destructive"
                      : lifespanStatus.status === "approaching"
                      ? "secondary"
                      : "outline"
                  }
                >
                  {lifespanStatus.fuelType}
                </Badge>
              </div>
              <span className="text-sm text-muted-foreground">
                {lifespanStatus.vehicleAge} / {lifespanStatus.maxLifespan} years
              </span>
            </div>
            <Progress
              value={lifespanStatus.lifespanPercentage}
              className={`h-2 ${
                lifespanStatus.status === "exceeded"
                  ? "[&>div]:bg-destructive"
                  : lifespanStatus.status === "approaching"
                  ? "[&>div]:bg-secondary-foreground"
                  : "[&>div]:bg-primary"
              }`}
            />
            <p className="text-sm text-muted-foreground mt-2">
              {lifespanStatus.status === "exceeded" ? (
                <span className="text-destructive font-medium">
                  ⚠️ This {lifespanStatus.fuelType.toLowerCase()} vehicle has exceeded the {lifespanStatus.maxLifespan}-year metro limit
                </span>
              ) : lifespanStatus.status === "approaching" ? (
                <span className="text-secondary-foreground font-medium">
                  ⏰ {lifespanStatus.yearsRemaining} year{lifespanStatus.yearsRemaining !== 1 ? "s" : ""} remaining until {lifespanStatus.maxLifespan}-year metro limit
                </span>
              ) : (
                <span className="text-primary">
                  ✓ {lifespanStatus.yearsRemaining} years remaining until metro limit
                </span>
              )}
            </p>

            {/* Lifespan AI Content */}
            {lifespanNotification?.ai_content && (
              <div className="mt-3 p-3 bg-background rounded border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">AI Insights</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {lifespanNotification.ai_content.advice}
                </p>
                {lifespanNotification.ai_content.estimatedValue && (
                  <p className="text-sm mt-2">
                    <strong>💰</strong> {lifespanNotification.ai_content.estimatedValue}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* AI Tips Section - Collapsible */}
        {urgentItems.length > 0 && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-3 h-auto bg-primary/5 hover:bg-primary/10 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    AI Renewal Tips ({urgentItems.length} item{urgentItems.length !== 1 ? "s" : ""} need attention)
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {urgentItems.map((item) => (
                <Alert
                  key={item.type}
                  variant={item.status === "expired" ? "destructive" : "default"}
                  className="border-border"
                >
                  <Calendar className="h-4 w-4" />
                  <AlertTitle className="text-sm font-medium">
                    {item.label}{" "}
                    {item.status === "expired" ? "(Expired)" : `(${item.daysUntilExpiry} days left)`}
                  </AlertTitle>
                  <AlertDescription className="text-sm mt-1">
                    {item.aiContent ? (
                      <div className="space-y-2">
                        {item.aiContent.tip && (
                          <p>💡 {item.aiContent.tip}</p>
                        )}
                        {item.aiContent.estimatedCost && (
                          <p className="text-xs">
                            <strong>Estimated Cost:</strong> {item.aiContent.estimatedCost}
                          </p>
                        )}
                        {item.aiContent.consequences && (
                          <p className="text-xs text-muted-foreground">
                            ⚠️ {item.aiContent.consequences}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p>
                        {item.status === "expired"
                          ? `Your ${item.label.toLowerCase()} has expired. Renew it immediately to avoid penalties.`
                          : `Your ${item.label.toLowerCase()} expires on ${format(new Date(item.date!), "dd MMM yyyy")}. Plan your renewal soon.`}
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* No urgent items message */}
        {urgentItems.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-sm">All documents are up to date!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpiryIntelligence;
