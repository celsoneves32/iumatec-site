// app/api/checkout/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { getCheckoutItemsByIds } from "@/lib/shopify";

type CheckoutItemInput = {
  id: string; // Shopify GID (Variant ou Product, conforme o teu getCheckoutItemsByIds)
  quantity: number;
  title?: string;
  price?: number;
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const FREE_SHIPPING_THRESHOLD_CHF = 50; // grátis >= 50
const STANDARD_SHIPPING_CHF = 9.9;

export async function POST(req: Request) {
  // 1) Session (server-side)
  const session = await getServerSession(authOptions);

  const userId = (session?.user as any)?.id as string | undefined;
  const email = session?.user?.email ?? undefined;

  if (!userId) {
    // Dica de debug (não expõe secrets): ajuda a ver se a session está a vir nula
    return NextResponse.json(
      { error: "Unauthorized", hasSession: !!session },
      { status: 401 }
    );
  }

  // 2) Body
  const body = await req.json().catch(() => null);
  const items: CheckoutItemInput[] = body?.items;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Cart empty" }, { status: 400 });
  }

  // 3) Sanitize
  const sanitized = items
    .map((it) => ({
      id: String(it.id || "").trim(),
      quantity: Math.max(1, Math.min(99, Number(it.quantity) || 1)),
    }))
    .filter((it) => it.id.length > 0);

  if (sanitized.length === 0) {
    return NextResponse.json({ error: "Invalid cart items" }, { status: 400 });
  }

  // 4) Prices/titles server-side via Shopify
  const ids = sanitized.map((it) => it.id);
  const shopifyMap = await getCheckoutItemsByIds(ids);

  let subtotalCHF = 0;

  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] =
    sanitized.map((it) => {
      const fromShopify = shopifyMap.get(it.id);
      if (!fromShopify) {
        throw new Error(`Product not found in Shopify for id: ${it.id}`);
      }

      if ((fromShopify.currencyCode || "").toUpperCase() !== "CHF") {
        throw new Error(
          `Invalid currency for ${it.id}: ${fromShopify.currencyCode} (expected CHF)`
        );
      }

      const unitAmountCents = Math.round(fromShopify.amount * 100);
      subtotalCHF += fromShopify.amount * it.quantity;

      return {
        quantity: it.quantity,
        price_data: {
          currency: "chf",
          product_data: { name: fromShopify.title },
          unit_amount: unitAmountCents,
        },
      };
    });

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

  // 5) Create Stripe checkout
  try {
    const siteUrl =
      (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "") ||
      "https://iumatec.ch";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,

      shipping_address_collection: { allowed_countries: ["CH"] },
      shipping_options,

      success_url: `${siteUrl}/account/orders?success=1`,
      cancel_url: `${siteUrl}/cart?canceled=1`,

      client_reference_id: userId,
      metadata: {
        user_id: userId,
        shipping_rule: isFreeShipping ? "free_over_50" : "standard",
        subtotal_chf: subtotalCHF.toFixed(2),
      },

      customer_email: email,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err: any) {
    console.error("Stripe checkout create error:", err);
    return NextResponse.json(
      { error: "Checkout konnte nicht erstellt werden." },
      { status: 500 }
    );
  }
}
