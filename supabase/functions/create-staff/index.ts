import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Client to verify the calling user (Owner)
    const clientSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await clientSupabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid user token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Verify caller is an active OWNER of their hall
    const { data: callerMember, error: memberError } = await clientSupabase
      .from("members")
      .select("hall_id, role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (memberError || !callerMember || callerMember.role !== "owner") {
      return new Response(JSON.stringify({ error: "Permission Denied: Only hall owners can manage staff" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    // 2B. Handle Password Reset for Staff
    if (body.action === "reset_password") {
      const { member_id, new_password } = body;
      if (!member_id || !new_password) {
        return new Response(JSON.stringify({ error: "member_id and new_password are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: targetMember, error: targetError } = await clientSupabase
        .from("members")
        .select("user_id, hall_id")
        .eq("id", member_id)
        .eq("hall_id", callerMember.hall_id)
        .single();

      if (targetError || !targetMember) {
        return new Response(JSON.stringify({ error: "Staff member not found in your hall" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: resetError } = await clientSupabase.auth.admin.updateUserById(targetMember.user_id, {
        password: new_password,
      });

      if (resetError) {
        return new Response(JSON.stringify({ error: resetError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true, message: "Staff password reset successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2C. Handle Permanent Deletion of Staff Member
    if (body.action === "delete_staff") {
      const { member_id } = body;
      if (!member_id) {
        return new Response(JSON.stringify({ error: "member_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 1. Fetch target member from caller's hall
      const { data: targetMember, error: targetError } = await clientSupabase
        .from("members")
        .select("id, user_id, hall_id, role, username")
        .eq("id", member_id)
        .eq("hall_id", callerMember.hall_id)
        .single();

      if (targetError || !targetMember) {
        return new Response(JSON.stringify({ error: "Staff member not found in your hall" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (targetMember.role === "owner") {
        return new Response(JSON.stringify({ error: "Security Violation: Hall owner accounts cannot be deleted" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Try hard-delete from members table
      const { error: deleteMemberError } = await clientSupabase
        .from("members")
        .delete()
        .eq("id", targetMember.id);

      if (deleteMemberError) {
        // If foreign key constraint blocks deletion (e.g. staff created historical bookings/receipts),
        // cleanly archive the row so historical financial audit trail remains intact, while freeing the username
        const archivedUsername = `${targetMember.username}_archived_${Date.now().toString().slice(-4)}`;
        const { error: archiveError } = await clientSupabase
          .from("members")
          .update({
            is_active: false,
            username: archivedUsername,
            updated_at: new Date().toISOString(),
          })
          .eq("id", targetMember.id);

        if (archiveError) {
          return new Response(JSON.stringify({ error: archiveError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // 3. Delete the Auth User from auth.users (revokes login and frees shadow email)
      if (targetMember.user_id) {
        await clientSupabase.auth.admin.deleteUser(targetMember.user_id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Staff member @${targetMember.username} deleted successfully`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { username, password, screen_access } = body;

    if (!username || !password) {
      return new Response(JSON.stringify({ error: "Username and password are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedUsername = username.toLowerCase().trim();
    const hallId = callerMember.hall_id;

    // Check if username is already taken by a member in this hall
    const { data: existingMember } = await clientSupabase
      .from("members")
      .select("id, is_active")
      .eq("hall_id", hallId)
      .eq("username", normalizedUsername)
      .maybeSingle();

    if (existingMember) {
      if (existingMember.is_active) {
        return new Response(
          JSON.stringify({
            error: `A staff member with username "${normalizedUsername}" already exists. Please choose a different username.`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({
            error: `Username "${normalizedUsername}" belonged to a deactivated staff member. Please choose another username.`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 3. Create auth user with deterministic shadow email (Issue 29)
    const shadowEmail = `${normalizedUsername}@${hallId}.aura.app`;
    let authUserId: string;

    const { data: newAuthUser, error: createAuthError } = await clientSupabase.auth.admin.createUser({
      email: shadowEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        username: normalizedUsername,
        hall_id: hallId,
      },
    });

    if (createAuthError) {
      const errMsg = createAuthError.message.toLowerCase();
      if (errMsg.includes("already been registered") || errMsg.includes("already registered")) {
        // Check if there is an orphan auth user
        const { data: usersData } = await clientSupabase.auth.admin.listUsers();
        const existingAuth = usersData?.users?.find(
          (u) => u.email?.toLowerCase() === shadowEmail.toLowerCase()
        );

        if (existingAuth) {
          // Check if this auth user is linked to an existing member in this hall
          const { data: linkedMember } = await clientSupabase
            .from("members")
            .select("id, is_active")
            .eq("user_id", existingAuth.id)
            .maybeSingle();

          if (linkedMember) {
            return new Response(
              JSON.stringify({
                error: `A staff member with username "${normalizedUsername}" already exists in your hall.`,
              }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          } else {
            // Orphan auth user: update password and reuse for the new member
            await clientSupabase.auth.admin.updateUserById(existingAuth.id, {
              password: password,
              user_metadata: {
                username: normalizedUsername,
                hall_id: hallId,
              },
            });
            authUserId = existingAuth.id;
          }
        } else {
          return new Response(
            JSON.stringify({
              error: `Username "${normalizedUsername}" is already registered. Please choose another username.`,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        return new Response(JSON.stringify({ error: createAuthError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      authUserId = newAuthUser.user.id;
    }

    // 4. Insert into members table (Trigger enforce_max_hall_members will check the 5-member limit)
    const { data: newMember, error: insertMemberError } = await clientSupabase
      .from("members")
      .insert({
        user_id: authUserId,
        hall_id: hallId,
        role: "staff",
        username: normalizedUsername,
        screen_access: screen_access || {
          calendar: true,
          search: true,
          khatabook: true,
          analytics: false,
          users: false,
          settings: false,
        },
      })
      .select("id, username, role, screen_access")
      .single();

    if (insertMemberError) {
      // Rollback auth user if member insert fails (e.g. 5-member limit reached)
      if (newAuthUser?.user?.id) {
        await clientSupabase.auth.admin.deleteUser(newAuthUser.user.id);
      }
      const isLimitError =
        insertMemberError.message.toLowerCase().includes("5 active members") ||
        insertMemberError.message.toLowerCase().includes("team limit");
      return new Response(
        JSON.stringify({
          error: isLimitError
            ? "Team limit reached: Maximum 5 active members allowed per hall."
            : insertMemberError.message,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Staff member created successfully",
        member: newMember,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
