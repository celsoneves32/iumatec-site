import "server-only";
import fs from "node:fs";
import path from "node:path";
import { cache } from "react";

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
};

type CatalogRecord = Record<string, unknown>;

const CATALOG_PATHS = [
  path.join(
    process.cwd(),
    "integrations",
    "alltron",
    "out",
    "iumatec-catalog-sellable.json"
  ),
  path.join(
    process.cwd(),
    "integrations",
    "alltron",
    "out",
    "iumatec-catalog-filtered.json"
  ),
  path.join(process.cwd(), "data", "catalog.json"),
];

function getNestedValue(record: CatalogRecord, key: string): unknown {
  if (!key.includes(".")) {
    return record[key];
  }

  return key.split(".").reduce<unknown>((acc, part) => {
    if (
      acc &&
      typeof acc === "object" &&
      part in (acc as Record<string, unknown>)
    ) {
      return (acc as Record<string, unknown>)[part];
    }

    return undefined;
  }, record);
}

function pickString(record: CatalogRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = getNestedValue(record, key);

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return undefined;
}

function pickNumber(record: CatalogRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = getNestedValue(record, key);

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const normalized = value.replace(",", ".").replace(/[^\d.-]/g, "");
      const parsed = Number(normalized);

      if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0
      )
      .map((item) => item.trim());
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function slugifyValue(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "und")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function splitCategoryPath(input?: string): {
  category?: string;
  subcategory?: string;
} {
  if (!input) return {};

  const parts = input
    .split(/[>/|]/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return {};
  if (parts.length === 1) return { category: parts[0] };

  return {
    category: parts[0],
    subcategory: parts[1],
  };
}

function normalizeProductVariantGid(value?: string | null): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("gid://shopify/ProductVariant/")) {
    return trimmed;
  }

  const numeric = trimmed.replace(/[^\d]/g, "");
  if (!numeric) return null;

  return `gid://shopify/ProductVariant/${numeric}`;
}

function normalizeProductHandle(value?: string | null): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  return slugifyValue(trimmed);
}

function looksUnsafeMerchandiseId(value?: string | null) {
  if (!value) return true;
  return !value.startsWith("gid://shopify/ProductVariant/");
}

function resolveShopifyHandle(record: CatalogRecord): string | null {
  const handle = pickString(record, [
    "shopifyProductHandle",
    "shopifyHandle",
    "handle",
    "shopifyProduct.handle",
    "shopifyHandleFromSync",
    "matchedHandle",
  ]);

  return normalizeProductHandle(handle);
}

function resolveMerchandiseId(record: CatalogRecord): string | null {
  const directMerchandiseId = pickString(record, [
    "merchandiseId",
    "shopifyMerchandiseId",
    "variantGid",
    "shopifyVariantGid",
  ]);

  const normalizedDirect = normalizeProductVariantGid(directMerchandiseId);
  if (normalizedDirect) return normalizedDirect;

  const rawVariantId = pickString(record, [
    "shopifyVariantId",
    "variantId",
    "shopifyVariant.id",
  ]);

  const normalizedVariant = normalizeProductVariantGid(rawVariantId);
  if (normalizedVariant) return normalizedVariant;

  return null;
}

function resolveImages(record: CatalogRecord, mainImage?: string | null): string[] {
  const imageList = [
    ...toStringArray(getNestedValue(record, "images")),
    ...toStringArray(getNestedValue(record, "imageUrls")),
    ...toStringArray(getNestedValue(record, "gallery")),
    ...toStringArray(getNestedValue(record, "shopifyImages")),
  ].filter(Boolean);

  if (mainImage) {
    return [mainImage, ...imageList.filter((item) => item !== mainImage)];
  }

  return imageList;
}

function cleanupText(value?: string | null): string | undefined {
  if (!value) return undefined;
  const text = value.trim();
  return text || undefined;
}

