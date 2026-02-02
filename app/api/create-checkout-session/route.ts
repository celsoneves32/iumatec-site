import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

type CartItemInput = {
  variantId: string; // Shopify ProductVariant GID
  quantity: number;
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

async function fetchShopifyVariants(variantIds: string[]) {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

  if (!domain || !token) {
    throw new Error("Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_STOREFRONT_ACCESS_TOKEN");
  }

  // Storefront API endpoint
  const url = `https://${domain}/api/2024-04/graphql.json`;

  const query = `
    query GetVariants($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on ProductVariant {
          id
          title
          price {
            amount
            currencyCode
          }
          product {
            title
          }
        }
      }
    }
  `;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({ query, variables: { ids: variantIds } }),
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok || json.errors) {
    throw new Error(
      `Shopify error: ${JSON.stringify(json.errors || json, null, 2)}`
    );
  }

  const nodes = (json.data?.nodes || []) as Array<
    | null
    | {
        id: string;
        title: string;
        price: { amount: string; currencyCode: string };
        product: { title: string };
      }
  >;

  // Filtra nulls
  return nodes.filter(Boolean) as NonNullable<(typeof nodes)[number]>[];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items: CartItemInput[] = Array.isArray(body?.items) ? body.items : [];

    if (!items.length) {
      return NextResponse.json({ error: "Cart empty" }, { status: 400 });
    }

    // validações básicas
    for (const it of items) {
      if (!it?.variantId || typeof it.variantId !== "string") {
        return NextResponse.json({ error: "Missing variantId" }, { status: 400 });
      }
      if (!Number.isInteger(it.quantity) || it.quantity <= 0) {
        return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
      }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // 1) buscar preços reais no Shopify
    const variantIds = items.map((i) => i.variantId);
    const variants = await fetchShopifyVariants(variantIds);

    // 2) map rápido por id
    const byId = new Map(variants.map((v) => [v.id, v]));

    // 3) construir line_items com preços do Shopify (server-side)
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(
      (i) => {
        const v = byId.get(i.variantId);
        if (!v) {
          throw new Error(`Variant not found in Shopify: ${i.variantId}`);
        }

        const amount = Number(v.price.amount);
        if (!Number.isFinite(amount)) {
          throw new Error(`Invalid Shopify price for ${i.variantId}`);
        }

        // Stripe precisa de "cents"
        const unit_amount = Math.round(amount * 100);

        return {
          quantity: i.quantity,
          price_data: {
            currency: (v.price.currencyCode || "CHF").toLowerCase(),
            unit_amount,
            product_data: {
              name: `${v.product.title} — ${v.title}`,
              metadata: { shopify_variant_id: v.id },
            },
          },
        };
      }
    );

    // 4) criar sessão Stripe
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
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
