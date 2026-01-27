import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // tens de pôr na Vercel
);

export async function POST(req: Request) {
  try {
    const sig = req.headers.get("stripe-signature");
    const whsec = process.env.STRIPE_WEBHOOK_SECRET!;
    const rawBody = await req.text();

    if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

    const event = stripe.webhooks.constructEvent(rawBody, sig, whsec);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Buscar line items
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
        expand: ["data.price.product"],
      });

      const email = session.customer_details?.email ?? session.customer_email ?? null;

      // user_id: se quiseres ligar ao user, mete metadata no checkout session depois.
      // Por agora, ligamos por email e depois fazemos update.
      const payload = {
        stripe_session_id: session.id,
        customer_email: email,
        currency: (session.currency ?? "chf").toUpperCase(),
        amount_total: session.amount_total ?? null,
        shipping_cost: session.shipping_cost?.amount_total ?? null,
        status: session.payment_status ?? "paid",
        line_items: lineItems.data.map((li) => ({
          description: li.description,
          quantity: li.quantity,
          amount_total: li.amount_total,
          price: li.price
            ? { unit_amount: li.price.unit_amount, currency: li.price.currency }
            : null,
        })),
      };

      await supabaseAdmin
        .from("orders")
        .upsert(payload, { onConflict: "stripe_session_id" });
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Webhook error" }, { status: 400 });
  }
}
