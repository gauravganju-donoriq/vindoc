

# Plan: Debug and Fix Vehicle API Integration

## Problem Analysis

After comparing the RapidAPI code snippet with our implementation, I found that our code is technically correct. The 502 error message from the logs says:

```
"API Request failed due to Provider configuration error: The API response body transformation failed to parse content-type application/json"
```

This indicates the issue is on the **API provider's side**, not our code. However, there's one small thing we can try.

## What We'll Try

### 1. Match Exact Header Order from RapidAPI
Although header order shouldn't matter in HTTP, some poorly implemented APIs might be sensitive to it. The RapidAPI snippet shows:
- `x-rapidapi-key` first
- `x-rapidapi-host` second  
- `Content-Type` third

Our code has `Content-Type` first. We'll reorder to match exactly.

### 2. Add Request Body Logging
Add logging to see the exact request body being sent.

### 3. Test with Direct Call
After deploying, we'll test the function directly to verify the fix.

## Technical Changes

**File: `supabase/functions/fetch-vehicle-details/index.ts`**

Update the headers to match the exact order from RapidAPI:

```typescript
const response = await fetch('https://vehicle-rc-information-v2.p.rapidapi.com/', {
  method: 'POST',
  headers: {
    'x-rapidapi-key': rapidApiKey,
    'x-rapidapi-host': 'vehicle-rc-information-v2.p.rapidapi.com',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ vehicle_number: registrationNumber }),
});
```

Also add logging for the request body:
```typescript
console.log('Request body:', JSON.stringify({ vehicle_number: registrationNumber }));
```

## Important Note

If this still returns a 502 error, it confirms the issue is entirely on RapidAPI's provider side. In that case, our options are:

1. **Wait** for the API provider to fix their issue
2. **Switch** to a different, more reliable Vehicle RC API
3. **Rely on manual entry** as the primary method for now

## Testing

After the changes, we'll test by calling the edge function directly with a registration number to verify the response.

