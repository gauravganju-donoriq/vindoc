

# Plan: Roadside Assistance Request Feature

## Overview

Add a feature that allows users to request roadside assistance from their Dashboard or Vehicle Details page. The request includes vehicle details (registration, model, location) so the admin and assigned helper know exactly which car to assist. Admins can view all requests, assign helpers, and track status.

---

## User Flow

```text
+-------------------+     +-------------------------+     +-------------------+
|   User Dashboard  | --> |   Request Assistance    | --> | Admin Dashboard   |
|   or Vehicle Page |     |   Form (with vehicle)   |     | (new tab)         |
+-------------------+     +-------------------------+     +-------------------+
         |                           |                           |
         v                           v                           v
+-------------------+     +-------------------------+     +-------------------+
|   View Request    |     |   assistance_requests   |     |   Assign Helper   |
|   Status Card     |     |   (new table)           |     |   & Update Status |
+-------------------+     +-------------------------+     +-------------------+
```

---

## Database Schema

### New Table: `assistance_requests`

Stores all roadside assistance requests with vehicle context and status tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Requester's user ID |
| vehicle_id | uuid | FK to vehicles (for details) |
| request_type | text | Type: 'breakdown', 'flat_tire', 'battery', 'fuel', 'accident', 'other' |
| description | text | User's description of the issue |
| location_text | text | User-provided location description |
| location_lat | numeric | Optional GPS latitude |
| location_lng | numeric | Optional GPS longitude |
| urgency | text | 'low', 'medium', 'high', 'emergency' |
| status | text | 'pending', 'assigned', 'in_progress', 'completed', 'cancelled' |
| assigned_to | text | Helper name/contact (admin fills this) |
| assigned_at | timestamptz | When helper was assigned |
| admin_notes | text | Internal admin notes |
| completed_at | timestamptz | When request was resolved |
| created_at | timestamptz | Request creation time |
| updated_at | timestamptz | Last update time |

### RLS Policies

- Users can INSERT their own requests (user_id = auth.uid())
- Users can SELECT their own requests (user_id = auth.uid())
- Users can UPDATE (cancel) their own pending requests
- Super admins can SELECT, UPDATE all requests (via has_role function)

---

## Frontend Components

### 1. Request Assistance Dialog (`src/components/assistance/RequestAssistanceDialog.tsx`)

A dialog/modal that allows users to submit an assistance request:

- **Vehicle Selection**: Dropdown to choose which vehicle needs help (pre-selected if from Vehicle Details page)
- **Request Type**: Dropdown with options (Breakdown, Flat Tire, Battery Issue, Out of Fuel, Accident, Other)
- **Urgency Level**: Radio buttons (Low, Medium, High, Emergency)
- **Location**: Text input for location description
- **Description**: Textarea for additional details
- **Submit Button**: Creates the request and shows confirmation

### 2. Active Assistance Card (`src/components/dashboard/ActiveAssistanceCard.tsx`)

A card on the Dashboard showing active assistance requests:

- Status badge (Pending, Assigned, In Progress)
- Vehicle info (registration, model)
- Request type and urgency
- Assigned helper name (if assigned)
- Cancel button (for pending requests)
- Auto-hides when no active requests

### 3. Admin Assistance Tab (`src/components/admin/AdminAssistance.tsx`)

New tab in Admin Dashboard to manage all requests:

- **Pending Requests Alert**: Highlighted card showing count of pending requests
- **Requests Table**: All requests with filters (status, urgency, date)
  - Columns: Vehicle, User, Type, Urgency, Location, Status, Created, Actions
- **Assign Dialog**: Modal to assign a helper (name, phone, notes)
- **Status Update**: Quick actions to change status (In Progress, Completed)
- **View Details**: Expandable row with full description and history

### 4. Integration Points

**Dashboard.tsx:**
- Add "Request Assistance" button in header area
- Add ActiveAssistanceCard component below ChallanSummaryWidget

**VehicleDetails.tsx:**
- Add "Request Assistance" button in vehicle header
- Pre-select the current vehicle when opening the dialog

**Admin.tsx:**
- Add new "Assistance" tab between "Claims" and "Voice"

---

## Edge Function Updates

### Extend `admin-data/index.ts`

Add new action types to handle assistance requests:

1. **"assistance_requests"**: Fetch all assistance requests (paginated, with user/vehicle enrichment)
2. **"assign_assistance"**: Assign a helper to a request
3. **"update_assistance_status"**: Update request status

### New Edge Function: `send-assistance-notification/index.ts`

Email notification function for:
- Notifying admin when new request is created
- Notifying user when helper is assigned
- Uses existing Resend integration

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| Database migration | Create | New `assistance_requests` table with RLS |
| `supabase/functions/admin-data/index.ts` | Update | Add assistance request handling |
| `supabase/functions/send-assistance-notification/index.ts` | Create | Email notifications |
| `supabase/config.toml` | Update | Add new function config |
| `src/components/assistance/RequestAssistanceDialog.tsx` | Create | User request form |
| `src/components/dashboard/ActiveAssistanceCard.tsx` | Create | Dashboard status card |
| `src/components/admin/AdminAssistance.tsx` | Create | Admin management tab |
| `src/pages/Dashboard.tsx` | Update | Add button and status card |
| `src/pages/VehicleDetails.tsx` | Update | Add assistance button |
| `src/pages/Admin.tsx` | Update | Add Assistance tab |

