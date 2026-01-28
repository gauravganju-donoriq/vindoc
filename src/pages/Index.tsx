import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, FileText, Bell, Car } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-full">
              <Shield className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Valt
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Your secure vault for vehicle documents, service records, and ownership transfers.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          <Card>
            <CardHeader>
              <FileText className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Document Storage</CardTitle>
              <CardDescription>
                Securely store your insurance, RC, PUCC, and other vehicle documents in one place.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Bell className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Expiry Alerts</CardTitle>
              <CardDescription>
                Visual indicators show you which documents are expiring soon or have already expired.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Car className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Auto-Fetch Details</CardTitle>
              <CardDescription>
                Enter your registration number and automatically fetch vehicle details from official records.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-sm text-muted-foreground">
          <p>Currently available for Indian vehicles only</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
