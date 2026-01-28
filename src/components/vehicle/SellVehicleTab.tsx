import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
import { logVehicleEvent } from "@/lib/vehicleHistory";
import { VerificationProgress as VerificationProgressType } from "@/lib/verificationChecks";
import {
  IndianRupee,
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  Info,
  Lock,
  Circle,
} from "lucide-react";

interface Vehicle {
  id: string;
  registration_number: string;
  manufacturer: string | null;
  maker_model: string | null;
  is_verified: boolean | null;
}

interface VehicleListing {
  id: string;
  vehicle_id: string;
  ai_estimated_price: number | null;
  expected_price: number;
  additional_notes: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface PriceEstimate {
  low: number;
  high: number;
  recommended: number;
  confidence: "high" | "medium" | "low";
  factors: string[];
}

interface SellVehicleTabProps {
  vehicle: Vehicle;
  verificationProgress: VerificationProgressType;
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
      return { icon: Clock, label: "Pending Review", variant: "secondary" as const, color: "text-amber-600" };
    case "approved":
      return { icon: CheckCircle, label: "Listed for Sale", variant: "default" as const, color: "text-green-600" };
    case "rejected":
      return { icon: XCircle, label: "Rejected", variant: "destructive" as const, color: "text-destructive" };
    case "on_hold":
      return { icon: AlertTriangle, label: "On Hold", variant: "secondary" as const, color: "text-amber-600" };
    case "cancelled":
      return { icon: XCircle, label: "Cancelled", variant: "outline" as const, color: "text-muted-foreground" };
    default:
      return { icon: Info, label: status, variant: "outline" as const, color: "text-muted-foreground" };
  }
};

