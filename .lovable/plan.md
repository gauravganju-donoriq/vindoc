

# Plan: Edge Functions Security, Reliability & Stability Audit

## Overview

I've analyzed all 11 edge functions in your project. Below is a comprehensive review identifying security vulnerabilities, reliability issues, and stability improvements needed before pushing to production.

---

## Functions Inventory

| Function | Purpose | Current Risk Level |
|----------|---------|-------------------|
| `admin-data` | Admin dashboard operations | **HIGH** |
| `analyze-document` | AI document scanning | **MEDIUM** |
| `bolna-webhook` | Voice call status updates | **HIGH** |
| `check-expiry-alerts` | Cron job for notifications | **MEDIUM** |
| `estimate-vehicle-price` | AI price estimation | **LOW** |
| `fetch-vehicle-details` | RTO API lookup | **MEDIUM** |
| `make-voice-call` | Initiate voice calls | **MEDIUM** |
| `manage-voice-agent` | Admin voice config | **LOW** |
| `send-ownership-claim-notification` | Email notifications | **MEDIUM** |
| `send-transfer-notification` | Email notifications | **MEDIUM** |
| `verify-vehicle` | AI plate verification | **MEDIUM** |

---

## Critical Security Issues

### 1. Admin Function - Hardcoded Admin Email (HIGH)

**File:** `admin-data/index.ts` (line 8)

**Current:**
```typescript
const ADMIN_EMAIL = "lestero@ignitecinc.com";
```

**Problem:** 
- Hardcoded email means changing admins requires code redeployment
- Email comparison is case-sensitive (could cause issues)
- Single point of failure - if this email is compromised, full admin access

**Solution:**
- Use the existing `has_role()` function with `super_admin` role instead
- Remove hardcoded email check entirely
- Already checking role on line 61-75, but only AFTER email check - this is backwards

### 2. Webhook Authentication Missing (HIGH)

**File:** `bolna-webhook/index.ts`

**Current:** No authentication - webhook accepts ANY incoming request

**Problem:**
- Attackers could spoof webhook calls
- Fake call completion data could be injected
- Could manipulate call logs maliciously

**Solution:**
- Add webhook signature verification (Bolna provides this)
- Or add a secret token validation
- At minimum, validate payload structure strictly

### 3. Analyze-Document - No Auth Check (MEDIUM)

**File:** `analyze-document/index.ts`

**Current:** Function accepts any request without verifying user identity

**Problem:**
- Anyone can call this endpoint and use AI quota
- No rate limiting per user
- Could lead to quota exhaustion attacks

**Solution:**
- Add JWT verification using `getClaims()`
- Implement user-based rate limiting
- Log usage per user

### 4. Verify-Vehicle - No Auth Check (MEDIUM)

**File:** `verify-vehicle/index.ts`

**Current:** No authentication verification

**Problem:**
- Same as analyze-document - AI quota abuse possible
- No ownership verification for vehicleId

**Solution:**
- Add JWT auth
- Verify user owns the vehicle they're verifying

### 5. Fetch-Vehicle-Details - No Auth Check (MEDIUM)

**File:** `fetch-vehicle-details/index.ts`

**Current:** Public endpoint

**Problem:**
- RapidAPI quota could be exhausted by attackers
- No user tracking

**Solution:**
- Add JWT auth
- Consider caching responses to reduce API calls

---

## Reliability Issues

### 6. Admin-Data - N+1 Query Problem (HIGH)

**File:** `admin-data/index.ts` (multiple locations)

**Current:** Loop with individual API calls
```typescript
for (const [uId, stats] of userMap) {
  const { data: userData } = await adminClient.auth.admin.getUserById(uId);
  // ...
}
```

**Problem:**
- For 100 users, this makes 100+ sequential API calls
- Function will timeout with growing user base
- Poor performance

**Solution:**
- Batch user lookups where possible
- Implement pagination for large datasets
- Add timeout handling

### 7. Check-Expiry-Alerts - No Error Boundaries (MEDIUM)

**File:** `check-expiry-alerts/index.ts`

**Problem:**
- If one AI call fails, processing continues but state is inconsistent
- No transaction rollback for partial failures
- Large loop could timeout

**Solution:**
- Add try-catch around individual operations
- Implement batch processing with size limits
- Add dead-letter queue for failed notifications

### 8. Make-Voice-Call - External API Dependency (MEDIUM)

**File:** `make-voice-call/index.ts`

**Problem:**
- If Bolna API is down, calls fail silently
- No retry mechanism
- No circuit breaker pattern

