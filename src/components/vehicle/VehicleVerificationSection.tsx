import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Camera, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Upload
} from "lucide-react";
import { format } from "date-fns";
import UploadConsentDialog from "./UploadConsentDialog";
import { logVehicleEvent, VehicleEventType } from "@/lib/vehicleHistory";

interface VehicleVerificationSectionProps {
  vehicleId: string;
  registrationNumber: string;
  isVerified: boolean | null;
  verifiedAt: string | null;
  verificationPhotoPath: string | null;
  onVerificationComplete: () => void;
}

const VehicleVerificationSection = ({
  vehicleId,
  registrationNumber,
  isVerified,
  verifiedAt,
  verificationPhotoPath,
  onVerificationComplete,
}: VehicleVerificationSectionProps) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPEG, PNG, WebP)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    setPendingFile(file);
    setShowConsent(true);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const preprocessImage = async (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      img.onload = () => {
        const MAX_SIZE = 1536;
        let { width, height } = img;

        if (width > MAX_SIZE || height > MAX_SIZE) {
          if (width > height) {
            height = (height / width) * MAX_SIZE;
            width = MAX_SIZE;
          } else {
            width = (width / height) * MAX_SIZE;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const base64 = dataUrl.split(",")[1];
        resolve({ base64, mimeType: "image/jpeg" });
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleConsentConfirmed = async () => {
    if (!pendingFile) return;

    setShowConsent(false);
    setIsVerifying(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not authenticated");
      }

      // Preprocess and analyze
      const { base64, mimeType } = await preprocessImage(pendingFile);
      
      console.log(`Sending verification image: ${Math.round(base64.length * 0.75 / 1024)}KB`);

      const response = await supabase.functions.invoke("verify-vehicle", {
        body: {
          imageBase64: base64,
          mimeType: mimeType,
          expectedRegistrationNumber: registrationNumber,
          vehicleId: vehicleId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      
      if (!data.success) {
        if (data.errorType === "rate_limit") {
          toast({
            title: "Please wait",
            description: "Too many requests. Please try again in a moment.",
            variant: "destructive",
          });
          return;
        }
        throw new Error(data.error || "Verification failed");
      }

      // Upload verification photo to storage
      const fileExt = pendingFile.name.split(".").pop() || "jpg";
      const fileName = `verification-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${vehicleId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("vehicle-documents")
        .upload(filePath, pendingFile);

      if (uploadError) {
        console.error("Failed to upload verification photo:", uploadError);
      }

      // Update vehicle verification status
      const { error: updateError } = await supabase
        .from("vehicles")
        .update({
          is_verified: data.verified,
          verified_at: new Date().toISOString(),
          verification_photo_path: uploadError ? null : filePath,
        })
        .eq("id", vehicleId);

      if (updateError) throw updateError;

      // Log the event
      const eventType: VehicleEventType = data.verified ? "vehicle_verified" : "verification_failed";
      await logVehicleEvent({
        vehicleId,
        eventType,
        description: data.verified 
          ? `Vehicle verified - Number plate matches ${registrationNumber}`
          : `Verification failed - ${data.reason || "Number plate mismatch"}`,
        metadata: {
          detectedPlate: data.detectedPlate,
          expectedPlate: registrationNumber,
          confidence: data.confidence,
          verified: data.verified,
        },
      });

      if (data.verified) {
        toast({
          title: "Vehicle Verified! ✓",
          description: `Number plate ${data.detectedPlate || registrationNumber} confirmed.`,
        });
      } else {
        toast({
          title: "Verification Failed",
          description: data.reason || `Detected: ${data.detectedPlate || "Unable to read plate"}. Expected: ${registrationNumber}`,
          variant: "destructive",
        });
      }

      onVerificationComplete();
    } catch (error: any) {
      console.error("Verification error:", error);
      toast({
        title: "Verification failed",
        description: error.message || "Could not verify the vehicle",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
      setPendingFile(null);
    }
  };

  const getVerificationStatus = () => {
    if (isVerified === true) {
      return {
        icon: ShieldCheck,
        label: "Verified",
        variant: "default" as const,
        color: "text-green-600",
        bgColor: "bg-green-50 dark:bg-green-900/20",
      };
    } else if (isVerified === false) {
      return {
        icon: ShieldAlert,
        label: "Not Verified",
        variant: "destructive" as const,
        color: "text-destructive",
        bgColor: "bg-destructive/10",
      };
    } else {
      return {
        icon: ShieldQuestion,
        label: "Pending Verification",
        variant: "secondary" as const,
        color: "text-muted-foreground",
        bgColor: "bg-muted",
      };
    }
  };

  const status = getVerificationStatus();
  const StatusIcon = status.icon;

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${status.bgColor}`}>
                <StatusIcon className={`h-5 w-5 ${status.color}`} />
              </div>
              <div>
                <CardTitle className="text-lg">Vehicle Verification</CardTitle>
                <CardDescription>
                  Upload a photo of your vehicle with the number plate visible
                </CardDescription>
              </div>
            </div>
            <Badge variant={status.variant} className="flex items-center gap-1">
              {isVerified === true && <CheckCircle2 className="h-3 w-3" />}
              {isVerified === false && <XCircle className="h-3 w-3" />}
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {verifiedAt && (
              <p className="text-sm text-muted-foreground">
                {isVerified ? "Verified" : "Last verification attempt"} on {format(new Date(verifiedAt), "dd MMM yyyy 'at' hh:mm a")}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">
                  Take a clear photo of your vehicle showing the registration number plate. 
                  Our AI will verify it matches <strong className="text-foreground">{registrationNumber}</strong>.
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Ensure the number plate is clearly visible and readable</li>
                  <li>• Good lighting improves accuracy</li>
                  <li>• Photo should be taken from the front or rear of the vehicle</li>
                </ul>
              </div>
              
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  capture="environment"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isVerifying}
                  variant={isVerified ? "outline" : "default"}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      {isVerified ? "Re-verify" : "Upload Photo"}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {isVerifying && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>AI is analyzing your photo to verify the number plate...</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <UploadConsentDialog
        open={showConsent}
        onOpenChange={(open) => {
          if (!open) {
            setPendingFile(null);
          }
          setShowConsent(open);
        }}
        onConfirm={handleConsentConfirmed}
        title="Vehicle Verification Consent"
        description="You are about to upload a photo for vehicle verification."
      />
    </>
  );
};

export default VehicleVerificationSection;
