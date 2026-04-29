import { createClient } from "supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    // Client with user's token to verify admin role
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await userClient.from("profiles").select("role").eq("id", caller.id).single();
    if (profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client with service role
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const { action } = body;

    // Determine the app URL for redirects — must be passed by the client
    const origin = req.headers.get("origin") || req.headers.get("referer") || "";
    const siteUrl = body.siteUrl || (origin ? new URL(origin).origin : "https://impots-faciles-coach.lovable.app");

    switch (action) {
      case "create_user": {
        const { email, password, prenom, nom, plan, role, sendActivationEmail } = body;

        // Create auth user
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (createError) {
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update profile (trigger should have created it)
        await adminClient.from("profiles").update({
          prenom,
          nom,
          plan: plan || "nouveau",
          role: role || "client",
        }).eq("id", newUser.user.id);

        // If admin role, send password reset email pointing to /admin/login
        if (role === "admin" && sendActivationEmail !== false) {
          await adminClient.auth.resetPasswordForEmail(email, {
            redirectTo: `${siteUrl}/admin/login`,
          });
        }

        return new Response(JSON.stringify({ success: true, userId: newUser.user.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_user": {
        const { userId } = body;

        if (!userId) {
          return new Response(JSON.stringify({ error: "userId manquant" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Prevent admins from deleting themselves
        if (userId === caller.id) {
          return new Response(JSON.stringify({ error: "Vous ne pouvez pas supprimer votre propre compte ici" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Best-effort cleanup of tables that may not cascade properly
        const cleanup = await Promise.allSettled([
          adminClient.from("resultat_quiz").delete().eq("user_id", userId),
          adminClient.from("progressions").delete().eq("user_id", userId),
          adminClient.from("simulations").delete().eq("user_id", userId),
        ]);
        cleanup.forEach((r, i) => {
          if (r.status === "rejected") console.error(`[delete_user] cleanup[${i}] rejected:`, r.reason);
          else if (r.value.error) console.error(`[delete_user] cleanup[${i}] error:`, r.value.error);
        });

        // Delete auth user — CASCADE on profiles_id_fkey removes the profile and dependent rows
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
        if (deleteError) {
          console.error("[delete_user] auth.admin.deleteUser failed:", deleteError);
          return new Response(JSON.stringify({ error: deleteError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "reset_password": {
        const { email, redirectTo } = body;
        const { error } = await adminClient.auth.resetPasswordForEmail(email, {
          redirectTo: redirectTo || `${siteUrl}/reset-password`,
        });
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Action inconnue" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    console.error("[admin-users] uncaught error:", err);
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
