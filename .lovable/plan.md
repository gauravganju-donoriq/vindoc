
# Enhanced AI-Powered Expiry Alert System Plan

## Current State Analysis

The project already has a robust expiry alert system in place:

### Existing Infrastructure
| Component | Status | Details |
|-----------|--------|---------|
| Edge Function | ✅ Exists | `check-expiry-alerts/index.ts` (782 lines) |
| Cron Job | ✅ Configured | Runs daily at 2:30 AM UTC |
| Document Types | ✅ Tracked | Insurance, PUCC, Fitness, Road Tax |
| Service Reminders | ✅ Included | Next service due dates |
| AI Generation | ✅ Using Lovable AI | `google/gemini-3-flash-preview` model |
| Email Notifications | ✅ Via Resend | Consolidated emails per user |
| Notification Logging | ✅ Working | Prevents duplicate alerts |

### What's Missing
1. **Vehicle Lifespan Logic** - Diesel vehicles in India have a 10-year lifespan in metro cities (15 years in non-metros), petrol vehicles have 15 years (20 years in non-metros)
2. **Configurable Schedule** - Currently hardcoded to daily; user requested flexibility
3. **In-App Display** - AI insights only sent via email, not shown in the app
4. **Vehicle Age Alerts** - No alerts for vehicles approaching end-of-life

---

## Proposed Enhancements

### 1. Vehicle Lifespan Calculation

Add logic to detect when a vehicle is approaching its end-of-life based on Indian regulations:

| Vehicle Type | Metro Limit | Non-Metro Limit |
|--------------|-------------|-----------------|
| Diesel | 10 years | 15 years |
| Petrol/CNG | 15 years | 20 years |
| Electric | No limit | No limit |

Since we don't have city data, we'll use the stricter metro limits by default and provide advisory alerts.

### 2. Enhanced Edge Function

Update `check-expiry-alerts/index.ts` to include:
- Vehicle lifespan checks based on fuel type and registration date
- More detailed AI prompts that consider vehicle age
- New alert type: "vehicle_lifespan" for end-of-life warnings

### 3. In-App Expiry Intelligence Component

Create a new component to display AI-generated insights directly in the app:
- Show on the Overview tab in Vehicle Details
- Display upcoming expiry warnings with AI tips
- Show vehicle lifespan status if applicable

### 4. Cron Schedule Flexibility

The current daily schedule is already good for production. For testing, we can manually trigger the function.

---

## Implementation Tasks

### Phase 1: Add Vehicle Lifespan Logic to Edge Function

**File: `supabase/functions/check-expiry-alerts/index.ts`**

Add new interfaces and logic:

```typescript
interface LifespanAlert {
  vehicle: Vehicle;
  vehicleAge: number;
  maxLifespan: number;
  yearsRemaining: number;
  fuelType: string;
  alertType: "approaching" | "exceeded";
}
```

Add function to calculate vehicle lifespan:
- Check fuel type (DIESEL, PETROL, CNG, ELECTRIC)
- Calculate age from registration_date
- Compare against limits (10 years diesel, 15 years petrol for metros)
- Generate alerts for vehicles within 2 years of limit or exceeded

### Phase 2: Enhance AI Prompts

Update the `generateDocumentAIContent` function to:
- Include vehicle age in cost estimates (older vehicles may have higher insurance)
- Add India-specific context for fitness certificates (mandatory for commercial vehicles)
- Reference re-registration requirements for vehicles over 15 years

### Phase 3: Add Lifespan Alerts to Email

Update `sendConsolidatedEmail` to include:
- New section for vehicle lifespan warnings
- AI-generated advice on options (scrap, re-register, sell)
- Estimated scrap value ranges

### Phase 4: Create In-App Expiry Intelligence Component

**New File: `src/components/vehicle/ExpiryIntelligence.tsx`**

A component that displays:
- Upcoming document expiries with countdown
- AI-generated renewal tips (fetched from expiry_notifications table)
- Vehicle lifespan status indicator
- Quick action buttons (set reminder, view renewal centers)

### Phase 5: Display Expiry Intelligence in Overview Tab

**File: `src/pages/VehicleDetails.tsx`**

Add the new component to the Overview tab, showing:
- Next upcoming expiry with AI tip
- Lifespan progress bar for older vehicles
- Link to full Documents tab for details

---

## Technical Details

### Database Changes

No schema changes needed - the existing `expiry_notifications` table already stores:
- `ai_content` (JSONB) - Contains AI-generated tips
- `notification_type` - Can add "lifespan" type

### Edge Function Updates

Update the existing function rather than creating a new one:

1. Add `VEHICLE_LIFESPAN_LIMITS` constant:
```typescript
const VEHICLE_LIFESPAN_LIMITS = {
  DIESEL: { metro: 10, nonMetro: 15 },
  PETROL: { metro: 15, nonMetro: 20 },
  CNG: { metro: 15, nonMetro: 20 },
  LPG: { metro: 15, nonMetro: 20 },
  ELECTRIC: { metro: null, nonMetro: null }, // No limit
};
```

2. Add lifespan check function:
```typescript
function checkVehicleLifespan(vehicle: Vehicle): LifespanAlert | null {
  if (!vehicle.registration_date || !vehicle.fuel_type) return null;
  
  const fuelType = vehicle.fuel_type.toUpperCase();
  const limits = VEHICLE_LIFESPAN_LIMITS[fuelType];
  if (!limits || !limits.metro) return null; // Electric or unknown
  
  const registrationYear = new Date(vehicle.registration_date).getFullYear();
  const vehicleAge = new Date().getFullYear() - registrationYear;
  const maxLifespan = limits.metro; // Use stricter metro limit
  const yearsRemaining = maxLifespan - vehicleAge;
  
  if (yearsRemaining <= 2) {
    return {
      vehicle,
      vehicleAge,
      maxLifespan,
      yearsRemaining,
      fuelType,
      alertType: yearsRemaining <= 0 ? "exceeded" : "approaching",
    };
  }
  return null;
}
```

3. Update AI prompt to include lifespan context

### New Component Structure

```typescript
// src/components/vehicle/ExpiryIntelligence.tsx

interface ExpiryIntelligenceProps {
  vehicle: Vehicle;
  expiryNotifications?: ExpiryNotification[];
}

// Shows:
// - Most urgent upcoming expiry with AI tip
// - Vehicle lifespan indicator (if applicable)
// - Smart suggestions based on data
```

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/check-expiry-alerts/index.ts` | Add lifespan logic, enhance AI prompts |
| `src/components/vehicle/ExpiryIntelligence.tsx` | New component for in-app display |
| `src/pages/VehicleDetails.tsx` | Add ExpiryIntelligence to Overview tab |

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/vehicle/ExpiryIntelligence.tsx` | In-app AI insights display |

---

## Testing Approach

1. Deploy the updated edge function
2. Manually trigger it to test with existing vehicles
3. Verify email content includes lifespan warnings (if applicable)
4. Check that the in-app component displays correctly
5. Test with different fuel types and ages

---

## Expected Outcomes

- Users see AI-powered renewal tips directly in the app
- Diesel vehicle owners get early warnings about 10-year limit
- More actionable advice based on vehicle age and type
- Consolidated view of all upcoming renewals with intelligent suggestions
