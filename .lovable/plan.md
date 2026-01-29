

# Plan: Vehicle Parts Request Feature

## Overview

Add a feature that allows users to request vehicle parts (used or OEM) for their vehicles. Users can specify the part they need, condition preference (used/OEM/any), and urgency. Admins receive and manage these requests through the existing admin panel, similar to the Roadside Assistance feature. The system is designed to be scalable for future enhancements like vendor integration and pricing.

---

## User Flow

```text
+-------------------+     +-------------------------+     +-------------------+
|   User Dashboard  | --> |   Request Parts         | --> | Admin Dashboard   |
|   or Vehicle Page |     |   Form (with vehicle)   |     | (new Parts tab)   |
+-------------------+     +-------------------------+     +-------------------+
         |                           |                           |
         v                           v                           v
+-------------------+     +-------------------------+     +-------------------+
|   View Request    |     |   parts_requests        |     |   Process Request |
|   Status Card     |     |   (new table)           |     |   & Update Status |
+-------------------+     +-------------------------+     +-------------------+
```

---

## Database Schema

### New Table: `parts_requests`

Stores all parts requests with vehicle context, part details, and status tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Requester's user ID |
| vehicle_id | uuid | FK to vehicles (for context) |
| part_name | text | Name/description of the part needed |
| part_category | text | Category: 'engine', 'body', 'electrical', 'suspension', 'brakes', 'interior', 'other' |
| condition_preference | text | 'used', 'oem', 'any' |
| quantity | integer | Number of parts needed (default 1) |
| urgency | text | 'low', 'medium', 'high' |
| description | text | Additional details about the part/issue |
| status | text | 'pending', 'sourcing', 'quoted', 'confirmed', 'delivered', 'cancelled' |
| quoted_price | numeric | Price quoted by admin (if applicable) |
| admin_notes | text | Internal admin notes |
| vendor_info | text | Vendor/supplier information |
| estimated_delivery | date | Estimated delivery date |
| created_at | timestamptz | Request creation time |
| updated_at | timestamptz | Last update time |

### RLS Policies

- Users can INSERT their own requests (user_id = auth.uid())
- Users can SELECT their own requests (user_id = auth.uid())
- Users can UPDATE (cancel) their own pending requests
- Super admins can SELECT, UPDATE all requests (via has_role function)

---

## Frontend Components

### 1. Request Parts Dialog (`src/components/parts/RequestPartsDialog.tsx`)

A dialog/modal that allows users to submit a parts request:

- **Vehicle Selection**: Dropdown to choose which vehicle needs the part (pre-selected if from Vehicle Details page)
- **Part Name**: Text input for the specific part needed
- **Part Category**: Dropdown with options (Engine, Body, Electrical, Suspension, Brakes, Interior, Other)
- **Condition Preference**: Radio buttons (Used, OEM/New, Any)
- **Quantity**: Number input (default 1)
- **Urgency Level**: Radio buttons (Low, Medium, High)
- **Description**: Textarea for additional details (e.g., part number, compatibility notes)
- **Submit Button**: Creates the request and shows confirmation

### 2. Active Parts Request Card (`src/components/dashboard/ActivePartsRequestCard.tsx`)

A card on the Dashboard showing active parts requests:

- Status badge (Pending, Sourcing, Quoted, Confirmed)
- Vehicle info (registration, model)
- Part name and condition preference
- Quoted price (if available)
- Cancel button (for pending requests only)
- Auto-hides when no active requests

### 3. Admin Parts Tab (`src/components/admin/AdminParts.tsx`)

New tab in Admin Dashboard to manage all parts requests:

- **Pending Requests Alert**: Highlighted card showing count of pending requests
- **Requests Table**: All requests with filters (status, urgency, date)
  - Columns: Vehicle, User, Part, Category, Condition, Urgency, Status, Created, Actions
- **Quote Dialog**: Modal to add price quote and vendor info
- **Status Update**: Quick actions to change status (Sourcing, Quoted, Confirmed, Delivered)
- **View Details**: Expandable row with full description and history

### 4. Integration Points

**Dashboard.tsx:**
- Add "Request Parts" button next to "Request Assistance" button
- Add ActivePartsRequestCard component below ActiveAssistanceCard

**VehicleDetails.tsx:**
- Add "Request Parts" button in vehicle header quick actions
- Pre-select the current vehicle when opening the dialog

**Admin.tsx:**
- Add new "Parts" tab after "Assistance" tab

---

## Edge Function Updates

### Extend `admin-data/index.ts`

Add new action types to handle parts requests:

1. **"parts_requests"**: Fetch all parts requests (paginated, with user/vehicle enrichment)
2. **"update_parts_request"**: Update request status, quote, vendor info
3. **"cancel_parts_request"**: Admin cancel with reason

Add to `VALID_ACTION_TYPES`:
```typescript
"parts_requests", "update_parts_request", "cancel_parts_request"
```

