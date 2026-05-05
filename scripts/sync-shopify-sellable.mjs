import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(ROOT, ".env.local"));
loadEnvFile(path.join(ROOT, ".env"));

const ADMIN_DOMAIN =
  process.env.SHOPIFY_STORE_DOMAIN ||
  process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;

const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const ADMIN_API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || "2025-04";

const STOREFRONT_TOKEN =
  process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ||
  process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

const STOREFRONT_API_VERSION =
  process.env.SHOPIFY_API_VERSION ||
  process.env.NEXT_PUBLIC_SHOPIFY_API_VERSION ||
  "2025-04";

if (!ADMIN_DOMAIN) {
  throw new Error("Missing SHOPIFY_STORE_DOMAIN");
}
if (!ADMIN_TOKEN) {
  throw new Error("Missing SHOPIFY_ADMIN_ACCESS_TOKEN");
}
if (!STOREFRONT_TOKEN) {
  throw new Error("Missing SHOPIFY_STOREFRONT_ACCESS_TOKEN");
}

const INPUT_PATH = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "iumatec-catalog-filtered.json"
);

const OUTPUT_DIR = path.join(ROOT, "integrations", "alltron", "out");
const ENRICHED_PATH = path.join(OUTPUT_DIR, "iumatec-catalog-enriched.json");
const SELLABLE_PATH = path.join(OUTPUT_DIR, "iumatec-catalog-sellable.json");
const REPORT_PATH = path.join(OUTPUT_DIR, "iumatec-sync-report.json");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/["']/g, "")
    .replace(/\s+/g, " ");
}

function normalizeSku(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeBarcode(value) {
  return String(value || "").replace(/[^\dA-Za-z]/g, "").trim();
}

function escapeGraphqlQueryValue(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function numericIdFromGid(gid) {
  const match = String(gid || "").match(/(\d+)$/);
  return match ? match[1] : "";
}

async function adminFetch(query, variables = {}) {
  const res = await fetch(
    `https://${ADMIN_DOMAIN}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": ADMIN_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Admin API returned invalid JSON (${res.status})`);
  }

  if (!res.ok) {
    throw new Error(`Admin API HTTP ${res.status}: ${text}`);
  }

  if (json.errors?.length) {
    throw new Error(
      json.errors.map((e) => e.message).filter(Boolean).join(" | ")
    );
  }

  return json.data;
}

async function storefrontFetch(query, variables = {}) {
  const res = await fetch(
    `https://${ADMIN_DOMAIN}/api/${STOREFRONT_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Storefront API returned invalid JSON (${res.status})`);
  }

  if (!res.ok) {
    throw new Error(`Storefront API HTTP ${res.status}: ${text}`);
  }

  if (json.errors?.length) {
    throw new Error(
      json.errors.map((e) => e.message).filter(Boolean).join(" | ")
    );
  }

  return json.data;
}

async function validateVariantOnStorefront(variantGid) {
  if (!variantGid) return { ok: false, reason: "missing-variant-gid" };

  const query = `
    query ValidateVariant($id: ID!) {
      node(id: $id) {
        ... on ProductVariant {
          id
          title
          availableForSale
          quantityAvailable
          product {
            id
            handle
            title
          }
        }
      }
    }
  `;

  const data = await storefrontFetch(query, { id: variantGid });
  const variant = data?.node;

  if (!variant?.id) {
    return { ok: false, reason: "variant-not-visible-on-storefront" };
  }

  return {
    ok: Boolean(variant.availableForSale),
    reason: variant.availableForSale
      ? "ok"
      : "variant-visible-but-not-available-for-sale",
    variant,
  };
}

