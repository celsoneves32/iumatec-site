import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || "2025-04";
const locationId = process.env.SHOPIFY_LOCATION_ID;

if (!domain) throw new Error("Missing SHOPIFY_STORE_DOMAIN");
if (!token) throw new Error("Missing SHOPIFY_ADMIN_ACCESS_TOKEN");
if (!locationId) throw new Error("Missing SHOPIFY_LOCATION_ID");

const catalogPaths = [
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
  path.join(
    process.cwd(),
    "integrations",
    "alltron",
    "out",
    "iumatec-catalog-enriched.json"
  ),
];

const existingCatalogPaths = catalogPaths.filter((filePath) =>
  fs.existsSync(filePath)
);

if (existingCatalogPaths.length === 0) {
  throw new Error("No catalog files found.");
}

const primaryCatalogPath = existingCatalogPaths[0];

const BATCH_PAUSE_MS = 600;
const RETRY_PAUSE_MS = 1500;
const MAX_RETRIES = 4;
const SAVE_EVERY = 100;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function applyPricing(basePrice) {
  const price = Number(basePrice || 0);
  if (!Number.isFinite(price) || price <= 0) return 0;

  const margin = 1.2;
  const finalPrice = price * margin;

  return Number((Math.floor(finalPrice) + 0.9).toFixed(2));
}

async function shopifyFetch(query, variables = {}, retries = MAX_RETRIES) {
  try {
    const res = await fetch(
      `https://${domain}/admin/api/${apiVersion}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
        },
        body: JSON.stringify({ query, variables }),
      }
    );

    const text = await res.text();

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(
        `Shopify returned non-JSON response (${res.status}): ${text.slice(
          0,
          300
        )}`
      );
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${JSON.stringify(json, null, 2)}`);
    }

    if (json.errors?.length) {
      throw new Error(JSON.stringify(json.errors, null, 2));
    }

    return json.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (retries > 0) {
      console.log(
        `- RETRY Shopify request (${MAX_RETRIES - retries + 1}/${MAX_RETRIES}): ${message.slice(
          0,
          180
        )}`
      );
      await sleep(RETRY_PAUSE_MS);
      return shopifyFetch(query, variables, retries - 1);
    }

    throw error;
  }
}

