
# Plan: Configure Indian Caller ID + Bolna Webhooks

## Overview
This plan addresses two key requirements:
1. Ensure all outbound calls use your purchased Indian number (+918035452070) as the caller ID
2. Create a webhook endpoint to receive call updates from Bolna (status, transcript, duration, recording)

---

## Part 1: Fix Caller ID

### Problem
Currently, calls are made without specifying the `from_phone_number` parameter, so Bolna uses their default US number.

### Solution
Add the `from_phone_number` parameter to all Bolna `/call` API requests.

### Files to Modify

**1. supabase/functions/manage-voice-agent/index.ts**
- Add `from_phone_number: "+918035452070"` to the test call request body (around line 379-389)

**2. supabase/functions/make-voice-call/index.ts**
- Add `from_phone_number: "+918035452070"` to the production call request body (around line 115)

### Code Changes

```text
// In manage-voice-agent/index.ts (test call)
body: JSON.stringify({
  agent_id: config.bolna_agent_id,
  recipient_phone_number: phoneNumber,
  from_phone_number: "+918035452070",  // <-- ADD THIS
  user_data: { ... }
})
```

```text
// In make-voice-call/index.ts (production calls)
body: JSON.stringify({
  agent_id: agentConfig.bolna_agent_id,
  recipient_phone_number: profile.phone_number,
  from_phone_number: "+918035452070",  // <-- ADD THIS
  user_data: { ... }
})
```

---

## Part 2: Create Webhook Endpoint

### New Edge Function: `bolna-webhook`

This function will receive call status updates from Bolna and store them in the database.

**Location:** `supabase/functions/bolna-webhook/index.ts`

### Webhook Payload Structure (from Bolna)
```text
{
  "execution_id": "uuid",
  "agent_id": "uuid",
  "status": "completed|failed|no_answer|busy",
  "conversation_time": 123,
  "transcript": "Full conversation text...",
  "telephony_data": {
    "duration": 42,
    "to_number": "+91...",
    "from_number": "+918035452070",
    "recording_url": "https://..."
  }
}
```

### Functionality
1. Receive POST requests from Bolna
2. Validate the request (basic signature/origin check)
3. Find the call log by `bolna_call_id` (execution_id)
4. Update the `voice_call_logs` record with:
   - status (completed, failed, no_answer)
   - duration_seconds
   - transcript (new column needed)
   - recording_url (new column needed)

---

## Part 3: Database Schema Update

### New Columns for `voice_call_logs` Table

| Column | Type | Description |
|--------|------|-------------|
| transcript | text | Full conversation transcript |
| recording_url | text | URL to call recording |
| hangup_reason | text | Why the call ended |
| updated_at | timestamptz | Last update timestamp |

### Migration SQL
```sql
ALTER TABLE voice_call_logs 
ADD COLUMN IF NOT EXISTS transcript text,
ADD COLUMN IF NOT EXISTS recording_url text,
ADD COLUMN IF NOT EXISTS hangup_reason text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
```

---

## Part 4: Configuration Required in Bolna Dashboard

After deployment, you will need to configure the webhook URL in your Bolna dashboard:

**Webhook URL to configure:**
```
https://zdvppjgxjyqqwrekougp.supabase.co/functions/v1/bolna-webhook
```

**Steps in Bolna Dashboard:**
1. Go to your agent settings
2. Find the "Webhook" or "Server URL" section
3. Add the above URL
4. Ensure the IP `13.203.39.153` (Bolna's webhook source) is allowed

---

## Part 5: Update Admin UI

### Enhance Call Logs Display

Add new columns to the call logs table in `AdminVoiceSettings.tsx`:
- **Transcript**: Show a preview/expandable transcript
- **Recording**: Add a play button or download link for recordings
- **Hangup Reason**: Show why the call ended

---

## Technical Architecture

```text
+-------------------+       +----------------------+
|   Admin Panel     |       |     Bolna API        |
|   (Test Call)     |------>|   /call endpoint     |
+-------------------+       +----------------------+
        |                           |
        | from_phone_number         | Places call from
        | "+918035452070"           | +918035452070
        |                           v
        |                   +---------------+
        |                   |  User Phone   |
        |                   +---------------+
        |                           |
        |                           | Call completes
        |                           v
        |                   +----------------------+
        |                   |   Bolna Webhook      |
        |                   |   (POST to us)       |
        |                   +----------------------+
        |                           |
        |                           v
        |                   +----------------------+
        |                   | bolna-webhook Edge   |
        |                   | Function             |
        |                   +----------------------+
        |                           |
        v                           v
+-----------------------------------------------+
|           voice_call_logs table               |
|  (status, transcript, recording_url, etc.)    |
+-----------------------------------------------+
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/manage-voice-agent/index.ts` | Modify | Add `from_phone_number` to test calls |
| `supabase/functions/make-voice-call/index.ts` | Modify | Add `from_phone_number` to production calls |
| `supabase/functions/bolna-webhook/index.ts` | Create | New webhook endpoint for call updates |
| `supabase/config.toml` | Modify | Add bolna-webhook function config |
| `src/components/admin/AdminVoiceSettings.tsx` | Modify | Display transcript & recording in logs |
| Database migration | Create | Add transcript, recording_url columns |

---

## Summary

1. **Immediate fix**: Add `from_phone_number: "+918035452070"` to both Edge Functions to ensure calls come from your Indian number
2. **Webhook endpoint**: Create a new Edge Function to receive call updates from Bolna
3. **Database update**: Add columns to store transcript and recording data
4. **UI enhancement**: Show richer call data in the admin panel
5. **Manual step**: You'll need to configure the webhook URL in your Bolna dashboard after deployment
