import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";         // importante: usar Node, não Edge
export const dynamic = "force-dynamic";  // este endpoint é sempre dinâmico

// Lê envs e falha cedo se faltar algo (para não dar erro estranho)
function getEnvOrThrow(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

// Cria o cliente Stripe e Supabase a partir das envs
const stripe = new Stripe(getEnvOrThrow("STRIPE_SECRET_KEY"), {
  apiVersion: "2024-06-20",
});

function getSupabaseClient() {
  const url = getEnvOrThrow("SUPABASE_URL");
  const serviceKey = getEnvOrThrow("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceKey);
}

// Precisa ler o corpo bruto para validar assinatura do webhook
async function buffer(req: NextRequest): Promise<Buffer> {
  const arrayBuffer = await req.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error("❌ Stripe signature ou STRIPE_WEBHOOK_SECRET em falta.");
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err: any) {
    console.error("❌ Erro ao validar assinatura do webhook:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Tratamos apenas o evento de checkout concluído
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      const supabase = getSupabaseClient();

      // Recuperar items do metadata (enviados no create-checkout-session)
      let items: any[] = [];
      try {
        if (session.metadata?.items) {
          items = JSON.parse(session.metadata.items);
        }
      } catch (parseErr) {
        console.error("⚠️ Erro ao fazer parse de session.metadata.items:", parseErr);
      }

      const { error } = await supabase.from("orders").insert({
        stripe_session_id: session.id,
        customer_email: session.customer_details?.email ?? null,
        total_amount: session.amount_total ? session.amount_total / 100 : null, // de cêntimos para CHF
        currency: session.currency,
        items, // jsonb
      });

      if (error) {
        console.error("❌ Erro ao inserir encomenda no Supabase:", error);
        // Mesmo com erro de DB, devolvemos 200 ao Stripe para não repetir infinitamente
      } else {
        console.log("✅ Encomenda guardada com sucesso:", session.id);
      }
    } catch (err) {
      console.error("❌ Erro inesperado ao tratar o webhook:", err);
      // Também devolvemos 200 para não reenviarem para sempre
    }
  } else {
    // Para debug é útil ver que outros eventos estão a chegar
    console.log(`ℹ️ Webhook Stripe ignorado: ${event.type}`);
  }

  // Stripe só precisa saber que recebemos o evento
  return NextResponse.json({ received: true }, { status: 200 });
}
