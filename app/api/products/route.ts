import { NextRequest, NextResponse } from "next/server";
import { queryCatalog } from "@/lib/productData";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const number = (name: string) => {
    const value = params.get(name);
    return value === null || value === "" ? undefined : Number(value);
  };

  const result = queryCatalog({
    q: params.get("q") || undefined,
    category: params.get("category") || undefined,
    subcategory: params.get("subcategory") || undefined,
    brands: params.getAll("brand"),
    minPrice: number("minPrice"),
    maxPrice: number("maxPrice"),
    inStock: params.get("inStock") === "1",
    sort: (params.get("sort") || "featured") as any,
    offset: number("offset"),
    limit: number("limit"),
  });

  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
