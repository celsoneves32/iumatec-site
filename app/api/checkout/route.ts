import { NextResponse } from "next/server";
import { shopifyFetch } from "@/lib/shopify";

type Body = {
  variantId: string;
  quantity?: number;
};

export async function POST(req: Request) {
  const { variantId, quantity = 1 } = (await req.json()) as Body;

  if (!variantId) {
    return NextResponse.json({ error: "Missing variantId" }, { status: 400 });
  }

  const mutation = `
    mutation CreateCheckout($lines: [CheckoutLineItemInput!]!) {
      checkoutCreate(input: { lineItems: $lines }) {
        checkout {
          webUrl
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyFetch<{
    checkoutCreate: {
      checkout?: { webUrl: string };
      userErrors: { message: string }[];
    };
  }>({
    query: mutation,
    variables: {
      lines: [{ variantId, quantity }],
    },
    cache: "no-store",
  });

  const errors = data.checkoutCreate.userErrors;
  if (errors?.length) {
    return NextResponse.json({ error: errors[0].message }, { status: 400 });
  }

  const url = data.checkoutCreate.checkout?.webUrl;
  if (!url) {
    return NextResponse.json({ error: "No checkout URL" }, { status: 500 });
  }

  return NextResponse.json({ url });
}
