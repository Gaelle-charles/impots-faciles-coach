import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import Stripe from "npm:stripe@17.5.0";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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

    const body = await req.json().catch(() => ({}));
    const id = body?.id as string | undefined;
    if (!id) return jsonResponse({ error: "id requis" }, 400);

    const { data: coupon, error: fetchErr } = await supabase
      .from("coupons").select("*").eq("id", id).maybeSingle();
    if (fetchErr || !coupon) return jsonResponse({ error: "Coupon introuvable" }, 404);

    if ((coupon.times_redeemed ?? 0) > 0) {
      // Force la désactivation au lieu de supprimer
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
        apiVersion: "2024-11-20.acacia",
      });
      if (coupon.active && coupon.stripe_promo_code_id) {
        try { await stripe.promotionCodes.update(coupon.stripe_promo_code_id, { active: false }); } catch (_) { /* ignore */ }
      }
      await supabase.from("coupons").update({ active: false }).eq("id", id);
      await supabase.from("coupon_audit_log").insert({
        coupon_id: id,
        admin_user_id: user.id,
        action_type: "deactivate",
        details: { reason: "Suppression refusée car déjà utilisé", times_redeemed: coupon.times_redeemed },
      });
      return jsonResponse({
        error: "Suppression impossible : ce coupon a déjà été utilisé. Il a été désactivé à la place.",
        deactivated: true,
      }, 409);
    }

    // Pas d'utilisations : delete Stripe + delete DB
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-11-20.acacia",
    });

    if (coupon.stripe_promo_code_id) {
      try { await stripe.promotionCodes.update(coupon.stripe_promo_code_id, { active: false }); } catch (_) { /* ignore */ }
    }
    if (coupon.stripe_coupon_id) {
      try { await stripe.coupons.del(coupon.stripe_coupon_id); } catch (_) { /* ignore */ }
    }

    // Log AVANT delete (FK ON DELETE SET NULL conservera l'audit)
    await supabase.from("coupon_audit_log").insert({
      coupon_id: id,
      admin_user_id: user.id,
      action_type: "delete",
      details: { code: coupon.code, percent_off: coupon.percent_off },
    });

    const { error: delErr } = await supabase.from("coupons").delete().eq("id", id);
    if (delErr) return jsonResponse({ error: delErr.message }, 500);

    return jsonResponse({ success: true, deleted: true });
  } catch (err) {
    console.error("[delete-coupon]", err);
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return jsonResponse({ error: msg }, 500);
  }
});
