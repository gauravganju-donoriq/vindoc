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
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";

interface UploadConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}

const UploadConsentDialog = ({
  open,
  onOpenChange,
  onConfirm,
  title = "Upload Consent Required",
  description = "You are about to upload a document for this vehicle.",
}: UploadConsentDialogProps) => {
  const [consentChecked, setConsentChecked] = useState(false);

  const handleConfirm = () => {
    if (consentChecked) {
      onConfirm();
      setConsentChecked(false);
    }
  };

  const handleCancel = () => {
    setConsentChecked(false);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>{description}</p>
              
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm">
                <p className="font-semibold text-destructive mb-2">⚠️ Legal Warning</p>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Uploading documents for vehicles you do not own is a <strong className="text-foreground">punishable offense</strong> under the Motor Vehicles Act.</li>
                  <li>• You may face <strong className="text-foreground">heavy penalties, fines, and legal action</strong> for fraudulent uploads.</li>
                  <li>• This platform will <strong className="text-foreground">not be held responsible</strong> for any misuse of the upload feature.</li>
                </ul>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <Checkbox
                  id="consent"
                  checked={consentChecked}
                  onCheckedChange={(checked) => setConsentChecked(checked === true)}
                  className="mt-0.5"
                />
                <label 
                  htmlFor="consent" 
                  className="text-sm cursor-pointer leading-relaxed"
                >
                  I confirm that I am the <strong>legal owner</strong> of this vehicle or have been <strong>authorized by the owner</strong> to upload documents. I understand and accept the legal consequences of uploading false information.
                </label>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            disabled={!consentChecked}
            className="bg-primary"
          >
            I Understand, Proceed
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UploadConsentDialog;
