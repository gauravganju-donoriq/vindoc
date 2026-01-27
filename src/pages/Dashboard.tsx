import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Car, Plus, LogOut, AlertTriangle, CheckCircle, Clock, Trash2, ShieldCheck, ShieldX, Shield } from "lucide-react";
import { useIsAdminUser } from "@/hooks/useAdminCheck";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import PendingTransfers from "@/components/transfers/PendingTransfers";
import { PendingOwnershipClaims } from "@/components/transfers/PendingOwnershipClaims";

interface Vehicle {
  id: string;
  registration_number: string;
  owner_name: string | null;
  maker_model: string | null;
  manufacturer: string | null;
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
    return { status: "expired", label: "Expired", variant: "destructive" as const, icon: AlertTriangle };
  } else if (daysLeft <= 30) {
    return { status: "expiring", label: `${daysLeft}d left`, variant: "secondary" as const, icon: Clock };
  } else {
    return { status: "valid", label: "Valid", variant: "default" as const, icon: CheckCircle };
  }
};

const Dashboard = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useIsAdminUser();

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
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
            (status.status === "expiring" && mostUrgent.status?.status === "valid")) {
          mostUrgent = { type: item.type, status };
        }
      }
    }

    return mostUrgent;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Vehicle Manager</h1>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin">
                  <Shield className="h-4 w-4 mr-2" />
                  Admin
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Pending Ownership Claims Section */}
        <PendingOwnershipClaims />

        {/* Pending Transfers Section */}
        <PendingTransfers userEmail={userEmail} onTransferAccepted={fetchVehicles} />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">My Vehicles</h2>
            <p className="text-muted-foreground">
              {vehicles.length === 0
                ? "Add your first vehicle to get started"
                : `${vehicles.length} vehicle${vehicles.length > 1 ? "s" : ""} registered`}
            </p>
          </div>
          <Button asChild>
            <Link to="/add-vehicle">
              <Plus className="h-4 w-4 mr-2" />
              Add Vehicle
            </Link>
          </Button>
        </div>

        {vehicles.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Car className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No vehicles yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first vehicle to start tracking documents and expiry dates.
              </p>
              <Button asChild>
                <Link to="/add-vehicle">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Vehicle
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((vehicle) => {
              const urgentStatus = getMostUrgentStatus(vehicle);
              return (
                <Card key={vehicle.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg font-mono">
                          {vehicle.registration_number}
                        </CardTitle>
                        <CardDescription>
                          {vehicle.maker_model || vehicle.manufacturer || "Vehicle details not available"}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        {vehicle.is_verified ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge className="flex items-center gap-1 bg-primary text-primary-foreground cursor-help">
                                  <ShieldCheck className="h-3 w-3" />
                                  Verified
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Verified on {vehicle.verified_at ? format(new Date(vehicle.verified_at), "dd MMM yyyy 'at' h:mm a") : "N/A"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <Badge variant="outline" className="flex items-center gap-1 text-muted-foreground">
                            <ShieldX className="h-3 w-3" />
                            Unverified
                          </Badge>
                        )}
                        {urgentStatus && (
                          <Badge variant={urgentStatus.status.variant} className="flex items-center gap-1">
                            <urgentStatus.status.icon className="h-3 w-3" />
                            {urgentStatus.type}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {vehicle.owner_name && (
                        <p className="text-muted-foreground">
                          Owner: <span className="text-foreground">{vehicle.owner_name}</span>
                        </p>
                      )}
                      {vehicle.insurance_expiry && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Insurance:</span>
                          <span>{format(new Date(vehicle.insurance_expiry), "dd MMM yyyy")}</span>
                        </div>
                      )}
                      {vehicle.pucc_valid_upto && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">PUCC:</span>
                          <span>{format(new Date(vehicle.pucc_valid_upto), "dd MMM yyyy")}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <Link to={`/vehicle/${vehicle.id}`}>View Details</Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
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
                              onClick={() => handleDeleteVehicle(vehicle.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
