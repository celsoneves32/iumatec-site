import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const MASTER_PATH = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "iumatec-master-catalog.json",
);

const REPORT_PATH = path.join(
  ROOT,
  "integrations",
  "also",
  "out",
  "also-stock-supabase-sync-latest.json",
);

const ARGS = process.argv.slice(2);

const APPLY = ARGS.includes("--apply");
const APPLY_ALL = ARGS.includes("--all");

const CONFIRM =
  ARGS.find((arg) => arg.startsWith("--confirm="))
    ?.slice("--confirm=".length) || "";

const LIMIT_ARG =
  ARGS.find((arg) => arg.startsWith("--limit="));

const LIMIT = LIMIT_ARG
  ? Number(LIMIT_ARG.slice("--limit=".length))
  : null;

const FULL_CONFIRMATION = "IUMATEC-ALSO-STOCK";

const SUPABASE_PAGE_SIZE = 1000;
const PATCH_CONCURRENCY = 4;
const MAX_RETRIES = 6;

const MIN_SUPABASE_ROWS = 40_000;
const MAX_SUPABASE_ROWS = 100_000;

const MIN_MASTER_ROWS = 100_000;
const MAX_MASTER_ROWS = 350_000;

if (APPLY_ALL && !APPLY) {
  throw new Error(
    "--all só pode ser usado juntamente com --apply",
  );
}

if (
  APPLY_ALL &&
  CONFIRM !== FULL_CONFIRMATION
) {
  throw new Error(
    `Full apply exige --confirm=${FULL_CONFIRMATION}`,
  );
}

