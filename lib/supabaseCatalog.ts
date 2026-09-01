import "server-only";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

export type Product = {
  sku: string;
  slug: string;
  title: string;
  brand?: string;
  price: number;
  image?: string | null;
  images?: string[];
  category?: string;
  subcategory?: string;
  description?: string;
  description2?: string;
  ean?: string;
  internalNumber?: string;
  inStock?: boolean;
  stockQty?: number;
  deliveryDate?: string | null;
  merchandiseId?: string | null;
  shopifyProductHandle?: string | null;
  shopifyProductId?: string | null;
  shopifyVariantId?: string | null;
  shopifySyncStatus?: string | null;
  energyLabel?: {
    class?: string | null;
    labelUrl?: string | null;
    productDataSheetUrl?: string | null;
  } | null;
};

export type CatalogQuery = {
  q?: string;
  category?: string;
  subcategory?: string;
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: "featured" | "price-desc" | "price-asc" | "title-asc" | "brand-asc";
  offset?: number;
  limit?: number;
};

export type CatalogFacet = { label: string; count: number };

export type CatalogResponse = {
  products: Product[];
  total: number;
  catalogTotal: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  facets: {
    categories: CatalogFacet[];
    subcategories: CatalogFacet[];
    brands: CatalogFacet[];
    available: number;
    minPrice: number;
    maxPrice: number;
  };
};

const EMPTY_FACETS: CatalogResponse["facets"] = {
  categories: [],
  subcategories: [],
  brands: [],
  available: 0,
  minPrice: 0,
  maxPrice: 0,
};

const PRODUCT_CACHE_SECONDS = 300;
const SECONDARY_CACHE_SECONDS = 600;

// Product cards only need these fields. Avoid transferring descriptions,
// specifications and full image galleries for every catalog result.
const CATALOG_COLUMNS = [
  "sku", "slug", "title", "brand", "price", "image", "category",
  "subcategory", "in_stock", "stock_qty", "merchandise_id",
  "shopify_product_handle", "shopify_variant_id", "shopify_sync_status",
].join(",");

const VARIANT_COLUMNS = [
  "sku", "slug", "title", "brand", "price", "image", "images",
  "category", "subcategory", "description", "description2", "in_stock",
  "stock_qty", "merchandise_id", "shopify_product_handle",
  "shopify_variant_id", "shopify_sync_status",
].join(",");

