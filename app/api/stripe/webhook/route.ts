// app/api/stripe/webhook/route.ts
import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { resend } from "@/lib/resend";
import { buildOrderConfirmationHtml } from "@/lib/emails/orderConfirmation";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  const sig = (await headers()).get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature" },
      { status: 400 }
    );
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
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId =
      (session.client_reference_id as string | null) ||
      (session.metadata?.user_id as string | undefined) ||
      null;

    // Não bloqueamos o webhook, mas sem userId não dá para associar à conta
    if (!userId) {
      return NextResponse.json({
        received: true,
        warning: "Missing userId (client_reference_id/metadata.user_id)",
      });
    }

    // Buscar line items no Stripe
    let lineItems: any[] = [];
    try {
      const itemsRes = await stripe.checkout.sessions.listLineItems(session.id, {
        limit: 100,
      });

      lineItems = (itemsRes.data || []).map((li) => ({
        description: li.description ?? null,
        quantity: li.quantity ?? null,
        amount_subtotal: li.amount_subtotal ?? null,
        amount_total: li.amount_total ?? null,
        currency: li.currency ?? null,
        price: li.price
          ? {
              id: li.price.id,
              unit_amount: li.price.unit_amount ?? null,
              currency: li.price.currency ?? null,
              product: li.price.product ?? null,
            }
          : null,
      }));
    } catch (e) {
      console.error("Stripe listLineItems error:", e);
      lineItems = [];
    }

    const supabaseAdmin = getSupabaseAdmin();

    const shipping = session.shipping_details ?? null;
    const amount_total = session.amount_total ?? null; // cents
    const currency = session.currency ?? null;
    const shipping_cost =
      (session.total_details as any)?.amount_shipping ?? null; // cents

    // 1) Grava/atualiza a order
    const { error: upsertError } = await supabaseAdmin.from("orders").upsert(
      {
        user_id: userId,
        stripe_session_id: session.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null,

        status: "paid",
        payment_status: session.payment_status ?? null,
        mode: session.mode ?? null,

        currency,
        amount_total,
        shipping_cost,

        customer_email:
          session.customer_details?.email ?? session.customer_email ?? null,

        shipping_name: shipping?.name ?? null,
        shipping_address: shipping?.address ?? null,

        line_items: lineItems,
      },
      { onConflict: "stripe_session_id" }
    );

    if (upsertError) {
      console.error("Supabase order upsert error:", upsertError);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    // 2) Carrega a order para decidir se envia e-mail (evitar duplicados)
    const { data: orderRow, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select(
        "id, customer_email, created_at, currency, amount_total, shipping_cost, line_items, email_sent_at"
      )
      .eq("stripe_session_id", session.id)
      .maybeSingle();

    if (fetchError) {
      console.error("Supabase order fetch error:", fetchError);
      // não falha o webhook por causa do e-mail
      return NextResponse.json({ received: true, warning: "Order fetch error" });
    }

    const customerEmail = orderRow?.customer_email ?? null;

    // Se não há email do cliente, não dá para enviar
    if (!customerEmail) {
      return NextResponse.json({
        received: true,
        warning: "Missing customer_email",
      });
    }

    // Se já enviámos, não reenviamos
    if (orderRow?.email_sent_at) {
      return NextResponse.json({ received: true, email: "already_sent" });
    }

    // 3) Enviar e-mail via Resend
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      "https://iumatec.ch";

    const from =
      process.env.RESEND_FROM || "IUMATEC <no-reply@iumatec.ch>";

    const ordersUrl = `${siteUrl}/account/orders`;

    const html = buildOrderConfirmationHtml({
      brand: "IUMATEC",
      siteUrl,
      customerEmail,
      createdAtISO: orderRow?.created_at ?? new Date().toISOString(),
      currency: (orderRow?.currency ?? "chf") as string,
      amountTotalCents:
        typeof orderRow?.amount_total === "number" ? orderRow.amount_total : null,
      shippingCents:
        typeof orderRow?.shipping_cost === "number" ? orderRow.shipping_cost : null,
      lineItems: Array.isArray(orderRow?.line_items) ? orderRow.line_items : [],
      ordersUrl,
    });

    try {
      const subject = "IUMATEC – Bestellbestätigung";

      const res = await resend.emails.send({
        from,
        to: customerEmail,
        subject,
        html,
      });

      // 4) Marca como enviado (idempotência)
      await supabaseAdmin
        .from("orders")
        .update({
          email_sent_at: new Date().toISOString(),
          resend_email_id: (res as any)?.data?.id ?? null,
        })
        .eq("id", orderRow.id);
    } catch (e) {
      console.error("Resend send error:", e);
      // não falha o webhook por causa do e-mail
      return NextResponse.json({
        received: true,
        warning: "Email send failed",
      });
    }
  }

  return NextResponse.json({ received: true });
}
