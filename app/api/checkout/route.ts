import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Lê a chave mas não faz throw no topo
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Se não estiver definida, apenas registamos no log do servidor
if (!stripeSecretKey) {
  console.error(
    "⚠ STRIPE_SECRET_KEY não está definida nas variáveis de ambiente."
  );
}

// Criamos o cliente Stripe só se existir chave
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2024-06-20",
    })
  : null;

export async function POST(req: NextRequest) {
  try {
    // Segurança extra: se por algum motivo a chave não estiver definida
    if (!stripe) {
      return NextResponse.json(
        {
          error:
            "Zahlungsdienst ist momentan nicht verfügbar. Bitte versuchen Sie es später erneut.",
        },
        { status: 500 }
      );
    }

    const { items } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Keine Artikel im Warenkorb." },
        { status: 400 }
      );
    }

    const line_items = items.map((item: any) => ({
      quantity: item.quantity ?? 1,
      price_data: {
        currency: "chf",
        unit_amount: Math.round(item.price * 100), // CHF → Rappen
        product_data: {
          name: item.title,
        },
      },
    }));

    const successUrl = process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success`
      : "https://iumatec.ch/checkout/success";

    const cancelUrl = process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/cart`
      : "https://iumatec.ch/cart";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: err?.message || "Stripe-Fehler." },
      { status: 500 }
    );
  }
}
