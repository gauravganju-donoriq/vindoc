
# Plan: Challan (Traffic Violation) Check Feature

## Overview

Add a new "Challan" tab to the Vehicle Details page that fetches and displays traffic violation (challan) data for a vehicle using the RTO Challan Details API from RapidAPI. Users can check pending and disposed challans, view details, and save the history.

---

## Architecture

```text
+-------------------+     +-------------------------+     +---------------------------+
|   Vehicle Page    | --> |   fetch-challan-details | --> | RTO Challan API (RapidAPI)|
|   (Challan Tab)   |     |   Edge Function         |     |                           |
+-------------------+     +-------------------------+     +---------------------------+
         |                           |
         v                           v
+-------------------+     +-------------------------+
|   ChallanTab.tsx  |     |   vehicle_challans      |
|   Component       |     |   (new table)           |
+-------------------+     +-------------------------+
```

---

## Database Schema

### New Table: `vehicle_challans`

This table stores fetched challan data for each vehicle to avoid repeated API calls and provide history.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| vehicle_id | uuid | FK to vehicles |
| user_id | uuid | Owner's user ID |
| challan_no | text | Unique challan number |
| challan_date_time | timestamptz | When violation occurred |
| challan_place | text | Location of violation |
| challan_status | text | 'Pending' or 'Disposed' |
| remark | text | Description of violation |
| fine_imposed | numeric | Fine amount |
| driver_name | text | Driver name (if available) |
| owner_name | text | Owner name (masked from API) |
| department | text | e.g., 'Traffic' |
| state_code | text | e.g., 'MH' |
| offence_details | jsonb | Array of offence objects |
| sent_to_court | boolean | If sent to court |
| court_details | jsonb | Court info if applicable |
| raw_api_data | jsonb | Full API response for reference |
| fetched_at | timestamptz | When data was fetched |
| created_at | timestamptz | Record creation time |

**Unique Constraint**: (vehicle_id, challan_no) - prevents duplicate entries

### RLS Policies

- Users can SELECT their own challans (user_id = auth.uid())
- Users can INSERT their own challans (user_id = auth.uid())
- Users can UPDATE their own challans (user_id = auth.uid())
- Users can DELETE their own challans (user_id = auth.uid())

---

## Edge Function: `fetch-challan-details`

A new edge function that:

1. **Authenticates** using JWT (same pattern as fetch-vehicle-details)
2. **Validates input** (registration number via Zod)
3. **Calls RapidAPI** endpoint with required consent parameters
4. **Returns structured data** for pending and disposed challans
5. **Handles errors** gracefully with meaningful messages

### API Details

- **Endpoint**: `https://rto-challan-details-api.p.rapidapi.com/api/v1/challan`
- **Method**: POST
- **Uses existing secret**: `RAPIDAPI_KEY` (already configured)
- **Request body**:
  ```json
  {
    "reg_no": "MH14GH8765",
    "consent": "Y",
    "consent_text": "I hereby declare my consent..."
  }
  ```

### Response Mapping

```typescript
interface ChallanData {
  challanNo: string;
  dateTime: string;
  place: string;
  status: 'Pending' | 'Disposed';
  remark: string;
  fineImposed: number;
  driverName: string | null;
  ownerName: string;
  department: string;
  stateCode: string;
  offences: Array<{ act: string | null; name: string }>;
  sentToCourt: boolean;
  courtDetails: {
    address: string | null;
    name: string | null;
    dateOfProceeding: string | null;
  } | null;
}
```

---

## Frontend Components

### 1. ChallanTab Component (`src/components/vehicle/ChallanTab.tsx`)

Main component for the Challan tab with:

- **Check Challans Button**: Triggers API call via edge function
- **Loading State**: Skeleton loader during fetch
- **Summary Cards**:
  - Total pending challans count
  - Total fine amount pending
  - Total disposed challans
- **Challan List**: Cards for each challan showing:
  - Challan number
  - Date and location
  - Violation description
  - Fine amount with status badge (Pending/Paid)
  - Offence details in expandable section
- **Empty State**: When no challans found (good message!)
- **Last Fetched Info**: When data was last updated

### 2. UI Layout

