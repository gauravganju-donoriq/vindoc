import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Search, Loader2, Car, AlertTriangle, Send, CheckCircle } from "lucide-react";
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
        data_last_fetched_at: fetchedData ? new Date().toISOString() : null,
      };

      const { data: insertedVehicle, error } = await supabase
        .from("vehicles")
        .insert(vehicleData)
        .select("id")
        .single();

      if (error) {
        if (error.code === "23505") {
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

  // Detail row component
  const DetailRow = ({ label, value }: { label: string; value: string | number | undefined }) => {
    if (!value) return null;
    return (
      <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
        <span className="text-gray-500 text-sm">{label}</span>
        <span className="font-medium text-gray-900 text-sm">{value}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <Link to="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group">
            <ChevronLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm font-medium hidden sm:inline">Back to Dashboard</span>
          </Link>
        </div>
      </motion.header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Page Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center">
                <Car className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Add New Vehicle</h1>
            </div>
            <p className="text-gray-500 text-sm sm:text-base">
              Enter the registration number to fetch details automatically, or add manually
            </p>
          </div>

          {/* Two-column layout on xl+ */}
          <div className="grid gap-6 xl:grid-cols-2">
            {/* Left Column: Registration Input + Fetched Data */}
            <div className="space-y-6">
              {/* Registration Number Input */}
              <div className="bg-white border border-gray-100 rounded-xl p-4 sm:p-6">
                <Label htmlFor="regNumber" className="text-sm font-medium text-gray-700 mb-2 block">
                  Registration Number
                </Label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    id="regNumber"
                    placeholder="e.g., MH02AB1234"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(formatRegNumber(e.target.value))}
                    className="font-mono text-base sm:text-lg uppercase bg-gray-50 border-gray-200 h-11 sm:h-12 focus:bg-white flex-1"
                    maxLength={12}
                  />
                  <Button 
                    onClick={handleFetchDetails} 
                    disabled={isFetching || !registrationNumber}
                    variant="outline"
                    className="h-11 sm:h-12 px-6"
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
                <p className="text-xs text-gray-400 mt-2">
                  Indian vehicle registration numbers only (e.g., MH02AB1234, KA01XY5678)
                </p>
              </div>

              {/* Fetched Data Display */}
              {fetchedData && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-green-100 rounded-xl p-4 sm:p-6"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h3 className="font-medium text-gray-900">Vehicle Details Fetched</h3>
                  </div>
                  <div className="grid gap-0 sm:grid-cols-2 sm:gap-x-6">
                    <DetailRow label="Owner" value={fetchedData.owner_name} />
                    <DetailRow label="Manufacturer" value={fetchedData.manufacturer} />
                    <DetailRow label="Model" value={fetchedData.maker_model} />
                    <DetailRow label="Fuel" value={fetchedData.fuel_type} />
                    <DetailRow label="Color" value={fetchedData.color} />
                    <DetailRow label="Engine CC" value={fetchedData.cubic_capacity ? `${fetchedData.cubic_capacity} cc` : undefined} />
                    <DetailRow label="Seats" value={fetchedData.seating_capacity} />
                    <DetailRow label="Owners" value={fetchedData.owner_count} />
                    {fetchedData.registration_date && (
                      <DetailRow label="Registered" value={format(new Date(fetchedData.registration_date), "dd MMM yyyy")} />
                    )}
                    {fetchedData.insurance_expiry && (
                      <DetailRow label="Insurance Expiry" value={format(new Date(fetchedData.insurance_expiry), "dd MMM yyyy")} />
                    )}
                    {fetchedData.pucc_valid_upto && (
                      <DetailRow label="PUCC Valid Until" value={format(new Date(fetchedData.pucc_valid_upto), "dd MMM yyyy")} />
                    )}
                    <DetailRow 
                      label="RC Status" 
                      value={fetchedData.rc_status ? (
                        <span className={fetchedData.rc_status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'}>
                          {fetchedData.rc_status}
                        </span>
                      ) as any : undefined} 
                    />
                    {fetchedData.is_financed && (
                      <DetailRow label="Financed" value={`Yes${fetchedData.financer ? ` (${fetchedData.financer})` : ''}`} />
                    )}
                  </div>
                </motion.div>
              )}

              {/* Duplicate Vehicle Alert */}
              {duplicateVehicleInfo && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-6"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <h3 className="font-medium text-amber-900">Vehicle Already Registered</h3>
                  </div>
                  <p className="text-sm text-amber-800 mb-4">
                    The vehicle <strong>{duplicateVehicleInfo.registrationNumber}</strong>
                    {duplicateVehicleInfo.makerModel && ` (${duplicateVehicleInfo.makerModel})`} is 
                    registered to another user. If you recently purchased this vehicle, you can request a transfer.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={() => setShowClaimDialog(true)} className="flex-1">
                      <Send className="h-4 w-4 mr-2" />
                      Request Transfer
                    </Button>
                    <Button variant="outline" onClick={() => setDuplicateVehicleInfo(null)}>
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right Column: Manual Entry (always visible on xl+) */}
            <div className="space-y-6">
              {/* Manual Entry Toggle - only shown on smaller screens */}
              {!fetchedData && (
                <div className="text-center xl:hidden">
                  <button
                    type="button"
                    onClick={() => setManualMode(!manualMode)}
                    className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    {manualMode ? "Hide manual entry" : "Or enter details manually"}
                  </button>
                </div>
              )}

              {/* Manual Entry Form - Always visible on xl+, toggleable on smaller screens */}
              {(manualMode || !fetchedData) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className={`bg-white border border-gray-100 rounded-xl p-4 sm:p-6 space-y-4 ${
                    !manualMode && !fetchedData ? "hidden xl:block" : ""
                  } ${fetchedData ? "hidden" : ""}`}
                >
                  <h3 className="font-medium text-gray-900 mb-4">Manual Entry</h3>
                  <div>
                    <Label htmlFor="ownerName" className="text-sm text-gray-600">Owner Name</Label>
                    <Input
                      id="ownerName"
                      placeholder="Vehicle owner's name"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="mt-1.5 bg-gray-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="makerModel" className="text-sm text-gray-600">Make & Model</Label>
                    <Input
                      id="makerModel"
                      placeholder="e.g., Maruti Swift VXI"
                      value={makerModel}
                      onChange={(e) => setMakerModel(e.target.value)}
                      className="mt-1.5 bg-gray-50 focus:bg-white"
                    />
                  </div>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                    <div>
                      <Label htmlFor="insuranceExpiry" className="text-sm text-gray-600">Insurance Expiry</Label>
                      <Input
                        id="insuranceExpiry"
                        type="date"
                        value={insuranceExpiry}
                        onChange={(e) => setInsuranceExpiry(e.target.value)}
                        className="mt-1.5 bg-gray-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="puccExpiry" className="text-sm text-gray-600">PUCC Expiry</Label>
                      <Input
                        id="puccExpiry"
                        type="date"
                        value={puccExpiry}
                        onChange={(e) => setPuccExpiry(e.target.value)}
                        className="mt-1.5 bg-gray-50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fitnessExpiry" className="text-sm text-gray-600">Fitness Expiry</Label>
                      <Input
                        id="fitnessExpiry"
                        type="date"
                        value={fitnessExpiry}
                        onChange={(e) => setFitnessExpiry(e.target.value)}
                        className="mt-1.5 bg-gray-50 focus:bg-white"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Save Button - On right column for xl+, full width otherwise */}
              {!duplicateVehicleInfo && (
                <div className="xl:mt-auto">
                  <Button 
                    onClick={handleSave} 
                    className="w-full h-11 sm:h-12 text-base rounded-xl" 
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
                </div>
              )}
            </div>
          </div>
        </motion.div>
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
