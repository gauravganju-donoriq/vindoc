import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Car, FileText, ShieldCheck, AlertTriangle } from "lucide-react";

interface OverviewData {
  totalUsers: number;
  totalVehicles: number;
  verifiedVehicles: number;
  totalDocuments: number;
  expiringThisMonth: number;
}

export function AdminOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWithRetry = async (maxRetries = 2) => {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return null;

          const { data: overviewData, error: fnError } = await supabase.functions.invoke(
            "admin-data",
            { body: { type: "overview" } }
          );

          if (fnError) throw fnError;
          return overviewData;
        } catch (err) {
          if (attempt === maxRetries) throw err;
          console.log(`Attempt ${attempt + 1} failed, retrying...`);
          await new Promise(r => setTimeout(r, 1500));
        }
      }
    };

    const fetchOverview = async () => {
      try {
        const overviewData = await fetchWithRetry();
        setData(overviewData);
      } catch (err: any) {
        console.error("Failed to fetch overview:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
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

  const stats = [
    {
      title: "Total Users",
      value: data?.totalUsers || 0,
      icon: Users,
      description: "Registered users with vehicles",
    },
    {
      title: "Total Vehicles",
      value: data?.totalVehicles || 0,
      icon: Car,
      description: "Vehicles on platform",
    },
    {
      title: "Verified Vehicles",
      value: data?.verifiedVehicles || 0,
      icon: ShieldCheck,
      description: `${data?.totalVehicles ? Math.round((data.verifiedVehicles / data.totalVehicles) * 100) : 0}% verified`,
    },
    {
      title: "Documents",
      value: data?.totalDocuments || 0,
      icon: FileText,
      description: "Uploaded documents",
    },
    {
      title: "Expiring Soon",
      value: data?.expiringThisMonth || 0,
      icon: AlertTriangle,
      description: "Documents this month",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