```text
+------------------------------------------+
|  CHALLAN TAB                             |
+------------------------------------------+
|  [Check for Challans]  Last checked: 2h  |
+------------------------------------------+
|                                          |
|  +----------------+  +----------------+  |
|  | Pending: 2     |  | Total Fine:    |  |
|  | challans       |  | Rs. 4,000      |  |
|  +----------------+  +----------------+  |
|                                          |
|  PENDING CHALLANS                        |
|  +--------------------------------------+|
|  | Challan #MH4183995241201014444596   ||
|  | Dec 01, 2024 - Nashik City          ||
|  | Speed violating by driver...        ||
|  | Fine: Rs. 2,000        [PENDING]    ||
|  +--------------------------------------+|
|                                          |
|  DISPOSED CHALLANS                       |
|  (none found - Great driving record!)   |
+------------------------------------------+
```

### 3. Integration in VehicleDetails.tsx

- Add new TabsTrigger for "Challan" tab
- Add TabsContent with ChallanTab component
- Pass vehicle data to the component

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/fetch-challan-details/index.ts` | Create | Edge function for RapidAPI call |
| `supabase/config.toml` | Update | Add function config |
| `src/components/vehicle/ChallanTab.tsx` | Create | Main challan tab component |
| `src/pages/VehicleDetails.tsx` | Update | Add Challan tab |
| Database migration | Create | New vehicle_challans table |

---

## Detailed Implementation

### 1. Edge Function (`supabase/functions/fetch-challan-details/index.ts`)

```typescript
// Key structure:
// - CORS headers (standard)
// - JWT authentication via getClaims()
// - Zod validation for registration number
// - POST to RapidAPI with consent
// - Map response to structured format
// - Return pending_challans and disposed_challans arrays
// - 10 second timeout with AbortController
```

### 2. ChallanTab Component Structure

```typescript
interface ChallanTabProps {
  vehicle: {
    id: string;
    registration_number: string;
  };
}

// States:
// - challans: ChallanData[]
// - isLoading: boolean
// - lastFetched: Date | null
// - error: string | null

// Functions:
// - fetchChallans(): Call edge function
// - saveChallans(): Save to database
// - calculateTotalFine(): Sum pending fines
```

### 3. VehicleDetails.tsx Updates

Add between "Activity" and "Sell" tabs:

```tsx
<TabsTrigger value="challan" className="rounded-lg data-[state=active]:bg-gray-900 data-[state=active]:text-white">
  Challan
</TabsTrigger>

// And corresponding content:
<TabsContent value="challan" className="mt-0">
  <ChallanTab vehicle={vehicle} />
</TabsContent>
```

---

## Database Migration SQL

```sql
-- Create vehicle_challans table
CREATE TABLE IF NOT EXISTS public.vehicle_challans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  challan_no text NOT NULL,
  challan_date_time timestamptz,
  challan_place text,
  challan_status text NOT NULL DEFAULT 'Pending',
  remark text,
  fine_imposed numeric,
  driver_name text,
  owner_name text,
  department text,
  state_code text,
  offence_details jsonb DEFAULT '[]'::jsonb,
  sent_to_court boolean DEFAULT false,
  court_details jsonb,
  raw_api_data jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(vehicle_id, challan_no)
);

-- Enable RLS
ALTER TABLE public.vehicle_challans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own challans"
  ON public.vehicle_challans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challans"
  ON public.vehicle_challans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challans"
  ON public.vehicle_challans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own challans"
  ON public.vehicle_challans FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_vehicle_challans_updated_at
  BEFORE UPDATE ON public.vehicle_challans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_vehicle_challans_vehicle_id ON public.vehicle_challans(vehicle_id);
CREATE INDEX idx_vehicle_challans_user_id ON public.vehicle_challans(user_id);
```

---

## API Key

The feature will use the **existing RAPIDAPI_KEY** secret that is already configured for the vehicle details API. No new secrets needed.

---

## Security Considerations

1. **Authentication**: JWT validation required before API call
2. **Authorization**: Users can only fetch challans for their own vehicles
3. **Input Validation**: Registration number validated via Zod
4. **Consent**: Required consent text sent with each API request
5. **RLS Policies**: Database access restricted to vehicle owner
6. **No Sensitive Logging**: Challan details not logged to console in production

---

## Error Handling

| Scenario | User Message |
|----------|--------------|
| No challans found | "No challans found. Great driving record!" |
| API timeout | "Request timed out. Please try again." |
| Invalid registration | "Invalid registration number format" |
| API error | "Could not fetch challan details. Try again later." |
| Not authenticated | Redirect to login |

---

## Future Enhancements (Not in Scope)

- Push notifications for new challans
- Payment integration for challan payment
- Challan history trends and analytics
- Bulk check for all vehicles
