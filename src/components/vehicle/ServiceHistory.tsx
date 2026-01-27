import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Wrench, Plus, Calendar, Gauge, IndianRupee, MapPin, 
  Clock, FileText, Trash2, Pencil, ChevronDown, ChevronUp,
  AlertCircle
} from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import AddServiceRecordDialog from "./AddServiceRecordDialog";
import { logVehicleEvent } from "@/lib/vehicleHistory";
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

interface ServiceRecord {
  id: string;
  vehicle_id: string;
  user_id: string;
  service_date: string;
  odometer_reading: number | null;
  service_type: string;
  description: string | null;
  cost: number | null;
  service_center: string | null;
  next_service_due_date: string | null;
  next_service_due_km: number | null;
  receipt_path: string | null;
  notes: string | null;
  created_at: string;
}

interface ServiceHistoryProps {
  vehicleId: string;
  registrationNumber: string;
}

const serviceTypeLabels: Record<string, { label: string; color: string }> = {
  regular_service: { label: "Regular Service", color: "bg-primary" },
  oil_change: { label: "Oil Change", color: "bg-amber-500" },
  tire_replacement: { label: "Tire Replacement", color: "bg-slate-500" },
  brake_service: { label: "Brake Service", color: "bg-red-500" },
  battery_replacement: { label: "Battery Replacement", color: "bg-green-500" },
  repair: { label: "Repair", color: "bg-orange-500" },
  body_work: { label: "Body Work", color: "bg-purple-500" },
  electrical: { label: "Electrical", color: "bg-blue-500" },
  ac_service: { label: "AC Service", color: "bg-cyan-500" },
  other: { label: "Other", color: "bg-muted-foreground" },
};

const ServiceHistory = ({ vehicleId, registrationNumber }: ServiceHistoryProps) => {
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchRecords();
  }, [vehicleId]);

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from("service_records")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("service_date", { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error: any) {
      console.error("Error fetching service records:", error);
      toast({
        title: "Error",
        description: "Failed to load service history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (recordId: string) => {
    try {
      const record = records.find(r => r.id === recordId);
      
      // Delete receipt if exists
      if (record?.receipt_path) {
        await supabase.storage
          .from("vehicle-documents")
          .remove([record.receipt_path]);
      }

      const { error } = await supabase
        .from("service_records")
        .delete()
        .eq("id", recordId);

      if (error) throw error;

      await logVehicleEvent({
        vehicleId,
        eventType: "service_deleted",
        description: `Deleted ${serviceTypeLabels[record?.service_type || "other"]?.label || "service"} record`,
        metadata: { serviceType: record?.service_type, date: record?.service_date },
      });

      setRecords(records.filter(r => r.id !== recordId));
      toast({
        title: "Service record deleted",
        description: "The service record has been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete service record",
        variant: "destructive",
      });
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleRecordSaved = () => {
    fetchRecords();
    setShowAddDialog(false);
    setEditingRecord(null);
  };

  // Calculate summary stats
  const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);
  const lastOdometer = records.find(r => r.odometer_reading)?.odometer_reading || null;
  
  // Find next service due
  const upcomingService = records.find(r => 
    r.next_service_due_date && !isPast(new Date(r.next_service_due_date))
  );

  const getNextServiceStatus = () => {
    if (!upcomingService?.next_service_due_date) return null;
    const daysLeft = differenceInDays(new Date(upcomingService.next_service_due_date), new Date());
    if (daysLeft < 0) return { text: "Overdue", variant: "destructive" as const };
    if (daysLeft <= 7) return { text: `${daysLeft} days left`, variant: "secondary" as const };
    return { text: format(new Date(upcomingService.next_service_due_date), "dd MMM yyyy"), variant: "outline" as const };
  };

  const nextServiceStatus = getNextServiceStatus();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Service History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-20 bg-muted rounded-lg" />
            <div className="h-20 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Service History
              </CardTitle>
              <CardDescription>
                Track maintenance, repairs, and service costs
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Cards */}
          {records.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <FileText className="h-4 w-4" />
                  Total Records
                </div>
                <p className="text-xl font-semibold">{records.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <IndianRupee className="h-4 w-4" />
                  Total Spent
                </div>
                <p className="text-xl font-semibold">₹{totalCost.toLocaleString("en-IN")}</p>
              </div>
              {lastOdometer && (
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Gauge className="h-4 w-4" />
                    Last Odometer
                  </div>
                  <p className="text-xl font-semibold">{lastOdometer.toLocaleString("en-IN")} km</p>
                </div>
              )}
              {nextServiceStatus && (
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Clock className="h-4 w-4" />
                    Next Service
                  </div>
                  <Badge variant={nextServiceStatus.variant}>{nextServiceStatus.text}</Badge>
                </div>
              )}
            </div>
          )}

          {/* Service Records Timeline */}
          {records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No service records yet</p>
              <p className="text-sm">Add your first service record to start tracking</p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((record, index) => {
                const isExpanded = expandedId === record.id;
                const typeInfo = serviceTypeLabels[record.service_type] || serviceTypeLabels.other;
                
                return (
                  <div 
                    key={record.id} 
                    className="relative border rounded-lg overflow-hidden transition-all hover:shadow-sm"
                  >
                    {/* Timeline indicator */}
                    {index < records.length - 1 && (
                      <div className="absolute left-5 top-14 w-0.5 h-[calc(100%-2rem)] bg-border" />
                    )}
                    
                    <div 
                      className="p-4 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : record.id)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Service type indicator */}
                        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${typeInfo.color}`} />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{typeInfo.label}</span>
                              <Badge variant="outline" className="text-xs">
                                {format(new Date(record.service_date), "dd MMM yyyy")}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              {record.cost !== null && (
                                <span className="font-semibold text-sm">
                                  ₹{record.cost.toLocaleString("en-IN")}
                                </span>
                              )}
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                          
                          {record.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                              {record.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {record.odometer_reading && (
                              <span className="flex items-center gap-1">
                                <Gauge className="h-3 w-3" />
                                {record.odometer_reading.toLocaleString("en-IN")} km
                              </span>
                            )}
                            {record.service_center && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {record.service_center}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 border-t bg-muted/30">
                        <div className="pt-3 space-y-3">
                          {record.notes && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Notes</p>
                              <p className="text-sm">{record.notes}</p>
                            </div>
                          )}
                          
                          {(record.next_service_due_date || record.next_service_due_km) && (
                            <div className="flex items-start gap-2 p-2 rounded bg-primary/5 border border-primary/10">
                              <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
                              <div className="text-sm">
                                <span className="font-medium">Next service due: </span>
                                {record.next_service_due_date && (
                                  <span>{format(new Date(record.next_service_due_date), "dd MMM yyyy")}</span>
                                )}
                                {record.next_service_due_date && record.next_service_due_km && " or "}
                                {record.next_service_due_km && (
                                  <span>{record.next_service_due_km.toLocaleString("en-IN")} km</span>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 pt-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingRecord(record);
                              }}
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm(record.id);
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <AddServiceRecordDialog
        open={showAddDialog || !!editingRecord}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setEditingRecord(null);
          }
        }}
        vehicleId={vehicleId}
        registrationNumber={registrationNumber}
        editRecord={editingRecord}
        onSaved={handleRecordSaved}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The service record and any attached receipt will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ServiceHistory;
