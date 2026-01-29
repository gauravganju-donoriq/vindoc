import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Search, Loader2, Car, AlertTriangle, Send, Shield } from "lucide-react";
import { format } from "date-fns";
import { logVehicleEvent } from "@/lib/vehicleHistory";
import { RequestTransferDialog } from "@/components/vehicle/RequestTransferDialog";

interface FetchedVehicleData {
  owner_name?: string;
  vehicle_class?: string;
  fuel_type?: string;
  maker_model?: string;
  manufacturer?: string;
  registration_date?: string;
  insurance_company?: string;
  insurance_expiry?: string;
  pucc_valid_upto?: string;
  fitness_valid_upto?: string;
  road_tax_valid_upto?: string;
  rc_status?: string;
  // New fields
  engine_number?: string;
  chassis_number?: string;
  color?: string;
  seating_capacity?: number;
  cubic_capacity?: number;
  owner_count?: number;
  emission_norms?: string;
  is_financed?: boolean;
  financer?: string;
  noc_details?: string;
}

const AddVehicle = () => {
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [fetchedData, setFetchedData] = useState<FetchedVehicleData | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  
  // Duplicate vehicle state
  const [duplicateVehicleInfo, setDuplicateVehicleInfo] = useState<{
    vehicleId: string;
    currentOwnerId: string;
    registrationNumber: string;
    makerModel?: string;
  } | null>(null);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  
  // Manual form fields
  const [ownerName, setOwnerName] = useState("");
  const [makerModel, setMakerModel] = useState("");
  const [insuranceExpiry, setInsuranceExpiry] = useState("");
  const [puccExpiry, setPuccExpiry] = useState("");
  const [fitnessExpiry, setFitnessExpiry] = useState("");
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const formatRegNumber = (value: string) => {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  };

  const handleFetchDetails = async () => {
    if (!registrationNumber || registrationNumber.length < 6) {
      toast({
        title: "Invalid registration number",
        description: "Please enter a valid Indian vehicle registration number",
        variant: "destructive",
      });
      return;
    }

    setIsFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-vehicle-details", {
        body: { registrationNumber: formatRegNumber(registrationNumber) },
      });

      if (error) throw error;

      if (data && data.success) {
        setFetchedData(data.vehicleData);
        toast({
          title: "Vehicle found!",
          description: "Details have been fetched successfully.",
        });
      } else {
        toast({
          title: "Vehicle not found",
          description: data?.message || "Could not fetch vehicle details. Try manual entry.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Fetch error:", error);
      toast({
        title: "Error fetching details",
        description: "Could not connect to the vehicle database. Try manual entry.",
        variant: "destructive",
      });
    } finally {
      setIsFetching(false);
    }
  };

  const handleSave = async () => {
    if (!registrationNumber) {
      toast({
        title: "Registration number required",
        description: "Please enter the vehicle registration number",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const vehicleData = {
        user_id: user.id,
        registration_number: formatRegNumber(registrationNumber),
        owner_name: fetchedData?.owner_name || ownerName || null,
        vehicle_class: fetchedData?.vehicle_class || null,
        fuel_type: fetchedData?.fuel_type || null,
        maker_model: fetchedData?.maker_model || makerModel || null,
        manufacturer: fetchedData?.manufacturer || null,
        registration_date: fetchedData?.registration_date || null,
        insurance_company: fetchedData?.insurance_company || null,
        insurance_expiry: fetchedData?.insurance_expiry || insuranceExpiry || null,
        pucc_valid_upto: fetchedData?.pucc_valid_upto || puccExpiry || null,
        fitness_valid_upto: fetchedData?.fitness_valid_upto || fitnessExpiry || null,
        road_tax_valid_upto: fetchedData?.road_tax_valid_upto || null,
        rc_status: fetchedData?.rc_status || null,
        // New fields
        engine_number: fetchedData?.engine_number || null,
        chassis_number: fetchedData?.chassis_number || null,
        color: fetchedData?.color || null,
        seating_capacity: fetchedData?.seating_capacity || null,
        cubic_capacity: fetchedData?.cubic_capacity || null,
        owner_count: fetchedData?.owner_count || null,
        emission_norms: fetchedData?.emission_norms || null,
        is_financed: fetchedData?.is_financed || false,
        financer: fetchedData?.financer || null,
        noc_details: fetchedData?.noc_details || null,
        raw_api_data: fetchedData ? JSON.stringify(fetchedData) : null,
        // Set data_last_fetched_at only when fetched from API
        data_last_fetched_at: fetchedData ? new Date().toISOString() : null,
      };

      const { data: insertedVehicle, error } = await supabase
        .from("vehicles")
        .insert(vehicleData)
        .select("id")
        .single();

      if (error) {
        if (error.code === "23505") {
          // Vehicle already exists - fetch owner info for claim
          try {
            const { data: vehicleData } = await supabase.functions.invoke("admin-data", {
              body: { 
                type: "get_vehicle_for_claim", 
                registrationNumber: formatRegNumber(registrationNumber) 
              },
            });

            if (vehicleData?.found && vehicleData.ownerId !== user.id) {
              setDuplicateVehicleInfo({
                vehicleId: vehicleData.vehicleId,
                currentOwnerId: vehicleData.ownerId,
                registrationNumber: formatRegNumber(registrationNumber),
                makerModel: vehicleData.makerModel,
              });
            } else {
              toast({
                title: "Vehicle already registered",
                description: "This vehicle is already in your account.",
                variant: "destructive",
              });
            }
          } catch (fetchError) {
            console.error("Failed to fetch vehicle info:", fetchError);
            toast({
              title: "Vehicle already registered",
              description: "This vehicle is already registered in the system.",
              variant: "destructive",
            });
          }
          return;
        }
        throw error;
      }

      // Log history event
      if (insertedVehicle) {
        await logVehicleEvent({
          vehicleId: insertedVehicle.id,
          eventType: "vehicle_added",
          description: `Vehicle ${formatRegNumber(registrationNumber)} added`,
          metadata: { 
            fetchedFromApi: !!fetchedData,
            manufacturer: fetchedData?.manufacturer || null,
            model: fetchedData?.maker_model || null,
          },
        });
      }

      toast({
        title: "Vehicle added!",
        description: `${formatRegNumber(registrationNumber)} has been added to your account.`,
      });
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error saving vehicle",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold">VinDoc</h1>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Car className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Add New Vehicle</CardTitle>
                <CardDescription>
                  Enter the registration number to fetch details automatically, or add manually
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Registration Number Input */}
            <div className="space-y-2">
              <Label htmlFor="regNumber">Registration Number</Label>
              <div className="flex gap-2">
                <Input
                  id="regNumber"
                  placeholder="e.g., KL01AY7070"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(formatRegNumber(e.target.value))}
                  className="font-mono text-lg uppercase"
                  maxLength={12}
                />
                <Button 
                  onClick={handleFetchDetails} 
                  disabled={isFetching || !registrationNumber}
                  variant="secondary"
                >
                  {isFetching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Fetch
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Indian vehicle registration numbers only (e.g., KL01AY7070, MH12AB1234)
              </p>
            </div>

            {/* Fetched Data Display */}
            {fetchedData && (
              <Card className="bg-muted/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-primary">
                    ✓ Vehicle Details Fetched
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm">
                  {fetchedData.owner_name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Owner:</span>
                      <span className="font-medium">{fetchedData.owner_name}</span>
                    </div>
                  )}
                  {fetchedData.manufacturer && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Manufacturer:</span>
                      <span className="font-medium">{fetchedData.manufacturer}</span>
                    </div>
                  )}
                  {fetchedData.maker_model && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Model:</span>
                      <span className="font-medium">{fetchedData.maker_model}</span>
                    </div>
                  )}
                  {fetchedData.fuel_type && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fuel:</span>
                      <span className="font-medium">{fetchedData.fuel_type}</span>
                    </div>
                  )}
                  {fetchedData.color && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Color:</span>
                      <span className="font-medium">{fetchedData.color}</span>
                    </div>
                  )}
                  {fetchedData.cubic_capacity && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Engine CC:</span>
                      <span className="font-medium">{fetchedData.cubic_capacity} cc</span>
                    </div>
                  )}
                  {fetchedData.seating_capacity && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Seats:</span>
                      <span className="font-medium">{fetchedData.seating_capacity}</span>
                    </div>
                  )}
                  {fetchedData.owner_count && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Owners:</span>
                      <span className="font-medium">{fetchedData.owner_count}</span>
                    </div>
                  )}
                  {fetchedData.registration_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Registered:</span>
                      <span className="font-medium">
                        {format(new Date(fetchedData.registration_date), "dd MMM yyyy")}
                      </span>
                    </div>
                  )}
                  {fetchedData.insurance_expiry && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Insurance Expiry:</span>
                      <span className="font-medium">
                        {format(new Date(fetchedData.insurance_expiry), "dd MMM yyyy")}
                      </span>
                    </div>
                  )}
                  {fetchedData.pucc_valid_upto && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">PUCC Valid Until:</span>
                      <span className="font-medium">
                        {format(new Date(fetchedData.pucc_valid_upto), "dd MMM yyyy")}
                      </span>
                    </div>
                  )}
                  {fetchedData.road_tax_valid_upto && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Road Tax Until:</span>
                      <span className="font-medium">
                        {format(new Date(fetchedData.road_tax_valid_upto), "dd MMM yyyy")}
                      </span>
                    </div>
                  )}
                  {fetchedData.rc_status && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">RC Status:</span>
                      <span className={`font-medium ${fetchedData.rc_status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'}`}>
                        {fetchedData.rc_status}
                      </span>
                    </div>
                  )}
                  {fetchedData.is_financed && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Financed:</span>
                      <span className="font-medium text-amber-600">Yes {fetchedData.financer && `(${fetchedData.financer})`}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Manual Entry Toggle */}
            {!fetchedData && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setManualMode(!manualMode)}
                  className="text-sm text-primary hover:underline"
                >
                  {manualMode ? "Hide manual entry" : "Or enter details manually"}
                </button>
              </div>
            )}

            {/* Manual Entry Form */}
            {manualMode && !fetchedData && (
              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="ownerName">Owner Name</Label>
                  <Input
                    id="ownerName"
                    placeholder="Vehicle owner's name"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="makerModel">Make & Model</Label>
                  <Input
                    id="makerModel"
                    placeholder="e.g., Maruti Swift VXI"
                    value={makerModel}
                    onChange={(e) => setMakerModel(e.target.value)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="insuranceExpiry">Insurance Expiry</Label>
                    <Input
                      id="insuranceExpiry"
                      type="date"
                      value={insuranceExpiry}
                      onChange={(e) => setInsuranceExpiry(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="puccExpiry">PUCC Expiry</Label>
                    <Input
                      id="puccExpiry"
                      type="date"
                      value={puccExpiry}
                      onChange={(e) => setPuccExpiry(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fitnessExpiry">Fitness Expiry</Label>
                    <Input
                      id="fitnessExpiry"
                      type="date"
                      value={fitnessExpiry}
                      onChange={(e) => setFitnessExpiry(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Duplicate Vehicle Alert */}
            {duplicateVehicleInfo && (
              <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <CardTitle className="text-amber-800 dark:text-amber-400 text-base">
                      Vehicle Already Registered
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    The vehicle <strong>{duplicateVehicleInfo.registrationNumber}</strong>
                    {duplicateVehicleInfo.makerModel && ` (${duplicateVehicleInfo.makerModel})`} is 
                    registered to another user.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    If you recently purchased this vehicle, you can request the current owner to 
                    transfer ownership to you. They will receive an email notification.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setShowClaimDialog(true)}
                      className="flex-1"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Request Transfer
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setDuplicateVehicleInfo(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Save Button - hide when duplicate is shown */}
            {!duplicateVehicleInfo && (
              <Button 
                onClick={handleSave} 
                className="w-full" 
                disabled={isSaving || !registrationNumber}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Vehicle"
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Request Transfer Dialog */}
      {duplicateVehicleInfo && (
        <RequestTransferDialog
          open={showClaimDialog}
          onOpenChange={setShowClaimDialog}
          vehicleInfo={duplicateVehicleInfo}
          onSuccess={() => {
            setDuplicateVehicleInfo(null);
            navigate("/dashboard");
          }}
        />
      )}
    </div>
  );
};

export default AddVehicle;
