import crypto from "node:crypto";
import { spawn } from "node:child_process";
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
const MIN_FEED_ROWS = 100_000;
const MAX_FEED_ROWS = 300_000;
const MIN_MATCHED_ROWS = 40_000;
const MIN_MATCHED_RATIO = 0.85;
const MAX_UNMATCHED_ROWS = 7_000;
const MAX_UNMATCHED_RATIO = 0.12;
const MAX_INVALID_ROWS = 2_000;
const MAX_INVALID_RATIO = 0.04;
const MAX_AMBIGUOUS_ROWS = 25;
const MAX_PRICE_CHANGES = 30_000;
const MAX_PRICE_CHANGE_RATIO = 0.6;
const MAX_PRICE_RATIO_DEVIATION = 0.5;
const MIN_INDIVIDUAL_PRICE_RATIO = 0.5;
const MAX_INDIVIDUAL_PRICE_RATIO = 1.5;
const MAX_RETRIES = 7;
const PATCH_CONCURRENCY = 6;
const PRICE_WRITES_ENABLED = false; // Safety invariant: prices are owned by iumatec-master-catalog.json

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
const LOCAL_PRICE_SOURCE = argValue("--price-source") || LOCAL_SOURCE;
const LOCAL_ARTICLE_SOURCE = argValue("--article-source");
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
const alltronPriceFile = String(
  process.env.ALLTRON_PRICE_FILE || "PreisdatenV2.xml",
).trim();
const alltronArticleFile = String(
  process.env.ALLTRON_ARTICLE_FILE || "ArtikeldatenV2.xml",
).trim();

