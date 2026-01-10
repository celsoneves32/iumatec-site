// app/api/stripe/webhook/route.ts
import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  const sig = (await headers()).get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId =
      (session.client_reference_id as string | null) ||
      (session.metadata?.user_id as string | undefined) ||
      null;

    if (!userId) {
      // Não dá para associar
      return NextResponse.json({ received: true, warning: "Missing userId" });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const amount_total = session.amount_total ?? null;
    const currency = session.currency ?? null;

    const { error } = await supabaseAdmin.from("orders").upsert(
      {
        user_id: userId,
        stripe_session_id: session.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
        status: "paid",
        currency,
        amount_total,
        customer_email:
          session.customer_details?.email ?? session.customer_email ?? null,
      },
      { onConflict: "stripe_session_id" }
    );

    if (error) {
      console.error("Supabase order upsert error:", error);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
