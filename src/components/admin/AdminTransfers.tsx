import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ArrowRight, Clock, CheckCircle, XCircle, Ban } from "lucide-react";

interface Transfer {
  id: string;
  vehicle_id: string;
  sender_id: string;
  recipient_email: string;
  recipient_phone: string | null;
  status: string;
  created_at: string;
  expires_at: string;
  senderEmail: string;
  registrationNumber: string;
  makerModel: string | null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  pending: { label: "Pending", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  accepted: { label: "Accepted", variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
  rejected: { label: "Rejected", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  cancelled: { label: "Cancelled", variant: "outline", icon: <Ban className="h-3 w-3" /> },
  expired: { label: "Expired", variant: "outline", icon: <Clock className="h-3 w-3" /> },
};

export function AdminTransfers() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWithRetry = async (maxRetries = 2) => {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const { data, error: fnError } = await supabase.functions.invoke(
            "admin-data",
            { body: { type: "transfers" } }
          );

          if (fnError) throw fnError;
          return data?.transfers || [];
        } catch (err) {
          if (attempt === maxRetries) throw err;
          console.log(`Transfers fetch attempt ${attempt + 1} failed, retrying...`);
          await new Promise(r => setTimeout(r, 1500));
        }
      }
    };

    const fetchTransfers = async () => {
      try {
        const transfersData = await fetchWithRetry();
        setTransfers(transfersData);
      } catch (err: any) {
        console.error("Failed to fetch transfers:", err);
        setError(err.message || "Failed to load transfers");
      } finally {
        setLoading(false);
      }
    };

    fetchTransfers();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Transfers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
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

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || { label: status, variant: "outline" as const, icon: null };
    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Transfers ({transfers.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {transfers.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No transfers found</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>From</TableHead>
                <TableHead></TableHead>
                <TableHead>To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell>
                    <div>
                      <span className="font-mono font-medium">{transfer.registrationNumber}</span>
                      {transfer.makerModel && (
                        <p className="text-xs text-muted-foreground">{transfer.makerModel}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{transfer.senderEmail}</TableCell>
                  <TableCell>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell className="text-sm">{transfer.recipient_email}</TableCell>
                  <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(transfer.created_at), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(transfer.expires_at), "dd MMM yyyy")}
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