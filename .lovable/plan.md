
# Smart Alerts: AI-Powered Expiry Notifications

## Overview

Implement an intelligent notification system that sends personalized email reminders before vehicle documents expire. The AI will analyze vehicle data and generate contextual renewal tips, cost estimates, and urgency-based messaging.

## How It Works

1. **Daily Cron Job** scans all vehicles for documents expiring in the next 30 days
2. **AI Analysis** generates personalized content for each expiring document:
   - Estimated renewal cost based on vehicle type and document
   - Location-specific tips (e.g., nearest RTO, recommended workshops)
   - Urgency messaging based on days remaining
   - Consequences of not renewing
3. **Email Delivery** sends beautifully formatted alerts via Resend

## Features

- Personalized AI-generated renewal advice per document type
- Cost estimates based on vehicle category and region
- Smart batching: one consolidated email per user with all expiring documents
- Configurable alert windows (30 days, 7 days, expired)
- Activity logging in vehicle history

## Implementation Steps

### 1. Database Changes
Create a table to track sent notifications (prevent duplicate emails):
- `expiry_notifications` table with `vehicle_id`, `document_type`, `notification_type` (30-day, 7-day, expired), `sent_at`

### 2. Edge Function: `check-expiry-alerts`
A scheduled function that:
- Queries all vehicles with documents expiring within alert windows
- Groups by user to consolidate notifications
- Calls Lovable AI to generate personalized content for each document
- Sends consolidated email per user via Resend
- Logs notifications sent to prevent duplicates

### 3. AI Prompt Engineering
The AI will receive:
- Vehicle details (type, age, fuel, region from registration)
- Document type and days until expiry
- Historical data (previous renewals from vehicle history)

And generate:
- Estimated cost range (based on vehicle type)
- Renewal steps specific to the document
- Pro tips (best time to renew, common mistakes to avoid)
- Urgency level and consequences

### 4. Email Template
Consolidated email showing:
- Summary header with vehicle count and urgency
- Per-vehicle sections with expiring documents
- AI-generated tips and cost estimates for each
- Call-to-action to open the app

### 5. Cron Setup
Daily scheduled job (pg_cron) to trigger the check-expiry-alerts function

## Technical Details

### Database Schema
```text
expiry_notifications
├── id (uuid, primary key)
├── vehicle_id (uuid, foreign key → vehicles)
├── user_id (uuid, not null)
├── document_type (text: insurance, pucc, fitness, road_tax)
├── notification_type (text: 30_day, 7_day, expired)
├── ai_content (jsonb: stores generated tips/costs)
├── sent_at (timestamptz)
└── created_at (timestamptz)
```

### Edge Function Flow
```text
check-expiry-alerts
    │
    ├── Query vehicles with expiring documents
    │
    ├── Group by user_id
    │
    ├── For each user:
    │   ├── Filter out already-notified documents
    │   ├── Call Lovable AI for each document type
    │   ├── Compile consolidated email content
    │   └── Send email via Resend
    │
    └── Log sent notifications
```

### AI Integration
Uses Lovable AI (google/gemini-3-flash-preview) with structured output:
- No API key required (uses pre-configured LOVABLE_API_KEY)
- Structured JSON response for consistent parsing
- Cost estimates based on Indian vehicle categories

### Example AI Output
```text
Document: Insurance (expires in 7 days)
Vehicle: Maruti Swift (Petrol, 2018)

Estimated Cost: ₹8,000 - ₹12,000
Tip: Compare quotes online before visiting the insurer. 
Many companies offer 10-15% discounts for early renewal.
Urgency: High - Driving without insurance is illegal 
and carries a ₹2,000 fine.
```

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/[timestamp]_expiry_notifications.sql` | Create table |
| `supabase/functions/check-expiry-alerts/index.ts` | Main cron function |
| `supabase/config.toml` | Register new function |
| Dashboard component (optional) | Show alert preferences UI |

## Cost and Performance

- Lovable AI calls: ~1-4 per user per run (batched by document type)
- Email sends: 1 per user with expiring documents
- Cron runs: Once daily
- Estimated free tier usage: Well within limits for typical usage

