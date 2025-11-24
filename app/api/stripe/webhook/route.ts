import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

// 🔹 Garante que corre em Node.js (necessário para Stripe + supabase-js)
export const runtime = "nodejs";
// (opcional, mas bom para webhooks)
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Lê o corpo bruto da request para validar assinatura
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

  let event: Stripe.Event;
  const buf = await buffer(req);

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Webhook signature failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // 👉 Só tratamos quando o checkout foi concluído
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Itens vêm de metadata.items (string JSON)
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
