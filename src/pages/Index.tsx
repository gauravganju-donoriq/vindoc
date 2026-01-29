import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  FileText, 
  Bell, 
  Car, 
  Wrench, 
  CheckCircle, 
  ArrowRightLeft,
  Lock,
  Smartphone,
  Sparkles
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

  const features = [
    {
      icon: FileText,
      title: "One place for all documents",
      description: "Insurance, RC, PUCC, fitness — stored securely and always accessible from any device."
    },
    {
      icon: Bell,
      title: "Smart reminders that work",
      description: "We'll call, email, or notify you — whatever works best. Never miss a renewal again."
    },
    {
      icon: Car,
      title: "Instant details with your number",
      description: "Enter your registration, we fetch 20+ vehicle details automatically from official records."
    },
    {
      icon: ArrowRightLeft,
      title: "Sell when you're ready",
      description: "All your data is already verified. List your vehicle in minutes, not hours."
    },
    {
      icon: Wrench,
      title: "Track every service",
      description: "Maintenance history that transfers with your vehicle when you sell. Build trust with buyers."
    },
    {
      icon: CheckCircle,
      title: "Verified ownership",
      description: "Photo verification builds trust when it's time to sell. Stand out from other sellers."
    }
  ];

  const steps = [
    {
      number: "01",
      title: "Enter your vehicle number",
      description: "We pull the details from official government records automatically."
    },
    {
      number: "02",
      title: "Snap photos of your documents",
      description: "Our AI reads them so you don't have to type anything manually."
    },
    {
      number: "03",
      title: "That's it. We'll take it from here.",
      description: "Reminders, renewals, records — all handled for you."
    }
  ];

  const painPoints = [
    "Where did I keep that insurance paper?",
    "Wait, my PUCC expired last month?",
    "Another challan... I completely forgot."
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold text-foreground">Valt</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth">Login</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/auth">Sign Up Free</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 md:py-28 lg:py-32 hero-gradient overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              AI-Powered Document Management
            </Badge>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight tracking-tight">
              Your vehicle's paperwork,
              <br />
              <span className="text-primary">finally under control.</span>
            </h1>
            
            <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Stop worrying about expired documents, forgotten renewals, and last-minute fines. 
              We handle the reminders. You enjoy the drive.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="px-8 text-base">
                <Link to="/auth">Start Free</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="px-8 text-base">
                <a href="#how-it-works">See How It Works</a>
              </Button>
            </div>
            
            <p className="mt-8 text-sm text-muted-foreground">
              Trusted by vehicle owners across India
            </p>
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-10">
              Sound familiar?
            </h2>
            
            <div className="space-y-4">
              {painPoints.map((quote, index) => (
                <div key={index} className="quote-card">
                  <p className="text-lg md:text-xl text-foreground italic">
                    "{quote}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-2">
              There's a better way.
            </h2>
            <div className="w-16 h-1 bg-primary mx-auto mb-8 rounded-full" />
            <p className="text-lg text-muted-foreground leading-relaxed">
              Valt keeps all your vehicle documents in one secure place — and reminds you before anything expires.
              No more scrambling. No more surprises.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
                Everything you need. Nothing you don't.
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <div key={index} className="feature-card bg-card border border-border rounded-xl p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 md:py-28 scroll-mt-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
                Get started in under a minute
              </h2>
            </div>
            
            <div className="relative">
              {/* Connector line */}
              <div className="absolute left-6 top-12 bottom-12 w-px bg-border hidden md:block" />
              
              <div className="space-y-8">
                {steps.map((step, index) => (
                  <div key={index} className="relative flex gap-6">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm z-10">
                      {step.number}
                    </div>
                    <div className="flex-1 bg-card border border-border rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {step.title}
                      </h3>
                      <p className="text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl md:text-2xl font-semibold text-foreground text-center mb-10">
              Built for Indian vehicle owners
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium text-foreground mb-1">Bank-grade security</h3>
                <p className="text-sm text-muted-foreground">Your documents are encrypted and secure</p>
              </div>
              
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Car className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium text-foreground mb-1">All vehicle types</h3>
                <p className="text-sm text-muted-foreground">Cars, bikes, trucks — we support them all</p>
              </div>
              
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium text-foreground mb-1">Works everywhere</h3>
                <p className="text-sm text-muted-foreground">Access from any device, anytime</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-8">
              Ready to stop worrying about paperwork?
            </h2>
            <Button size="lg" asChild className="px-10 text-base">
              <Link to="/auth">Start Free</Link>
            </Button>
            <p className="mt-6 text-sm text-muted-foreground">
              No credit card required · Takes 30 seconds
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Valt</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 · Made in India
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
