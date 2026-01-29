import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Package, AlertTriangle, Clock, CheckCircle, 
  MoreHorizontal, Car, ChevronLeft, 
  ChevronRight, Loader2, XCircle, Search, Truck, IndianRupee
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface PartsRequest {
  id: string;
  user_id: string;
  vehicle_id: string;
  part_name: string;
  part_category: string;
  condition_preference: string;
  quantity: number;
  urgency: string;
  description: string | null;
  status: string;
  quoted_price: number | null;
  vendor_info: string | null;
  estimated_delivery: string | null;
  admin_notes: string | null;
  created_at: string;
  userEmail?: string;
  registrationNumber?: string;
  makerModel?: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  engine: "Engine",
  body: "Body",
  electrical: "Electrical",
  suspension: "Suspension",
  brakes: "Brakes",
  interior: "Interior",
  other: "Other",
};

const CONDITION_LABELS: Record<string, string> = {
  used: "Used",
  oem: "OEM",
  any: "Any",
};

const URGENCY_STYLES: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  sourcing: "bg-blue-100 text-blue-700",
  quoted: "bg-purple-100 text-purple-700",
  confirmed: "bg-green-100 text-green-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-gray-100 text-gray-700",
};

export function AdminParts() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<PartsRequest[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Quote dialog state
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PartsRequest | null>(null);
  const [quotedPrice, setQuotedPrice] = useState("");
  const [vendorInfo, setVendorInfo] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Status update loading
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [page, statusFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-data", {
        body: { type: "parts_requests", page, pageSize: 20, status: statusFilter },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setRequests(data.requests || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error: any) {
      toast({
        title: "Error loading requests",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuoteSubmit = async () => {
    if (!selectedRequest) return;

    setIsUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-data", {
        body: {
          type: "update_parts_request",
          requestId: selectedRequest.id,
          status: "quoted",
          quotedPrice: quotedPrice ? parseFloat(quotedPrice) : null,
          vendorInfo: vendorInfo.trim() || null,
          estimatedDelivery: estimatedDelivery || null,
          adminNotes: adminNotes.trim() || null,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({ title: "Quote submitted", description: "The request has been updated with the quote." });
      setShowQuoteDialog(false);
      resetQuoteForm();
      fetchRequests();
    } catch (error: any) {
      toast({
        title: "Failed to update",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusUpdate = async (requestId: string, newStatus: string) => {
    setUpdatingId(requestId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-data", {
        body: {
          type: "update_parts_request",
          requestId,
          status: newStatus,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({ title: "Status updated", description: `Request marked as ${newStatus}.` });
      fetchRequests();
    } catch (error: any) {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const resetQuoteForm = () => {
    setSelectedRequest(null);
    setQuotedPrice("");
    setVendorInfo("");
    setEstimatedDelivery("");
    setAdminNotes("");
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Alert */}
      {pendingCount > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-purple-800">
                {pendingCount} Pending Parts Request{pendingCount > 1 ? "s" : ""}
              </p>
              <p className="text-sm text-purple-600">
                Source parts and provide quotes for these requests
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="w-48">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requests</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="sourcing">Sourcing</SelectItem>
              <SelectItem value="quoted">Quoted</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRequests}>
          Refresh
        </Button>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Package className="h-5 w-5 text-muted-foreground" />
            Parts Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No parts requests found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Part</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm">
                          {request.registrationNumber || "Unknown"}
                        </span>
                      </div>
                      {request.makerModel && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {request.makerModel}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {request.userEmail || "Unknown"}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[150px]">
                        <span className="text-sm font-medium truncate block" title={request.part_name}>
                          {request.part_name}
                        </span>
                        <span className="text-xs text-muted-foreground">Qty: {request.quantity}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {CATEGORY_LABELS[request.part_category] || request.part_category}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {CONDITION_LABELS[request.condition_preference] || request.condition_preference}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={URGENCY_STYLES[request.urgency] || URGENCY_STYLES.medium}>
                        {request.urgency}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_STYLES[request.status] || STATUS_STYLES.pending}>
                        {request.status}
                      </Badge>
                      {request.quoted_price && (
                        <p className="text-xs text-green-600 mt-1 flex items-center gap-0.5">
                          <IndianRupee className="h-3 w-3" />
                          {request.quoted_price.toLocaleString("en-IN")}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      {updatingId === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {request.status === "pending" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleStatusUpdate(request.id, "sourcing")}
                                >
                                  <Search className="h-4 w-4 mr-2" />
                                  Mark Sourcing
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setShowQuoteDialog(true);
                                  }}
                                >
                                  <IndianRupee className="h-4 w-4 mr-2" />
                                  Add Quote
                                </DropdownMenuItem>
                              </>
                            )}
                            {request.status === "sourcing" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowQuoteDialog(true);
                                }}
                              >
                                <IndianRupee className="h-4 w-4 mr-2" />
                                Add Quote
                              </DropdownMenuItem>
                            )}
                            {request.status === "quoted" && (
                              <DropdownMenuItem
                                onClick={() => handleStatusUpdate(request.id, "confirmed")}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark Confirmed
                              </DropdownMenuItem>
                            )}
                            {request.status === "confirmed" && (
                              <DropdownMenuItem
                                onClick={() => handleStatusUpdate(request.id, "delivered")}
                              >
                                <Truck className="h-4 w-4 mr-2" />
                                Mark Delivered
                              </DropdownMenuItem>
                            )}
                            {(request.status === "pending" || request.status === "sourcing") && (
                              <DropdownMenuItem
                                onClick={() => handleStatusUpdate(request.id, "cancelled")}
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel Request
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quote Dialog */}
      <Dialog open={showQuoteDialog} onOpenChange={(open) => {
        setShowQuoteDialog(open);
        if (!open) resetQuoteForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Quote</DialogTitle>
            <DialogDescription>
              Provide a price quote for this parts request.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
                <p>
                  <span className="font-medium">Vehicle:</span>{" "}
                  <span className="font-mono">{selectedRequest.registrationNumber}</span>
                </p>
                <p>
                  <span className="font-medium">Part:</span>{" "}
                  {selectedRequest.part_name} ({CONDITION_LABELS[selectedRequest.condition_preference]})
                </p>
                <p>
                  <span className="font-medium">Quantity:</span> {selectedRequest.quantity}
                </p>
                {selectedRequest.description && (
                  <p>
                    <span className="font-medium">Details:</span> {selectedRequest.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quotedPrice" className="flex items-center gap-1.5">
                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                  Price Quote (₹) *
                </Label>
                <Input
                  id="quotedPrice"
                  type="number"
                  placeholder="Enter price"
                  value={quotedPrice}
                  onChange={(e) => setQuotedPrice(e.target.value)}
                  min={0}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendorInfo">Vendor/Supplier Info</Label>
                <Input
                  id="vendorInfo"
                  placeholder="Vendor name, contact, etc."
                  value={vendorInfo}
                  onChange={(e) => setVendorInfo(e.target.value)}
                  maxLength={500}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedDelivery">Estimated Delivery Date</Label>
                <Input
                  id="estimatedDelivery"
                  type="date"
                  value={estimatedDelivery}
                  onChange={(e) => setEstimatedDelivery(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminNotes">Admin Notes (internal)</Label>
                <Textarea
                  id="adminNotes"
                  placeholder="Any internal notes about this request..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  maxLength={500}
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuoteDialog(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleQuoteSubmit} disabled={isUpdating || !quotedPrice}>
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Submit Quote"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
