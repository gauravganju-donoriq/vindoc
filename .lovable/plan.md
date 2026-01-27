
# Request Transfer Feature - When Vehicle Already Registered

## Overview
When a user tries to add a vehicle that's already registered by another user in the system, instead of just showing an error, we'll offer them the option to "Request Transfer" from the current owner. This creates a new type of transfer request flow where the potential new owner initiates contact.

## Current Behavior
When error code `23505` (unique constraint violation) occurs in `AddVehicle.tsx`, the user sees:
> "This vehicle is already registered in the system by another user."

No further action is possible.

## New Behavior
1. Detect the duplicate vehicle error
2. Show a friendly UI explaining the situation
3. Offer a "Request Transfer" button
4. When clicked, send an email to the current owner asking them to initiate a transfer
5. Log this request for tracking

---

## Database Changes

### New Table: `ownership_claims`
Tracks when someone claims they own a vehicle registered by another user.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `registration_number` | TEXT | The disputed vehicle registration |
| `vehicle_id` | UUID | Reference to the existing vehicle |
| `claimant_id` | UUID | User making the claim |
| `claimant_email` | TEXT | Email of claimant for notifications |
| `claimant_phone` | TEXT | Optional phone number |
| `current_owner_id` | UUID | Current registered owner |
| `status` | TEXT | 'pending', 'resolved', 'rejected', 'expired' |
| `message` | TEXT | Optional message from claimant |
| `created_at` | TIMESTAMP | When claim was made |
| `expires_at` | TIMESTAMP | Auto-expire after 14 days |

### RLS Policies
- Claimants can create claims for vehicles they don't own
- Claimants can view their own claims
- Current owners can view claims on their vehicles
- Super admins can view all claims

---

## Backend Changes

### New Edge Function: `send-ownership-claim-notification`
Sends an email to the current vehicle owner when someone claims ownership.

**Email Content:**
- Explains that someone is trying to register their vehicle
- Shows claimant's contact info (email, phone if provided)
- Asks them to either:
  - Initiate a transfer if they sold the vehicle
  - Ignore if they still own it
- Links to their dashboard

---

## Frontend Changes

### 1. Update `AddVehicle.tsx`

**New State Variables:**
```typescript
const [duplicateVehicleInfo, setDuplicateVehicleInfo] = useState<{
  vehicleId: string;
  currentOwnerId: string;
} | null>(null);
const [showClaimDialog, setShowClaimDialog] = useState(false);
```

**Modified Error Handling:**
When `23505` error occurs:
1. Query the vehicle to get its `id` and `user_id` (via edge function since RLS blocks direct access)
2. Set `duplicateVehicleInfo` state
3. Show the "Vehicle Already Registered" UI

**New UI Section:**
When duplicate detected, show:
```text
This vehicle is registered to another user.
If you recently purchased this vehicle, you can request
the current owner to transfer it to you.

[Request Transfer] [Cancel]
```

### 2. New Component: `RequestTransferDialog.tsx`
A dialog that collects:
- Claimant's phone number (optional, for contact)
- Optional message explaining the situation

### 3. Update Edge Function: `admin-data`
Add action to fetch vehicle owner info for ownership claims:
- `get_vehicle_owner`: Returns vehicle_id and owner details (not email, just confirmation it exists)

---

## User Flow

```text
+------------------------+
|  User enters reg number |
+------------------------+
           |
           v
+------------------------+
|  Clicks "Save Vehicle" |
+------------------------+
           |
           v
+---------------------------+
| Database returns 23505    |
| (duplicate key violation) |
+---------------------------+
           |
           v
+-------------------------------+
| Show "Already Registered" UI  |
| with "Request Transfer" option|
+-------------------------------+
           |
           v (user clicks Request Transfer)
+-------------------------------+
| Open RequestTransferDialog    |
| - Enter phone (optional)      |
| - Add message (optional)      |
+-------------------------------+
           |
           v
+-------------------------------+
| Create ownership_claim record |
| Send email to current owner   |
| Show success message          |
+-------------------------------+
           |
           v
+-------------------------------+
| Current owner sees email      |
| Goes to dashboard             |
| Initiates transfer            |
+-------------------------------+
```

---

## Implementation Steps

### Step 1: Database Migration
- Create `ownership_claims` table with appropriate columns
- Add RLS policies for claimants, owners, and super admins
- Add indexes for performance

### Step 2: Edge Function for Claim Notification
- Create `send-ownership-claim-notification` edge function
- Send personalized email to current owner with claim details
- Use Resend API (already configured)

### Step 3: Update Admin-Data Edge Function
- Add `get_vehicle_for_claim` action that returns vehicle ID and owner ID for a registration number
- This bypasses RLS to check if vehicle exists

### Step 4: Create RequestTransferDialog Component
- Dialog with phone input and message textarea
- Submits to create ownership claim
- Triggers notification email

### Step 5: Update AddVehicle.tsx
- Detect duplicate error and fetch vehicle info
- Show the "Request Transfer" option UI
- Integrate RequestTransferDialog

### Step 6: Dashboard Notification for Current Owners (Optional Enhancement)
- Show pending claims on dashboard similar to incoming transfers
- Allow owners to quickly initiate transfer from there

---

## Technical Details

### Edge Function: get_vehicle_for_claim
```typescript
case "get_vehicle_for_claim": {
  const { data, error } = await adminClient
    .from("vehicles")
    .select("id, user_id, registration_number, maker_model")
    .eq("registration_number", registrationNumber)
    .maybeSingle();
  
  if (error || !data) {
    return new Response(JSON.stringify({ found: false }), ...);
  }
  
  return new Response(JSON.stringify({ 
    found: true, 
    vehicleId: data.id,
    ownerId: data.user_id,
    model: data.maker_model
  }), ...);
}
```

### Ownership Claim Insert
```typescript
await supabase.from("ownership_claims").insert({
  registration_number: registrationNumber,
  vehicle_id: vehicleId,
  claimant_id: user.id,
  claimant_email: user.email,
  claimant_phone: phone,
  current_owner_id: ownerId,
  message: message,
  expires_at: addDays(new Date(), 14).toISOString(),
});
```

### Email to Current Owner
Subject: "Someone is trying to register your vehicle"

Body highlights:
- Vehicle registration number
- Claimant's email and phone
- "If you sold this vehicle, please log in and transfer ownership"
- "If you still own this vehicle, you can ignore this message"
- Link to dashboard

---

## Security Considerations

1. **Rate Limiting**: Prevent spam claims by limiting one claim per user per vehicle
2. **Privacy**: Don't expose current owner's email to claimant
3. **Expiry**: Claims auto-expire after 14 days to prevent stale requests
4. **RLS**: Proper policies ensure users only see relevant claims

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/[timestamp].sql` | Create | New ownership_claims table |
| `supabase/functions/send-ownership-claim-notification/index.ts` | Create | Email notification function |
| `supabase/functions/admin-data/index.ts` | Modify | Add get_vehicle_for_claim action |
| `supabase/config.toml` | Modify | Register new edge function |
| `src/components/vehicle/RequestTransferDialog.tsx` | Create | Dialog component |
| `src/pages/AddVehicle.tsx` | Modify | Handle duplicate + show request option |
