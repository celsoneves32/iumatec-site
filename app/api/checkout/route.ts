import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Garantir que esta rota corre em Node (necessário para o SDK da Stripe)
export const runtime = "nodejs";

// Ler a secret key do ambiente
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  // Isto aparece apenas no servidor (log da Vercel), não no browser
  throw new Error(
    "STRIPE_SECRET_KEY não está definida nas variáveis de ambiente."
  );
}

// Instância da Stripe
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-06-20",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = body?.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Keine Artikel im Warenkorb." },
        { status: 400 }
      );
    }

    const line_items = items.map((item: any) => ({
      quantity: item.quantity ?? 1,
      price_data: {
        currency: "chf",
        unit_amount: Math.round(Number(item.price) * 100), // CHF → Rappen
        product_data: {
          name: item.title ?? "Ohne Titel",
        },
      },
    }));

    // URL base do site (produção ou localhost)
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: `${siteUrl}/checkout/success`,
      cancel_url: `${siteUrl}/cart`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe-Checkout-URL konnte nicht erzeugt werden." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);

    return NextResponse.json(
      {
        error: "Es ist ein Fehler beim Stripe-Checkout aufgetreten.",
      },
      { status: 500 }
    );
  }
}
