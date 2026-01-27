import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { addDays } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";

interface RequestTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleInfo: {
    vehicleId: string;
    currentOwnerId: string;
    registrationNumber: string;
    makerModel?: string;
  };
  onSuccess: () => void;
}

export const RequestTransferDialog = ({
  open,
  onOpenChange,
  vehicleInfo,
  onSuccess,
}: RequestTransferDialogProps) => {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        toast({
          title: "Error",
          description: "You must be logged in to request a transfer",
          variant: "destructive",
        });
        return;
      }

      // Check if there's already a pending claim from this user for this vehicle
      const { data: existingClaim } = await supabase
        .from("ownership_claims")
        .select("id")
        .eq("vehicle_id", vehicleInfo.vehicleId)
        .eq("claimant_id", user.id)
        .eq("status", "pending")
        .maybeSingle();

      if (existingClaim) {
        toast({
          title: "Claim already exists",
          description: "You already have a pending transfer request for this vehicle.",
          variant: "destructive",
        });
        return;
      }

      // Create the ownership claim
      const { error: claimError } = await supabase
        .from("ownership_claims")
        .insert({
          registration_number: vehicleInfo.registrationNumber,
          vehicle_id: vehicleInfo.vehicleId,
          claimant_id: user.id,
          claimant_email: user.email,
          claimant_phone: phone || null,
          current_owner_id: vehicleInfo.currentOwnerId,
          message: message || null,
          expires_at: addDays(new Date(), 14).toISOString(),
        });

      if (claimError) {
        console.error("Claim creation error:", claimError);
        throw new Error("Failed to create transfer request");
      }

      // Send notification email to current owner
      const { error: notifyError } = await supabase.functions.invoke(
        "send-ownership-claim-notification",
        {
          body: {
            vehicleId: vehicleInfo.vehicleId,
            registrationNumber: vehicleInfo.registrationNumber,
            makerModel: vehicleInfo.makerModel,
            claimantEmail: user.email,
            claimantPhone: phone || null,
            message: message || null,
          },
        }
      );

      if (notifyError) {
        console.error("Notification error:", notifyError);
        // Don't throw - claim was created, just log the notification failure
      }

      toast({
        title: "Request sent!",
        description: "The current owner has been notified. They will receive an email with your request.",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Submit error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit transfer request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Ownership Transfer</DialogTitle>
          <DialogDescription>
            Send a request to the current owner of {vehicleInfo.registrationNumber}
            {vehicleInfo.makerModel && ` (${vehicleInfo.makerModel})`} to transfer ownership to you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Your Phone Number (optional)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="e.g., +91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This helps the owner contact you directly if needed
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              placeholder="e.g., I recently purchased this vehicle from you..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Add context about why you're requesting this transfer
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
