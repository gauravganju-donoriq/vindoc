
# Plan: Vehicle Sell Module - Phase 1 (Seller Listing to Admin Approval)

## Overview

This plan implements a complete "Sell" module that allows verified vehicle owners to list their vehicles for sale, with an admin approval workflow before public visibility. The feature includes AI-powered market price estimation, seller pricing, and secure admin management.

---

## Current Architecture Analysis

### Existing Patterns to Follow
- **Tabs in VehicleDetails**: Already has 7 tabs (Overview, Specifications, Ownership, Verification, Documents, Service, Activity)
- **Admin Dashboard**: Uses `admin-data` edge function for all admin operations with proper authorization
- **Claims System**: Similar workflow to what we need (user submits -> admin reviews -> accept/reject/hold)
- **RLS Policies**: Strict row-level security with `has_role()` function for super_admin checks

### Key Constraints
1. **Verification Required**: Only verified vehicles (`is_verified = true`) can be listed for sale
2. **One Listing Per Vehicle**: A vehicle can only have one active listing at a time
3. **No User Price Manipulation**: Once submitted, only admins can modify status
4. **Service Role Only**: AI pricing calls must go through edge functions

---

## Database Schema

### New Table: `vehicle_listings`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `vehicle_id` | UUID | FK to vehicles (unique active constraint) |
| `user_id` | UUID | Seller's user ID |
| `ai_estimated_price` | NUMERIC | AI-generated market price |
| `expected_price` | NUMERIC | Seller's asking price |
| `additional_notes` | TEXT | Seller's notes about the vehicle |
| `status` | TEXT | pending, approved, rejected, on_hold, cancelled |
| `admin_notes` | TEXT | Admin's internal notes |
| `reviewed_by` | UUID | Admin who reviewed |
| `reviewed_at` | TIMESTAMPTZ | When reviewed |
| `created_at` | TIMESTAMPTZ | Submission timestamp |
| `updated_at` | TIMESTAMPTZ | Last update |

### RLS Policies

```text
Owners can view their own listings:
  SELECT - USING (auth.uid() = user_id)

Owners can create listings for verified vehicles:
  INSERT - WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM vehicles WHERE id = vehicle_id AND user_id = auth.uid() AND is_verified = true)
  )

Owners can cancel their pending listings:
  UPDATE - USING (auth.uid() = user_id AND status = 'pending')
  Only allow status change to 'cancelled'

Super admins can view all listings:
  SELECT - USING (has_role(auth.uid(), 'super_admin'))

Super admins can update listings:
  UPDATE - USING (has_role(auth.uid(), 'super_admin'))
```

---

## Edge Functions

### 1. New Function: `estimate-vehicle-price/index.ts`

Uses Lovable AI to generate a market price estimate based on vehicle data.

**Input:**
```typescript
{
  vehicleId: string,
  vehicleData: {
    registration_number, manufacturer, maker_model,
    registration_date, fuel_type, owner_count,
    seating_capacity, color, body_type, is_financed
  }
}
```

**Logic:**
1. Verify user owns the vehicle
2. Check vehicle is verified
3. Call Lovable AI (google/gemini-3-flash-preview) with vehicle details
4. Parse structured response for price range
5. Return estimated price

**System Prompt for AI:**
```text
You are an expert used car valuation specialist for the Indian market.
Based on the vehicle details provided, estimate the current market value.

Consider:
- Age of vehicle (registration date)
- Brand reputation (manufacturer)
- Model popularity
- Fuel type trends (petrol vs diesel vs electric)
- Ownership count (1st owner premium)
- Financing status (clear title vs financed)
- Regional demand patterns

Return a JSON with:
{
  "estimated_price_low": number,
  "estimated_price_high": number,
  "confidence": "high" | "medium" | "low",
  "factors": ["list of key factors affecting price"]
}
```

### 2. Update: `admin-data/index.ts`

Add new cases for listing management:

```typescript
case "listings": // Get all listings with vehicle/user details
case "update_listing_status": // Approve/reject/hold listing
case "add_listing_note": // Admin adds internal note
```

---

## Frontend Components

### 1. New Component: `SellVehicleTab.tsx`

Location: `src/components/vehicle/SellVehicleTab.tsx`

**States:**
- No listing exists -> Show "List for Sale" button (only if verified)
- Pending listing -> Show listing details (read-only)
- Approved listing -> Show "Listed for Sale" badge
- Rejected/On Hold -> Show status with reason

**UI Elements:**
- AI Market Price display (with loading spinner)
- Expected Price input (number field, Indian Rupee formatting)
- Additional Notes textarea
- Submit button with confirmation dialog
- Cancel listing button (if pending)

**Flow:**
```text
1. User clicks "Sell" tab
2. Check if vehicle is verified
   - No: Show "Vehicle must be verified before listing"
3. Check existing listing
   - Active listing exists: Show status card
   - No listing: Show form
4. User clicks "Get Market Price"
   - Call estimate-vehicle-price
   - Display AI price with confidence indicator
5. User enters expected price and notes
6. User clicks "Submit for Review"
   - Show confirmation dialog
   - On confirm: Insert to vehicle_listings
   - Log to vehicle_history
```

