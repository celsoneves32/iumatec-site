import "server-only";
import fs from "node:fs";
import path from "node:path";

export type StorefrontProduct = {
  id: string;
  handle: string;
  title: string;
  vendor?: string | null;
  price: number;
  image?: string | null;
  availableForSale: boolean;
  stockQty?: number | null;
  deliveryDate?: string | null;
  merchandiseId: string | null;
};

const domain =
  process.env.SHOPIFY_STORE_DOMAIN ||
  process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;

const storefrontAccessToken =
  process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ||
  process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

const apiVersion =
  process.env.SHOPIFY_API_VERSION ||
  process.env.NEXT_PUBLIC_SHOPIFY_API_VERSION ||
  "2025-04";

const CATALOG_PATHS = [
  path.join(process.cwd(), "integrations", "alltron", "out", "iumatec-catalog-sellable.json"),
  path.join(process.cwd(), "integrations", "alltron", "out", "iumatec-catalog-enriched.json"),
  path.join(process.cwd(), "integrations", "alltron", "out", "iumatec-catalog-filtered.json"),
];

function getShopifyUrl() {
  if (!domain) throw new Error("Missing env var: SHOPIFY_STORE_DOMAIN");
  if (!storefrontAccessToken) throw new Error("Missing env var: SHOPIFY_STOREFRONT_ACCESS_TOKEN");

  return `https://${domain}/api/${apiVersion}/graphql.json`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "und")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function firstString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();

  if (Array.isArray(value)) {
    const found = value.find((item) => typeof item === "string" && item.trim());
    return typeof found === "string" ? found.trim() : null;
  }

  return null;
}

function loadLocalCatalog() {
  for (const filePath of CATALOG_PATHS) {
    if (!fs.existsSync(filePath)) continue;

    try {
      const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
      if (Array.isArray(raw)) return raw;
    } catch {
      return [];
    }
  }

  return [];
}

const localCatalog = loadLocalCatalog();

function findLocalProductImage(handle: string, title: string): string | null {
  const cleanHandle = slugify(handle);
  const cleanTitle = slugify(title);

  const found = localCatalog.find((item: any) => {
    const itemHandle = slugify(
      String(item.shopifyProductHandle || item.handle || item.slug || "")
    );

    const itemTitle = slugify(
      String(item.title || item.fullTitle || item.shopifyProductTitle || "")
    );

    return itemHandle === cleanHandle || itemTitle === cleanTitle;
  });

  if (!found) return null;

  return (
    firstString(found.image) ||
    firstString(found.imageUrl) ||
    firstString(found.mainImage) ||
    firstString(found.featuredImage) ||
    firstString(found.shopifyFeaturedImage) ||
    firstString(found.images) ||
    firstString(found.imageUrls) ||
    null
  );
}

async function storefrontFetch(query: string, variables?: Record<string, unknown>) {
  const res = await fetch(getShopifyUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": storefrontAccessToken as string,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  const text = await res.text();

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Shopify Storefront invalid JSON (${res.status})`);
  }

  if (!res.ok) throw new Error(`Shopify Storefront HTTP ${res.status}`);

  if (json.errors?.length) {
    throw new Error(
      json.errors.map((e: any) => e?.message).filter(Boolean).join(" | ") ||
        "Unknown Storefront GraphQL error"
    );
  }

  return json;
}

function parsePrice(value?: string | null) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function mapProduct(node: any): StorefrontProduct | null {
  if (!node?.id || !node?.handle || !node?.title) return null;

  const variants =
    node?.variants?.edges?.map((edge: any) => edge?.node).filter(Boolean) ?? [];

  const availableVariant =
    variants.find((variant: any) => variant?.availableForSale && variant?.id) ??
    variants[0] ??
    null;

  const shopifyImage =
    node?.featuredImage?.url ??
    node?.images?.edges?.[0]?.node?.url ??
    availableVariant?.image?.url ??
    null;

  const localImage = findLocalProductImage(node.handle, node.title);

  const stockQty =
    typeof availableVariant?.quantityAvailable === "number"
      ? availableVariant.quantityAvailable
      : node?.availableForSale
      ? 999
      : 0;

  return {
    id: node.id,
    handle: node.handle,
    title: node.title,
    vendor: node.vendor ?? null,
    price: parsePrice(
      availableVariant?.price?.amount ?? node?.priceRange?.minVariantPrice?.amount
    ),
    image: shopifyImage ?? localImage,
    availableForSale: Boolean(node?.availableForSale || availableVariant?.availableForSale),
    stockQty,
    deliveryDate: null,
    merchandiseId: availableVariant?.id ?? null,
  };
}

export async function getStorefrontProducts(limit = 24): Promise<StorefrontProduct[]> {
  const query = `
    query GetProducts($first: Int!) {
      products(first: $first, sortKey: BEST_SELLING) {
        edges {
          node {
            id
            handle
            title
            vendor
            availableForSale
            featuredImage {
              url
              altText
            }
            images(first: 5) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  availableForSale
                  quantityAvailable
                  image {
                    url
                    altText
                  }
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const json = await storefrontFetch(query, { first: limit });

  const items =
    json?.data?.products?.edges
      ?.map((edge: any) => mapProduct(edge?.node))
      ?.filter(Boolean) ?? [];

  console.log("STORE_FRONT_PRODUCTS_COUNT", items.length);

  return items;
}