const RELATED_COLUMNS = [
  "sku", "slug", "title", "brand", "price", "image", "images",
  "category", "subcategory", "in_stock", "stock_qty", "merchandise_id",
  "shopify_product_handle", "shopify_variant_id", "shopify_sync_status",
].join(",");

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing env var: SUPABASE_URL");
  if (!secret) throw new Error("Missing env var: SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function cleanSearch(value: string) {
  return value
    .replace(/[,%()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

type ProductRow = Record<string, unknown>;

function stringValue(row: ProductRow, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function numberValue(row: ProductRow, ...keys: string[]): number {
  for (const key of keys) {
    const value = row[key];
    const parsed = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function mapProduct(row: ProductRow): Product {
  const rawImages = row.images;
  const images = Array.isArray(rawImages)
    ? rawImages.map(String).filter((url) => url.startsWith("http"))
    : [];
  const image =
    stringValue(row, "image", "image_url", "imageUrl") || images[0] || null;
  const stockQty = numberValue(row, "stock_qty", "stockQty", "stock");

  return {
    sku: stringValue(row, "sku") || "",
    slug: stringValue(row, "slug", "shopify_product_handle", "shopifyProductHandle") || "",
    title: stringValue(row, "title") || "Produkt",
    brand: stringValue(row, "brand"),
    price: numberValue(row, "price"),
    image,
    images: Array.from(new Set([...(image ? [image] : []), ...images])),
    category: stringValue(row, "category"),
    subcategory: stringValue(row, "subcategory"),
    description: stringValue(row, "description"),
    description2: stringValue(row, "description2", "description_2"),
    ean: stringValue(row, "ean"),
    internalNumber: stringValue(row, "internal_number", "internalNumber"),
    inStock:
      typeof row.in_stock === "boolean"
        ? row.in_stock
        : typeof row.inStock === "boolean"
          ? row.inStock
          : stockQty > 0,
    stockQty,
    deliveryDate:
      stringValue(row, "delivery_date", "deliveryDate") || null,
    merchandiseId:
      stringValue(row, "merchandise_id", "merchandiseId") || null,
    shopifyProductHandle:
      stringValue(row, "shopify_product_handle", "shopifyProductHandle") || null,
    shopifyProductId:
      stringValue(row, "shopify_product_id", "shopifyProductId") || null,
    shopifyVariantId:
      stringValue(row, "shopify_variant_id", "shopifyVariantId") || null,
    shopifySyncStatus:
      stringValue(row, "shopify_sync_status", "shopifySyncStatus") || null,
    energyLabel:
      (row.energy_label as Product["energyLabel"]) ||
      (row.energyLabel as Product["energyLabel"]) ||
      null,
  };
}

function normalize(value?: string | null) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .trim();
}

function productFamilyKey(product: Product): string {
  const title = normalize(product.title)
    .replace(/\b(midnight|mitternacht|sky blue|sky-blue|silber|silver|schwarz|black|grau|gray|grey|blau|blue|weiss|white|gold|rose|rot|red|grun|green|starlight|space schwarz|space black)\b/g, "")
    .replace(/\b(64gb|128gb|256gb|512gb|1tb|2tb|4tb|8gb|16gb|24gb|32gb|64 gb|128 gb|256 gb|512 gb|1 tb|2 tb|4 tb|8 gb|16 gb|24 gb|32 gb)\b/g, "")
    .replace(/\b(wifi|wi-fi|5g|cellular|lte)\b/g, "")
    .replace(/[,/()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${normalize(product.brand)}-${title}`;
}

function sellable(query: any) {
  return query
    .or("shopify_sync_status.is.null,shopify_sync_status.neq.unmatched_shopify")
    .not("merchandise_id", "is", null)
    .gt("price", 0);
}

const getProductBySlugCached = unstable_cache(async (wanted: string) => {
  const { data, error } = await getSupabase()
    .from("products")
    .select("*")
    .eq("slug", wanted)
    .maybeSingle();

  if (error) throw new Error(`Produkt konnte nicht geladen werden: ${error.message}`);
  return data ? mapProduct(data as ProductRow) : null;
}, ["iumatec-product-by-slug-v1"], { revalidate: PRODUCT_CACHE_SECONDS });

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const wanted = decodeURIComponent(String(slug || "")).trim();
  if (!wanted) return null;
  return getProductBySlugCached(wanted);
}

const getProductVariantsCached = unstable_cache(async (
  product: Product,
  limit = 24,
): Promise<Product[]> => {
  if (!product.brand) return [product];

  let query = getSupabase()
    .from("products")
    .select(VARIANT_COLUMNS)
    .eq("brand", product.brand)
    .limit(120);
  query = sellable(query);
  const { data, error } = await query;

  if (error) {
    console.error("Supabase variants query failed:", error);
    return [product];
  }

  const key = productFamilyKey(product);
  const variants = (data || [])
    .map((row) => mapProduct(row as unknown as ProductRow))
    .filter((item) => productFamilyKey(item) === key);

  if (!variants.some((item) => item.slug === product.slug)) variants.push(product);
  return variants
    .sort((a, b) => a.slug === product.slug ? -1 : b.slug === product.slug ? 1 : a.price - b.price)
    .slice(0, Math.max(1, limit));
}, ["iumatec-product-variants-v1"], { revalidate: SECONDARY_CACHE_SECONDS });

export async function getProductVariants(
  product: Product,
  limit = 24,
): Promise<Product[]> {
  return getProductVariantsCached(product, limit);
}

const getRelatedProductsCached = unstable_cache(async (
  product: Product,
  limit = 8,
): Promise<Product[]> => {
  const client = getSupabase();
  const run = async (useSubcategory: boolean) => {
    let query = client
      .from("products")
      .select(RELATED_COLUMNS)
      .neq("slug", product.slug)
      .eq("category", product.category || "")
      .order("in_stock", { ascending: false })
      .order("price", { ascending: true })
      .limit(Math.max(limit, 12));
    if (useSubcategory && product.subcategory) {
      query = query.eq("subcategory", product.subcategory);
    }
    query = sellable(query);
    return query;
  };

  let { data, error } = await run(Boolean(product.subcategory));
  if (!error && (data?.length || 0) < limit && product.subcategory) {
    ({ data, error } = await run(false));
  }
  if (error) {
    console.error("Supabase related products query failed:", error);
    return [];
  }
  return (data || []).map((row) => mapProduct(row as unknown as ProductRow)).slice(0, limit);
}, ["iumatec-related-products-v1"], { revalidate: SECONDARY_CACHE_SECONDS });

export async function getRelatedProducts(
  product: Product,
  limit = 8,
): Promise<Product[]> {
  return getRelatedProductsCached(product, limit);
}

/** Fast path used by /api/products so visible results do not wait for facets. */
const SUBCATEGORY_ALIASES: Record<string, string[]> = {
  Monitore: ["Monitore", "Monitors"],
  RAM: ["RAM", "Arbeitsspeicher"],
  Switches: ["Switches", "Netzwerk-Switches"],
  Dockingstationen: ["Dockingstationen", "Docking & Hubs"],
  Steckdosen: ["Steckdosen", "Smarte Steckdosen"],
  Beleuchtung: ["Beleuchtung", "Smarte Beleuchtung"],
};

function subcategoryValues(value?: string | null): string[] {
  const clean = String(value || "").trim();
  if (!clean || clean === "Alle") return [];
  return SUBCATEGORY_ALIASES[clean] || [clean];
}

export async function queryCatalogProducts(
  query: CatalogQuery = {},
): Promise<CatalogResponse> {
  const offset = Math.max(0, Math.trunc(Number(query.offset || 0)));
  const limit = Math.min(48, Math.max(1, Math.trunc(Number(query.limit || 24))));
  let request = getSupabase().from("products").select(CATALOG_COLUMNS, { count: "exact" });
  const search = cleanSearch(query.q || "");

  if (search) {
    const pattern = `*${search}*`;
    request = request.or([
      `title.ilike.${pattern}`,
      `brand.ilike.${pattern}`,
      `sku.ilike.${pattern}`,
      `ean.ilike.${pattern}`,
      `category.ilike.${pattern}`,
      `subcategory.ilike.${pattern}`,
    ].join(","));
  }
  if (query.category && query.category !== "Alle") request = request.eq("category", query.category);
  if (query.subcategory && query.subcategory !== "Alle") {
    const values = subcategoryValues(query.subcategory);
    request = values.length > 1
      ? request.in("subcategory", values)
      : request.eq("subcategory", values[0]);
  }
  if (query.brands?.length) request = request.in("brand", query.brands.filter(Boolean));
  if (Number.isFinite(query.minPrice)) request = request.gte("price", Number(query.minPrice));
  if (Number.isFinite(query.maxPrice)) request = request.lte("price", Number(query.maxPrice));
  if (query.inStock) request = request.gt("stock_qty", 0);

  switch (query.sort) {
    case "price-desc": request = request.order("price", { ascending: false }); break;
    case "price-asc": request = request.order("price", { ascending: true }); break;
    case "title-asc": request = request.order("title", { ascending: true }); break;
    case "brand-asc": request = request.order("brand", { ascending: true }).order("title", { ascending: true }); break;
    default: request = request
      .order("in_stock", { ascending: false })
      .order("price", { ascending: true })
      .order("title", { ascending: true });
  }

  const { data, error, count } = await request.range(offset, offset + limit - 1);
  if (error) throw new Error(`Supabase fast catalog query failed: ${error.message}`);
  const total = count || 0;

  return {
    products: (data || []).map((row) => mapProduct(row as unknown as ProductRow)),
    total,
    catalogTotal: total,
    offset,
    limit,
    hasMore: offset + limit < total,
    facets: EMPTY_FACETS,
  };
}

export async function queryCatalog(
  query: CatalogQuery = {},
): Promise<CatalogResponse> {
  const offset = Math.max(0, Math.trunc(Number(query.offset || 0)));
  const limit = Math.min(48, Math.max(1, Math.trunc(Number(query.limit || 24))));
  const minPrice = Number.isFinite(query.minPrice) ? Number(query.minPrice) : null;
  const maxPrice = Number.isFinite(query.maxPrice) ? Number(query.maxPrice) : null;

  const { data, error } = await getSupabase().rpc("query_products_catalog", {
    p_q: query.q?.trim() || null,
    p_category:
      query.category && query.category !== "Alle" ? query.category : null,
    p_subcategory:
      query.subcategory && query.subcategory !== "Alle"
        ? query.subcategory
        : null,
    p_brands: query.brands?.filter(Boolean) || [],
    p_min_price: minPrice,
    p_max_price: maxPrice,
    p_in_stock: Boolean(query.inStock),
    p_sort: query.sort || "featured",
    p_offset: offset,
    p_limit: limit,
  });

  if (error) {
    console.error("Supabase catalog query failed:", error);
    throw new Error("Der Produktkatalog konnte nicht geladen werden.");
  }

  return data as CatalogResponse;
}
