import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Upload, FileText, Trash2, Download, 
  AlertTriangle, CheckCircle, Clock, Car, Calendar, Shield,
  Settings, User, Fuel, Palette, Users, Banknote, Hash,
  Gauge, Weight, FileCheck, RefreshCw, Loader2
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
import SectionCard from "@/components/vehicle/SectionCard";
import { useRefreshVehicle } from "@/hooks/useRefreshVehicle";
import TransferVehicleDialog from "@/components/vehicle/TransferVehicleDialog";
import VehicleHistory from "@/components/vehicle/VehicleHistory";
import { logVehicleEvent } from "@/lib/vehicleHistory";

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
  // New fields
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
}

interface Document {
  id: string;
  document_type: string;
  document_name: string;
  file_path: string;
  uploaded_at: string;
}

const documentTypes = [
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
    return { status: "expiring", label: `${daysLeft} days left`, variant: "secondary" as const, icon: Clock, color: "text-yellow-600" };
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
  const [selectedDocType, setSelectedDocType] = useState("insurance");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      const { error: dbError } = await supabase.from("documents").insert({
        vehicle_id: id,
        user_id: user.id,
        document_type: selectedDocType,
        document_name: file.name,
        file_path: filePath,
        file_size: file.size,
      });

      if (dbError) throw dbError;

      // Log history event
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
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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

      // Log history event
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
    { label: "Insurance", date: vehicle.insurance_expiry, company: vehicle.insurance_company },
    { label: "PUCC Certificate", date: vehicle.pucc_valid_upto },
    { label: "Fitness Certificate", date: vehicle.fitness_valid_upto },
    { label: "Road Tax", date: vehicle.road_tax_valid_upto },
  ];

  const { isRefreshing, canRefresh, getTimeUntilRefresh, refreshVehicleData } = useRefreshVehicle({
    vehicleId: vehicle.id,
    registrationNumber: vehicle.registration_number,
    dataLastFetchedAt: vehicle.data_last_fetched_at,
    onSuccess: fetchVehicle,
  });

  const timeUntilRefresh = getTimeUntilRefresh();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Enhanced Vehicle Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Car className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <CardTitle className="text-2xl font-mono">{vehicle.registration_number}</CardTitle>
                    {vehicle.rc_status && (
                      <Badge variant={vehicle.rc_status === "ACTIVE" ? "default" : "destructive"}>
                        {vehicle.rc_status}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-base">
                    {vehicle.manufacturer && <span>{vehicle.manufacturer}</span>}
                    {vehicle.maker_model && vehicle.manufacturer && " • "}
                    {vehicle.maker_model && <span>{vehicle.maker_model}</span>}
                    {!vehicle.manufacturer && !vehicle.maker_model && "Vehicle Details"}
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2">
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
                        Refresh Data
                      </>
                    )}
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground">
                  {vehicle.data_last_fetched_at ? (
                    timeUntilRefresh ? (
                      `Can refresh in ${timeUntilRefresh.hours}h ${timeUntilRefresh.minutes}m`
                    ) : (
                      `Last updated ${formatDistanceToNow(new Date(vehicle.data_last_fetched_at), { addSuffix: true })}`
                    )
                  ) : (
                    "Never fetched – Refresh now"
                  )}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm">
              {vehicle.fuel_type && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Fuel className="h-4 w-4" />
                  <span>{vehicle.fuel_type}</span>
                </div>
              )}
              {registrationYear && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Registered {registrationYear}</span>
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
                  <span>{vehicle.color}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Identity Section */}
        <SectionCard title="Vehicle Identity" icon={<Car className="h-5 w-5" />}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Registration Number" value={vehicle.registration_number} />
            <DetailItem label="Manufacturer" value={vehicle.manufacturer} />
            <DetailItem label="Model" value={vehicle.maker_model} />
            <DetailItem label="Vehicle Class" value={vehicle.vehicle_class} />
            <DetailItem label="Vehicle Category" value={vehicle.vehicle_category} />
            <DetailItem label="Body Type" value={vehicle.body_type} />
            <DetailItem label="Color" value={vehicle.color} />
            <DetailItem 
              label="Registration Date" 
              value={vehicle.registration_date ? format(new Date(vehicle.registration_date), "dd MMM yyyy") : null} 
            />
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">RC Status</span>
              <div>
                {vehicle.rc_status ? (
                  <Badge variant={vehicle.rc_status === "ACTIVE" ? "default" : "destructive"}>
                    {vehicle.rc_status}
                  </Badge>
                ) : (
                  <p className="font-medium text-muted-foreground italic">Not Available</p>
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Technical Specifications Section */}
        <SectionCard title="Technical Specifications" icon={<Settings className="h-5 w-5" />}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Engine Number" value={vehicle.engine_number} icon={<Hash className="h-3.5 w-3.5" />} />
            <DetailItem label="Chassis Number" value={vehicle.chassis_number} icon={<Hash className="h-3.5 w-3.5" />} />
            <DetailItem 
              label="Cubic Capacity" 
              value={vehicle.cubic_capacity ? `${vehicle.cubic_capacity} cc` : null} 
              icon={<Gauge className="h-3.5 w-3.5" />} 
            />
            <DetailItem label="Fuel Type" value={vehicle.fuel_type} icon={<Fuel className="h-3.5 w-3.5" />} />
            <DetailItem 
              label="Seating Capacity" 
              value={vehicle.seating_capacity ? `${vehicle.seating_capacity} Seats` : null} 
              icon={<Users className="h-3.5 w-3.5" />} 
            />
            <DetailItem label="Emission Norms" value={vehicle.emission_norms} icon={<FileCheck className="h-3.5 w-3.5" />} />
            <DetailItem label="Wheelbase" value={vehicle.wheelbase} icon={<Weight className="h-3.5 w-3.5" />} />
            <DetailItem label="Gross Vehicle Weight" value={vehicle.gross_vehicle_weight} icon={<Weight className="h-3.5 w-3.5" />} />
            <DetailItem label="Unladen Weight" value={vehicle.unladen_weight} icon={<Weight className="h-3.5 w-3.5" />} />
          </div>
        </SectionCard>

        {/* Ownership & Finance Section */}
        <SectionCard title="Ownership & Finance" icon={<User className="h-5 w-5" />}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Owner Name" value={vehicle.owner_name} icon={<User className="h-3.5 w-3.5" />} />
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Owner Count
              </span>
              <div className="flex items-center gap-2">
                {vehicle.owner_count !== null ? (
                  <>
                    <span className="font-medium">{vehicle.owner_count}</span>
                    <Badge variant={vehicle.owner_count === 1 ? "default" : "secondary"}>
                      {vehicle.owner_count === 1 ? "First Owner" : `${vehicle.owner_count} Owners`}
                    </Badge>
                  </>
                ) : (
                  <p className="font-medium text-muted-foreground italic">Not Available</p>
                )}
              </div>
            </div>
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
            {vehicle.is_financed && (
              <DetailItem label="Financer" value={vehicle.financer} icon={<Banknote className="h-3.5 w-3.5" />} />
            )}
            <DetailItem label="NOC Details" value={vehicle.noc_details} icon={<FileCheck className="h-3.5 w-3.5" />} />
          </div>
        </SectionCard>

        {/* Document Expiry Status */}
        <SectionCard title="Document Expiry Status" icon={<Calendar className="h-5 w-5" />}>
          <div className="grid gap-4 sm:grid-cols-2">
            {expiryItems.map((item) => {
              const status = getExpiryStatus(item.date);
              return (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    {item.date ? (
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(item.date), "dd MMM yyyy")}
                        {item.company && ` • ${item.company}`}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not available</p>
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
        </SectionCard>

        {/* Document Repository */}
        <SectionCard title="Document Repository" icon={<Shield className="h-5 w-5" />}>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-4">
              Upload and store your vehicle documents for easy access
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="docType">Document Type</Label>
                <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                  <SelectTrigger>
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
                  onChange={handleFileUpload}
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload Document"}
                </Button>
              </div>
            </div>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No documents uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border">
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
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteDocument(doc)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Vehicle History Log */}
        <VehicleHistory vehicleId={vehicle.id} />
      </main>
    </div>
  );
};

export default VehicleDetails;
