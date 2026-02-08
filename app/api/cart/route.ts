// app/api/cart/route.ts
import { NextResponse } from "next/server";
import {
  cartCreate,
  cartGet,
  cartLinesAdd,
  cartLinesRemove,
  cartLinesUpdate,
} from "@/lib/shopifyCart";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const action = body?.action as string;

    if (action === "create") {
      const cart = await cartCreate();
      return NextResponse.json(cart);
    }

    if (action === "get") {
      const cart = await cartGet(body.cartId);
      return NextResponse.json(cart);
    }

    if (action === "add") {
      const cart = await cartLinesAdd({
        cartId: body.cartId,
        variantId: body.variantId,
        quantity: Number(body.quantity || 1),
      });
      return NextResponse.json(cart);
    }

    if (action === "update") {
      const cart = await cartLinesUpdate({
        cartId: body.cartId,
        lineId: body.lineId,
        quantity: Number(body.quantity || 1),
      });
      return NextResponse.json(cart);
    }

    if (action === "remove") {
      const cart = await cartLinesRemove({
        cartId: body.cartId,
        lineId: body.lineId,
      });
      return NextResponse.json(cart);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Cart API error" },
      { status: 500 }
    );
  }
}
