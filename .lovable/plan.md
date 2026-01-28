

# Plan: Fix Caller ID to Use Your Purchased Indian Number

## Problem Analysis

Based on my investigation of the edge function logs, Bolna webhook data, and API documentation, I identified the following:

### What Happened
1. **Initially**: The code included `from_phone_number: "+918035452070"` but the agent was configured for **Twilio** (not Plivo)
2. **Error**: Bolna returned `400 - Calling from_number doesn't exist for twilio`
3. **Previous Fix**: Removed `from_phone_number` and changed agent to use **Plivo** provider
4. **Current Issue**: Without `from_phone_number`, Bolna uses a **default number** (`+918035735856`) instead of your purchased number (`+918035452070`)

### Evidence from Webhook Logs
| Timestamp | From Number | Status |
|-----------|-------------|--------|
| 09:36:33 | +918035735856 | Wrong (default) |
| 09:35:23 | +918035452070 | Correct (your number) |

The earlier call at 09:35:23 actually used your correct number because the agent was already configured with Plivo at that point, and the `from_phone_number` was still in the code.

---

## Root Cause

The Bolna `/call` API **does support** the `from_phone_number` parameter (confirmed in their official documentation). The earlier error occurred because:

1. The agent was configured with **Twilio** as the telephony provider
2. Your number (`+918035452070`) is a **Plivo** number
3. Bolna couldn't find the number in Twilio's registry

Now that the agent is configured for **Plivo**, adding back `from_phone_number` should work correctly.

---

## Solution

### Files to Modify

**1. supabase/functions/manage-voice-agent/index.ts**
Add `from_phone_number` to the test call request (around line 383-392):
```typescript
body: JSON.stringify({
  agent_id: config.bolna_agent_id,
  recipient_phone_number: phoneNumber,
  from_phone_number: "+918035452070",  // Add this back
  user_data: { ... }
})
```

**2. supabase/functions/make-voice-call/index.ts**
Add `from_phone_number` to production calls (around line 118):
```typescript
body: JSON.stringify({
  agent_id: agentConfig.bolna_agent_id,
  recipient_phone_number: profile.phone_number,
  from_phone_number: "+918035452070",  // Add this back
  user_data: { ... }
})
```

---

## Implementation Steps

| Step | Action | File |
|------|--------|------|
| 1 | Add `from_phone_number: "+918035452070"` to test call payload | manage-voice-agent/index.ts |
| 2 | Add `from_phone_number: "+918035452070"` to production call payload | make-voice-call/index.ts |
| 3 | Deploy both edge functions | Automatic |
| 4 | Test with a call from Admin panel | User action |

---

## Why This Will Work Now

1. **Agent Configuration**: The agent is now correctly configured with `provider: "plivo"` for both input and output
2. **Number Registration**: Your number `+918035452070` is registered with Plivo (as shown in your screenshot)
3. **API Support**: Bolna's `/call` API explicitly supports `from_phone_number` parameter for specifying the outbound caller ID

---

## Technical Details

### Bolna /call API Parameters (from official docs)
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| agent_id | string | Yes | Agent ID to use for the call |
| recipient_phone_number | string | Yes | Phone number to call (E.164 format) |
| from_phone_number | string | No | Caller ID (E.164 format) |
| user_data | object | No | Dynamic variables for the agent |

### Why It Failed Before
The previous error `from_number doesn't exist for twilio` occurred because:
- Agent was configured with Twilio as telephony provider
- Your number is a Plivo number, not Twilio
- Bolna couldn't find the number in Twilio's system

### Why It Will Work Now
- Agent is now configured with Plivo as telephony provider
- Your number is registered with Plivo
- Bolna will find the number in Plivo's system

---

## Summary

| Before | After |
|--------|-------|
| Agent: Twilio | Agent: Plivo |
| from_phone_number: Removed | from_phone_number: "+918035452070" |
| Caller ID: Random Plivo default | Caller ID: Your purchased number |

This is a simple 2-line change that re-adds the `from_phone_number` parameter now that the telephony provider configuration is correct.

