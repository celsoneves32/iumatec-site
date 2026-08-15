import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const ROOT = process.cwd();
const ARGS = process.argv.slice(2);
const APPLY = ARGS.includes("--apply");
const APPLY_ALL = ARGS.includes("--all");
const EXPLICIT_DRY_RUN = ARGS.includes("--dry-run");
const DRY_RUN = !APPLY;
const FULL_CONFIRMATION = "IUMATEC-SUPABASE-SOURCE";
const MIN_EXPECTED_ELIGIBLE = 50_000;
const MAX_EXPECTED_ELIGIBLE = 60_000;
const MAX_LIMITED_APPLY = 1_000;
const SUPABASE_PAGE_SIZE = 1_000;
const SHOPIFY_NODE_BATCH_SIZE = 100;
const PRICE_TOLERANCE = 0.009;
const MAX_RETRIES = 7;

function argValue(name) {
  const prefix = `${name}=`;
  const found = ARGS.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length).trim() : "";
}

function integerArg(name, fallback = 0) {
  const raw = argValue(name);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return parsed;
}

const OFFSET = integerArg("--offset", 0);
const LIMIT = integerArg("--limit", 0);
const REPORT_ARG = argValue("--report");
const CONFIRMATION = argValue("--confirm");
const REPORT_PATH = path.resolve(
  ROOT,
  REPORT_ARG ||
    path.join(
      "integrations",
      "alltron",
      "out",
      "shopify-price-stock-sync",
      "latest.json",
    ),
);

if (APPLY && EXPLICIT_DRY_RUN) {
  throw new Error("Use either --dry-run or --apply, not both");
}
if (APPLY_ALL && !APPLY) {
  throw new Error("--all can only be used together with --apply");
}
if (APPLY_ALL && LIMIT) {
  throw new Error("Use --all or --limit, not both");
}
if (APPLY_ALL && CONFIRMATION !== FULL_CONFIRMATION) {
  throw new Error(
    `Full apply requires --confirm=${FULL_CONFIRMATION}`,
  );
}
if (APPLY && !APPLY_ALL && (!LIMIT || LIMIT > MAX_LIMITED_APPLY)) {
  throw new Error(
    `Limited apply requires --limit between 1 and ${MAX_LIMITED_APPLY}`,
  );
}

const domain = String(process.env.SHOPIFY_STORE_DOMAIN || "").trim();
const token = String(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "").trim();
const apiVersion = String(
  process.env.SHOPIFY_ADMIN_API_VERSION || "2025-04",
).trim();
const locationId = String(process.env.SHOPIFY_LOCATION_ID || "").trim();
const supabaseUrl = String(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
)
  .trim()
  .replace(/\/$/, "");
