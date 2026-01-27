import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Search, ShieldCheck, ShieldX } from "lucide-react";

interface Vehicle {
  id: string;
  registration_number: string;
  owner_name: string | null;
  maker_model: string | null;
  is_verified: boolean | null;
  created_at: string;
  userEmail: string;
}

export function AdminVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "admin-data",
          { body: { type: "vehicles" } }
        );

        if (fnError) throw fnError;
        setVehicles(data?.vehicles || []);
        setFilteredVehicles(data?.vehicles || []);
      } catch (err: any) {
        console.error("Failed to fetch vehicles:", err);
        setError(err.message || "Failed to load vehicles");
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredVehicles(vehicles);
      return;
    }

    const lowercased = searchTerm.toLowerCase();
    const filtered = vehicles.filter(
      (v) =>
        v.registration_number.toLowerCase().includes(lowercased) ||
        v.owner_name?.toLowerCase().includes(lowercased) ||
        v.userEmail.toLowerCase().includes(lowercased) ||
        v.maker_model?.toLowerCase().includes(lowercased)
    );
    setFilteredVehicles(filtered);
  }, [searchTerm, vehicles]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Vehicles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>All Vehicles ({vehicles.length})</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vehicles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredVehicles.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {searchTerm ? "No vehicles match your search" : "No vehicles found"}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Registration</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>User Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-mono font-medium">
                    {vehicle.registration_number}
                  </TableCell>
                  <TableCell>{vehicle.owner_name || "—"}</TableCell>
                  <TableCell>{vehicle.maker_model || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {vehicle.userEmail}
                  </TableCell>
                  <TableCell>
                    {vehicle.is_verified ? (
                      <Badge className="bg-primary text-primary-foreground">
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        <ShieldX className="h-3 w-3 mr-1" />
                        Unverified
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(vehicle.created_at), "dd MMM yyyy")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