function normalizeCategory(value?: string): string | undefined {
  if (!value) return undefined;

  const map: Record<string, string> = {
    computers: "Computer",
    computer: "Computer",
    mobile: "Mobile",
    phones: "Mobile",
    smartphones: "Mobile",
    peripherie: "Peripherie",
    peripherals: "Peripherie",
    netzwerk: "Netzwerk",
    networking: "Netzwerk",
    office: "Office & Business",
    "office-business": "Office & Business",
    printers: "Office & Business",
  };

  const key = slugifyValue(value);
  return map[key] || value;
}

function normalizeSubcategory(value?: string): string | undefined {
  if (!value) return undefined;

  const map: Record<string, string> = {
    laptops: "Laptops",
    notebooks: "Laptops",
    "desktop-pcs": "Desktop-PCs",
    desktops: "Desktop-PCs",
    pcs: "Desktop-PCs",
    grafikkarten: "Grafikkarten",
    gpus: "Grafikkarten",
    smartphones: "Smartphones",
    monitors: "Monitors",
    monitore: "Monitors",
    keyboards: "Keyboards",
    tastaturen: "Keyboards",
    routers: "Routers",
    drucker: "Printers",
    printers: "Printers",
  };

  const key = slugifyValue(value);
  return map[key] || value;
}

function mapRecordToProduct(record: CatalogRecord): Product | null {
  const title =
    pickString(record, [
      "title",
      "fullTitle",
      "name",
      "productTitle",
      "label",
      "beschreibung",
      "shopifyProductTitle",
    ]) ?? "";

  const sku =
    pickString(record, [
      "sku",
      "articleNumber",
      "articleNo",
      "id",
      "internalNumber",
    ]) ?? "";

  if (!title || !sku) {
    return null;
  }

  const shopifyProductHandle = resolveShopifyHandle(record);

  const slug = shopifyProductHandle || slugifyValue(title);

  const image =
    pickString(record, [
      "image",
      "imageUrl",
      "mainImage",
      "featuredImage",
      "shopifyFeaturedImage",
    ]) ?? null;

  const fullImages = resolveImages(record, image);

  const categoryPath =
    pickString(record, ["categoryPath", "breadcrumb", "path"]) ?? undefined;

  const splitFromPath = splitCategoryPath(categoryPath);

  const categoryRaw =
    pickString(record, [
      "iumatecCategory.main",
      "category",
      "cat1",
      "mainCategory",
    ]) ?? splitFromPath.category;

  const subcategoryRaw =
    pickString(record, [
      "iumatecCategory.sub",
      "subcategory",
      "cat2",
      "subCategory",
    ]) ?? splitFromPath.subcategory;

  const category = normalizeCategory(categoryRaw);
  const subcategory = normalizeSubcategory(subcategoryRaw);

  const stockQty =
    pickNumber(record, ["stock", "stockQty", "quantity", "availableQty"]) ?? 0;

  const rawInStock = getNestedValue(record, "inStock");
  const inStock =
    typeof rawInStock === "boolean" ? rawInStock : stockQty > 0;

  const merchandiseIdRaw = resolveMerchandiseId(record);
  const merchandiseId = looksUnsafeMerchandiseId(merchandiseIdRaw)
    ? null
    : merchandiseIdRaw;

  return {
    sku,
    slug,
    title,
    brand: cleanupText(pickString(record, ["brand", "manufacturer"])),
    price:
      pickNumber(record, ["price", "salePrice", "grossPrice", "finalPrice"]) ?? 0,
    image,
    images: fullImages,
    category,
    subcategory,
    description: cleanupText(
      pickString(record, ["description", "shortDescription"])
    ),
    description2: cleanupText(
      pickString(record, ["description2", "longDescription"])
    ),
    ean: cleanupText(pickString(record, ["ean", "gtin"])),
    internalNumber: cleanupText(
      pickString(record, ["internalNumber", "articleNumber", "articleNo"])
    ),
    inStock,
    stockQty,
    deliveryDate:
      pickString(record, ["deliveryDate", "eta", "availableFrom"]) ?? null,
    merchandiseId,
    shopifyProductHandle,
    shopifyProductId: cleanupText(pickString(record, ["shopifyProductId"])),
    shopifyVariantId: cleanupText(
      pickString(record, ["shopifyVariantId", "variantId"])
    ),
  };
}