### 2. New Component: `AdminListings.tsx`

Location: `src/components/admin/AdminListings.tsx`

**UI Elements:**
- Table with: Vehicle, Seller, AI Price, Expected Price, Status, Actions
- Filters: All / Pending / Approved / Rejected / On Hold
- Action buttons: Approve, Reject, Hold
- Click to expand: Show full notes, vehicle details

**Actions:**
- Approve: Sets status to 'approved', adds reviewed_by/at
- Reject: Requires reason, sets status to 'rejected'
- Hold: Requires reason, sets status to 'on_hold'

### 3. Update: `VehicleDetails.tsx`

Add new tab after "Activity":
```tsx
<TabsTrigger value="sell" className="...">
  <DollarSign className="h-4 w-4" />
  <span className="hidden sm:inline">Sell</span>
</TabsTrigger>

<TabsContent value="sell" className="mt-0">
  <SellVehicleTab 
    vehicle={vehicle} 
    isVerified={!!vehicle.is_verified}
  />
</TabsContent>
```

### 4. Update: `Admin.tsx`

Add new tab:
```tsx
<TabsTrigger value="listings" className="flex items-center gap-2">
  <Tag className="h-4 w-4" />
  <span className="hidden sm:inline">Listings</span>
</TabsTrigger>

<TabsContent value="listings">
  <AdminListings />
</TabsContent>
```

---

## Security Measures

### 1. Verification Gate
- Frontend disables form if `is_verified !== true`
- Edge function double-checks verification status
- RLS policy prevents insert for unverified vehicles

### 2. Price Manipulation Prevention
- AI price is generated server-side only
- Once submitted, seller cannot edit expected_price
- Only admin can change status (not user)

### 3. Single Active Listing
- Database constraint: UNIQUE(vehicle_id) WHERE status IN ('pending', 'approved', 'on_hold')
- Edge function checks before insert

### 4. Audit Trail
- All listing events logged to vehicle_history
- Admin actions include reviewed_by UUID

### 5. Input Validation
- Zod schema for price validation (positive number, max limit)
- Notes trimmed and length-limited (500 chars)

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_vehicle_listings.sql` | CREATE | New table + RLS policies |
| `supabase/functions/estimate-vehicle-price/index.ts` | CREATE | AI price estimation |
| `supabase/functions/admin-data/index.ts` | MODIFY | Add listing management cases |
| `supabase/config.toml` | MODIFY | Add new function config |
| `src/components/vehicle/SellVehicleTab.tsx` | CREATE | Seller UI component |
| `src/components/admin/AdminListings.tsx` | CREATE | Admin listings management |
| `src/pages/VehicleDetails.tsx` | MODIFY | Add Sell tab |
| `src/pages/Admin.tsx` | MODIFY | Add Listings tab |
| `src/integrations/supabase/types.ts` | AUTO | Will auto-update after migration |

---

## Vehicle History Events

New event types for the Sell module:

| Event Type | Description |
|------------|-------------|
| `listing_created` | User submitted vehicle for sale |
| `listing_approved` | Admin approved the listing |
| `listing_rejected` | Admin rejected the listing |
| `listing_on_hold` | Admin put listing on hold |
| `listing_cancelled` | User cancelled their listing |

---

## User Flow Diagram

```text
User Flow:
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Vehicle Page   │────▶│   Sell Tab       │────▶│ Submit Listing  │
│  (Verified ✓)   │     │  - AI Price      │     │ - Confirm Dialog│
└─────────────────┘     │  - Expected $    │     │ - Save to DB    │
                        │  - Notes         │     └────────┬────────┘
                        └──────────────────┘              │
                                                          ▼
Admin Flow:                                    ┌─────────────────┐
┌─────────────────┐     ┌──────────────────┐   │ Pending Status  │
│  Admin Panel    │────▶│ Listings Tab     │◀──│ (Readonly)      │
└─────────────────┘     │ - Review Table   │   └─────────────────┘
                        │ - Actions        │
                        └────────┬─────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
       ┌───────────┐      ┌───────────┐      ┌───────────┐
       │  Approve  │      │  Reject   │      │   Hold    │
       └───────────┘      └───────────┘      └───────────┘
```

---

## Implementation Order

1. **Database Migration**: Create `vehicle_listings` table with RLS
2. **Edge Function**: Create `estimate-vehicle-price` with Lovable AI
3. **Admin Edge Function**: Add listing management to `admin-data`
4. **SellVehicleTab Component**: Build seller-facing UI
5. **AdminListings Component**: Build admin review interface
6. **Page Integration**: Add tabs to VehicleDetails and Admin pages
7. **Testing**: Verify flows end-to-end

---

## Future Phases (Not In This Plan)

- **Phase 2**: Public marketplace page showing approved listings
- **Phase 3**: Buyer inquiry system
- **Phase 4**: Price negotiation workflow
- **Phase 5**: Transaction completion tracking
