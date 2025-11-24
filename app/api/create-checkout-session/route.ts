import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

export async function POST(req: NextRequest) {
  try {
    const { items } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Keine Artikel im Warenkorb." },
        { status: 400 }
      );
    }

    const line_items = items.map((item: any) => ({
      quantity: item.quantity,
      price_data: {
        currency: "chf",
        unit_amount: Math.round(item.price * 100), // CHF → Rappen
        product_data: {
          name: item.title,
        },
      },
    }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/cart`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe Checkout Error:", err);
    return NextResponse.json(
      { error: "Fehler beim Erstellen der Checkout-Session." },
      { status: 500 }
    );
  }
}
