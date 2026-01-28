import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mic, Phone, Save, Loader2, CheckCircle, XCircle, Clock, PhoneOff, FileText, Play, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format, formatDistanceToNow } from "date-fns";

interface VoiceAgentConfig {
  id: string;
  bolna_agent_id: string | null;
  agent_name: string;
  voice_provider: string;
  voice_id: string | null;
  voice_name: string | null;
  language: string;
  system_prompt: string;
  welcome_message: string;
  call_terminate_seconds: number;
  hangup_after_silence: number;
  is_active: boolean;
}

interface CallLog {
  id: string;
  user_id: string;
  user_email: string;
  vehicle_id: string | null;
  call_type: string;
  document_type: string | null;
  status: string | null;
  duration_seconds: number | null;
  created_at: string;
  vehicles: { registration_number: string } | null;
  transcript: string | null;
  recording_url: string | null;
  hangup_reason: string | null;
}

const VOICE_PROVIDERS = [
  { id: "sarvam", name: "Sarvam AI (Indian Voices)" },
  { id: "elevenlabs", name: "ElevenLabs" },
  { id: "smallest", name: "Smallest (Low Latency)" },
];

const LANGUAGES = [
  { id: "hi", name: "Hindi" },
  { id: "en", name: "English" },
  { id: "ta", name: "Tamil" },
  { id: "te", name: "Telugu" },
];

