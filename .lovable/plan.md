

# Voice Call Reminder System - Full Backend Implementation

## Research Summary

After analyzing the Bolna AI API documentation, I can confirm that **everything can be controlled programmatically** - no dashboard configuration is required. The API provides complete flexibility for:

| Capability | API Endpoint | Admin Control Possible? |
|------------|--------------|------------------------|
| Create voice agents | `POST /v2/agent` | Yes - full configuration |
| Update agent prompts | `PATCH /v2/agent/{id}` | Yes - change scripts anytime |
| Change voice provider | `PUT /v2/agent/{id}` | Yes - switch voices |
| List available voices | `GET /me/voices` | Yes - show options in UI |
| Make outbound calls | `POST /call` | Yes - with dynamic variables |
| Get call history | `GET /calls` | Yes - for logging |

### Available Voice Providers (Indian-friendly)
- **Sarvam** - Native Indian voices for Hindi, Tamil, Telugu, Kannada
- **ElevenLabs** - "Nila" voice with Hindi support
- **Smallest** - Low-latency Indian voices
- **Deepgram** - Hindi transcription support

---

## What You Need from Bolna

You only need **one secret**: `BOLNA_API_KEY`

The agent ID will be stored in the database, created programmatically via the API, and managed through your admin panel.

---

## Implementation Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                      Admin Panel (New Tab)                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Voice Agent Configuration                                   ││
│  │ ├─ Agent Name: [CertChaperone Reminder]                    ││
│  │ ├─ Voice Provider: [Sarvam ▼] (fetched via API)            ││
│  │ ├─ Voice: [Meera - Hindi Female ▼]                         ││
│  │ ├─ Language: [Hindi + English ▼]                           ││
│  │ ├─ System Prompt: [Editable text area]                     ││
│  │ ├─ Welcome Message: [Namaste...]                           ││
│  │ └─ [Save Configuration] [Test Call]                        ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              manage-voice-agent Edge Function                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Endpoints:                                                  ││
│  │ ├─ GET /voices → List available voices from Bolna          ││
│  │ ├─ POST /agent → Create new agent via Bolna API            ││
│  │ ├─ PUT /agent → Update agent config via Bolna API          ││
│  │ ├─ GET /agent → Get current agent configuration            ││
│  │ └─ POST /test-call → Make test call to admin phone         ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Database: voice_agent_config                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ id, bolna_agent_id, agent_name, voice_provider, voice_id,  ││
│  │ voice_name, language, system_prompt, welcome_message,      ││
│  │ is_active, created_at, updated_at                          ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Database - Voice Agent Configuration Table

Create a table to store the Bolna agent configuration (managed by admin):

```sql
CREATE TABLE public.voice_agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bolna_agent_id TEXT,                    -- ID returned by Bolna API
  agent_name TEXT NOT NULL DEFAULT 'CertChaperone Reminder',
  voice_provider TEXT NOT NULL DEFAULT 'sarvam',
  voice_id TEXT,
  voice_name TEXT,
  language TEXT NOT NULL DEFAULT 'hi',    -- hi, en, ta, te
  system_prompt TEXT NOT NULL,
  welcome_message TEXT NOT NULL,
  call_terminate_seconds INTEGER DEFAULT 60,
  hangup_after_silence INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Only super_admin can manage this
ALTER TABLE public.voice_agent_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can manage voice config" ON public.voice_agent_config
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));
```

### Phase 2: Edge Function - manage-voice-agent

Create a new edge function that interfaces with Bolna API:

**File: `supabase/functions/manage-voice-agent/index.ts`**

```typescript
// Endpoints:
// GET ?action=voices → List available voices
// GET ?action=config → Get current agent config
// POST { action: "create", config: {...} } → Create agent
// POST { action: "update", config: {...} } → Update agent
// POST { action: "test", phoneNumber: "+91..." } → Test call
```

Key functionality:
1. **List Voices**: Call `GET /me/voices` to fetch available voices for dropdown
2. **Create Agent**: Call `POST /v2/agent` with full configuration
3. **Update Agent**: Call `PATCH /v2/agent/{id}` when admin changes settings
4. **Test Call**: Call `POST /call` with admin's phone number

### Phase 3: Edge Function - make-voice-call (already planned)

Modify to read agent configuration from database instead of environment:

