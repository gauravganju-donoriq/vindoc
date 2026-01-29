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
  Wrench, AlertTriangle, Clock, User, CheckCircle, 
  MoreHorizontal, MapPin, Car, Phone, ChevronLeft, 
  ChevronRight, Loader2, XCircle, PlayCircle
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface AssistanceRequest {
  id: string;
  user_id: string;
  vehicle_id: string;
  request_type: string;
  description: string | null;
  location_text: string;
  urgency: string;
  status: string;
  assigned_to: string | null;
  assigned_phone: string | null;
  assigned_at: string | null;
  admin_notes: string | null;
  created_at: string;
  userEmail?: string;
  registrationNumber?: string;
  makerModel?: string | null;
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
  breakdown: "Breakdown",
  flat_tire: "Flat Tire",
  battery: "Battery",
  fuel: "Fuel",
  accident: "Accident",
  towing: "Towing",
  lockout: "Lockout",
  other: "Other",
};

const URGENCY_STYLES: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  emergency: "bg-red-100 text-red-700",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  assigned: "bg-blue-100 text-blue-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-700",
};

export function AdminAssistance() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<AssistanceRequest[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Assign dialog state
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AssistanceRequest | null>(null);
  const [assignedTo, setAssignedTo] = useState("");
  const [assignedPhone, setAssignedPhone] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  // Status update loading
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [page, statusFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-data", {
        body: { type: "assistance_requests", page, pageSize: 20, status: statusFilter },
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

  const handleAssign = async () => {
    if (!selectedRequest || !assignedTo.trim()) return;

    setIsAssigning(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-data", {
        body: {
          type: "assign_assistance",
          requestId: selectedRequest.id,
          assignedTo: assignedTo.trim(),
          assignedPhone: assignedPhone.trim() || null,
          adminNotes: adminNotes.trim() || null,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast({ title: "Helper assigned", description: "The request has been assigned." });
      setShowAssignDialog(false);
      resetAssignForm();
      fetchRequests();
    } catch (error: any) {
      toast({
        title: "Failed to assign",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleStatusUpdate = async (requestId: string, newStatus: string) => {
    setUpdatingId(requestId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-data", {
        body: {
          type: "update_assistance_status",
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

  const resetAssignForm = () => {
    setSelectedRequest(null);
    setAssignedTo("");
    setAssignedPhone("");
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
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-amber-800">
                {pendingCount} Pending Request{pendingCount > 1 ? "s" : ""}
              </p>
              <p className="text-sm text-amber-600">
                Assign helpers to address these requests
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
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
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
            <Wrench className="h-5 w-5 text-muted-foreground" />
            Assistance Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No assistance requests found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Location</TableHead>
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
                      <span className="text-sm">
                        {REQUEST_TYPE_LABELS[request.request_type] || request.request_type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={URGENCY_STYLES[request.urgency] || URGENCY_STYLES.medium}>
                        {request.urgency}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-1 max-w-[150px]">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <span className="text-sm truncate" title={request.location_text}>
                          {request.location_text}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_STYLES[request.status] || STATUS_STYLES.pending}>
                        {request.status.replace("_", " ")}
                      </Badge>
                      {request.assigned_to && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {request.assigned_to}
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
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowAssignDialog(true);
                                }}
                              >
                                <User className="h-4 w-4 mr-2" />
                                Assign Helper
                              </DropdownMenuItem>
                            )}
                            {request.status === "assigned" && (
                              <DropdownMenuItem
                                onClick={() => handleStatusUpdate(request.id, "in_progress")}
                              >
                                <PlayCircle className="h-4 w-4 mr-2" />
                                Mark In Progress
                              </DropdownMenuItem>
                            )}
                            {(request.status === "assigned" || request.status === "in_progress") && (
                              <DropdownMenuItem
                                onClick={() => handleStatusUpdate(request.id, "completed")}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark Completed
                              </DropdownMenuItem>
                            )}
                            {request.status === "pending" && (
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

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={(open) => {
        setShowAssignDialog(open);
        if (!open) resetAssignForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Helper</DialogTitle>
            <DialogDescription>
              Assign a helper to this assistance request. The user will be notified.
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
                  <span className="font-medium">Issue:</span>{" "}
                  {REQUEST_TYPE_LABELS[selectedRequest.request_type]} ({selectedRequest.urgency} urgency)
                </p>
                <p>
                  <span className="font-medium">Location:</span> {selectedRequest.location_text}
                </p>
                {selectedRequest.description && (
                  <p>
                    <span className="font-medium">Details:</span> {selectedRequest.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignedTo">Helper Name *</Label>
                <Input
                  id="assignedTo"
                  placeholder="Enter helper's name"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignedPhone" className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Phone Number
                </Label>
                <Input
                  id="assignedPhone"
                  placeholder="Helper's phone number"
                  value={assignedPhone}
                  onChange={(e) => setAssignedPhone(e.target.value)}
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminNotes">Admin Notes (optional)</Label>
                <Textarea
                  id="adminNotes"
                  placeholder="Any additional notes..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                  maxLength={500}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)} disabled={isAssigning}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={isAssigning || !assignedTo.trim()}>
              {isAssigning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign Helper"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
