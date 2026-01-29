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
  ArrowRightLeft
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

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold text-foreground">Valt</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth">Login</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/auth">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight tracking-tight">
              Your vehicle's paperwork,
              <br />
              finally under control.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed">
              Stop worrying about expired documents, forgotten renewals, and last-minute fines.
              <br className="hidden md:block" />
              We handle the reminders. You enjoy the drive.
            </p>
            <div className="mt-10">
              <Button size="lg" asChild className="px-8">
                <Link to="/auth">Start Free</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Trusted by vehicle owners across India
            </p>
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-20 md:py-32 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-12">
              Sound familiar?
            </h2>
            <div className="space-y-8">
              <p className="pain-quote">
                "Where did I keep that insurance paper?"
              </p>
              <p className="pain-quote">
                "Wait, my PUCC expired last month?"
              </p>
              <p className="pain-quote">
                "Another challan... I completely forgot."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-6">
              There's a better way.
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Valt keeps all your vehicle documents in one secure place — and reminds you before anything expires.
              No more scrambling. No more surprises.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-12">
              Everything you need. Nothing you don't.
            </h2>
            
            <div className="space-y-0">
              {/* Feature 1 */}
              <div className="feature-divider" />
              <div className="py-8 flex gap-4">
                <FileText className="h-5 w-5 text-primary mt-1 shrink-0" />
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-1">
                    One place for all documents
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Insurance, RC, PUCC, fitness — stored securely and always accessible.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="feature-divider" />
              <div className="py-8 flex gap-4">
                <Bell className="h-5 w-5 text-primary mt-1 shrink-0" />
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-1">
                    Smart reminders that actually work
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We'll call, email, or notify you — whatever works best for you.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="feature-divider" />
              <div className="py-8 flex gap-4">
                <Car className="h-5 w-5 text-primary mt-1 shrink-0" />
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-1">
                    Instant details with your number plate
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Enter your registration, we fetch 20+ vehicle details automatically.
                  </p>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="feature-divider" />
              <div className="py-8 flex gap-4">
                <ArrowRightLeft className="h-5 w-5 text-primary mt-1 shrink-0" />
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-1">
                    Sell when you're ready
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    All your data is already verified. List your vehicle in minutes, not hours.
                  </p>
                </div>
              </div>

              {/* Feature 5 */}
              <div className="feature-divider" />
              <div className="py-8 flex gap-4">
                <Wrench className="h-5 w-5 text-primary mt-1 shrink-0" />
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-1">
                    Track every service
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Maintenance history that transfers with your vehicle when you sell.
                  </p>
                </div>
              </div>

              {/* Feature 6 */}
              <div className="feature-divider" />
              <div className="py-8 flex gap-4">
                <CheckCircle className="h-5 w-5 text-primary mt-1 shrink-0" />
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-1">
                    Verified ownership
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Photo verification builds trust when it's time to sell.
                  </p>
                </div>
              </div>
              <div className="feature-divider" />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-16">
              Get started in under a minute
            </h2>
            
            <div className="space-y-12">
              {/* Step 1 */}
              <div>
                <span className="step-number">1</span>
                <h3 className="text-lg font-medium text-foreground mt-2 mb-1">
                  Enter your vehicle number
                </h3>
                <p className="text-muted-foreground">
                  We pull the details from official records.
                </p>
              </div>

              {/* Step 2 */}
              <div>
                <span className="step-number">2</span>
                <h3 className="text-lg font-medium text-foreground mt-2 mb-1">
                  Snap photos of your documents
                </h3>
                <p className="text-muted-foreground">
                  Our AI reads them so you don't have to type.
                </p>
              </div>

              {/* Step 3 */}
              <div>
                <span className="step-number">3</span>
                <h3 className="text-lg font-medium text-foreground mt-2 mb-1">
                  That's it. We'll take it from here.
                </h3>
                <p className="text-muted-foreground">
                  Reminders, renewals, records — all handled.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-xl md:text-2xl font-medium text-foreground mb-4">
              Built for Indian vehicle owners
            </h2>
            <p className="text-muted-foreground">
              Bank-grade security · All vehicle types supported · Works on any device
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-8">
              Ready to stop worrying about paperwork?
            </h2>
            <Button size="lg" asChild className="px-8">
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
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="font-medium text-foreground">Valt</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 · India
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
