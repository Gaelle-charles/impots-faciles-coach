import { createClient } from "supabase";
import { sendDeletionConfirmationEmail } from "../_shared/deletion-email.ts";

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error("[admin-users] missing env", {
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasServiceRoleKey: Boolean(serviceRoleKey),
        hasAnonKey: Boolean(anonKey),
      });

      return new Response(JSON.stringify({ error: "Configuration serveur incomplète" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Always use the production custom domain for email links.
    // Lovable preview hosts (*.lovable.app) trigger an auth-bridge that
    // requires logging in to lovable.dev — which breaks emails for end users.
    // We therefore ignore any siteUrl provided by the caller.
    const siteUrl = "https://impotsfacile.com";

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

      case "list_users_meta": {
        // Returns auth metadata (email_confirmed_at, last_sign_in_at) for all users
        // Paginates through Supabase Admin API
        const all: Array<{ id: string; email_confirmed_at: string | null; last_sign_in_at: string | null }> = [];
        let page = 1;
        const perPage = 1000;
        while (true) {
          const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
          if (error) {
            console.error("[list_users_meta] error:", error);
            return new Response(JSON.stringify({ error: error.message }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          for (const u of data.users) {
            all.push({
              id: u.id,
              email_confirmed_at: u.email_confirmed_at ?? null,
              last_sign_in_at: u.last_sign_in_at ?? null,
            });
          }
          if (data.users.length < perPage) break;
          page++;
          if (page > 20) break; // safety
        }
        return new Response(JSON.stringify({ users: all }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_user": {
        // SOFT-DELETE
        const { userId } = body;

        if (!userId) {
          return new Response(JSON.stringify({ error: "userId manquant" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (userId === caller.id) {
          return new Response(JSON.stringify({ error: "Vous ne pouvez pas supprimer votre propre compte ici" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // 1. Récupérer profil pour info Stripe + organization
        const { data: profile } = await adminClient
          .from("profiles")
          .select("id, email, prenom, stripe_subscription_id, organization_id")
          .eq("id", userId)
          .maybeSingle();

        if (!profile) {
          return new Response(JSON.stringify({ error: "Profil introuvable" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // 2. Annulation Stripe (cancel_at_period_end) si abonnement actif
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        let stripeResult: { ok: boolean; error?: string; subId?: string } = { ok: true };
        if (profile.stripe_subscription_id && stripeKey) {
          try {
            const params = new URLSearchParams();
            params.set("cancel_at_period_end", "true");
            const r = await fetch(
              `https://api.stripe.com/v1/subscriptions/${profile.stripe_subscription_id}`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${stripeKey}`,
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: params.toString(),
              }
            );
            if (!r.ok) {
              const errBody = await r.text();
              console.error("[soft_delete] stripe cancel failed:", errBody);
              stripeResult = { ok: false, error: errBody };
            } else {
              stripeResult = { ok: true, subId: profile.stripe_subscription_id };
            }
          } catch (e) {
            console.error("[soft_delete] stripe error:", e);
            stripeResult = { ok: false, error: String(e) };
          }
        }

        // 3. Désactivation des sessions Auth (ban "permanent" 100 ans)
        const { error: banError } = await adminClient.auth.admin.updateUserById(userId, {
          ban_duration: "876000h",
        });
        if (banError) {
          console.error("[soft_delete] ban failed:", banError);
          return new Response(JSON.stringify({ error: `Ban auth: ${banError.message}` }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // 4. Marquer deleted_at sur profile + désactiver
        const { error: profileError } = await adminClient
          .from("profiles")
          .update({ deleted_at: new Date().toISOString(), is_active: false } as any)
          .eq("id", userId);
        if (profileError) {
          console.error("[soft_delete] update profile failed:", profileError);
          return new Response(JSON.stringify({ error: `Profil: ${profileError.message}` }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // 5. Si membre d'organisation : libérer la licence
        await adminClient
          .from("organization_members")
          .update({ removed_at: new Date().toISOString() } as any)
          .eq("user_id", userId)
          .is("removed_at", null);

        console.log(`[soft_delete] user ${userId} marqué supprimé. Stripe:`, stripeResult);

        return new Response(JSON.stringify({ success: true, stripe: stripeResult }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "restore_user": {
        const { userId } = body;
        if (!userId) {
          return new Response(JSON.stringify({ error: "userId manquant" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Lever le ban
        const { error: unbanError } = await adminClient.auth.admin.updateUserById(userId, {
          ban_duration: "none",
        });
        if (unbanError) {
          console.error("[restore_user] unban failed:", unbanError);
          return new Response(JSON.stringify({ error: `Unban: ${unbanError.message}` }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Effacer deleted_at + réactiver. On remet plan='nouveau' (pas de résurrection abonnement).
        const { error: profErr } = await adminClient
          .from("profiles")
          .update({ deleted_at: null, is_active: true, plan: "nouveau" } as any)
          .eq("id", userId);
        if (profErr) {
          console.error("[restore_user] profile update failed:", profErr);
          return new Response(JSON.stringify({ error: `Profil: ${profErr.message}` }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "reset_password": {
        const { email } = body;
        // Always go through /auth/callback on the production domain so the
        // recovery session is set up correctly before showing the reset form.
        const { error } = await adminClient.auth.resetPasswordForEmail(email, {
          redirectTo: `${siteUrl}/auth/callback`,
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