async function findByVariantId(variantIdOrGid) {
  const gid = String(variantIdOrGid || "").startsWith("gid://shopify/")
    ? String(variantIdOrGid)
    : `gid://shopify/ProductVariant/${numericIdFromGid(variantIdOrGid)}`;

  if (!gid || !gid.includes("ProductVariant")) return null;

  const query = `
    query VariantById($id: ID!) {
      node(id: $id) {
        ... on ProductVariant {
          id
          sku
          barcode
          title
          product {
            id
            handle
            title
            status
          }
        }
      }
    }
  `;

  const data = await adminFetch(query, { id: gid });
  const variant = data?.node;
  if (!variant?.id || !variant?.product?.id) return null;

  return {
    matchType: "variant-id",
    productId: variant.product.id,
    productHandle: variant.product.handle,
    productTitle: variant.product.title,
    productStatus: variant.product.status,
    variantId: variant.id,
    variantTitle: variant.title,
    sku: variant.sku || "",
    barcode: variant.barcode || "",
  };
}

async function findBySku(sku) {
  const clean = normalizeSku(sku);
  if (!clean) return null;

  const query = `
    query VariantBySku($query: String!) {
      productVariants(first: 10, query: $query) {
        nodes {
          id
          sku
          barcode
          title
          product {
            id
            handle
            title
            status
          }
        }
      }
    }
  `;

  const data = await adminFetch(query, { query: `sku:${escapeGraphqlQueryValue(clean)}` });
  const nodes = data?.productVariants?.nodes || [];

  const exact = nodes.find((node) => normalizeSku(node?.sku) === clean);
  if (!exact?.id || !exact?.product?.id) return null;

  return {
    matchType: "sku",
    productId: exact.product.id,
    productHandle: exact.product.handle,
    productTitle: exact.product.title,
    productStatus: exact.product.status,
    variantId: exact.id,
    variantTitle: exact.title,
    sku: exact.sku || "",
    barcode: exact.barcode || "",
  };
}

async function findByBarcode(barcode) {
  const clean = normalizeBarcode(barcode);
  if (!clean) return null;

  const query = `
    query VariantByBarcode($query: String!) {
      productVariants(first: 10, query: $query) {
        nodes {
          id
          sku
          barcode
          title
          product {
            id
            handle
            title
            status
          }
        }
      }
    }
  `;

  const data = await adminFetch(query, { query: `barcode:${escapeGraphqlQueryValue(clean)}` });
  const nodes = data?.productVariants?.nodes || [];

  const exact = nodes.find((node) => normalizeBarcode(node?.barcode) === clean);
  if (!exact?.id || !exact?.product?.id) return null;

  return {
    matchType: "barcode",
    productId: exact.product.id,
    productHandle: exact.product.handle,
    productTitle: exact.product.title,
    productStatus: exact.product.status,
    variantId: exact.id,
    variantTitle: exact.title,
    sku: exact.sku || "",
    barcode: exact.barcode || "",
  };
}

async function findByHandle(handle) {
  const clean = normalizeText(handle).replace(/\s+/g, "-");
  if (!clean) return null;

  const query = `
    query ProductByHandle($handle: String!) {
      productByHandle(handle: $handle) {
        id
        handle
        title
        status
        variants(first: 10) {
          nodes {
            id
            sku
            barcode
            title
          }
        }
      }
    }
  `;

  const data = await adminFetch(query, { handle: clean });
  const product = data?.productByHandle;
  const firstVariant = product?.variants?.nodes?.[0];

  if (!product?.id || !firstVariant?.id) return null;

  return {
    matchType: "handle",
    productId: product.id,
    productHandle: product.handle,
    productTitle: product.title,
    productStatus: product.status,
    variantId: firstVariant.id,
    variantTitle: firstVariant.title,
    sku: firstVariant.sku || "",
    barcode: firstVariant.barcode || "",
  };
}

