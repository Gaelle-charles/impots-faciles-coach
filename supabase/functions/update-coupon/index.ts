import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import Stripe from "npm:stripe@17.5.0";

interface UpdateCouponBody {
  id: string;
  max_redemptions?: number | null;
  active?: boolean;
  notes?: string | null;
  parrain_type?: "user" | "external" | "none";
  parrain_user_id?: string | null;
  parrain_external_name?: string | null;
  parrain_external_email?: string | null;
  parrain_external_type?: "influenceur" | "partenaire" | "ami" | "autre" | null;
  // Champs interdits :
  code?: string;
  percent_off?: number;
  plans_applicables?: string[];
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const FORBIDDEN_FIELDS = ["code", "percent_off", "plans_applicables", "valid_from", "valid_until"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Non authentifié" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return jsonResponse({ error: "Utilisateur invalide" }, 401);
    const user = userData.user;

    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") return jsonResponse({ error: "Accès refusé" }, 403);

    const body = (await req.json().catch(() => ({}))) as UpdateCouponBody;
    if (!body.id) return jsonResponse({ error: "id requis" }, 400);

    // Refuse champs immuables
    for (const f of FORBIDDEN_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, f)) {
        return jsonResponse({ error: `Le champ ${f} ne peut pas être modifié` }, 400);
      }
    }

    const { data: coupon, error: fetchErr } = await supabase
      .from("coupons").select("*").eq("id", body.id).maybeSingle();
    if (fetchErr || !coupon) return jsonResponse({ error: "Coupon introuvable" }, 404);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-11-20.acacia",
    });

    const updates: Record<string, unknown> = {};
    const auditDetails: Record<string, unknown> = {};
    let actionType: "update" | "deactivate" | "reactivate" = "update";

    // active
    if (typeof body.active === "boolean" && body.active !== coupon.active) {
      if (coupon.stripe_promo_code_id) {
        await stripe.promotionCodes.update(coupon.stripe_promo_code_id, { active: body.active });
      }
      updates.active = body.active;
      auditDetails.active = body.active;
      actionType = body.active ? "reactivate" : "deactivate";
    }

    // max_redemptions : Stripe ne permet pas de modifier max_redemptions sur un Promotion Code existant.
    // On le met à jour uniquement en base (pour l'affichage admin).
    if (body.max_redemptions !== undefined && body.max_redemptions !== coupon.max_redemptions) {
      const m = body.max_redemptions == null ? null : Number(body.max_redemptions);
      if (m != null && (!Number.isInteger(m) || m < coupon.times_redeemed)) {
        return jsonResponse({ error: `max_redemptions doit être ≥ ${coupon.times_redeemed} (utilisations actuelles)` }, 400);
      }
      updates.max_redemptions = m;
      auditDetails.max_redemptions = m;
    }

    if (body.notes !== undefined) {
      updates.notes = body.notes;
      auditDetails.notes_changed = true;
    }

    if (body.parrain_type !== undefined) {
      updates.parrain_type = body.parrain_type;
      updates.parrain_user_id = body.parrain_type === "user" ? body.parrain_user_id ?? null : null;
      updates.parrain_external_name = body.parrain_type === "external" ? body.parrain_external_name ?? null : null;
      updates.parrain_external_email = body.parrain_type === "external" ? body.parrain_external_email ?? null : null;
      updates.parrain_external_type = body.parrain_type === "external" ? body.parrain_external_type ?? null : null;
      auditDetails.parrain_type = body.parrain_type;
    }

    if (Object.keys(updates).length === 0) {
      return jsonResponse({ success: true, coupon, message: "Aucune modification" });
    }

    const { data: updated, error: updErr } = await supabase
      .from("coupons").update(updates).eq("id", body.id).select().single();
    if (updErr) return jsonResponse({ error: updErr.message }, 500);

    await supabase.from("coupon_audit_log").insert({
      coupon_id: body.id,
      admin_user_id: user.id,
      action_type: actionType,
      details: auditDetails,
    });

    return jsonResponse({ success: true, coupon: updated });
  } catch (err) {
    console.error("[update-coupon]", err);
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return jsonResponse({ error: msg }, 500);
  }
});
