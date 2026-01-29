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
import { Loader2, Package, Car } from "lucide-react";

interface Vehicle {
  id: string;
  registration_number: string;
  maker_model: string | null;
  manufacturer: string | null;
}

interface RequestPartsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: Vehicle[];
  preselectedVehicleId?: string;
  onSuccess?: () => void;
}

const PART_CATEGORIES = [
  { value: "engine", label: "Engine & Transmission", icon: "⚙️" },
  { value: "body", label: "Body & Exterior", icon: "🚗" },
  { value: "electrical", label: "Electrical & Electronics", icon: "⚡" },
  { value: "suspension", label: "Suspension & Steering", icon: "🔧" },
  { value: "brakes", label: "Brakes", icon: "🛑" },
  { value: "interior", label: "Interior & Cabin", icon: "💺" },
  { value: "other", label: "Other", icon: "📦" },
];

const CONDITION_OPTIONS = [
  { value: "used", label: "Used", description: "Pre-owned, good condition" },
  { value: "oem", label: "OEM/New", description: "Original equipment manufacturer" },
  { value: "any", label: "Any", description: "Either used or new" },
];

const URGENCY_LEVELS = [
  { value: "low", label: "Low", description: "Can wait 1-2 weeks" },
  { value: "medium", label: "Medium", description: "Need within a week" },
  { value: "high", label: "High", description: "Need urgently (1-3 days)" },
];

export function RequestPartsDialog({
  open,
  onOpenChange,
  vehicles,
  preselectedVehicleId,
  onSuccess,
}: RequestPartsDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vehicleId, setVehicleId] = useState(preselectedVehicleId || "");
  const [partName, setPartName] = useState("");
  const [partCategory, setPartCategory] = useState("");
  const [conditionPreference, setConditionPreference] = useState("any");
  const [quantity, setQuantity] = useState(1);
  const [urgency, setUrgency] = useState("medium");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vehicleId || !partName.trim() || !partCategory) {
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

      const { error } = await supabase.from("parts_requests").insert({
        user_id: user.id,
        vehicle_id: vehicleId,
        part_name: partName.trim(),
        part_category: partCategory,
        condition_preference: conditionPreference,
        quantity,
        urgency,
        description: description.trim() || null,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Parts request submitted",
        description: "We'll find the part and get back to you with a quote!",
      });

      // Reset form
      setVehicleId("");
      setPartName("");
      setPartCategory("");
      setConditionPreference("any");
      setQuantity(1);
      setUrgency("medium");
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Request Vehicle Parts
          </DialogTitle>
          <DialogDescription>
            Tell us what part you need and we'll find it for you. Used or OEM - we've got you covered.
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

          {/* Part Name */}
          <div className="space-y-2">
            <Label htmlFor="partName">Part Name *</Label>
            <Input
              id="partName"
              placeholder="e.g., Front Brake Pads, Air Filter, Headlight Assembly"
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              maxLength={200}
            />
          </div>

          {/* Part Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={partCategory} onValueChange={setPartCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {PART_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <span className="mr-2">{cat.icon}</span>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Condition Preference */}
          <div className="space-y-3">
            <Label>Condition Preference</Label>
            <RadioGroup
              value={conditionPreference}
              onValueChange={setConditionPreference}
              className="grid grid-cols-3 gap-2"
            >
              {CONDITION_OPTIONS.map((option) => (
                <div key={option.value}>
                  <RadioGroupItem
                    value={option.value}
                    id={`condition-${option.value}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`condition-${option.value}`}
                    className="flex flex-col items-center justify-center rounded-lg border-2 p-3 cursor-pointer transition-all hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                  >
                    <span className="font-medium text-sm">{option.label}</span>
                    <span className="text-xs text-muted-foreground text-center">
                      {option.description}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Quantity & Urgency Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={99}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency</Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger id="urgency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {URGENCY_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Additional Details (optional)</Label>
            <Textarea
              id="description"
              placeholder="Part number, specific brand preference, compatibility notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>

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
                "Request Part"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
