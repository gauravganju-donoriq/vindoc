import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Phone, Bell, Globe, Loader2, Save, Shield, History, Clock, CheckCircle, XCircle, PhoneOff, ChevronLeft } from "lucide-react";
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
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "no_answer":
        return <PhoneOff className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-amber-500" />;
    }
  };

  const getLanguageLabel = (langCode: string | null) => {
    const lang = LANGUAGES.find(l => l.id === langCode);
    return lang ? `${lang.flag} ${lang.name.split(" ")[0]}` : "English";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group">
              <ChevronLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-sm font-medium hidden sm:inline">Back</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gray-900 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
          </div>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>
      </motion.header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Two-column layout on lg+ */}
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Main Settings - Takes more space */}
            <div className="lg:col-span-3">
              <Card className="border-gray-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Phone className="h-5 w-5 text-gray-400" />
                    Voice Call Reminders
                  </CardTitle>
                  <CardDescription>
                    Get automated voice calls to remind you about expiring documents
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Phone Number */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm">Phone Number</Label>
                    <div className="flex gap-2">
                      <div className="flex items-center px-3 bg-gray-100 rounded-lg border border-gray-200 text-sm text-gray-500">
                        +91
                      </div>
                      <Input
                        id="phone"
                        type="tel"
                        value={phoneNumber.replace(/^\+91/, "")}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="9876543210"
                        className="bg-gray-50 focus:bg-white"
                      />
                    </div>
                    <p className="text-xs text-gray-400">
                      We'll call this number to remind you about expiring documents
                    </p>
                  </div>

                  {/* Voice Reminders Toggle */}
                  <div className="flex items-center justify-between py-3 border-t border-gray-100">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2 text-sm">
                        <Bell className="h-4 w-4 text-gray-400" />
                        Voice Reminders
                      </Label>
                      <p className="text-xs text-gray-400">
                        Receive automated voice calls for urgent alerts
                      </p>
                    </div>
                    <Switch
                      checked={voiceRemindersEnabled}
                      onCheckedChange={setVoiceRemindersEnabled}
                    />
                  </div>

                  {/* Preferred Language */}
                  <div className="space-y-2 py-3 border-t border-gray-100">
                    <Label className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-gray-400" />
                      Preferred Language
                    </Label>
                    <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
                      <SelectTrigger className="w-full bg-gray-50 focus:bg-white">
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
                    <p className="text-xs text-gray-400">
                      Voice calls will be in your preferred language
                    </p>
                  </div>

                  {/* Info Box */}
                  <div className="bg-gray-50 rounded-xl p-4 text-sm border border-gray-100">
                    <p className="font-medium mb-2 text-gray-900">When will I receive calls?</p>
                    <ul className="space-y-1 text-gray-500 text-xs">
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
            </div>

            {/* Call History - Sidebar */}
            <div className="lg:col-span-2">
              {callLogs.length > 0 ? (
                <Card className="border-gray-100">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <History className="h-5 w-5 text-gray-400" />
                      Recent Calls
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {callLogs.map((log) => (
                        <div 
                          key={log.id} 
                          className="flex items-center justify-between py-3 px-3 bg-gray-50 rounded-xl"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {getStatusIcon(log.status)}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {log.call_type === "test_call" 
                                  ? "Test Call" 
                                  : log.document_type 
                                    ? `${log.document_type.charAt(0).toUpperCase() + log.document_type.slice(1)} Reminder`
                                    : "Voice Reminder"
                                }
                              </p>
                              <p className="text-xs text-gray-400">
                                {log.vehicles?.registration_number && (
                                  <span>{log.vehicles.registration_number} • </span>
                                )}
                                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
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
              ) : (
                <Card className="border-gray-100">
                  <CardContent className="py-12 text-center">
                    <History className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 text-sm">No call history yet</p>
                    <p className="text-gray-400 text-xs mt-1">
                      Your voice call reminders will appear here
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Settings;
