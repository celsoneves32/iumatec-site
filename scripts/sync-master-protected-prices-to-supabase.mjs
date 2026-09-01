import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const ROOT = process.cwd();
const ARGS = process.argv.slice(2);

const APPLY = ARGS.includes("--apply");
const APPLY_ALL = ARGS.includes("--all");
const PROTECTED_ONLY = ARGS.includes("--protected-only");
const FULL_CONFIRMATION = "IUMATEC-PROTECTED-PRICE";

const SUPABASE_PAGE_SIZE = 1_000;
const MAX_LIMITED_APPLY = 1_000;
const MAX_RETRIES = 7;
const PATCH_CONCURRENCY = 6;

const MIN_SUPABASE_ROWS = 50_000;
const MAX_SUPABASE_ROWS = 60_000;
const MIN_MASTER_ROWS = 100_000;
const MAX_MASTER_ROWS = 300_000;
const MIN_MATCHED_ROWS = 40_000;
const MIN_MATCHED_RATIO = 0.85;
const MAX_UNMATCHED_ROWS = 7_000;
const MAX_UNMATCHED_RATIO = 0.12;
const MAX_AMBIGUOUS_ROWS = 25;
const MAX_INVALID_MASTER_ROWS = 2_000;
const MAX_PRICE_CHANGES = 30_000;
const MAX_PRICE_CHANGE_RATIO = 0.60;

// Safety policy for this repair:
// - master catalog is the only owner of protected sale price
// - never insert products
// - never update stock here
// - never lower a price automatically
// - large increases (>50%) stay quarantined for manual review
const MAX_AUTOMATIC_INCREASE_RATIO = 1.50;

function argValue(name) {
  const prefix = `${name}=`;
  const found = ARGS.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length).trim() : "";
}

function integerArg(name, fallback = 0) {
  const raw = argValue(name);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return value;
}

const LIMIT = integerArg("--limit", 0);
const OFFSET = integerArg("--offset", 0);
const CONFIRMATION = argValue("--confirm");

const MASTER_PATH = path.resolve(
  ROOT,
  argValue("--master") ||
    path.join(
      "integrations",
      "alltron",
      "out",
      "iumatec-master-catalog.json",
    ),
);

const REPORT_PATH = path.resolve(
  ROOT,
  argValue("--report") ||
    path.join(
      "integrations",
      "alltron",
      "out",
      "master-protected-price-sync",
      "latest.json",
    ),
);

if (APPLY_ALL && !APPLY) {
  throw new Error("--all can only be used with --apply");
}
if (APPLY_ALL && LIMIT) {
  throw new Error("Use --all or --limit, not both");
}
if (APPLY_ALL && CONFIRMATION !== FULL_CONFIRMATION) {
  throw new Error(`Full apply requires --confirm=${FULL_CONFIRMATION}`);
}
if (APPLY && !APPLY_ALL && (!LIMIT || LIMIT > MAX_LIMITED_APPLY)) {
  throw new Error(
    `Limited apply requires --limit between 1 and ${MAX_LIMITED_APPLY}`,
  );
}

const supabaseUrl = String(
  process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "",
)
  .trim()
  .replace(/\/$/, "");

const supabaseKey = String(
  process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "",
).trim();

