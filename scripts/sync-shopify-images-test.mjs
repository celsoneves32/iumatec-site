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
const API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || "2025-04";
const APPLY = process.env.SYNC_APPLY === "YES_IMAGES_ONLY";
const MAX_PRODUCTS = 5;

const OUT = path.join(ROOT, "integrations", "alltron", "out");
const INPUT = path.join(OUT, "storefront-shopify-resolved.json");
const RESULT = path.join(OUT, "shopify-images-test-result.json");

if (!DOMAIN) throw new Error("Missing SHOPIFY_STORE_DOMAIN");
if (!TOKEN) throw new Error("Missing SHOPIFY_ADMIN_ACCESS_TOKEN");

const text = (value) => String(value ?? "").trim();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function sourceImages(product) {
  const values = [
    product.image,
    product.imageUrl,
    product.mainImage,
    product.featuredImage,
    ...(Array.isArray(product.images) ? product.images : []),
    ...(Array.isArray(product.imageUrls) ? product.imageUrls : []),
  ];
  return [...new Set(values
    .filter((value) => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => /^https?:\/\//i.test(value)))];
}

function fileKey(url) {
  try {
    const pathname = new URL(url).pathname;
    return decodeURIComponent(pathname.split("/").pop() || "")
      .toLowerCase()
      .replace(/_[0-9]+x[0-9]+(?=\.[a-z]+$)/i, "");
  } catch {
    return "";
  }
}

const READ_QUERY = `
  query ReadProductMedia($id: ID!) {
    product(id: $id) {
      id
      title
      status
      media(first: 50) {
        nodes {
          id
          alt
          mediaContentType
          preview { status }
          ... on MediaImage { image { url } }
        }
      }
    }
  }
`;

const ADD_MEDIA = `
  mutation AddProductImages($product: ProductUpdateInput!, $media: [CreateMediaInput!]) {
    productUpdate(product: $product, media: $media) {
      product {
        id
        title
        status
        media(first: 50) {
          nodes {
            id
            mediaContentType
            preview { status }
          }
        }
      }
      userErrors { field message }
    }
  }
`;

async function graphql(query, variables, attempt = 1) {
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

  const throttled = response.status === 429 ||
    json.errors?.some((error) => error?.extensions?.code === "THROTTLED");
  if (throttled && attempt <= 6) {
    const delay = Math.min(30_000, 1000 * 2 ** (attempt - 1));
    await sleep(delay);
    return graphql(query, variables, attempt + 1);
  }
  if (!response.ok || json.errors?.length) {
    throw new Error(`Shopify error ${response.status}: ${JSON.stringify(json.errors || json)}`);
  }
  return json.data;
}

function missingImages(desired, currentMedia) {
  const currentImages = currentMedia
    .filter((item) => item.mediaContentType === "IMAGE");
  const currentKeys = new Set(currentImages.map((item) => fileKey(item?.image?.url)).filter(Boolean));
  const exactMissing = desired.filter((url) => !currentKeys.has(fileKey(url)));

  if (exactMissing.length < desired.length) return exactMissing;

  // Shopify can rename imported files. In that case preserve all current media
  // and only append the source images after the current image count.
  return desired.slice(Math.min(currentImages.length, desired.length));
}

async function run() {
  if (!fs.existsSync(INPUT)) throw new Error(`Missing file: ${INPUT}`);
  const products = JSON.parse(fs.readFileSync(INPUT, "utf8"));
  if (!Array.isArray(products)) throw new Error("Resolved catalog must be an array");

  const selected = products
    .filter((product) => text(product.shopifyProductId) && sourceImages(product).length >= 2)
    .sort((a, b) => sourceImages(b).length - sourceImages(a).length)
    .slice(0, MAX_PRODUCTS);

  const results = [];
  console.log("========== SHOPIFY IMAGES TEST ==========");
  console.log(`Mode: ${APPLY ? "APPLY - IMAGES ONLY" : "PREVIEW ONLY"}`);
  console.log(`Products: ${selected.length}`);
  console.log("Prices/categories/titles/stock/status: PRESERVED");

  for (let index = 0; index < selected.length; index += 1) {
    const source = selected[index];
    const productId = text(source.shopifyProductId);
    const desired = sourceImages(source);
    const read = await graphql(READ_QUERY, { id: productId });
    if (!read?.product?.id) throw new Error(`Product not found: ${productId}`);

    const beforeMedia = read.product.media?.nodes || [];
    const beforeImageCount = beforeMedia.filter((item) => item.mediaContentType === "IMAGE").length;
    const missing = missingImages(desired, beforeMedia);
    const row = {
      productId,
      title: read.product.title,
      statusPreserved: read.product.status,
      desiredImageCount: desired.length,
      beforeImageCount,
      missingImageCount: missing.length,
      addedImageCount: 0,
      missingUrls: missing,
      result: APPLY ? "pending" : "preview",
    };

    if (APPLY && missing.length > 0) {
      const media = missing.map((url, imageIndex) => ({
        originalSource: url,
        alt: `${text(source.title || source.fullTitle || read.product.title)} ${beforeImageCount + imageIndex + 1}`.slice(0, 512),
        mediaContentType: "IMAGE",
      }));
      const updated = await graphql(ADD_MEDIA, {
        product: { id: productId },
        media,
      });
      const payload = updated?.productUpdate;
      if (payload?.userErrors?.length) {
        throw new Error(payload.userErrors.map((error) => error.message).join(" | "));
      }
      row.addedImageCount = missing.length;
      row.result = "submitted";
    } else if (APPLY) {
      row.result = "already-complete";
    }

    results.push(row);
    console.log(`[${index + 1}/${selected.length}] ${row.title}`);
    console.log(`  Images before: ${beforeImageCount} | desired: ${desired.length} | ${APPLY ? "added" : "would add"}: ${APPLY ? row.addedImageCount : missing.length}`);
    await sleep(300);
  }

  const report = {
    createdAt: new Date().toISOString(),
    mode: APPLY ? "APPLY_IMAGES_ONLY" : "PREVIEW_ONLY",
    productsProcessed: results.length,
    productsChanged: results.filter((row) => row.addedImageCount > 0).length,
    imagesAdded: results.reduce((sum, row) => sum + row.addedImageCount, 0),
    protectedFields: ["price", "category", "productType", "title", "description", "stock", "status", "variants"],
    results,
  };
  fs.writeFileSync(RESULT, JSON.stringify(report, null, 2), "utf8");

  console.log("");
  console.log(`Result: ${path.relative(ROOT, RESULT)}`);
  console.log(`Products changed: ${report.productsChanged}`);
  console.log(`Images added: ${report.imagesAdded}`);
  console.log(APPLY ? "Only missing images were submitted." : "Shopify changes: NONE");
  console.log("=========================================");
}

run().catch((error) => {
  console.error("FATAL:", error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