const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant from CertChaperone, a vehicle document management app. You are calling {{owner_name}} about their vehicle {{vehicle_number}}. The {{document_type}} {{days_message}}. Be warm, helpful, and keep the conversation brief. Speak in a mix of Hindi and English (Hinglish) that is natural for Indian users.`;

const DEFAULT_WELCOME_MESSAGE = `Namaste {{owner_name}} ji! CertChaperone se bol rahe hain. Aapki gaadi {{vehicle_number}} ke documents ke baare mein ek important update hai.`;

export const AdminVoiceSettings = () => {
  const [config, setConfig] = useState<VoiceAgentConfig | null>(null);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testCallNumber, setTestCallNumber] = useState("");
  const [makingTestCall, setMakingTestCall] = useState(false);
  const [refreshingLogs, setRefreshingLogs] = useState(false);
  const { toast } = useToast();

  // Form state
  const [agentName, setAgentName] = useState("CertChaperone Reminder");
  const [voiceProvider, setVoiceProvider] = useState("sarvam");
  const [voiceId, setVoiceId] = useState("meera");
  const [language, setLanguage] = useState("hi");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [welcomeMessage, setWelcomeMessage] = useState(DEFAULT_WELCOME_MESSAGE);
  const [callTerminate, setCallTerminate] = useState(60);
  const [hangupSilence, setHangupSilence] = useState(10);

  useEffect(() => {
    fetchConfig();
    fetchCallLogs();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const configResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-voice-agent?action=config`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (configResponse.ok) {
        const data = await configResponse.json();
        if (data) {
          setConfig(data);
          setAgentName(data.agent_name);
          setVoiceProvider(data.voice_provider);
          setVoiceId(data.voice_id || "meera");
          setLanguage(data.language);
          setSystemPrompt(data.system_prompt);
          setWelcomeMessage(data.welcome_message);
          setCallTerminate(data.call_terminate_seconds);
          setHangupSilence(data.hangup_after_silence);
        }
      }
    } catch (error) {
      console.error("Error fetching config:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCallLogs = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-voice-agent?action=logs`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCallLogs(data || []);
      }
    } catch (error) {
      console.error("Error fetching call logs:", error);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
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
            action: config?.bolna_agent_id ? "update" : "create",
            config: {
              bolna_agent_id: config?.bolna_agent_id,
              agent_name: agentName,
              voice_provider: voiceProvider,
              voice_id: voiceId,
              language,
              system_prompt: systemPrompt,
              welcome_message: welcomeMessage,
              call_terminate_seconds: callTerminate,
              hangup_after_silence: hangupSilence,
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save configuration");
      }

      setConfig(data.config);
      toast({
        title: "Configuration saved",
        description: "Voice agent configuration has been updated successfully.",
      });
    } catch (error) {
      console.error("Error saving config:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save configuration",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestCall = async () => {
    if (!testCallNumber) {
      toast({
        title: "Phone number required",
        description: "Please enter a phone number for the test call",
        variant: "destructive",
      });
      return;
    }

    setMakingTestCall(true);
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
            phoneNumber: testCallNumber.startsWith("+") ? testCallNumber : `+91${testCallNumber}`,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to make test call");
      }

      toast({
        title: "Test call initiated",
        description: `A call has been placed to ${testCallNumber}`,
      });

      // Refresh logs after a short delay
      setTimeout(fetchCallLogs, 2000);
    } catch (error) {
      console.error("Error making test call:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to make test call",
        variant: "destructive",
      });
    } finally {
      setMakingTestCall(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Agent Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mic className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Voice Agent Configuration</CardTitle>
                <CardDescription>Configure the Bolna AI voice agent for automated calls</CardDescription>
              </div>
            </div>
            {config?.bolna_agent_id && (
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Active
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Voice Settings */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Agent Name</Label>
              <Input
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="CertChaperone Reminder"
              />
            </div>
            <div className="space-y-2">
              <Label>Voice Provider</Label>
              <Select value={voiceProvider} onValueChange={setVoiceProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VOICE_PROVIDERS.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
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
            </div>
          </div>

          {/* Call Settings */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Max Call Duration: {callTerminate} seconds</Label>
              <Slider
                value={[callTerminate]}
                onValueChange={([value]) => setCallTerminate(value)}
                min={30}
                max={120}
                step={10}
              />
            </div>
            <div className="space-y-2">
              <Label>Hangup After Silence: {hangupSilence} seconds</Label>
              <Slider
                value={[hangupSilence]}
                onValueChange={([value]) => setHangupSilence(value)}
                min={5}
                max={30}
                step={5}
              />
            </div>
          </div>

          {/* Script Configuration */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>System Prompt</Label>
              <Textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={4}
                placeholder="Instructions for the AI agent..."
              />
              <p className="text-xs text-muted-foreground">
                Available variables: {"{{owner_name}}"}, {"{{vehicle_number}}"}, {"{{document_type}}"}, {"{{days_message}}"}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Welcome Message</Label>
              <Textarea
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                rows={3}
                placeholder="Initial greeting message..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-4 pt-4 border-t">
            <Button onClick={handleSaveConfig} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Configuration
            </Button>

            <div className="flex items-center gap-2">
              <Input
                placeholder="+91 9633633400"
                value={testCallNumber}
                onChange={(e) => setTestCallNumber(e.target.value)}
                className="w-48"
              />
              <Button 
                variant="outline" 
                onClick={handleTestCall} 
                disabled={makingTestCall || !config?.bolna_agent_id}
              >
                {makingTestCall ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Phone className="h-4 w-4 mr-2" />}
                Test Call
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Recent Call Logs
              </CardTitle>
              <CardDescription>History of automated voice calls</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={async () => {
                setRefreshingLogs(true);
                await fetchCallLogs();
                setRefreshingLogs(false);
              }}
              disabled={refreshingLogs}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshingLogs ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {callLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No call logs yet. Test calls and automated reminders will appear here.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Transcript</TableHead>
                  <TableHead>Recording</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {callLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        <span className="capitalize">{log.status || "initiated"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">{log.user_email}</TableCell>
                    <TableCell>{log.vehicles?.registration_number || "-"}</TableCell>
                    <TableCell className="capitalize">{log.call_type.replace("_", " ")}</TableCell>
                    <TableCell>
                      {log.duration_seconds ? `${log.duration_seconds}s` : "-"}
                    </TableCell>
                    <TableCell>
                      {log.transcript ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 px-2">
                              <FileText className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Call Transcript</DialogTitle>
                            </DialogHeader>
                            <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
                              {log.transcript}
                            </div>
                            {log.hangup_reason && (
                              <div className="text-sm text-muted-foreground mt-2">
                                <span className="font-medium">Hangup Reason:</span> {log.hangup_reason}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.recording_url ? (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-2"
                          onClick={() => window.open(log.recording_url!, '_blank')}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Play
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
