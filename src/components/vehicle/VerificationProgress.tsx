import { useState } from "react";
import { 
  CheckCircle2, 
  Circle, 
  Camera, 
  Car, 
  Settings, 
  User, 
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { VerificationProgress as VerificationProgressType, VerificationStep } from "@/lib/verificationChecks";

interface VerificationProgressProps {
  progress: VerificationProgressType;
  variant?: "card" | "inline";
}

const getCategoryIcon = (category: VerificationStep["category"]) => {
  switch (category) {
    case "photo":
      return Camera;
    case "identity":
      return Car;
    case "technical":
      return Settings;
    case "ownership":
      return User;
    case "documents":
      return FileText;
    default:
      return Circle;
  }
};

const VerificationProgress = ({ progress, variant = "card" }: VerificationProgressProps) => {
  const { steps, completedCount, percentage, isFullyVerified } = progress;
  const [isOpen, setIsOpen] = useState(false);

  // Count incomplete required steps
  const incompleteRequired = steps.filter(s => s.required && !s.completed).length;

  const content = (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="cursor-pointer">
          {/* Compact Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`p-2 rounded-lg ${isFullyVerified ? "bg-green-100 dark:bg-green-900/30" : "bg-amber-100 dark:bg-amber-900/30"}`}>
                {isFullyVerified ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-medium">
                    {isFullyVerified ? "Fully Verified" : "Verification Progress"}
                  </h3>
                  <Badge 
                    variant={isFullyVerified ? "default" : "secondary"}
                    className={isFullyVerified ? "bg-green-600" : ""}
                  >
                    {percentage}%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {isFullyVerified 
                    ? "All verification steps complete" 
                    : `${incompleteRequired} required step${incompleteRequired !== 1 ? 's' : ''} remaining`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Mini progress bar on desktop */}
              <div className="hidden sm:block w-24">
                <Progress value={percentage} className="h-2" />
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Mobile progress bar */}
          <div className="sm:hidden mt-3">
            <Progress value={percentage} className="h-2" />
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-4 pt-4 border-t border-border">
          {/* Verification steps */}
          <div className="grid gap-2">
            <TooltipProvider>
              {steps.map((step) => {
                const Icon = getCategoryIcon(step.category);
                return (
                  <Tooltip key={step.id}>
                    <TooltipTrigger asChild>
                      <div 
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          step.completed 
                            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" 
                            : "bg-muted/50 border-border"
                        }`}
                      >
                        <div className={`p-1.5 rounded-full ${
                          step.completed 
                            ? "bg-green-100 dark:bg-green-800" 
                            : "bg-muted"
                        }`}>
                          {step.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${
                              step.completed ? "text-green-700 dark:text-green-300" : "text-foreground"
                            }`}>
                              {step.label}
                            </span>
                            {!step.required && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                Recommended
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {step.description}
                          </p>
                        </div>
                        {step.completed && (
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-[250px]">
                      <p className="text-sm">{step.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );

  if (variant === "inline") {
    return content;
  }

  return (
    <div className="bg-background border border-border rounded-lg p-6 mb-6">
      {content}
    </div>
  );
};

export default VerificationProgress;
