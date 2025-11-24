import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ler corpo bruto para validar assinatura
async function buffer(req: Request | NextRequest): Promise<Buffer> {
  const arrayBuffer = await req.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    console.error("❌ Missing Stripe signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeSecretKey || !webhookSecret) {
    console.error("❌ Stripe env vars missing.");
    return NextResponse.json(
      { error: "Stripe ist nicht richtig konfiguriert." },
      { status: 500 }
    );
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("❌ Supabase env vars missing.");
    return NextResponse.json(
      { error: "Supabase ist nicht richtig konfiguriert." },
      { status: 500 }
    );
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2024-06-20",
  });

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  let event: Stripe.Event;
  const buf = await buffer(req);

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err: any) {
    console.error("❌ Webhook signature failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    let items: any[] = [];
    try {
      if (session.metadata?.items) {
        items = JSON.parse(session.metadata.items);
      }
    } catch (e) {
      console.error("❌ Erro ao fazer parse dos items do metadata:", e);
    }

    const { error } = await supabase.from("orders").insert({
      stripe_session_id: session.id,
      customer_email: session.customer_details?.email ?? null,
      total_amount: session.amount_total! / 100,
      currency: session.currency,
      items,
    });

    if (error) {
      console.error("❌ Erro ao guardar order no Supabase:", error);
      return NextResponse.json(
        { error: "DB insert error" },
        { status: 500 }
      );
    }

    console.log("✅ Encomenda guardada com sucesso:", session.id);
  }

  return NextResponse.json({ received: true });
}
