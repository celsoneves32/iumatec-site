import { NextResponse } from "next/server";
import { getPurchasableProducts } from "@/lib/productData";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const products = getPurchasableProducts(6000);

  const categoryMap = new Map<
    string,
    {
      count: number;
      subcategories: Map<string, number>;
    }
  >();

  for (const product of products) {
    const category = product.category || "Zubehör";
    const subcategory = product.subcategory || "Sonstiges Zubehör";

    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        count: 0,
        subcategories: new Map<string, number>(),
      });
    }

    const entry = categoryMap.get(category)!;

    entry.count += 1;
    entry.subcategories.set(
      subcategory,
      (entry.subcategories.get(subcategory) || 0) + 1
    );
  }

  const categories = Array.from(categoryMap.entries())
    .map(([name, entry]) => ({
      name,
      count: entry.count,
      subcategories: Array.from(entry.subcategories.entries())
        .map(([name, count]) => ({
          name,
          count,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({
    ok: true,
    total: categories.length,
    categories,
  });
}