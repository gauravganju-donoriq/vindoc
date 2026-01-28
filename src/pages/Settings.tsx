import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Phone, Bell, Globe, Loader2, Save, Shield } from "lucide-react";

interface Profile {
  id: string;
  phone_number: string | null;
  phone_verified: boolean | null;
  voice_reminders_enabled: boolean | null;
  preferred_language: string | null;
}

const LANGUAGES = [
  { id: "en", name: "English" },
  { id: "hi", name: "Hindi (हिंदी)" },
  { id: "ta", name: "Tamil (தமிழ்)" },
  { id: "te", name: "Telugu (తెలుగు)" },
];

const Settings = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Form state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [voiceRemindersEnabled, setVoiceRemindersEnabled] = useState(true);
  const [preferredLanguage, setPreferredLanguage] = useState("en");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
      fetchProfile(session.user.id);
    };

    checkAuth();
  }, [navigate]);

  const fetchProfile = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setPhoneNumber(data.phone_number || "");
        setVoiceRemindersEnabled(data.voice_reminders_enabled ?? true);
        setPreferredLanguage(data.preferred_language || "en");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);

    try {
      // Format phone number
      let formattedPhone = phoneNumber.trim();
      if (formattedPhone && !formattedPhone.startsWith("+")) {
        formattedPhone = `+91${formattedPhone.replace(/^0/, "")}`;
      }

      const profileData = {
        id: userId,
        phone_number: formattedPhone || null,
        voice_reminders_enabled: voiceRemindersEnabled,
        preferred_language: preferredLanguage,
      };

      if (profile) {
        // Update existing profile
        const { error } = await supabase
          .from("profiles")
          .update(profileData)
          .eq("id", userId);

        if (error) throw error;
      } else {
        // Insert new profile
        const { error } = await supabase
          .from("profiles")
          .insert(profileData);

        if (error) throw error;
      }

      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully.",
      });

      // Refetch profile
      fetchProfile(userId);
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold">Settings</h1>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Voice Call Reminders
            </CardTitle>
            <CardDescription>
              Get automated voice calls to remind you about expiring documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex gap-2">
                <div className="flex items-center px-3 bg-muted rounded-l-md border border-r-0 text-sm text-muted-foreground">
                  +91
                </div>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber.replace(/^\+91/, "")}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="9876543210"
                  className="rounded-l-none"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                We'll call this number to remind you about expiring documents
              </p>
            </div>

            {/* Voice Reminders Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Voice Reminders
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive automated voice calls for urgent alerts
                </p>
              </div>
              <Switch
                checked={voiceRemindersEnabled}
                onCheckedChange={setVoiceRemindersEnabled}
              />
            </div>

            {/* Preferred Language */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Preferred Language
              </Label>
              <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.id} value={lang.id}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Voice calls will be in your preferred language
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">When will I receive calls?</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• 7 days before any document expires</li>
                <li>• When a document has already expired</li>
                <li>• When a scheduled service is overdue</li>
              </ul>
            </div>

            {/* Save Button */}
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Settings
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Settings;
