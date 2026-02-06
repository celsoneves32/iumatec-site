// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { shopifyFetch } from "@/lib/shopify";

type CartCreateMutation = {
  cartCreate: {
    cart: { checkoutUrl: string } | null;
    userErrors: Array<{ field: string[] | null; message: string }>;
  };
};

const CART_CREATE = `#graphql
mutation CartCreate($lines: [CartLineInput!]) {
  cartCreate(input: { lines: $lines }) {
    cart { checkoutUrl }
    userErrors { field message }
  }
}
`;

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "";

  let variantId: string | null = null;
  let quantity = 1;

  if (contentType.includes("application/json")) {
    const body = await req.json();
    variantId = body.variantId ?? null;
    quantity = Number(body.quantity ?? 1);
  } else {
    const form = await req.formData();
    variantId = (form.get("variantId") as string) ?? null;
    quantity = Number((form.get("quantity") as string) ?? "1");
  }

  if (!variantId) {
    return NextResponse.json({ error: "Missing variantId" }, { status: 400 });
  }

  const data = await shopifyFetch<CartCreateMutation>({
    query: CART_CREATE,
    variables: {
      lines: [{ merchandiseId: variantId, quantity: Math.max(1, quantity) }],
    },
    cache: "no-store",
  });

  const err = data.cartCreate.userErrors?.[0]?.message;
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const checkoutUrl = data.cartCreate.cart?.checkoutUrl;
  if (!checkoutUrl) return NextResponse.json({ error: "No checkoutUrl" }, { status: 500 });

  // Redirect para checkout Shopify
  return NextResponse.redirect(checkoutUrl, { status: 303 });
}
