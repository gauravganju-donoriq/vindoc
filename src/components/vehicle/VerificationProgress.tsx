import { 
  CheckCircle2, 
  Circle, 
  Camera, 
  Car, 
  Settings, 
  User, 
  FileText,
  AlertCircle
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

  const content = (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2">
            {isFullyVerified ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500" />
            )}
            Verification Progress
          </h3>
          <p className="text-sm text-muted-foreground">
            {isFullyVerified 
              ? "All required verification steps complete!" 
              : `Complete the steps below to fully verify your vehicle`}
          </p>
        </div>
        <Badge 
          variant={isFullyVerified ? "default" : "secondary"}
          className={`text-sm ${isFullyVerified ? "bg-green-600" : ""}`}
        >
          {completedCount}/{steps.length} Complete
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="space-y-2 mb-4">
        <Progress value={percentage} className="h-2" />
        <p className="text-xs text-muted-foreground text-right">{percentage}% verified</p>
      </div>

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
    </>
  );

  if (variant === "inline") {
    return content;
  }

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        {content}
      </CardContent>
    </Card>
  );
};

export default VerificationProgress;
