import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

type CartItem = {
  id: string;
  title: string;
  price: number; // CHF (ex: 49.9)
  quantity: number;
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items: CartItem[] = Array.isArray(body?.items) ? body.items : [];

    if (!items.length) {
      return NextResponse.json({ error: "Cart empty" }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "chf",
      line_items: items.map((i) => ({
        quantity: i.quantity,
        price_data: {
          currency: "chf",
          unit_amount: Math.round(i.price * 100), // CHF -> cents
          product_data: {
            name: i.title,
            metadata: { product_id: i.id },
          },
        },
      })),
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout/cancel`,
      allow_promotion_codes: true,
      automatic_tax: { enabled: false },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Stripe error" },
      { status: 500 }
    );
  }
}
