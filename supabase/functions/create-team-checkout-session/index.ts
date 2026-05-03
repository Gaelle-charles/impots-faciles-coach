import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import Stripe from "npm:stripe@17.5.0";

const TEAM_PRICE_IDS: Record<string, string | undefined> = {
  premium: Deno.env.get("STRIPE_PRICE_ID_TEAM_PREMIUM"),
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json().catch(() => ({}));
    const {
      raison_sociale,
      siret,
      adresse,
      tva_intra,
      plan,
      nb_licences,
      admin_email,
      admin_password,
      admin_prenom,
      admin_nom,
      cgv_accepted_at,
      cgu_accepted_at,
    } = body ?? {};

    if (!cgv_accepted_at || !cgu_accepted_at) {
      return new Response(
        JSON.stringify({ error: "Acceptation des CGV et CGU requise" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Validations ---
    if (!raison_sociale || typeof raison_sociale !== "string" || raison_sociale.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Raison sociale invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!siret || !/^\d{14}$/.test(String(siret).replace(/\s/g, ""))) {
      return new Response(JSON.stringify({ error: "SIRET invalide (14 chiffres requis)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (plan !== "premium") {
      return new Response(JSON.stringify({ error: "Plan invalide (premium uniquement)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const nbLic = Number(nb_licences);
    if (!Number.isInteger(nbLic) || nbLic < 2 || nbLic > 500) {
      return new Response(JSON.stringify({ error: "Nombre de licences invalide (2-500)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    const bearer = authHeader?.replace(/^Bearer\s+/i, "").trim() ?? "";
    // supabase.functions.invoke() envoie toujours l'anon key. On ne considère
    // l'appel comme "authentifié user" que si le token diffère de l'anon key.
    const hasUserJwt = bearer.length > 0 && bearer !== ANON_KEY;
    const hasInlineAdminPayload = [admin_email, admin_password, admin_prenom, admin_nom].every(
      (value) => typeof value === "string" && value.trim().length > 0,
    );

    const priceId = TEAM_PRICE_IDS[plan];
    if (!priceId) {
      return new Response(
        JSON.stringify({ error: `Price ID Team manquant pour le plan ${plan}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let user: { id: string; email: string } | null = null;

    if (hasUserJwt) {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${bearer}` } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData?.user?.email) {
        // Si on a aussi un payload inline, on bascule en création serveur.
        if (!hasInlineAdminPayload) {
          return new Response(JSON.stringify({ error: "Token invalide" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        user = { id: userData.user.id, email: userData.user.email };
      }
    }

    if (!user) {
      if (!hasInlineAdminPayload) {
        return new Response(JSON.stringify({ error: "Non authentifié" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const normalizedEmail = String(admin_email).trim().toLowerCase();
      const { data: existingProfile } = await admin
        .from("profiles")
        .select("id, email")
        .ilike("email", normalizedEmail)
        .maybeSingle();

      if (existingProfile?.id) {
        return new Response(
          JSON.stringify({ error: "Un compte existe déjà pour cet email. Connectez-vous pour continuer." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: createdUser, error: createUserErr } = await admin.auth.admin.createUser({
        email: normalizedEmail,
        password: String(admin_password),
        email_confirm: true,
        user_metadata: {
          prenom: String(admin_prenom).trim(),
          nom: String(admin_nom).trim(),
          role: "admin_org",
        },
      });

      if (createUserErr || !createdUser.user?.email) {
        return new Response(
          JSON.stringify({ error: createUserErr?.message ?? "Création du compte admin impossible" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      user = { id: createdUser.user.id, email: createdUser.user.email };
    }

    const cleanSiret = String(siret).replace(/\s/g, "");

    // SIRET unique check
    const { data: existing } = await admin
      .from("organizations")
      .select("id, statut")
      .eq("siret", cleanSiret)
      .maybeSingle();

    if (existing && existing.statut !== "pending_payment") {
      return new Response(
        JSON.stringify({ error: "Une organisation avec ce SIRET existe déjà." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let orgId = existing?.id ?? null;

    if (!orgId) {
      const { data: org, error: orgErr } = await admin
        .from("organizations")
        .insert({
          raison_sociale: raison_sociale.trim(),
          siret: cleanSiret,
          adresse: adresse?.trim() || null,
          tva_intra: tva_intra?.trim() || null,
          admin_user_id: user.id,
          plan,
          nb_licences: nbLic,
          statut: "pending_payment",
        })
        .select("id")
        .single();

      if (orgErr || !org) {
        console.error("[team-checkout] insert org error:", orgErr);
        return new Response(JSON.stringify({ error: orgErr?.message ?? "Création org échouée" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      orgId = org.id;

      // Modèle B : l'admin n'est PAS un membre. Il gère l'orga uniquement,
      // n'occupe pas de licence et n'a pas accès aux modules.

      // Lier le profile à l'org
      await admin
        .from("profiles")
        .update({ organization_id: orgId })
        .eq("id", user.id);
    } else {
      // Update existing pending org
      await admin
        .from("organizations")
        .update({
          raison_sociale: raison_sociale.trim(),
          adresse: adresse?.trim() || null,
          tva_intra: tva_intra?.trim() || null,
          plan,
          nb_licences: nbLic,
          admin_user_id: user.id,
        })
        .eq("id", orgId);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-11-20.acacia",
    });

    const origin = req.headers.get("origin") ?? req.headers.get("referer")?.replace(/\/$/, "") ?? "";

    const teamCoupon = Deno.env.get("STRIPE_COUPON_TEAM_10");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      locale: "fr",
      line_items: [{ price: priceId, quantity: nbLic }],
      payment_method_types: ["card"],
      customer_email: user.email,
      client_reference_id: orgId!,
      billing_address_collection: "required",
      ...(teamCoupon ? { discounts: [{ coupon: teamCoupon }] } : {}),
      metadata: { organization_id: orgId!, type: "b2b", plan },
      subscription_data: {
        metadata: { organization_id: orgId!, type: "b2b", plan },
      },
      success_url: `${origin}/impots-team/bienvenue?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/impots-team`,
    });

    // Journalisation des acceptations légales B2B (preuve juridique immuable)
    try {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req.headers.get("cf-connecting-ip") ??
        req.headers.get("x-real-ip") ??
        null;
      const userAgent = req.headers.get("user-agent") ?? null;
      const baseRow = {
        user_id: user.id,
        user_email: user.email,
        context: "b2b_checkout",
        plan,
        document_version: "1.0-2026-04",
        ip_address: ip,
        user_agent: userAgent,
        metadata: {
          stripe_session_id: session.id,
          organization_id: orgId,
          nb_licences: nbLic,
        },
      };
      await admin.from("legal_acceptances").insert([
        { ...baseRow, document_type: "cgv", accepted_at: cgv_accepted_at },
        { ...baseRow, document_type: "cgu", accepted_at: cgu_accepted_at },
        {
          ...baseRow,
          document_type: "b2b_guarantee_notice",
          accepted_at: cgv_accepted_at,
          metadata: {
            ...baseRow.metadata,
            note: "Garantie commerciale 7 jours satisfait-ou-remboursé (B2B, sous conditions)",
          },
        },
      ]);
    } catch (logErr) {
      console.error("[create-team-checkout-session] legal_acceptances insert failed:", logErr);
    }

    return new Response(JSON.stringify({ url: session.url, organization_id: orgId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-team-checkout-session error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
