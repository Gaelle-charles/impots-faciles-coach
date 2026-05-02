import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import Stripe from "npm:stripe@17.5.0";

// No CORS — Stripe webhooks are server-to-server.

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2024-11-20.acacia",
  });
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  if (!signature || !webhookSecret) {
    console.error("Missing signature or webhook secret");
    return new Response(JSON.stringify({ error: "Signature manquante" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Signature verification failed", err);
    return new Response(JSON.stringify({ error: "Signature invalide" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Map Stripe price IDs → internal plan names
  const PRICE_TO_PLAN: Record<string, string> = {
    [Deno.env.get("STRIPE_PRICE_ID_STARTER") ?? ""]: "starter",
    [Deno.env.get("STRIPE_PRICE_ID_EXPERT") ?? ""]: "expert",
    [Deno.env.get("STRIPE_PRICE_ID_PREMIUM") ?? ""]: "premium",
  };
  const PLAN_HIERARCHY: Record<string, number> = {
    nouveau: 0,
    starter: 1,
    expert: 2,
    premium: 3,
  };

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const isB2B = session.metadata?.type === "b2b";

      // === B2B (Impôts Team) ===
      if (isB2B) {
        const orgId = session.metadata?.organization_id ?? session.client_reference_id;
        if (!orgId) {
          console.error("[webhook][B2B] Missing organization_id", session.id);
          return new Response(JSON.stringify({ received: true }), { status: 200 });
        }

        const { error } = await supabase
          .from("organizations")
          .update({
            statut: "active",
            stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
            stripe_subscription_id:
              typeof session.subscription === "string" ? session.subscription : null,
            date_paiement: new Date().toISOString(),
          })
          .eq("id", orgId);

        if (error) {
          console.error("[webhook][B2B] Failed to activate org", error);
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
        console.log(`[webhook][B2B] checkout.session.completed → org ${orgId} active`);
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      // === B2C ===
      const userId = session.client_reference_id ?? session.metadata?.user_id;
      const plan = session.metadata?.plan;

      if (!userId || !plan) {
        console.error("Missing user_id or plan in session", session.id);
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          plan,
          stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
          stripe_subscription_id:
            typeof session.subscription === "string" ? session.subscription : null,
          date_paiement: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) {
        console.error("Failed to update profile", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }

      console.log(`[webhook] checkout.session.completed → user ${userId} → plan ${plan}`);

      // === Coupon redemption tracking ===
      try {
        const amountDiscount = session.total_details?.amount_discount ?? 0;
        const couponIdMeta = session.metadata?.coupon_id ?? null;
        const promoCodeMeta = session.metadata?.stripe_promo_code_id ?? null;

        if (amountDiscount > 0 && (couponIdMeta || promoCodeMeta)) {
          // Récupère via metadata en priorité (posée à la création de session) ; fallback via promo code Stripe
          let couponRow: { id: string } | null = null;
          if (couponIdMeta) {
            const { data } = await supabase
              .from("coupons").select("id").eq("id", couponIdMeta).maybeSingle();
            couponRow = data;
          }
          if (!couponRow && promoCodeMeta) {
            const { data } = await supabase
              .from("coupons").select("id").eq("stripe_promo_code_id", promoCodeMeta).maybeSingle();
            couponRow = data;
          }

          if (couponRow) {
            const amountPaid = session.amount_total ?? 0;
            const subId =
              typeof session.subscription === "string" ? session.subscription : null;

            const { error: rpcErr } = await supabase.rpc("record_coupon_redemption", {
              p_coupon_id: couponRow.id,
              p_user_id: userId,
              p_plan: plan,
              p_amount_paid: amountPaid,
              p_amount_saved: amountDiscount,
              p_stripe_session_id: session.id,
              p_stripe_subscription_id: subId,
            });

            if (rpcErr) {
              console.error("[webhook] record_coupon_redemption failed", rpcErr);
            } else {
              console.log(
                `[webhook] coupon redemption recorded: coupon=${couponRow.id} user=${userId} saved=${amountDiscount}`,
              );
            }
          } else {
            console.warn(
              `[webhook] discount detected but coupon not found (id=${couponIdMeta}, promo=${promoCodeMeta})`,
            );
          }
        }
      } catch (couponErr) {
        // Ne bloque jamais l'activation du plan si tracking échoue
        console.error("[webhook] coupon tracking error", couponErr);
      }
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const isB2B = subscription.metadata?.type === "b2b";

      // === B2B : maj nb_licences via quantity ===
      if (isB2B) {
        const newQty = subscription.items.data[0]?.quantity ?? null;
        console.log(
          `[webhook][B2B] customer.subscription.updated → sub ${subscription.id} → qty ${newQty}`,
        );
        if (newQty && newQty >= 2) {
          const { error } = await supabase
            .from("organizations")
            .update({ nb_licences: newQty })
            .eq("stripe_subscription_id", subscription.id);
          if (error) {
            console.error("[webhook][B2B] Failed update nb_licences", error);
          }
        }
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      // === B2C : changement de plan + safety anti-downgrade ===
      const newPriceId = subscription.items.data[0]?.price.id;
      const newPlan = PRICE_TO_PLAN[newPriceId];

      console.log(
        `[webhook] customer.subscription.updated → sub ${subscription.id} → priceId ${newPriceId} → plan ${newPlan}`,
      );

      if (!newPlan) {
        console.error(`[webhook] Unknown priceId ${newPriceId} — ignoring`);
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const { data: current } = await supabase
        .from("profiles")
        .select("plan")
        .eq("stripe_subscription_id", subscription.id)
        .maybeSingle();

      const currentPlan = current?.plan ?? "nouveau";
      if (PLAN_HIERARCHY[newPlan] < PLAN_HIERARCHY[currentPlan]) {
        console.error(
          `[webhook] Downgrade refusé: ${currentPlan} → ${newPlan} (sub ${subscription.id})`,
        );
        return new Response(
          JSON.stringify({ error: "Downgrade not allowed" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      const { error } = await supabase
        .from("profiles")
        .update({ plan: newPlan, date_paiement: new Date().toISOString() })
        .eq("stripe_subscription_id", subscription.id);

      if (error) {
        console.error("[webhook] Failed to update plan on sub.updated", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }

      console.log(`[webhook] Plan mis à jour: ${currentPlan} → ${newPlan}`);
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const isB2B = subscription.metadata?.type === "b2b";
      console.log(`[webhook] customer.subscription.deleted → sub ${subscription.id} (B2B=${isB2B})`);

      if (isB2B) {
        const { error } = await supabase
          .from("organizations")
          .update({ statut: "cancelled" })
          .eq("stripe_subscription_id", subscription.id);
        if (error) {
          console.error("[webhook][B2B] Failed cancel org", error);
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const { error } = await supabase
        .from("profiles")
        .update({ plan: "nouveau", stripe_subscription_id: null })
        .eq("stripe_subscription_id", subscription.id);

      if (error) {
        console.error("[webhook] Failed to clear plan on sub.deleted", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }

      console.log(`[webhook] Abonnement annulé, plan → nouveau`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook handler error", err);
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
