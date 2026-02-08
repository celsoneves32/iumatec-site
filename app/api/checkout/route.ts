// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { shopifyFetch } from "@/lib/shopify";

type CartCreateResponse = {
  cartCreate: {
    cart: { id: string; checkoutUrl: string } | null;
    userErrors: { field?: string[]; message: string }[];
  };
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const variantId = body?.variantId as string | undefined;
    const quantity = Number(body?.quantity ?? 1);

    if (!variantId) {
      return NextResponse.json({ error: "Missing variantId" }, { status: 400 });
    }

    const q = `
      mutation CartCreate($input: CartInput!) {
        cartCreate(input: $input) {
          cart {
            id
            checkoutUrl
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const data = await shopifyFetch<CartCreateResponse>({
      query: q,
      variables: {
        input: {
          lines: [
            {
              merchandiseId: variantId,
              quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
            },
          ],
        },
      },
      cache: "no-store",
    });

    const errors = data.cartCreate.userErrors;
    if (errors?.length) {
      return NextResponse.json({ error: errors[0].message }, { status: 400 });
    }

    const checkoutUrl = data.cartCreate.cart?.checkoutUrl;
    if (!checkoutUrl) {
      return NextResponse.json({ error: "No checkoutUrl returned" }, { status: 500 });
    }

    // fetch() no browser vai seguir o redirect; res.redirected = true e res.url = checkoutUrl
    return NextResponse.redirect(checkoutUrl, { status: 303 });
  } catch (e) {
    console.error("checkout route error:", e);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
