import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Car, 
  FileText, 
  Shield, 
  Bell, 
  Settings, 
  User, 
  Search,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Info
} from "lucide-react";
import { Link } from "react-router-dom";

const StyleGuide = () => {
  const colors = [
    { name: "Primary", variable: "--primary", description: "Main actions, links, focus states" },
    { name: "Background", variable: "--background", description: "Page background" },
    { name: "Card", variable: "--card", description: "Card surfaces" },
    { name: "Foreground", variable: "--foreground", description: "Main text color" },
    { name: "Muted", variable: "--muted", description: "Secondary backgrounds" },
    { name: "Muted Foreground", variable: "--muted-foreground", description: "Secondary text" },
    { name: "Border", variable: "--border", description: "Borders and dividers" },
  ];

  const semanticColors = [
    { name: "Success", variable: "--success", description: "Positive states, confirmations" },
    { name: "Warning", variable: "--warning", description: "Caution, attention needed" },
    { name: "Destructive", variable: "--destructive", description: "Errors, dangerous actions" },
  ];

  const typographyScale = [
    { name: "Display", size: "1.875rem", weight: "700", lineHeight: "1.2", className: "text-3xl font-bold" },
    { name: "H1", size: "1.5rem", weight: "600", lineHeight: "1.3", className: "text-2xl font-semibold" },
    { name: "H2", size: "1.25rem", weight: "600", lineHeight: "1.4", className: "text-xl font-semibold" },
    { name: "H3", size: "1.125rem", weight: "500", lineHeight: "1.4", className: "text-lg font-medium" },
    { name: "Body", size: "1rem", weight: "400", lineHeight: "1.6", className: "text-base" },
    { name: "Small", size: "0.875rem", weight: "400", lineHeight: "1.5", className: "text-sm" },
    { name: "Caption", size: "0.75rem", weight: "400", lineHeight: "1.4", className: "text-xs" },
  ];

  const icons = [
    { icon: Car, name: "Car" },
    { icon: FileText, name: "FileText" },
    { icon: Shield, name: "Shield" },
    { icon: Bell, name: "Bell" },
    { icon: Settings, name: "Settings" },
    { icon: User, name: "User" },
    { icon: Search, name: "Search" },
    { icon: Plus, name: "Plus" },
    { icon: Edit, name: "Edit" },
    { icon: Trash2, name: "Trash2" },
    { icon: Check, name: "Check" },
    { icon: X, name: "X" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">Valt</h1>
              <p className="text-xs text-muted-foreground">Design System & Style Guide</p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link to="/dashboard">Back to App</Link>
          </Button>
        </div>
      </header>

      <main className="container py-8 space-y-12">
        {/* Brand Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Brand</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-6">
                <div className="h-20 w-20 rounded-xl bg-primary flex items-center justify-center shadow-soft-lg">
                  <Shield className="h-10 w-10 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Valt</h3>
                  <p className="text-muted-foreground">Your secure vault for vehicle documents, service records, and ownership transfers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Color Palette */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Color Palette</h2>
          <p className="text-muted-foreground mb-6">A minimal, eye-comfortable palette with sophisticated slate gray as the primary color and warm neutrals.</p>
          
          <div className="space-y-6">
            {/* Core Colors */}
            <div>
              <h3 className="text-lg font-medium mb-3">Core Colors</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {colors.map((color) => (
                  <div key={color.name} className="space-y-2">
                    <div 
                      className="h-20 rounded-lg shadow-soft border"
                      style={{ backgroundColor: `hsl(var(${color.variable}))` }}
                    />
                    <div>
                      <p className="font-medium text-sm">{color.name}</p>
                      <p className="text-xs text-muted-foreground">{color.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Semantic Colors */}
            <div>
              <h3 className="text-lg font-medium mb-3">Semantic Colors</h3>
              <div className="grid grid-cols-3 gap-4">
                {semanticColors.map((color) => (
                  <div key={color.name} className="space-y-2">
                    <div 
                      className="h-20 rounded-lg shadow-soft"
                      style={{ backgroundColor: `hsl(var(${color.variable}))` }}
                    />
                    <div>
                      <p className="font-medium text-sm">{color.name}</p>
                      <p className="text-xs text-muted-foreground">{color.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* Typography */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Typography</h2>
          <p className="text-muted-foreground mb-6">Using Inter, a typeface designed for screen readability with excellent legibility at small sizes.</p>
          
          <Card>
            <CardContent className="pt-6 space-y-6">
              {typographyScale.map((type) => (
                <div key={type.name} className="flex items-baseline gap-6 border-b pb-4 last:border-0 last:pb-0">
                  <div className="w-24 shrink-0">
                    <p className="text-sm font-medium">{type.name}</p>
                    <p className="text-xs text-muted-foreground">{type.size} / {type.weight}</p>
                  </div>
                  <p className={type.className}>
                    The quick brown fox jumps over the lazy dog
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Buttons */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Buttons</h2>
          <p className="text-muted-foreground mb-6">Button variants for different contexts and importance levels.</p>
          
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="flex flex-wrap gap-4 items-center">
                  <Button>Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                  <Button variant="destructive">Destructive</Button>
                </div>
                
                <Separator />
                
                <div className="flex flex-wrap gap-4 items-center">
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                  <Button size="icon"><Plus className="h-4 w-4" /></Button>
                </div>

                <Separator />
                
                <div className="flex flex-wrap gap-4 items-center">
                  <Button disabled>Disabled</Button>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    With Icon
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Badges */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Badges</h2>
          <p className="text-muted-foreground mb-6">Status indicators and labels.</p>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-center">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge className="bg-success text-success-foreground hover:bg-success/80">Success</Badge>
                <Badge className="bg-warning text-warning-foreground hover:bg-warning/80">Warning</Badge>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Cards */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Cards</h2>
          <p className="text-muted-foreground mb-6">Container components for grouping related content.</p>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Default Card</CardTitle>
                <CardDescription>A simple card with header</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Card content goes here. This is a basic card layout.</p>
              </CardContent>
            </Card>

            <Card className="shadow-soft-md">
              <CardHeader>
                <CardTitle>Elevated Card</CardTitle>
                <CardDescription>With enhanced shadow</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">This card uses a soft shadow for subtle depth.</p>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle>Highlighted Card</CardTitle>
                <CardDescription>With primary accent</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">This card has a subtle primary color accent.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator />

        {/* Form Elements */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Form Elements</h2>
          <p className="text-muted-foreground mb-6">Input components for user data collection.</p>
          
          <Card>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="demo-input">Text Input</Label>
                    <Input id="demo-input" placeholder="Enter text..." />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="demo-disabled">Disabled Input</Label>
                    <Input id="demo-disabled" placeholder="Disabled..." disabled />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="demo-checkbox" />
                    <Label htmlFor="demo-checkbox">Checkbox option</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch id="demo-switch" />
                    <Label htmlFor="demo-switch">Toggle switch</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Alerts */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Alerts</h2>
          <p className="text-muted-foreground mb-6">Contextual feedback messages for user actions.</p>
          
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Information</AlertTitle>
              <AlertDescription>
                This is an informational alert for general messages.
              </AlertDescription>
            </Alert>

            <Alert className="border-success/50 bg-success/10">
              <Check className="h-4 w-4 text-success" />
              <AlertTitle className="text-success">Success</AlertTitle>
              <AlertDescription>
                Your action was completed successfully.
              </AlertDescription>
            </Alert>

            <Alert className="border-warning/50 bg-warning/10">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertTitle className="text-warning">Warning</AlertTitle>
              <AlertDescription>
                Please review this before proceeding.
              </AlertDescription>
            </Alert>

            <Alert variant="destructive">
              <X className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Something went wrong. Please try again.
              </AlertDescription>
            </Alert>
          </div>
        </section>

        <Separator />

        {/* Icons */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Iconography</h2>
          <p className="text-muted-foreground mb-6">Lucide icons used throughout the application.</p>
          
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-4">
                {icons.map(({ icon: Icon, name }) => (
                  <div key={name} className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors">
                    <Icon className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{name}</span>
                  </div>
                ))}
              </div>
              
              <Separator className="my-6" />
              
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <Car className="h-4 w-4 mx-auto text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-1 block">16px</span>
                </div>
                <div className="text-center">
                  <Car className="h-5 w-5 mx-auto text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-1 block">20px</span>
                </div>
                <div className="text-center">
                  <Car className="h-6 w-6 mx-auto text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-1 block">24px</span>
                </div>
                <div className="text-center">
                  <Car className="h-8 w-8 mx-auto text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-1 block">32px</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Spacing */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Spacing Scale</h2>
          <p className="text-muted-foreground mb-6">Consistent spacing using a 4px base unit.</p>
          
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {[
                  { name: "1 (4px)", size: "w-1" },
                  { name: "2 (8px)", size: "w-2" },
                  { name: "4 (16px)", size: "w-4" },
                  { name: "6 (24px)", size: "w-6" },
                  { name: "8 (32px)", size: "w-8" },
                  { name: "12 (48px)", size: "w-12" },
                  { name: "16 (64px)", size: "w-16" },
                ].map((space) => (
                  <div key={space.name} className="flex items-center gap-4">
                    <div className={`${space.size} h-4 bg-primary rounded`} />
                    <span className="text-sm text-muted-foreground">{space.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Shadows */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Shadows & Elevation</h2>
          <p className="text-muted-foreground mb-6">Soft shadows for subtle depth perception.</p>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {[
              { name: "None", className: "" },
              { name: "Soft SM", className: "shadow-soft-sm" },
              { name: "Soft", className: "shadow-soft" },
              { name: "Soft MD", className: "shadow-soft-md" },
              { name: "Soft LG", className: "shadow-soft-lg" },
            ].map((shadow) => (
              <div key={shadow.name} className="space-y-2">
                <div className={`h-20 bg-card rounded-lg border ${shadow.className}`} />
                <p className="text-sm text-center text-muted-foreground">{shadow.name}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-12">
        <div className="container py-6 text-center text-sm text-muted-foreground">
          Vehicle Document Manager Design System v1.0
        </div>
      </footer>
    </div>
  );
};

export default StyleGuide;
