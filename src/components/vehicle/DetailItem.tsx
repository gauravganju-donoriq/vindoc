import { ReactNode } from "react";

interface DetailItemProps {
  label: string;
  value: string | number | null | undefined;
  icon?: ReactNode;
}

const DetailItem = ({ label, value, icon }: DetailItemProps) => {
  const displayValue = value !== null && value !== undefined && value !== "" 
    ? String(value) 
    : "Not Available";
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
