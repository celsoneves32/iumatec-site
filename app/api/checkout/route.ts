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

  // Versand fixo (ex.: CHF 9.90)
  const shipping_options: Stripe.Checkout.SessionCreateParams.ShippingOption[] = [
    {
      shipping_rate_data: {
        type: "fixed_amount",
        fixed_amount: { amount: 990, currency: "chf" },
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

    // CH-only:
    shipping_address_collection: {
      allowed_countries: ["CH"],
    },
    shipping_options,

    // (MVP) sem Stripe Tax por enquanto. Total = items + shipping.
    // Quando quiseres Stripe Tax, ativamos depois.

    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/account/orders?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/cart?canceled=1`,

    client_reference_id: userId,
    metadata: { user_id: userId },

    customer_email: email,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
