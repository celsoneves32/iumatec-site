import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "node:fs";
import path from "node:path";

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || "2025-04";

if (!domain) throw new Error("Missing SHOPIFY_STORE_DOMAIN");
if (!token) throw new Error("Missing SHOPIFY_ADMIN_ACCESS_TOKEN");

const catalogPath = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "out",
  "iumatec-catalog-filtered.json"
);

if (!fs.existsSync(catalogPath)) {
  throw new Error(`Catalog file not found: ${catalogPath}`);
}

const BATCH_PAUSE_MS = 350;
const SAVE_EVERY = 100;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function shopifyFetch(query, variables = {}) {
  const res = await fetch(`https://${domain}/admin/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await res.text();

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Shopify returned non-JSON response (${res.status}): ${text.slice(0, 300)}`);
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(json, null, 2)}`);
  }

  if (json.errors?.length) {
    throw new Error(JSON.stringify(json.errors, null, 2));
  }

  return json.data;
}

function escapeQueryValue(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function getImageUrl(product) {
  if (typeof product.image === "string" && product.image.trim()) {
    return product.image.trim();
  }

  if (typeof product.imageUrl === "string" && product.imageUrl.trim()) {
    return product.imageUrl.trim();
  }

  if (typeof product.mainImage === "string" && product.mainImage.trim()) {
    return product.mainImage.trim();
  }

  if (Array.isArray(product.images)) {
    const found = product.images.find(
      (item) => typeof item === "string" && item.trim()
    );

    if (found) return found.trim();
  }

  if (Array.isArray(product.imageUrls)) {
    const found = product.imageUrls.find(
      (item) => typeof item === "string" && item.trim()
    );

    if (found) return found.trim();
  }

  return null;
}

async function findProductBySku(sku) {
  const query = `
    query FindProductBySku($query: String!) {
      productVariants(first: 5, query: $query) {
        edges {
          node {
            id
            sku
            product {
              id
              title
              handle
              media(first: 10) {
                edges {
                  node {
                    id
                    mediaContentType
                    status
                    ... on MediaImage {
                      image {
                        url
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const cleanSku = String(sku || "").trim();

  const data = await shopifyFetch(query, {
    query: `sku:"${escapeQueryValue(cleanSku)}"`,
  });

  const edges = data?.productVariants?.edges || [];
  const exact = edges.find(
    (edge) => String(edge?.node?.sku || "").trim() === cleanSku
  );

  return exact?.node?.product || null;
}

function productAlreadyHasImages(product) {
  const edges = product?.media?.edges || [];

  return edges.some((edge) => {
    const node = edge?.node;
    return Boolean(node?.image?.url || node?.id);
  });
}

async function addImageToProduct(productId, imageUrl, altText) {
  const mutation = `
    mutation ProductCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
      productCreateMedia(productId: $productId, media: $media) {
        media {
          id
          mediaContentType
          status
        }
        mediaUserErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyFetch(mutation, {
    productId,
    media: [
      {
        mediaContentType: "IMAGE",
        originalSource: imageUrl,
        alt: altText || "Produktbild",
      },
    ],
  });

  const errors = data?.productCreateMedia?.mediaUserErrors || [];

  if (errors.length) {
    throw new Error(JSON.stringify(errors, null, 2));
  }

  return data?.productCreateMedia?.media?.[0] || null;
}

async function run() {
  const raw = fs.readFileSync(catalogPath, "utf8");
  const products = JSON.parse(raw);

  if (!Array.isArray(products)) {
    throw new Error("Catalog JSON is not an array");
  }

  console.log(`Shopify domain: ${domain}`);
  console.log(`Products to process: ${products.length}`);

  let uploaded = 0;
  let skipped = 0;
  let notFound = 0;
  let noImage = 0;
  let alreadyHasImage = 0;
  let errors = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    const sku = String(product.sku || "").trim();
    const title = String(product.title || product.fullTitle || product.shopifyProductTitle || "").trim();
    const imageUrl = getImageUrl(product);

    console.log("");
    console.log(`[${i + 1}/${products.length}] SKU: ${sku || "(empty)"}`);

    if (!sku) {
      console.log("- SKIPPED: missing SKU");
      product.shopifyImageSyncStatus = "skipped-missing-sku";
      skipped++;
      continue;
    }

    if (!imageUrl) {
      console.log("- NO IMAGE IN CATALOG");
      product.shopifyImageSyncStatus = "no-image";
      noImage++;
      continue;
    }

    try {
      const shopifyProduct = await findProductBySku(sku);

      if (!shopifyProduct?.id) {
        console.log("- NOT FOUND IN SHOPIFY");
        product.shopifyImageSyncStatus = "not-found";
        notFound++;
        continue;
      }

      product.shopifyProductId = shopifyProduct.id;
      product.shopifyProductHandle = shopifyProduct.handle;

      if (productAlreadyHasImages(shopifyProduct)) {
        console.log("- ALREADY HAS IMAGE");
        product.shopifyImageSyncStatus = "already-has-image";
        alreadyHasImage++;
        continue;
      }

      const media = await addImageToProduct(shopifyProduct.id, imageUrl, title);

      console.log(`- IMAGE UPLOADED: ${media?.status || "created"}`);

      product.shopifyImageSyncStatus = "uploaded";
      product.shopifyImageUrl = imageUrl;
      product.shopifyImageSyncError = undefined;

      uploaded++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      console.log(`- ERROR: ${message}`);

      product.shopifyImageSyncStatus = "error";
      product.shopifyImageSyncError = message;

      errors++;
    }

    if ((i + 1) % SAVE_EVERY === 0) {
      fs.writeFileSync(catalogPath, JSON.stringify(products, null, 2), "utf8");
      console.log(`- Progress saved at ${i + 1}/${products.length}`);
    }

    if ((i + 1) % 25 === 0) {
      await sleep(BATCH_PAUSE_MS);
    }
  }

  fs.writeFileSync(catalogPath, JSON.stringify(products, null, 2), "utf8");

  console.log("");
  console.log("========== DONE ==========");
  console.log(`Uploaded: ${uploaded}`);
  console.log(`Already has image: ${alreadyHasImage}`);
  console.log(`No image: ${noImage}`);
  console.log(`Not found: ${notFound}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log("==========================");
}

run().catch((error) => {
  console.error("FATAL ERROR:", error);
  process.exit(1);
});