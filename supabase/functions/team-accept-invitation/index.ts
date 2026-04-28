import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { token, password, prenom, nom } = await req.json().catch(() => ({}));
    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ error: "Token requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!password || String(password).length < 8) {
      return new Response(JSON.stringify({ error: "Mot de passe trop court (min 8)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!prenom || !nom) {
      return new Response(JSON.stringify({ error: "Prénom et nom requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Récupérer l'invitation
    const { data: inv, error: invErr } = await admin
      .from("organization_invitations")
      .select("id, email, organization_id, status, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (invErr || !inv) {
      return new Response(JSON.stringify({ error: "Invitation introuvable" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (inv.status !== "pending") {
      return new Response(JSON.stringify({ error: `Invitation ${inv.status}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Invitation expirée" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = String(inv.email).trim().toLowerCase();

    // Vérifier si le compte existe déjà
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (existingProfile?.id) {
      return new Response(
        JSON.stringify({ error: "Un compte existe déjà pour cet email. Utilisez 'J'ai déjà un compte'." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Créer l'utilisateur côté serveur (pas de rate limit, pas d'email de confirmation)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: String(password),
      email_confirm: true,
      user_metadata: {
        prenom: String(prenom).trim(),
        nom: String(nom).trim(),
      },
    });

    if (createErr || !created.user) {
      console.error("[team-accept-invitation] createUser error:", createErr);
      return new Response(
        JSON.stringify({ error: createErr?.message ?? "Création du compte impossible" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ success: true, email }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("team-accept-invitation error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
