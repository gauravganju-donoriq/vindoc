import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X, FileText } from "lucide-react";
import { format } from "date-fns";
import { logVehicleEvent } from "@/lib/vehicleHistory";

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

interface AddServiceRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  registrationNumber: string;
  editRecord?: ServiceRecord | null;
  onSaved: () => void;
}

const serviceTypes = [
  { value: "regular_service", label: "Regular Service" },
  { value: "oil_change", label: "Oil Change" },
  { value: "tire_replacement", label: "Tire Replacement" },
  { value: "brake_service", label: "Brake Service" },
  { value: "battery_replacement", label: "Battery Replacement" },
  { value: "repair", label: "Repair" },
  { value: "body_work", label: "Body Work" },
  { value: "electrical", label: "Electrical" },
  { value: "ac_service", label: "AC Service" },
  { value: "other", label: "Other" },
];

const AddServiceRecordDialog = ({
  open,
  onOpenChange,
  vehicleId,
  registrationNumber,
  editRecord,
  onSaved,
}: AddServiceRecordDialogProps) => {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Form state
  const [serviceDate, setServiceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [serviceType, setServiceType] = useState("regular_service");
  const [odometerReading, setOdometerReading] = useState("");
  const [cost, setCost] = useState("");
  const [serviceCenter, setServiceCenter] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [nextServiceDate, setNextServiceDate] = useState("");
  const [nextServiceKm, setNextServiceKm] = useState("");
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [receiptName, setReceiptName] = useState<string | null>(null);

  // Populate form when editing
  useEffect(() => {
    if (editRecord) {
      setServiceDate(editRecord.service_date);
      setServiceType(editRecord.service_type);
      setOdometerReading(editRecord.odometer_reading?.toString() || "");
      setCost(editRecord.cost?.toString() || "");
      setServiceCenter(editRecord.service_center || "");
      setDescription(editRecord.description || "");
      setNotes(editRecord.notes || "");
      setNextServiceDate(editRecord.next_service_due_date || "");
      setNextServiceKm(editRecord.next_service_due_km?.toString() || "");
      setReceiptPath(editRecord.receipt_path);
      if (editRecord.receipt_path) {
        setReceiptName(editRecord.receipt_path.split("/").pop() || "Receipt");
      }
    } else {
      resetForm();
    }
  }, [editRecord, open]);

  const resetForm = () => {
    setServiceDate(format(new Date(), "yyyy-MM-dd"));
    setServiceType("regular_service");
    setOdometerReading("");
    setCost("");
    setServiceCenter("");
    setDescription("");
    setNotes("");
    setNextServiceDate("");
    setNextServiceKm("");
    setReceiptPath(null);
    setReceiptName(null);
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-receipt.${fileExt}`;
      const filePath = `${user.id}/${vehicleId}/receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("vehicle-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setReceiptPath(filePath);
      setReceiptName(file.name);
      
      toast({
        title: "Receipt uploaded",
        description: "Receipt has been attached to this record.",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveReceipt = async () => {
    if (!receiptPath) return;
    
    // Only delete if it's a newly uploaded receipt (not from edit)
    if (!editRecord?.receipt_path || editRecord.receipt_path !== receiptPath) {
      await supabase.storage
        .from("vehicle-documents")
        .remove([receiptPath]);
    }
    
    setReceiptPath(null);
    setReceiptName(null);
  };

  const handleSubmit = async () => {
    if (!serviceDate || !serviceType) {
      toast({
        title: "Required fields missing",
        description: "Please fill in the service date and type.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const recordData = {
        vehicle_id: vehicleId,
        user_id: user.id,
        service_date: serviceDate,
        service_type: serviceType,
        odometer_reading: odometerReading ? parseInt(odometerReading) : null,
        cost: cost ? parseFloat(cost) : null,
        service_center: serviceCenter || null,
        description: description || null,
        notes: notes || null,
        next_service_due_date: nextServiceDate || null,
        next_service_due_km: nextServiceKm ? parseInt(nextServiceKm) : null,
        receipt_path: receiptPath,
      };

      if (editRecord) {
        // Update existing record
        const { error } = await supabase
          .from("service_records")
          .update(recordData)
          .eq("id", editRecord.id);

        if (error) throw error;

        await logVehicleEvent({
          vehicleId,
          eventType: "service_updated",
          description: `Updated ${serviceTypes.find(t => t.value === serviceType)?.label} record`,
          metadata: { serviceType, date: serviceDate, cost: cost || null },
        });

        toast({
          title: "Service record updated",
          description: "Your changes have been saved.",
        });
      } else {
        // Create new record
        const { error } = await supabase
          .from("service_records")
          .insert(recordData);

        if (error) throw error;

        await logVehicleEvent({
          vehicleId,
          eventType: "service_added",
          description: `Added ${serviceTypes.find(t => t.value === serviceType)?.label} record`,
          metadata: { serviceType, date: serviceDate, cost: cost || null },
        });

        toast({
          title: "Service record added",
          description: "Your service record has been saved.",
        });
      }

      onSaved();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save service record",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editRecord ? "Edit Service Record" : "Add Service Record"}
          </DialogTitle>
          <DialogDescription>
            {registrationNumber} • Track maintenance and repair history
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Service Date and Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="service-date">Service Date *</Label>
              <Input
                id="service-date"
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                max={format(new Date(), "yyyy-MM-dd")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-type">Service Type *</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger id="service-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Odometer and Cost */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="odometer">Odometer Reading (km)</Label>
              <Input
                id="odometer"
                type="number"
                placeholder="e.g., 45000"
                value={odometerReading}
                onChange={(e) => setOdometerReading(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Cost (₹)</Label>
              <Input
                id="cost"
                type="number"
                placeholder="e.g., 5000"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>
          </div>

          {/* Service Center */}
          <div className="space-y-2">
            <Label htmlFor="service-center">Service Center / Garage</Label>
            <Input
              id="service-center"
              placeholder="e.g., Maruti Authorized Service Center"
              value={serviceCenter}
              onChange={(e) => setServiceCenter(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Work Done</Label>
            <Textarea
              id="description"
              placeholder="Describe the service/repair work done..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Next Service Due */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Next Service Due (optional)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="next-date" className="text-xs">By Date</Label>
                <Input
                  id="next-date"
                  type="date"
                  value={nextServiceDate}
                  onChange={(e) => setNextServiceDate(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd")}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="next-km" className="text-xs">By Kilometers</Label>
                <Input
                  id="next-km"
                  type="number"
                  placeholder="e.g., 50000"
                  value={nextServiceKm}
                  onChange={(e) => setNextServiceKm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any other observations or reminders..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Receipt Upload */}
          <div className="space-y-2">
            <Label>Receipt / Bill (optional)</Label>
            {receiptPath ? (
              <div className="flex items-center gap-2 p-2 rounded border bg-muted/50">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm flex-1 truncate">{receiptName}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveReceipt}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleReceiptUpload}
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Receipt
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || uploading}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              editRecord ? "Update Record" : "Add Record"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddServiceRecordDialog;
