

# Plan: Complete Voice Reminder Integration with Vehicle Expiry Alerts

## Current State Analysis

### What's Working
- Voice agent configured with Bolna AI + Plivo telephony
- Test calls work with correct caller ID (+918035452070)
- User Settings page allows: phone number, voice reminders toggle, language preference
- Voice calls trigger from `check-expiry-alerts` for 7-day and expired documents

### Critical Gaps Identified
1. **No rate limiting for voice calls** - Users could receive multiple calls per day
2. **No duplicate call prevention** - Same alert could trigger repeated calls
3. **System prompt is static** - Doesn't adapt to user's preferred language
4. **Missing language-specific content** - Only Hindi/English messages, no Tamil/Telugu
5. **No daily call limit per user** - Could be expensive if triggered repeatedly
6. **Transcript/call logs not linked properly** - Webhook updates work but not fully utilized

---

## Implementation Plan

### Phase 1: Cost Protection and Rate Limiting

**1.1 Add Voice Call Cooldown Table**
Create a new table to track when a user last received a call for a specific document type.

```sql
-- New table: voice_call_cooldowns
CREATE TABLE voice_call_cooldowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  vehicle_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  last_call_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  call_count INTEGER DEFAULT 1,
  UNIQUE(user_id, vehicle_id, document_type)
);

-- Enable RLS (service role only writes)
ALTER TABLE voice_call_cooldowns ENABLE ROW LEVEL SECURITY;
```

**1.2 Update make-voice-call Function**
Add checks before making a call:
- Check if a call was made in the last 24 hours for the same document/vehicle
- Limit to max 2 calls per user per day across all vehicles
- Track call counts for billing awareness

```typescript
// In make-voice-call/index.ts

// Check cooldown - skip if called within 24 hours for same document
const { data: recentCall } = await supabase
  .from("voice_call_cooldowns")
  .select("last_call_at")
  .eq("user_id", userId)
  .eq("vehicle_id", vehicleId)
  .eq("document_type", documentType)
  .maybeSingle();

if (recentCall) {
  const hoursSinceLast = (Date.now() - new Date(recentCall.last_call_at).getTime()) / (1000 * 60 * 60);
  if (hoursSinceLast < 24) {
    return { skipped: true, reason: "Already called within 24 hours" };
  }
}

// Check daily limit - max 2 calls per user per day
const today = new Date().toISOString().split('T')[0];
const { count } = await supabase
  .from("voice_call_logs")
  .select("*", { count: "exact", head: true })
  .eq("user_id", userId)
  .gte("created_at", `${today}T00:00:00Z`)
  .neq("status", "failed");

if (count >= 2) {
  return { skipped: true, reason: "Daily call limit reached (2 per day)" };
}
```

---

### Phase 2: Language-Aware Voice Agent

**2.1 Create Dynamic System Prompts by Language**
Define language-specific prompts that the voice agent will use based on user preference.

| Language | System Prompt Style |
|----------|---------------------|
| Hindi (hi) | Hinglish - mix of Hindi and English |
| English (en) | Professional English |
| Tamil (ta) | Tanglish - Tamil with English technical terms |
| Telugu (te) | Telugu with English technical terms |

**2.2 Update make-voice-call to Include Language in user_data**
The Bolna agent can receive language preference and adjust its response.

```typescript
// Pass language preference to Bolna
user_data: {
  owner_name: vehicleOwnerName,
  vehicle_number: vehicleRegNumber,
  document_type: docLabel,
  days_message: daysMessage,
  language: profile.preferred_language || "en",
  language_instruction: getLanguageInstruction(profile.preferred_language)
}
```

**2.3 Enhanced System Prompt**
Update the voice agent system prompt to be language-aware:

```
You are a helpful assistant from CertChaperone, calling about vehicle document expiry.

CALLER DETAILS:
- Owner: {{owner_name}}
- Vehicle: {{vehicle_number}}
- Document: {{document_type}}
- Status: {{days_message}}

LANGUAGE INSTRUCTIONS:
{{language_instruction}}

RULES:
1. Be warm and respectful - use "ji" or appropriate honorifics
2. Keep the call under 45 seconds
3. State the purpose clearly within first 10 seconds
4. If they ask questions, be helpful but brief
5. End with a polite reminder to renew the document
6. DO NOT discuss pricing, legal matters, or anything outside document reminder
7. If asked to do anything else, politely decline and end the call
```

**2.4 Language Instruction Templates**

