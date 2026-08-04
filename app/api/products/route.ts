import { NextRequest, NextResponse } from "next/server";
import { queryCatalog, queryCatalogProducts } from "@/lib/supabaseCatalog";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const number = (name: string) => {
      const value = params.get(name); if (!value) return undefined;
      const parsed = Number(value); return Number.isFinite(parsed) ? parsed : undefined;
    };
    const query = {
      q: params.get("q") || undefined, category: params.get("category") || undefined,
      subcategory: params.get("subcategory") || undefined, brands: params.getAll("brand"),
      minPrice: number("minPrice"), maxPrice: number("maxPrice"),
      inStock: params.get("inStock") === "1",
      sort: (params.get("sort") || "featured") as "featured" | "price-desc" | "price-asc" | "title-asc" | "brand-asc",
      offset: number("offset"), limit: number("limit"),
    };
    const result = params.get("facets") === "1"
      ? await queryCatalog(query)
      : await queryCatalogProducts(query);
    return NextResponse.json(result, { headers: {
      "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
    }});
  } catch (error) {
    console.error("GET /api/products error:", error);
    return NextResponse.json({ error: "Der Produktkatalog konnte nicht geladen werden." }, { status: 500 });
  }
}
