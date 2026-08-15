import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as ftp from "basic-ftp";
import dotenv from "dotenv";
import iconv from "iconv-lite";
import { XMLParser } from "fast-xml-parser";

dotenv.config({ path: ".env.local" });
dotenv.config();

const ROOT = process.cwd();
const ARGS = process.argv.slice(2);
const APPLY = ARGS.includes("--apply");
const APPLY_ALL = ARGS.includes("--all");
const FULL_CONFIRMATION = "IUMATEC-ALLTRON-SOURCE";
const SUPABASE_PAGE_SIZE = 1_000;
const MAX_LIMITED_APPLY = 1_000;
const MIN_SUPABASE_ROWS = 50_000;
const MAX_SUPABASE_ROWS = 60_000;
const MIN_MATCHED_ROWS = 50_000;
const MAX_UNMATCHED_ROWS = 1_000;
const MAX_AMBIGUOUS_ROWS = 25;
const MAX_PRICE_CHANGES = 15_000;
const MAX_PRICE_RATIO_DEVIATION = 0.5;
const MAX_RETRIES = 7;
const PATCH_CONCURRENCY = 6;

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

const LIMIT = integerArg("--limit", 0);
const OFFSET = integerArg("--offset", 0);
const CONFIRMATION = argValue("--confirm");
const LOCAL_SOURCE = argValue("--source");
const REPORT_PATH = path.resolve(
  ROOT,
  argValue("--report") ||
    path.join(
      "integrations",
      "alltron",
      "out",
      "alltron-supabase-sync",
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
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
)
  .trim()
  .replace(/\/$/, "");
const supabaseKey = String(
  process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "",
).trim();
const alltronHost = String(process.env.ALLTRON_HOST || "").trim();
const alltronUser = String(process.env.ALLTRON_USER || "").trim();
const alltronPass = String(process.env.ALLTRON_PASS || "").trim();
const alltronFile = String(
  process.env.ALLTRON_PRICE_FILE || "PreisdatenV2.xml",
).trim();

if (!supabaseUrl) throw new Error("Missing SUPABASE_URL");
if (!supabaseKey) throw new Error("Missing SUPABASE_SECRET_KEY");
if (!LOCAL_SOURCE) {
  if (!alltronHost) throw new Error("Missing ALLTRON_HOST");
  if (!alltronUser) throw new Error("Missing ALLTRON_USER");
  if (!alltronPass) throw new Error("Missing ALLTRON_PASS");
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

function stock(value) {
  const parsed = number(value);
  return parsed !== null && parsed >= 0 ? Math.trunc(parsed) : null;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(temporaryPath, filePath);
}

function supabaseHeaders(extra = {}) {
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
      if (error?.permanent || attempt === MAX_RETRIES) break;
      const delay = Math.min(30_000, 1_000 * 2 ** (attempt - 1));
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
    if (response.ok) return response;
    const body = (await response.text()).slice(0, 800);
    const error = new Error(`HTTP ${response.status}: ${body}`);
    if (response.status < 500 && response.status !== 429) {
      error.permanent = true;
    }
    throw error;
  });
}

