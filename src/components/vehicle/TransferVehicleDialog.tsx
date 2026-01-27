import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { addDays } from "date-fns";
import { z } from "zod";

const transferSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
});

interface TransferVehicleDialogProps {
  vehicleId: string;
  vehicleNumber: string;
  vehicleModel: string | null;
  onTransferInitiated: () => void;
}

export default function TransferVehicleDialog({
  vehicleId,
  vehicleNumber,
  vehicleModel,
  onTransferInitiated,
}: TransferVehicleDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; phone?: string }>({});
  const { toast } = useToast();

  const handleSubmit = async () => {
    setErrors({});
    
    // Validate input
    const result = transferSchema.safeParse({ email, phone });
    if (!result.success) {
      const fieldErrors: { email?: string; phone?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === "email") fieldErrors.email = err.message;
        if (err.path[0] === "phone") fieldErrors.phone = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Not authenticated",
          description: "Please log in to transfer vehicles.",
          variant: "destructive",
        });
        return;
      }

      // Check if user is trying to transfer to themselves
      if (email.toLowerCase() === user.email?.toLowerCase()) {
        setErrors({ email: "You cannot transfer a vehicle to yourself" });
        setIsSubmitting(false);
        return;
      }

      // Check for existing pending transfer
      const { data: existingTransfer } = await supabase
        .from("vehicle_transfers")
        .select("id")
        .eq("vehicle_id", vehicleId)
        .eq("status", "pending")
        .maybeSingle();

      if (existingTransfer) {
        toast({
          title: "Transfer already pending",
          description: "This vehicle already has a pending transfer request. Please cancel it first.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const expiresAt = addDays(new Date(), 7).toISOString();

      // Create transfer request
      const { error: insertError } = await supabase
        .from("vehicle_transfers")
        .insert({
          vehicle_id: vehicleId,
          sender_id: user.id,
          recipient_email: email.toLowerCase(),
          recipient_phone: phone || null,
          expires_at: expiresAt,
        });

      if (insertError) throw insertError;

      // Send email notification
      const { error: emailError } = await supabase.functions.invoke("send-transfer-notification", {
        body: {
          recipientEmail: email.toLowerCase(),
          senderName: user.email || "A user",
          vehicleNumber,
          vehicleModel,
          expiresAt,
        },
      });

      if (emailError) {
        console.error("Failed to send email notification:", emailError);
        // Don't fail the transfer if email fails, just log it
      }

      toast({
        title: "Transfer request sent",
        description: `An email has been sent to ${email} with instructions to accept the transfer.`,
      });

      setOpen(false);
      setEmail("");
      setPhone("");
      onTransferInitiated();
    } catch (error: any) {
      console.error("Transfer error:", error);
      toast({
        title: "Transfer failed",
        description: error.message || "Could not initiate transfer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ArrowRightLeft className="h-4 w-4 mr-2" />
          Transfer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer Vehicle Ownership</DialogTitle>
          <DialogDescription>
            Transfer <span className="font-mono font-semibold">{vehicleNumber}</span> to another user.
            They will receive an email to accept the transfer.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="recipient-email">Recipient Email *</Label>
            <Input
              id="recipient-email"
              type="email"
              placeholder="Enter recipient's email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipient-phone">Recipient Phone (Optional)</Label>
            <Input
              id="recipient-phone"
              type="tel"
              placeholder="Enter recipient's phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isSubmitting}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone}</p>
            )}
          </div>
          <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
            <p>
              ⏰ The recipient has <strong>7 days</strong> to accept this transfer.
              You can cancel the request anytime before they accept.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !email}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Transfer Request"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
