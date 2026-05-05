import { NextRequest, NextResponse } from "next/server";
import { shopifyFetch } from "@/lib/shopify";
import { CART_FRAGMENT, normalizeShopifyCart } from "@/lib/shopify-cart";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const cartId = body?.cartId as string | undefined;
    const lineId = body?.lineId as string | undefined;
    const quantity = Number(body?.quantity ?? 1);

    if (!cartId || !lineId) {
      return NextResponse.json(
        { ok: false, error: "Missing cartId or lineId" },
        { status: 400 }
      );
    }

    const data = await shopifyFetch<{
      cartLinesUpdate: {
        cart: any | null;
        userErrors: Array<{
          field: string[] | null;
          message: string;
        }>;
      };
    }>({
      query: `
        mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
          cartLinesUpdate(cartId: $cartId, lines: $lines) {
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
        lines: [
          {
            id: lineId,
            quantity,
          },
        ],
      },
    });

    if (data.cartLinesUpdate.userErrors.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: data.cartLinesUpdate.userErrors.map((e) => e.message).join(" | "),
        },
        { status: 400 }
      );
    }

    if (!data.cartLinesUpdate.cart) {
      return NextResponse.json(
        { ok: false, error: "Could not update cart item" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      cart: normalizeShopifyCart(data.cartLinesUpdate.cart),
    });
  } catch (error) {
    console.error("cart update error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}