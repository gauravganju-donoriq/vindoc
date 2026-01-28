
# Plan: Enforce 100% Verification for Sell Module

## Problem Statement

Currently, the Sell tab only checks if `vehicle.is_verified` (photo verification) is true. However, the user wants to enforce that **all verification steps must be complete (100%)** before a vehicle can be listed for sale.

The verification system has 4 required categories:
1. Photo Verification (`is_verified = true`)
2. Vehicle Identity (4 of 5 fields: registration_number, owner_name, manufacturer, maker_model, registration_date)
3. Technical Specs (5 of 7 fields: chassis_number, engine_number, fuel_type, color, seating_capacity, cubic_capacity, vehicle_class)
4. Ownership Details (2 of 2 fields: owner_count, rc_status)

## Current Architecture

```
+---------------------------+     +----------------------+
|  VehicleDetails.tsx       |     | SellVehicleTab.tsx   |
|                           |     |                      |
| calculateVerificationProgress() | isVerified: boolean  |
| returns isFullyVerified   |---->| (only photo check)   |
+---------------------------+     +----------------------+
                                           |
                                           v
+---------------------------+     +----------------------+
|  RLS Policy               |     | estimate-vehicle-    |
|  vehicle_listings INSERT  |     | price Edge Function  |
|                           |     |                      |
|  vehicles.is_verified=true|     | No verification check|
|  (only photo check)       |     |                      |
+---------------------------+     +----------------------+
```

## Solution Design

### Layer 1: Frontend Enforcement (UI Gate)

**File: `src/pages/VehicleDetails.tsx`**
- Calculate verification progress using existing `calculateVerificationProgress(vehicle, documents)`
- Pass `isFullyVerified` instead of `!!vehicle.is_verified` to SellVehicleTab
- Also pass the full progress object for detailed messaging

**File: `src/components/vehicle/SellVehicleTab.tsx`**
- Update props to accept `verificationProgress` object
- Show detailed empty state with:
  - List of incomplete steps
  - Progress percentage
  - Link/button to Verification tab
- Only allow listing submission when `isFullyVerified === true`

### Layer 2: Backend Enforcement (Security)

**File: `supabase/functions/estimate-vehicle-price/index.ts`**
- Add verification check before generating price estimate
- Query vehicle data and verify all required fields are present
- Return error if verification incomplete

**Database: RLS Policy Update**
- The current RLS policy only checks `is_verified = true`
- We need to update to check all required fields
- Alternative: Keep RLS simple, add validation in Edge Function (recommended for flexibility)

### Layer 3: Edge Function Validation

**File: `supabase/functions/estimate-vehicle-price/index.ts`**
Add server-side verification check:

```typescript
// Check full verification status
const requiredIdentityFields = ['registration_number', 'owner_name', 'manufacturer', 'maker_model', 'registration_date'];
const requiredTechnicalFields = ['chassis_number', 'engine_number', 'fuel_type', 'color', 'seating_capacity', 'cubic_capacity', 'vehicle_class'];
const requiredOwnershipFields = ['owner_count', 'rc_status'];

const identityCount = requiredIdentityFields.filter(f => vehicle[f]).length;
const technicalCount = requiredTechnicalFields.filter(f => vehicle[f]).length;
const ownershipCount = requiredOwnershipFields.filter(f => vehicle[f]).length;

const isFullyVerified = 
  vehicle.is_verified === true &&
  identityCount >= 4 &&
  technicalCount >= 5 &&
  ownershipCount >= 2;

if (!isFullyVerified) {
  return error: "Vehicle must be 100% verified before listing for sale"
}
```

---

## Implementation Details

### 1. Update SellVehicleTab Props Interface

```typescript
interface SellVehicleTabProps {
  vehicle: Vehicle;
  verificationProgress: VerificationProgressType;
}
```

### 2. Enhanced Empty State UI

When not fully verified, show:
- Current verification percentage with progress bar
- List of incomplete required steps
- Clear call-to-action: "Complete Verification" button that switches to Verification tab
- Explanation of why verification is required for selling

### 3. Security Layers Summary

| Layer | Location | Check |
|-------|----------|-------|
| UI Gate | SellVehicleTab | isFullyVerified from calculateVerificationProgress() |
| API Gate | estimate-vehicle-price | Server-side field validation |
| DB Gate | RLS Policy | Keep existing is_verified check (prevents bulk manipulation) |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/VehicleDetails.tsx` | Calculate progress, pass to SellVehicleTab |
| `src/components/vehicle/SellVehicleTab.tsx` | Update props, add detailed empty state |
| `supabase/functions/estimate-vehicle-price/index.ts` | Add server-side verification check |

---

## Security Considerations

1. **Frontend + Backend validation**: Never trust frontend alone - Edge Function will verify
2. **RLS remains as last line of defense**: Keeps `is_verified = true` check
3. **No loopholes**: User cannot bypass UI to call estimate-vehicle-price directly without full verification
4. **Clear error messages**: Both UI and API return helpful guidance on what's missing

---

## Empty State Design

When vehicle is not 100% verified:

```
+------------------------------------------+
|  [Lock Icon]  Complete Verification      |
|                                          |
|  Your vehicle must be 100% verified      |
|  before listing for sale. This ensures   |
|  buyer trust and faster sales.           |
|                                          |
|  [Progress Bar: 60%]                     |
|                                          |
|  ✓ Photo Verification                    |
|  ✓ Vehicle Identity                      |
|  ○ Technical Specs (3/5 required)        |
|  ○ Ownership Details (1/2 required)      |
|                                          |
|  [Complete Verification] button          |
+------------------------------------------+
```

---

## User Flow After Implementation

```
User clicks "Sell" tab
        |
        v
Is vehicle 100% verified?
        |
   +----+----+
   |         |
  NO        YES
   |         |
   v         v
Show empty  Show listing
state with   form with
missing      AI price
steps        estimate
```
