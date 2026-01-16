import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getCheckoutItemsByIds } from "@/lib/shopify";

type CheckoutItemInput = {
  id: string;
  quantity: number;
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const FREE_SHIPPING_THRESHOLD_CHF = 50;
const STANDARD_SHIPPING_CHF = 9.9;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items: CheckoutItemInput[] = body?.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart empty" }, { status: 400 });
    }

    const sanitized = items
      .map((it) => ({
        id: String(it.id || "").trim(),
        quantity: Math.max(1, Math.min(99, Number(it.quantity) || 1)),
      }))
      .filter((it) => it.id.length > 0);

    if (sanitized.length === 0) {
      return NextResponse.json({ error: "Invalid items" }, { status: 400 });
    }

    // Buscar preços reais no Shopify
    const ids = sanitized.map((it) => it.id);
    const shopifyMap = await getCheckoutItemsByIds(ids);

    let subtotalCHF = 0;

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] =
      sanitized.map((it) => {
        const product = shopifyMap.get(it.id);
        if (!product) {
          throw new Error(`Product not found: ${it.id}`);
        }

        if (product.currencyCode !== "CHF") {
          throw new Error("Currency must be CHF");
        }

        subtotalCHF += product.amount * it.quantity;

        return {
          quantity: it.quantity,
          price_data: {
            currency: "chf",
            unit_amount: Math.round(product.amount * 100),
            product_data: {
              name: product.title,
            },
          },
        };
      });

    const isFreeShipping = subtotalCHF >= FREE_SHIPPING_THRESHOLD_CHF;

    const shipping_options = isFreeShipping
      ? [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              fixed_amount: { amount: 0, currency: "chf" },
              display_name: "Gratis Versand",
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
            },
          },
        ];

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://iumatec.ch";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      shipping_address_collection: {
        allowed_countries: ["CH"],
      },
      shipping_options,
      success_url: `${siteUrl}/success`,
      cancel_url: `${siteUrl}/cart`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Checkout konnte nicht erstellt werden." },
      { status: 500 }
    );
  }
}