---

## Database Migration SQL

```sql
-- Create assistance request type enum
CREATE TYPE public.assistance_request_type AS ENUM (
  'breakdown', 'flat_tire', 'battery', 'fuel', 'accident', 'towing', 'lockout', 'other'
);

CREATE TYPE public.assistance_urgency AS ENUM (
  'low', 'medium', 'high', 'emergency'
);

CREATE TYPE public.assistance_status AS ENUM (
  'pending', 'assigned', 'in_progress', 'completed', 'cancelled'
);

-- Create assistance_requests table
CREATE TABLE IF NOT EXISTS public.assistance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  request_type text NOT NULL DEFAULT 'other',
  description text,
  location_text text NOT NULL,
  location_lat numeric,
  location_lng numeric,
  urgency text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  assigned_to text,
  assigned_phone text,
  assigned_at timestamptz,
  admin_notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assistance_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can create their own assistance requests"
  ON public.assistance_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own assistance requests"
  ON public.assistance_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can cancel their pending requests"
  ON public.assistance_requests FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (status = 'cancelled');

CREATE POLICY "Super admins can view all assistance requests"
  ON public.assistance_requests FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update assistance requests"
  ON public.assistance_requests FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'));

-- Add updated_at trigger
CREATE TRIGGER update_assistance_requests_updated_at
  BEFORE UPDATE ON public.assistance_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes for faster queries
CREATE INDEX idx_assistance_requests_user_id ON public.assistance_requests(user_id);
CREATE INDEX idx_assistance_requests_vehicle_id ON public.assistance_requests(vehicle_id);
CREATE INDEX idx_assistance_requests_status ON public.assistance_requests(status);
CREATE INDEX idx_assistance_requests_created_at ON public.assistance_requests(created_at DESC);
```

---

## UI Mockups

### Request Assistance Dialog

```text
+------------------------------------------+
|  Request Roadside Assistance       [X]   |
+------------------------------------------+
|                                          |
|  Vehicle:                                |
|  [Dropdown: KL01AY7070 - BMW 320D    v]  |
|                                          |
|  What's the issue?                       |
|  [Dropdown: Flat Tire                 v]  |
|                                          |
|  Urgency:                                |
|  ( ) Low  (*) Medium  ( ) High  ( ) Urgent|
|                                          |
|  Your Location:                          |
|  [Enter your current location          ]  |
|                                          |
|  Additional Details:                     |
|  [                                     ] |
|  [Describe the problem...              ] |
|  [                                     ] |
|                                          |
|                    [Cancel] [Request Help]|
+------------------------------------------+
```

### Active Assistance Card (Dashboard)

```text
+------------------------------------------+
|  ACTIVE ASSISTANCE REQUEST               |
+------------------------------------------+
|  +--------------------------------------+|
|  | KL01AY7070 - BMW 320D    [ASSIGNED]  ||
|  | Flat Tire - High Urgency             ||
|  | Location: MG Road, Kochi             ||
|  |                                      ||
|  | Helper: John (9876543210)            ||
|  | Assigned 15 min ago                  ||
|  +--------------------------------------+|
+------------------------------------------+
```

### Admin Assistance Tab

```text
+------------------------------------------+
|  [!] 3 Pending Requests                  |
+------------------------------------------+
|  Vehicle     | User  | Type | Urgency | Status  | Actions     |
|  ------------|-------|------|---------|---------|-------------|
|  KL01AY7070  | user1 | Tire | High    | Pending | [Assign]    |
|  MH14GH8765  | user2 | Fuel | Medium  | Assigned| [Complete]  |
|  KA05XY1234  | user3 | Tow  | Emergency| InProg | [View]      |
+------------------------------------------+
```

---

## Admin Edge Function Updates

Add to `VALID_ACTION_TYPES`:
- "assistance_requests"
- "assign_assistance"
- "update_assistance_status"

Add validation schemas:
```typescript
const AssignAssistanceSchema = z.object({
  type: z.literal("assign_assistance"),
  requestId: z.string().uuid(),
  assignedTo: z.string().min(1).max(100),
  assignedPhone: z.string().max(20).optional(),
  adminNotes: z.string().max(500).optional(),
});

const UpdateAssistanceStatusSchema = z.object({
  type: z.literal("update_assistance_status"),
  requestId: z.string().uuid(),
  status: z.enum(["in_progress", "completed", "cancelled"]),
  adminNotes: z.string().max(500).optional(),
});
```

---

## Notification Flow

1. **User creates request**: Edge function sends email to admin (or configurable email list)
2. **Admin assigns helper**: Notification sent to user with helper details
3. **Request completed**: Confirmation email to user

---

## Security Considerations

1. **Authentication**: All endpoints require JWT verification
2. **Authorization**: Users can only see/modify their own requests; admins use has_role() check
3. **Input Validation**: All inputs validated via Zod schemas
4. **RLS Policies**: Database-level access control as additional security layer
5. **Rate Limiting**: Consider adding rate limit on request creation (e.g., max 5 pending requests per user)

---

## Future Enhancements (Not in Initial Scope)

- Real-time GPS location sharing
- In-app chat between user and helper
- Push notifications
- Helper mobile app
- Request rating/feedback system
- Automated helper dispatch based on location
- Payment integration for assistance services

