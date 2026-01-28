import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Phone, Bell, Globe, Loader2, Save, Shield, History, Clock, CheckCircle, XCircle, PhoneOff } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface Profile {
  id: string;
  phone_number: string | null;
  phone_verified: boolean | null;
  voice_reminders_enabled: boolean | null;
  preferred_language: string | null;
}

interface CallLog {
  id: string;
  call_type: string;
  document_type: string | null;
  status: string | null;
  duration_seconds: number | null;
  created_at: string;
  language_used: string | null;
  vehicles: { registration_number: string } | null;
}

const LANGUAGES = [
  { id: "en", name: "English", flag: "🇬🇧" },
  { id: "hi", name: "Hindi (हिंदी)", flag: "🇮🇳" },
  { id: "ta", name: "Tamil (தமிழ்)", flag: "🇮🇳" },
  { id: "te", name: "Telugu (తెలుగు)", flag: "🇮🇳" },
];

const Settings = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTestCall, setSendingTestCall] = useState(false);
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
      fetchCallLogs(session.user.id);
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

  const fetchCallLogs = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("voice_call_logs")
        .select(`
          id,
          call_type,
          document_type,
          status,
          duration_seconds,
          created_at,
          language_used,
          vehicles (registration_number)
        `)
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setCallLogs(data || []);
    } catch (error) {
      console.error("Error fetching call logs:", error);
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

  const handleTestCall = async () => {
    if (!userId) return;
    
    const formattedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+91${phoneNumber.replace(/^0/, "")}`;
    
    if (formattedPhone.replace(/^\+91/, "").length !== 10) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive",
      });
      return;
    }

    setSendingTestCall(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-voice-agent`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "test",
            phoneNumber: formattedPhone,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to make test call");
      }

      toast({
        title: "Test call initiated",
        description: `You should receive a call at ${formattedPhone.slice(0, 6)}**** shortly in ${LANGUAGES.find(l => l.id === preferredLanguage)?.name || 'English'}`,
      });

      // Refetch call logs after delay
      setTimeout(() => userId && fetchCallLogs(userId), 3000);
    } catch (error) {
      console.error("Error making test call:", error);
      toast({
        title: "Unable to make test call",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
      });
    } finally {
      setSendingTestCall(false);
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-primary" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "no_answer":
        return <PhoneOff className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-accent-foreground" />;
    }
  };

  const getLanguageLabel = (langCode: string | null) => {
    const lang = LANGUAGES.find(l => l.id === langCode);
    return lang ? `${lang.flag} ${lang.name.split(" ")[0]}` : "English";
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

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {/* Voice Call Reminders */}
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
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </span>
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
                <li>• Maximum 2 calls per day</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Settings
              </Button>
              
              {phoneNumber && voiceRemindersEnabled && (
                <Button 
                  variant="outline" 
                  onClick={handleTestCall}
                  disabled={sendingTestCall || phoneNumber.replace(/^\+91/, "").replace(/\D/g, "").length !== 10}
                >
                  {sendingTestCall ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Phone className="h-4 w-4 mr-2" />
                  )}
                  Send Test Call
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Call History */}
        {callLogs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Calls
              </CardTitle>
              <CardDescription>
                Your recent voice call reminders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {callLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className="flex items-center justify-between py-3 px-4 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(log.status)}
                      <div>
                        <p className="text-sm font-medium">
                          {log.call_type === "test_call" 
                            ? "Test Call" 
                            : log.document_type 
                              ? `${log.document_type.charAt(0).toUpperCase() + log.document_type.slice(1)} Reminder`
                              : "Voice Reminder"
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {log.vehicles?.registration_number && (
                            <span>{log.vehicles.registration_number} • </span>
                          )}
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {log.language_used && (
                        <Badge variant="secondary" className="text-xs">
                          {getLanguageLabel(log.language_used)}
                        </Badge>
                      )}
                      {log.duration_seconds && (
                        <Badge variant="outline" className="text-xs">
                          {log.duration_seconds}s
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Settings;
