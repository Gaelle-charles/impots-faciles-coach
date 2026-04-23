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
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const newPriceId = subscription.items.data[0]?.price.id;
      const newPlan = PRICE_TO_PLAN[newPriceId];

      console.log(
        `[webhook] customer.subscription.updated → sub ${subscription.id} → priceId ${newPriceId} → plan ${newPlan}`,
      );

      if (!newPlan) {
        console.error(`[webhook] Unknown priceId ${newPriceId} — ignoring`);
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      // Fetch current plan to enforce no-downgrade safety net
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
      console.log(`[webhook] customer.subscription.deleted → sub ${subscription.id}`);

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
