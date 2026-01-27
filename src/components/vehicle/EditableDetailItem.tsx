import { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface EditableDetailItemProps {
  label: string;
  value: string | number | null | undefined;
  fieldName: string;
  isEditing: boolean;
  onChange: (fieldName: string, value: string) => void;
  icon?: ReactNode;
  inputType?: "text" | "number" | "date";
  placeholder?: string;
}

const EditableDetailItem = ({ 
  label, 
  value, 
  fieldName,
  isEditing, 
  onChange,
  icon,
  inputType = "text",
  placeholder
}: EditableDetailItemProps) => {
  const displayValue = value !== null && value !== undefined && value !== "" 
    ? String(value) 
    : "Not Available";
  const isAvailable = value !== null && value !== undefined && value !== "";
  const isEmpty = !isAvailable;

  // Format date for input display
  const getInputValue = () => {
    if (inputType === "date" && value) {
      // Convert to YYYY-MM-DD format for date input
      const date = new Date(value as string);
      return date.toISOString().split("T")[0];
    }
    return value !== null && value !== undefined ? String(value) : "";
  };

  if (isEditing) {
    return (
      <div className="space-y-1">
        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        <Input
          type={inputType}
          value={getInputValue()}
          onChange={(e) => onChange(fieldName, e.target.value)}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          className={cn(
            "h-9",
            isEmpty && "border-dashed border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/20"
          )}
        />
        {isEmpty && (
          <span className="text-xs text-amber-600 dark:text-amber-400">
            Missing data - fill in manually
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <p className={cn("font-medium", !isAvailable && "text-muted-foreground italic")}>
        {displayValue}
      </p>
    </div>
  );
};

export default EditableDetailItem;
