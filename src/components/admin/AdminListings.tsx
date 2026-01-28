import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  IndianRupee,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Listing {
  id: string;
  vehicle_id: string;
  user_id: string;
  ai_estimated_price: number | null;
  expected_price: number;
  additional_notes: string | null;
  status: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  // Enriched fields
  userEmail?: string;
  registrationNumber?: string;
  makerModel?: string;
  manufacturer?: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case "pending":
      return { icon: Clock, label: "Pending", variant: "secondary" as const };
    case "approved":
      return { icon: CheckCircle, label: "Approved", variant: "default" as const };
    case "rejected":
      return { icon: XCircle, label: "Rejected", variant: "destructive" as const };
    case "on_hold":
      return { icon: AlertTriangle, label: "On Hold", variant: "secondary" as const };
    case "cancelled":
      return { icon: XCircle, label: "Cancelled", variant: "outline" as const };
    default:
      return { icon: Clock, label: status, variant: "outline" as const };
  }
};

const fetchWithRetry = async (fn: () => Promise<any>, retries = 3): Promise<any> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
};

export const AdminListings = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    type: "approve" | "reject" | "hold" | null;
    listing: Listing | null;
  }>({ type: null, listing: null });
  const [adminNote, setAdminNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await fetchWithRetry(() =>
        supabase.functions.invoke("admin-data", {
          body: { type: "listings" },
        })
      );

      if (response.error) throw response.error;
      setListings(response.data.listings || []);
    } catch (error: any) {
      console.error("Error fetching listings:", error);
      toast({
        title: "Error loading listings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleAction = async () => {
    if (!actionDialog.type || !actionDialog.listing) return;

    if ((actionDialog.type === "reject" || actionDialog.type === "hold") && !adminNote.trim()) {
      toast({
        title: "Note Required",
        description: "Please provide a reason for this action",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const newStatus = actionDialog.type === "approve" ? "approved" : 
                        actionDialog.type === "reject" ? "rejected" : "on_hold";

      const response = await fetchWithRetry(() =>
        supabase.functions.invoke("admin-data", {
          body: {
            type: "update_listing_status",
            listingId: actionDialog.listing!.id,
            status: newStatus,
            adminNotes: adminNote.trim() || null,
          },
        })
      );

      if (response.error) throw response.error;

      toast({
        title: "Listing Updated",
        description: `Listing has been ${newStatus}`,
      });

      setActionDialog({ type: null, listing: null });
      setAdminNote("");
      fetchListings();
    } catch (error: any) {
      console.error("Error updating listing:", error);
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredListings = listings.filter(
    (l) => statusFilter === "all" || l.status === statusFilter
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold">Vehicle Listings</h2>
          <p className="text-sm text-muted-foreground">
            {listings.length} total listings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchListings}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Table */}
      {filteredListings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No listings found
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead className="text-right">AI Price</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredListings.map((listing) => {
                const statusConfig = getStatusConfig(listing.status);
                const StatusIcon = statusConfig.icon;
                const isExpanded = expandedRow === listing.id;

                return (
                  <>
                    <TableRow key={listing.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setExpandedRow(isExpanded ? null : listing.id)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-mono font-medium">{listing.registrationNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            {listing.manufacturer} {listing.makerModel}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm truncate max-w-[150px]">{listing.userEmail}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        {listing.ai_estimated_price ? (
                          <span className="text-muted-foreground">
                            {formatCurrency(listing.ai_estimated_price)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(listing.expected_price)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(listing.created_at).toLocaleDateString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right">
                        {listing.status === "pending" && (
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-green-600 hover:text-green-600"
                              onClick={() => setActionDialog({ type: "approve", listing })}
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7"
                              onClick={() => setActionDialog({ type: "hold", listing })}
                            >
                              <AlertTriangle className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-destructive hover:text-destructive"
                              onClick={() => setActionDialog({ type: "reject", listing })}
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-muted/30 p-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            {listing.additional_notes && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Seller Notes
                                </p>
                                <p className="text-sm">{listing.additional_notes}</p>
                              </div>
                            )}
                            {listing.admin_notes && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Admin Notes
                                </p>
                                <p className="text-sm">{listing.admin_notes}</p>
                              </div>
                            )}
                            {listing.reviewed_at && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Reviewed At
                                </p>
                                <p className="text-sm">
                                  {new Date(listing.reviewed_at).toLocaleString("en-IN")}
                                </p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.type !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog({ type: null, listing: null });
            setAdminNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === "approve" && "Approve Listing"}
              {actionDialog.type === "reject" && "Reject Listing"}
              {actionDialog.type === "hold" && "Put Listing On Hold"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.listing && (
                <>
                  Vehicle: <strong>{actionDialog.listing.registrationNumber}</strong>
                  <br />
                  Expected Price: <strong>{formatCurrency(actionDialog.listing.expected_price)}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                {actionDialog.type === "approve" ? "Notes (Optional)" : "Reason (Required)"}
              </label>
              <Textarea
                placeholder={
                  actionDialog.type === "approve"
                    ? "Optional notes for the seller..."
                    : "Please provide a reason..."
                }
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialog({ type: null, listing: null });
                setAdminNote("");
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={isProcessing}
              variant={actionDialog.type === "reject" ? "destructive" : "default"}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {actionDialog.type === "approve" && <CheckCircle className="h-4 w-4 mr-2" />}
                  {actionDialog.type === "reject" && <XCircle className="h-4 w-4 mr-2" />}
                  {actionDialog.type === "hold" && <AlertTriangle className="h-4 w-4 mr-2" />}
                  Confirm
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