function escapeQueryValue(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function findVariantBySku(sku) {
  const query = `
    query FindVariantBySku($query: String!) {
      productVariants(first: 10, query: $query) {
        edges {
          node {
            id
            sku
            product {
              id
              title
              handle
            }
            inventoryItem {
              id
              sku
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

  return exact?.node || null;
}

async function updateVariantPrice(productId, variantId, price) {
  const mutation = `
    mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const safePrice = Number.isFinite(Number(price)) ? Number(price) : 0;

  const data = await shopifyFetch(mutation, {
    productId,
    variants: [
      {
        id: variantId,
        price: String(safePrice.toFixed(2)),
      },
    ],
  });

  const userErrors = data?.productVariantsBulkUpdate?.userErrors || [];

  if (userErrors.length) {
    throw new Error(JSON.stringify(userErrors, null, 2));
  }

  return data?.productVariantsBulkUpdate?.productVariants?.[0] || null;
}

async function ensureInventoryActive(inventoryItemId, locationId) {
  const mutation = `
    mutation inventoryActivate($inventoryItemId: ID!, $locationId: ID!) {
      inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId) {
        inventoryLevel {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyFetch(mutation, {
    inventoryItemId,
    locationId,
  });

  const userErrors = data?.inventoryActivate?.userErrors || [];

  if (userErrors.length) {
    const message = JSON.stringify(userErrors).toLowerCase();

    if (
      message.includes("already") ||
      message.includes("active") ||
      message.includes("stocked")
    ) {
      return null;
    }

    throw new Error(JSON.stringify(userErrors));
  }

  return data?.inventoryActivate?.inventoryLevel || null;
}

async function setInventoryAbsolute(inventoryItemId, locationId, qty) {
  const mutation = `
    mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
      inventorySetQuantities(input: $input) {
        inventoryAdjustmentGroup {
          reason
          changes {
            name
            delta
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const safeQty = Math.max(0, Number.isFinite(Number(qty)) ? Number(qty) : 0);

  const data = await shopifyFetch(mutation, {
    input: {
      name: "available",
      reason: "correction",
      ignoreCompareQuantity: true,
      quantities: [
        {
          inventoryItemId,
          locationId,
          quantity: safeQty,
        },
      ],
    },
  });

  const userErrors = data?.inventorySetQuantities?.userErrors || [];

  if (userErrors.length) {
    throw new Error(JSON.stringify(userErrors, null, 2));
  }

  return data?.inventorySetQuantities?.inventoryAdjustmentGroup || null;
}

function getStockQty(product) {
  if (typeof product.stockQty === "number") return product.stockQty;
  if (typeof product.stock === "number") return product.stock;

  const parsedStockQty = Number(product.stockQty);
  if (Number.isFinite(parsedStockQty)) return parsedStockQty;

  const parsedStock = Number(product.stock);
  if (Number.isFinite(parsedStock)) return parsedStock;

  return 0;
}

function getBasePrice(product) {
  const candidates = [
    product.basePrice,
    product.purchasePrice,
    product.buyPrice,
    product.costPrice,
    product.netPrice,
    product.price,
  ];

  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }

  return 0;
}

function syncAllCatalogFiles(products) {
  const syncedBySku = new Map(
    products
      .map((product) => [String(product.sku || "").trim(), product])
      .filter(([sku]) => Boolean(sku))
  );

  for (const filePath of existingCatalogPaths) {
    try {
      const fileRaw = fs.readFileSync(filePath, "utf-8");
      const fileProducts = JSON.parse(fileRaw);

      if (!Array.isArray(fileProducts)) {
        console.log(`- SKIPPED catalog sync: ${filePath} is not an array`);
        continue;
      }

      let changed = 0;

      const updatedFileProducts = fileProducts.map((item) => {
        const sku = String(item.sku || "").trim();
        const synced = syncedBySku.get(sku);

        if (!synced) return item;

        changed++;

        return {
          ...item,
          basePrice: synced.basePrice,
          price: synced.price,
          marginRate: synced.marginRate,
          priceRule: synced.priceRule,
          stockQty: synced.stockQty,
          stock: synced.stock,
          shopifyProductId: synced.shopifyProductId,
          shopifyProductHandle: synced.shopifyProductHandle,
          shopifyVariantId: synced.shopifyVariantId,
          merchandiseId: synced.merchandiseId,
          shopifySyncStatus: synced.shopifySyncStatus,
          shopifySyncError: synced.shopifySyncError,
        };
      });

      fs.writeFileSync(
        filePath,
        JSON.stringify(updatedFileProducts, null, 2),
        "utf-8"
      );

      console.log(`- Catalog synced: ${path.basename(filePath)} (${changed})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`- ERROR syncing catalog ${filePath}: ${message}`);
    }
  }
}

async function run() {
  const raw = fs.readFileSync(primaryCatalogPath, "utf-8");
  const products = JSON.parse(raw);

  if (!Array.isArray(products)) {
    throw new Error("Catalog JSON is not an array");
  }

  console.log(`Shopify domain: ${domain}`);
  console.log(`Location ID: ${locationId}`);
  console.log(`Primary catalog: ${primaryCatalogPath}`);
  console.log("All catalogs:");
  existingCatalogPaths.forEach((filePath) => console.log(`- ${filePath}`));
  console.log(`Products to process: ${products.length}`);
  console.log("Pricing: Alltron/base price +20%, rounded to .90 CHF");
  console.log(
    `Retry: ${MAX_RETRIES}x | Pause every 25 products: ${BATCH_PAUSE_MS}ms`
  );

  let updated = 0;
  let notFound = 0;
  let errors = 0;
  let skipped = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    const sku = String(product.sku || "").trim();
    const basePrice = getBasePrice(product);
    const price = applyPricing(basePrice);
    const stockQty = getStockQty(product);

    console.log("");
    console.log(`[${i + 1}/${products.length}] SKU: ${sku || "(empty)"}`);

    if (!sku) {
      console.log("- SKIPPED: missing SKU");
      product.shopifySyncStatus = "skipped-missing-sku";
      skipped++;
      continue;
    }

    if (!price || price <= 0) {
      console.log("- SKIPPED: invalid price");
      product.shopifySyncStatus = "skipped-invalid-price";
      skipped++;
      continue;
    }

    try {
      const variant = await findVariantBySku(sku);

      if (!variant?.id || !variant?.inventoryItem?.id || !variant?.product?.id) {
        console.log("- NOT FOUND");
        product.shopifySyncStatus = "not-found";
        notFound++;
        continue;
      }

      await updateVariantPrice(variant.product.id, variant.id, price);
      console.log(`- Base price: ${basePrice}`);
      console.log(`- Final price: ${price}`);

      await ensureInventoryActive(variant.inventoryItem.id, locationId);
      console.log("- Inventory active at location");

      await setInventoryAbsolute(variant.inventoryItem.id, locationId, stockQty);
      console.log(`- Stock set: ${stockQty}`);

      product.basePrice = basePrice;
      product.price = price;
      product.stockQty = stockQty;
      product.stock = stockQty;
      product.marginRate = 0.2;
      product.priceRule = "base_price_plus_20_percent_rounded_to_90";
      product.shopifyProductId = variant.product.id;
      product.shopifyProductHandle = variant.product.handle;
      product.shopifyVariantId = String(variant.id).replace(
        "gid://shopify/ProductVariant/",
        ""
      );
      product.merchandiseId = variant.id;
      product.shopifySyncStatus = "synced";
      product.shopifySyncError = undefined;

      updated++;
    } catch (error) {
      product.shopifySyncStatus = "error";
      product.shopifySyncError =
        error instanceof Error ? error.message : String(error);

      console.log(`- ERROR: ${product.shopifySyncError}`);

      errors++;
    }

    if ((i + 1) % SAVE_EVERY === 0) {
      syncAllCatalogFiles(products);
      console.log(`- Progress saved at ${i + 1}/${products.length}`);
    }

    if ((i + 1) % 25 === 0) {
      await sleep(BATCH_PAUSE_MS);
    }
  }

  syncAllCatalogFiles(products);

  console.log("");
  console.log("========== DONE ==========");
  console.log(`Updated: ${updated}`);
  console.log(`Not found: ${notFound}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log("==========================");
}

run().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});