const SellVehicleTab = ({ vehicle, verificationProgress }: SellVehicleTabProps) => {
  const [listing, setListing] = useState<VehicleListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimate | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [expectedPrice, setExpectedPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const { toast } = useToast();

  const isFullyVerified = verificationProgress.isFullyVerified;

  useEffect(() => {
    fetchListing();
  }, [vehicle.id]);

  const fetchListing = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicle_listings")
        .select("*")
        .eq("vehicle_id", vehicle.id)
        .in("status", ["pending", "approved", "on_hold"])
        .maybeSingle();

      if (error) throw error;
      setListing(data);
    } catch (error: any) {
      console.error("Error fetching listing:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMarketPrice = async () => {
    setIsEstimating(true);
    try {
      const { data, error } = await supabase.functions.invoke("estimate-vehicle-price", {
        body: { vehicleId: vehicle.id },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setPriceEstimate(data.estimate);
      // Pre-fill expected price with recommended
      if (!expectedPrice) {
        setExpectedPrice(data.estimate.recommended.toString());
      }

      toast({
        title: "Price Estimated",
        description: `AI recommends ${formatCurrency(data.estimate.recommended)}`,
      });
    } catch (error: any) {
      console.error("Price estimation error:", error);
      toast({
        title: "Estimation Failed",
        description: error.message || "Could not estimate price",
        variant: "destructive",
      });
    } finally {
      setIsEstimating(false);
    }
  };

  const handleSubmitListing = async () => {
    const price = parseFloat(expectedPrice);
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid expected price",
        variant: "destructive",
      });
      return;
    }

    if (price > 100000000) {
      toast({
        title: "Price Too High",
        description: "Expected price cannot exceed ₹10 crore",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("vehicle_listings").insert({
        vehicle_id: vehicle.id,
        user_id: user.id,
        ai_estimated_price: priceEstimate?.recommended || null,
        expected_price: price,
        additional_notes: notes.trim() || null,
        status: "pending",
      });

      if (error) {
        if (error.code === "23505") {
          throw new Error("This vehicle already has an active listing");
        }
        throw error;
      }

      await logVehicleEvent({
        vehicleId: vehicle.id,
        eventType: "listing_created",
        description: `Vehicle listed for sale at ${formatCurrency(price)}`,
        metadata: {
          expectedPrice: price,
          aiEstimatedPrice: priceEstimate?.recommended,
        },
      });

      toast({
        title: "Listing Submitted",
        description: "Your listing is pending admin review",
      });

      setShowConfirmDialog(false);
      fetchListing();
    } catch (error: any) {
      console.error("Submit listing error:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "Could not submit listing",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelListing = async () => {
    if (!listing) return;

    setIsCancelling(true);
    try {
      const { error } = await supabase
        .from("vehicle_listings")
        .update({ status: "cancelled" })
        .eq("id", listing.id)
        .eq("status", "pending");

      if (error) throw error;

      await logVehicleEvent({
        vehicleId: vehicle.id,
        eventType: "listing_cancelled",
        description: "Seller cancelled the listing",
      });

      toast({
        title: "Listing Cancelled",
        description: "Your listing has been cancelled",
      });

      setListing(null);
      setPriceEstimate(null);
      setExpectedPrice("");
      setNotes("");
    } catch (error: any) {
      console.error("Cancel listing error:", error);
      toast({
        title: "Cancellation Failed",
        description: error.message || "Could not cancel listing",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Vehicle not fully verified - show detailed empty state
  if (!isFullyVerified) {
    const requiredSteps = verificationProgress.steps.filter(s => s.required);
    const completedRequired = requiredSteps.filter(s => s.completed).length;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-warning" />
            Complete Verification to Sell
          </CardTitle>
          <CardDescription>
            Your vehicle must be 100% verified before listing for sale. This ensures buyer trust and faster sales.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Verification Progress</span>
              <span className="font-medium">{verificationProgress.percentage}%</span>
            </div>
            <Progress value={verificationProgress.percentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {completedRequired} of {requiredSteps.length} required steps complete
            </p>
          </div>

          {/* Verification Steps Checklist */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Required Steps</Label>
            <div className="space-y-2">
              {requiredSteps.map((step) => (
                <div
                  key={step.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    step.completed 
                      ? "bg-primary/5 border-primary/20" 
                      : "bg-muted/50 border-border"
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className={`font-medium text-sm ${step.completed ? "text-primary" : ""}`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Button */}
          <div className="pt-2">
            <Button 
              className="w-full" 
              onClick={() => {
                // Find the verification tab trigger and click it
                const verificationTab = document.querySelector('[value="verification"]') as HTMLButtonElement;
                if (verificationTab) {
                  verificationTab.click();
                }
              }}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Verification
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Navigate to the Verification tab to complete missing steps
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Existing listing
  if (listing) {
    const statusConfig = getStatusConfig(listing.status);
    const StatusIcon = statusConfig.icon;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              Listing Status
            </CardTitle>
            <Badge variant={statusConfig.variant} className={statusConfig.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>
          <CardDescription>
            Submitted on {new Date(listing.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-muted-foreground">Expected Price</Label>
              <p className="text-2xl font-semibold">
                {formatCurrency(listing.expected_price)}
              </p>
            </div>
            {listing.ai_estimated_price && (
              <div className="space-y-1">
                <Label className="text-muted-foreground">AI Estimated Price</Label>
                <p className="text-lg text-muted-foreground">
                  {formatCurrency(listing.ai_estimated_price)}
                </p>
              </div>
            )}
          </div>

          {listing.additional_notes && (
            <div className="space-y-1">
              <Label className="text-muted-foreground">Your Notes</Label>
              <p className="text-sm">{listing.additional_notes}</p>
            </div>
          )}

          {listing.admin_notes && listing.status !== "pending" && (
            <div className="space-y-1 bg-muted/50 p-4 rounded-lg">
              <Label className="text-muted-foreground">Admin Notes</Label>
              <p className="text-sm">{listing.admin_notes}</p>
            </div>
          )}

          {listing.status === "pending" && (
            <Button
              variant="outline"
              onClick={handleCancelListing}
              disabled={isCancelling}
              className="text-destructive hover:text-destructive"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Listing
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // New listing form
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IndianRupee className="h-5 w-5 text-muted-foreground" />
          List Vehicle for Sale
        </CardTitle>
        <CardDescription>
          Get an AI-powered market price estimate and submit for admin approval
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Price Estimation */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Market Price Estimate</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={getMarketPrice}
              disabled={isEstimating}
            >
              {isEstimating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Estimating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Get AI Estimate
                </>
              )}
            </Button>
          </div>

          {priceEstimate && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Price Range</span>
                <Badge variant={priceEstimate.confidence === "high" ? "default" : "secondary"}>
                  {priceEstimate.confidence} confidence
                </Badge>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(priceEstimate.recommended)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(priceEstimate.low)} - {formatCurrency(priceEstimate.high)}
                </p>
              </div>
              {priceEstimate.factors.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Key factors:</p>
                  <ul className="text-xs space-y-0.5">
                    {priceEstimate.factors.slice(0, 4).map((factor, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-muted-foreground">•</span>
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Expected Price Input */}
        <div className="space-y-2">
          <Label htmlFor="expectedPrice">Your Expected Price (₹)</Label>
          <div className="relative">
            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="expectedPrice"
              type="number"
              placeholder="Enter your expected price"
              value={expectedPrice}
              onChange={(e) => setExpectedPrice(e.target.value)}
              className="pl-9"
              min={0}
              max={100000000}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Set a competitive price based on the market estimate for faster sale
          </p>
        </div>

        {/* Additional Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any additional details about your vehicle's condition, modifications, or sale terms..."
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 500))}
            rows={3}
          />
          <p className="text-xs text-muted-foreground text-right">
            {notes.length}/500 characters
          </p>
        </div>

        {/* Submit Button */}
        <Button
          className="w-full"
          onClick={() => setShowConfirmDialog(true)}
          disabled={!expectedPrice || parseFloat(expectedPrice) <= 0}
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Submit for Review
        </Button>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Listing Submission</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  You are about to list your vehicle for sale at{" "}
                  <strong>{formatCurrency(parseFloat(expectedPrice) || 0)}</strong>.
                </p>
                <p>
                  Your listing will be reviewed by our admin team. Once approved,
                  it will be visible to potential buyers.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSubmitListing} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Confirm Submission"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default SellVehicleTab;
