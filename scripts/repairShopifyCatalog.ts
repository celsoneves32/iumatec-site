import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

type CatalogItem = Record<string, any>;

const SHOPIFY_STORE_DOMAIN =
  process.env.SHOPIFY_STORE_DOMAIN || process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;

const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

const SHOPIFY_ADMIN_API_VERSION =
  process.env.SHOPIFY_ADMIN_API_VERSION || "2025-04";

const CATALOG_PATH = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "out",
  "iumatec-catalog-filtered.json"
);

const OUTPUT_PATH = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "out",
  "iumatec-catalog-filtered.repaired.json"
);

if (!SHOPIFY_STORE_DOMAIN) {
  throw new Error("Missing env var: SHOPIFY_STORE_DOMAIN");
}

if (!SHOPIFY_ADMIN_ACCESS_TOKEN) {
  throw new Error("Missing env var: SHOPIFY_ADMIN_ACCESS_TOKEN");
}

function adminUrl() {
  return `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_ADMIN_API_VERSION}/graphql.json`;
}

async function shopifyAdminFetch(query: string, variables?: Record<string, unknown>) {
  const res = await fetch(adminUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": SHOPIFY_ADMIN_ACCESS_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await res.text();

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Invalid Shopify Admin JSON (${res.status})`);
  }

  if (!res.ok) {
    throw new Error(`Shopify Admin HTTP ${res.status}: ${text}`);
  }

  if (json.errors?.length) {
    throw new Error(
      json.errors.map((e: any) => e?.message).filter(Boolean).join(" | ") ||
        "Unknown Shopify Admin GraphQL error"
    );
  }

  return json;
}

function normalizeVariantGid(value?: string | null) {
  if (!value || typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("gid://shopify/ProductVariant/")) {
    return trimmed;
  }

  const numeric = trimmed.replace(/[^\d]/g, "");
  if (!numeric) return null;

  return `gid://shopify/ProductVariant/${numeric}`;
}

function normalizeHandle(value?: string | null) {
  if (!value || typeof value !== "string") return null;

  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;

  return trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "und")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function getVariantById(variantId: string) {
  const query = `
    query VariantById($id: ID!) {
      productVariant(id: $id) {
        id
        title
        displayName
        product {
          id
          title
          handle
          status
        }
      }
    }
  `;

  const json = await shopifyAdminFetch(query, { id: variantId });
  return json?.data?.productVariant ?? null;
}

async function getProductByHandle(handle: string) {
  const query = `
    query ProductByHandleSearch($query: String!) {
      products(first: 1, query: $query) {
        edges {
          node {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  displayName
                }
              }
            }
          }
        }
      }
    }
  `;

  const json = await shopifyAdminFetch(query, {
    query: `handle:${handle}`,
  });

  return json?.data?.products?.edges?.[0]?.node ?? null;
}

async function repairItem(item: CatalogItem) {
  const existingVariantId = normalizeVariantGid(
    item.merchandiseId || item.shopifyVariantId
  );

  const existingHandle = normalizeHandle(item.shopifyProductHandle || item.handle);

  if (existingVariantId) {
    try {
      const variant = await getVariantById(existingVariantId);

      if (variant?.id && variant?.product?.handle) {
        return {
          ...item,
          shopifyMatchStatus: "variant-valid",
          merchandiseId: variant.id,
          shopifyVariantId: variant.id.replace("gid://shopify/ProductVariant/", ""),
          shopifyProductId: variant.product.id,
          shopifyProductHandle: variant.product.handle,
          shopifyProductTitle: variant.product.title,
        };
      }
    } catch {
      // segue para fallback por handle
    }
  }

  if (existingHandle) {
    try {
      const product = await getProductByHandle(existingHandle);

      const firstVariant = product?.variants?.edges?.[0]?.node;

      if (product?.id && firstVariant?.id) {
        return {
          ...item,
          shopifyMatchStatus: "resolved-by-handle",
          merchandiseId: firstVariant.id,
          shopifyVariantId: firstVariant.id.replace("gid://shopify/ProductVariant/", ""),
          shopifyProductId: product.id,
          shopifyProductHandle: product.handle,
          shopifyProductTitle: product.title,
        };
      }
    } catch {
      // continua para not-found
    }
  }

  return {
    ...item,
    shopifyMatchStatus: "not-found",
    merchandiseId: "",
    shopifyVariantId: "",
  };
}

async function main() {
  if (!fs.existsSync(CATALOG_PATH)) {
    throw new Error(`Catalog file not found: ${CATALOG_PATH}`);
  }

  const raw = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));

  if (!Array.isArray(raw)) {
    throw new Error("Catalog JSON is not an array");
  }

  const repaired: CatalogItem[] = [];
  let ok = 0;
  let notFound = 0;

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i] as CatalogItem;
    const title = String(item.title || item.fullTitle || item.sku || `item-${i}`);

    try {
      const next = await repairItem(item);
      repaired.push(next);

      if (next.shopifyMatchStatus === "not-found") {
        notFound++;
        console.log(`[${i + 1}/${raw.length}] NOT FOUND -> ${title}`);
      } else {
        ok++;
        console.log(
          `[${i + 1}/${raw.length}] OK -> ${title} -> ${next.shopifyProductHandle} -> ${next.shopifyVariantId}`
        );
      }
    } catch (error) {
      notFound++;
      repaired.push({
        ...item,
        shopifyMatchStatus: "error",
        merchandiseId: "",
        shopifyVariantId: "",
      });

      console.log(
        `[${i + 1}/${raw.length}] ERROR -> ${title} -> ${
          error instanceof Error ? error.message : "unknown error"
        }`
      );
    }
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(repaired, null, 2), "utf8");

  const sellableOnly = repaired.filter(
    (item) => String(item.merchandiseId || "").trim() || String(item.shopifyVariantId || "").trim()
  );

  const sellableOnlyPath = path.join(
    process.cwd(),
    "integrations",
    "alltron",
    "out",
    "iumatec-catalog-filtered.sellable.json"
  );

  fs.writeFileSync(sellableOnlyPath, JSON.stringify(sellableOnly, null, 2), "utf8");

  console.log("");
  console.log("DONE");
  console.log(`Total: ${raw.length}`);
  console.log(`Valid / repaired: ${ok}`);
  console.log(`Not found / invalid: ${notFound}`);
  console.log(`Saved repaired: ${OUTPUT_PATH}`);
  console.log(`Saved sellable-only: ${sellableOnlyPath}`);
}

main().catch((error) => {
  console.error("repairShopifyCatalog failed:", error);
  process.exit(1);
});