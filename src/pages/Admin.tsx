import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminActivity } from "@/components/admin/AdminActivity";
import { AdminVehicles } from "@/components/admin/AdminVehicles";
import { AdminTransfers } from "@/components/admin/AdminTransfers";
import { AdminClaims } from "@/components/admin/AdminClaims";
import { AdminVoiceSettings } from "@/components/admin/AdminVoiceSettings";
import { AdminListings } from "@/components/admin/AdminListings";
import { Shield, ArrowLeft, LayoutDashboard, Users, Activity, Car, ArrowRightLeft, FileWarning, Mic, Tag } from "lucide-react";

const Admin = () => {
  const { isAdmin, isLoading } = useAdminCheck(true);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Verifying access...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect via useAdminCheck
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Admin Dashboard</h1>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-8 lg:w-[1000px]">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="vehicles" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              <span className="hidden sm:inline">Vehicles</span>
            </TabsTrigger>
            <TabsTrigger value="listings" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              <span className="hidden sm:inline">Listings</span>
            </TabsTrigger>
            <TabsTrigger value="transfers" className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Transfers</span>
            </TabsTrigger>
            <TabsTrigger value="claims" className="flex items-center gap-2">
              <FileWarning className="h-4 w-4" />
              <span className="hidden sm:inline">Claims</span>
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              <span className="hidden sm:inline">Voice</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <AdminOverview />
          </TabsContent>

          <TabsContent value="users">
            <AdminUsers />
          </TabsContent>

          <TabsContent value="vehicles">
            <AdminVehicles />
          </TabsContent>

          <TabsContent value="listings">
            <AdminListings />
          </TabsContent>

          <TabsContent value="transfers">
            <AdminTransfers />
          </TabsContent>

          <TabsContent value="claims">
            <AdminClaims />
          </TabsContent>

          <TabsContent value="voice">
            <AdminVoiceSettings />
          </TabsContent>

          <TabsContent value="activity">
            <AdminActivity />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;