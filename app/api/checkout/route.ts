// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { shopifyFetch } from "@/lib/shopify";

type Body = { variantId: string; quantity?: number };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;

  const variantId = body?.variantId;
  const quantity = Math.max(1, Math.min(99, Number(body?.quantity ?? 1)));

  if (!variantId) {
    return NextResponse.json({ error: "Missing variantId" }, { status: 400 });
  }

  const mutation = `
    mutation CheckoutCreate($input: CheckoutCreateInput!) {
      checkoutCreate(input: $input) {
        checkout { webUrl }
        userErrors { message }
      }
    }
  `;

  const data = await shopifyFetch<{
    checkoutCreate: {
      checkout: { webUrl: string } | null;
      userErrors: { message: string }[];
    };
  }>({
    query: mutation,
    variables: {
      input: {
        lineItems: [{ variantId, quantity }],
      },
    },
    cache: "no-store",
  });

  const err = data.checkoutCreate.userErrors?.[0]?.message;
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const url = data.checkoutCreate.checkout?.webUrl;
  if (!url) return NextResponse.json({ error: "No checkout URL" }, { status: 500 });

  return NextResponse.json({ url });
}
