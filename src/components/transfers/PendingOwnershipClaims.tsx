import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, Mail, Phone, ArrowRight, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

interface OwnershipClaim {
  id: string;
  registration_number: string;
  vehicle_id: string;
  claimant_email: string;
  claimant_phone: string | null;
  message: string | null;
  status: string;
  created_at: string;
  expires_at: string;
}

export const PendingOwnershipClaims = () => {
  const [claims, setClaims] = useState<OwnershipClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch claims where current user is the owner
        const { data, error } = await supabase
          .from("ownership_claims")
          .select("*")
          .eq("current_owner_id", user.id)
          .eq("status", "pending")
          .gte("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false });

        if (error) throw error;
        setClaims(data || []);
      } catch (error: any) {
        console.error("Error fetching ownership claims:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClaims();
  }, []);

  if (isLoading) {
    return null; // Don't show loading state for this section
  }

  if (claims.length === 0) {
    return null; // Don't render anything if no claims
  }

  return (
    <Card className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-amber-800 dark:text-amber-400 text-lg">
              Ownership Transfer Requests
            </CardTitle>
          </div>
          <Badge variant="secondary" className="bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200">
            {claims.length} pending
          </Badge>
        </div>
        <CardDescription className="text-amber-700 dark:text-amber-300">
          Someone is claiming ownership of your vehicle. If you sold it, please initiate a transfer.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {claims.map((claim) => (
          <div
            key={claim.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-background border"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-lg">{claim.registration_number}</span>
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Expires {formatDistanceToNow(new Date(claim.expires_at), { addSuffix: true })}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {claim.claimant_email}
                </span>
                {claim.claimant_phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {claim.claimant_phone}
                  </span>
                )}
              </div>
              {claim.message && (
                <p className="text-sm text-muted-foreground italic mt-1">
                  "{claim.message}"
                </p>
              )}
            </div>
            <Button asChild size="sm">
              <Link to={`/vehicle/${claim.vehicle_id}`}>
                Transfer Vehicle
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