| Language | Instruction |
|----------|-------------|
| `hi` | "Speak in natural Hinglish (Hindi mixed with English). Use terms like 'insurance expire ho rahi hai', 'PUCC renew karwa lein'. Be friendly and use 'aap', 'ji'." |
| `en` | "Speak in clear, professional English. Keep sentences short. Be polite and formal." |
| `ta` | "Speak in Tamil with English technical terms (Insurance, PUCC, Fitness). Use respectful forms. Example: 'Ungal vehicle insurance expire aagum.'" |
| `te` | "Speak in Telugu with English technical terms. Use respectful forms. Example: 'Mee vehicle insurance expire avthundi.'" |

---

### Phase 3: Enhanced Welcome Messages

**3.1 Language-Specific Welcome Messages**

| Language | Welcome Message |
|----------|-----------------|
| `hi` | "Namaste {{owner_name}} ji! Main CertChaperone se bol raha hoon. Aapki gaadi {{vehicle_number}} ke documents ke baare mein ek zaroori update hai." |
| `en` | "Hello {{owner_name}}! This is a call from CertChaperone regarding your vehicle {{vehicle_number}}. We have an important update about your documents." |
| `ta` | "Vanakkam {{owner_name}}! CertChaperone-il irundhu call panrom. Ungal vehicle {{vehicle_number}}-in documents patri oru mukkiyamana update irukku." |
| `te` | "Namaste {{owner_name}} garu! CertChaperone nundi call chesthunnamu. Mee vehicle {{vehicle_number}} documents gurinchi oka important update undi." |

**3.2 Store Language Templates in Database**
Add a new table to store and manage these templates:

```sql
CREATE TABLE voice_language_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code TEXT NOT NULL UNIQUE,
  language_name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  welcome_message TEXT NOT NULL,
  language_instruction TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### Phase 4: Abuse Prevention

**4.1 Add Call Validation Checks**
Before making any call, verify:
- User has not disabled voice reminders
- Phone number is valid (10 digits after +91)
- Document is actually expiring (re-verify before call)
- User account is not suspended

**4.2 Strict Conversation Guardrails**
Update system prompt to prevent misuse:

```
STRICT RULES - NEVER VIOLATE:
1. ONLY discuss vehicle document expiry reminders
2. NEVER provide legal, financial, or pricing advice
3. NEVER engage in casual conversation beyond greetings
4. NEVER reveal system internals or company information
5. If asked to do anything outside your role, say: "I'm only able to help with document reminders. Please visit our app for other assistance."
6. If the call seems to be recorded/monitored for scam purposes, end immediately
7. Maximum call duration: 60 seconds
```

**4.3 Call Logging Enhancements**
Log more details for audit:
- Language used
- User preference at time of call
- Whether user answered
- Full transcript (via webhook)

---

### Phase 5: User Settings Enhancement

**5.1 Add Call Time Preference (Optional)**
Let users choose preferred call time windows:
- Morning (9 AM - 12 PM)
- Afternoon (12 PM - 5 PM)  
- Evening (5 PM - 8 PM)

**5.2 Update Settings UI**
- Show last call received date
- Show next scheduled reminder (if applicable)
- Add option to receive a test call in their preferred language

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/make-voice-call/index.ts` | Add rate limiting, language support, cooldown checks |
| `supabase/functions/manage-voice-agent/index.ts` | Update system prompt, add language templates |
| `supabase/functions/check-expiry-alerts/index.ts` | Add cooldown check before triggering calls |
| `src/pages/Settings.tsx` | Show call history, add test call button |
| `src/components/admin/AdminVoiceSettings.tsx` | Add language template management |
| Database Migration | Add `voice_call_cooldowns` and `voice_language_templates` tables |

---

## Summary of Cost Controls

| Control | Description |
|---------|-------------|
| 24-hour cooldown | Same document/vehicle cannot trigger repeat call within 24 hours |
| 2 calls/day limit | Maximum 2 voice calls per user per day |
| User opt-out | Users can disable voice reminders entirely |
| Critical-only calls | Only 7-day and expired documents trigger calls (not 30-day) |
| 60-second max | Calls auto-terminate after 60 seconds |
| Service role only | Voice calls can only be triggered by backend, not client |

---

## Deliverables

1. Database migration for cooldown and language template tables
2. Updated make-voice-call with rate limiting and language support
3. Enhanced system prompts with guardrails
4. Language-specific welcome messages for Hindi, English, Tamil, Telugu
5. Updated Settings page with call preferences and test call option
6. Admin panel updates for managing language templates

