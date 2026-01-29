import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Standardized CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Valid action types whitelist
const VALID_ACTION_TYPES = [
  "overview", "users", "activity", "vehicles", "transfers", "claims", "listings",
  "suspend_user", "unsuspend_user", "set_vehicle_verification", "get_vehicle_for_claim",
  "update_claim_status", "update_listing_status"
] as const;

// Input validation schemas
const ActionTypeSchema = z.enum(VALID_ACTION_TYPES);

const SuspendUserSchema = z.object({
  type: z.literal("suspend_user"),
  userId: z.string().uuid("Invalid user ID format"),
  reason: z.string().max(500).optional().nullable(),
});

const UnsuspendUserSchema = z.object({
  type: z.literal("unsuspend_user"),
  userId: z.string().uuid("Invalid user ID format"),
});

const SetVerificationSchema = z.object({
  type: z.literal("set_vehicle_verification"),
  vehicleId: z.string().uuid("Invalid vehicle ID format"),
  isVerified: z.boolean(),
});

const GetVehicleForClaimSchema = z.object({
  type: z.literal("get_vehicle_for_claim"),
  registrationNumber: z.string().min(1).max(20).transform(s => s.trim().toUpperCase()),
});

const UpdateClaimStatusSchema = z.object({
  type: z.literal("update_claim_status"),
  claimId: z.string().uuid("Invalid claim ID format"),
  status: z.enum(["resolved", "rejected", "expired"]),
});

const UpdateListingStatusSchema = z.object({
  type: z.literal("update_listing_status"),
  listingId: z.string().uuid("Invalid listing ID format"),
  status: z.enum(["approved", "rejected", "on_hold"]),
  adminNotes: z.string().max(1000).optional().nullable(),
});

