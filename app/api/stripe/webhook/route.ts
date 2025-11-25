import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge"; // recomendado pelo Next.js

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const sig = req.headers.get("stripe-signature")!;
    const body = await req.text();

    // Verifica assinatura
    const event = stripe.webhooks.constructEvent(body, sig, endpointSecret);

    // Só queremos o evento de pagamento concluído
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;

      // Dados do pedido
      const order = {
        customer_email: session.customer_details.email,
        total_amount: session.amount_total / 100,
        currency: session.currency,
        items: session.metadata?.items ? JSON.parse(session.metadata.items) : [],
      };

      // Insere no Supabase
      const { error } = await supbase
        .from("orders")
        .insert(order);

      if (error) {
        console.error("Erro Supabase:", error);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook error:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