async function downloadPriceFeed(targetPath) {
  if (LOCAL_SOURCE) {
    const sourcePath = path.resolve(ROOT, LOCAL_SOURCE);
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Local source does not exist: ${sourcePath}`);
    }
    fs.copyFileSync(sourcePath, targetPath);
    return {
      source: "local-file",
      fileName: path.basename(sourcePath),
      remoteSize: fs.statSync(sourcePath).size,
      remoteModifiedAt: fs.statSync(sourcePath).mtime.toISOString(),
    };
  }

  const profiles = [
    { label: "explicit FTPS on port 21", port: 21, secure: true },
    { label: "implicit FTPS on port 990", port: 990, secure: "implicit" },
  ];
  const failures = [];

  for (const profile of profiles) {
    const client = new ftp.Client(60_000);
    client.ftp.verbose = false;

    try {
      console.log(`Trying ${profile.label}...`);

      await client.access({
        host: alltronHost,
        port: profile.port,
        user: alltronUser,
        password: alltronPass,
        secure: profile.secure,
        secureOptions: { rejectUnauthorized: false },
      });

      await client.cd("/dataexport");

      const files = await client.list();
      const remote = files.find(
        (entry) => entry.name.toLowerCase() === alltronFile.toLowerCase(),
      );

      if (!remote) {
        throw new Error(`${alltronFile} was not found in /dataexport`);
      }

      if (!(remote.size > 10_000)) {
        throw new Error(
          `${alltronFile} is abnormally small (${remote.size} bytes)`,
        );
      }

      await client.downloadTo(targetPath, remote.name);

      console.log(`Connected securely using ${profile.label}.`);

      return {
        source: `ftps://${alltronHost}:${profile.port}/dataexport/${remote.name}`,
        connectionMode: profile.label,
        fileName: remote.name,
        remoteSize: remote.size,
        remoteModifiedAt: remote.modifiedAt?.toISOString?.() || null,
      };
    } catch (error) {
      const message = String(error?.message || error);
      failures.push(`${profile.label}: ${message}`);
      console.log(`${profile.label} failed: ${message}`);

      if (fs.existsSync(targetPath)) {
        fs.rmSync(targetPath, { force: true });
      }
    } finally {
      client.close();
    }
  }

  throw new Error(
    `All secure Alltron FTPS connection modes failed: ${failures.join(" | ")}`,
  );
}
function deepFind(object, wantedKeys, maxDepth = 7) {
  const wanted = new Set(wantedKeys.map((key) => key.toUpperCase()));
  const queue = [{ value: object, depth: 0 }];
  while (queue.length) {
    const { value, depth } = queue.shift();
    if (!value || typeof value !== "object" || depth > maxDepth) continue;
    for (const [key, child] of Object.entries(value)) {
      if (wanted.has(key.toUpperCase()) && child !== null && child !== "") {
        return { key: key.toUpperCase(), value: child };
      }
      if (child && typeof child === "object" && !Array.isArray(child)) {
        queue.push({ value: child, depth: depth + 1 });
      }
    }
  }
  return { key: "", value: null };
}

