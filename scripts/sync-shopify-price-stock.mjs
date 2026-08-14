
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";

const ARGS = process.argv.slice(2);
const APPLY = ARGS.includes("--apply");
const EXPLICIT_DRY_RUN = ARGS.includes("--dry-run");
const DRY_RUN = !APPLY;

function argValue(name) {
  const prefix = `${name}=`;
  const found = ARGS.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length).trim() : "";
}

const rawProcessLimit = argValue("--limit");
const PROCESS_LIMIT = rawProcessLimit ? Number(rawProcessLimit) : 0;
const MAX_APPLY_LIMIT = 250;
if (
  rawProcessLimit &&
  (!Number.isInteger(PROCESS_LIMIT) || PROCESS_LIMIT < 1)
) {
  throw new Error("--limit must be a positive integer");
}
if (APPLY && EXPLICIT_DRY_RUN) {
  throw new Error("Use either --dry-run or --apply, not both");
}
if (APPLY && (!PROCESS_LIMIT || PROCESS_LIMIT > MAX_APPLY_LIMIT)) {
  throw new Error(
    `--apply requires --limit between 1 and ${MAX_APPLY_LIMIT}`
  );
}

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || "2025-04";
const locationId = process.env.SHOPIFY_LOCATION_ID;
const supabaseUrl = String(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
)
  .trim()
  .replace(/\/$/, "");
const supabaseKey = String(
  process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
).trim();

if (!domain) throw new Error("Missing SHOPIFY_STORE_DOMAIN");
if (!token) throw new Error("Missing SHOPIFY_ADMIN_ACCESS_TOKEN");
if (!locationId) throw new Error("Missing SHOPIFY_LOCATION_ID");
if (!supabaseUrl) {
  throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
}
if (!supabaseKey) {
  throw new Error("Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");
}

