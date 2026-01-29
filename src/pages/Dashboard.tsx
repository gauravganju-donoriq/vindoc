import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Car, Plus, AlertTriangle, CheckCircle, Clock, Trash2, 
  ShieldCheck, ChevronRight, MoreHorizontal, Calendar, Fuel, Wrench
} from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PendingTransfers from "@/components/transfers/PendingTransfers";
import { PendingOwnershipClaims } from "@/components/transfers/PendingOwnershipClaims";
import ChallanSummaryWidget from "@/components/dashboard/ChallanSummaryWidget";
import ActiveAssistanceCard from "@/components/dashboard/ActiveAssistanceCard";
import { RequestAssistanceDialog } from "@/components/assistance/RequestAssistanceDialog";
import { DashboardLayout, DashboardSkeleton } from "@/components/layout/DashboardLayout";
import { toTitleCase } from "@/lib/utils";

interface Vehicle {
  id: string;
  registration_number: string;
  owner_name: string | null;
  maker_model: string | null;
  manufacturer: string | null;
  fuel_type: string | null;
  registration_date: string | null;
  insurance_expiry: string | null;
  pucc_valid_upto: string | null;
  fitness_valid_upto: string | null;
  road_tax_valid_upto: string | null;
  is_verified: boolean | null;
  verified_at: string | null;
}

const getExpiryStatus = (expiryDate: string | null) => {
  if (!expiryDate) return null;
  const date = new Date(expiryDate);
  const daysLeft = differenceInDays(date, new Date());
  
  if (isPast(date)) {
    return { status: "expired", label: "Expired", daysLeft: 0, color: "text-red-600", bg: "bg-red-50" };
  } else if (daysLeft <= 30) {
    return { status: "expiring", label: `${daysLeft}d`, daysLeft, color: "text-amber-600", bg: "bg-amber-50" };
  } else {
    return { status: "valid", label: "OK", daysLeft, color: "text-green-600", bg: "bg-green-50" };
  }
};

const getMostUrgentStatus = (vehicle: Vehicle) => {
  const dates = [
    { type: "Insurance", date: vehicle.insurance_expiry },
    { type: "PUCC", date: vehicle.pucc_valid_upto },
    { type: "Fitness", date: vehicle.fitness_valid_upto },
    { type: "Road Tax", date: vehicle.road_tax_valid_upto },
  ];

  let mostUrgent: { type: string; status: ReturnType<typeof getExpiryStatus> } | null = null;

  for (const item of dates) {
    const status = getExpiryStatus(item.date);
    if (status) {
      if (!mostUrgent || 
          (status.status === "expired" && mostUrgent.status?.status !== "expired") ||
          (status.status === "expiring" && mostUrgent.status?.status === "valid") ||
          (status.status === "expiring" && mostUrgent.status?.status === "expiring" && status.daysLeft < (mostUrgent.status?.daysLeft || 999))) {
        mostUrgent = { type: item.type, status };
      }
    }
  }

  return mostUrgent;
};

// Get all document statuses for expanded view
const getAllDocumentStatuses = (vehicle: Vehicle) => {
  return [
    { type: "Insurance", short: "Ins", date: vehicle.insurance_expiry, status: getExpiryStatus(vehicle.insurance_expiry) },
    { type: "PUCC", short: "PUCC", date: vehicle.pucc_valid_upto, status: getExpiryStatus(vehicle.pucc_valid_upto) },
    { type: "Fitness", short: "Fit", date: vehicle.fitness_valid_upto, status: getExpiryStatus(vehicle.fitness_valid_upto) },
    { type: "Road Tax", short: "Tax", date: vehicle.road_tax_valid_upto, status: getExpiryStatus(vehicle.road_tax_valid_upto) },
  ];
};