function collectItemArrays(parsed) {
  const candidates = [];
  const queue = [{ value: parsed, path: "root", depth: 0 }];
  while (queue.length) {
    const { value, path: objectPath, depth } = queue.shift();
    if (!value || typeof value !== "object" || depth > 6) continue;
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${objectPath}.${key}`;
      if (Array.isArray(child)) {
        if (child.length && child.some((entry) => entry && typeof entry === "object")) {
          candidates.push({ path: childPath, rows: child });
        }
      } else if (child && typeof child === "object") {
        queue.push({ value: child, path: childPath, depth: depth + 1 });
      }
    }
  }
  return candidates;
}

function extractFeedRow(row) {
  const litm = deepFind(row, ["LITM"]);
  const sku = deepFind(row, ["LITT", "SKU", "ARTNR", "PARTNUMBER"]);
  const internalNumber = deepFind(row, ["MITM", "INTERNALNUMBER"]);
  const ean = deepFind(row, ["EITM", "EAN", "GTIN"]);
  const price = deepFind(row, ["ECPR", "PRICE", "VKPR", "RETAILPRICE"]);
  const fallbackPrice = deepFind(row, ["EXPR", "INPR"]);
  const available = deepFind(row, ["STQU", "STOCK", "QUANTITY", "AVAILABLE"]);
  const selectedPrice = price.value !== null ? price : fallbackPrice;
  return {
    litm: norm(litm.value),
    sku: norm(sku.value),
    internalNumber: norm(internalNumber.value),
    ean: normEan(ean.value),
    price: money(selectedPrice.value),
    stock: stock(available.value),
    priceField: selectedPrice.key,
    stockField: available.key,
  };
}

function parseFeed(filePath) {
  const buffer = fs.readFileSync(filePath);
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  const xml = iconv.decode(buffer, "windows-1252");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: true,
    trimValues: true,
  });
  const parsed = parser.parse(xml);
  const candidates = collectItemArrays(parsed)
    .map((candidate) => {
      const sample = candidate.rows.slice(0, 25).map(extractFeedRow);
      const recognizable = sample.filter(
        (row) =>
          (row.litm || row.sku || row.internalNumber || row.ean) &&
          (row.price !== null || row.stock !== null),
      ).length;
      return {
        ...candidate,
        recognizable,
        recognizableRatio: sample.length ? recognizable / sample.length : 0,
      };
    })
    .filter(
      (candidate) =>
        candidate.recognizableRatio >= 0.5 && candidate.rows.length >= 1_000,
    )
    .sort(
      (left, right) =>
        right.rows.length - left.rows.length ||
        right.recognizableRatio - left.recognizableRatio,
    );
  const selected = candidates[0];
  if (!selected) {
    throw new Error("Could not locate Alltron price rows in the XML file");
  }
  const rows = selected.rows.map(extractFeedRow);
  return {
    hash,
    bytes: buffer.length,
    itemPath: selected.path,
    rows,
  };
}

async function fetchSupabaseProducts() {
  const rows = [];
  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const to = from + SUPABASE_PAGE_SIZE - 1;
    const endpoint =
      `${supabaseUrl}/rest/v1/products` +
      "?select=catalog_key,sku,ean,internal_number,price,stock_qty,in_stock" +
      "&order=catalog_key.asc";
    const response = await fetchWithRetry("Supabase read", endpoint, {
        headers: supabaseHeaders({
          Range: `${from}-${to}`,
          Prefer: "count=exact",
        }),
        signal: AbortSignal.timeout(60_000),
      });
    const batch = await response.json();
    rows.push(...batch);
    console.log(`Supabase: ${rows.length.toLocaleString("pt-PT")} products read`);
    if (batch.length < SUPABASE_PAGE_SIZE) break;
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
    rows.map((row) => `${row.price ?? "null"}|${row.stock ?? "null"}`),
  );
  return signatures.size === 1 ? rows[0] : null;
}

function buildFeedIndexes(rows) {
  const indexes = {
    catalog: new Map(),
    sku: new Map(),
    internal: new Map(),
    ean: new Map(),
  };
  for (const row of rows) {
    addIndex(indexes.catalog, row.litm, row);
    addIndex(indexes.sku, row.sku, row);
    addIndex(indexes.internal, row.internalNumber, row);
    addIndex(indexes.ean, row.ean, row);
  }
  return indexes;
}

function matchFeedRow(product, indexes) {
  const checks = [
    ["sku", norm(product.sku), indexes.sku],
    ["internal-number", norm(product.internal_number), indexes.internal],
    ["ean", normEan(product.ean), indexes.ean],
    ["catalog-key", norm(product.catalog_key), indexes.catalog],
  ];
  const matches = [];
  for (const [method, key, index] of checks) {
    if (!key) continue;
    const row = equivalentUnique(index.get(key));
    if (row) matches.push({ method, row });
  }
  const signatures = new Map();
  for (const match of matches) {
    const signature = `${match.row.price ?? "null"}|${match.row.stock ?? "null"}`;
    if (!signatures.has(signature)) signatures.set(signature, match);
  }
  if (signatures.size === 1) return [...signatures.values()][0];
  if (signatures.size > 1) return { ambiguous: true };
  return null;
}

function median(values) {
  if (!values.length) return null;
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
}

function buildPlan(products, feedRows) {
  const indexes = buildFeedIndexes(feedRows);
  const duplicateCatalogKeys = [];
  const seenCatalogKeys = new Set();
  const unmatched = [];
  const ambiguous = [];
  const invalid = [];
  const exact = [];
  const changes = [];
  const priceRatios = [];
  const priceFields = {};
  const stockFields = {};

  for (const product of products) {
    const catalogKey = text(product.catalog_key);
    if (!catalogKey) {
      invalid.push({ catalogKey, reason: "missing-catalog-key" });
      continue;
    }
    if (seenCatalogKeys.has(catalogKey)) duplicateCatalogKeys.push(catalogKey);
    seenCatalogKeys.add(catalogKey);

    const match = matchFeedRow(product, indexes);
    if (!match) {
      unmatched.push({ catalogKey, sku: text(product.sku) });
      continue;
    }
    if (match.ambiguous) {
      ambiguous.push({ catalogKey, sku: text(product.sku) });
      continue;
    }
    const desired = match.row;
    if (desired.price === null || desired.stock === null) {
      invalid.push({
        catalogKey,
        reason: desired.price === null ? "invalid-price" : "invalid-stock",
      });
      continue;
    }
    priceFields[desired.priceField || "unknown"] =
      (priceFields[desired.priceField || "unknown"] || 0) + 1;
    stockFields[desired.stockField || "unknown"] =
      (stockFields[desired.stockField || "unknown"] || 0) + 1;

    const currentPrice = money(product.price);
    const currentStock = stock(product.stock_qty);
    if (currentPrice && desired.price) {
      priceRatios.push(desired.price / currentPrice);
    }
    const priceChanged =
      currentPrice === null || Math.abs(currentPrice - desired.price) > 0.009;
    const stockChanged = currentStock === null || currentStock !== desired.stock;
    const planned = {
      catalogKey,
      sku: text(product.sku),
      method: match.method,
      currentPrice,
      desiredPrice: desired.price,
      currentStock,
      desiredStock: desired.stock,
      priceChanged,
      stockChanged,
    };
    (priceChanged || stockChanged ? changes : exact).push(planned);
  }

  return {
    changes,
    summary: {
      supabaseRows: products.length,
      feedRows: feedRows.length,
      matched: changes.length + exact.length,
      exact: exact.length,
      changes: changes.length,
      priceChanges: changes.filter((row) => row.priceChanged).length,
      stockChanges: changes.filter((row) => row.stockChanged).length,
      unmatched: unmatched.length,
      ambiguous: ambiguous.length,
      invalid: invalid.length,
      duplicateCatalogKeys: duplicateCatalogKeys.length,
      medianFeedToCurrentPriceRatio: median(priceRatios),
      priceFields,
      stockFields,
    },
    samples: {
      changes: changes.slice(0, 25),
      unmatched: unmatched.slice(0, 25),
      ambiguous: ambiguous.slice(0, 25),
      invalid: invalid.slice(0, 25),
      duplicateCatalogKeys: duplicateCatalogKeys.slice(0, 25),
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
  if (summary.feedRows < MIN_MATCHED_ROWS) {
    failures.push(`Alltron feed is too small (${summary.feedRows} rows)`);
  }
  if (summary.matched < MIN_MATCHED_ROWS) {
    failures.push(`Only ${summary.matched} Supabase rows matched the Alltron feed`);
  }
  if (summary.unmatched > MAX_UNMATCHED_ROWS) {
    failures.push(`Too many unmatched rows (${summary.unmatched})`);
  }
  if (summary.ambiguous > MAX_AMBIGUOUS_ROWS) {
    failures.push(`Too many ambiguous rows (${summary.ambiguous})`);
  }
  if (summary.duplicateCatalogKeys > 0) {
    failures.push(`Supabase contains ${summary.duplicateCatalogKeys} duplicate catalog keys`);
  }
  if (summary.priceChanges > MAX_PRICE_CHANGES) {
    failures.push(`Too many price changes (${summary.priceChanges})`);
  }
  const ratio = summary.medianFeedToCurrentPriceRatio;
  if (
    ratio === null ||
    ratio < 1 - MAX_PRICE_RATIO_DEVIATION ||
    ratio > 1 + MAX_PRICE_RATIO_DEVIATION
  ) {
    failures.push(`Abnormal median price ratio (${ratio})`);
  }
  if (!summary.priceFields.ECPR) {
    failures.push("The feed did not provide the expected ECPR price field");
  }
  if (!summary.stockFields.STQU) {
    failures.push("The feed did not provide the expected STQU stock field");
  }
  return failures;
}

async function patchProduct(change) {
  const endpoint = new URL(`${supabaseUrl}/rest/v1/products`);
  endpoint.searchParams.set("catalog_key", `eq.${change.catalogKey}`);
  const response = await fetchWithRetry(
    `Supabase patch ${change.catalogKey}`,
    endpoint,
    {
      method: "PATCH",
      headers: supabaseHeaders({ Prefer: "return=representation" }),
      body: JSON.stringify({
        price: change.desiredPrice,
        stock_qty: change.desiredStock,
        in_stock: change.desiredStock > 0,
      }),
      signal: AbortSignal.timeout(60_000),
    },
  );
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error(
      `Safety stop: PATCH for ${change.catalogKey} affected ${rows?.length ?? "unknown"} rows`,
    );
  }
}

async function applyChanges(changes, report) {
  let nextIndex = 0;
  async function worker() {
    while (true) {
      const index = nextIndex++;
      if (index >= changes.length) return;
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
            error: error?.message || String(error),
          });
        }
      }
      if ((index + 1) % 250 === 0 || index + 1 === changes.length) {
        console.log(
          `Supabase: ${Math.min(index + 1, changes.length).toLocaleString("pt-PT")}/${changes.length.toLocaleString("pt-PT")} changes processed`,
        );
        writeJson(REPORT_PATH, report);
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(PATCH_CONCURRENCY, changes.length) }, worker),
  );
}

async function main() {
  const startedAt = new Date();
  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "iumatec-alltron-sync-"),
  );
  const feedPath = path.join(temporaryDirectory, alltronFile);
  let report;
  try {
    console.log(`Mode: ${APPLY ? "APPLY" : "AUDIT (0 changes)"}`);
    console.log("Downloading the current Alltron price/stock feed...");
    const source = await downloadPriceFeed(feedPath);
    const feed = parseFeed(feedPath);
    console.log(
      `Alltron: ${feed.rows.length.toLocaleString("pt-PT")} price rows parsed`,
    );
    const products = await fetchSupabaseProducts();
    const plan = buildPlan(products, feed.rows);
    const failures = safetyChecks(plan.summary);
    const planned = APPLY_ALL
      ? plan.changes
      : LIMIT
        ? plan.changes.slice(OFFSET, OFFSET + LIMIT)
        : plan.changes.slice(OFFSET);

    report = {
      generatedAt: new Date().toISOString(),
      mode: APPLY ? "apply" : "audit",
      source: {
        ...source,
        downloadedBytes: feed.bytes,
        sha256: feed.hash,
        xmlItemPath: feed.itemPath,
      },
      validation: plan.summary,
      safetyReady: failures.length === 0,
      safetyFailures: failures,
      selected: planned.length,
      applied: 0,
      errors: 0,
      errorDetails: [],
      samples: plan.samples,
    };
    writeJson(REPORT_PATH, report);

    console.log("\n========== ALLTRON -> SUPABASE ==========");
    for (const [key, value] of Object.entries(plan.summary)) {
      console.log(`${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`);
    }
    console.log(`safetyReady: ${report.safetyReady}`);
    if (failures.length) {
      for (const failure of failures) console.log(`SAFETY: ${failure}`);
    }
    console.log(`report: ${REPORT_PATH}`);
    console.log("=========================================\n");

    if (!APPLY) return;
    if (failures.length) {
      throw new Error(`Safety validation failed: ${failures.join(" | ")}`);
    }
    if (!planned.length) {
      console.log("Nothing changed in the Alltron feed.");
      return;
    }
    await applyChanges(planned, report);
    report.finishedAt = new Date().toISOString();
    report.durationSeconds = Math.round(
      (Date.now() - startedAt.getTime()) / 1_000,
    );
    writeJson(REPORT_PATH, report);
    if (report.errors > 0) process.exitCode = 1;
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("FATAL ERROR:", error?.message || error);
  process.exit(1);
});
