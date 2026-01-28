

# Voice Call Reminder System with Bolna AI

## Overview

This plan implements an automated voice call reminder system using **Bolna AI** - an Indian voice AI platform that supports Hindi and multiple regional languages. The system will call users on their verified phone numbers to remind them about expiring vehicle documents.

## Why Bolna AI?

| Feature | Details |
|---------|---------|
| **Indian Focus** | Built for India with native support for Hindi, Tamil, Telugu, and other regional languages |
| **Simple API** | REST API for making outbound calls with dynamic variables |
| **Pricing** | ~$0.06/minute (~₹5/minute) - affordable for reminder calls |
| **No Code Agent Builder** | Create voice agents via dashboard with custom prompts |
| **Telephony Integration** | Built-in phone number provisioning for India |

## Current State

### What Exists
- Edge function `check-expiry-alerts` that runs daily
- Email notifications via Resend
- AI-generated content for document expiry advice
- Notification logging to prevent duplicates

### What's Missing
- User phone numbers in the database
- Bolna AI integration
- Voice call triggering logic
- Call attempt logging

## Implementation Plan

### Phase 1: Database Updates

Add phone number storage for users. Since we don't have a `profiles` table, we'll create one:

```sql
-- Create profiles table for user preferences
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT,
  phone_verified BOOLEAN DEFAULT false,
  voice_reminders_enabled BOOLEAN DEFAULT true,
  preferred_language TEXT DEFAULT 'en', -- en, hi, ta, te, etc.
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Create voice_call_logs table
CREATE TABLE voice_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL, -- 'expiry_reminder', 'service_reminder', 'lifespan_alert'
  document_type TEXT,
  bolna_call_id TEXT,
  status TEXT DEFAULT 'initiated', -- initiated, completed, failed, no_answer
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE voice_call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own call logs" ON voice_call_logs FOR SELECT USING (auth.uid() = user_id);
```

### Phase 2: Create Bolna Voice Agent

Set up a voice agent in Bolna dashboard with:

**Agent Configuration:**
- **Name:** "CertChaperone Reminder"
- **Language:** Hindi + English (bilingual)
- **Voice:** Natural Indian female voice (e.g., "Nila" from ElevenLabs via Bolna)
- **Prompt Template:** Dynamic with user_data variables

**Agent Script (Bilingual):**
```text
You are a helpful assistant from CertChaperone, a vehicle document management app.

You are calling {{owner_name}} about their vehicle {{vehicle_number}}.

Greeting (Hindi + English mix):
"Namaste {{owner_name}} ji! This is CertChaperone calling. 
Aapki gaadi {{vehicle_number}} ka {{document_type}} {{days_message}}."

If document is expiring soon:
"Please renew it soon to avoid any penalties. 
Renewal karne mein koi help chahiye toh humari app dekh sakte hain."

If document is expired:
"Ye already expire ho chuka hai. Driving with expired documents can lead to fines.
Please renew it immediately."

End politely:
"Thank you for using CertChaperone. Take care!"

Keep the call under 30 seconds. Be warm and helpful.
```

### Phase 3: Create Voice Call Edge Function

**New file: `supabase/functions/make-voice-call/index.ts`**

```typescript
// Edge function to trigger Bolna voice calls
serve(async (req) => {
  const { userId, vehicleId, documentType, daysUntilExpiry } = await req.json();
  
  // Fetch user profile for phone number
  const { data: profile } = await supabase
    .from('profiles')
    .select('phone_number, voice_reminders_enabled, preferred_language')
    .eq('id', userId)
    .single();
  
  if (!profile?.phone_number || !profile.voice_reminders_enabled) {
    return { skipped: true, reason: 'No phone or reminders disabled' };
  }
  
  // Fetch vehicle details
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('registration_number, owner_name, maker_model')
    .eq('id', vehicleId)
    .single();
  
  // Make Bolna API call
  const response = await fetch('https://api.bolna.ai/call', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BOLNA_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      agent_id: BOLNA_AGENT_ID,
      recipient_phone_number: profile.phone_number,
      user_data: {
        owner_name: vehicle.owner_name || 'Sir/Madam',
        vehicle_number: vehicle.registration_number,
        document_type: documentType,
        days_message: daysUntilExpiry <= 0 
          ? 'expired ho gaya hai' 
          : `${daysUntilExpiry} din mein expire hone wala hai`
      }
    })
  });
  
  // Log the call attempt
  await supabase.from('voice_call_logs').insert({
    user_id: userId,
    vehicle_id: vehicleId,
    call_type: 'expiry_reminder',
    document_type: documentType,
    bolna_call_id: response.call_id,
    status: 'initiated'
  });
  
  return { success: true };
});
```

