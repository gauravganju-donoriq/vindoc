import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Verify the user and get their email
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userEmail = claimsData.claims.email as string;
    const userId = claimsData.claims.sub as string;

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

    // Parse request body for type parameter
    let dataType = "overview";
    try {
      const body = await req.json();
      dataType = body?.type || "overview";
    } catch {
      // If no body or invalid JSON, use default
    }

    let responseData: Record<string, unknown> = {};

    switch (dataType) {
      case "overview": {
        // Get total users count
        const { count: usersCount } = await adminClient
          .from("user_roles")
          .select("*", { count: "exact", head: true });

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

        responseData = {
          totalUsers: uniqueUserIds.size,
          totalVehicles: vehiclesCount || 0,
          verifiedVehicles: verifiedCount || 0,
          totalDocuments: documentsCount || 0,
          expiringThisMonth: expiringCount,
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
        }> = [];

        for (const [userId, stats] of userMap) {
          const { data: userData } = await adminClient.auth.admin.getUserById(userId);
          users.push({
            userId,
            email: userData?.user?.email || "Unknown",
            vehicleCount: stats.vehicleCount,
            documentCount: stats.documentCount,
            joinDate: stats.firstVehicleDate,
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
