import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, Check, X, Clock, Loader2, Car } from "lucide-react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { logVehicleEvent } from "@/lib/vehicleHistory";

interface Transfer {
  id: string;
  vehicle_id: string;
  sender_id: string;
  recipient_email: string;
  status: string;
  expires_at: string;
  created_at: string;
  vehicle: {
    registration_number: string;
    maker_model: string | null;
    manufacturer: string | null;
  } | null;
}

interface PendingTransfersProps {
  userEmail: string | undefined;
  onTransferAccepted: () => void;
}

export default function PendingTransfers({ userEmail, onTransferAccepted }: PendingTransfersProps) {
  const [incomingTransfers, setIncomingTransfers] = useState<Transfer[]>([]);
  const [outgoingTransfers, setOutgoingTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (userEmail) {
      fetchTransfers();
    }
  }, [userEmail]);

  const fetchTransfers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all transfers where user is sender or recipient
      const { data, error } = await supabase
        .from("vehicle_transfers")
        .select(`
          id,
          vehicle_id,
          sender_id,
          recipient_email,
          status,
          expires_at,
          created_at
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch vehicle details for each transfer
      const transfersWithVehicles: Transfer[] = [];
      for (const transfer of data || []) {
        const { data: vehicleData } = await supabase
          .from("vehicles")
          .select("registration_number, maker_model, manufacturer")
          .eq("id", transfer.vehicle_id)
          .maybeSingle();

        transfersWithVehicles.push({
          ...transfer,
          vehicle: vehicleData,
        });
      }

      // Separate incoming and outgoing
      const incoming = transfersWithVehicles.filter(
        (t) => t.recipient_email.toLowerCase() === userEmail?.toLowerCase() && t.sender_id !== user.id
      );
      const outgoing = transfersWithVehicles.filter((t) => t.sender_id === user.id);

      setIncomingTransfers(incoming);
      setOutgoingTransfers(outgoing);
    } catch (error: any) {
      console.error("Error fetching transfers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptTransfer = async (transfer: Transfer) => {
    setProcessingId(transfer.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if transfer is expired
      if (isPast(new Date(transfer.expires_at))) {
        // Update status to expired
        await supabase
          .from("vehicle_transfers")
          .update({ status: "expired" })
          .eq("id", transfer.id);

        toast({
          title: "Transfer expired",
          description: "This transfer request has expired.",
          variant: "destructive",
        });
        fetchTransfers();
        return;
      }

      // Update vehicle ownership
      const { error: vehicleError } = await supabase
        .from("vehicles")
        .update({ 
          user_id: user.id,
          data_last_fetched_at: null, // Reset so new owner can refresh
        })
        .eq("id", transfer.vehicle_id);

      if (vehicleError) throw vehicleError;

      // Update transfer status
      const { error: transferError } = await supabase
        .from("vehicle_transfers")
        .update({ 
          status: "accepted",
          recipient_id: user.id,
        })
        .eq("id", transfer.id);

      if (transferError) throw transferError;

      // Log history event
      await logVehicleEvent({
        vehicleId: transfer.vehicle_id,
        eventType: "transfer_accepted",
        description: `Ownership transferred from previous owner`,
        metadata: { transferId: transfer.id },
      });

      toast({
        title: "Transfer accepted!",
        description: `${transfer.vehicle?.registration_number} has been added to your account.`,
      });

      fetchTransfers();
      onTransferAccepted();
    } catch (error: any) {
      console.error("Accept transfer error:", error);
      toast({
        title: "Error accepting transfer",
        description: error.message || "Could not accept the transfer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectTransfer = async (transfer: Transfer) => {
    setProcessingId(transfer.id);
    try {
      const { error } = await supabase
        .from("vehicle_transfers")
        .update({ status: "rejected" })
        .eq("id", transfer.id);

      if (error) throw error;

      // Log history event
      await logVehicleEvent({
        vehicleId: transfer.vehicle_id,
        eventType: "transfer_rejected",
        description: `Transfer request rejected`,
        metadata: { transferId: transfer.id },
      });

      toast({
        title: "Transfer rejected",
        description: "The transfer request has been rejected.",
      });

      fetchTransfers();
    } catch (error: any) {
      console.error("Reject transfer error:", error);
      toast({
        title: "Error rejecting transfer",
        description: error.message || "Could not reject the transfer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelTransfer = async (transfer: Transfer) => {
    setProcessingId(transfer.id);
    try {
      const { error } = await supabase
        .from("vehicle_transfers")
        .update({ status: "cancelled" })
        .eq("id", transfer.id);

      if (error) throw error;

      // Log history event
      await logVehicleEvent({
        vehicleId: transfer.vehicle_id,
        eventType: "transfer_cancelled",
        description: `Transfer request cancelled`,
        metadata: { transferId: transfer.id },
      });

      toast({
        title: "Transfer cancelled",
        description: "The transfer request has been cancelled.",
      });

      fetchTransfers();
    } catch (error: any) {
      console.error("Cancel transfer error:", error);
      toast({
        title: "Error cancelling transfer",
        description: error.message || "Could not cancel the transfer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return null;
  }

  if (incomingTransfers.length === 0 && outgoingTransfers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6 mb-8">
      {/* Incoming Transfers */}
      {incomingTransfers.length > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Incoming Transfer Requests</CardTitle>
            </div>
            <CardDescription>
              Someone wants to transfer their vehicle to you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {incomingTransfers.map((transfer) => {
              const isExpired = isPast(new Date(transfer.expires_at));
              return (
                <div
                  key={transfer.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Car className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-mono font-semibold">
                        {transfer.vehicle?.registration_number || "Unknown"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {transfer.vehicle?.maker_model || transfer.vehicle?.manufacturer || "Vehicle"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {isExpired ? (
                            <span className="text-destructive">Expired</span>
                          ) : (
                            `Expires ${formatDistanceToNow(new Date(transfer.expires_at), { addSuffix: true })}`
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectTransfer(transfer)}
                      disabled={processingId === transfer.id || isExpired}
                    >
                      {processingId === transfer.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAcceptTransfer(transfer)}
                      disabled={processingId === transfer.id || isExpired}
                    >
                      {processingId === transfer.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Outgoing Transfers */}
      {outgoingTransfers.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Outgoing Transfer Requests</CardTitle>
            </div>
            <CardDescription>
              Pending transfers you've initiated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {outgoingTransfers.map((transfer) => {
              const isExpired = isPast(new Date(transfer.expires_at));
              return (
                <div
                  key={transfer.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Car className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-mono font-semibold">
                        {transfer.vehicle?.registration_number || "Unknown"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        To: {transfer.recipient_email}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={isExpired ? "destructive" : "secondary"}>
                          {isExpired ? "Expired" : "Pending"}
                        </Badge>
                        {!isExpired && (
                          <span className="text-xs text-muted-foreground">
                            Expires {formatDistanceToNow(new Date(transfer.expires_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!isExpired && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCancelTransfer(transfer)}
                      disabled={processingId === transfer.id}
                    >
                      {processingId === transfer.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Cancel"
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
