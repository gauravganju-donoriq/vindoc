
# Unique Vehicle Registration & Controlled Data Refresh

## Overview
This plan addresses two key requirements:
1. **Prevent duplicate vehicles across accounts** - A registration number can only exist once in the entire system
2. **48-hour refresh cooldown** - Vehicle data can only be manually refreshed after 48 hours from the last update

---

## Feature 1: Unique Vehicle Registration (System-Wide)

### Current State
- The database has NO unique constraint on `registration_number` currently
- Error code `23505` is handled in AddVehicle.tsx but the message says "already in your account" (per-user scope)
- Any user can add the same vehicle multiple times

### Proposed Solution

**Database Changes:**
- Add a UNIQUE constraint on `registration_number` column in the `vehicles` table
- This enforces system-wide uniqueness at the database level

**Frontend Changes (AddVehicle.tsx):**
- Update error message when error code `23505` is detected
- New message: "This vehicle is already registered in the system by another user"
- Add a pre-check before saving to provide immediate feedback

**User Experience Flow:**
```text
User enters registration number
        |
        v
[Click "Save Vehicle"]
        |
        v
Database checks uniqueness
        |
    +---+---+
    |       |
 Unique   Duplicate
    |       |
    v       v
 Saved   Error: "This vehicle is 
         already registered"
```

### Pros & Cons

| Pros | Cons |
|------|------|
| Ensures data integrity - one vehicle, one owner | Vehicle can get "stuck" if user abandons account |
| Prevents abuse/spam of the API | Legitimate transfer of ownership requires deletion first |
| Database-level enforcement is secure | User can't verify ownership before claiming |
| Simple implementation | No ownership transfer workflow |

### Recommendation
The unique constraint is the right approach. For the edge case of legitimate ownership transfers, users would need to:
1. Previous owner deletes the vehicle from their account, OR
2. Contact support for manual transfer (future enhancement)

---

## Feature 2: Controlled Data Refresh with 48-Hour Cooldown

### Current State
- Vehicle data is fetched once during "Add Vehicle"
- No mechanism exists to refresh/update vehicle data
- No tracking of when data was last fetched

### Proposed Solution

**Database Changes:**
- Add `data_last_fetched_at` (timestamp) column to track when API data was last retrieved
- This timestamp is set when:
  - Vehicle is first added with fetched data
  - User manually triggers a refresh

**VehicleDetails Page Changes:**
- Add "Refresh Vehicle Data" button in the header area
- Button shows countdown timer when disabled (time until next refresh)
- Button is enabled only after 48 hours have passed
- Display "Last updated: [date/time]" near the vehicle header

**Edge Function Changes:**
- Create a new edge function or modify existing one to support "refresh mode"
- Update the vehicle record with fresh data and set the timestamp

**Refresh Button States:**

```text
+------------------------------------------+
|  State 1: Recently Updated               |
|  [Refresh Data] (disabled, grayed out)   |
|  "Can refresh in 47h 23m"                |
+------------------------------------------+

+------------------------------------------+
|  State 2: Ready to Refresh               |
|  [🔄 Refresh Data] (enabled, primary)    |
|  "Last updated 3 days ago"               |
+------------------------------------------+

+------------------------------------------+
|  State 3: Refreshing                     |
|  [⏳ Refreshing...] (disabled, loading)  |
+------------------------------------------+
```

### Workflow Diagram

```text
User opens VehicleDetails
        |
        v
Check data_last_fetched_at
        |
    +---+---+
    |       |
 <48hrs   >=48hrs
    |       |
    v       v
 Disable   Enable
 Button    Button
    |       |
    +---+---+
        |
    [User clicks "Refresh"]
        |
        v
    Call edge function
        |
        v
    Fetch from RapidAPI
        |
        v
    Update vehicle record
    + set data_last_fetched_at = NOW()
        |
        v
    Refresh UI with new data
```

### Pros & Cons

| Pros | Cons |
|------|------|
| Reduces unnecessary API calls | User can't get immediate updates if data changes |
| Saves RapidAPI costs | 48 hours may be too long for time-sensitive updates |
| User has control over when to refresh | Adds complexity to the UI |
| Prevents accidental data overwrites | Manual entry users may see stale data |

### Edge Cases Handled
1. **Vehicle added manually (no API fetch)**: `data_last_fetched_at` remains NULL, button shows "Never fetched - Refresh Now"
2. **API fetch fails during refresh**: Keep old data, show error, don't update timestamp
3. **Very old data**: Show warning if data is older than 30 days

---

## Implementation Details

### Step 1: Database Migration
```sql
-- Add unique constraint on registration_number
ALTER TABLE public.vehicles
ADD CONSTRAINT vehicles_registration_number_unique 
UNIQUE (registration_number);

-- Add timestamp column for tracking last fetch
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS data_last_fetched_at 
TIMESTAMP WITH TIME ZONE DEFAULT NULL;
```

### Step 2: Update AddVehicle.tsx
- Set `data_last_fetched_at = NOW()` when saving with fetched data
- Leave it NULL for manual entries
- Update duplicate error message to reflect system-wide uniqueness

### Step 3: Create refresh-vehicle-data Edge Function
- Accept vehicle ID as parameter
- Validate user owns the vehicle
- Check 48-hour cooldown server-side (defense in depth)
- Fetch fresh data from RapidAPI
- Update vehicle record + timestamp
- Return updated data

### Step 4: Update VehicleDetails.tsx
- Add `data_last_fetched_at` to Vehicle interface
- Add refresh button with cooldown logic
- Show "Last updated" timestamp
- Handle loading/error states for refresh

### Step 5: Update Edge Function (fetch-vehicle-details)
- Add support for "refresh" mode that also updates timestamp
- Reuse existing API mapping logic

---

## Files to be Modified/Created

| File | Changes |
|------|---------|
| `supabase/migrations/[timestamp].sql` | Add unique constraint + new column |
| `src/pages/AddVehicle.tsx` | Update error message, set timestamp on save |
| `src/pages/VehicleDetails.tsx` | Add refresh button, show last updated |
| `supabase/functions/fetch-vehicle-details/index.ts` | Add refresh mode support |
| `src/integrations/supabase/types.ts` | Auto-updated by migration |

---

## Summary

This plan implements:
1. **System-wide unique vehicle registration** - enforced at database level
2. **48-hour refresh cooldown** - with clear UI feedback and server-side validation

Both features work together to ensure data integrity while giving users control over their vehicle data updates.