if (!supabaseUrl) throw new Error("Missing SUPABASE_URL");
if (!supabaseKey) throw new Error("Missing SUPABASE_SECRET_KEY");
if (!LOCAL_PRICE_SOURCE || !LOCAL_ARTICLE_SOURCE) {
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
    .replace(/[â€™']/g, "")
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

async function downloadFeedFile(fileName, targetPath, localSource = "") {
  if (localSource) {
    const sourcePath = path.resolve(ROOT, localSource);
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

  if (
    process.platform === "win32" ||
    String(process.env.ALLTRON_TRANSPORT || "").trim().toLowerCase() === "curl"
  ) {
    return downloadFeedFileWithCurl(fileName, targetPath);
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
        (entry) => entry.name.toLowerCase() === fileName.toLowerCase(),
      );
      if (!remote) {
        throw new Error(`${fileName} was not found in /dataexport`);
      }
      if (!(remote.size > 10_000)) {
        throw new Error(
          `${fileName} is abnormally small (${remote.size} bytes)`,
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
      if (fs.existsSync(targetPath)) fs.rmSync(targetPath, { force: true });
    } finally {
      client.close();
    }
  }

  throw new Error(
    `All secure Alltron FTPS connection modes failed: ${failures.join(" | ")}`,
  );
}

function curlConfigValue(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/[\r\n]/g, "");
}

function downloadFeedFileWithCurl(fileName, targetPath) {
  const curlBinary = process.platform === "win32" ? "curl.exe" : "curl";
  const remoteUrl = `ftps://${alltronHost}:990/dataexport/${encodeURIComponent(fileName)}`;
  const args = [
    "--config",
    "-",
    "--fail",
    "--silent",
    "--show-error",
    "--ssl-reqd",
    "--connect-timeout",
    "30",
    "--retry",
    "3",
    "--retry-delay",
    "5",
    "--output",
    targetPath,
    remoteUrl,
  ];

  console.log("Trying implicit FTPS on port 990 using curl...");

  return new Promise((resolve, reject) => {
    const child = spawn(curlBinary, args, {
      stdio: ["pipe", "ignore", "pipe"],
      windowsHide: true,
    });
    let stderr = "";

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      reject(new Error(`Could not start ${curlBinary}: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        if (fs.existsSync(targetPath)) fs.rmSync(targetPath, { force: true });
        reject(
          new Error(
            `curl FTPS download failed with exit code ${code}: ${stderr.trim() || "unknown error"}`,
          ),
        );
        return;
      }

      if (!fs.existsSync(targetPath)) {
        reject(new Error("curl completed without creating the Alltron feed"));
        return;
      }

      const stats = fs.statSync(targetPath);
      if (!(stats.size > 10_000)) {
        fs.rmSync(targetPath, { force: true });
        reject(
          new Error(`${fileName} is abnormally small (${stats.size} bytes)`),
        );
        return;
      }

      console.log("Connected securely using implicit FTPS on port 990 via curl.");
      resolve({
        source: remoteUrl,
        connectionMode: "implicit FTPS on port 990 via curl",
        fileName,
        remoteSize: stats.size,
        remoteModifiedAt: null,
      });
    });

    const curlCredentials = `${curlConfigValue(alltronUser)}:${curlConfigValue(alltronPass)}`;
    child.stdin.end(`user = "${curlCredentials}"\n`);
  });
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

function normalizeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function decodeXml(buffer) {
  const beginning = buffer
    .subarray(0, Math.min(buffer.length, 500))
    .toString("ascii");
  const declaredEncoding =
    beginning.match(/encoding=["']([^"']+)["']/i)?.[1] || "";
  if (/1252|windows-1252/i.test(declaredEncoding)) {
    return iconv.decode(buffer, "windows-1252");
  }
  if (/8859-1|latin1/i.test(declaredEncoding)) {
    return iconv.decode(buffer, "iso-8859-1");
  }
  return iconv.decode(buffer, "utf8");
}

function knownXmlItems(parsed) {
  const known =
    parsed?.items?.item ||
    parsed?.prices?.item ||
    parsed?.ITEMS?.item ||
    parsed?.ITEMS?.ITEM ||
    parsed?.PRICES?.item ||
    parsed?.PRICES?.ITEM ||
    parsed?.root?.items?.item ||
    parsed?.root?.prices?.item ||
    parsed?.root?.ITEMS?.ITEM ||
    parsed?.root?.PRICES?.ITEM;
  if (known) return { itemPath: "known Alltron item path", rows: normalizeArray(known) };
  const fallback = collectItemArrays(parsed).sort(
    (left, right) => right.rows.length - left.rows.length,
  )[0];
  return fallback || { itemPath: "", rows: [] };
}

function parseXmlFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  const xml = decodeXml(buffer);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: true,
    trimValues: true,
  });
  const parsed = parser.parse(xml);
  const selected = knownXmlItems(parsed);
  if (!selected.rows.length) throw new Error(`Could not locate Alltron rows in ${path.basename(filePath)}`);
  return {
    hash,
    bytes: buffer.length,
    itemPath: selected.path || selected.itemPath,
    rows: selected.rows,
  };
}

function extractPriceRow(row) {
  const litm = deepFind(row, ["LITM"]);
  const primary = deepFind(row, ["ECPR"]);
  const fallback = deepFind(row, ["EXPR", "INPR", "PRICE", "VKPR", "RETAILPRICE"]);
  const selected = primary.value !== null ? primary : fallback;
  return {
    litm: norm(litm.value),
    price: money(selected.value),
    priceField: selected.key,
  };
}

function extractArticleRow(row) {
  const litm = deepFind(row, ["LITM"]);
  const sku = deepFind(row, ["LITT", "SKU", "ARTNR", "PARTNUMBER"]);
  const internalNumber = deepFind(row, ["MITM", "INTERNALNUMBER"]);
  const ean = deepFind(row, ["EITM", "EAN", "GTIN"]);
  const available = deepFind(row, ["STQU", "STOCK", "QUANTITY", "AVAILABLE"]);
  const primary = deepFind(row, ["ECPR"]);
  const fallback = deepFind(row, ["EXPR", "INPR", "PRICE", "VKPR", "RETAILPRICE"]);
  const selected = primary.value !== null ? primary : fallback;
  const normalizedLitm = norm(litm.value);
  return {
    litm: normalizedLitm,
    sku: norm(sku.value) || normalizedLitm,
    internalNumber: norm(internalNumber.value),
    ean: normEan(ean.value),
    price: money(selected.value),
    stock: stock(available.value),
    priceField: selected.key,
    stockField: available.key,
  };
}

function parseCombinedFeed(priceFilePath, articleFilePath) {
  const priceFeed = parseXmlFile(priceFilePath);
  const articleFeed = parseXmlFile(articleFilePath);
  const pricesByLitm = new Map();

  for (const rawRow of priceFeed.rows) {
    const row = extractPriceRow(rawRow);
    if (!row.litm || row.price === null) continue;
    pricesByLitm.set(row.litm, row);
  }

  const rows = articleFeed.rows
    .map(extractArticleRow)
    .filter((row) => row.litm)
    .map((row) => {
      const currentPrice = pricesByLitm.get(row.litm);
      return currentPrice
        ? { ...row, price: currentPrice.price, priceField: currentPrice.priceField }
        : row;
    });

  return {
    priceFeed,
    articleFeed,
    priceRows: pricesByLitm.size,
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
  // This synchronizer owns STOCK only. Price differences must never make
  // an otherwise unambiguous stock match ambiguous.
  const signatures = new Set(
    rows.map((row) => `${row.stock ?? "null"}`),
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
    addIndex(indexes.catalog, normCatalogKey(row.litm), row);
    addIndex(indexes.sku, row.sku, row);
    addIndex(indexes.internal, row.internalNumber, row);
    addIndex(indexes.ean, row.ean, row);
  }
  return indexes;
}

function matchFeedRow(product, indexes) {
  const catalogKey = normCatalogKey(product.catalog_key);
  const catalogMatches = catalogKey ? indexes.catalog.get(catalogKey) : null;
  if (catalogMatches?.length) {
    const row = equivalentUnique(catalogMatches);
    return row ? { method: "catalog-key", row } : { ambiguous: true };
  }

  const checks = [
    ["sku", norm(product.sku), indexes.sku],
    ["internal-number", norm(product.internal_number), indexes.internal],
    ["ean", normEan(product.ean), indexes.ean],
  ];
  const matches = [];
  for (const [method, key, index] of checks) {
    if (!key) continue;
    const row = equivalentUnique(index.get(key));
    if (row) matches.push({ method, row });
  }
  const signatures = new Map();
  for (const match of matches) {
    // Price is intentionally excluded: master catalog is the sole price owner.
    const signature = `${match.row.stock ?? "null"}`;
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
  const quarantinedPrices = [];
  const priceRatios = [];
  const priceFields = {};
  const stockFields = {};
  const matchMethods = {};

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
      const currentStock = stock(product.stock_qty);
      const currentlySellable =
        currentStock > 0 || product.in_stock === true;

      unmatched.push({
        catalogKey,
        sku: text(product.sku),
        currentStock,
        inStock: product.in_stock === true,
        wouldZero: currentlySellable,
      });

      // If the product no longer exists in the current Alltron article feed,
      // it must not remain sellable with stale stock in Supabase/Shopify.
      // In AUDIT mode this only creates a plan; no data is written.
      if (currentlySellable) {
        changes.push({
          catalogKey,
          sku: text(product.sku),
          method: "supplier-absent",
          currentPrice: money(product.price),
          desiredPrice: money(product.price),
          supplierPrice: null,
          priceRatio: null,
          priceQuarantined: false,
          currentStock,
          desiredStock: 0,
          priceChanged: false,
          stockChanged: true,
        });
      }

      continue;
    }
    if (match.ambiguous) {
      ambiguous.push({ catalogKey, sku: text(product.sku) });
      continue;
    }
    const desired = match.row;
    // Stock is the only mutable supplier field in this script.
    // A missing supplier price must never block a valid stock update.
    if (desired.stock === null) {
      invalid.push({
        catalogKey,
        reason: "invalid-stock",
      });
      continue;
    }
    if (desired.price !== null) {
      priceFields[desired.priceField || "unknown"] =
        (priceFields[desired.priceField || "unknown"] || 0) + 1;
    }
    stockFields[desired.stockField || "unknown"] =
      (stockFields[desired.stockField || "unknown"] || 0) + 1;
    matchMethods[match.method] = (matchMethods[match.method] || 0) + 1;

    const currentPrice = money(product.price);
    const currentStock = stock(product.stock_qty);

    // Supplier price is retained only for diagnostics. It is NEVER a desired
    // Supabase price here. Pricing is exclusively owned by the protected
    // iumatec-master-catalog.json -> import-master-catalog-to-supabase.mjs path.
    const priceRatio =
      currentPrice && desired.price ? desired.price / currentPrice : null;
    if (priceRatio !== null) priceRatios.push(priceRatio);
    const rawSupplierPriceDiffers =
      desired.price !== null &&
      (currentPrice === null || Math.abs(currentPrice - desired.price) > 0.009);
    const supplierPriceOutlier =
      rawSupplierPriceDiffers &&
      priceRatio !== null &&
      (priceRatio < MIN_INDIVIDUAL_PRICE_RATIO ||
        priceRatio > MAX_INDIVIDUAL_PRICE_RATIO);

    // HARD SAFETY INVARIANT: never plan a price write.
    const desiredPrice = currentPrice;
    const priceChanged = false;
    const priceQuarantined = supplierPriceOutlier;
    const stockChanged = currentStock === null || currentStock !== desired.stock;
    const planned = {
      catalogKey,
      sku: text(product.sku),
      method: match.method,
      currentPrice,
      desiredPrice,
      supplierPrice: desired.price,
      priceRatio,
      priceQuarantined,
      currentStock,
      desiredStock: desired.stock,
      priceChanged,
      stockChanged,
    };
    if (priceQuarantined) quarantinedPrices.push(planned);
    (stockChanged ? changes : exact).push(planned);
  }

  // "supplier-absent" rows are deliberately NOT counted as matched.
  // They remain unmatched for feed-quality/safety metrics, while still
  // becoming explicit stock-to-zero candidates.
  const supplierAbsentChanges = changes.filter(
    (row) => row.method === "supplier-absent",
  );
  const matchedChanges = changes.filter(
    (row) => row.method !== "supplier-absent",
  );
  const matched = matchedChanges.length + exact.length;
  const priceChangeRows = matchedChanges.filter((row) => row.priceChanged);
  const stockChangeRows = changes.filter((row) => row.stockChanged);
  const matchedStockChangeRows = matchedChanges.filter(
    (row) => row.stockChanged,
  );
  const priceIncreases = priceChangeRows.filter(
    (row) => row.currentPrice !== null && row.desiredPrice > row.currentPrice,
  );
  const priceDecreases = priceChangeRows.filter(
    (row) => row.currentPrice !== null && row.desiredPrice < row.currentPrice,
  );
  const newPrices = priceChangeRows.filter((row) => row.currentPrice === null);
  const stockToZero = stockChangeRows.filter(
    (row) => row.currentStock !== null && row.currentStock > 0 && row.desiredStock === 0,
  );
  const stockFromZero = stockChangeRows.filter(
    (row) => row.currentStock === 0 && row.desiredStock > 0,
  );
  const invalidReasons = invalid.reduce((counts, row) => {
    counts[row.reason] = (counts[row.reason] || 0) + 1;
    return counts;
  }, {});
  const byPriceRatioDescending = (left, right) =>
    right.desiredPrice / right.currentPrice -
    left.desiredPrice / left.currentPrice;
  const byPriceRatioAscending = (left, right) =>
    left.desiredPrice / left.currentPrice -
    right.desiredPrice / right.currentPrice;

  return {
    changes,
    summary: {
      supabaseRows: products.length,
      feedRows: feedRows.length,
      matched,
      matchedRatio: products.length ? matched / products.length : 0,
      exact: exact.length,
      changes: changes.length,
      priceChanges: priceChangeRows.length,
      priceChangeRatio: matched ? priceChangeRows.length / matched : 0,
      priceIncreases: priceIncreases.length,
      priceDecreases: priceDecreases.length,
      newPrices: newPrices.length,
      quarantinedPrices: quarantinedPrices.length,
      quarantinedPriceRatio: matched
        ? quarantinedPrices.length / matched
        : 0,
      stockChanges: stockChangeRows.length,
      stockChangeRatio: matched ? matchedStockChangeRows.length / matched : 0,
      stockToZero: stockToZero.length,
      stockFromZero: stockFromZero.length,
      supplierAbsentToZero: supplierAbsentChanges.length,
      unmatched: unmatched.length,
      unmatchedRatio: products.length ? unmatched.length / products.length : 0,
      ambiguous: ambiguous.length,
      invalid: invalid.length,
      invalidRatio: products.length ? invalid.length / products.length : 0,
      invalidReasons,
      duplicateCatalogKeys: duplicateCatalogKeys.length,
      medianFeedToCurrentPriceRatio: median(priceRatios),
      priceFields,
      stockFields,
      matchMethods,
    },
    samples: {
      changes: changes.slice(0, 25),
      largestPriceIncreases: [...priceIncreases]
        .sort(byPriceRatioDescending)
        .slice(0, 25),
      largestPriceDecreases: [...priceDecreases]
        .sort(byPriceRatioAscending)
        .slice(0, 25),
      quarantinedPrices: [...quarantinedPrices]
        .sort((left, right) =>
          Math.abs(Math.log(right.priceRatio)) -
          Math.abs(Math.log(left.priceRatio)),
        )
        .slice(0, 50),
      stockToZero: stockToZero.slice(0, 25),
      stockFromZero: stockFromZero.slice(0, 25),
      supplierAbsentToZero: supplierAbsentChanges.slice(0, 25),
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
  if (summary.feedRows < MIN_FEED_ROWS || summary.feedRows > MAX_FEED_ROWS) {
    failures.push(
      `Expected ${MIN_FEED_ROWS}-${MAX_FEED_ROWS} Alltron article rows, found ${summary.feedRows}`,
    );
  }
  if (
    summary.matched < MIN_MATCHED_ROWS ||
    summary.matchedRatio < MIN_MATCHED_RATIO
  ) {
    failures.push(
      `Only ${summary.matched} Supabase rows matched the Alltron feed (${(summary.matchedRatio * 100).toFixed(2)}%)`,
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
  if (
    summary.invalid > MAX_INVALID_ROWS ||
    summary.invalidRatio > MAX_INVALID_RATIO
  ) {
    failures.push(
      `Too many invalid rows (${summary.invalid}; ${(summary.invalidRatio * 100).toFixed(2)}%)`,
    );
  }
  if (summary.ambiguous > MAX_AMBIGUOUS_ROWS) {
    failures.push(`Too many ambiguous rows (${summary.ambiguous})`);
  }
  if (summary.duplicateCatalogKeys > 0) {
    failures.push(`Supabase contains ${summary.duplicateCatalogKeys} duplicate catalog keys`);
  }
  // Price-related safety gates are intentionally absent here. This script
  // never writes prices; supplier price data is diagnostic only.
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
  const priceFeedPath = path.join(temporaryDirectory, alltronPriceFile);
  const articleFeedPath = path.join(temporaryDirectory, alltronArticleFile);
  let report;
  try {
    console.log(`Mode: ${APPLY ? "APPLY" : "AUDIT (0 changes)"}`);
    console.log("Downloading the current Alltron price feed...");
    const priceSource = await downloadFeedFile(
      alltronPriceFile,
      priceFeedPath,
      LOCAL_PRICE_SOURCE,
    );
    console.log("Downloading the current Alltron article/stock feed...");
    const articleSource = await downloadFeedFile(
      alltronArticleFile,
      articleFeedPath,
      LOCAL_ARTICLE_SOURCE,
    );
    const feed = parseCombinedFeed(priceFeedPath, articleFeedPath);
    console.log(
      `Alltron: ${feed.priceRows.toLocaleString("pt-PT")} prices and ${feed.rows.length.toLocaleString("pt-PT")} article/stock rows parsed`,
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
        price: {
          ...priceSource,
          downloadedBytes: feed.priceFeed.bytes,
          sha256: feed.priceFeed.hash,
          xmlItemPath: feed.priceFeed.itemPath,
        },
        article: {
          ...articleSource,
          downloadedBytes: feed.articleFeed.bytes,
          sha256: feed.articleFeed.hash,
          xmlItemPath: feed.articleFeed.itemPath,
        },
      },
      validation: plan.summary,
      pricingPolicy: {
        owner: "iumatec-master-catalog.json",
        priceWritesEnabled: PRICE_WRITES_ENABLED,
        note: "This script updates stock_qty/in_stock only and never writes products.price",
      },
      safetyReady: failures.length === 0,
      safetyFailures: failures,
      selected: planned.length,
      applied: 0,
      errors: 0,
      errorDetails: [],
      samples: plan.samples,
    };
    writeJson(REPORT_PATH, report);

    console.log("\n========== ALLTRON STOCK -> SUPABASE ==========");
    console.log("PRICE WRITES: DISABLED (master catalog owns products.price)");
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
      console.log("No stock changes found in the Alltron feed.");
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