// Standardized error response
function errorResponse(message: string, status: number, errorCode: string, details?: object) {
  return new Response(
    JSON.stringify({ success: false, error: message, errorCode, details }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Success response helper
function successResponse(data: Record<string, unknown>) {
  return new Response(
    JSON.stringify({ success: true, ...data }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Pagination defaults
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============= PHASE 1: AUTHENTICATION =============
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log(`[${requestId}] Missing or invalid auth header`);
      return errorResponse("Unauthorized", 401, "AUTH_MISSING");
    }

    // Validate environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error(`[${requestId}] Missing required environment variables`);
      return errorResponse("Server configuration error", 500, "CONFIG_ERROR");
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user using getClaims for efficiency
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.log(`[${requestId}] Invalid token:`, claimsError?.message);
      return errorResponse("Invalid token", 401, "AUTH_INVALID");
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;

    // ============= PHASE 2: AUTHORIZATION (Role-based) =============
    // Create admin client with service role key to check role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user has super_admin role using has_role function
    const { data: hasAdminRole, error: roleError } = await adminClient.rpc("has_role", {
      _user_id: userId,
      _role: "super_admin",
    });

    if (roleError) {
      console.error(`[${requestId}] Role check error:`, roleError);
      return errorResponse("Authorization check failed", 500, "ROLE_CHECK_FAILED");
    }

    if (!hasAdminRole) {
      console.log(`[${requestId}] Access denied for user ${userEmail} - no super_admin role`);
      return errorResponse("Forbidden - Admin access required", 403, "FORBIDDEN");
    }

    console.log(`[${requestId}] Admin access granted for ${userEmail}`);

    // ============= PHASE 3: PARSE AND VALIDATE REQUEST =============
    let body: Record<string, unknown> = {};
    try {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      return errorResponse("Invalid JSON body", 400, "INVALID_JSON");
    }

    const dataType = body?.type as string || "overview";
    
    // Validate action type is in whitelist
    const actionResult = ActionTypeSchema.safeParse(dataType);
    if (!actionResult.success) {
      return errorResponse(`Invalid action type: ${dataType}`, 400, "INVALID_ACTION");
    }

    // Pagination parameters
    const page = Math.max(1, Number(body?.page) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(body?.pageSize) || DEFAULT_PAGE_SIZE));
    const offset = (page - 1) * pageSize;

    let responseData: Record<string, unknown> = {};

    // ============= PHASE 4: EXECUTE ACTION =============
    switch (dataType) {
      case "overview": {
        // Optimized: Use parallel queries and counts
        const [vehicleUsersResult, vehiclesCountResult, verifiedCountResult, documentsCountResult, suspendedCountResult, expiringResult] = await Promise.all([
          adminClient.from("vehicles").select("user_id"),
          adminClient.from("vehicles").select("*", { count: "exact", head: true }),
          adminClient.from("vehicles").select("*", { count: "exact", head: true }).eq("is_verified", true),
          adminClient.from("documents").select("*", { count: "exact", head: true }),
          adminClient.from("user_suspensions").select("*", { count: "exact", head: true }),
          adminClient.from("vehicles").select("id, insurance_expiry, pucc_valid_upto, fitness_valid_upto, road_tax_valid_upto"),
        ]);

        const uniqueUserIds = new Set(vehicleUsersResult.data?.map(v => v.user_id) || []);

        // Count expiring documents this month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

        let expiringCount = 0;
        expiringResult.data?.forEach(v => {
          const dates = [v.insurance_expiry, v.pucc_valid_upto, v.fitness_valid_upto, v.road_tax_valid_upto];
          dates.forEach(date => {
            if (date && date >= startOfMonth && date <= endOfMonth) {
              expiringCount++;
            }
          });
        });

        responseData = {
          totalUsers: uniqueUserIds.size,
          totalVehicles: vehiclesCountResult.count || 0,
          verifiedVehicles: verifiedCountResult.count || 0,
          totalDocuments: documentsCountResult.count || 0,
          expiringThisMonth: expiringCount,
          suspendedUsers: suspendedCountResult.count || 0,
        };
        break;
      }

      case "users": {
        // Optimized: Fetch paginated data with batch user lookups
        const { data: vehicles } = await adminClient
          .from("vehicles")
          .select("user_id, id, created_at");

        const { data: documents } = await adminClient
          .from("documents")
          .select("user_id");

        const { data: suspensions } = await adminClient
          .from("user_suspensions")
          .select("user_id, suspended_at, reason");

        const suspensionMap = new Map(suspensions?.map(s => [s.user_id, s]) || []);

        // Group by user_id
        const userMap = new Map<string, { vehicleCount: number; documentCount: number; firstVehicleDate: string | null }>();

        vehicles?.forEach(v => {
          const existing = userMap.get(v.user_id) || { vehicleCount: 0, documentCount: 0, firstVehicleDate: null };
          existing.vehicleCount++;
          if (!existing.firstVehicleDate || v.created_at < existing.firstVehicleDate) {
            existing.firstVehicleDate = v.created_at;
          }
          userMap.set(v.user_id, existing);
        });

        documents?.forEach(d => {
          const existing = userMap.get(d.user_id);
          if (existing) {
            existing.documentCount++;
          }
        });

        // Get user list and apply pagination
        const allUserIds = Array.from(userMap.keys());
        const totalCount = allUserIds.length;
        const paginatedUserIds = allUserIds.slice(offset, offset + pageSize);

        // Batch lookup users (parallel, limited batch size)
        const BATCH_SIZE = 10;
        const users: Array<{
          userId: string;
          email: string;
          vehicleCount: number;
          documentCount: number;
          joinDate: string | null;
          isSuspended: boolean;
          suspendedAt: string | null;
          suspensionReason: string | null;
        }> = [];

        for (let i = 0; i < paginatedUserIds.length; i += BATCH_SIZE) {
          const batch = paginatedUserIds.slice(i, i + BATCH_SIZE);
          const userPromises = batch.map(async (uId) => {
            const { data: userData } = await adminClient.auth.admin.getUserById(uId);
            const stats = userMap.get(uId)!;
            const suspension = suspensionMap.get(uId);
            return {
              userId: uId,
              email: userData?.user?.email || "Unknown",
              vehicleCount: stats.vehicleCount,
              documentCount: stats.documentCount,
              joinDate: stats.firstVehicleDate,
              isSuspended: !!suspension,
              suspendedAt: suspension?.suspended_at || null,
              suspensionReason: suspension?.reason || null,
            };
          });
          const batchResults = await Promise.all(userPromises);
          users.push(...batchResults);
        }

        responseData = { 
          users, 
          pagination: { page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) }
        };
        break;
      }

      case "activity": {
        // Paginated activity with batch enrichment
        const { data: activity, count } = await adminClient
          .from("vehicle_history")
          .select("id, event_type, event_description, created_at, user_id, vehicle_id, metadata", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(offset, offset + pageSize - 1);

        // Batch enrich with user emails and vehicle numbers
        const enrichedActivity = await Promise.all(
          (activity || []).map(async (a) => {
            const [userResult, vehicleResult] = await Promise.all([
              adminClient.auth.admin.getUserById(a.user_id),
              adminClient.from("vehicles").select("registration_number").eq("id", a.vehicle_id).maybeSingle(),
            ]);
            return {
              ...a,
              userEmail: userResult.data?.user?.email || "Unknown",
              registrationNumber: vehicleResult.data?.registration_number || "Deleted",
            };
          })
        );

        responseData = { 
          activity: enrichedActivity,
          pagination: { page, pageSize, totalCount: count || 0, totalPages: Math.ceil((count || 0) / pageSize) }
        };
        break;
      }

      case "vehicles": {
        // Paginated vehicles
        const { data: vehicles, count } = await adminClient
          .from("vehicles")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(offset, offset + pageSize - 1);

        const BATCH_SIZE = 10;
        const enrichedVehicles: Array<Record<string, unknown>> = [];

        for (let i = 0; i < (vehicles?.length || 0); i += BATCH_SIZE) {
          const batch = (vehicles || []).slice(i, i + BATCH_SIZE);
          const batchPromises = batch.map(async (v) => {
            const { data: userData } = await adminClient.auth.admin.getUserById(v.user_id);
            return { ...v, userEmail: userData?.user?.email || "Unknown" };
          });
          const batchResults = await Promise.all(batchPromises);
          enrichedVehicles.push(...batchResults);
        }

        responseData = { 
          vehicles: enrichedVehicles,
          pagination: { page, pageSize, totalCount: count || 0, totalPages: Math.ceil((count || 0) / pageSize) }
        };
        break;
      }

      case "transfers": {
        const { data: transfers, count } = await adminClient
          .from("vehicle_transfers")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(offset, offset + pageSize - 1);

        const enrichedTransfers = await Promise.all(
          (transfers || []).map(async (t) => {
            const [senderResult, vehicleResult] = await Promise.all([
              adminClient.auth.admin.getUserById(t.sender_id),
              adminClient.from("vehicles").select("registration_number, maker_model").eq("id", t.vehicle_id).maybeSingle(),
            ]);
            return {
              ...t,
              senderEmail: senderResult.data?.user?.email || "Unknown",
              registrationNumber: vehicleResult.data?.registration_number || "Deleted",
              makerModel: vehicleResult.data?.maker_model || null,
            };
          })
        );

        responseData = { 
          transfers: enrichedTransfers,
          pagination: { page, pageSize, totalCount: count || 0, totalPages: Math.ceil((count || 0) / pageSize) }
        };
        break;
      }

      case "suspend_user": {
        const validation = SuspendUserSchema.safeParse(body);
        if (!validation.success) {
          return errorResponse(validation.error.errors[0]?.message || "Invalid input", 400, "VALIDATION_ERROR");
        }

        const { userId: targetUserId, reason } = validation.data;

        // Prevent self-suspension
        if (targetUserId === userId) {
          return errorResponse("Cannot suspend yourself", 400, "SELF_SUSPENSION");
        }

        const { data: existing } = await adminClient
          .from("user_suspensions")
          .select("id")
          .eq("user_id", targetUserId)
          .maybeSingle();

        if (existing) {
          return errorResponse("User is already suspended", 400, "ALREADY_SUSPENDED");
        }

        const { error: suspendError } = await adminClient
          .from("user_suspensions")
          .insert({ user_id: targetUserId, suspended_by: userId, reason });

        if (suspendError) {
          console.error(`[${requestId}] Suspend error:`, suspendError);
          return errorResponse("Failed to suspend user", 500, "SUSPEND_FAILED");
        }

        responseData = { message: "User suspended" };
        break;
      }

      case "unsuspend_user": {
        const validation = UnsuspendUserSchema.safeParse(body);
        if (!validation.success) {
          return errorResponse(validation.error.errors[0]?.message || "Invalid input", 400, "VALIDATION_ERROR");
        }

        const { error: unsuspendError } = await adminClient
          .from("user_suspensions")
          .delete()
          .eq("user_id", validation.data.userId);

        if (unsuspendError) {
          console.error(`[${requestId}] Unsuspend error:`, unsuspendError);
          return errorResponse("Failed to unsuspend user", 500, "UNSUSPEND_FAILED");
        }

        responseData = { message: "User unsuspended" };
        break;
      }

      case "set_vehicle_verification": {
        const validation = SetVerificationSchema.safeParse(body);
        if (!validation.success) {
          return errorResponse(validation.error.errors[0]?.message || "Invalid input", 400, "VALIDATION_ERROR");
        }

        const { vehicleId, isVerified } = validation.data;

        const { error: updateError } = await adminClient
          .from("vehicles")
          .update({
            is_verified: isVerified,
            verified_at: isVerified ? new Date().toISOString() : null,
          })
          .eq("id", vehicleId);

        if (updateError) {
          console.error(`[${requestId}] Verification update error:`, updateError);
          return errorResponse("Failed to update verification status", 500, "UPDATE_FAILED");
        }

        // Log to vehicle history
        const { data: vehicle } = await adminClient
          .from("vehicles")
          .select("user_id, registration_number")
          .eq("id", vehicleId)
          .maybeSingle();

        if (vehicle) {
          await adminClient.from("vehicle_history").insert({
            vehicle_id: vehicleId,
            user_id: vehicle.user_id,
            event_type: isVerified ? "ADMIN_VERIFIED" : "ADMIN_UNVERIFIED",
            event_description: `Vehicle ${isVerified ? "verified" : "unverified"} by admin`,
            metadata: { admin_email: userEmail },
          });
        }

        responseData = { message: `Vehicle ${isVerified ? "verified" : "unverified"}` };
        break;
      }

      case "get_vehicle_for_claim": {
        const validation = GetVehicleForClaimSchema.safeParse(body);
        if (!validation.success) {
          return errorResponse(validation.error.errors[0]?.message || "Invalid input", 400, "VALIDATION_ERROR");
        }

        const { data: vehicleData } = await adminClient
          .from("vehicles")
          .select("id, user_id, registration_number, maker_model")
          .eq("registration_number", validation.data.registrationNumber)
          .maybeSingle();

        if (!vehicleData) {
          responseData = { found: false };
        } else {
          responseData = {
            found: true,
            vehicleId: vehicleData.id,
            ownerId: vehicleData.user_id,
            makerModel: vehicleData.maker_model,
          };
        }
        break;
      }

      case "claims": {
        const { data: claimsData, count } = await adminClient
          .from("ownership_claims")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(offset, offset + pageSize - 1);

        const enrichedClaims = await Promise.all(
          (claimsData || []).map(async (c) => {
            const [claimantResult, ownerResult, vehicleResult] = await Promise.all([
              adminClient.auth.admin.getUserById(c.claimant_id),
              adminClient.auth.admin.getUserById(c.current_owner_id),
              adminClient.from("vehicles").select("maker_model").eq("id", c.vehicle_id).maybeSingle(),
            ]);
            return {
              ...c,
              claimantEmail: claimantResult.data?.user?.email || c.claimant_email,
              ownerEmail: ownerResult.data?.user?.email || "Unknown",
              makerModel: vehicleResult.data?.maker_model || null,
            };
          })
        );

        responseData = { 
          claims: enrichedClaims,
          pagination: { page, pageSize, totalCount: count || 0, totalPages: Math.ceil((count || 0) / pageSize) }
        };
        break;
      }

      case "update_claim_status": {
        const validation = UpdateClaimStatusSchema.safeParse(body);
        if (!validation.success) {
          return errorResponse(validation.error.errors[0]?.message || "Invalid input", 400, "VALIDATION_ERROR");
        }

        const { error: updateError } = await adminClient
          .from("ownership_claims")
          .update({ status: validation.data.status })
          .eq("id", validation.data.claimId);

        if (updateError) {
          console.error(`[${requestId}] Claim update error:`, updateError);
          return errorResponse("Failed to update claim status", 500, "UPDATE_FAILED");
        }

        responseData = { message: `Claim marked as ${validation.data.status}` };
        break;
      }

      case "listings": {
        const { data: listingsData, count } = await adminClient
          .from("vehicle_listings")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(offset, offset + pageSize - 1);

        const enrichedListings = await Promise.all(
          (listingsData || []).map(async (l: Record<string, unknown>) => {
            const [userResult, vehicleResult] = await Promise.all([
              adminClient.auth.admin.getUserById(l.user_id as string),
              adminClient.from("vehicles").select("registration_number, maker_model, manufacturer").eq("id", l.vehicle_id as string).maybeSingle(),
            ]);
            return {
              ...l,
              userEmail: userResult.data?.user?.email || "Unknown",
              registrationNumber: vehicleResult.data?.registration_number || "Deleted",
              makerModel: vehicleResult.data?.maker_model || null,
              manufacturer: vehicleResult.data?.manufacturer || null,
            };
          })
        );

        responseData = { 
          listings: enrichedListings,
          pagination: { page, pageSize, totalCount: count || 0, totalPages: Math.ceil((count || 0) / pageSize) }
        };
        break;
      }

      case "update_listing_status": {
        const validation = UpdateListingStatusSchema.safeParse(body);
        if (!validation.success) {
          return errorResponse(validation.error.errors[0]?.message || "Invalid input", 400, "VALIDATION_ERROR");
        }

        const { listingId, status: newStatus, adminNotes } = validation.data;

        const { data: listingData } = await adminClient
          .from("vehicle_listings")
          .select("vehicle_id, user_id, expected_price")
          .eq("id", listingId)
          .maybeSingle();

        if (!listingData) {
          return errorResponse("Listing not found", 404, "NOT_FOUND");
        }

        const { error: updateError } = await adminClient
          .from("vehicle_listings")
          .update({
            status: newStatus,
            admin_notes: adminNotes,
            reviewed_by: userId,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", listingId);

        if (updateError) {
          console.error(`[${requestId}] Listing update error:`, updateError);
          return errorResponse("Failed to update listing status", 500, "UPDATE_FAILED");
        }

        // Log to vehicle history
        const eventType = newStatus === "approved" ? "listing_approved" :
                          newStatus === "rejected" ? "listing_rejected" : "listing_on_hold";
        
        await adminClient.from("vehicle_history").insert({
          vehicle_id: listingData.vehicle_id,
          user_id: listingData.user_id,
          event_type: eventType,
          event_description: `Listing ${newStatus} by admin`,
          metadata: { admin_email: userEmail, admin_notes: adminNotes, expected_price: listingData.expected_price },
        });

        responseData = { message: `Listing marked as ${newStatus}` };
        break;
      }

      default:
        return errorResponse(`Unknown action type: ${dataType}`, 400, "UNKNOWN_ACTION");
    }

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] ${dataType} completed in ${duration}ms for ${userEmail}`);
    
    return successResponse(responseData);
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] Admin data error after ${duration}ms:`, error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500, "INTERNAL_ERROR");
  }
});
