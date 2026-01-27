import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

const ADMIN_EMAIL = "lestero@ignitecinc.com";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to verify identity
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user and get their email using getUser()
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userEmail = user.email;
    const userId = user.id;

    // Check if user is the admin
    if (userEmail !== ADMIN_EMAIL) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service role key to bypass RLS
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Ensure the admin has the super_admin role
    const { data: existingRole } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "super_admin")
      .single();

    if (!existingRole) {
      // Assign super_admin role to this user
      await adminClient.from("user_roles").insert({
        user_id: userId,
        role: "super_admin",
      });
      console.log(`Assigned super_admin role to ${userEmail}`);
    }

    // Parse request body
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // If no body or invalid JSON, use empty object
    }

    const dataType = (body?.type as string) || "overview";
    let responseData: Record<string, unknown> = {};

    switch (dataType) {
      case "overview": {
        // Get distinct users from auth (count users with vehicles)
        const { data: vehicleUsers } = await adminClient
          .from("vehicles")
          .select("user_id");
        
        const uniqueUserIds = new Set(vehicleUsers?.map(v => v.user_id) || []);

        // Get total vehicles
        const { count: vehiclesCount } = await adminClient
          .from("vehicles")
          .select("*", { count: "exact", head: true });

        // Get verified vehicles
        const { count: verifiedCount } = await adminClient
          .from("vehicles")
          .select("*", { count: "exact", head: true })
          .eq("is_verified", true);

        // Get total documents
        const { count: documentsCount } = await adminClient
          .from("documents")
          .select("*", { count: "exact", head: true });

        // Get documents expiring this month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

        const { data: expiringVehicles } = await adminClient
          .from("vehicles")
          .select("id, insurance_expiry, pucc_valid_upto, fitness_valid_upto, road_tax_valid_upto");

        let expiringCount = 0;
        expiringVehicles?.forEach(v => {
          const dates = [v.insurance_expiry, v.pucc_valid_upto, v.fitness_valid_upto, v.road_tax_valid_upto];
          dates.forEach(date => {
            if (date && date >= startOfMonth && date <= endOfMonth) {
              expiringCount++;
            }
          });
        });

        // Get suspended users count
        const { count: suspendedCount } = await adminClient
          .from("user_suspensions")
          .select("*", { count: "exact", head: true });

        responseData = {
          totalUsers: uniqueUserIds.size,
          totalVehicles: vehiclesCount || 0,
          verifiedVehicles: verifiedCount || 0,
          totalDocuments: documentsCount || 0,
          expiringThisMonth: expiringCount,
          suspendedUsers: suspendedCount || 0,
        };
        break;
      }

      case "users": {
        // Get all users with vehicle counts
        const { data: vehicles } = await adminClient
          .from("vehicles")
          .select("user_id, id, created_at");

        const { data: documents } = await adminClient
          .from("documents")
          .select("user_id");

        // Get suspended users
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

        // Get user emails from auth.users via admin API
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

        for (const [uId, stats] of userMap) {
          const { data: userData } = await adminClient.auth.admin.getUserById(uId);
          const suspension = suspensionMap.get(uId);
          users.push({
            userId: uId,
            email: userData?.user?.email || "Unknown",
            vehicleCount: stats.vehicleCount,
            documentCount: stats.documentCount,
            joinDate: stats.firstVehicleDate,
            isSuspended: !!suspension,
            suspendedAt: suspension?.suspended_at || null,
            suspensionReason: suspension?.reason || null,
          });
        }

        responseData = { users };
        break;
      }

      case "activity": {
        // Get recent activity from vehicle_history
        const { data: activity } = await adminClient
          .from("vehicle_history")
          .select(`
            id,
            event_type,
            event_description,
            created_at,
            user_id,
            vehicle_id,
            metadata
          `)
          .order("created_at", { ascending: false })
          .limit(100);

        // Enrich with user emails and vehicle reg numbers
        const enrichedActivity = await Promise.all(
          (activity || []).map(async (a) => {
            const { data: userData } = await adminClient.auth.admin.getUserById(a.user_id);
            const { data: vehicleData } = await adminClient
              .from("vehicles")
              .select("registration_number")
              .eq("id", a.vehicle_id)
              .single();

            return {
              ...a,
              userEmail: userData?.user?.email || "Unknown",
              registrationNumber: vehicleData?.registration_number || "Deleted",
            };
          })
        );

        responseData = { activity: enrichedActivity };
        break;
      }

      case "vehicles": {
        // Get all vehicles with user emails
        const { data: vehicles } = await adminClient
          .from("vehicles")
          .select("*")
          .order("created_at", { ascending: false });

        const enrichedVehicles = await Promise.all(
          (vehicles || []).map(async (v) => {
            const { data: userData } = await adminClient.auth.admin.getUserById(v.user_id);
            return {
              ...v,
              userEmail: userData?.user?.email || "Unknown",
            };
          })
        );

        responseData = { vehicles: enrichedVehicles };
        break;
      }

      case "transfers": {
        // Get all transfers
        const { data: transfers } = await adminClient
          .from("vehicle_transfers")
          .select("*")
          .order("created_at", { ascending: false });

        const enrichedTransfers = await Promise.all(
          (transfers || []).map(async (t) => {
            const { data: senderData } = await adminClient.auth.admin.getUserById(t.sender_id);
            const { data: vehicleData } = await adminClient
              .from("vehicles")
              .select("registration_number, maker_model")
              .eq("id", t.vehicle_id)
              .single();

            return {
              ...t,
              senderEmail: senderData?.user?.email || "Unknown",
              registrationNumber: vehicleData?.registration_number || "Deleted",
              makerModel: vehicleData?.maker_model || null,
            };
          })
        );

        responseData = { transfers: enrichedTransfers };
        break;
      }

      // Admin actions
      case "suspend_user": {
        const targetUserId = body?.userId as string;
        const reason = (body?.reason as string) || null;

        if (!targetUserId) {
          return new Response(
            JSON.stringify({ error: "userId is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check if already suspended
        const { data: existing } = await adminClient
          .from("user_suspensions")
          .select("id")
          .eq("user_id", targetUserId)
          .single();

        if (existing) {
          return new Response(
            JSON.stringify({ error: "User is already suspended" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: suspendError } = await adminClient
          .from("user_suspensions")
          .insert({
            user_id: targetUserId,
            suspended_by: userId,
            reason,
          });

        if (suspendError) {
          console.error("Suspend error:", suspendError);
          return new Response(
            JSON.stringify({ error: "Failed to suspend user" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        responseData = { success: true, message: "User suspended" };
        break;
      }

      case "unsuspend_user": {
        const targetUserId = body?.userId as string;

        if (!targetUserId) {
          return new Response(
            JSON.stringify({ error: "userId is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: unsuspendError } = await adminClient
          .from("user_suspensions")
          .delete()
          .eq("user_id", targetUserId);

        if (unsuspendError) {
          console.error("Unsuspend error:", unsuspendError);
          return new Response(
            JSON.stringify({ error: "Failed to unsuspend user" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        responseData = { success: true, message: "User unsuspended" };
        break;
      }

      case "set_vehicle_verification": {
        const vehicleId = body?.vehicleId as string;
        const isVerified = body?.isVerified as boolean;

        if (!vehicleId || typeof isVerified !== "boolean") {
          return new Response(
            JSON.stringify({ error: "vehicleId and isVerified are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: updateError } = await adminClient
          .from("vehicles")
          .update({
            is_verified: isVerified,
            verified_at: isVerified ? new Date().toISOString() : null,
          })
          .eq("id", vehicleId);

        if (updateError) {
          console.error("Verification update error:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to update verification status" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Log to vehicle history
        const { data: vehicle } = await adminClient
          .from("vehicles")
          .select("user_id, registration_number")
          .eq("id", vehicleId)
          .single();

        if (vehicle) {
          await adminClient.from("vehicle_history").insert({
            vehicle_id: vehicleId,
            user_id: vehicle.user_id,
            event_type: isVerified ? "ADMIN_VERIFIED" : "ADMIN_UNVERIFIED",
            event_description: `Vehicle ${isVerified ? "verified" : "unverified"} by admin`,
            metadata: { admin_email: userEmail },
          });
        }

        responseData = { success: true, message: `Vehicle ${isVerified ? "verified" : "unverified"}` };
        break;
      }

      case "get_vehicle_for_claim": {
        const regNumber = body?.registrationNumber as string;

        if (!regNumber) {
          return new Response(
            JSON.stringify({ error: "registrationNumber is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: vehicleData, error: vehicleError } = await adminClient
          .from("vehicles")
          .select("id, user_id, registration_number, maker_model")
          .eq("registration_number", regNumber.toUpperCase())
          .maybeSingle();

        if (vehicleError) {
          console.error("Vehicle lookup error:", vehicleError);
          return new Response(
            JSON.stringify({ found: false, error: "Lookup failed" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

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
        // Get all ownership claims
        const { data: claimsData } = await adminClient
          .from("ownership_claims")
          .select("*")
          .order("created_at", { ascending: false });

        const enrichedClaims = await Promise.all(
          (claimsData || []).map(async (c) => {
            const { data: claimantData } = await adminClient.auth.admin.getUserById(c.claimant_id);
            const { data: ownerData } = await adminClient.auth.admin.getUserById(c.current_owner_id);
            const { data: vehicleData } = await adminClient
              .from("vehicles")
              .select("maker_model")
              .eq("id", c.vehicle_id)
              .maybeSingle();

            return {
              ...c,
              claimantEmail: claimantData?.user?.email || c.claimant_email,
              ownerEmail: ownerData?.user?.email || "Unknown",
              makerModel: vehicleData?.maker_model || null,
            };
          })
        );

        responseData = { claims: enrichedClaims };
        break;
      }

      case "update_claim_status": {
        const claimId = body?.claimId as string;
        const newStatus = body?.status as string;

        if (!claimId || !newStatus) {
          return new Response(
            JSON.stringify({ error: "claimId and status are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!["resolved", "rejected", "expired"].includes(newStatus)) {
          return new Response(
            JSON.stringify({ error: "Invalid status value" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: updateError } = await adminClient
          .from("ownership_claims")
          .update({ status: newStatus })
          .eq("id", claimId);

        if (updateError) {
          console.error("Claim update error:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to update claim status" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        responseData = { success: true, message: `Claim marked as ${newStatus}` };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid type parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Admin data error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});