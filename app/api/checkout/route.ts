// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import { cartCreate, cartLinesAdd } from "@/lib/shopifyCart";

export async function POST(req: Request) {
  try {
    const { variantId, quantity = 1 } = await req.json();

    if (!variantId) {
      return NextResponse.json({ error: "Missing variantId" }, { status: 400 });
    }

    const cart = await cartCreate();
    const updated = await cartLinesAdd({
      cartId: cart.id,
      variantId,
      quantity: Number(quantity || 1),
    });

    // Redireciona já para o checkout Shopify (NEW)
    return NextResponse.redirect(updated.checkoutUrl, 303);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Checkout error" },
      { status: 500 }
    );
  }
}
