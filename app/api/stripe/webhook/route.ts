import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Lê o corpo bruto da requisição para validar assinatura
async function buffer(req: Request): Promise<Buffer> {
  const arrayBuffer = await req.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  const buf = await buffer(req);

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Webhook signature failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // 👉 só processamos checkout completado
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const items = session.metadata?.items
      ? JSON.parse(session.metadata.items)
      : [];

    const { error } = await supabase.from("orders").insert({
      stripe_session_id: session.id,
      customer_email: session.customer_details?.email ?? null,
      total_amount: session.amount_total! / 100,
      currency: session.currency,
      items,
    });

    if (error) {
      console.error("❌ Erro ao guardar order:", error);
      return NextResponse.json({ error: "DB insert error" }, { status: 500 });
    }

    console.log("✅ Encomenda guardada com sucesso:", session.id);
  }

  return NextResponse.json({ received: true });
}
