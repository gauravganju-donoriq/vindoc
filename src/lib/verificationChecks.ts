// Vehicle verification checks and progress calculation

export interface VerificationStep {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  required: boolean;
  category: "photo" | "identity" | "technical" | "ownership" | "documents";
}

export interface VerificationProgress {
  steps: VerificationStep[];
  completedCount: number;
  totalRequired: number;
  percentage: number;
  isFullyVerified: boolean;
}

// Required fields for verification (most fields as per user choice)
const REQUIRED_IDENTITY_FIELDS = [
  "registration_number",
  "owner_name",
  "manufacturer",
  "maker_model",
  "registration_date",
];

const REQUIRED_TECHNICAL_FIELDS = [
  "chassis_number",
  "engine_number",
  "fuel_type",
  "color",
  "seating_capacity",
  "cubic_capacity",
  "vehicle_class",
];

const REQUIRED_OWNERSHIP_FIELDS = [
  "owner_count",
  "rc_status",
];

interface VehicleData {
  is_verified?: boolean | null;
  registration_number?: string | null;
  owner_name?: string | null;
  manufacturer?: string | null;
  maker_model?: string | null;
  registration_date?: string | null;
  chassis_number?: string | null;
  engine_number?: string | null;
  fuel_type?: string | null;
  color?: string | null;
  seating_capacity?: number | null;
  cubic_capacity?: number | null;
  vehicle_class?: string | null;
  owner_count?: number | null;
  rc_status?: string | null;
  verification_photo_path?: string | null;
}

interface DocumentData {
  document_type: string;
}

function hasValue(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return true;
  return Boolean(value);
}

function countFilledFields(vehicle: VehicleData, fields: string[]): number {
  return fields.filter(field => hasValue((vehicle as any)[field])).length;
}

export function calculateVerificationProgress(
  vehicle: VehicleData,
  documents: DocumentData[] = []
): VerificationProgress {
  const steps: VerificationStep[] = [];

  // Step 1: Photo Verification (required)
  const photoVerified = vehicle.is_verified === true;
  steps.push({
    id: "photo",
    label: "Photo Verification",
    description: photoVerified 
      ? "Number plate verified via photo" 
      : "Upload a vehicle photo to verify number plate",
    completed: photoVerified,
    required: true,
    category: "photo",
  });

  // Step 2: Vehicle Identity (required - need at least 4 of 5 fields)
  const identityFilled = countFilledFields(vehicle, REQUIRED_IDENTITY_FIELDS);
  const identityComplete = identityFilled >= 4;
  steps.push({
    id: "identity",
    label: "Vehicle Identity",
    description: identityComplete
      ? `${identityFilled}/${REQUIRED_IDENTITY_FIELDS.length} identity fields complete`
      : `${identityFilled}/${REQUIRED_IDENTITY_FIELDS.length} fields filled - need at least 4`,
    completed: identityComplete,
    required: true,
    category: "identity",
  });

  // Step 3: Technical Specifications (required - need at least 5 of 7 fields)
  const technicalFilled = countFilledFields(vehicle, REQUIRED_TECHNICAL_FIELDS);
  const technicalComplete = technicalFilled >= 5;
  steps.push({
    id: "technical",
    label: "Technical Specs",
    description: technicalComplete
      ? `${technicalFilled}/${REQUIRED_TECHNICAL_FIELDS.length} technical fields complete`
      : `${technicalFilled}/${REQUIRED_TECHNICAL_FIELDS.length} fields filled - need at least 5`,
    completed: technicalComplete,
    required: true,
    category: "technical",
  });

  // Step 4: Ownership Details (required - need both fields)
  const ownershipFilled = countFilledFields(vehicle, REQUIRED_OWNERSHIP_FIELDS);
  const ownershipComplete = ownershipFilled >= 2;
  steps.push({
    id: "ownership",
    label: "Ownership Details",
    description: ownershipComplete
      ? "Ownership information verified"
      : `${ownershipFilled}/${REQUIRED_OWNERSHIP_FIELDS.length} ownership fields filled`,
    completed: ownershipComplete,
    required: true,
    category: "ownership",
  });

  // Step 5: Documents (recommended only - not required)
  const hasInsurance = documents.some(d => d.document_type === "insurance");
  const hasRC = documents.some(d => d.document_type === "rc");
  const documentCount = documents.length;
  const hasRecommendedDocs = hasInsurance && hasRC;
  
  steps.push({
    id: "documents",
    label: "Documents",
    description: hasRecommendedDocs
      ? `${documentCount} documents uploaded including RC & Insurance`
      : documentCount > 0 
        ? `${documentCount} document(s) uploaded - recommend adding RC & Insurance`
        : "Upload RC & Insurance documents (recommended)",
    completed: hasRecommendedDocs,
    required: false, // Documents are recommended only
    category: "documents",
  });

  // Calculate progress
  const requiredSteps = steps.filter(s => s.required);
  const completedRequired = requiredSteps.filter(s => s.completed).length;
  const totalRequired = requiredSteps.length;
  
  const allCompleted = steps.filter(s => s.completed).length;
  const percentage = Math.round((allCompleted / steps.length) * 100);

  return {
    steps,
    completedCount: allCompleted,
    totalRequired,
    percentage,
    isFullyVerified: completedRequired === totalRequired,
  };
}

export function getMissingFields(vehicle: VehicleData): string[] {
  const allRequired = [
    ...REQUIRED_IDENTITY_FIELDS,
    ...REQUIRED_TECHNICAL_FIELDS,
    ...REQUIRED_OWNERSHIP_FIELDS,
  ];
  
  return allRequired.filter(field => !hasValue((vehicle as any)[field]));
}