**Solution:**
- Add retry with exponential backoff
- Implement health check before batch calls
- Add fallback notification (email if call fails)

---

## Input Validation Issues

### 9. Missing Input Sanitization

**Affected Functions:** Most functions

**Problem:**
- User inputs like `registrationNumber`, `vehicleId` not validated
- SQL injection not possible (Supabase client), but still needs validation
- XSS possible if data is reflected back

**Solution:**
- Add zod schema validation for all inputs
- Sanitize string inputs (trim, uppercase where needed)
- Validate UUID formats

### 10. Admin-Data - Insufficient Action Validation

**File:** `admin-data/index.ts`

**Current:**
```typescript
const dataType = (body?.type as string) || "overview";
```

**Problem:**
- Type casting without validation
- Could accept unexpected values

**Solution:**
- Whitelist allowed action types
- Return explicit error for unknown actions

---

## Stability Improvements

### 11. Consistent Error Response Format

**Current:** Error responses vary across functions

**Solution:**
- Standardize error response format:
```typescript
{
  success: false,
  error: string,
  errorCode: string,
  details?: object
}
```

### 12. Add Request Logging

**Current:** Inconsistent logging

**Solution:**
- Log request ID, user ID, action, duration for all requests
- Structured logging format for easier debugging

### 13. Environment Variable Validation

**Current:** Some functions check for env vars, others assume they exist

**Solution:**
- Validate all required env vars at function start
- Return clear error if configuration is missing

### 14. Add Timeouts for External Calls

**Current:** External API calls have no timeout

**Solution:**
- Add AbortController with timeout for all fetch calls
- Default timeout: 30 seconds for AI, 10 seconds for other APIs

---

## CORS Headers Inconsistency

**Problem:** CORS headers vary across functions

**Current variations:**
```typescript
// Some have this:
"x-supabase-client-platform"
// Others have full list:
"x-supabase-client-platform, x-supabase-client-platform-version, ..."
```

**Solution:**
- Standardize CORS headers across all functions
- Use the full extended list consistently

---

## Implementation Priority

### Phase 1: Critical Security (Do First)

| Issue | Function | Effort |
|-------|----------|--------|
| Remove hardcoded admin email | admin-data | Small |
| Add webhook signature validation | bolna-webhook | Medium |
| Add auth to analyze-document | analyze-document | Small |
| Add auth to verify-vehicle | verify-vehicle | Small |
| Add auth to fetch-vehicle-details | fetch-vehicle-details | Small |

### Phase 2: Reliability

| Issue | Function | Effort |
|-------|----------|--------|
| Fix N+1 queries | admin-data | Medium |
| Add pagination | admin-data | Medium |
| Add retry logic | make-voice-call | Small |
| Add error boundaries | check-expiry-alerts | Medium |

### Phase 3: Stability

| Issue | Function | Effort |
|-------|----------|--------|
| Input validation (zod) | All functions | Medium |
| Standardize error format | All functions | Small |
| Add request logging | All functions | Small |
| Consistent CORS | All functions | Small |
| Add timeouts | All functions | Small |

---

## Recommended Code Changes Summary

1. **admin-data/index.ts**
   - Remove line 8 (ADMIN_EMAIL constant)
   - Move role check to start of function (before email check)
   - Add pagination for user/vehicle/activity lists
   - Batch user lookups instead of N+1 pattern

2. **bolna-webhook/index.ts**
   - Add signature verification using secret
   - Validate required payload fields
   - Add idempotency check (prevent duplicate updates)

3. **analyze-document/index.ts**
   - Add JWT authentication
   - Add user-based rate limiting
   - Add request timeout

4. **verify-vehicle/index.ts**
   - Add JWT authentication
   - Verify user owns the vehicle

5. **fetch-vehicle-details/index.ts**
   - Add JWT authentication
   - Consider response caching

6. **All functions**
   - Standardize CORS headers
   - Add zod input validation
   - Standardize error responses
   - Add request timeouts
   - Improve logging

---

## New Shared Utilities to Create

Create `supabase/functions/_shared/` with:
- `cors.ts` - Standardized CORS headers
- `auth.ts` - JWT verification helper
- `validation.ts` - Common validation schemas
- `errors.ts` - Error response factory
- `logging.ts` - Structured logging

---

## Testing Recommendations

After implementing fixes:
1. Test webhook with invalid signatures (should reject)
2. Test admin endpoints with non-admin user (should 403)
3. Test document/verify endpoints without auth (should 401)
4. Load test admin-data with 100+ users to verify pagination
5. Test make-voice-call when Bolna is down (should handle gracefully)

