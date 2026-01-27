
# Plan: Fix Admin Dashboard and Vehicle Transfers RLS Errors

## Problem Summary

There are two separate issues causing errors:

1. **Admin Edge Function "Failed to fetch"** - Cold start timeout causing the initial request to fail
2. **"permission denied for table users"** - RLS policies on `vehicle_transfers` table incorrectly access `auth.users`

---

## Issue 1: Edge Function Cold Start Timeout

### What's Happening
When the edge function hasn't been called recently, it needs to "boot up" which takes extra time. The browser request times out before the function can respond.

### Solution
Add retry logic with a loading indicator so if the first request times out, it automatically retries.

### Files to Modify
- `src/components/admin/AdminOverview.tsx` - Add retry logic
- `src/components/admin/AdminUsers.tsx` - Add retry logic  
- `src/components/admin/AdminActivity.tsx` - Add retry logic
- `src/components/admin/AdminVehicles.tsx` - Add retry logic

---

## Issue 2: RLS Policy "permission denied for table users"

### What's Happening
The RLS policies for `vehicle_transfers` try to match the recipient's email by querying the `auth.users` table directly:

```sql
EXISTS (
  SELECT 1 FROM auth.users 
  WHERE auth.users.id = auth.uid() 
  AND auth.users.email = vehicle_transfers.recipient_email
)
```

The `authenticated` role cannot access `auth.users` table - this is a protected system table.

### Solution
Replace the `auth.users` query with `auth.jwt()->>'email'` which extracts the email directly from the JWT token:

```sql
-- Before (broken)
EXISTS (SELECT 1 FROM auth.users WHERE users.email = ...)

-- After (fixed)
(auth.jwt()->>'email') = recipient_email
```

### Database Migration Required
Drop and recreate the two problematic policies:
1. "Recipients can view transfers to them" (SELECT)
2. "Recipients can respond to transfers" (UPDATE)

---

## Technical Implementation Details

### Database Migration SQL

```sql
-- Drop the problematic policies
DROP POLICY IF EXISTS "Recipients can view transfers to them" ON public.vehicle_transfers;
DROP POLICY IF EXISTS "Recipients can respond to transfers" ON public.vehicle_transfers;

-- Recreate with JWT-based email check
CREATE POLICY "Recipients can view transfers to them"
ON public.vehicle_transfers
FOR SELECT
USING ((auth.jwt()->>'email') = recipient_email);

CREATE POLICY "Recipients can respond to transfers"
ON public.vehicle_transfers
FOR UPDATE
USING (
  status = 'pending'
  AND (auth.jwt()->>'email') = recipient_email
);
```

### Frontend Retry Logic Pattern

```typescript
const fetchWithRetry = async (maxRetries = 2) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke("admin-data", {
        body: { type: "overview" }
      });
      if (error) throw error;
      return data;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      // Wait before retry (edge function may be warming up)
      await new Promise(r => setTimeout(r, 1000));
    }
  }
};
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| Database Migration | Create | Fix RLS policies using `auth.jwt()->>'email'` |
| `src/components/admin/AdminOverview.tsx` | Modify | Add retry logic for cold start |
| `src/components/admin/AdminUsers.tsx` | Modify | Add retry logic |
| `src/components/admin/AdminActivity.tsx` | Modify | Add retry logic |
| `src/components/admin/AdminVehicles.tsx` | Modify | Add retry logic |

---

## Implementation Order

1. **Create database migration** to fix the RLS policies (critical - blocks transfers)
2. **Update admin components** with retry logic (improves reliability)
3. **Test both fixes** - verify transfers work and admin loads consistently

---

## Expected Outcome

After implementation:
- Vehicle transfers will work without "permission denied" errors
- Admin dashboard will load reliably even on cold starts
- Both the admin user and regular users will have a smooth experience