Add validation schemas:
```typescript
const UpdatePartsRequestSchema = z.object({
  type: z.literal("update_parts_request"),
  requestId: z.string().uuid("Invalid request ID format"),
  status: z.enum(["sourcing", "quoted", "confirmed", "delivered", "cancelled"]).optional(),
  quotedPrice: z.number().positive().optional(),
  vendorInfo: z.string().max(500).optional(),
  estimatedDelivery: z.string().optional(),
  adminNotes: z.string().max(500).optional(),
});
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| Database migration | Create | New `parts_requests` table with RLS |
| `supabase/functions/admin-data/index.ts` | Update | Add parts request handling |
| `supabase/config.toml` | No change | Uses existing admin-data function |
| `src/components/parts/RequestPartsDialog.tsx` | Create | User request form |
| `src/components/dashboard/ActivePartsRequestCard.tsx` | Create | Dashboard status card |
| `src/components/admin/AdminParts.tsx` | Create | Admin management tab |
| `src/pages/Dashboard.tsx` | Update | Add button and status card |
| `src/pages/VehicleDetails.tsx` | Update | Add parts button |
| `src/pages/Admin.tsx` | Update | Add Parts tab |

---

## Database Migration SQL

```sql
-- Create parts_requests table
CREATE TABLE IF NOT EXISTS public.parts_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  part_name text NOT NULL,
  part_category text NOT NULL DEFAULT 'other',
  condition_preference text NOT NULL DEFAULT 'any',
  quantity integer NOT NULL DEFAULT 1,
  urgency text NOT NULL DEFAULT 'medium',
  description text,
  status text NOT NULL DEFAULT 'pending',
  quoted_price numeric,
  admin_notes text,
  vendor_info text,
  estimated_delivery date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.parts_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can create their own parts requests"
  ON public.parts_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own parts requests"
  ON public.parts_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can cancel their pending requests"
  ON public.parts_requests FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (status = 'cancelled');

CREATE POLICY "Super admins can view all parts requests"
  ON public.parts_requests FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update parts requests"
  ON public.parts_requests FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'));

-- Add updated_at trigger
CREATE TRIGGER update_parts_requests_updated_at
  BEFORE UPDATE ON public.parts_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes for faster queries
CREATE INDEX idx_parts_requests_user_id ON public.parts_requests(user_id);
CREATE INDEX idx_parts_requests_vehicle_id ON public.parts_requests(vehicle_id);
CREATE INDEX idx_parts_requests_status ON public.parts_requests(status);
CREATE INDEX idx_parts_requests_created_at ON public.parts_requests(created_at DESC);
```

---

## UI Mockups

### Request Parts Dialog

```text
+------------------------------------------+
|  Request Vehicle Parts             [X]   |
+------------------------------------------+
|                                          |
|  Vehicle:                                |
|  [Dropdown: KL01AY7070 - BMW 320D    v]  |
|                                          |
|  Part Name: *                            |
|  [e.g., Front Brake Pads, Air Filter   ] |
|                                          |
|  Category:                               |
|  [Dropdown: Brakes                    v]  |
|                                          |
|  Condition Preference:                   |
|  ( ) Used  ( ) OEM/New  (*) Any         |
|                                          |
|  Quantity:  [1]                          |
|                                          |
|  Urgency:                                |
|  (*) Low  ( ) Medium  ( ) High          |
|                                          |
|  Additional Details:                     |
|  [                                     ] |
|  [Part number, compatibility notes...  ] |
|                                          |
|                   [Cancel] [Request Part]|
+------------------------------------------+
```

### Active Parts Request Card (Dashboard)

```text
+------------------------------------------+
|  ACTIVE PARTS REQUEST                    |
+------------------------------------------+
|  +--------------------------------------+|
|  | KL01AY7070 - BMW 320D     [QUOTED]   ||
|  | Front Brake Pads (OEM)               ||
|  | Qty: 2 - High Urgency                ||
|  |                                      ||
|  | Quote: Rs. 4,500                     ||
|  | Est. Delivery: Jan 31, 2026          ||
|  | [Cancel]                             ||
|  +--------------------------------------+|
+------------------------------------------+
```

### Admin Parts Tab

```text
+------------------------------------------+
|  [!] 5 Pending Parts Requests            |
+------------------------------------------+
|  Vehicle     | User  | Part       | Condition | Status   | Actions     |
|  ------------|-------|------------|-----------|----------|-------------|
|  KL01AY7070  | user1 | Brake Pads | OEM       | Pending  | [Quote]     |
|  MH14GH8765  | user2 | Air Filter | Used      | Sourcing | [Update]    |
|  KA05XY1234  | user3 | Headlight  | Any       | Quoted   | [Confirm]   |
+------------------------------------------+
```

---

## Scalability Considerations

The schema is designed to accommodate future enhancements:

1. **Vendor Integration**: `vendor_info` field can store vendor ID for future vendor management system
2. **Pricing/Payments**: `quoted_price` ready for payment integration
3. **Part Catalog**: `part_category` enables future categorized part browsing
4. **Delivery Tracking**: `estimated_delivery` and status flow support tracking
5. **Analytics**: Indexes on status, category, and dates enable reporting
6. **Multi-vendor Quotes**: Schema can be extended with a `parts_quotes` junction table

---

## Status Flow

```text
pending -> sourcing -> quoted -> confirmed -> delivered
    |          |          |          |
    +----------+----------+----------+---> cancelled
```

- **pending**: User submitted, awaiting admin action
- **sourcing**: Admin is finding vendors/parts
- **quoted**: Price quote provided to user
- **confirmed**: User accepted quote (future: payment integration)
- **delivered**: Part delivered to user
- **cancelled**: Request cancelled by user or admin

---

## Security Considerations

1. **Authentication**: All operations require JWT verification
2. **Authorization**: Users can only see/modify their own requests; admins use has_role() check
3. **Input Validation**: All inputs validated via Zod schemas
4. **RLS Policies**: Database-level access control as additional security layer
5. **Price Integrity**: Only admins can set quoted prices (via edge function validation)

---

## Future Enhancements (Not in Initial Scope)

- Part catalog with predefined options and part numbers
- Multi-vendor quote comparison
- In-app payment for confirmed orders
- Delivery tracking with notifications
- Part compatibility database
- User ratings for parts quality
- Recurring order support (e.g., regular service parts)
- Bulk order discounts

