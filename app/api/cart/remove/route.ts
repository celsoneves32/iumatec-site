import { NextRequest, NextResponse } from "next/server";
import { shopifyFetch } from "@/lib/shopify";
import { CART_FRAGMENT, normalizeShopifyCart } from "@/lib/shopify-cart";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const cartId = body?.cartId as string | undefined;
    const lineId = body?.lineId as string | undefined;

    if (!cartId || !lineId) {
      return NextResponse.json(
        { ok: false, error: "Missing cartId or lineId" },
        { status: 400 }
      );
    }

    const data = await shopifyFetch<{
      cartLinesRemove: {
        cart: any | null;
        userErrors: Array<{
          field: string[] | null;
          message: string;
        }>;
      };
    }>({
      query: `
        mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
          cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
            cart {
              ${CART_FRAGMENT}
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      variables: {
        cartId,
        lineIds: [lineId],
      },
    });

    if (data.cartLinesRemove.userErrors.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: data.cartLinesRemove.userErrors.map((e) => e.message).join(" | "),
        },
        { status: 400 }
      );
    }

    if (!data.cartLinesRemove.cart) {
      return NextResponse.json(
        { ok: false, error: "Could not remove cart item" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      cart: normalizeShopifyCart(data.cartLinesRemove.cart),
    });
  } catch (error) {
    console.error("cart remove error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}