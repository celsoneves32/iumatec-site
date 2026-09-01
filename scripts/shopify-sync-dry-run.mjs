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
    ) content = content.slice(1, -1);
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
const MAX_PRODUCTS = Math.max(1, Math.min(25, Number(process.env.SYNC_MAX_PRODUCTS || 5)));

const OUT = path.join(ROOT, "integrations", "alltron", "out");
const INPUT_FILE = path.join(OUT, "storefront-shopify-resolved.json");
const REPORT_FILE = path.join(OUT, "shopify-sync-dry-run-report.json");

if (!DOMAIN) throw new Error("Missing SHOPIFY_STORE_DOMAIN");
if (!TOKEN) throw new Error("Missing SHOPIFY_ADMIN_ACCESS_TOKEN");

const text = (value) => String(value ?? "").trim();
const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function html(value) {
  return text(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function imagesOf(product) {
  const values = [
    product.image,
    product.imageUrl,
    product.mainImage,
    product.featuredImage,
    product.shopifyFeaturedImage,
    ...(Array.isArray(product.images) ? product.images : []),
    ...(Array.isArray(product.imageUrls) ? product.imageUrls : []),
  ];

  return [...new Set(values
    .filter((value) => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => /^https?:\/\//i.test(value)))];
}

function categoryOf(product) {
  const main = text(product?.iumatecCategory?.main || product.category);
  const sub = text(product?.iumatecCategory?.sub || product.subcategory);
  return {
    main,
    sub,
    productType: sub || main || "Tech",
  };
}

function descriptionOf(product) {
  const first = text(product.description);
  const second = text(product.description2 || product.longDescription);
  const rows = [
    ["Artikelnummer", product.litm || product.alltronSku],
    ["Hersteller-Nr.", product.sku || product.internalNumber],
    ["EAN", product.ean],
    ["Garantie", product.warrantyMonths ? `${product.warrantyMonths} Monate` : ""],
  ].filter(([, value]) => text(value));

  return [
    first ? `<p>${html(first)}</p>` : "",
    second && second !== first ? `<p>${html(second)}</p>` : "",
    rows.length
      ? `<table><tbody>${rows.map(([key, value]) =>
          `<tr><th>${html(key)}</th><td>${html(value)}</td></tr>`).join("")}</tbody></table>`
      : "",
  ].filter(Boolean).join("\n");
}

function desiredProduct(product) {
  const category = categoryOf(product);
  const sourcePrice = number(product.ecpr) > 0 ? number(product.ecpr) : number(product.price);
  const images = imagesOf(product);
  return {
    productId: text(product.shopifyProductId),
    variantId: text(product.shopifyVariantId || product.merchandiseId),
    title: text(product.fullTitle || product.title || product.name),
    descriptionHtml: descriptionOf(product),
    vendor: text(product.brand) || "IUMATEC",
    productType: category.productType,
    categoryMain: category.main,
    categorySub: category.sub,
    price: sourcePrice.toFixed(2),
    stock: Math.max(0, Math.floor(number(product.stockQty ?? product.stock))),
    sku: text(product.sku || product.internalNumber || product.litm),
    barcode: text(product.ean),
    images,
    sourceMatchMethod: text(product.shopifyMatchMethod),
  };
}

const QUERY = `
  query ReadProductsForDryRun($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        title
        handle
        descriptionHtml
        vendor
        productType
        status
        tags
        media(first: 50) {
          nodes {
            id
            alt
            mediaContentType
            ... on MediaImage { image { url } }
          }
        }
        variants(first: 10) {
          nodes {
            id
            title
            sku
            barcode
            price
            inventoryQuantity
          }
        }
      }
    }
  }
`;

async function graphql(query, variables) {
  const response = await fetch(
    `https://${DOMAIN}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    },
  );

  const raw = await response.text();
  let json;
  try { json = JSON.parse(raw); }
  catch { throw new Error(`Invalid Shopify response: ${raw.slice(0, 500)}`); }

  if (!response.ok || json.errors?.length) {
    throw new Error(`Shopify error ${response.status}: ${JSON.stringify(json.errors || json)}`);
  }
  return json.data;
}

function normalizedHtml(value) {
  return text(value).replace(/\s+/g, " ");
}

function compare(desired, current) {
  const variant = current?.variants?.nodes?.find((item) => item.id === desired.variantId)
    || current?.variants?.nodes?.[0];
  const currentImages = (current?.media?.nodes || [])
    .filter((item) => item.mediaContentType === "IMAGE")
    .map((item) => item?.image?.url)
    .filter(Boolean);

  const changes = {};
  const add = (field, before, after) => {
    if (String(before ?? "") !== String(after ?? "")) changes[field] = { before, after };
  };

  add("title", current?.title, desired.title);
  add("vendor", current?.vendor, desired.vendor);
  add("productType", current?.productType, desired.productType);
  if (normalizedHtml(current?.descriptionHtml) !== normalizedHtml(desired.descriptionHtml)) {
    changes.descriptionHtml = {
      beforeLength: text(current?.descriptionHtml).length,
      afterLength: desired.descriptionHtml.length,
    };
  }
  add("price", number(variant?.price).toFixed(2), desired.price);
  add("sku", variant?.sku, desired.sku);
  add("barcode", variant?.barcode, desired.barcode);
  add("stock", number(variant?.inventoryQuantity), desired.stock);

  if (currentImages.length !== desired.images.length) {
    changes.images = {
      beforeCount: currentImages.length,
      afterCount: desired.images.length,
      desiredUrls: desired.images,
    };
  }

  return {
    productId: desired.productId,
    variantId: desired.variantId,
    handle: text(current?.handle),
    statusPreserved: text(current?.status),
    title: desired.title,
    category: `${desired.categoryMain} > ${desired.categorySub}`,
    desiredImages: desired.images.length,
    changeCount: Object.keys(changes).length,
    changes,
  };
}

async function run() {
  if (!fs.existsSync(INPUT_FILE)) throw new Error(`Missing resolved file: ${INPUT_FILE}`);
  const resolved = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));
  if (!Array.isArray(resolved)) throw new Error("Resolved file must be an array");

  const eligible = resolved
    .filter((product) => text(product.shopifyProductId) && text(product.shopifyVariantId))
    .sort((a, b) => imagesOf(b).length - imagesOf(a).length);
  const selected = eligible.slice(0, MAX_PRODUCTS);
  const desired = selected.map(desiredProduct);

  console.log("========== SHOPIFY SYNC DRY RUN ==========");
  console.log(`Resolved products available: ${eligible.length}`);
  console.log(`Products selected for comparison: ${selected.length}`);
  console.log("Write operations: DISABLED");
  console.log("Reading current Shopify data...");

  const data = await graphql(QUERY, { ids: desired.map((item) => item.productId) });
  const currentById = new Map((data?.nodes || []).filter(Boolean).map((item) => [item.id, item]));
  const comparisons = desired.map((item) => compare(item, currentById.get(item.productId)));

  const report = {
    createdAt: new Date().toISOString(),
    apiVersion: API_VERSION,
    mode: "DRY_RUN_READ_ONLY",
    resolvedProductsAvailable: eligible.length,
    compared: comparisons.length,
    productsWithChanges: comparisons.filter((item) => item.changeCount > 0).length,
    totalPlannedFieldChanges: comparisons.reduce((sum, item) => sum + item.changeCount, 0),
    shopifyWrites: 0,
    productsCreated: 0,
    productsUpdated: 0,
    comparisons,
  };

  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), "utf8");

  for (const item of comparisons) {
    console.log(`- ${item.title}`);
    console.log(`  Images: ${item.desiredImages} | Planned field changes: ${item.changeCount}`);
  }
  console.log("");
  console.log(`Products with planned changes: ${report.productsWithChanges}`);
  console.log(`Total planned field changes: ${report.totalPlannedFieldChanges}`);
  console.log(`Report: ${path.relative(ROOT, REPORT_FILE)}`);
  console.log("Shopify changes: NONE");
  console.log("==========================================");
}

run().catch((error) => {
  console.error("FATAL:", error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