async function findByTitle(title) {
  const clean = normalizeText(title);
  if (!clean) return null;

  const query = `
    query ProductByTitle($query: String!) {
      products(first: 10, query: $query) {
        nodes {
          id
          handle
          title
          status
          variants(first: 10) {
            nodes {
              id
              sku
              barcode
              title
            }
          }
        }
      }
    }
  `;

  const data = await adminFetch(query, {
    query: `title:${escapeGraphqlQueryValue(String(title || "").trim())}`,
  });

  const nodes = data?.products?.nodes || [];
  const exactProduct =
    nodes.find((node) => normalizeText(node?.title) === clean) || nodes[0];

  const firstVariant = exactProduct?.variants?.nodes?.[0];
  if (!exactProduct?.id || !firstVariant?.id) return null;

  return {
    matchType: "title",
    productId: exactProduct.id,
    productHandle: exactProduct.handle,
    productTitle: exactProduct.title,
    productStatus: exactProduct.status,
    variantId: firstVariant.id,
    variantTitle: firstVariant.title,
    sku: firstVariant.sku || "",
    barcode: firstVariant.barcode || "",
  };
}

async function resolveShopifyMatch(item) {
  const existingVariant =
    item?.merchandiseId || item?.shopifyVariantId || item?.variantId || "";

  const existingHandle =
    item?.shopifyProductHandle || item?.shopifyHandle || item?.handle || "";

  return (
    (existingVariant ? await findByVariantId(existingVariant) : null) ||
    (item?.sku ? await findBySku(item.sku) : null) ||
    (item?.ean ? await findByBarcode(item.ean) : null) ||
    (existingHandle ? await findByHandle(existingHandle) : null) ||
    (item?.title ? await findByTitle(item.title) : null) ||
    null
  );
}

async function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    throw new Error(`Input file not found: ${INPUT_PATH}`);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const raw = JSON.parse(fs.readFileSync(INPUT_PATH, "utf8"));
  if (!Array.isArray(raw)) {
    throw new Error("Input JSON is not an array");
  }

  const enriched = [];
  const sellable = [];
  const report = {
    total: raw.length,
    matched: 0,
    sellable: 0,
    notMatched: 0,
    notSellable: 0,
    byMatchType: {},
  };

  for (let index = 0; index < raw.length; index += 1) {
    const item = raw[index];

    try {
      const match = await resolveShopifyMatch(item);

      if (!match) {
        enriched.push({
          ...item,
          shopifyMatchStatus: "not-found",
          merchandiseId: "",
        });
        report.notMatched += 1;
        continue;
      }

      report.matched += 1;
      report.byMatchType[match.matchType] =
        (report.byMatchType[match.matchType] || 0) + 1;

      const storefrontCheck = await validateVariantOnStorefront(match.variantId);

      const nextItem = {
        ...item,
        shopifyProductId: match.productId,
        shopifyVariantId: numericIdFromGid(match.variantId),
        merchandiseId: match.variantId,
        shopifyProductHandle: match.productHandle,
        shopifyProductTitle: match.productTitle,
        shopifyVariantTitle: match.variantTitle,
        shopifyProductStatus: match.productStatus,
        shopifyMatchStatus: match.matchType,
        storefrontVisible: storefrontCheck.ok,
        storefrontReason: storefrontCheck.reason,
      };

      enriched.push(nextItem);

      if (storefrontCheck.ok) {
        sellable.push(nextItem);
        report.sellable += 1;
      } else {
        report.notSellable += 1;
      }
    } catch (error) {
      enriched.push({
        ...item,
        shopifyMatchStatus: "error",
        shopifySyncError: error instanceof Error ? error.message : String(error),
      });
      report.notSellable += 1;
    }

    if ((index + 1) % 25 === 0) {
      console.log(`Processed ${index + 1}/${raw.length}`);
      await sleep(250);
    }
  }

  fs.writeFileSync(ENRICHED_PATH, JSON.stringify(enriched, null, 2), "utf8");
  fs.writeFileSync(SELLABLE_PATH, JSON.stringify(sellable, null, 2), "utf8");
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");

  console.log("Sync finished");
  console.log(JSON.stringify(report, null, 2));
  console.log(`Enriched: ${ENRICHED_PATH}`);
  console.log(`Sellable: ${SELLABLE_PATH}`);
  console.log(`Report: ${REPORT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});