if (
  APPLY &&
  !APPLY_ALL &&
  (
    !Number.isInteger(LIMIT) ||
    LIMIT <= 0 ||
    LIMIT > 1000
  )
) {
  throw new Error(
    "Apply limitado exige --limit=N entre 1 e 1000.",
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

if (!supabaseUrl) {
  throw new Error(
    "SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL não definido.",
  );
}

if (!supabaseKey) {
  throw new Error(
    "SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY não definido.",
  );
}

if (!fs.existsSync(MASTER_PATH)) {
  throw new Error(
    `Master não encontrado: ${MASTER_PATH}`,
  );
}

function text(value) {
  return String(value ?? "").trim();
}

function norm(value) {
  return text(value)
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function normCatalogKey(value) {
  return norm(value)
    .replace(/^LITM\s*:\s*/, "");
}

function parseStock(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0 ||
    !Number.isInteger(parsed)
  ) {
    return null;
  }

  return parsed;
}

function headers(extra = {}) {
  return {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    ...extra,
  };
}

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(
  label,
  url,
  options = {},
) {
  let lastError;

  for (
    let attempt = 1;
    attempt <= MAX_RETRIES;
    attempt++
  ) {
    try {
      const response = await fetch(
        url,
        options,
      );

      if (response.ok) {
        return response;
      }

      const body = await response.text();

      throw new Error(
        `${label}: HTTP ${response.status} ${body}`,
      );
    } catch (error) {
      lastError = error;

      if (attempt >= MAX_RETRIES) {
        break;
      }

      await sleep(
        Math.min(10_000, attempt * 1000),
      );
    }
  }

  throw lastError;
}

async function fetchSupabaseProducts() {
  const rows = [];

  for (
    let from = 0;
    ;
    from += SUPABASE_PAGE_SIZE
  ) {
    const to =
      from + SUPABASE_PAGE_SIZE - 1;

    const endpoint =
      `${supabaseUrl}/rest/v1/products` +
      "?select=catalog_key,sku,ean,internal_number,stock_qty,in_stock,merchandise_id,shopify_variant_id" +
      "&order=catalog_key.asc";

    const response =
      await fetchWithRetry(
        "Supabase read",
        endpoint,
        {
          headers: headers({
            Range: `${from}-${to}`,
            Prefer: "count=exact",
          }),
          signal:
            AbortSignal.timeout(60_000),
        },
      );

    const batch =
      await response.json();

    if (!Array.isArray(batch)) {
      throw new Error(
        "Resposta Supabase inválida.",
      );
    }

    rows.push(...batch);

    console.log(
      `Supabase read: ${rows.length}`,
    );

    if (
      batch.length <
      SUPABASE_PAGE_SIZE
    ) {
      break;
    }
  }

  return rows;
}

function addIndex(map, key, row) {
  if (!key) return;

  const entries = map.get(key) || [];
  entries.push(row);
  map.set(key, entries);
}

async function patchStock(change) {
  const endpoint = new URL(
    `${supabaseUrl}/rest/v1/products`,
  );

  endpoint.searchParams.set(
    "catalog_key",
    `eq.${change.catalogKey}`,
  );

  const response =
    await fetchWithRetry(
      `ALSO stock patch ${change.catalogKey}`,
      endpoint,
      {
        method: "PATCH",
        headers: headers({
          Prefer: "return=representation",
        }),
        body: JSON.stringify({
          stock_qty:
            change.desiredStock,
          in_stock:
            change.desiredStock > 0,
        }),
        signal:
          AbortSignal.timeout(60_000),
      },
    );

  const rows = await response.json();

  if (
    !Array.isArray(rows) ||
    rows.length !== 1
  ) {
    throw new Error(
      `PATCH ${change.catalogKey} afetou ${
        rows?.length ?? "unknown"
      } linhas`,
    );
  }

  const saved = rows[0];

  if (
    Number(saved.stock_qty) !==
    change.desiredStock
  ) {
    throw new Error(
      `Verificação stock falhou em ${change.catalogKey}: esperado ${change.desiredStock}, recebido ${saved.stock_qty}`,
    );
  }

  if (
    Boolean(saved.in_stock) !==
    (change.desiredStock > 0)
  ) {
    throw new Error(
      `Verificação in_stock falhou em ${change.catalogKey}`,
    );
  }
}

async function main() {
  console.log("");
  console.log(
    "========== ALSO MASTER STOCK -> SUPABASE ==========",
  );
  console.log(
    `Mode: ${APPLY ? "APPLY" : "AUDIT / ZERO WRITES"}`,
  );
  console.log(
    "Owner: selectedStockSupplier=also",
  );
  console.log(
    "PRICE WRITES: DISABLED",
  );
  console.log("");

  const masterRaw =
    JSON.parse(
      fs.readFileSync(
        MASTER_PATH,
        "utf8",
      ),
    );

  const master =
    Array.isArray(masterRaw)
      ? masterRaw
      : Array.isArray(masterRaw?.products)
        ? masterRaw.products
        : [];

  if (
    master.length < MIN_MASTER_ROWS ||
    master.length > MAX_MASTER_ROWS
  ) {
    throw new Error(
      `Master count safety stop: ${master.length}`,
    );
  }

  const alsoOwned =
    master.filter(
      (product) =>
        text(
          product.selectedStockSupplier,
        ).toLowerCase() === "also",
    );

  const masterByLitm = new Map();

  let missingLitm = 0;
  let invalidStock = 0;

  for (const product of alsoOwned) {
    const litm =
      normCatalogKey(
        product.litm ??
        product.catalog_key ??
        product.catalogKey,
      );

    const desiredStock =
      parseStock(product.stock);

    if (!litm) {
      missingLitm++;
      continue;
    }

    if (desiredStock === null) {
      invalidStock++;
      continue;
    }

    addIndex(
      masterByLitm,
      litm,
      {
        product,
        desiredStock,
      },
    );
  }

  const duplicateMasterLitm =
    [...masterByLitm.entries()]
      .filter(
        ([, rows]) =>
          rows.length !== 1,
      );

  const supabaseRows =
    await fetchSupabaseProducts();

  if (
    supabaseRows.length <
      MIN_SUPABASE_ROWS ||
    supabaseRows.length >
      MAX_SUPABASE_ROWS
  ) {
    throw new Error(
      `Supabase row safety stop: ${supabaseRows.length}`,
    );
  }

  const supabaseByCatalogKey =
    new Map();

  for (const row of supabaseRows) {
    addIndex(
      supabaseByCatalogKey,
      normCatalogKey(
        row.catalog_key,
      ),
      row,
    );
  }

  const duplicateSupabaseKeys =
    [...supabaseByCatalogKey.entries()]
      .filter(
        ([key, rows]) =>
          key && rows.length !== 1,
      );

  const exact = [];
  const planned = [];
  const unmatched = [];
  const ambiguous = [];

  for (
    const [
      litm,
      masterEntries,
    ] of masterByLitm.entries()
  ) {
    if (masterEntries.length !== 1) {
      ambiguous.push({
        litm,
        reason:
          "duplicate-master-litm",
      });
      continue;
    }

    const desired =
      masterEntries[0];

    const supabaseMatches =
      supabaseByCatalogKey.get(litm);

    if (!supabaseMatches?.length) {
      unmatched.push({
        litm,
        sku:
          text(
            desired.product.sku,
          ),
        alsoProductId:
          text(
            desired.product
              .alsoProductId,
          ),
      });
      continue;
    }

    if (
      supabaseMatches.length !== 1
    ) {
      ambiguous.push({
        litm,
        reason:
          "duplicate-supabase-catalog-key",
      });
      continue;
    }

    const row =
      supabaseMatches[0];

    const currentStock =
      parseStock(row.stock_qty);

    const currentInStock =
      Boolean(row.in_stock);

    const desiredStock =
      desired.desiredStock;

    const desiredInStock =
      desiredStock > 0;

    const item = {
      catalogKey:
        text(row.catalog_key),
      litm,
      sku:
        text(
          desired.product.sku,
        ),
      alsoProductId:
        text(
          desired.product
            .alsoProductId,
        ),
      currentStock,
      desiredStock,
      currentInStock,
      desiredInStock,
    };

    if (
      currentStock ===
        desiredStock &&
      currentInStock ===
        desiredInStock
    ) {
      exact.push(item);
    } else {
      planned.push(item);
    }
  }

  const matched =
    exact.length +
    planned.length;

  const matchRatio =
    alsoOwned.length > 0
      ? matched /
        alsoOwned.length
      : 0;

  const hardFailures = [];

  if (
    duplicateMasterLitm.length > 0
  ) {
    hardFailures.push(
      `duplicate master LITM: ${duplicateMasterLitm.length}`,
    );
  }

  if (
    duplicateSupabaseKeys.length > 0
  ) {
    hardFailures.push(
      `duplicate Supabase catalog_key: ${duplicateSupabaseKeys.length}`,
    );
  }

  if (invalidStock > 0) {
    hardFailures.push(
      `invalid ALSO stock: ${invalidStock}`,
    );
  }

  if (matched === 0) {
    hardFailures.push(
      "zero matched ALSO stock rows",
    );
  }

  const selected =
    !APPLY
      ? []
      : APPLY_ALL
        ? planned
        : planned.slice(
            0,
            LIMIT,
          );

  const report = {
    generatedAt:
      new Date().toISOString(),

    mode:
      APPLY
        ? "apply"
        : "audit",

    policy: {
      owner:
        "selectedStockSupplier=also",
      source:
        "iumatec-master-catalog.json",
      existingRowsOnly: true,
      inserts: false,
      priceWrites: false,
      fieldsWritten: [
        "stock_qty",
        "in_stock",
      ],
    },

    summary: {
      masterRows:
        master.length,
      supabaseRows:
        supabaseRows.length,
      alsoOwned:
        alsoOwned.length,
      matched,
      matchRatio,
      alreadyExact:
        exact.length,
      planned:
        planned.length,
      selectedForApply:
        selected.length,
      unmatched:
        unmatched.length,
      ambiguous:
        ambiguous.length,
      missingLitm,
      invalidStock,
      duplicateMasterLitm:
        duplicateMasterLitm.length,
      duplicateSupabaseKeys:
        duplicateSupabaseKeys.length,
    },

    hardFailures,

    samples: {
      planned:
        planned.slice(0, 50),
      unmatched:
        unmatched.slice(0, 50),
      ambiguous:
        ambiguous.slice(0, 50),
    },

    applied: 0,
    errors: 0,
    errorDetails: [],
  };

  fs.mkdirSync(
    path.dirname(REPORT_PATH),
    { recursive: true },
  );

  fs.writeFileSync(
    REPORT_PATH,
    JSON.stringify(
      report,
      null,
      2,
    ),
    "utf8",
  );

  console.log(
    `Master rows: ${master.length}`,
  );
  console.log(
    `Supabase rows: ${supabaseRows.length}`,
  );
  console.log(
    `ALSO stock owner: ${alsoOwned.length}`,
  );
  console.log(
    `Matched: ${matched}`,
  );
  console.log(
    `Already exact: ${exact.length}`,
  );
  console.log(
    `Stock changes planned: ${planned.length}`,
  );
  console.log(
    `Unmatched: ${unmatched.length}`,
  );
  console.log(
    `Ambiguous: ${ambiguous.length}`,
  );
  console.log(
    `Missing LITM: ${missingLitm}`,
  );
  console.log(
    `Invalid stock: ${invalidStock}`,
  );
  console.log(
    `Match ratio: ${(matchRatio * 100).toFixed(2)}%`,
  );
  console.log(
    `Safety failures: ${hardFailures.length}`,
  );
  console.log(
    `Report: ${REPORT_PATH}`,
  );

  if (!APPLY) {
    console.log("");
    console.log(
      "AUDIT COMPLETE - ZERO WRITES",
    );
    return;
  }

  if (hardFailures.length) {
    throw new Error(
      `Safety validation failed: ${hardFailures.join(" | ")}`,
    );
  }

  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index =
        nextIndex++;

      if (
        index >= selected.length
      ) {
        return;
      }

      const change =
        selected[index];

      try {
        await patchStock(change);
        report.applied++;

        console.log(
          `[${index + 1}/${selected.length}] OK ${change.catalogKey} | ${change.currentStock} -> ${change.desiredStock}`,
        );
      } catch (error) {
        report.errors++;

        if (
          report.errorDetails.length <
          100
        ) {
          report.errorDetails.push({
            catalogKey:
              change.catalogKey,
            sku:
              change.sku,
            error:
              error instanceof Error
                ? error.message
                : String(error),
          });
        }

        console.error(
          `[${index + 1}/${selected.length}] ERROR ${change.catalogKey}`,
        );
      }
    }
  }

  await Promise.all(
    Array.from(
      {
        length: Math.min(
          PATCH_CONCURRENCY,
          selected.length,
        ),
      },
      worker,
    ),
  );

  report.finishedAt =
    new Date().toISOString();

  fs.writeFileSync(
    REPORT_PATH,
    JSON.stringify(
      report,
      null,
      2,
    ),
    "utf8",
  );

  console.log("");
  console.log(
    `Applied: ${report.applied}`,
  );
  console.log(
    `Errors: ${report.errors}`,
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