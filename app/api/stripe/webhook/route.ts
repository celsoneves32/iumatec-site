import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";         // precisa de Node para usar Stripe SDK
export const dynamic = "force-dynamic";  // não é estático, é sempre dinâmico

// Stripe client
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.warn("⚠ STRIPE_SECRET_KEY fehlt in der Umgebung.");
}
const stripe = new Stripe(stripeSecretKey || "", {
  apiVersion: "2024-06-20",
});

// Webhook secret
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Supabase client (service role)
function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlen in den Env-Variablen."
    );
  }

  return createClient(url, serviceKey);
}

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    console.error("❌ STRIPE_WEBHOOK_SECRET fehlt.");
    return NextResponse.json(
      { error: "Webhook secret missing" },
      { status: 500 }
    );
  }
  if (!stripeSecretKey) {
    console.error("❌ STRIPE_SECRET_KEY fehlt.");
    return NextResponse.json(
      { error: "Stripe secret missing" },
      { status: 500 }
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    // no App Router podemos usar text() para obter o raw body
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("❌ Stripe signature verification failed:", err.message);
    return NextResponse.json(
      { error: `Invalid signature: ${err.message}` },
      { status: 400 }
    );
  }

  // Tratamos apenas checkout.session.completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      const supabase = getSupabaseClient();

      let items: any[] = [];
      try {
        if (session.metadata?.items) {
          items = JSON.parse(session.metadata.items);
        }
      } catch (parseErr) {
        console.error("⚠ Fehler beim Parsen von session.metadata.items:", parseErr);
      }

      const { error } = await supabase.from("orders").insert({
        stripe_session_id: session.id,
        customer_email: session.customer_details?.email ?? null,
        total_amount: session.amount_total ? session.amount_total / 100 : null,
        currency: session.currency,
        items, // jsonb
      });

      if (error) {
        console.error("❌ Supabase Insert Error:", error);
      } else {
        console.log("✅ Bestellung in Supabase gespeichert:", session.id);
      }
    } catch (err) {
      console.error("❌ Unerwarteter Fehler beim Verarbeiten des Webhooks:", err);
    }
  } else {
    console.log(`ℹ Ignoriere Event-Typ: ${event.type}`);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
