import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Upload, FileText, Trash2, Download, 
  AlertTriangle, CheckCircle, Clock, Car, Calendar, Shield
} from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

    // Validate file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or image file (JPEG, PNG, WebP)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
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

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("vehicle-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save document record
      const { error: dbError } = await supabase.from("documents").insert({
        vehicle_id: id,
        user_id: user.id,
        document_type: selectedDocType,
        document_name: file.name,
        file_path: filePath,
        file_size: file.size,
      });

      if (dbError) throw dbError;

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
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("vehicle-documents")
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("documents")
        .delete()
        .eq("id", doc.id);

      if (dbError) throw dbError;

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

  const expiryItems = [
    { label: "Insurance", date: vehicle.insurance_expiry, company: vehicle.insurance_company },
    { label: "PUCC Certificate", date: vehicle.pucc_valid_upto },
    { label: "Fitness Certificate", date: vehicle.fitness_valid_upto },
    { label: "Road Tax", date: vehicle.road_tax_valid_upto },
  ];

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
        {/* Vehicle Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Car className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl font-mono">{vehicle.registration_number}</CardTitle>
                <CardDescription className="text-base">
                  {vehicle.maker_model || vehicle.manufacturer || "Vehicle"}
                  {vehicle.fuel_type && ` • ${vehicle.fuel_type}`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {vehicle.owner_name && (
                <div>
                  <span className="text-sm text-muted-foreground">Owner</span>
                  <p className="font-medium">{vehicle.owner_name}</p>
                </div>
              )}
              {vehicle.vehicle_class && (
                <div>
                  <span className="text-sm text-muted-foreground">Vehicle Class</span>
                  <p className="font-medium">{vehicle.vehicle_class}</p>
                </div>
              )}
              {vehicle.registration_date && (
                <div>
                  <span className="text-sm text-muted-foreground">Registration Date</span>
                  <p className="font-medium">{format(new Date(vehicle.registration_date), "dd MMM yyyy")}</p>
                </div>
              )}
              {vehicle.rc_status && (
                <div>
                  <span className="text-sm text-muted-foreground">RC Status</span>
                  <p className="font-medium">{vehicle.rc_status}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expiry Dates */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Document Expiry Status
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Document Upload */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Document Repository
            </CardTitle>
            <CardDescription>
              Upload and store your vehicle documents for easy access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
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

            {/* Documents List */}
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default VehicleDetails;