```typescript
// Fetch active agent config
const { data: agentConfig } = await supabase
  .from('voice_agent_config')
  .select('bolna_agent_id')
  .eq('is_active', true)
  .single();

// Use the stored agent ID
const response = await fetch('https://api.bolna.ai/call', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${BOLNA_API_KEY}` },
  body: JSON.stringify({
    agent_id: agentConfig.bolna_agent_id,
    recipient_phone_number: profile.phone_number,
    user_data: { /* dynamic variables */ }
  })
});
```

### Phase 4: Admin Panel - Voice Settings Tab

Add a new tab to the Admin Dashboard:

**File: `src/components/admin/AdminVoiceSettings.tsx`**

Features:
- Dropdown to select voice provider (Sarvam, ElevenLabs, Smallest)
- Dropdown to select specific voice (fetched from API)
- Language selector (Hindi, English, Tamil, Telugu)
- Editable system prompt with template variables
- Editable welcome message
- Call duration and silence timeout sliders
- "Save Configuration" button (creates/updates Bolna agent)
- "Send Test Call" button (calls admin's phone)
- Call logs table showing recent calls and statuses

### Phase 5: User Settings - Phone & Preferences

Create user-facing settings for phone number and preferences:

**File: `src/pages/Settings.tsx`** (or add to Dashboard)

Features:
- Phone number input with +91 prefix
- Phone verification toggle (future: OTP verification)
- Voice reminders enabled/disabled toggle
- Preferred language selector

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| Database migration | Create | Add `voice_agent_config` table |
| `supabase/functions/manage-voice-agent/index.ts` | Create | Admin API for Bolna agent management |
| `supabase/functions/make-voice-call/index.ts` | Create | Make calls using stored agent config |
| `src/components/admin/AdminVoiceSettings.tsx` | Create | Admin UI for voice configuration |
| `src/pages/Admin.tsx` | Modify | Add Voice Settings tab |
| `src/pages/Settings.tsx` | Create | User phone/preference settings |
| `src/App.tsx` | Modify | Add Settings route |
| `supabase/config.toml` | Modify | Add new edge function |

---

## Admin Voice Settings UI Mockup

```text
┌────────────────────────────────────────────────────────────────────┐
│  🎙️ Voice Agent Configuration                                      │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Agent Status: ● Active (ID: abc123...)        [Deactivate]       │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Voice Settings                                              │  │
│  │                                                             │  │
│  │ Provider:    [Sarvam          ▼]                           │  │
│  │ Voice:       [Meera (Hindi Female) ▼]                      │  │
│  │ Language:    [Hindi           ▼]                           │  │
│  │                                                             │  │
│  │ Call Settings:                                             │  │
│  │ Max Duration: [60] seconds                                 │  │
│  │ Silence Timeout: [10] seconds                              │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Script Configuration                                        │  │
│  │                                                             │  │
│  │ System Prompt:                                              │  │
│  │ ┌─────────────────────────────────────────────────────────┐│  │
│  │ │ You are a helpful assistant from CertChaperone.        ││  │
│  │ │ You are calling {{owner_name}} about vehicle           ││  │
│  │ │ {{vehicle_number}}. The {{document_type}}              ││  │
│  │ │ {{days_message}}. Be warm and helpful.                 ││  │
│  │ └─────────────────────────────────────────────────────────┘│  │
│  │                                                             │  │
│  │ Welcome Message:                                            │  │
│  │ ┌─────────────────────────────────────────────────────────┐│  │
│  │ │ Namaste {{owner_name}} ji! CertChaperone se bol rahe   ││  │
│  │ │ hain. Aapki gaadi ke documents ke baare mein call hai. ││  │
│  │ └─────────────────────────────────────────────────────────┘│  │
│  │                                                             │  │
│  │ Available Variables: {{owner_name}}, {{vehicle_number}},   │  │
│  │ {{document_type}}, {{days_message}}                        │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  [💾 Save Configuration]    [📞 Send Test Call]                   │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│  📊 Recent Call Logs                                               │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ Phone         │ Vehicle   │ Status    │ Duration │ Time    │   │
│  │ +91 98xxx     │ KL01AY... │ Completed │ 28s      │ 2h ago  │   │
│  │ +91 87xxx     │ MH12AB... │ No Answer │ -        │ 5h ago  │   │
│  └────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

---

## Required Secret

| Secret | Purpose |
|--------|---------|
| `BOLNA_API_KEY` | Single API key for all Bolna operations |

No agent ID needed as a secret - it will be stored in the database after programmatic creation.

---

## Technical Notes

### Bolna Agent Creation Payload

When admin saves configuration, we send this to Bolna:

```json
{
  "agent_config": {
    "agent_name": "CertChaperone Reminder",
    "agent_welcome_message": "Namaste {{owner_name}} ji!...",
    "tasks": [{
      "task_type": "conversation",
      "tools_config": {
        "synthesizer": {
          "provider": "sarvam",
          "provider_config": {
            "voice": "meera",
            "model": "bulbul:v1"
          }
        },
        "transcriber": {
          "provider": "deepgram",
          "model": "nova-3",
          "language": "hi"
        },
        "llm_agent": {
          "llm_config": {
            "provider": "openai",
            "model": "gpt-4.1-mini",
            "temperature": 0.3
          }
        }
      },
      "task_config": {
        "call_terminate": 60,
        "hangup_after_silence": 10
      }
    }]
  },
  "agent_prompts": {
    "task_1": {
      "system_prompt": "You are a helpful assistant..."
    }
  }
}
```

### Dynamic Variables in Calls

When making calls, we pass user-specific data:

```json
{
  "agent_id": "stored-agent-id",
  "recipient_phone_number": "+919876543210",
  "user_data": {
    "owner_name": "Subhash",
    "vehicle_number": "KL01CX6504",
    "document_type": "Insurance",
    "days_message": "7 din mein expire hone wala hai"
  }
}
```

---

## Next Steps

1. You create a Bolna account at bolna.ai
2. Get the API key from your Bolna dashboard
3. Provide the API key when prompted
4. I'll implement the full system with admin controls

This approach gives you **complete control** over:
- Voice selection (can change anytime from admin panel)
- Script/prompt content (edit directly in UI)
- Call behavior (duration, silence timeout)
- Language settings
- Testing before going live

