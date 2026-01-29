import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Wrench, Phone, MapPin, Clock, X, CheckCircle2, 
  AlertTriangle, User, Car 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AssistanceRequest {
  id: string;
  vehicle_id: string;
  request_type: string;
  urgency: string;
  status: string;
  location_text: string;
  assigned_to: string | null;
  assigned_phone: string | null;
  assigned_at: string | null;
  created_at: string;
  vehicle?: {
    registration_number: string;
    maker_model: string | null;
  };
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
  breakdown: "Breakdown",
  flat_tire: "Flat Tire",
  battery: "Battery Issue",
  fuel: "Out of Fuel",
  accident: "Accident",
  towing: "Towing",
  lockout: "Locked Out",
  other: "Other",
};

const URGENCY_STYLES: Record<string, { badge: string; text: string }> = {
  low: { badge: "bg-gray-100 text-gray-700", text: "text-gray-600" },
  medium: { badge: "bg-blue-100 text-blue-700", text: "text-blue-600" },
  high: { badge: "bg-amber-100 text-amber-700", text: "text-amber-600" },
  emergency: { badge: "bg-red-100 text-red-700", text: "text-red-600" },
};

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  pending: { 
    icon: <Clock className="h-4 w-4" />, 
    label: "Pending", 
    color: "bg-amber-100 text-amber-700 border-amber-200" 
  },
  assigned: { 
    icon: <User className="h-4 w-4" />, 
    label: "Assigned", 
    color: "bg-blue-100 text-blue-700 border-blue-200" 
  },
  in_progress: { 
    icon: <Wrench className="h-4 w-4" />, 
    label: "In Progress", 
    color: "bg-purple-100 text-purple-700 border-purple-200" 
  },
};

interface ActiveAssistanceCardProps {
  vehicleIds: string[];
}

export default function ActiveAssistanceCard({ vehicleIds }: ActiveAssistanceCardProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<AssistanceRequest[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [requestToCancel, setRequestToCancel] = useState<AssistanceRequest | null>(null);

  useEffect(() => {
    if (vehicleIds.length > 0) {
      fetchActiveRequests();
    } else {
      setLoading(false);
    }
  }, [vehicleIds]);

  const fetchActiveRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("assistance_requests")
        .select(`
          id,
          vehicle_id,
          request_type,
          urgency,
          status,
          location_text,
          assigned_to,
          assigned_phone,
          assigned_at,
          created_at
        `)
        .in("vehicle_id", vehicleIds)
        .in("status", ["pending", "assigned", "in_progress"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch vehicle details separately
      if (data && data.length > 0) {
        const vehicleIdList = [...new Set(data.map(r => r.vehicle_id))];
        const { data: vehicleData } = await supabase
          .from("vehicles")
          .select("id, registration_number, maker_model")
          .in("id", vehicleIdList);

        const vehicleMap = new Map(vehicleData?.map(v => [v.id, v]) || []);
        
        const enrichedRequests = data.map(r => ({
          ...r,
          vehicle: vehicleMap.get(r.vehicle_id) || undefined,
        }));

        setRequests(enrichedRequests);
      } else {
        setRequests([]);
      }
    } catch (error: any) {
      console.error("Error fetching assistance requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!requestToCancel) return;

    setCancellingId(requestToCancel.id);
    try {
      const { error } = await supabase
        .from("assistance_requests")
        .update({ status: "cancelled" })
        .eq("id", requestToCancel.id);

      if (error) throw error;

      toast({
        title: "Request cancelled",
        description: "Your assistance request has been cancelled.",
      });

      setRequests(prev => prev.filter(r => r.id !== requestToCancel.id));
    } catch (error: any) {
      toast({
        title: "Failed to cancel",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCancellingId(null);
      setShowCancelDialog(false);
      setRequestToCancel(null);
    }
  };

  if (loading) {
    return (
      <Card className="border-amber-200 bg-amber-50/30">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2 text-amber-800">
            <Wrench className="h-5 w-5" />
            Active Assistance {requests.length > 1 ? `(${requests.length})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {requests.map((request) => {
            const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
            const urgencyStyle = URGENCY_STYLES[request.urgency] || URGENCY_STYLES.medium;

            return (
              <div
                key={request.id}
                className="p-4 bg-white rounded-lg border border-amber-100 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Vehicle & Status */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                        <Car className="h-4 w-4 text-gray-500" />
                        <span className="font-mono">
                          {request.vehicle?.registration_number || "Unknown"}
                        </span>
                      </div>
                      <Badge className={statusConfig.color}>
                        {statusConfig.icon}
                        <span className="ml-1">{statusConfig.label}</span>
                      </Badge>
                    </div>

                    {/* Type & Urgency */}
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <span className="font-medium">
                        {REQUEST_TYPE_LABELS[request.request_type] || request.request_type}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className={`font-medium capitalize ${urgencyStyle.text}`}>
                        {request.urgency} urgency
                      </span>
                    </div>

                    {/* Location */}
                    <div className="flex items-start gap-1.5 text-sm text-gray-600 mb-2">
                      <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{request.location_text}</span>
                    </div>

                    {/* Assigned Helper */}
                    {request.assigned_to && (
                      <div className="flex items-center gap-2 mt-3 p-2 bg-green-50 rounded-md border border-green-100">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <div className="text-sm">
                          <span className="font-medium text-green-800">
                            {request.assigned_to}
                          </span>
                          {request.assigned_phone && (
                            <a 
                              href={`tel:${request.assigned_phone}`}
                              className="ml-2 text-green-600 hover:underline inline-flex items-center gap-1"
                            >
                              <Phone className="h-3 w-3" />
                              {request.assigned_phone}
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Time */}
                    <p className="text-xs text-gray-400 mt-2">
                      Requested {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Cancel Button (only for pending) */}
                  {request.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                      onClick={() => {
                        setRequestToCancel(request);
                        setShowCancelDialog(true);
                      }}
                      disabled={cancellingId === request.id}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Cancel Assistance Request?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this assistance request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Request</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelRequest}
              className="bg-red-600 hover:bg-red-700"
            >
              Cancel Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
