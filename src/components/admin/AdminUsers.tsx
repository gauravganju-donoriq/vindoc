import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Pause, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface User {
  userId: string;
  email: string;
  vehicleCount: number;
  documentCount: number;
  joinDate: string | null;
  isSuspended: boolean;
  suspendedAt: string | null;
  suspensionReason: string | null;
}

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = async () => {
    const fetchWithRetry = async (maxRetries = 2) => {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const { data, error: fnError } = await supabase.functions.invoke(
            "admin-data",
            { body: { type: "users" } }
          );

          if (fnError) throw fnError;
          return data?.users || [];
        } catch (err) {
          if (attempt === maxRetries) throw err;
          console.log(`Users fetch attempt ${attempt + 1} failed, retrying...`);
          await new Promise(r => setTimeout(r, 1500));
        }
      }
    };

    try {
      const usersData = await fetchWithRetry();
      setUsers(usersData);
    } catch (err: any) {
      console.error("Failed to fetch users:", err);
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSuspendUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-data", {
        body: { type: "suspend_user", userId },
      });

      if (error) throw error;
      toast.success("User suspended successfully");
      await fetchUsers();
    } catch (err: any) {
      console.error("Failed to suspend user:", err);
      toast.error(err.message || "Failed to suspend user");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnsuspendUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-data", {
        body: { type: "unsuspend_user", userId },
      });

      if (error) throw error;
      toast.success("User unsuspended successfully");
      await fetchUsers();
    } catch (err: any) {
      console.error("Failed to unsuspend user:", err);
      toast.error(err.message || "Failed to unsuspend user");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Platform Users</CardTitle>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Users ({users.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No users found</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">Vehicles</TableHead>
                <TableHead className="text-center">Documents</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>First Vehicle Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.userId} className={user.isSuspended ? "opacity-60" : ""}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell className="text-center">{user.vehicleCount}</TableCell>
                  <TableCell className="text-center">{user.documentCount}</TableCell>
                  <TableCell>
                    {user.isSuspended ? (
                      <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                        <Pause className="h-3 w-3" />
                        Suspended
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.joinDate
                      ? format(new Date(user.joinDate), "dd MMM yyyy")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {user.isSuspended ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnsuspendUser(user.userId)}
                        disabled={actionLoading === user.userId}
                      >
                        {actionLoading === user.userId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Unsuspend
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuspendUser(user.userId)}
                        disabled={actionLoading === user.userId}
                        className="text-destructive hover:text-destructive"
                      >
                        {actionLoading === user.userId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Pause className="h-4 w-4 mr-1" />
                            Suspend
                          </>
                        )}
                      </Button>
                    )}
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