import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Loader2, Wrench, Car, MapPin, AlertTriangle } from "lucide-react";

interface Vehicle {
  id: string;
  registration_number: string;
  maker_model: string | null;
  manufacturer: string | null;
}

interface RequestAssistanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: Vehicle[];
  preselectedVehicleId?: string;
  onSuccess?: () => void;
}

const REQUEST_TYPES = [
  { value: "breakdown", label: "Breakdown", icon: "🔧" },
  { value: "flat_tire", label: "Flat Tire", icon: "🛞" },
  { value: "battery", label: "Battery Issue", icon: "🔋" },
  { value: "fuel", label: "Out of Fuel", icon: "⛽" },
  { value: "accident", label: "Accident", icon: "💥" },
  { value: "towing", label: "Towing Required", icon: "🚛" },
  { value: "lockout", label: "Locked Out", icon: "🔐" },
  { value: "other", label: "Other", icon: "❓" },
];

const URGENCY_LEVELS = [
  { value: "low", label: "Low", description: "Can wait a few hours" },
  { value: "medium", label: "Medium", description: "Need help soon" },
  { value: "high", label: "High", description: "Urgent, stranded" },
  { value: "emergency", label: "Emergency", description: "Safety risk" },
];

export function RequestAssistanceDialog({
  open,
  onOpenChange,
  vehicles,
  preselectedVehicleId,
  onSuccess,
}: RequestAssistanceDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vehicleId, setVehicleId] = useState(preselectedVehicleId || "");
  const [requestType, setRequestType] = useState("");
  const [urgency, setUrgency] = useState("medium");
  const [locationText, setLocationText] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vehicleId || !requestType || !locationText.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("assistance_requests").insert({
        user_id: user.id,
        vehicle_id: vehicleId,
        request_type: requestType,
        urgency,
        location_text: locationText.trim(),
        description: description.trim() || null,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Assistance requested",
        description: "Your request has been submitted. Help is on the way!",
      });

      // Reset form
      setVehicleId("");
      setRequestType("");
      setUrgency("medium");
      setLocationText("");
      setDescription("");
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Failed to submit request",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Request Roadside Assistance
          </DialogTitle>
          <DialogDescription>
            Fill in the details below to request help. We'll dispatch assistance as soon as possible.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Vehicle Selection */}
          <div className="space-y-2">
            <Label htmlFor="vehicle" className="flex items-center gap-1.5">
              <Car className="h-4 w-4 text-muted-foreground" />
              Vehicle *
            </Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger id="vehicle">
                <SelectValue placeholder="Select a vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    <span className="font-mono">{v.registration_number}</span>
                    {v.maker_model && (
                      <span className="text-muted-foreground ml-2">
                        - {v.maker_model}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Request Type */}
          <div className="space-y-2">
            <Label htmlFor="requestType">What's the issue? *</Label>
            <Select value={requestType} onValueChange={setRequestType}>
              <SelectTrigger id="requestType">
                <SelectValue placeholder="Select issue type" />
              </SelectTrigger>
              <SelectContent>
                {REQUEST_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="mr-2">{type.icon}</span>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Urgency */}
          <div className="space-y-3">
            <Label>Urgency Level</Label>
            <RadioGroup
              value={urgency}
              onValueChange={setUrgency}
              className="grid grid-cols-2 gap-2"
            >
              {URGENCY_LEVELS.map((level) => (
                <div key={level.value}>
                  <RadioGroupItem
                    value={level.value}
                    id={`urgency-${level.value}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`urgency-${level.value}`}
                    className={`flex flex-col items-center justify-center rounded-lg border-2 p-3 cursor-pointer transition-all hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 ${
                      level.value === "emergency"
                        ? "border-red-200 peer-data-[state=checked]:border-red-500 peer-data-[state=checked]:bg-red-50"
                        : ""
                    }`}
                  >
                    <span className="font-medium text-sm">{level.label}</span>
                    <span className="text-xs text-muted-foreground text-center">
                      {level.description}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Your Location *
            </Label>
            <Input
              id="location"
              placeholder="e.g., Near MG Road Metro Station, Kochi"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              Provide a clear landmark or address for the helper to find you
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Additional Details (optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe the problem in more detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>

          {/* Emergency Notice */}
          {urgency === "emergency" && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-800">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Emergency Assistance</p>
                <p className="text-red-600 text-xs mt-1">
                  If you're in immediate danger, please call emergency services (112) first.
                </p>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Request Help"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