const catalogPaths = [
  path.join(
    process.cwd(),
    "integrations",
    "alltron",
    "out",
    "iumatec-storefront-clean.json"
  ),
  path.join(
    process.cwd(),
    "integrations",
    "alltron",
    "out",
    "iumatec-master-catalog.json"
  ),
  path.join(
    process.cwd(),
    "data",
    "catalog.json"
  ),
  path.join(
    process.cwd(),
    "integrations",
    "alltron",
    "out",
    "winning-products.json"
  ),
  path.join(
    process.cwd(),
    "integrations",
    "alltron",
    "out",
    "iumatec-catalog-live.json"
  ),
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

const BATCH_PAUSE_MS = 600;
const RETRY_PAUSE_MS = 1500;
const MAX_RETRIES = 4;
const SAVE_EVERY = 100;
const SUPABASE_PAGE_SIZE = 1000;
const PRICE_TOLERANCE = 0.009;
const REPAIR_REPORT_DIR = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "out",
  "shopify-id-repair"
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function text(value) {
  return String(value ?? "").trim();
}

function money(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

function variantGid(value) {
  const clean = text(value);
  if (/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(clean)) return clean;
  const numeric = clean.match(/(\d+)$/)?.[1] || "";
  return numeric ? `gid://shopify/ProductVariant/${numeric}` : "";
}

function loadInvalidCatalogKeys() {
  const keys = new Set();
  for (const fileName of ["unmatched.json", "ambiguous.json"]) {
    const filePath = path.join(REPAIR_REPORT_DIR, fileName);
    if (!fs.existsSync(filePath)) continue;
    const rows = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!Array.isArray(rows)) {
      throw new Error(`${fileName} is not an array`);
    }
    for (const row of rows) {
      const key = text(row?.catalogKey);
      if (key) keys.add(key);
    }
  }
  return keys;
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function fetchProtectedPrices() {
  const invalidCatalogKeys = loadInvalidCatalogKeys();
  const byVariant = new Map();
  let read = 0;
  let rejectedInvalidReport = 0;
  let rejectedInvalidPrice = 0;
  let rejectedInvalidVariant = 0;

  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const to = from + SUPABASE_PAGE_SIZE - 1;
    const url =
      `${supabaseUrl}/rest/v1/products` +
      "?select=catalog_key,price,merchandise_id,shopify_variant_id" +
      "&order=catalog_key.asc";
    const response = await fetch(url, {
      headers: supabaseHeaders({
        Range: `${from}-${to}`,
        Prefer: "count=exact",
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) {
      throw new Error(
        `Supabase HTTP ${response.status}: ${(await response.text()).slice(0, 800)}`
      );
    }
    const batch = await response.json();
    read += batch.length;
    console.log(`Supabase protected prices: ${read.toLocaleString("pt-PT")}`);

    for (const row of batch) {
      const catalogKey = text(row?.catalog_key);
      if (invalidCatalogKeys.has(catalogKey)) {
        rejectedInvalidReport++;
        continue;
      }
      const price = money(row?.price);
      if (!(price > 0)) {
        rejectedInvalidPrice++;
        continue;
      }
      const id = variantGid(
        row?.merchandise_id || row?.shopify_variant_id
      );
      if (!id) {
        rejectedInvalidVariant++;
        continue;
      }
      const prices = byVariant.get(id) || new Set();
      prices.add(price.toFixed(2));
      byVariant.set(id, prices);
    }

    if (batch.length < SUPABASE_PAGE_SIZE) break;
  }

  const exact = new Map();
  let ambiguous = 0;
  for (const [id, prices] of byVariant) {
    if (prices.size !== 1) {
      ambiguous++;
      continue;
    }
    exact.set(id, money([...prices][0]));
  }

  return {
    exact,
    summary: {
      rowsRead: read,
      exactVariantPrices: exact.size,
      ambiguousVariantPrices: ambiguous,
      rejectedInvalidReport,
      rejectedInvalidPrice,
      rejectedInvalidVariant,
    },
  };
}

function loadBestProtectedCatalog(protectedPriceByVariant) {
  let best = null;

  for (const filePath of existingCatalogPaths) {
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
      if (!Array.isArray(parsed)) {
        console.log(`- Catalog ignored (not an array): ${filePath}`);
        continue;
      }

      const seen = new Set();
      const eligible = [];
      for (const product of parsed) {
        const id = variantGid(
          product?.merchandiseId ||
            product?.shopifyVariantId ||
            product?.variantId
        );
        if (!id || seen.has(id) || !protectedPriceByVariant.has(id)) continue;
        seen.add(id);
        eligible.push(product);
      }

      console.log(
        `Catalog candidate: ${path.basename(filePath)} | rows=${parsed.length.toLocaleString("pt-PT")} | protected=${eligible.length.toLocaleString("pt-PT")}`
      );

      if (!best || eligible.length > best.eligible.length) {
        best = { filePath, products: parsed, eligible };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`- Catalog ignored (${path.basename(filePath)}): ${message}`);
    }
  }

  if (!best || best.eligible.length === 0) {
    throw new Error(
      "No catalog contains variants with a unique protected Supabase price."
    );
  }

  return best;
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

async function findVariantById(id) {
  const query = `
    query FindVariantById($id: ID!) {
      node(id: $id) {
        ... on ProductVariant {
            id
            sku
            price
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
  `;

  const data = await shopifyFetch(query, { id });
  return data?.node || null;
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

async function run() {
  const protectedPrices = await fetchProtectedPrices();
  const selectedCatalog = loadBestProtectedCatalog(protectedPrices.exact);
  const productsToProcess = PROCESS_LIMIT
    ? selectedCatalog.eligible.slice(0, PROCESS_LIMIT)
    : selectedCatalog.eligible;

  console.log(`Shopify domain: ${domain}`);
  console.log(`Location ID: ${locationId}`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (0 changes)" : "APPLY"}`);
  console.log(`Primary catalog: ${selectedCatalog.filePath}`);
  console.log(`Products in catalog: ${selectedCatalog.products.length}`);
  console.log(
    `Eligible protected variants: ${selectedCatalog.eligible.length.toLocaleString("pt-PT")}`
  );
  console.log(`Products to process: ${productsToProcess.length}`);
  console.log(
    `Protected Shopify prices: ${protectedPrices.exact.size.toLocaleString("pt-PT")}`
  );
  console.log("Pricing: exact protected Supabase price (no recalculation)");
  console.log(
    `Price protections: ${JSON.stringify(protectedPrices.summary)}`
  );
  console.log(
    `Retry: ${MAX_RETRIES}x | Pause every 25 products: ${BATCH_PAUSE_MS}ms`
  );

  let processed = 0;
  let notFound = 0;
  let errors = 0;
  let priceAlreadyExact = 0;
  let pricesWouldUpdate = 0;
  let pricesApplied = 0;
  let stocksWouldSet = 0;
  let stocksApplied = 0;

  for (let i = 0; i < productsToProcess.length; i++) {
    const product = productsToProcess[i];

    const sku = String(product.sku || "").trim();
    const basePrice = getBasePrice(product);
    const stockQty = getStockQty(product);
    const protectedVariantId = variantGid(
      product?.merchandiseId ||
        product?.shopifyVariantId ||
        product?.variantId
    );
    const price = protectedPrices.exact.get(protectedVariantId);

    console.log("");
    console.log(
      `[${i + 1}/${productsToProcess.length}] SKU: ${sku || "(empty)"} | Variant: ${protectedVariantId}`
    );

    try {
      const variant = await findVariantById(protectedVariantId);

      if (!variant?.id || !variant?.inventoryItem?.id || !variant?.product?.id) {
        console.log("- NOT FOUND BY VALIDATED VARIANT ID");
        product.shopifySyncStatus = "not-found";
        notFound++;
        continue;
      }

      const currentShopifyPrice = money(variant.price);
      if (Math.abs(currentShopifyPrice - price) > PRICE_TOLERANCE) {
        pricesWouldUpdate++;
        console.log(
          `- Protected price ${DRY_RUN ? "would update" : "updated"}: ${currentShopifyPrice.toFixed(2)} -> ${price.toFixed(2)}`
        );
        if (!DRY_RUN) {
          await updateVariantPrice(variant.product.id, variant.id, price);
          pricesApplied++;
        }
      } else {
        priceAlreadyExact++;
        console.log(`- Protected price already exact: ${price.toFixed(2)}`);
      }

      if (DRY_RUN) {
        console.log(`- Stock would be set: ${stockQty}`);
        stocksWouldSet++;
      } else {
        await ensureInventoryActive(variant.inventoryItem.id, locationId);
        console.log("- Inventory active at location");

        await setInventoryAbsolute(
          variant.inventoryItem.id,
          locationId,
          stockQty
        );
        console.log(`- Stock set: ${stockQty}`);
        stocksApplied++;
      }

      product.basePrice = basePrice;
      product.price = price;
      product.stockQty = stockQty;
      product.stock = stockQty;
      product.priceRule = "supabase_protected_price";
      product.shopifyProductId = variant.product.id;
      product.shopifyProductHandle = variant.product.handle;
      product.shopifyVariantId = String(variant.id).replace(
        "gid://shopify/ProductVariant/",
        ""
      );
      product.merchandiseId = variant.id;
      product.shopifySyncStatus = "synced";
      product.shopifySyncError = undefined;

      processed++;
    } catch (error) {
      product.shopifySyncStatus = "error";
      product.shopifySyncError =
        error instanceof Error ? error.message : String(error);

      console.log(`- ERROR: ${product.shopifySyncError}`);

      errors++;
    }

    if (!DRY_RUN && (i + 1) % SAVE_EVERY === 0) {
      console.log(`- Progress: ${i + 1}/${productsToProcess.length}`);
    }

    if ((i + 1) % 25 === 0) {
      await sleep(BATCH_PAUSE_MS);
    }
  }

  console.log("");
  console.log("========== DONE ==========");
  console.log(`Eligible processed: ${processed}`);
  console.log(`Not found: ${notFound}`);
  console.log(`Prices already exact: ${priceAlreadyExact}`);
  console.log(`Prices that would update: ${pricesWouldUpdate}`);
  console.log(`Prices applied: ${pricesApplied}`);
  console.log(`Stocks that would be set: ${stocksWouldSet}`);
  console.log(`Stocks applied: ${stocksApplied}`);
  console.log(`Errors: ${errors}`);
  console.log("Price formula recalculations: 0");
  console.log("Local catalog writes: 0");
  console.log(
    `Changes made: ${DRY_RUN ? 0 : pricesApplied + stocksApplied}`
  );
  console.log("==========================");
}

run().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
