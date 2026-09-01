import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const value = line.trim();
    if (!value || value.startsWith("#")) continue;
    const separator = value.indexOf("=");
    if (separator < 1) continue;
    const key = value.slice(0, separator).trim();
    let content = value.slice(separator + 1).trim();
    if (
      (content.startsWith('"') && content.endsWith('"')) ||
      (content.startsWith("'") && content.endsWith("'"))
    ) {
      content = content.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = content;
  }
}

loadEnv(path.join(ROOT, ".env.local"));
loadEnv(path.join(ROOT, ".env"));

const DOMAIN =
  process.env.SHOPIFY_STORE_DOMAIN ||
  process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || "2026-04";

const OUT_DIR = path.join(ROOT, "integrations", "alltron", "out");
const OUTPUT_FILE = path.join(OUT_DIR, "shopify-product-variant-map.json");
const REPORT_FILE = path.join(OUT_DIR, "shopify-product-variant-map-report.json");

if (!DOMAIN) throw new Error("Missing SHOPIFY_STORE_DOMAIN");
if (!TOKEN) throw new Error("Missing SHOPIFY_ADMIN_ACCESS_TOKEN");

const QUERY = `
  query ProductsWithVariants($first: Int!, $after: String) {
    products(first: $first, after: $after, sortKey: ID) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        title
        handle
        status
        variants(first: 100) {
          nodes {
            id
            sku
            barcode
            title
          }
          pageInfo { hasNextPage }
        }
      }
    }
  }
`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchGraphQL(variables, attempt = 1) {
  const response = await fetch(
    `https://${DOMAIN}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": TOKEN,
      },
      body: JSON.stringify({ query: QUERY, variables }),
    },
  );

  const raw = await response.text();
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid Shopify response: ${raw.slice(0, 500)}`);
  }

  const throttled =
    response.status === 429 ||
    json.errors?.some((error) => error?.extensions?.code === "THROTTLED");

  if (throttled && attempt <= 8) {
    const delay = Math.min(60_000, 1_000 * 2 ** (attempt - 1));
    console.log(`Shopify throttled the request. Waiting ${delay} ms...`);
    await sleep(delay);
    return fetchGraphQL(variables, attempt + 1);
  }

  if (!response.ok || json.errors?.length) {
    throw new Error(
      `Shopify error ${response.status}: ${JSON.stringify(json.errors || json)}`,
    );
  }

  return json.data;
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let after = null;
  let page = 0;
  let productsCount = 0;
  let variantsCount = 0;
  let productsWithMoreThan100Variants = 0;
  const rows = [];

  do {
    const data = await fetchGraphQL({ first: 100, after });
    const products = data?.products?.nodes || [];
    page += 1;
    productsCount += products.length;

    for (const product of products) {
      if (product?.variants?.pageInfo?.hasNextPage) {
        productsWithMoreThan100Variants += 1;
      }

      for (const variant of product?.variants?.nodes || []) {
        const sku = String(variant.sku || "").trim();
        rows.push({
          productId: product.id,
          variantId: variant.id,
          merchandiseId: variant.id,
          productIdNumeric: String(product.id || "").split("/").pop(),
          variantIdNumeric: String(variant.id || "").split("/").pop(),
          handle: product.handle || "",
          productTitle: product.title || "",
          productStatus: product.status || "",
          variantTitle: variant.title || "",
          sku,
          skuNormalized: sku.toUpperCase(),
          barcode: String(variant.barcode || "").trim(),
        });
        variantsCount += 1;
      }
    }

    const pageInfo = data?.products?.pageInfo || {};
    after = pageInfo.hasNextPage ? pageInfo.endCursor : null;
    console.log(
      `Page ${page}: ${productsCount} products, ${variantsCount} variants`,
    );
  } while (after);

  rows.sort((a, b) =>
    a.skuNormalized.localeCompare(b.skuNormalized) ||
    a.variantId.localeCompare(b.variantId),
  );

  const skuCounts = new Map();
  for (const row of rows) {
    if (!row.skuNormalized) continue;
    skuCounts.set(row.skuNormalized, (skuCounts.get(row.skuNormalized) || 0) + 1);
  }

  const duplicateSkus = [...skuCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([sku, count]) => ({ sku, count }));

  const report = {
    createdAt: new Date().toISOString(),
    apiVersion: API_VERSION,
    products: productsCount,
    variants: variantsCount,
    variantsWithoutSku: rows.filter((row) => !row.skuNormalized).length,
    duplicateSkuGroups: duplicateSkus.length,
    duplicateSkus,
    productsWithMoreThan100Variants,
    output: path.relative(ROOT, OUTPUT_FILE),
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(rows, null, 2), "utf8");
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), "utf8");

  console.log("");
  console.log("========== SHOPIFY ID MAP DONE ==========");
  console.log(`Products: ${productsCount}`);
  console.log(`Variants: ${variantsCount}`);
  console.log(`Variants without SKU: ${report.variantsWithoutSku}`);
  console.log(`Duplicate SKU groups: ${report.duplicateSkuGroups}`);
  console.log(`Output: ${path.relative(ROOT, OUTPUT_FILE)}`);
  console.log(`Report: ${path.relative(ROOT, REPORT_FILE)}`);
  console.log("=========================================");
}

run().catch((error) => {
  console.error("FATAL:", error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
