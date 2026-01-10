// app/api/checkout/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

type CheckoutItem = {
  id: string;
  title: string;
  price: number;
  quantity: number;
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const FREE_SHIPPING_THRESHOLD_CHF = 50; // >= CHF 50 => grátis
const STANDARD_SHIPPING_CHF = 9.9; // abaixo de CHF 50 => CHF 9.90

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  const userId = (session?.user as any)?.id as string | undefined;
  const email = session?.user?.email ?? undefined;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const items: CheckoutItem[] = body?.items;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Cart empty" }, { status: 400 });
  }

  // Subtotal (CHF) a partir do payload do carrinho
  // (Nota: em produção, ideal é calcular preços a partir de uma fonte do servidor.)
  const subtotalCHF = items.reduce((sum, it) => {
    const price = Number(it.price) || 0;
    const qty = Number(it.quantity) || 0;
    return sum + price * qty;
  }, 0);

  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(
    (it) => ({
      quantity: it.quantity,
      price_data: {
        currency: "chf",
        product_data: { name: it.title },
        unit_amount: Math.round(Number(it.price) * 100),
      },
    })
  );

  const isFreeShipping = subtotalCHF >= FREE_SHIPPING_THRESHOLD_CHF;

  const shipping_options: Stripe.Checkout.SessionCreateParams.ShippingOption[] =
    isFreeShipping
      ? [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              fixed_amount: { amount: 0, currency: "chf" },
              display_name: `Gratis Versand (ab CHF ${FREE_SHIPPING_THRESHOLD_CHF.toFixed(
                0
              )})`,
              delivery_estimate: {
                minimum: { unit: "business_day", value: 1 },
                maximum: { unit: "business_day", value: 3 },
              },
            },
          },
        ]
      : [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              fixed_amount: {
                amount: Math.round(STANDARD_SHIPPING_CHF * 100),
                currency: "chf",
              },
              display_name: "Standardversand (CH)",
              delivery_estimate: {
                minimum: { unit: "business_day", value: 1 },
                maximum: { unit: "business_day", value: 3 },
              },
            },
          },
        ];

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items,

    // Apenas Suíça
    shipping_address_collection: {
      allowed_countries: ["CH"],
    },
    shipping_options,

    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/account/orders?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/cart?canceled=1`,

    // ligar ao user
    client_reference_id: userId,
    metadata: {
      user_id: userId,
      shipping_rule: isFreeShipping ? "free_over_50" : "standard",
      subtotal_chf: String(subtotalCHF),
    },

    customer_email: email,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
