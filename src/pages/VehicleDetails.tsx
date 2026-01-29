import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, FileText, Trash2, Download, 
  AlertTriangle, CheckCircle, Clock, Car, Calendar,
  User, Fuel, Palette, Users, Banknote, Hash,
  Gauge, FileCheck, RefreshCw, Loader2, Pencil, Save, X, Sparkles,
  Settings, ChevronLeft, Shield, ChevronRight, Info
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
import SellVehicleTab from "@/components/vehicle/SellVehicleTab";
import ChallanTab from "@/components/vehicle/ChallanTab";
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
    return { status: "expired", label: "Expired", variant: "destructive" as const, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" };
  } else if (daysLeft <= 30) {
    return { status: "expiring", label: `${daysLeft}d left`, variant: "secondary" as const, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" };
  } else {
    return { status: "valid", label: "Valid", variant: "default" as const, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" };
  }
};

// Section Card Component
const SectionCard = ({ 
  title, 
  icon: Icon, 
  children,
  className = "",
  actions
}: { 
  title: string; 
  icon: React.ComponentType<{ className?: string }>; 
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}) => (
  <div className={`bg-white border border-gray-100 rounded-xl p-4 sm:p-6 ${className}`}>
    <div className="flex items-center justify-between mb-4 sm:mb-6">
      <h3 className="text-sm sm:text-base font-medium text-gray-900 flex items-center gap-2">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
        {title}
      </h3>
      {actions}
    </div>
    {children}
  </div>
);

// Quick Status Card for Overview
const QuickStatusCard = ({ 
  label, 
  date, 
  onClick 
}: { 
  label: string; 
  date: string | null; 
  onClick?: () => void;
}) => {
  const status = getExpiryStatus(date);
  
  return (
    <button
      onClick={onClick}
      className={`p-3 sm:p-4 rounded-xl border text-left transition-all hover:shadow-sm w-full ${
        status?.status === "expired" 
          ? "bg-red-50 border-red-100 hover:border-red-200" 
          : status?.status === "expiring"
          ? "bg-amber-50 border-amber-100 hover:border-amber-200"
          : "bg-green-50 border-green-100 hover:border-green-200"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs sm:text-sm font-medium text-gray-700">{label}</span>
        {status && <status.icon className={`h-4 w-4 ${status.color}`} />}
      </div>
      <p className={`text-sm font-semibold ${status?.color || "text-gray-400"}`}>
        {status ? status.label : "Not set"}
      </p>
      {date && (
        <p className="text-xs text-gray-500 mt-1 hidden sm:block">
          {format(new Date(date), "dd MMM yyyy")}
        </p>
      )}
    </button>
  );
};

const VehicleDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("auto");
  const [activeTab, setActiveTab] = useState("overview");
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

      const changedFields = Object.keys(pendingChanges);
      await logVehicleEvent({
        vehicleId: vehicle.id,
        eventType: "details_updated",
        description: `Manually updated ${changedFields.length} field(s): ${changedFields.join(", ")}`,
        metadata: { changedFields, previousValues: changedFields.reduce((acc, f) => ({ ...acc, [f]: (vehicle as any)[f] }), {}) },
      });

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

  const handleCancelEdit = () => {
    setPendingChanges({});
    setIsEditing(false);
  };

  // Preprocess image
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

  // Analyze document with AI
  const analyzeDocumentWithAI = async (file: File) => {
    setIsAnalyzing(true);
    try {
      const { base64, mimeType } = await preprocessImage(file);

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

      if (response.error) throw new Error(response.error.message);

      const data = response.data;
      if (!data.success) {
        if (data.errorType === "rate_limit") {
          toast({ title: "Please wait", description: "Too many requests. Please try again in a moment.", variant: "destructive" });
          return;
        }
        throw new Error(data.error || "Analysis failed");
      }

      if (Object.keys(data.extractedFields).length === 0) {
        toast({ title: "No data extracted", description: "Could not extract any fields from this document.", variant: "destructive" });
        return;
      }

      setAnalysisResult({
        extractedFields: data.extractedFields,
        confidence: data.confidence,
        documentType: data.documentTypeDetected || selectedDocType,
      });
      setShowAnalysisModal(true);
    } catch (error: any) {
      toast({ title: "Analysis failed", description: error.message || "Could not analyze the document", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Apply AI-extracted fields
  const handleApplyExtractedFields = async (selectedFields: Record<string, any>) => {
    if (!vehicle) return;

    try {
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

      const { error } = await supabase.from("vehicles").update(updates).eq("id", vehicle.id);
      if (error) throw error;

      if (lastUploadedDocId && analysisResult?.documentType && analysisResult.documentType !== "auto") {
        await supabase.from("documents").update({ document_type: analysisResult.documentType }).eq("id", lastUploadedDocId);
        setLastUploadedDocId(null);
        fetchDocuments();
      }

      const changedFields = Object.keys(selectedFields);
      await logVehicleEvent({
        vehicleId: vehicle.id,
        eventType: "ai_extraction",
        description: `AI extracted and applied ${changedFields.length} field(s)`,
        metadata: { changedFields, extractedValues: selectedFields, confidence: analysisResult?.confidence },
      });

      await fetchVehicle();
      toast({ title: "Fields updated", description: `Applied ${changedFields.length} field(s) from document analysis.` });
      setShowAnalysisModal(false);
      setAnalysisResult(null);
    } catch (error: any) {
      toast({ title: "Error applying changes", description: error.message, variant: "destructive" });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a PDF or image file", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 5MB", variant: "destructive" });
      return;
    }

    setPendingUploadFile(file);
    setShowUploadConsent(true);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const processFileUpload = async () => {
    if (!pendingUploadFile) return;

    const file = pendingUploadFile;
    setShowUploadConsent(false);

    const isImage = file.type.startsWith("image/");
    if (isImage) analyzeDocumentWithAI(file);

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${selectedDocType}.${fileExt}`;
      const filePath = `${user.id}/${id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("vehicle-documents").upload(filePath, file);
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

      if (insertedDoc && selectedDocType === "auto") setLastUploadedDocId(insertedDoc.id);

      await logVehicleEvent({
        vehicleId: id!,
        eventType: "document_uploaded",
        description: `Uploaded ${documentTypes.find(t => t.value === selectedDocType)?.label || selectedDocType}`,
        metadata: { fileName: file.name, fileSize: file.size, documentType: selectedDocType },
      });

      toast({ title: "Document uploaded", description: `${file.name} has been uploaded successfully.` });
      fetchDocuments();
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
      setPendingUploadFile(null);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage.from("vehicle-documents").download(doc.file_path);
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.document_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({ title: "Download failed", description: error.message, variant: "destructive" });
    }
  };

  const handleReanalyzeDocument = async (doc: Document) => {
    const isImage = doc.file_path.match(/\.(jpg|jpeg|png|webp)$/i);
    if (!isImage) {
      toast({ title: "Not supported", description: "AI scanning is only available for image documents.", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data: fileBlob, error } = await supabase.storage.from("vehicle-documents").download(doc.file_path);
      if (error) throw error;

      const file = new File([fileBlob], doc.document_name, { type: fileBlob.type || "image/jpeg" });
      setSelectedDocType(doc.document_type);
      const { base64, mimeType } = await preprocessImage(file);

      const response = await supabase.functions.invoke("analyze-document", {
        body: {
          documentBase64: base64,
          documentType: doc.document_type,
          mimeType: mimeType,
          vehicleContext: { registration_number: vehicle?.registration_number, current_values: vehicle },
        },
      });

      if (response.error) throw new Error(response.error.message);

      const data = response.data;
      if (!data.success) throw new Error(data.error || "Analysis failed");

      if (Object.keys(data.extractedFields).length === 0) {
        toast({ title: "No data extracted", description: "Could not extract any fields.", variant: "destructive" });
        return;
      }

      setAnalysisResult({
        extractedFields: data.extractedFields,
        confidence: data.confidence,
        documentType: data.documentTypeDetected || doc.document_type,
      });
      setShowAnalysisModal(true);
    } catch (error: any) {
      toast({ title: "Analysis failed", description: error.message, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteDocument = async (doc: Document) => {
    try {
      await supabase.storage.from("vehicle-documents").remove([doc.file_path]);
      await supabase.from("documents").delete().eq("id", doc.id);

      await logVehicleEvent({
        vehicleId: id!,
        eventType: "document_deleted",
        description: `Deleted ${documentTypes.find(t => t.value === doc.document_type)?.label || doc.document_type}`,
        metadata: { fileName: doc.document_name, documentType: doc.document_type },
      });

      setDocuments(documents.filter((d) => d.id !== doc.id));
      toast({ title: "Document deleted", description: "The document has been removed." });
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to delete document", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-50 bg-white border-b border-gray-100">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 h-16 flex items-center">
            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8">
          <div className="h-32 bg-white border border-gray-100 rounded-xl animate-pulse mb-6" />
          <div className="h-64 bg-white border border-gray-100 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!vehicle) return null;

  const registrationYear = vehicle.registration_date ? new Date(vehicle.registration_date).getFullYear() : null;
  const timeUntilRefresh = getTimeUntilRefresh();
  const hasChanges = Object.keys(pendingChanges).length > 0;
  const verificationProgress = calculateVerificationProgress(vehicle, documents);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100"
      >
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group">
            <ChevronLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm font-medium hidden sm:inline">Back to Dashboard</span>
          </Link>
          
          {/* Quick Actions in Header */}
          <div className="flex items-center gap-2">
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
              {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8">
        {/* Vehicle Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-gray-100 rounded-xl p-6 mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Left: Vehicle Info */}
            <div className="flex items-center gap-4">
              {vehicle.verification_photo_path ? (
                <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-gray-100 flex-shrink-0">
                  <VehicleProfileImage filePath={vehicle.verification_photo_path} />
                </div>
              ) : (
                <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Car className="h-6 w-6 text-gray-400" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-0.5 flex-wrap">
                  <h2 className="text-xl font-mono font-semibold text-gray-900">{vehicle.registration_number}</h2>
                  {vehicle.is_verified ? (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Not Verified
                    </Badge>
                  )}
                </div>
                <p className="text-gray-500 text-sm">
                  {vehicle.manufacturer && <span>{toTitleCase(vehicle.manufacturer)}</span>}
                  {vehicle.maker_model && vehicle.manufacturer && " · "}
                  {vehicle.maker_model && <span>{toTitleCase(vehicle.maker_model)}</span>}
                  {vehicle.fuel_type && <span className="text-gray-400"> · {toTitleCase(vehicle.fuel_type)}</span>}
                  {registrationYear && <span className="text-gray-400"> · {registrationYear}</span>}
                </p>
              </div>
            </div>

            {/* Right: Last updated */}
            <div className="text-right text-xs text-gray-400">
              {vehicle.data_last_fetched_at
                ? timeUntilRefresh
                  ? `Can refresh in ${timeUntilRefresh.hours}h ${timeUntilRefresh.minutes}m`
                  : `Updated ${formatDistanceToNow(new Date(vehicle.data_last_fetched_at), { addSuffix: true })}`
                : "Never fetched from RTO"}
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start bg-white border border-gray-100 rounded-xl h-auto p-1 mb-8 flex-wrap gap-1">
              <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-gray-900 data-[state=active]:text-white">
                Overview
              </TabsTrigger>
              <TabsTrigger value="details" className="rounded-lg data-[state=active]:bg-gray-900 data-[state=active]:text-white">
                Details
              </TabsTrigger>
              <TabsTrigger value="verification" className="rounded-lg data-[state=active]:bg-gray-900 data-[state=active]:text-white">
                Verification
              </TabsTrigger>
              <TabsTrigger value="documents" className="rounded-lg data-[state=active]:bg-gray-900 data-[state=active]:text-white">
                Documents
              </TabsTrigger>
              <TabsTrigger value="service" className="rounded-lg data-[state=active]:bg-gray-900 data-[state=active]:text-white">
                Service
              </TabsTrigger>
              <TabsTrigger value="activity" className="rounded-lg data-[state=active]:bg-gray-900 data-[state=active]:text-white">
                Activity
              </TabsTrigger>
              <TabsTrigger value="challan" className="rounded-lg data-[state=active]:bg-gray-900 data-[state=active]:text-white">
                Challan
              </TabsTrigger>
              <TabsTrigger value="sell" className="rounded-lg data-[state=active]:bg-gray-900 data-[state=active]:text-white">
                Sell
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab - Quick Look */}
            <TabsContent value="overview" className="mt-0 space-y-6">
              {/* Expiry Intelligence */}
              <ExpiryIntelligence vehicle={vehicle} />

              {/* Quick Status Grid */}
              <div className="grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-4">
                <QuickStatusCard 
                  label="Insurance" 
                  date={vehicle.insurance_expiry} 
                  onClick={() => setActiveTab("details")}
                />
                <QuickStatusCard 
                  label="PUCC" 
                  date={vehicle.pucc_valid_upto} 
                  onClick={() => setActiveTab("details")}
                />
                <QuickStatusCard 
                  label="Fitness" 
                  date={vehicle.fitness_valid_upto} 
                  onClick={() => setActiveTab("details")}
                />
                <QuickStatusCard 
                  label="Road Tax" 
                  date={vehicle.road_tax_valid_upto} 
                  onClick={() => setActiveTab("details")}
                />
              </div>

              {/* Verification & Documents Summary */}
              <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {/* Verification Status */}
                <button 
                  onClick={() => setActiveTab("verification")}
                  className="bg-white border border-gray-100 rounded-xl p-6 text-left hover:border-gray-200 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-medium text-gray-900 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-gray-400" />
                      Verification Status
                    </h3>
                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <VerificationProgress progress={verificationProgress} variant="inline" />
                  {!vehicle.is_verified && (
                    <p className="text-sm text-gray-500 mt-3">
                      Complete verification to unlock all features
                    </p>
                  )}
                </button>

                {/* Documents Summary */}
                <button 
                  onClick={() => setActiveTab("documents")}
                  className="bg-white border border-gray-100 rounded-xl p-6 text-left hover:border-gray-200 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-medium text-gray-900 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-gray-400" />
                      Documents
                    </h3>
                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-semibold text-gray-900">{documents.length}</div>
                    <div className="text-sm text-gray-500">
                      {documents.length === 0 
                        ? "No documents uploaded" 
                        : documents.length === 1 
                        ? "document uploaded" 
                        : "documents uploaded"}
                    </div>
                  </div>
                  {documents.length === 0 && (
                    <p className="text-sm text-gray-500 mt-3">
                      Upload RC, insurance, and other documents
                    </p>
                  )}
                </button>
              </div>

              {/* Quick Info Card */}
              <div className="bg-white border border-gray-100 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-medium text-gray-900 flex items-center gap-2">
                    <Info className="h-5 w-5 text-gray-400" />
                    Quick Info
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("details")} className="text-gray-500">
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <div className="grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Owner</p>
                    <p className="font-medium text-gray-900 text-sm">{vehicle.owner_name ? toTitleCase(vehicle.owner_name) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Owner Count</p>
                    <p className="font-medium text-gray-900 text-sm">{vehicle.owner_count || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Finance Status</p>
                    <Badge variant={vehicle.is_financed ? "destructive" : "outline"} className={`text-xs ${vehicle.is_financed ? "" : "text-green-600 border-green-200"}`}>
                      {vehicle.is_financed ? "Financed" : "Not Financed"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">RC Status</p>
                    <p className={`font-medium text-sm ${vehicle.rc_status === "ACTIVE" ? "text-green-600" : "text-gray-900"}`}>
                      {vehicle.rc_status || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Details Tab - Full Vehicle Info with Edit */}
            <TabsContent value="details" className="mt-0 space-y-6">
              {/* Edit Controls */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {isEditing 
                    ? hasChanges 
                      ? `${Object.keys(pendingChanges).length} unsaved change(s)` 
                      : "Click on fields to edit"
                    : "View and edit vehicle information"}
                </p>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={isSaving}>
                        <X className="h-4 w-4 mr-1.5" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveChanges} disabled={isSaving || !hasChanges}>
                        {isSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                        {isSaving ? "Saving..." : "Save Changes"}
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      <Pencil className="h-4 w-4 mr-1.5" />
                      Edit Details
                    </Button>
                  )}
                </div>
              </div>

              {/* Vehicle Details Grid */}
              <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {/* Vehicle Identity */}
                <SectionCard title="Vehicle Identity" icon={Car}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <DetailItem label="Registration Number" value={vehicle.registration_number} />
                    <EditableDetailItem label="Manufacturer" value={getCurrentValue("manufacturer")} fieldName="manufacturer" isEditing={isEditing} onChange={handleFieldChange} normalize />
                    <EditableDetailItem label="Model" value={getCurrentValue("maker_model")} fieldName="maker_model" isEditing={isEditing} onChange={handleFieldChange} normalize />
                    <EditableDetailItem label="Vehicle Class" value={getCurrentValue("vehicle_class")} fieldName="vehicle_class" isEditing={isEditing} onChange={handleFieldChange} />
                    <EditableDetailItem label="Color" value={getCurrentValue("color")} fieldName="color" isEditing={isEditing} onChange={handleFieldChange} normalize />
                    <EditableDetailItem label="Registration Date" value={getCurrentValue("registration_date")} fieldName="registration_date" isEditing={isEditing} onChange={handleFieldChange} inputType="date" />
                  </div>
                </SectionCard>

                {/* Technical Specifications */}
                <SectionCard title="Technical Specs" icon={Settings}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <EditableDetailItem label="Engine Number" value={getCurrentValue("engine_number")} fieldName="engine_number" isEditing={isEditing} onChange={handleFieldChange} icon={<Hash className="h-3.5 w-3.5" />} />
                    <EditableDetailItem label="Chassis Number" value={getCurrentValue("chassis_number")} fieldName="chassis_number" isEditing={isEditing} onChange={handleFieldChange} icon={<Hash className="h-3.5 w-3.5" />} />
                    <EditableDetailItem label="Cubic Capacity (cc)" value={getCurrentValue("cubic_capacity")} fieldName="cubic_capacity" isEditing={isEditing} onChange={handleFieldChange} inputType="number" icon={<Gauge className="h-3.5 w-3.5" />} />
                    <EditableDetailItem label="Fuel Type" value={getCurrentValue("fuel_type")} fieldName="fuel_type" isEditing={isEditing} onChange={handleFieldChange} icon={<Fuel className="h-3.5 w-3.5" />} />
                    <EditableDetailItem label="Seating Capacity" value={getCurrentValue("seating_capacity")} fieldName="seating_capacity" isEditing={isEditing} onChange={handleFieldChange} inputType="number" icon={<Users className="h-3.5 w-3.5" />} />
                    <EditableDetailItem label="Emission Norms" value={getCurrentValue("emission_norms")} fieldName="emission_norms" isEditing={isEditing} onChange={handleFieldChange} icon={<FileCheck className="h-3.5 w-3.5" />} />
                  </div>
                </SectionCard>

                {/* Ownership & Finance */}
                <SectionCard title="Ownership" icon={User}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <EditableDetailItem label="Owner Name" value={getCurrentValue("owner_name")} fieldName="owner_name" isEditing={isEditing} onChange={handleFieldChange} icon={<User className="h-3.5 w-3.5" />} normalize />
                    <EditableDetailItem label="Owner Count" value={getCurrentValue("owner_count")} fieldName="owner_count" isEditing={isEditing} onChange={handleFieldChange} inputType="number" icon={<Users className="h-3.5 w-3.5" />} />
                    <div className="space-y-1">
                      <span className="text-sm text-gray-500 flex items-center gap-1.5">
                        <Banknote className="h-3.5 w-3.5" />
                        Finance Status
                      </span>
                      <div>
                        <Badge variant={vehicle.is_financed ? "destructive" : "outline"} className={vehicle.is_financed ? "" : "text-green-600 border-green-200"}>
                          {vehicle.is_financed ? "Financed" : "Not Financed"}
                        </Badge>
                      </div>
                    </div>
                    <EditableDetailItem label="Financer" value={getCurrentValue("financer")} fieldName="financer" isEditing={isEditing} onChange={handleFieldChange} icon={<Banknote className="h-3.5 w-3.5" />} normalize />
                  </div>
                </SectionCard>

                {/* Document Expiry Dates */}
                <SectionCard title="Document Expiry Dates" icon={Calendar}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <EditableDetailItem label="Insurance Expiry" value={getCurrentValue("insurance_expiry")} fieldName="insurance_expiry" isEditing={isEditing} onChange={handleFieldChange} inputType="date" />
                    <EditableDetailItem label="Insurance Company" value={getCurrentValue("insurance_company")} fieldName="insurance_company" isEditing={isEditing} onChange={handleFieldChange} normalize />
                    <EditableDetailItem label="PUCC Valid Until" value={getCurrentValue("pucc_valid_upto")} fieldName="pucc_valid_upto" isEditing={isEditing} onChange={handleFieldChange} inputType="date" />
                    <EditableDetailItem label="Fitness Valid Until" value={getCurrentValue("fitness_valid_upto")} fieldName="fitness_valid_upto" isEditing={isEditing} onChange={handleFieldChange} inputType="date" />
                    <EditableDetailItem label="Road Tax Valid Until" value={getCurrentValue("road_tax_valid_upto")} fieldName="road_tax_valid_upto" isEditing={isEditing} onChange={handleFieldChange} inputType="date" />
                  </div>
                </SectionCard>
              </div>
            </TabsContent>

            {/* Verification Tab */}
            <TabsContent value="verification" className="mt-0 space-y-6">
              <VerificationProgress progress={verificationProgress} variant="card" />
              
              <VehicleVerificationSection
                vehicleId={vehicle.id}
                registrationNumber={vehicle.registration_number}
                isVerified={vehicle.is_verified}
                verifiedAt={vehicle.verified_at}
                verificationPhotoPath={vehicle.verification_photo_path}
                onVerificationComplete={fetchVehicle}
                variant="inline"
              />
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="mt-0">
              <SectionCard title="Document Repository" icon={FileText} className="mb-0">
                <p className="text-sm text-gray-500 mb-6">Upload documents to store them and optionally extract data using AI</p>
                
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <Label htmlFor="docType" className="text-sm text-gray-600">Document Type</Label>
                    <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                      <SelectTrigger className="mt-1.5 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" />
                    <Button onClick={() => fileInputRef.current?.click()} disabled={uploading || isAnalyzing} className="w-full sm:w-auto">
                      {isAnalyzing ? (
                        <><Sparkles className="h-4 w-4 mr-2 animate-pulse" />Analyzing...</>
                      ) : uploading ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>
                      ) : (
                        <><Upload className="h-4 w-4 mr-2" />Upload Document</>
                      )}
                    </Button>
                  </div>
                </div>

                {documents.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
                    <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No documents uploaded yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-sm text-gray-900">{doc.document_name}</p>
                            <p className="text-xs text-gray-500">
                              {documentTypes.find((t) => t.value === doc.document_type)?.label} · {format(new Date(doc.uploaded_at), "dd MMM yyyy")}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {doc.file_path.match(/\.(jpg|jpeg|png|webp)$/i) && (
                            <Button variant="ghost" size="icon" onClick={() => handleReanalyzeDocument(doc)} disabled={isAnalyzing} className="h-8 w-8">
                              <Sparkles className="h-4 w-4 text-gray-500" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)} className="h-8 w-8">
                            <Download className="h-4 w-4 text-gray-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteDocument(doc)} className="h-8 w-8">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </TabsContent>

            {/* Service Tab */}
            <TabsContent value="service" className="mt-0">
              <ServiceHistory vehicleId={vehicle.id} registrationNumber={vehicle.registration_number} variant="inline" />
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="mt-0">
              <VehicleHistory vehicleId={vehicle.id} variant="inline" />
            </TabsContent>

            {/* Challan Tab */}
            <TabsContent value="challan" className="mt-0">
              <ChallanTab vehicle={vehicle} />
            </TabsContent>

            {/* Sell Tab */}
            <TabsContent value="sell" className="mt-0">
              <SellVehicleTab vehicle={vehicle} verificationProgress={verificationProgress} />
            </TabsContent>
          </Tabs>
        </motion.div>
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
          if (!open) setPendingUploadFile(null);
          setShowUploadConsent(open);
        }}
        onConfirm={processFileUpload}
      />
    </div>
  );
};

export default VehicleDetails;
