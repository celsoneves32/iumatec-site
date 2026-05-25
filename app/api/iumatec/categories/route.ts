import { NextResponse } from "next/server";
import { getPurchasableProducts } from "@/lib/productData";

export async function GET() {
  const products = getPurchasableProducts();

  const map = new Map<string, Set<string>>();

  for (const product of products) {
    const category = product.category || "Zubehör";
    const subcategory = product.subcategory || "Sonstiges Zubehör";

    if (!map.has(category)) {
      map.set(category, new Set());
    }

    map.get(category)?.add(subcategory);
  }

  const categories = Array.from(map.entries())
    .map(([name, subcategories]) => ({
      name,
      count: products.filter((product) => product.category === name).length,
      subcategories: Array.from(subcategories)
        .sort()
        .map((subcategory) => ({
          name: subcategory,
          count: products.filter(
            (product) =>
              product.category === name && product.subcategory === subcategory
          ).length,
        })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({
    ok: true,
    total: categories.length,
    categories,
  });
}