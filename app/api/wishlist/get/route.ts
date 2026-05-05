import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type WishlistItem = {
  sku: string;
  slug?: string;
  title: string;
  price: number;
  brand?: string;
  image?: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userKey = searchParams.get("userKey");

    if (!userKey) {
      return NextResponse.json([], { status: 200 });
    }

    const items: WishlistItem[] = [];

    return NextResponse.json(items, { status: 200 });
  } catch (error) {
    console.error("wishlist get error:", error);
    return NextResponse.json([], { status: 200 });
  }
}