// Vehicle card component - enhanced for larger screens
const VehicleCard = ({ 
  vehicle, 
  onDelete, 
  index 
}: { 
  vehicle: Vehicle; 
  onDelete: (id: string) => void;
  index: number;
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const urgentStatus = getMostUrgentStatus(vehicle);
  const allDocumentStatuses = getAllDocumentStatuses(vehicle);
  const allDocumentsOk = !urgentStatus || urgentStatus.status?.status === "valid";
  const registrationYear = vehicle.registration_date ? new Date(vehicle.registration_date).getFullYear() : null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.03 }}
      >
        <Link
          to={`/vehicle/${vehicle.id}`}
          className="group block bg-white border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all overflow-hidden"
        >
          {/* Main content */}
          <div className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              {/* Left: Vehicle info */}
              <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                {/* Vehicle Icon */}
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200 transition-colors">
                  <Car className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                </div>

                {/* Vehicle Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-mono font-semibold text-gray-900 text-base sm:text-lg">
                      {vehicle.registration_number}
                    </h3>
                    {vehicle.is_verified && (
                      <ShieldCheck className="h-4 w-4 text-green-600 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-gray-500 text-sm truncate mt-0.5">
                    {vehicle.manufacturer && toTitleCase(vehicle.manufacturer)}
                    {vehicle.maker_model && vehicle.manufacturer && " · "}
                    {vehicle.maker_model && toTitleCase(vehicle.maker_model)}
                    {!vehicle.manufacturer && !vehicle.maker_model && "Vehicle details not available"}
                  </p>
                  
                  {/* Quick specs - visible on sm+ */}
                  <div className="hidden sm:flex items-center gap-3 mt-2 text-xs text-gray-400">
                    {vehicle.fuel_type && (
                      <span className="flex items-center gap-1">
                        <Fuel className="h-3 w-3" />
                        {toTitleCase(vehicle.fuel_type)}
                      </span>
                    )}
                    {registrationYear && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {registrationYear}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Mobile status badge */}
                <div className="sm:hidden">
                  {allDocumentsOk ? (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      OK
                    </Badge>
                  ) : urgentStatus && (
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        urgentStatus.status?.status === "expired" 
                          ? "text-red-600 border-red-200 bg-red-50" 
                          : "text-amber-600 border-amber-200 bg-amber-50"
                      }`}
                    >
                      {urgentStatus.status?.status === "expired" ? (
                        <AlertTriangle className="h-3 w-3 mr-1" />
                      ) : (
                        <Clock className="h-3 w-3 mr-1" />
                      )}
                      {urgentStatus.status?.label}
                    </Badge>
                  )}
                </div>

                {/* Actions dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={`/vehicle/${vehicle.id}`}>View Details</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-red-600 focus:text-red-600"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Arrow - visible on sm+ */}
                <ChevronRight className="hidden sm:block h-5 w-5 text-gray-300 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </div>

          {/* Document status bar - visible on sm+ */}
          <div className="hidden sm:flex items-center gap-4 px-5 py-3 bg-gray-50/50 border-t border-gray-100">
            {allDocumentStatuses.map((doc) => (
              <div key={doc.type} className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">{doc.short}:</span>
                {doc.status ? (
                  <span className={`text-xs font-medium ${doc.status.color}`}>
                    {doc.status.label}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </div>
            ))}
          </div>
        </Link>
      </motion.div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vehicle?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {vehicle.registration_number} and all associated documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(vehicle.id)}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Empty state component
const EmptyState = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4 }}
    className="text-center py-12 sm:py-16 px-4 sm:px-6"
  >
    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5 sm:mb-6">
      <Car className="h-7 w-7 sm:h-8 sm:w-8 text-gray-400" />
    </div>
    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No vehicles yet</h3>
    <p className="text-gray-500 mb-6 sm:mb-8 max-w-sm mx-auto text-sm sm:text-base">
      Add your first vehicle to start tracking documents and get smart renewal reminders.
    </p>
    <Button asChild size="lg" className="rounded-full px-6 sm:px-8">
      <Link to="/add-vehicle">
        <Plus className="h-5 w-5 mr-2" />
        Add Your First Vehicle
      </Link>
    </Button>
  </motion.div>
);

const Dashboard = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [showAssistanceDialog, setShowAssistanceDialog] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserEmail(session.user.email);
      fetchVehicles();
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    checkAuth();
    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch vehicles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    try {
      const { error } = await supabase
        .from("vehicles")
        .delete()
        .eq("id", vehicleId);

      if (error) throw error;

      setVehicles(vehicles.filter((v) => v.id !== vehicleId));
      toast({
        title: "Vehicle deleted",
        description: "The vehicle has been removed from your account.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete vehicle",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <DashboardLayout
      title="My Vehicles"
      subtitle={
        vehicles.length === 0
          ? "Add your first vehicle to get started"
          : `${vehicles.length} vehicle${vehicles.length > 1 ? "s" : ""} registered`
      }
      actions={
        vehicles.length > 0 && (
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              className="rounded-full"
              onClick={() => setShowAssistanceDialog(true)}
            >
              <Wrench className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Request Assistance</span>
              <span className="sm:hidden">Assist</span>
            </Button>
            <Button asChild className="rounded-full">
              <Link to="/add-vehicle">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Add Vehicle</span>
                <span className="sm:hidden">Add</span>
              </Link>
            </Button>
          </div>
        )
      }
    >
      {/* Pending Ownership Claims Section */}
      <PendingOwnershipClaims />

      {/* Pending Transfers Section */}
      <PendingTransfers userEmail={userEmail} onTransferAccepted={fetchVehicles} />

      {/* Challan Summary Widget */}
      <ChallanSummaryWidget vehicleIds={vehicles.map(v => v.id)} />

      {/* Active Assistance Requests */}
      <ActiveAssistanceCard vehicleIds={vehicles.map(v => v.id)} />

      {/* Vehicle Grid - 2 columns on xl+ */}
      {vehicles.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2 2xl:gap-4">
          {vehicles.map((vehicle, index) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              onDelete={handleDeleteVehicle}
              index={index}
            />
          ))}
        </div>
      )}

      {/* Request Assistance Dialog */}
      <RequestAssistanceDialog
        open={showAssistanceDialog}
        onOpenChange={setShowAssistanceDialog}
        vehicles={vehicles.map(v => ({
          id: v.id,
          registration_number: v.registration_number,
          maker_model: v.maker_model,
          manufacturer: v.manufacturer,
        }))}
      />
    </DashboardLayout>
  );
};

export default Dashboard;
