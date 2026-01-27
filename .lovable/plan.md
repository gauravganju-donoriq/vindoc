

# Plan: Super Admin Dashboard Implementation

## Overview

Implement a comprehensive super admin dashboard accessible only by `lestero@ignitecinc.com`. The admin will be able to monitor users, view their activity, see all vehicles on the platform, and access platform-wide analytics. Access control will be enforced using a secure `user_roles` table with RLS policies and a security definer function.

## Security Architecture

The admin access will be secured using:
1. A `user_roles` table storing admin roles (following Supabase security best practices)
2. A security definer function `has_role()` to check admin status without RLS recursion
3. An Edge Function to fetch admin data (since admins need cross-user access)
4. Frontend route protection checking admin status

```text
User Flow:
1. User logs in with lestero@ignitecinc.com
2. System checks user_roles table for 'super_admin' role
3. If admin, show "Admin Dashboard" link in header
4. Admin dashboard loads data via Edge Function (bypasses RLS)
```

## Database Changes

### 1. Create Role Enum and user_roles Table

```sql
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can only view their own roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);
```

### 2. Create Security Definer Function

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;
```

### 3. Seed Initial Admin User

After the user with email `lestero@ignitecinc.com` logs in, their role will be assigned via an Edge Function or manual insert. For safety, we'll create an Edge Function that checks email and assigns admin role on first access.

## New Edge Function: admin-data

Create `supabase/functions/admin-data/index.ts` to fetch platform-wide data for admins only.

**Endpoints:**
- `GET /admin-data?type=overview` - Platform stats (total users, vehicles, documents)
- `GET /admin-data?type=users` - All users with their vehicle counts
- `GET /admin-data?type=activity` - Recent activity across all users
- `GET /admin-data?type=vehicles` - All vehicles on the platform

**Security:**
- Verify JWT and check if user email is `lestero@ignitecinc.com`
- Uses service role key to bypass RLS for admin queries

## Frontend Implementation

### 1. New Admin Pages

| File | Purpose |
|------|---------|
| `src/pages/Admin.tsx` | Main admin dashboard with tabs/sections |
| `src/components/admin/AdminOverview.tsx` | Platform statistics cards |
| `src/components/admin/AdminUsers.tsx` | User listing with details |
| `src/components/admin/AdminActivity.tsx` | Activity feed from vehicle_history |
| `src/components/admin/AdminVehicles.tsx` | All vehicles table |

### 2. Admin Route Protection

Create `src/hooks/useAdminCheck.ts`:
- Check if current user's email matches admin email
- Redirect non-admins away from /admin routes

### 3. Update App.tsx Routes

```text
Add new route:
  <Route path="/admin" element={<Admin />} />
```

### 4. Update Dashboard Header

For the admin user, show an "Admin" link in the header next to Logout.

## Admin Dashboard Features

### Overview Tab
- Total registered users
- Total vehicles on platform
- Total documents uploaded
- Verified vs unverified vehicle ratio
- Documents expiring this month

### Users Tab
- Table showing all users
- Columns: Email, Vehicles Count, Documents Count, Join Date, Last Active
- Click to see user's vehicles

### Activity Tab
- Real-time activity feed from vehicle_history table
- Shows all user activities across the platform
- Filters by activity type

### Vehicles Tab
- Table of all vehicles
- Columns: Registration, Owner, User Email, Verified Status, Created Date
- Search/filter capabilities

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/admin-data/index.ts` | Create | Edge function for admin data access |
| `src/pages/Admin.tsx` | Create | Main admin dashboard page |
| `src/components/admin/AdminOverview.tsx` | Create | Stats overview component |
| `src/components/admin/AdminUsers.tsx` | Create | Users list component |
| `src/components/admin/AdminActivity.tsx` | Create | Activity feed component |
| `src/components/admin/AdminVehicles.tsx` | Create | Vehicles list component |
| `src/hooks/useAdminCheck.ts` | Create | Admin role verification hook |
| `src/App.tsx` | Update | Add /admin route |
| `src/pages/Dashboard.tsx` | Update | Add Admin link for admin users |

## Database Migration Summary

1. Create `app_role` enum with values: `super_admin`, `user`
2. Create `user_roles` table with proper RLS
3. Create `has_role` security definer function
4. Insert admin role for the specified email when they first access admin

## Implementation Order

1. Database: Create enum, table, and function via migration
2. Edge Function: Create admin-data function with proper auth checks
3. Frontend Hook: Create useAdminCheck hook
4. Admin Pages: Create Admin.tsx and sub-components
5. Integration: Update App.tsx routes and Dashboard header
6. Seed Admin: Add role for lestero@ignitecinc.com

## Security Considerations

- Admin email is hardcoded in Edge Function for verification
- Service role key used in Edge Function to bypass RLS
- Frontend only shows admin link if email matches (defense in depth)
- All admin data fetched via authenticated Edge Function calls
- No client-side role storage (prevents manipulation)