function scoreProduct(product: Product): number {
  let score = 0;

  if (product.shopifyProductHandle) score += 500;
  if (product.merchandiseId) score += 300;
  if ((product.stockQty ?? 0) > 0) score += 100;
  if ((product.images?.length ?? 0) > 0) score += 50;
  if ((product.price ?? 0) > 0) score += 20;
  if (product.description) score += 10;

  return score;
}

const loadAllProducts = cache((): Product[] => {
  let raw: unknown = [];

  for (const filePath of CATALOG_PATHS) {
    if (fs.existsSync(filePath)) {
      const file = fs.readFileSync(filePath, "utf8");
      raw = JSON.parse(file);
      break;
    }
  }

  if (!Array.isArray(raw)) {
    console.warn("productData: catalog file not found or invalid array");
    return [];
  }

  const mapped = raw
    .map((item) => mapRecordToProduct(item as CatalogRecord))
    .filter((item): item is Product => Boolean(item));

  const uniqueBySlug = new Map<string, Product>();

  for (const product of mapped) {
    const existing = uniqueBySlug.get(product.slug);

    if (!existing) {
      uniqueBySlug.set(product.slug, product);
      continue;
    }

    if (scoreProduct(product) > scoreProduct(existing)) {
      uniqueBySlug.set(product.slug, product);
    }
  }

  return Array.from(uniqueBySlug.values());
});

export function getAllProducts(): Product[] {
  return loadAllProducts();
}

export function getAllProductSlugs(): string[] {
  return loadAllProducts().map((product) => product.slug);
}

export function getProductBySlug(slug: string): Product | undefined {
  return loadAllProducts().find((product) => product.slug === slug);
}

export function getProductsByCategory(category?: string): Product[] {
  if (!category) return loadAllProducts();

  return loadAllProducts().filter((product) => product.category === category);
}

export function getProductsBySubcategory(
  category?: string,
  subcategory?: string
): Product[] {
  return loadAllProducts().filter((product) => {
    const matchesCategory = !category || product.category === category;
    const matchesSubcategory = !subcategory || product.subcategory === subcategory;
    return matchesCategory && matchesSubcategory;
  });
}

export function searchProducts(query?: string): Product[] {
  const q = (query || "").trim().toLowerCase();
  if (!q) return loadAllProducts();

  return loadAllProducts().filter((product) => {
    return (
      product.title.toLowerCase().includes(q) ||
      (product.brand || "").toLowerCase().includes(q) ||
      product.sku.toLowerCase().includes(q) ||
      (product.category || "").toLowerCase().includes(q) ||
      (product.subcategory || "").toLowerCase().includes(q) ||
      (product.shopifyProductHandle || "").toLowerCase().includes(q)
    );
  });
}

export function getFeaturedProducts(limit = 8): Product[] {
  return [...loadAllProducts()]
    .sort((a, b) => scoreProduct(b) - scoreProduct(a))
    .slice(0, limit);
}

export function getPurchasableProducts(limit?: number): Product[] {
  const items = loadAllProducts().filter(
    (product) =>
      Boolean(product.shopifyProductHandle || product.merchandiseId) &&
      Boolean((product.stockQty ?? 0) > 0 || product.inStock)
  );

  return typeof limit === "number" ? items.slice(0, limit) : items;
}

export function getRelatedProducts(
  currentSlug: string,
  category?: string,
  limit = 4
): Product[] {
  const all = loadAllProducts().filter((product) => product.slug !== currentSlug);

  const sameCategory = category
    ? all.filter((product) => product.category === category)
    : all;

  return [...(sameCategory.length ? sameCategory : all)]
    .sort((a, b) => {
      const scoreDiff = scoreProduct(b) - scoreProduct(a);
      if (scoreDiff !== 0) return scoreDiff;

      return (a.price ?? 0) - (b.price ?? 0);
    })
    .slice(0, limit);
}