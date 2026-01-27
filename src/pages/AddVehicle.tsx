import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Search, Loader2, Car } from "lucide-react";
import { format } from "date-fns";

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
}

const AddVehicle = () => {
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [fetchedData, setFetchedData] = useState<FetchedVehicleData | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  
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
        raw_api_data: fetchedData ? JSON.stringify(fetchedData) : null,
      };

      const { error } = await supabase.from("vehicles").insert(vehicleData);

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Vehicle already exists",
            description: "This registration number is already in your account.",
            variant: "destructive",
          });
          return;
        }
        throw error;
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
        <div className="container mx-auto px-4 py-4">
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
                  {fetchedData.fitness_valid_upto && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fitness Valid Until:</span>
                      <span className="font-medium">
                        {format(new Date(fetchedData.fitness_valid_upto), "dd MMM yyyy")}
                      </span>
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

            {/* Save Button */}
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AddVehicle;