### Phase 4: Update Expiry Alert Function

Modify `check-expiry-alerts/index.ts` to trigger voice calls after sending emails:

```typescript
// After sending email, trigger voice call for critical alerts
if (doc.notificationType === 'expired' || doc.notificationType === '7_day') {
  // Only call for urgent items
  await fetch(`${supabaseUrl}/functions/v1/make-voice-call`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId: doc.vehicle.user_id,
      vehicleId: doc.vehicle.id,
      documentType: doc.documentType,
      daysUntilExpiry: doc.daysUntilExpiry
    })
  });
}
```

### Phase 5: Add User Settings UI

**Update Profile/Settings page to include:**

```text
┌────────────────────────────────────────────┐
│  Voice Call Reminders                       │
│                                             │
│  📞 Phone Number: [+91__________] [Verify] │
│                                             │
│  🔔 Enable voice reminders: [Toggle ON/OFF]│
│                                             │
│  🌐 Preferred Language:                    │
│     ○ English                              │
│     ● Hindi (हिंदी)                         │
│     ○ Tamil (தமிழ்)                         │
│     ○ Telugu (తెలుగు)                       │
│                                             │
│  ℹ️ We'll call you 7 days before documents │
│     expire and on the expiry date.         │
└────────────────────────────────────────────┘
```

## Technical Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                     Daily Cron Job (2:30 AM)                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              check-expiry-alerts Edge Function                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 1. Fetch vehicles with expiring documents                  ││
│  │ 2. Generate AI content                                      ││
│  │ 3. Send consolidated email via Resend                      ││
│  │ 4. For critical alerts (7-day, expired):                   ││
│  │    └─ Trigger make-voice-call function                     ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼ (for critical alerts)
┌─────────────────────────────────────────────────────────────────┐
│               make-voice-call Edge Function                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 1. Check user has phone & reminders enabled                ││
│  │ 2. Call Bolna AI API with dynamic variables                ││
│  │ 3. Log call attempt in voice_call_logs                     ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Bolna AI Platform                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ • Makes outbound call to user's phone                      ││
│  │ • Uses configured voice agent (Hindi/English)              ││
│  │ • Delivers personalized reminder message                   ││
│  │ • Sends webhook on call completion                         ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Required Secrets

| Secret | Purpose |
|--------|---------|
| `BOLNA_API_KEY` | Bolna AI API authentication |
| `BOLNA_AGENT_ID` | ID of the configured voice agent |

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| Database migration | Create | Add `profiles` and `voice_call_logs` tables |
| `supabase/functions/make-voice-call/index.ts` | Create | New edge function for Bolna API calls |
| `supabase/functions/check-expiry-alerts/index.ts` | Modify | Add voice call triggering logic |
| `src/pages/Settings.tsx` or similar | Create/Modify | User phone number and preference settings |
| `supabase/config.toml` | Modify | Add new edge function configuration |

## Call Triggering Logic

| Alert Type | Call Triggered? | Reason |
|------------|-----------------|--------|
| 30-day expiry | ❌ No | Email is sufficient for advance notice |
| 7-day expiry | ✅ Yes | Urgent reminder needed |
| Expired | ✅ Yes | Critical - immediate action required |
| Service due 30-day | ❌ No | Lower priority |
| Service overdue | ✅ Yes | User should act now |
| Lifespan approaching | ❌ No | Email with detailed advice is better |

## Cost Estimation

| Metric | Value |
|--------|-------|
| Bolna cost per minute | ~₹5 ($0.06) |
| Average call duration | 30-45 seconds |
| Estimated cost per call | ~₹3-4 |
| Monthly calls (100 users, 2 calls each) | 200 calls = ~₹600-800/month |

## Next Steps After Implementation

1. Set up Bolna AI account and configure the voice agent
2. Add the API key as a secret
3. Test with a single phone number
4. Monitor call logs and success rates
5. Iterate on the voice script based on user feedback

