import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  FileText, 
  Bell, 
  Car, 
  Wrench, 
  CheckCircle, 
  ArrowRightLeft, 
  Lock, 
  MapPin, 
  Smartphone,
  AlertTriangle,
  Search,
  Clock
} from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const scrollToHowItWorks = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold text-foreground">Valt</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/auth">Login</Link>
            </Button>
            <Button asChild>
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="section-spacing hero-gradient">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
              Never miss a vehicle document renewal again
            </h1>
            <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
              One secure place for all your vehicle documents, with smart reminders that actually work.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="text-base px-8">
                <Link to="/auth">Get Started Free</Link>
              </Button>
              <Button size="lg" variant="outline" onClick={scrollToHowItWorks} className="text-base px-8">
                See How It Works
              </Button>
            </div>
            
            {/* Floating Icons Illustration */}
            <div className="mt-16 flex justify-center items-center gap-6 opacity-60">
              <div className="p-4 rounded-full bg-secondary animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <div className="p-5 rounded-full bg-secondary animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <Shield className="h-10 w-10 text-primary" />
              </div>
              <div className="p-4 rounded-full bg-secondary animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <Bell className="h-8 w-8 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement Section */}
      <section className="section-spacing bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-12">
              Tired of last-minute scrambles for expired documents?
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="flex flex-col items-center text-center">
                <div className="p-3 rounded-full bg-destructive/10 mb-4">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <p className="text-muted-foreground">
                  Fines and penalties for expired insurance
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="p-3 rounded-full bg-warning/10 mb-4">
                  <Search className="h-6 w-6 text-warning" />
                </div>
                <p className="text-muted-foreground">
                  Digging through files to find your RC
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="p-3 rounded-full bg-muted mb-4">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  Forgetting PUCC renewal until challaned
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="section-spacing bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground text-center mb-12">
              Everything your vehicle needs, in one place
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Card 1: Documents */}
              <div className="p-6 bg-white rounded-lg border border-border hover:border-primary/30 transition-colors">
                <FileText className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  All Documents Secured
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Store insurance, RC, PUCC, and all certificates in one vault.
                </p>
              </div>

              {/* Card 2: Alerts */}
              <div className="p-6 bg-white rounded-lg border border-border hover:border-primary/30 transition-colors">
                <Bell className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Smart Alerts That Work
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Get reminded before expiry via app, email, or phone calls.
                </p>
              </div>

              {/* Card 3: Auto-Fetch */}
              <div className="p-6 bg-white rounded-lg border border-border hover:border-primary/30 transition-colors">
                <Car className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Auto-Fetch Details
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Enter your registration number — we fetch the rest.
                </p>
              </div>

              {/* Card 4: Service History */}
              <div className="p-6 bg-white rounded-lg border border-border hover:border-primary/30 transition-colors">
                <Wrench className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Service History Tracking
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Log maintenance, repairs, and keep complete records.
                </p>
              </div>

              {/* Card 5: Verification */}
              <div className="p-6 bg-white rounded-lg border border-border hover:border-primary/30 transition-colors">
                <CheckCircle className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Verified Vehicles
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Build trust with AI-powered photo verification.
                </p>
              </div>

              {/* Card 6: Transfers */}
              <div className="p-6 bg-white rounded-lg border border-border hover:border-primary/30 transition-colors">
                <ArrowRightLeft className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Ownership Transfers
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Securely transfer vehicle records when you sell.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="section-spacing bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground text-center mb-12">
              Get started in 3 simple steps
            </h2>
            <div className="space-y-0">
              {/* Step 1 */}
              <div className="flex gap-6 pb-8">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                    1
                  </div>
                  <div className="w-px h-full bg-border mt-2" />
                </div>
                <div className="pb-8">
                  <h3 className="text-lg font-medium text-foreground mb-1">
                    Add your vehicle
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Enter registration number, we fetch the details
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-6 pb-8">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                    2
                  </div>
                  <div className="w-px h-full bg-border mt-2" />
                </div>
                <div className="pb-8">
                  <h3 className="text-lg font-medium text-foreground mb-1">
                    Upload your documents
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Our AI reads and organizes them automatically
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                    3
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-1">
                    Stay notified
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Relax — we'll remind you before anything expires
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="section-spacing bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground text-center mb-12">
              Built for Indian vehicle owners
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="flex flex-col items-center text-center">
                <div className="p-3 rounded-full bg-secondary mb-4">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium text-foreground mb-1">Secure Storage</h3>
                <p className="text-muted-foreground text-sm">
                  Bank-grade encryption for your documents
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="p-3 rounded-full bg-secondary mb-4">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium text-foreground mb-1">Made for India</h3>
                <p className="text-muted-foreground text-sm">
                  Supports all Indian vehicle types and documents
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="p-3 rounded-full bg-secondary mb-4">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium text-foreground mb-1">Works Everywhere</h3>
                <p className="text-muted-foreground text-sm">
                  Access from any device, anytime
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-spacing bg-secondary/50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-6">
              Ready to simplify your vehicle paperwork?
            </h2>
            <Button size="lg" asChild className="text-base px-10 mb-4">
              <Link to="/auth">Get Started Free</Link>
            </Button>
            <p className="text-muted-foreground text-sm">
              No credit card required. Start in 30 seconds.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-medium text-foreground">Valt</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Currently available for Indian vehicles only
            </p>
            <p className="text-sm text-muted-foreground">
              © 2026 Valt
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
