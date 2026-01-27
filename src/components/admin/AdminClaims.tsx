import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, CheckCircle, XCircle, Clock, Mail, Phone } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
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

interface Claim {
  id: string;
  registration_number: string;
  vehicle_id: string;
  claimant_id: string;
  claimant_email: string;
  claimant_phone: string | null;
  current_owner_id: string;
  message: string | null;
  status: string;
  created_at: string;
  expires_at: string;
  claimantEmail: string;
  ownerEmail: string;
  makerModel: string | null;
}

export const AdminClaims = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [actionType, setActionType] = useState<"resolve" | "reject" | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const fetchClaims = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-data", {
        body: { type: "claims" },
      });

      if (error) throw error;
      setClaims(data?.claims || []);
    } catch (error: any) {
      console.error("Error fetching claims:", error);
      toast({
        title: "Error",
        description: "Failed to load ownership claims",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const handleUpdateStatus = async (claimId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase.functions.invoke("admin-data", {
        body: { type: "update_claim_status", claimId, status: newStatus },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Claim marked as ${newStatus}`,
      });

      fetchClaims();
    } catch (error: any) {
      console.error("Error updating claim:", error);
      toast({
        title: "Error",
        description: "Failed to update claim status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
      setSelectedClaim(null);
      setActionType(null);
    }
  };

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();
    
    if (isExpired && status === "pending") {
      return <Badge variant="secondary" className="bg-muted text-muted-foreground">Expired</Badge>;
    }
    
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="border-amber-500 text-amber-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "resolved":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const pendingClaims = claims.filter(c => c.status === "pending" && new Date(c.expires_at) >= new Date());

  return (
    <div className="space-y-6">
      {pendingClaims.length > 0 && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-amber-800 dark:text-amber-400 text-base">
                {pendingClaims.length} Pending Claim{pendingClaims.length > 1 ? "s" : ""}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              There are ownership claims waiting for resolution. Review them below.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ownership Claims</CardTitle>
          <CardDescription>
            Users requesting ownership transfer of vehicles registered to others
          </CardDescription>
        </CardHeader>
        <CardContent>
          {claims.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No ownership claims found
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Claimant</TableHead>
                    <TableHead>Current Owner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim) => (
                    <TableRow key={claim.id}>
                      <TableCell>
                        <div className="font-mono font-medium">{claim.registration_number}</div>
                        {claim.makerModel && (
                          <div className="text-sm text-muted-foreground">{claim.makerModel}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{claim.claimantEmail}</span>
                        </div>
                        {claim.claimant_phone && (
                          <div className="flex items-center gap-1 mt-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{claim.claimant_phone}</span>
                          </div>
                        )}
                        {claim.message && (
                          <div className="text-xs text-muted-foreground mt-1 italic max-w-[200px] truncate">
                            "{claim.message}"
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{claim.ownerEmail}</span>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(claim.status, claim.expires_at)}
                        {claim.status === "pending" && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Expires {formatDistanceToNow(new Date(claim.expires_at), { addSuffix: true })}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{format(new Date(claim.created_at), "dd MMM yyyy")}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(claim.created_at), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {claim.status === "pending" && new Date(claim.expires_at) >= new Date() && (
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-300 hover:bg-green-50"
                              onClick={() => {
                                setSelectedClaim(claim);
                                setActionType("resolve");
                              }}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Resolve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-300 hover:bg-red-50"
                              onClick={() => {
                                setSelectedClaim(claim);
                                setActionType("reject");
                              }}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!selectedClaim && !!actionType} onOpenChange={() => { setSelectedClaim(null); setActionType(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "resolve" ? "Resolve Claim" : "Reject Claim"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "resolve" ? (
                <>
                  Mark this claim as resolved? This indicates the ownership transfer was completed successfully.
                  <br /><br />
                  <strong>Vehicle:</strong> {selectedClaim?.registration_number}<br />
                  <strong>Claimant:</strong> {selectedClaim?.claimantEmail}
                </>
              ) : (
                <>
                  Reject this ownership claim? The claimant will not receive the vehicle ownership.
                  <br /><br />
                  <strong>Vehicle:</strong> {selectedClaim?.registration_number}<br />
                  <strong>Claimant:</strong> {selectedClaim?.claimantEmail}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedClaim && handleUpdateStatus(selectedClaim.id, actionType === "resolve" ? "resolved" : "rejected")}
              disabled={isUpdating}
              className={actionType === "reject" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {actionType === "resolve" ? "Resolve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
