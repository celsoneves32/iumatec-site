import { NextRequest, NextResponse } from "next/server";
import {
  getPurchasableProducts,
  searchProducts,
  type Product,
} from "@/lib/productData";

function normalize(value?: string | null) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function serializeProduct(product: Product) {
  return {
    sku: product.sku,
    slug: product.slug,
    title: product.title,
    brand: product.brand ?? null,
    price: product.price,
    image: product.image ?? null,
    images: product.images ?? [],
    category: product.category ?? null,
    subcategory: product.subcategory ?? null,
    inStock: Boolean((product.stockQty ?? 0) > 0 || product.inStock),
    stockQty: product.stockQty ?? 0,
    merchandiseId: product.merchandiseId ?? null,
    shopifyProductHandle: product.shopifyProductHandle ?? product.slug,
    energyLabel: product.energyLabel ?? null,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const q = searchParams.get("q") || "";
  const category = normalize(searchParams.get("category"));
  const subcategory = normalize(searchParams.get("subcategory"));
  const brand = normalize(searchParams.get("brand"));
  const limit = Math.min(Number(searchParams.get("limit") || 100), 500);

  let products = q ? searchProducts(q) : getPurchasableProducts();

  products = products.filter((product) => {
    const matchesCategory = category
      ? normalize(product.category) === category
      : true;

    const matchesSubcategory = subcategory
      ? normalize(product.subcategory) === subcategory
      : true;

    const matchesBrand = brand ? normalize(product.brand) === brand : true;

    return matchesCategory && matchesSubcategory && matchesBrand;
  });

  return NextResponse.json({
    ok: true,
    total: products.length,
    products: products.slice(0, limit).map(serializeProduct),
  });
}