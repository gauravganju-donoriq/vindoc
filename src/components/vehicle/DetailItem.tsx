import { ReactNode } from "react";
import { toTitleCase } from "@/lib/utils";

interface DetailItemProps {
  label: string;
  value: string | number | null | undefined;
  icon?: ReactNode;
  normalize?: boolean;
}

const DetailItem = ({ label, value, icon, normalize = false }: DetailItemProps) => {
  let displayValue: string;
  
  if (value !== null && value !== undefined && value !== "") {
    const stringValue = String(value);
    displayValue = normalize ? (toTitleCase(stringValue) || stringValue) : stringValue;
  } else {
    displayValue = "Not Available";
  }
  
  const isAvailable = value !== null && value !== undefined && value !== "";

  return (
    <div className="space-y-1">
      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <p className={`font-medium ${!isAvailable ? "text-muted-foreground italic" : ""}`}>
        {displayValue}
      </p>
    </div>
  );
};

export default DetailItem;
