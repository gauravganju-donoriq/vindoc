import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Check, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExtractedField {
  key: string;
  label: string;
  extractedValue: string | number | null;
  currentValue: string | number | null;
}

interface DocumentAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractedFields: Record<string, any>;
  currentValues: Record<string, any>;
  confidence: "high" | "medium" | "low";
  documentType: string;
  onApply: (selectedFields: Record<string, any>) => void;
}

const fieldLabels: Record<string, string> = {
  owner_name: "Owner Name",
  insurance_company: "Insurance Company",
  insurance_expiry: "Insurance Expiry",
  chassis_number: "Chassis Number",
  engine_number: "Engine Number",
  registration_date: "Registration Date",
  manufacturer: "Manufacturer",
  maker_model: "Model",
  fuel_type: "Fuel Type",
  color: "Color",
  seating_capacity: "Seating Capacity",
  cubic_capacity: "Cubic Capacity",
  vehicle_class: "Vehicle Class",
  body_type: "Body Type",
  vehicle_category: "Vehicle Category",
  gross_vehicle_weight: "Gross Vehicle Weight",
  unladen_weight: "Unladen Weight",
  pucc_valid_upto: "PUCC Valid Until",
  fitness_valid_upto: "Fitness Valid Until",
  road_tax_valid_upto: "Road Tax Valid Until",
  emission_norms: "Emission Norms",
};

const formatValue = (value: any): string => {
  if (value === null || value === undefined || value === "") {
    return "Not Available";
  }
  // Format dates
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    try {
      return new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return value;
    }
  }
  return String(value);
};

const DocumentAnalysisModal = ({
  open,
  onOpenChange,
  extractedFields,
  currentValues,
  confidence,
  documentType,
  onApply,
}: DocumentAnalysisModalProps) => {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(() => {
    // Pre-select fields where current value is empty/null
    const preSelected = new Set<string>();
    Object.keys(extractedFields).forEach((key) => {
      const current = currentValues[key];
      if (current === null || current === undefined || current === "") {
        preSelected.add(key);
      }
    });
    return preSelected;
  });

  const handleToggleField = (fieldKey: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldKey)) {
        next.delete(fieldKey);
      } else {
        next.add(fieldKey);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedFields(new Set(Object.keys(extractedFields)));
  };

  const handleDeselectAll = () => {
    setSelectedFields(new Set());
  };

  const handleApply = () => {
    const fieldsToApply: Record<string, any> = {};
    selectedFields.forEach((key) => {
      fieldsToApply[key] = extractedFields[key];
    });
    onApply(fieldsToApply);
  };

  const fields: ExtractedField[] = Object.keys(extractedFields).map((key) => ({
    key,
    label: fieldLabels[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    extractedValue: extractedFields[key],
    currentValue: currentValues[key],
  }));

  const getConfidenceBadge = () => {
    switch (confidence) {
      case "high":
        return <Badge variant="default" className="bg-green-600">High Confidence</Badge>;
      case "medium":
        return <Badge variant="secondary" className="bg-amber-500 text-white">Medium Confidence</Badge>;
      case "low":
        return <Badge variant="destructive">Low Confidence</Badge>;
    }
  };

  const documentTypeLabel = {
    insurance: "Insurance Policy",
    rc: "Registration Certificate",
    pucc: "PUCC Certificate",
    fitness: "Fitness Certificate",
    other: "Document",
  }[documentType] || "Document";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Document Analysis Complete
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            Extracted data from your {documentTypeLabel}
            {getConfidenceBadge()}
          </DialogDescription>
        </DialogHeader>

        {confidence === "low" && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Low confidence extraction. Please verify each field carefully before applying.
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-2">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-muted-foreground">
              Select fields to update ({selectedFields.size} of {fields.length} selected)
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
                Clear
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {fields.map((field) => {
              const isSelected = selectedFields.has(field.key);
              const currentEmpty = field.currentValue === null || field.currentValue === undefined || field.currentValue === "";
              const willOverride = !currentEmpty && isSelected;

              return (
                <div
                  key={field.key}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                    isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
                    willOverride && "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
                  )}
                  onClick={() => handleToggleField(field.key)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggleField(field.key)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <Label className="font-medium cursor-pointer">{field.label}</Label>
                    
                    <div className="flex items-center gap-2 mt-1 text-sm">
                      <span className={cn(
                        "truncate",
                        currentEmpty ? "text-muted-foreground italic" : "text-foreground"
                      )}>
                        {formatValue(field.currentValue)}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate font-medium text-primary">
                        {formatValue(field.extractedValue)}
                      </span>
                    </div>
                  </div>

                  {willOverride && (
                    <Badge variant="outline" className="shrink-0 border-amber-500 text-amber-600">
                      Override
                    </Badge>
                  )}
                  {currentEmpty && isSelected && (
                    <Badge variant="outline" className="shrink-0 border-green-500 text-green-600">
                      New
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={selectedFields.size === 0}>
            <Check className="h-4 w-4 mr-2" />
            Apply {selectedFields.size} Field{selectedFields.size !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentAnalysisModal;