if (!supabaseUrl) throw new Error("Missing SUPABASE_URL");
if (!supabaseKey) throw new Error("Missing SUPABASE_SECRET_KEY");
if (!fs.existsSync(MASTER_PATH)) {
  throw new Error(`Master catalog not found: ${MASTER_PATH}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function text(value) {
  return String(value ?? "").trim();
}

function norm(value) {
  return text(value).toUpperCase().replace(/\s+/g, " ");
}

function normCatalogKey(value) {
  return norm(value).replace(/^LITM\s*:\s*/, "");
}

function normEan(value) {
  const digits = text(value).replace(/\D/g, "");
  return digits.length >= 8 ? digits : norm(value);
}

function number(value) {
  if (value === null || value === undefined || value === "") return null;

  const clean = String(value)
    .trim()
    .replace(/[’']/g, "")
    .replace(/\s/g, "")
    .replace(",", ".")
    .match(/-?\d+(?:\.\d+)?/)?.[0];

  if (!clean) return null;

  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : null;
}

function money(value) {
  const parsed = number(value);
  return parsed !== null && parsed > 0
    ? Number(parsed.toFixed(2))
    : null;
}

function sameMoney(left, right) {
  if (left === null && right === null) return true;
  if (left === null || right === null) return false;
  return Math.abs(left - right) <= 0.009;
}

function nullableText(value) {
  const valueText = text(value);
  return valueText || null;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(
    temporaryPath,
    JSON.stringify(value, null, 2),
    "utf8",
  );
  fs.renameSync(temporaryPath, filePath);
}

function headers(extra = {}) {
  return {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function retry(label, operation) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (error?.permanent || attempt === MAX_RETRIES) {
        break;
      }

      const delay = Math.min(
        30_000,
        1_000 * 2 ** (attempt - 1),
      );

      console.log(
        `${label}: retry ${attempt}/${MAX_RETRIES - 1} in ${delay / 1_000}s`,
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

async function fetchWithRetry(label, endpoint, options) {
  return retry(label, async () => {
    const response = await fetch(endpoint, options);

    if (response.ok) {
      return response;
    }

    const body = (await response.text()).slice(0, 800);
    const error = new Error(
      `HTTP ${response.status}: ${body}`,
    );

    if (response.status < 500 && response.status !== 429) {
      error.permanent = true;
    }

    throw error;
  });
}

function readMasterCatalog() {
  console.log(`Reading master catalog: ${MASTER_PATH}`);

  const parsed = JSON.parse(
    fs.readFileSync(MASTER_PATH, "utf8"),
  );

  if (!Array.isArray(parsed)) {
    throw new Error(
      "iumatec-master-catalog.json must contain a JSON array",
    );
  }

  console.log(
    `Master: ${parsed.length.toLocaleString("pt-PT")} products read`,
  );

  return parsed;
}

function masterRow(product) {
  const litm = norm(
    product?.litm ||
      product?.alltronSku ||
      product?.alltron_sku,
  );

  return {
    litm,
    sku: norm(product?.sku),
    internalNumber: norm(
      product?.internalNumber ||
        product?.internal_number,
    ),
    ean: normEan(product?.ean),

    price: money(product?.price),
    originalPrice: money(
      product?.originalPrice ||
        product?.original_price,
    ),
    purchaseCostInclVat: money(
      product?.purchaseCostInclVat ||
        product?.purchase_cost_incl_vat,
    ),
    minimumSafePrice: money(
      product?.minimumSafePrice ||
        product?.minimum_safe_price,
    ),
    priceSafetyStatus:
      nullableText(
        product?.priceSafetyStatus ||
          product?.price_safety_status,
      ),
    priceRule:
      nullableText(
        product?.priceRule ||
          product?.price_rule,
      ),
  };
}

async function fetchSupabaseProducts() {
  const rows = [];

  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const to = from + SUPABASE_PAGE_SIZE - 1;

    const endpoint =
      `${supabaseUrl}/rest/v1/products` +
      "?select=catalog_key,sku,ean,internal_number,price,original_price,purchase_cost_incl_vat,minimum_safe_price,price_safety_status,price_rule" +
      "&order=catalog_key.asc";

    const response = await fetchWithRetry(
      "Supabase read",
      endpoint,
      {
        headers: headers({
          Range: `${from}-${to}`,
          Prefer: "count=exact",
        }),
        signal: AbortSignal.timeout(60_000),
      },
    );

    const batch = await response.json();

    rows.push(...batch);

    console.log(
      `Supabase: ${rows.length.toLocaleString("pt-PT")} products read`,
    );

    if (batch.length < SUPABASE_PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

function addIndex(index, key, row) {
  if (!key) return;

  const values = index.get(key) || [];
  values.push(row);
  index.set(key, values);
}

function equivalentUnique(rows) {
  if (!rows?.length) return null;

  const signatures = new Set(
    rows.map(
      (row) =>
        `${row.price ?? "null"}|${row.minimumSafePrice ?? "null"}|${row.priceSafetyStatus ?? ""}`,
    ),
  );

  return signatures.size === 1 ? rows[0] : null;
}

function buildMasterIndexes(rows) {
  const indexes = {
    litm: new Map(),
    sku: new Map(),
    internal: new Map(),
    ean: new Map(),
  };

  for (const rawProduct of rows) {
    const row = masterRow(rawProduct);

    if (!row.litm) {
      continue;
    }

    addIndex(indexes.litm, row.litm, row);
    addIndex(indexes.sku, row.sku, row);
    addIndex(indexes.internal, row.internalNumber, row);
    addIndex(indexes.ean, row.ean, row);
  }

  return indexes;
}

function matchMasterRow(product, indexes) {
  const catalogKey = normCatalogKey(product.catalog_key);

  if (catalogKey) {
    const rows = indexes.litm.get(catalogKey);

    if (rows?.length) {
      const row = equivalentUnique(rows);

      return row
        ? { method: "catalog-key", row }
        : { ambiguous: true };
    }
  }

  const checks = [
    ["sku", norm(product.sku), indexes.sku],
    [
      "internal-number",
      norm(product.internal_number),
      indexes.internal,
    ],
    ["ean", normEan(product.ean), indexes.ean],
  ];

  const matches = [];

  for (const [method, key, index] of checks) {
    if (!key) continue;

    const row = equivalentUnique(index.get(key));

    if (row) {
      matches.push({ method, row });
    }
  }

  const signatures = new Map();

  for (const match of matches) {
    const signature =
      `${match.row.litm}|` +
      `${match.row.price ?? "null"}|` +
      `${match.row.minimumSafePrice ?? "null"}`;

    if (!signatures.has(signature)) {
      signatures.set(signature, match);
    }
  }

  if (signatures.size === 1) {
    return [...signatures.values()][0];
  }

  if (signatures.size > 1) {
    return { ambiguous: true };
  }

  return null;
}

function fieldsDiffer(product, desired) {
  return (
    !sameMoney(
      money(product.original_price),
      desired.originalPrice,
    ) ||
    !sameMoney(
      money(product.purchase_cost_incl_vat),
      desired.purchaseCostInclVat,
    ) ||
    !sameMoney(
      money(product.minimum_safe_price),
      desired.minimumSafePrice,
    ) ||
    nullableText(product.price_safety_status) !==
      desired.priceSafetyStatus ||
    nullableText(product.price_rule) !==
      desired.priceRule
  );
}

function buildPlan(products, masterProducts) {
  const indexes = buildMasterIndexes(masterProducts);

  const seenCatalogKeys = new Set();
  const duplicateCatalogKeys = [];

  const exact = [];
  const eligible = [];
  const quarantinedLargeIncrease = [];
  const blockedDecrease = [];
  const unmatched = [];
  const ambiguous = [];
  const invalidMaster = [];
  const matchMethods = {};

  for (const product of products) {
    const catalogKey = text(product.catalog_key);

    if (!catalogKey) {
      unmatched.push({
        catalogKey,
        sku: text(product.sku),
        reason: "missing-catalog-key",
      });
      continue;
    }

    if (seenCatalogKeys.has(catalogKey)) {
      duplicateCatalogKeys.push(catalogKey);
    }

    seenCatalogKeys.add(catalogKey);

    const match = matchMasterRow(product, indexes);

    if (!match) {
      unmatched.push({
        catalogKey,
        sku: text(product.sku),
      });
      continue;
    }

    if (match.ambiguous) {
      ambiguous.push({
        catalogKey,
        sku: text(product.sku),
      });
      continue;
    }

    matchMethods[match.method] =
      (matchMethods[match.method] || 0) + 1;

    const desired = match.row;

    if (!(desired.price > 0)) {
      invalidMaster.push({
        catalogKey,
        sku: text(product.sku),
        litm: desired.litm,
        reason: "invalid-master-price",
      });
      continue;
    }

    const currentPrice = money(product.price);
    const desiredPrice = desired.price;

    const priceChanged =
      currentPrice === null ||
      !sameMoney(currentPrice, desiredPrice);

    const metadataChanged = fieldsDiffer(
      product,
      desired,
    );

    const ratio =
      currentPrice && desiredPrice
        ? desiredPrice / currentPrice
        : null;

    const planned = {
      catalogKey,
      sku: text(product.sku),
      litm: desired.litm,
      method: match.method,

      currentPrice,
      desiredPrice,
      priceRatio: ratio,

      originalPrice: desired.originalPrice,
      purchaseCostInclVat:
        desired.purchaseCostInclVat,
      minimumSafePrice:
        desired.minimumSafePrice,
      priceSafetyStatus:
        desired.priceSafetyStatus,
      priceRule:
        desired.priceRule,

      priceChanged,
      metadataChanged,
    };

    if (!priceChanged && !metadataChanged) {
      exact.push(planned);
      continue;
    }

    if (
      currentPrice !== null &&
      desiredPrice < currentPrice - 0.009
    ) {
      blockedDecrease.push({
        ...planned,
        reason: "PRICE_DECREASE_BLOCKED",
      });
      continue;
    }

    if (
      ratio !== null &&
      ratio > MAX_AUTOMATIC_INCREASE_RATIO
    ) {
      quarantinedLargeIncrease.push({
        ...planned,
        reason: "PRICE_INCREASE_OVER_50_PERCENT",
      });
      continue;
    }

    eligible.push(planned);
  }

  const matched =
    exact.length +
    eligible.length +
    quarantinedLargeIncrease.length +
    blockedDecrease.length;

  const eligiblePriceChanges = eligible.filter(
    (row) => row.priceChanged,
  );

  const eligibleMetadataOnly = eligible.filter(
    (row) =>
      !row.priceChanged &&
      row.metadataChanged,
  );

  return {
    eligible,
    summary: {
      supabaseRows: products.length,
      masterRows: masterProducts.length,
      matched,
      matchedRatio:
        products.length
          ? matched / products.length
          : 0,

      exact: exact.length,

      eligibleChanges: eligible.length,
      eligiblePriceChanges:
        eligiblePriceChanges.length,
      eligibleMetadataOnly:
        eligibleMetadataOnly.length,
      eligiblePriceChangeRatio:
        matched
          ? eligiblePriceChanges.length / matched
          : 0,

      quarantinedLargeIncrease:
        quarantinedLargeIncrease.length,
      blockedDecrease:
        blockedDecrease.length,

      unmatched: unmatched.length,
      unmatchedRatio:
        products.length
          ? unmatched.length / products.length
          : 0,

      ambiguous: ambiguous.length,
      invalidMaster:
        invalidMaster.length,

      duplicateCatalogKeys:
        duplicateCatalogKeys.length,

      matchMethods,
    },

    samples: {
      eligible: eligible.slice(0, 50),
      quarantinedLargeIncrease:
        quarantinedLargeIncrease.slice(0, 50),
      blockedDecrease:
        blockedDecrease.slice(0, 50),
      unmatched:
        unmatched.slice(0, 50),
      ambiguous:
        ambiguous.slice(0, 50),
      invalidMaster:
        invalidMaster.slice(0, 50),
      duplicateCatalogKeys:
        duplicateCatalogKeys.slice(0, 50),
    },
  };
}

function safetyChecks(summary) {
  const failures = [];

  if (
    summary.supabaseRows < MIN_SUPABASE_ROWS ||
    summary.supabaseRows > MAX_SUPABASE_ROWS
  ) {
    failures.push(
      `Expected ${MIN_SUPABASE_ROWS}-${MAX_SUPABASE_ROWS} Supabase rows, found ${summary.supabaseRows}`,
    );
  }

  if (
    summary.masterRows < MIN_MASTER_ROWS ||
    summary.masterRows > MAX_MASTER_ROWS
  ) {
    failures.push(
      `Expected ${MIN_MASTER_ROWS}-${MAX_MASTER_ROWS} master rows, found ${summary.masterRows}`,
    );
  }

  if (
    summary.matched < MIN_MATCHED_ROWS ||
    summary.matchedRatio < MIN_MATCHED_RATIO
  ) {
    failures.push(
      `Only ${summary.matched} rows matched master (${(summary.matchedRatio * 100).toFixed(2)}%)`,
    );
  }

  if (
    summary.unmatched > MAX_UNMATCHED_ROWS ||
    summary.unmatchedRatio > MAX_UNMATCHED_RATIO
  ) {
    failures.push(
      `Too many unmatched rows (${summary.unmatched}; ${(summary.unmatchedRatio * 100).toFixed(2)}%)`,
    );
  }

  if (summary.ambiguous > MAX_AMBIGUOUS_ROWS) {
    failures.push(
      `Too many ambiguous rows (${summary.ambiguous})`,
    );
  }

  if (
    summary.invalidMaster >
    MAX_INVALID_MASTER_ROWS
  ) {
    failures.push(
      `Too many invalid master rows (${summary.invalidMaster})`,
    );
  }

  if (summary.duplicateCatalogKeys > 0) {
    failures.push(
      `Supabase contains ${summary.duplicateCatalogKeys} duplicate catalog keys`,
    );
  }

  if (
    summary.eligiblePriceChanges >
      MAX_PRICE_CHANGES ||
    summary.eligiblePriceChangeRatio >
      MAX_PRICE_CHANGE_RATIO
  ) {
    failures.push(
      `Too many eligible price changes (${summary.eligiblePriceChanges}; ${(summary.eligiblePriceChangeRatio * 100).toFixed(2)}% of matched rows)`,
    );
  }

  return failures;
}

async function patchProduct(change) {
  const endpoint = new URL(
    `${supabaseUrl}/rest/v1/products`,
  );

  endpoint.searchParams.set(
    "catalog_key",
    `eq.${change.catalogKey}`,
  );

  const body = {
    price: change.desiredPrice,
    original_price:
      change.originalPrice,
    purchase_cost_incl_vat:
      change.purchaseCostInclVat,
    minimum_safe_price:
      change.minimumSafePrice,
    price_safety_status:
      change.priceSafetyStatus,
    price_rule:
      change.priceRule,
  };

  const response = await fetchWithRetry(
    `Supabase protected-price patch ${change.catalogKey}`,
    endpoint,
    {
      method: "PATCH",
      headers: headers({
        Prefer: "return=representation",
      }),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    },
  );

  const rows = await response.json();

  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error(
      `Safety stop: PATCH for ${change.catalogKey} affected ${rows?.length ?? "unknown"} rows`,
    );
  }

  const saved = rows[0];

  if (
    !sameMoney(
      money(saved.price),
      change.desiredPrice,
    )
  ) {
    throw new Error(
      `Verification failed for ${change.catalogKey}: expected ${change.desiredPrice}, got ${saved.price}`,
    );
  }
}

async function applyChanges(changes, report) {
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex++;

      if (index >= changes.length) {
        return;
      }

      const change = changes[index];

      try {
        await patchProduct(change);
        report.applied++;
      } catch (error) {
        report.errors++;

        if (report.errorDetails.length < 100) {
          report.errorDetails.push({
            catalogKey: change.catalogKey,
            sku: change.sku,
            litm: change.litm,
            error:
              error?.message ||
              String(error),
          });
        }
      }

      if (
        (index + 1) % 250 === 0 ||
        index + 1 === changes.length
      ) {
        console.log(
          `Supabase: ${Math.min(index + 1, changes.length).toLocaleString("pt-PT")}/${changes.length.toLocaleString("pt-PT")} protected-price changes processed`,
        );

        writeJson(REPORT_PATH, report);
      }
    }
  }

  await Promise.all(
    Array.from(
      {
        length: Math.min(
          PATCH_CONCURRENCY,
          changes.length,
        ),
      },
      worker,
    ),
  );
}

async function main() {
  const startedAt = new Date();

  console.log(
    `Mode: ${APPLY ? "APPLY" : "AUDIT (0 changes)"}`,
  );

  console.log(
    "Policy: MASTER CATALOG OWNS PRODUCTS.PRICE",
  );

  console.log(
    "Scope: existing Supabase rows only; NO INSERTS; NO STOCK WRITES; NO AUTOMATIC PRICE DECREASES",
  );

  const masterProducts = readMasterCatalog();
  const products = await fetchSupabaseProducts();

  const plan = buildPlan(
    products,
    masterProducts,
  );

  const failures = safetyChecks(
    plan.summary,
  );

  const eligiblePool = PROTECTED_ONLY
    ? plan.eligible.filter(
        (row) =>
          row.priceSafetyStatus ===
          "raised-to-protected-minimum",
      )
    : plan.eligible;

  const planned =
    APPLY_ALL
      ? eligiblePool
      : LIMIT
        ? eligiblePool.slice(
            OFFSET,
            OFFSET + LIMIT,
          )
        : eligiblePool.slice(OFFSET);

  const report = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? "apply" : "audit",
    policy: {
      ownerOfPrice:
        "iumatec-master-catalog.json",
      existingRowsOnly: true,
      inserts: false,
      stockWrites: false,
      automaticPriceDecreases: false,
      maxAutomaticIncreaseRatio:
        MAX_AUTOMATIC_INCREASE_RATIO,
      protectedOnly: PROTECTED_ONLY,
    },
    masterPath: MASTER_PATH,
    validation: plan.summary,
    safetyReady:
      failures.length === 0,
    safetyFailures: failures,
    eligiblePool: eligiblePool.length,
    selected: planned.length,
    applied: 0,
    errors: 0,
    errorDetails: [],
    samples: plan.samples,
  };

  writeJson(
    REPORT_PATH,
    report,
  );

  console.log(
    "\n========== MASTER PROTECTED PRICE -> SUPABASE ==========",
  );

  console.log(
    "INSERTS: DISABLED",
  );

  console.log(
    "STOCK WRITES: DISABLED",
  );

  console.log(
    "PRICE DECREASES: BLOCKED",
  );

  console.log(
    `FILTER: ${PROTECTED_ONLY ? "PROTECTED-ONLY (raised-to-protected-minimum)" : "ALL ELIGIBLE"}`,
  );

  for (
    const [key, value]
    of Object.entries(plan.summary)
  ) {
    console.log(
      `${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`,
    );
  }

  console.log(
    `safetyReady: ${report.safetyReady}`,
  );

  if (failures.length) {
    for (const failure of failures) {
      console.log(
        `SAFETY: ${failure}`,
      );
    }
  }

  console.log(
    `report: ${REPORT_PATH}`,
  );

  console.log(
    "========================================================\n",
  );

  if (!APPLY) {
    return;
  }

  if (failures.length) {
    throw new Error(
      `Safety validation failed: ${failures.join(" | ")}`,
    );
  }

  if (!planned.length) {
    console.log(
      PROTECTED_ONLY
        ? "No raised-to-protected-minimum changes selected."
        : "No eligible protected-price changes selected.",
    );
    return;
  }

  await applyChanges(
    planned,
    report,
  );

  report.finishedAt =
    new Date().toISOString();

  report.durationSeconds =
    Math.round(
      (Date.now() -
        startedAt.getTime()) /
        1_000,
    );

  writeJson(
    REPORT_PATH,
    report,
  );

  if (report.errors > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(
    "FATAL ERROR:",
    error?.message || error,
  );

  process.exit(1);
});