const supabaseKey = String(
  process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "",
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function text(value) {
  return String(value ?? "").trim();
}

function money(value) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

function stock(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.trunc(parsed);
}

function variantGid(value) {
  const clean = text(value);
  if (/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(clean)) return clean;
  const numeric = clean.match(/(\d+)$/)?.[1] || "";
  return numeric ? `gid://shopify/ProductVariant/${numeric}` : "";
}

function chunk(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(temporaryPath, filePath);
}

function loadInvalidCatalogKeys() {
  const reportDirectory = path.join(
    ROOT,
    "integrations",
    "alltron",
    "out",
    "shopify-id-repair",
  );
  const keys = new Set();

  for (const fileName of ["unmatched.json", "ambiguous.json"]) {
    const filePath = path.join(reportDirectory, fileName);
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
  const headers = {
    apikey: supabaseKey,
    "Content-Type": "application/json",
    ...extra,
  };
  if (supabaseKey.startsWith("eyJ")) {
    headers.Authorization = `Bearer ${supabaseKey}`;
  }
  return headers;
}

async function fetchProtectedSource() {
  const invalidCatalogKeys = loadInvalidCatalogKeys();
  const candidates = new Map();
  let rowsRead = 0;
  let rejectedInvalidReport = 0;
  let rejectedInvalidPrice = 0;
  let rejectedInvalidStock = 0;
  let rejectedInvalidVariant = 0;

  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const to = from + SUPABASE_PAGE_SIZE - 1;
    const endpoint =
      `${supabaseUrl}/rest/v1/products` +
      "?select=catalog_key,title,sku,price,stock_qty,merchandise_id,shopify_variant_id" +
      "&order=catalog_key.asc";
    const response = await fetch(endpoint, {
      headers: supabaseHeaders({
        Range: `${from}-${to}`,
        Prefer: "count=exact",
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      throw new Error(
        `Supabase HTTP ${response.status}: ${(await response.text()).slice(0, 800)}`,
      );
    }

    const batch = await response.json();
    rowsRead += batch.length;
    console.log(`Supabase: ${rowsRead.toLocaleString("pt-PT")} produtos lidos`);

    for (const row of batch) {
      const catalogKey = text(row?.catalog_key);
      if (invalidCatalogKeys.has(catalogKey)) {
        rejectedInvalidReport++;
        continue;
      }

      const protectedPrice = money(row?.price);
      if (!(protectedPrice > 0)) {
        rejectedInvalidPrice++;
        continue;
      }

      const protectedStock = stock(row?.stock_qty);
      if (protectedStock === null) {
        rejectedInvalidStock++;
        continue;
      }

      const id = variantGid(row?.merchandise_id || row?.shopify_variant_id);
      if (!id) {
        rejectedInvalidVariant++;
        continue;
      }

      const entries = candidates.get(id) || [];
      entries.push({
        variantId: id,
        catalogKey,
        title: text(row?.title),
        sku: text(row?.sku),
        price: protectedPrice,
        stock: protectedStock,
      });
      candidates.set(id, entries);
    }

    if (batch.length < SUPABASE_PAGE_SIZE) break;
  }

  const exact = [];
  let ambiguousVariants = 0;
  for (const entries of candidates.values()) {
    const signatures = new Set(
      entries.map((entry) => `${entry.price.toFixed(2)}|${entry.stock}`),
    );
    if (signatures.size !== 1) {
      ambiguousVariants++;
      continue;
    }
    exact.push(entries[0]);
  }
  exact.sort((left, right) => left.variantId.localeCompare(right.variantId));

  if (
    exact.length < MIN_EXPECTED_ELIGIBLE ||
    exact.length > MAX_EXPECTED_ELIGIBLE
  ) {
    throw new Error(
      `Safety stop: expected ${MIN_EXPECTED_ELIGIBLE}-${MAX_EXPECTED_ELIGIBLE} protected variants, found ${exact.length}`,
    );
  }

  return {
    exact,
    summary: {
      rowsRead,
      exactVariants: exact.length,
      ambiguousVariants,
      rejectedInvalidReport,
      rejectedInvalidPrice,
      rejectedInvalidStock,
      rejectedInvalidVariant,
    },
  };
}

async function shopifyFetch(query, variables = {}) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(
        `https://${domain}/admin/api/${apiVersion}/graphql.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": token,
          },
          body: JSON.stringify({ query, variables }),
          signal: AbortSignal.timeout(60_000),
        },
      );
      const raw = await response.text();
      let json;
      try {
        json = JSON.parse(raw);
      } catch {
        throw new Error(
          `Shopify returned non-JSON (${response.status}): ${raw.slice(0, 300)}`,
        );
      }

      if (!response.ok) {
        throw new Error(`Shopify HTTP ${response.status}: ${raw.slice(0, 800)}`);
      }

      if (json.errors?.length) {
        const message = json.errors
          .map((error) => error?.message || JSON.stringify(error))
          .join(" | ");
        throw new Error(message);
      }

      const throttle = json?.extensions?.cost?.throttleStatus;
      if (
        throttle &&
        throttle.currentlyAvailable < 100 &&
        throttle.restoreRate > 0
      ) {
        const waitMs = Math.ceil(
          ((100 - throttle.currentlyAvailable) / throttle.restoreRate) * 1_000,
        );
        await sleep(Math.min(10_000, Math.max(250, waitMs)));
      }

      return json.data;
    } catch (error) {
      lastError = error;
      if (attempt === MAX_RETRIES) break;
      const delay = Math.min(30_000, 1_000 * 2 ** (attempt - 1));
      console.log(
        `Shopify retry ${attempt}/${MAX_RETRIES - 1} in ${delay / 1_000}s: ${error?.message || error}`,
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

async function readShopifyVariants(ids) {
  const query = `
    query ReadProtectedVariants($ids: [ID!]!, $locationId: ID!) {
      nodes(ids: $ids) {
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
            inventoryLevel(locationId: $locationId) {
              id
              quantities(names: ["available"]) {
                name
                quantity
              }
            }
          }
        }
      }
    }
  `;
  const data = await shopifyFetch(query, { ids, locationId });
  return data?.nodes || [];
}

async function updateVariantPrice(productId, variantId, price) {
  const mutation = `
    mutation UpdateProtectedPrice(
      $productId: ID!
      $variants: [ProductVariantsBulkInput!]!
    ) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants { id price }
        userErrors { field message }
      }
    }
  `;
  const data = await shopifyFetch(mutation, {
    productId,
    variants: [{ id: variantId, price: price.toFixed(2) }],
  });
  const errors = data?.productVariantsBulkUpdate?.userErrors || [];
  if (errors.length) throw new Error(JSON.stringify(errors));
}

async function activateInventory(inventoryItemId, desiredStock) {
  const mutation = `
    mutation ActivateProtectedInventory(
      $inventoryItemId: ID!
      $locationId: ID!
      $available: Int
    ) {
      inventoryActivate(
        inventoryItemId: $inventoryItemId
        locationId: $locationId
        available: $available
      ) {
        inventoryLevel { id }
        userErrors { field message }
      }
    }
  `;
  const data = await shopifyFetch(mutation, {
    inventoryItemId,
    locationId,
    available: desiredStock,
  });
  const errors = data?.inventoryActivate?.userErrors || [];
  if (errors.length) {
    return { ok: false, errors };
  }
  return { ok: Boolean(data?.inventoryActivate?.inventoryLevel?.id), errors: [] };
}

async function setInventoryAbsolute(
  inventoryItemId,
  desiredStock,
  currentStock,
) {
  const mutation = `
    mutation SetProtectedInventory($input: InventorySetQuantitiesInput!) {
      inventorySetQuantities(input: $input) {
        inventoryAdjustmentGroup {
          reason
          changes { name delta }
        }
        userErrors { field message }
      }
    }
  `;
  const data = await shopifyFetch(mutation, {
    input: {
      name: "available",
      reason: "correction",
      quantities: [
        {
          inventoryItemId,
          locationId,
          quantity: desiredStock,
          compareQuantity: currentStock,
        },
      ],
    },
  });
  const errors = data?.inventorySetQuantities?.userErrors || [];
  if (errors.length) throw new Error(JSON.stringify(errors));
}

function currentAvailable(inventoryLevel) {
  const quantity = inventoryLevel?.quantities?.find(
    (entry) => entry?.name === "available",
  )?.quantity;
  return Number.isInteger(quantity) ? quantity : null;
}

async function main() {
  const startedAt = new Date();
  const source = await fetchProtectedSource();
  const selected = APPLY_ALL
    ? source.exact
    : LIMIT
      ? source.exact.slice(OFFSET, OFFSET + LIMIT)
      : source.exact.slice(OFFSET);

  if (!selected.length) {
    throw new Error(`No protected variants selected at offset ${OFFSET}`);
  }

  console.log("\n========== SAFE PRICE/STOCK SYNC ==========");
  console.log(`Mode: ${DRY_RUN ? "AUDIT (0 changes)" : "APPLY"}`);
  console.log(`Source: Supabase public.products`);
  console.log(`Eligible protected variants: ${source.exact.length}`);
  console.log(`Selected: ${selected.length}`);
  console.log(`Offset: ${OFFSET}`);
  console.log("Price formula recalculations: 0");
  console.log("Product deletions: 0");
  console.log(`Source validation: ${JSON.stringify(source.summary)}`);
  console.log("===========================================\n");

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: DRY_RUN ? "audit" : "apply",
    source: "supabase.public.products",
    eligible: source.exact.length,
    selected: selected.length,
    offset: OFFSET,
    checked: 0,
    notFound: 0,
    pricesAlreadyExact: 0,
    pricesWouldUpdate: 0,
    pricesApplied: 0,
    stocksAlreadyExact: 0,
    stocksWouldUpdate: 0,
    stocksApplied: 0,
    inventoryActivated: 0,
    stockUnavailable: 0,
    errors: 0,
    priceFormulaRecalculations: 0,
    productDeletions: 0,
    sourceValidation: source.summary,
    errorDetails: [],
  };

  const sourceById = new Map(selected.map((entry) => [entry.variantId, entry]));
  const batches = chunk(selected, SHOPIFY_NODE_BATCH_SIZE);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    let nodes;
    try {
      nodes = await readShopifyVariants(batch.map((entry) => entry.variantId));
    } catch (error) {
      summary.errors += batch.length;
      summary.errorDetails.push({
        scope: "shopify-read-batch",
        firstVariantId: batch[0]?.variantId,
        count: batch.length,
        error: error?.message || String(error),
      });
      continue;
    }

    for (let index = 0; index < nodes.length; index++) {
      const variant = nodes[index];
      const fallbackSource = batch[index];
      const desired = sourceById.get(variant?.id) || fallbackSource;

      if (!variant?.id || !variant?.product?.id || !variant?.inventoryItem?.id) {
        summary.notFound++;
        continue;
      }

      summary.checked++;
      try {
        const currentPrice = money(variant.price);
        if (Math.abs(currentPrice - desired.price) <= PRICE_TOLERANCE) {
          summary.pricesAlreadyExact++;
        } else {
          summary.pricesWouldUpdate++;
          if (!DRY_RUN) {
            await updateVariantPrice(
              variant.product.id,
              variant.id,
              desired.price,
            );
            summary.pricesApplied++;
          }
        }

        const level = variant.inventoryItem.inventoryLevel;
        const currentStock = currentAvailable(level);
        if (currentStock === desired.stock) {
          summary.stocksAlreadyExact++;
        } else {
          summary.stocksWouldUpdate++;
          if (!DRY_RUN) {
            if (!level?.id || currentStock === null) {
              const activation = await activateInventory(
                variant.inventoryItem.id,
                desired.stock,
              );
              if (!activation.ok) {
                summary.stockUnavailable++;
              } else {
                summary.inventoryActivated++;
                summary.stocksApplied++;
              }
            } else {
              await setInventoryAbsolute(
                variant.inventoryItem.id,
                desired.stock,
                currentStock,
              );
              summary.stocksApplied++;
            }
          }
        }
      } catch (error) {
        summary.errors++;
        if (summary.errorDetails.length < 100) {
          summary.errorDetails.push({
            variantId: desired?.variantId,
            sku: desired?.sku,
            title: desired?.title,
            error: error?.message || String(error),
          });
        }
      }
    }

    if (
      (batchIndex + 1) % 10 === 0 ||
      batchIndex + 1 === batches.length
    ) {
      console.log(
        `Shopify: ${Math.min((batchIndex + 1) * SHOPIFY_NODE_BATCH_SIZE, selected.length).toLocaleString("pt-PT")}/${selected.length.toLocaleString("pt-PT")} verificadas`,
      );
      writeJson(REPORT_PATH, {
        ...summary,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  summary.finishedAt = new Date().toISOString();
  summary.durationSeconds = Math.round(
    (Date.now() - startedAt.getTime()) / 1_000,
  );
  writeJson(REPORT_PATH, summary);

  console.log("\n========== RESULTADO ==========");
  for (const [key, value] of Object.entries(summary)) {
    if (key === "errorDetails" || key === "sourceValidation") continue;
    console.log(`${key}: ${value}`);
  }
  console.log(`report: ${REPORT_PATH}`);
  console.log("================================\n");

  if (summary.errors > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("FATAL ERROR:", error?.message || error);
  process.exit(1);
});
