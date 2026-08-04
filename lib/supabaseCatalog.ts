import "server-only";
import { createClient } from "@supabase/supabase-js";

export type Product = {
  sku: string; slug: string; title: string; brand?: string; price: number;
  image?: string | null; images?: string[]; category?: string; subcategory?: string;
  description?: string; description2?: string; ean?: string; internalNumber?: string;
  inStock?: boolean; stockQty?: number; deliveryDate?: string | null;
  merchandiseId?: string | null; shopifyProductHandle?: string | null;
  shopifyProductId?: string | null; shopifyVariantId?: string | null;
  shopifySyncStatus?: string | null; energyLabel?: unknown;
};

export type CatalogQuery = {
  q?: string; category?: string; subcategory?: string; brands?: string[];
  minPrice?: number; maxPrice?: number; inStock?: boolean;
  sort?: "featured" | "price-desc" | "price-asc" | "title-asc" | "brand-asc";
  offset?: number; limit?: number;
};

export type CatalogFacet = { label: string; count: number };
export type CatalogResponse = {
  products: Product[]; total: number; catalogTotal: number; offset: number;
  limit: number; hasMore: boolean;
  facets: { categories: CatalogFacet[]; subcategories: CatalogFacet[];
    brands: CatalogFacet[]; available: number; minPrice: number; maxPrice: number };
};

const EMPTY_FACETS: CatalogResponse["facets"] = {
  categories: [], subcategories: [], brands: [], available: 0, minPrice: 0, maxPrice: 0,
};

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url) throw new Error("Missing env var: SUPABASE_URL");
  if (!secret) throw new Error("Missing env var: SUPABASE_SECRET_KEY");
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}

function cleanSearch(value: string) {
  return value.replace(/[,%()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
}

function mapProduct(row: Record<string, any>): Product {
  return {
    ...row,
    sku: String(row.sku ?? ""),
    slug: String(row.slug ?? ""),
    title: String(row.title ?? ""),
    stockQty: Number(row.stock_qty ?? row.stockQty ?? 0),
    inStock: Boolean(row.in_stock ?? row.inStock ?? Number(row.stock_qty ?? row.stockQty ?? 0) > 0),
    merchandiseId: row.merchandise_id ?? row.merchandiseId ?? null,
    shopifyProductHandle: row.shopify_product_handle ?? row.shopifyProductHandle ?? null,
    shopifyProductId: row.shopify_product_id ?? row.shopifyProductId ?? null,
    shopifyVariantId: row.shopify_variant_id ?? row.shopifyVariantId ?? null,
    shopifySyncStatus: row.shopify_sync_status ?? row.shopifySyncStatus ?? null,
    internalNumber: row.internal_number ?? row.internalNumber,
    deliveryDate: row.delivery_date ?? row.deliveryDate ?? null,
    energyLabel: row.energy_label ?? row.energyLabel,
    price: Number(row.price ?? 0),
  };
}

/** Fast path: fetches only the visible page and its exact result count. */
export async function queryCatalogProducts(query: CatalogQuery = {}): Promise<CatalogResponse> {
  const offset = Math.max(0, Math.trunc(Number(query.offset || 0)));
  const limit = Math.min(48, Math.max(1, Math.trunc(Number(query.limit || 24))));
  let request = getSupabase().from("products").select("*", { count: "exact" });
  const search = cleanSearch(query.q || "");
  if (search) {
    const pattern = `*${search}*`;
    request = request.or([
      `title.ilike.${pattern}`, `brand.ilike.${pattern}`, `sku.ilike.${pattern}`,
      `ean.ilike.${pattern}`, `category.ilike.${pattern}`, `subcategory.ilike.${pattern}`,
    ].join(","));
  }
  if (query.category && query.category !== "Alle") request = request.eq("category", query.category);
  if (query.subcategory && query.subcategory !== "Alle") request = request.eq("subcategory", query.subcategory);
  if (query.brands?.length) request = request.in("brand", query.brands.filter(Boolean));
  if (Number.isFinite(query.minPrice)) request = request.gte("price", Number(query.minPrice));
  if (Number.isFinite(query.maxPrice)) request = request.lte("price", Number(query.maxPrice));
  if (query.inStock) request = request.gt("stock_qty", 0);

  switch (query.sort) {
    case "price-desc": request = request.order("price", { ascending: false }); break;
    case "price-asc": request = request.order("price", { ascending: true }); break;
    case "title-asc": request = request.order("title", { ascending: true }); break;
    case "brand-asc": request = request.order("brand", { ascending: true }).order("title", { ascending: true }); break;
    default: request = request.order("stock_qty", { ascending: false }).order("title", { ascending: true });
  }

  const { data, error, count } = await request.range(offset, offset + limit - 1);
  if (error) throw new Error(`Supabase fast catalog query failed: ${error.message}`);
  const total = count || 0;
  return { products: (data || []).map(mapProduct), total, catalogTotal: total,
    offset, limit, hasMore: offset + limit < total, facets: EMPTY_FACETS };
}

/** Full path used for initial SSR and for refreshing filter counters. */
export async function queryCatalog(query: CatalogQuery = {}): Promise<CatalogResponse> {
  const offset = Math.max(0, Math.trunc(Number(query.offset || 0)));
  const limit = Math.min(48, Math.max(1, Math.trunc(Number(query.limit || 24))));
  const { data, error } = await getSupabase().rpc("query_products_catalog", {
    p_q: query.q?.trim() || null,
    p_category: query.category && query.category !== "Alle" ? query.category : null,
    p_subcategory: query.subcategory && query.subcategory !== "Alle" ? query.subcategory : null,
    p_brands: query.brands?.filter(Boolean) || [],
    p_min_price: Number.isFinite(query.minPrice) ? Number(query.minPrice) : null,
    p_max_price: Number.isFinite(query.maxPrice) ? Number(query.maxPrice) : null,
    p_in_stock: Boolean(query.inStock), p_sort: query.sort || "featured",
    p_offset: offset, p_limit: limit,
  });
  if (error) throw new Error(`Supabase catalog query failed: ${error.message}`);
  return data as CatalogResponse;
}
