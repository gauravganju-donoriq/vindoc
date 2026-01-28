import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Upload, FileText, Trash2, Download, 
  AlertTriangle, CheckCircle, Clock, Car, Calendar, Shield,
  Settings, User, Fuel, Palette, Users, Banknote, Hash,
  Gauge, Weight, FileCheck, RefreshCw, Loader2, Pencil, Save, X, Sparkles,
  LayoutGrid, FileStack, Wrench, History
} from "lucide-react";
import { format, differenceInDays, isPast, formatDistanceToNow } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DetailItem from "@/components/vehicle/DetailItem";
import EditableDetailItem from "@/components/vehicle/EditableDetailItem";
import { useRefreshVehicle } from "@/hooks/useRefreshVehicle";
import TransferVehicleDialog from "@/components/vehicle/TransferVehicleDialog";
import VehicleHistory from "@/components/vehicle/VehicleHistory";
import ServiceHistory from "@/components/vehicle/ServiceHistory";
import DocumentAnalysisModal from "@/components/vehicle/DocumentAnalysisModal";
import UploadConsentDialog from "@/components/vehicle/UploadConsentDialog";
import VehicleVerificationSection from "@/components/vehicle/VehicleVerificationSection";
import VehicleProfileImage from "@/components/vehicle/VehicleProfileImage";
import VerificationProgress from "@/components/vehicle/VerificationProgress";
import ExpiryIntelligence from "@/components/vehicle/ExpiryIntelligence";
import { logVehicleEvent } from "@/lib/vehicleHistory";
import { calculateVerificationProgress } from "@/lib/verificationChecks";
import { toTitleCase } from "@/lib/utils";

interface Vehicle {
  id: string;
  registration_number: string;
  owner_name: string | null;
  vehicle_class: string | null;
  fuel_type: string | null;
  maker_model: string | null;
  manufacturer: string | null;
  registration_date: string | null;
  insurance_company: string | null;
  insurance_expiry: string | null;
  pucc_valid_upto: string | null;
  fitness_valid_upto: string | null;
  road_tax_valid_upto: string | null;
  rc_status: string | null;
  engine_number: string | null;
  chassis_number: string | null;
  color: string | null;
  seating_capacity: number | null;
  cubic_capacity: number | null;
  owner_count: number | null;
  emission_norms: string | null;
  is_financed: boolean | null;
  financer: string | null;
  noc_details: string | null;
  vehicle_category: string | null;
  body_type: string | null;
  wheelbase: string | null;
  gross_vehicle_weight: string | null;
  unladen_weight: string | null;
  data_last_fetched_at: string | null;
  is_verified: boolean | null;
  verified_at: string | null;
  verification_photo_path: string | null;
}

interface Document {
  id: string;
  document_type: string;
  document_name: string;
  file_path: string;
  uploaded_at: string;
}

interface AnalysisResult {
  extractedFields: Record<string, any>;
  confidence: "high" | "medium" | "low";
  documentType: string;
}

const documentTypes = [
  { value: "auto", label: "Auto-Detect (Recommended)" },
  { value: "insurance", label: "Insurance Policy" },
  { value: "rc", label: "Registration Certificate (RC)" },
  { value: "pucc", label: "PUCC Certificate" },
  { value: "fitness", label: "Fitness Certificate" },
  { value: "other", label: "Other Document" },
];

const getExpiryStatus = (expiryDate: string | null) => {
  if (!expiryDate) return null;
  const date = new Date(expiryDate);
  const daysLeft = differenceInDays(date, new Date());
  
  if (isPast(date)) {
    return { status: "expired", label: "Expired", variant: "destructive" as const, icon: AlertTriangle, color: "text-destructive" };
  } else if (daysLeft <= 30) {
    return { status: "expiring", label: `${daysLeft} days left`, variant: "secondary" as const, icon: Clock, color: "text-amber-600" };
  } else {
    return { status: "valid", label: "Valid", variant: "default" as const, icon: CheckCircle, color: "text-green-600" };
  }
};

const VehicleDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("auto");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);

  // AI analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  // Upload consent state
  const [showUploadConsent, setShowUploadConsent] = useState(false);
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
  const [lastUploadedDocId, setLastUploadedDocId] = useState<string | null>(null);

  // Refresh vehicle data hook
  const { isRefreshing, canRefresh, getTimeUntilRefresh, refreshVehicleData } = useRefreshVehicle({
    vehicleId: vehicle?.id || "",
    registrationNumber: vehicle?.registration_number || "",
    dataLastFetchedAt: vehicle?.data_last_fetched_at || null,
    onSuccess: () => {
      if (id) {
        supabase
          .from("vehicles")
          .select("*")
          .eq("id", id)
          .single()
          .then(({ data }) => {
            if (data) setVehicle(data);
          });
      }
    },
  });

  useEffect(() => {
    if (id) {
      fetchVehicle();
      fetchDocuments();
    }
  }, [id]);

  const fetchVehicle = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setVehicle(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Vehicle not found",
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("vehicle_id", id)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error("Error fetching documents:", error);
    }
  };

  // Handle field changes in edit mode
  const handleFieldChange = (fieldName: string, value: string) => {
    setPendingChanges((prev) => ({
      ...prev,
      [fieldName]: value === "" ? null : value,
    }));
  };

  // Get current value considering pending changes
  const getCurrentValue = (fieldName: string) => {
    if (fieldName in pendingChanges) {
      return pendingChanges[fieldName];
    }
    return vehicle ? (vehicle as any)[fieldName] : null;
  };

  // Save pending changes
  const handleSaveChanges = async () => {
    if (!vehicle || Object.keys(pendingChanges).length === 0) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      // Convert numeric fields
      const updates = { ...pendingChanges };
      if ("seating_capacity" in updates && updates.seating_capacity !== null) {
        updates.seating_capacity = parseInt(updates.seating_capacity) || null;
      }
      if ("cubic_capacity" in updates && updates.cubic_capacity !== null) {
        updates.cubic_capacity = parseInt(updates.cubic_capacity) || null;
      }
      if ("owner_count" in updates && updates.owner_count !== null) {
        updates.owner_count = parseInt(updates.owner_count) || null;
      }

      const { error } = await supabase
        .from("vehicles")
        .update(updates)
        .eq("id", vehicle.id);

      if (error) throw error;

      // Log the event
      const changedFields = Object.keys(pendingChanges);
      await logVehicleEvent({
        vehicleId: vehicle.id,
        eventType: "details_updated",
        description: `Manually updated ${changedFields.length} field(s): ${changedFields.join(", ")}`,
        metadata: { changedFields, previousValues: changedFields.reduce((acc, f) => ({ ...acc, [f]: (vehicle as any)[f] }), {}) },
      });

      // Refresh vehicle data
      await fetchVehicle();

      toast({
        title: "Changes saved",
        description: `Updated ${changedFields.length} field(s) successfully.`,
      });

      setPendingChanges({});
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: "Error saving changes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setPendingChanges({});
    setIsEditing(false);
  };

  // Preprocess image: resize and compress for AI analysis
  const preprocessImage = async (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      img.onload = () => {
        // Max dimension for AI processing
        const MAX_SIZE = 1536;
        let { width, height } = img;

        // Resize if needed
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

        // Convert to JPEG with 85% quality
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const base64 = dataUrl.split(",")[1];
        resolve({ base64, mimeType: "image/jpeg" });
      };

      img.onerror = () => reject(new Error("Failed to load image"));

      // Create object URL from file
      img.src = URL.createObjectURL(file);
    });
  };

  // Analyze document with AI
  const analyzeDocumentWithAI = async (file: File) => {
    setIsAnalyzing(true);
    try {
      // Preprocess image (resize and compress)
      const { base64, mimeType } = await preprocessImage(file);
      
      console.log(`Sending image for analysis: ${Math.round(base64.length * 0.75 / 1024)}KB`);

      const response = await supabase.functions.invoke("analyze-document", {
        body: {
          documentBase64: base64,
          documentType: selectedDocType,
          mimeType: mimeType,
          vehicleContext: {
            registration_number: vehicle?.registration_number,
            current_values: vehicle,
          },
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      if (!data.success) {
        // Handle specific error types
        if (data.errorType === "rate_limit") {
          toast({
            title: "Please wait",
            description: "Too many requests. Please try again in a moment.",
            variant: "destructive",
          });
          return;
        }
        if (data.errorType === "image_too_large") {
          toast({
            title: "Image too large",
            description: "Please upload a smaller image.",
            variant: "destructive",
          });
          return;
        }
        throw new Error(data.error || "Analysis failed");
      }

      if (Object.keys(data.extractedFields).length === 0) {
        toast({
          title: "No data extracted",
          description: "Could not extract any fields from this document. Try a clearer image.",
          variant: "destructive",
        });
        return;
      }

      setAnalysisResult({
        extractedFields: data.extractedFields,
        confidence: data.confidence,
        documentType: data.documentTypeDetected || selectedDocType,
      });
      setShowAnalysisModal(true);
    } catch (error: any) {
      console.error("AI analysis error:", error);
      toast({
        title: "Analysis failed",
        description: error.message || "Could not analyze the document",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Apply AI-extracted fields
  const handleApplyExtractedFields = async (selectedFields: Record<string, any>) => {
    if (!vehicle) return;

    try {
      // Convert numeric fields
      const updates = { ...selectedFields };
      if ("seating_capacity" in updates && updates.seating_capacity !== null) {
        updates.seating_capacity = parseInt(updates.seating_capacity) || null;
      }
      if ("cubic_capacity" in updates && updates.cubic_capacity !== null) {
        updates.cubic_capacity = parseInt(updates.cubic_capacity) || null;
      }
      if ("owner_count" in updates && updates.owner_count !== null) {
        updates.owner_count = parseInt(updates.owner_count) || null;
      }

      const { error } = await supabase
        .from("vehicles")
        .update(updates)
        .eq("id", vehicle.id);

      if (error) throw error;

      // Update document type if we have a pending document and AI detected the type
      if (lastUploadedDocId && analysisResult?.documentType && analysisResult.documentType !== "auto") {
        await supabase
          .from("documents")
          .update({ document_type: analysisResult.documentType })
          .eq("id", lastUploadedDocId);
        
        setLastUploadedDocId(null);
        fetchDocuments(); // Refresh to show updated document type
      }

      // Log the event
      const changedFields = Object.keys(selectedFields);
      await logVehicleEvent({
        vehicleId: vehicle.id,
        eventType: "ai_extraction",
        description: `AI extracted and applied ${changedFields.length} field(s) from ${analysisResult?.documentType || "document"}`,
        metadata: { 
          changedFields, 
          extractedValues: selectedFields,
          confidence: analysisResult?.confidence,
          detectedDocumentType: analysisResult?.documentType
        },
      });

      await fetchVehicle();

      toast({
        title: "Fields updated",
        description: `Applied ${changedFields.length} field(s) from document analysis.`,
      });

      setShowAnalysisModal(false);
      setAnalysisResult(null);
    } catch (error: any) {
      toast({
        title: "Error applying changes",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or image file (JPEG, PNG, WebP)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 5MB",
        variant: "destructive",
      });
      return;
    }

    // Store the file and show consent dialog
    setPendingUploadFile(file);
    setShowUploadConsent(true);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const processFileUpload = async () => {
    if (!pendingUploadFile) return;

    const file = pendingUploadFile;
    setShowUploadConsent(false);

    // Start AI analysis for image files (not PDF)
    const isImage = file.type.startsWith("image/");
    if (isImage) {
      analyzeDocumentWithAI(file);
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${selectedDocType}.${fileExt}`;
      const filePath = `${user.id}/${id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("vehicle-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: insertedDoc, error: dbError } = await supabase.from("documents").insert({
        vehicle_id: id,
        user_id: user.id,
        document_type: selectedDocType === "auto" ? "other" : selectedDocType,
        document_name: file.name,
        file_path: filePath,
        file_size: file.size,
      }).select("id").single();

      if (dbError) throw dbError;

      // Store the document ID for updating after AI detection
      if (insertedDoc && selectedDocType === "auto") {
        setLastUploadedDocId(insertedDoc.id);
      }

      await logVehicleEvent({
        vehicleId: id!,
        eventType: "document_uploaded",
        description: `Uploaded ${documentTypes.find(t => t.value === selectedDocType)?.label || selectedDocType}`,
        metadata: { fileName: file.name, fileSize: file.size, documentType: selectedDocType },
      });

      toast({
        title: "Document uploaded",
        description: `${file.name} has been uploaded successfully.`,
      });

      fetchDocuments();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setPendingUploadFile(null);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from("vehicle-documents")
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.document_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Re-analyze an existing document with AI
  const handleReanalyzeDocument = async (doc: Document) => {
    // Only allow image files
    const isImage = doc.file_path.match(/\.(jpg|jpeg|png|webp)$/i);
    if (!isImage) {
      toast({
        title: "Not supported",
        description: "AI scanning is only available for image documents (JPG, PNG, WebP).",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      // Download the file from storage
      const { data: fileBlob, error } = await supabase.storage
        .from("vehicle-documents")
        .download(doc.file_path);

      if (error) throw error;

      // Convert blob to File
      const file = new File([fileBlob], doc.document_name, { type: fileBlob.type || "image/jpeg" });
      
      // Set the document type for context
      setSelectedDocType(doc.document_type);
      
      // Preprocess and analyze
      const { base64, mimeType } = await preprocessImage(file);
      
      console.log(`Re-analyzing document: ${Math.round(base64.length * 0.75 / 1024)}KB`);

      const response = await supabase.functions.invoke("analyze-document", {
        body: {
          documentBase64: base64,
          documentType: doc.document_type,
          mimeType: mimeType,
          vehicleContext: {
            registration_number: vehicle?.registration_number,
            current_values: vehicle,
          },
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
        throw new Error(data.error || "Analysis failed");
      }

      if (Object.keys(data.extractedFields).length === 0) {
        toast({
          title: "No data extracted",
          description: "Could not extract any fields from this document. Try a clearer image.",
          variant: "destructive",
        });
        return;
      }

      setAnalysisResult({
        extractedFields: data.extractedFields,
        confidence: data.confidence,
        documentType: data.documentTypeDetected || doc.document_type,
      });
      setShowAnalysisModal(true);
    } catch (error: any) {
      console.error("AI re-analysis error:", error);
      toast({
        title: "Analysis failed",
        description: error.message || "Could not analyze the document",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteDocument = async (doc: Document) => {
    try {
      const { error: storageError } = await supabase.storage
        .from("vehicle-documents")
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("documents")
        .delete()
        .eq("id", doc.id);

      if (dbError) throw dbError;

      await logVehicleEvent({
        vehicleId: id!,
        eventType: "document_deleted",
        description: `Deleted ${documentTypes.find(t => t.value === doc.document_type)?.label || doc.document_type}`,
        metadata: { fileName: doc.document_name, documentType: doc.document_type },
      });

      setDocuments(documents.filter((d) => d.id !== doc.id));
      toast({
        title: "Document deleted",
        description: "The document has been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!vehicle) return null;

  const registrationYear = vehicle.registration_date 
    ? new Date(vehicle.registration_date).getFullYear() 
    : null;

  const expiryItems = [
    { label: "Insurance", date: vehicle.insurance_expiry, company: vehicle.insurance_company, fieldName: "insurance_expiry" },
    { label: "PUCC Certificate", date: vehicle.pucc_valid_upto, fieldName: "pucc_valid_upto" },
    { label: "Fitness Certificate", date: vehicle.fitness_valid_upto, fieldName: "fitness_valid_upto" },
    { label: "Road Tax", date: vehicle.road_tax_valid_upto, fieldName: "road_tax_valid_upto" },
  ];

  const timeUntilRefresh = getTimeUntilRefresh();
  const hasChanges = Object.keys(pendingChanges).length > 0;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold">Valt</h1>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Verification Progress - Global, always visible */}
        <VerificationProgress 
          progress={calculateVerificationProgress(vehicle, documents)} 
          variant="card"
        />

        {/* Vehicle Hero Section */}
        <div className="bg-background border border-border rounded-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Left: Vehicle Info */}
            <div className="flex items-start gap-4">
              {vehicle.verification_photo_path ? (
                <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border flex-shrink-0">
                  <VehicleProfileImage filePath={vehicle.verification_photo_path} />
                </div>
              ) : (
                <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 border border-border">
                  <Car className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h2 className="text-2xl font-mono font-semibold">{vehicle.registration_number}</h2>
                  {vehicle.rc_status && (
                    <Badge variant={vehicle.rc_status === "ACTIVE" ? "default" : "destructive"}>
                      {vehicle.rc_status}
                    </Badge>
                  )}
                  {vehicle.is_verified && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">
                  {vehicle.manufacturer && <span>{toTitleCase(vehicle.manufacturer)}</span>}
                  {vehicle.maker_model && vehicle.manufacturer && " • "}
                  {vehicle.maker_model && <span>{toTitleCase(vehicle.maker_model)}</span>}
                  {!vehicle.manufacturer && !vehicle.maker_model && "Vehicle Details"}
                </p>
                {/* Quick Stats */}
                <div className="flex flex-wrap gap-4 mt-3 text-sm">
                  {vehicle.fuel_type && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Fuel className="h-4 w-4" />
                      <span>{toTitleCase(vehicle.fuel_type)}</span>
                    </div>
                  )}
                  {registrationYear && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{registrationYear}</span>
                    </div>
                  )}
                  {vehicle.owner_count !== null && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{vehicle.owner_count === 1 ? "1st Owner" : `${vehicle.owner_count} Owners`}</span>
                    </div>
                  )}
                  {vehicle.color && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Palette className="h-4 w-4" />
                      <span>{toTitleCase(vehicle.color)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <div className="flex flex-wrap gap-2 justify-end">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveChanges}
                      disabled={isSaving || !hasChanges}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <TransferVehicleDialog
                      vehicleId={vehicle.id}
                      vehicleNumber={vehicle.registration_number}
                      vehicleModel={vehicle.maker_model || vehicle.manufacturer}
                      onTransferInitiated={fetchVehicle}
                    />
                    <Button
                      variant={canRefresh ? "default" : "outline"}
                      size="sm"
                      onClick={refreshVehicleData}
                      disabled={!canRefresh || isRefreshing}
                    >
                      {isRefreshing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Refreshing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {isEditing ? (
                  hasChanges ? `${Object.keys(pendingChanges).length} unsaved change(s)` : "Click on fields to edit"
                ) : vehicle.data_last_fetched_at ? (
                  timeUntilRefresh ? (
                    `Can refresh in ${timeUntilRefresh.hours}h ${timeUntilRefresh.minutes}m`
                  ) : (
                    `Updated ${formatDistanceToNow(new Date(vehicle.data_last_fetched_at), { addSuffix: true })}`
                  )
                ) : (
                  "Never fetched – Refresh now"
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start bg-background border border-border rounded-lg h-auto p-1 mb-6 flex-wrap">
            <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="specifications" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Car className="h-4 w-4" />
              <span className="hidden sm:inline">Specifications</span>
            </TabsTrigger>
            <TabsTrigger value="ownership" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Ownership</span>
            </TabsTrigger>
            <TabsTrigger value="verification" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Verification</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileStack className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
            <TabsTrigger value="service" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">Service</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - Expiry Intelligence Only */}
          <TabsContent value="overview" className="mt-0">
            <ExpiryIntelligence vehicle={vehicle} />
          </TabsContent>

          {/* Specifications Tab - Vehicle Identity + Technical Specs */}
          <TabsContent value="specifications" className="mt-0">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Vehicle Identity */}
              <div className="bg-background border border-border rounded-lg p-6">
                <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
                  <Car className="h-5 w-5 text-muted-foreground" />
                  Vehicle Identity
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailItem label="Registration Number" value={vehicle.registration_number} />
                  <EditableDetailItem
                    label="Manufacturer"
                    value={getCurrentValue("manufacturer")}
                    fieldName="manufacturer"
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                    normalize
                  />
                  <EditableDetailItem
                    label="Model"
                    value={getCurrentValue("maker_model")}
                    fieldName="maker_model"
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                    normalize
                  />
                  <EditableDetailItem
                    label="Vehicle Class"
                    value={getCurrentValue("vehicle_class")}
                    fieldName="vehicle_class"
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                  />
                  <EditableDetailItem
                    label="Vehicle Category"
                    value={getCurrentValue("vehicle_category")}
                    fieldName="vehicle_category"
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                  />
                  <EditableDetailItem
                    label="Body Type"
                    value={getCurrentValue("body_type")}
                    fieldName="body_type"
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                  />
                  <EditableDetailItem
                    label="Color"
                    value={getCurrentValue("color")}
                    fieldName="color"
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                    normalize
                  />
                  <EditableDetailItem
                    label="Registration Date"
                    value={getCurrentValue("registration_date")}
                    fieldName="registration_date"
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                    inputType="date"
                  />
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">RC Status</span>
                    <div>
                      {vehicle.rc_status ? (
                        <Badge variant={vehicle.rc_status === "ACTIVE" ? "default" : "destructive"}>
                          {vehicle.rc_status}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground italic">Not Available</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="bg-background border border-border rounded-lg p-6">
                <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  Technical Specifications
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <EditableDetailItem
                    label="Engine Number"
                    value={getCurrentValue("engine_number")}
                    fieldName="engine_number"
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                    icon={<Hash className="h-3.5 w-3.5" />}
                  />
                  <EditableDetailItem
                    label="Chassis Number"
                    value={getCurrentValue("chassis_number")}
                    fieldName="chassis_number"
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                    icon={<Hash className="h-3.5 w-3.5" />}
                  />
                  <EditableDetailItem
                    label="Cubic Capacity (cc)"
                    value={getCurrentValue("cubic_capacity")}
                    fieldName="cubic_capacity"
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                    inputType="number"
                    icon={<Gauge className="h-3.5 w-3.5" />}
                  />
                  <EditableDetailItem
                    label="Fuel Type"
                    value={getCurrentValue("fuel_type")}
                    fieldName="fuel_type"
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                    icon={<Fuel className="h-3.5 w-3.5" />}
                  />
                  <EditableDetailItem
                    label="Seating Capacity"
                    value={getCurrentValue("seating_capacity")}
                    fieldName="seating_capacity"
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                    inputType="number"
                    icon={<Users className="h-3.5 w-3.5" />}
                  />
                  <EditableDetailItem
                    label="Emission Norms"
                    value={getCurrentValue("emission_norms")}
                    fieldName="emission_norms"
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                    icon={<FileCheck className="h-3.5 w-3.5" />}
                  />
                  <EditableDetailItem
                    label="Wheelbase"
                    value={getCurrentValue("wheelbase")}
                    fieldName="wheelbase"
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                    icon={<Weight className="h-3.5 w-3.5" />}
                  />
                  <EditableDetailItem
                    label="Gross Vehicle Weight"
                    value={getCurrentValue("gross_vehicle_weight")}
                    fieldName="gross_vehicle_weight"
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                    icon={<Weight className="h-3.5 w-3.5" />}
                  />
                  <EditableDetailItem
                    label="Unladen Weight"
                    value={getCurrentValue("unladen_weight")}
                    fieldName="unladen_weight"
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                    icon={<Weight className="h-3.5 w-3.5" />}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Ownership Tab - Ownership & Finance + Document Expiry Status */}
          <TabsContent value="ownership" className="mt-0">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Ownership & Finance */}
              <div className="bg-background border border-border rounded-lg p-6">
                <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
                  <User className="h-5 w-5 text-muted-foreground" />
                  Ownership & Finance
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <EditableDetailItem
                    label="Owner Name"
                    value={getCurrentValue("owner_name")}
                    fieldName="owner_name"
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                    icon={<User className="h-3.5 w-3.5" />}
                    normalize
                  />
                  <EditableDetailItem
                    label="Owner Count"
                    value={getCurrentValue("owner_count")}
                    fieldName="owner_count"
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                    inputType="number"
                    icon={<Users className="h-3.5 w-3.5" />}
                  />
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Banknote className="h-3.5 w-3.5" />
                      Finance Status
                    </span>
                    <div>
                      <Badge variant={vehicle.is_financed ? "destructive" : "default"}>
                        {vehicle.is_financed ? "Financed" : "Not Financed"}
                      </Badge>
                    </div>
                  </div>
                  <EditableDetailItem
                    label="Financer"
                    value={getCurrentValue("financer")}
                    fieldName="financer"
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                    icon={<Banknote className="h-3.5 w-3.5" />}
                    normalize
                  />
                  <EditableDetailItem
                    label="NOC Details"
                    value={getCurrentValue("noc_details")}
                    fieldName="noc_details"
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                    icon={<FileCheck className="h-3.5 w-3.5" />}
                  />
                </div>
              </div>

              {/* Document Expiry Status */}
              <div className="bg-background border border-border rounded-lg p-6">
                <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  Document Expiry Status
                </h3>
                {isEditing ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <EditableDetailItem
                      label="Insurance Expiry"
                      value={getCurrentValue("insurance_expiry")}
                      fieldName="insurance_expiry"
                      isEditing={isEditing}
                      onChange={handleFieldChange}
                      inputType="date"
                    />
                    <EditableDetailItem
                      label="Insurance Company"
                      value={getCurrentValue("insurance_company")}
                      fieldName="insurance_company"
                      isEditing={isEditing}
                      onChange={handleFieldChange}
                      normalize
                    />
                    <EditableDetailItem
                      label="PUCC Valid Until"
                      value={getCurrentValue("pucc_valid_upto")}
                      fieldName="pucc_valid_upto"
                      isEditing={isEditing}
                      onChange={handleFieldChange}
                      inputType="date"
                    />
                    <EditableDetailItem
                      label="Fitness Valid Until"
                      value={getCurrentValue("fitness_valid_upto")}
                      fieldName="fitness_valid_upto"
                      isEditing={isEditing}
                      onChange={handleFieldChange}
                      inputType="date"
                    />
                    <EditableDetailItem
                      label="Road Tax Valid Until"
                      value={getCurrentValue("road_tax_valid_upto")}
                      fieldName="road_tax_valid_upto"
                      isEditing={isEditing}
                      onChange={handleFieldChange}
                      inputType="date"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {expiryItems.map((item) => {
                      const status = getExpiryStatus(item.date);
                      return (
                        <div key={item.label} className="flex items-center justify-between p-3 rounded-lg border border-border">
                          <div>
                            <p className="font-medium text-sm">{item.label}</p>
                            {item.date ? (
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(item.date), "dd MMM yyyy")}
                                {item.company && ` • ${item.company}`}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground">Not available</p>
                            )}
                          </div>
                          {status && (
                            <Badge variant={status.variant} className="flex items-center gap-1">
                              <status.icon className="h-3 w-3" />
                              {status.label}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Verification Tab */}
          <TabsContent value="verification" className="mt-0">
            <div className="space-y-6">
              {/* Photo Verification */}
              <VehicleVerificationSection
                vehicleId={vehicle.id}
                registrationNumber={vehicle.registration_number}
                isVerified={vehicle.is_verified}
                verifiedAt={vehicle.verified_at}
                verificationPhotoPath={vehicle.verification_photo_path}
                onVerificationComplete={fetchVehicle}
                variant="inline"
              />
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="mt-0">
            <div className="space-y-6">
              {/* Document Repository */}
              <div className="bg-background border border-border rounded-lg p-6">
                <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  Document Repository
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload documents to store them and optionally extract data using AI
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <Label htmlFor="docType" className="text-sm">Document Type</Label>
                    <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      className="hidden"
                    />
                    <Button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                          Analyzing...
                        </>
                      ) : uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Document
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                {isAnalyzing && (
                  <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                    <span>AI is analyzing your document to extract vehicle data...</span>
                  </div>
                )}

                {documents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No documents uploaded yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{doc.document_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {documentTypes.find((t) => t.value === doc.document_type)?.label} • 
                              {format(new Date(doc.uploaded_at), " dd MMM yyyy")}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {doc.file_path.match(/\.(jpg|jpeg|png|webp)$/i) && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleReanalyzeDocument(doc)}
                              disabled={isAnalyzing}
                              title="Scan with AI"
                            >
                              <Sparkles className="h-4 w-4 text-primary" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)} title="Download">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteDocument(doc)} title="Delete">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Service Tab */}
          <TabsContent value="service" className="mt-0">
            <ServiceHistory 
              vehicleId={vehicle.id} 
              registrationNumber={vehicle.registration_number} 
              variant="inline"
            />
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="mt-0">
            <VehicleHistory vehicleId={vehicle.id} variant="inline" />
          </TabsContent>
        </Tabs>
      </main>

      {/* AI Analysis Modal */}
      {analysisResult && (
        <DocumentAnalysisModal
          open={showAnalysisModal}
          onOpenChange={setShowAnalysisModal}
          extractedFields={analysisResult.extractedFields}
          currentValues={vehicle}
          confidence={analysisResult.confidence}
          documentType={analysisResult.documentType}
          onApply={handleApplyExtractedFields}
        />
      )}

      {/* Upload Consent Dialog */}
      <UploadConsentDialog
        open={showUploadConsent}
        onOpenChange={(open) => {
          if (!open) {
            setPendingUploadFile(null);
          }
          setShowUploadConsent(open);
        }}
        onConfirm={processFileUpload}
      />
    </div>
  );
};

export default VehicleDetails;
