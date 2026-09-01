import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.cwd();
const ARGS = process.argv.slice(2);
const PAGE_SIZE = 1_000;
const MAX_RETRIES = 7;

function argValue(name) {
  const prefix = `${name}=`;
  const found = ARGS.find((argument) => argument.startsWith(prefix));
  return found ? found.slice(prefix.length).trim() : "";
}

function finite(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boolean(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  return /^(1|true|yes|sim)$/i.test(String(value).trim());
}

const LOCAL_PRICE_SOURCE = argValue("--price-source");
const LOCAL_ARTICLE_SOURCE = argValue("--article-source");
const LOCAL_SUPABASE_SOURCE = argValue("--supabase-source");
const ALLOW_SMALL_FIXTURE = ARGS.includes("--allow-small-fixture");
const OUTPUT_DIR = path.resolve(
  ROOT,
  argValue("--output-dir") ||
    path.join("integrations", "alltron", "out", "alltron-profit-audit"),
);
const REPORT_JSON = path.join(OUTPUT_DIR, "latest.json");
const REPORT_CSV = path.join(OUTPUT_DIR, "products-to-review.csv");

const VAT_RATE = finite(process.env.AUDIT_VAT_RATE, 0.081);
const PAYMENT_RATE = finite(process.env.AUDIT_PAYMENT_RATE, 0.0315);
const PAYMENT_FIXED = finite(process.env.AUDIT_PAYMENT_FIXED, 0.35);
const SUPPLIER_SHIPPING_GROSS = finite(
  process.env.AUDIT_SUPPLIER_SHIPPING,
  5.9,
);
const SUPPLIER_SHIPPING_INCLUDES_VAT = boolean(
  process.env.AUDIT_SUPPLIER_SHIPPING_INCLUDES_VAT,
  true,
);
const CUSTOMER_SHIPPING_GROSS = finite(
  process.env.AUDIT_CUSTOMER_SHIPPING,
  9.9,
);
const FREE_SHIPPING_FROM = finite(
  process.env.AUDIT_FREE_SHIPPING_FROM,
  49,
);
const MIN_MARGIN_RATE = finite(process.env.AUDIT_MIN_MARGIN_RATE, 0.1);
const TARGET_MARGIN_RATE = finite(process.env.AUDIT_TARGET_MARGIN_RATE, 0.15);
const MIN_NET_PROFIT = finite(process.env.AUDIT_MIN_PROFIT, 2);
const PRIMARY_SCENARIO = boolean(process.env.AUDIT_VAT_REGISTERED, true)
  ? "vatRegistered"
  : "notVatRegistered";

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

if (!LOCAL_SUPABASE_SOURCE) {
  if (!supabaseUrl) throw new Error("Missing SUPABASE_URL");
  if (!supabaseKey) throw new Error("Missing SUPABASE_SECRET_KEY");
}
if (!LOCAL_PRICE_SOURCE || !LOCAL_ARTICLE_SOURCE) {
  if (!alltronHost) throw new Error("Missing ALLTRON_HOST");
  if (!alltronUser) throw new Error("Missing ALLTRON_USER");
  if (!alltronPass) throw new Error("Missing ALLTRON_PASS");
}
if (!(VAT_RATE >= 0 && VAT_RATE < 1)) {
  throw new Error("AUDIT_VAT_RATE must be between 0 and 1");
}
if (!(PAYMENT_RATE >= 0 && PAYMENT_RATE < 1)) {
  throw new Error("AUDIT_PAYMENT_RATE must be between 0 and 1");
}
if (!(MIN_MARGIN_RATE >= 0 && MIN_MARGIN_RATE < 1)) {
  throw new Error("AUDIT_MIN_MARGIN_RATE must be between 0 and 1");
}
if (!(TARGET_MARGIN_RATE >= MIN_MARGIN_RATE && TARGET_MARGIN_RATE < 1)) {
  throw new Error(
    "AUDIT_TARGET_MARGIN_RATE must be at least AUDIT_MIN_MARGIN_RATE and below 1",
  );
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

function rate(value, fallback = VAT_RATE) {
  const parsed = number(value);
  if (parsed === null || parsed < 0) return fallback;
  return parsed > 1 ? parsed / 100 : parsed;
}

function roundMoney(value) {
  return Number((value + Number.EPSILON).toFixed(2));
}

function roundRate(value) {
  return Number((value + Number.EPSILON).toFixed(6));
}

function roundUpFiveCents(value) {
  if (!(value > 0)) return 0.05;
  return Number((Math.ceil((value - 1e-9) * 20) / 20).toFixed(2));
}

function csv(value) {
  const output = String(value ?? "");
  return `"${output.replaceAll('"', '""')}"`;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(temporaryPath, filePath);
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
    if (response.status < 500 && response.status !== 429) error.permanent = true;
    throw error;
  });
}

function curlConfigValue(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/[\r\n]/g, "");
}

function downloadWithCurl(fileName, targetPath) {
  const curlBinary = process.platform === "win32" ? "curl.exe" : "curl";
  const port = Number(process.env.ALLTRON_PORT || 990);
  const remoteUrl = `ftps://${alltronHost}:${port}/dataexport/${encodeURIComponent(fileName)}`;
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

  console.log(`Downloading ${fileName} through implicit FTPS...`);
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
        reject(new Error(`${fileName} was not downloaded`));
        return;
      }
      const stats = fs.statSync(targetPath);
      if (!(stats.size > 10_000)) {
        fs.rmSync(targetPath, { force: true });
        reject(new Error(`${fileName} is abnormally small (${stats.size} bytes)`));
        return;
      }
      resolve({ fileName, bytes: stats.size, remoteUrl });
    });

    const credentials = `${curlConfigValue(alltronUser)}:${curlConfigValue(alltronPass)}`;
    child.stdin.end(`user = "${credentials}"\n`);
  });
}

function copyOrDownload(fileName, targetPath, localSource) {
  if (!localSource) return downloadWithCurl(fileName, targetPath);
  const sourcePath = path.resolve(ROOT, localSource);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Local source does not exist: ${sourcePath}`);
  }
  fs.copyFileSync(sourcePath, targetPath);
  return Promise.resolve({
    fileName: path.basename(sourcePath),
    bytes: fs.statSync(sourcePath).size,
    remoteUrl: "local-file",
  });
}

function decodeXml(buffer) {
  const beginning = buffer
    .subarray(0, Math.min(buffer.length, 500))
    .toString("ascii");
  const declaredEncoding =
    beginning.match(/encoding=["']([^"']+)["']/i)?.[1] || "";
  if (/1252|windows-1252/i.test(declaredEncoding)) {
    return new TextDecoder("windows-1252").decode(buffer);
  }
  if (/8859-1|latin1/i.test(declaredEncoding)) {
    return new TextDecoder("iso-8859-1").decode(buffer);
  }
  return new TextDecoder("utf-8").decode(buffer);
}

function decodeXmlEntities(value) {
  return String(value ?? "")
    .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/i, "$1")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .trim();
}

function xmlTag(block, names) {
  for (const name of names) {
    const expression = new RegExp(
      `<(?:[A-Za-z0-9_.-]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[A-Za-z0-9_.-]+:)?${name}>`,
      "i",
    );
    const match = expression.exec(block);
    if (match) return decodeXmlEntities(match[1].replace(/<[^>]+>/g, ""));
  }
  return "";
}

function eachXmlItem(xml, callback) {
  const expression =
    /<(?:[A-Za-z0-9_.-]+:)?item(?:\s[^>]*)?>([\s\S]*?)<\/(?:[A-Za-z0-9_.-]+:)?item>/gi;
  let count = 0;
  for (const match of xml.matchAll(expression)) {
    callback(match[1]);
    count++;
  }
  return count;
}

function extractPriceRow(rawRow) {
  return {
    litm: norm(xmlTag(rawRow, ["LITM"])),
    ecpr: money(xmlTag(rawRow, ["ECPR"])),
    expr: money(xmlTag(rawRow, ["EXPR"])),
    inpr: money(xmlTag(rawRow, ["INPR"])),
    vatRate: rate(xmlTag(rawRow, ["VATR", "VAT"])),
  };
}

function extractArticleRow(rawRow) {
  const litm = norm(xmlTag(rawRow, ["LITM"]));
  return {
    litm,
    sku: norm(xmlTag(rawRow, ["LITT", "SKU", "ARTNR", "PARTNUMBER"])) || litm,
    internalNumber: norm(xmlTag(rawRow, ["MITM", "INTERNALNUMBER"])),
    ean: normEan(xmlTag(rawRow, ["EITM", "EAN", "GTIN"])),
  };
}

function parseCombinedFeed(priceFilePath, articleFilePath) {
  const priceBuffer = fs.readFileSync(priceFilePath);
  const articleBuffer = fs.readFileSync(articleFilePath);
  const priceXml = decodeXml(priceBuffer);
  const articleXml = decodeXml(articleBuffer);
  const pricesByLitm = new Map();
  let duplicatePriceLitms = 0;
  const priceItemCount = eachXmlItem(priceXml, (rawRow) => {
    const row = extractPriceRow(rawRow);
    if (!row.litm) return;
    if (pricesByLitm.has(row.litm)) duplicatePriceLitms++;
    pricesByLitm.set(row.litm, row);
  });

  const rows = [];
  const articleItemCount = eachXmlItem(articleXml, (rawRow) => {
    const row = extractArticleRow(rawRow);
    if (!row.litm) return;
    rows.push({ ...row, ...(pricesByLitm.get(row.litm) || {}) });
  });
  if (!priceItemCount) {
    throw new Error(`Could not locate Alltron item rows in ${path.basename(priceFilePath)}`);
  }
  if (!articleItemCount) {
    throw new Error(`Could not locate Alltron item rows in ${path.basename(articleFilePath)}`);
  }

  return {
    priceFile: {
      bytes: priceBuffer.length,
      itemPath: "XML item elements",
      rowCount: priceItemCount,
    },
    articleFile: {
      bytes: articleBuffer.length,
      itemPath: "XML item elements",
      rowCount: articleItemCount,
    },
    pricesByLitm,
    rows,
    duplicatePriceLitms,
  };
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function fetchSupabaseProducts() {
  if (LOCAL_SUPABASE_SOURCE) {
    const sourcePath = path.resolve(ROOT, LOCAL_SUPABASE_SOURCE);
    const parsed = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
    if (!Array.isArray(parsed)) throw new Error("Supabase fixture must be a JSON array");
    return parsed;
  }

  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
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
    if (batch.length < PAGE_SIZE) break;
  }
  return rows;
}

function addIndex(index, key, row) {
  if (!key) return;
  const values = index.get(key) || [];
  values.push(row);
  index.set(key, values);
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

function uniqueRow(index, key) {
  if (!key) return null;
  const rows = index.get(key) || [];
  return rows.length === 1 ? rows[0] : null;
}

function matchProduct(product, indexes) {
  const exact = uniqueRow(indexes.catalog, normCatalogKey(product.catalog_key));
  if (exact) return { row: exact, method: "catalog-key" };
  const internal = uniqueRow(indexes.internal, norm(product.internal_number));
  if (internal) return { row: internal, method: "internal-number" };
  const ean = uniqueRow(indexes.ean, normEan(product.ean));
  if (ean) return { row: ean, method: "ean" };
  const sku = uniqueRow(indexes.sku, norm(product.sku));
  if (sku) return { row: sku, method: "sku" };
  return null;
}

function costValues(feedRow) {
  const vatRate = rate(feedRow.vatRate, VAT_RATE);
  const expr = money(feedRow.expr);
  const inpr = money(feedRow.inpr);
  const ecpr = money(feedRow.ecpr);
  const purchaseNet = expr || (inpr ? inpr / (1 + vatRate) : null);
  const purchaseGross = inpr || (expr ? expr * (1 + vatRate) : null);
  const mismatchRatio =
    expr && inpr
      ? Math.abs(inpr / (1 + vatRate) - expr) / expr
      : null;
  return {
    vatRate,
    expr,
    inpr,
    ecpr,
    purchaseNet: purchaseNet ? roundMoney(purchaseNet) : null,
    purchaseGross: purchaseGross ? roundMoney(purchaseGross) : null,
    costSource: expr ? "EXPR" : inpr ? "INPR" : "missing",
    mismatchRatio: mismatchRatio === null ? null : roundRate(mismatchRatio),
  };
}

function economicsAtPrice(priceGross, costs, scenario) {
  if (!(priceGross > 0)) return null;
  const customerShippingGross =
    priceGross < FREE_SHIPPING_FROM ? CUSTOMER_SHIPPING_GROSS : 0;
  const chargedGross = priceGross + customerShippingGross;
  const paymentFee = chargedGross * PAYMENT_RATE + PAYMENT_FIXED;

  if (scenario === "vatRegistered") {
    if (!(costs.purchaseNet > 0)) return null;
    const revenueNet = chargedGross / (1 + costs.vatRate);
    const supplierShippingNet = SUPPLIER_SHIPPING_INCLUDES_VAT
      ? SUPPLIER_SHIPPING_GROSS / (1 + costs.vatRate)
      : SUPPLIER_SHIPPING_GROSS;
    const profit =
      revenueNet - costs.purchaseNet - paymentFee - supplierShippingNet;
    return {
      revenue: roundMoney(revenueNet),
      purchaseCost: roundMoney(costs.purchaseNet),
      customerShippingGross: roundMoney(customerShippingGross),
      supplierShippingCost: roundMoney(supplierShippingNet),
      paymentFee: roundMoney(paymentFee),
      profit: roundMoney(profit),
      marginRate: roundRate(profit / revenueNet),
    };
  }

  if (!(costs.purchaseGross > 0)) return null;
  const profit =
    chargedGross - costs.purchaseGross - paymentFee - SUPPLIER_SHIPPING_GROSS;
  return {
    revenue: roundMoney(chargedGross),
    purchaseCost: roundMoney(costs.purchaseGross),
    customerShippingGross: roundMoney(customerShippingGross),
    supplierShippingCost: roundMoney(SUPPLIER_SHIPPING_GROSS),
    paymentFee: roundMoney(paymentFee),
    profit: roundMoney(profit),
    marginRate: roundRate(profit / chargedGross),
  };
}

function meetsTarget(price, costs, scenario, targetMargin) {
  const economics = economicsAtPrice(price, costs, scenario);
  return Boolean(
    economics &&
      economics.profit >= MIN_NET_PROFIT - 0.001 &&
      economics.marginRate >= targetMargin - 0.000001,
  );
}

function searchRange(costs, scenario, targetMargin, low, high) {
  if (!(high >= low) || !meetsTarget(high, costs, scenario, targetMargin)) {
    return null;
  }
  let left = low;
  let right = high;
  for (let iteration = 0; iteration < 80; iteration++) {
    const middle = (left + right) / 2;
    if (meetsTarget(middle, costs, scenario, targetMargin)) right = middle;
    else left = middle;
  }
  let rounded = roundUpFiveCents(right);
  while (!meetsTarget(rounded, costs, scenario, targetMargin)) {
    rounded = roundMoney(rounded + 0.05);
  }
  return rounded;
}

function minimumSafePrice(costs, scenario, targetMargin) {
  const paidShippingHigh = Math.max(0.05, FREE_SHIPPING_FROM - 0.05);
  const paidShippingCandidate = searchRange(
    costs,
    scenario,
    targetMargin,
    0.05,
    paidShippingHigh,
  );

  let freeShippingHigh = Math.max(
    FREE_SHIPPING_FROM,
    costs.purchaseGross || costs.purchaseNet || 1,
  );
  while (
    freeShippingHigh < 1_000_000 &&
    !meetsTarget(freeShippingHigh, costs, scenario, targetMargin)
  ) {
    freeShippingHigh *= 2;
  }
  const freeShippingCandidate = searchRange(
    costs,
    scenario,
    targetMargin,
    FREE_SHIPPING_FROM,
    freeShippingHigh,
  );

  const candidates = [paidShippingCandidate, freeShippingCandidate].filter(
    (candidate) => candidate !== null,
  );
  return candidates.length ? Math.min(...candidates) : null;
}

function flagsForScenario(economics, minimum10, currentPrice, prefix) {
  const flags = [];
  if (!economics) return flags;
  if (economics.profit < 0) flags.push(`LOSS_${prefix}`);
  if (economics.profit >= 0 && economics.profit < MIN_NET_PROFIT) {
    flags.push(`LOW_PROFIT_${prefix}`);
  }
  if (economics.marginRate < MIN_MARGIN_RATE) {
    flags.push(`BELOW_10_MARGIN_${prefix}`);
  }
  if (economics.marginRate < TARGET_MARGIN_RATE) {
    flags.push(`BELOW_15_TARGET_${prefix}`);
  }
  if (minimum10 !== null && currentPrice + 0.001 < minimum10) {
    flags.push(`PRICE_BELOW_MINIMUM_${prefix}`);
  }
  return flags;
}

function auditProduct(product, match) {
  const currentPrice = money(product.price);
  const costs = costValues(match.row);
  const registered = currentPrice
    ? economicsAtPrice(currentPrice, costs, "vatRegistered")
    : null;
  const notRegistered = currentPrice
    ? economicsAtPrice(currentPrice, costs, "notVatRegistered")
    : null;
  const minimum10Registered = costs.purchaseNet
    ? minimumSafePrice(costs, "vatRegistered", MIN_MARGIN_RATE)
    : null;
  const minimum15Registered = costs.purchaseNet
    ? minimumSafePrice(costs, "vatRegistered", TARGET_MARGIN_RATE)
    : null;
  const minimum10NotRegistered = costs.purchaseGross
    ? minimumSafePrice(costs, "notVatRegistered", MIN_MARGIN_RATE)
    : null;
  const minimum15NotRegistered = costs.purchaseGross
    ? minimumSafePrice(costs, "notVatRegistered", TARGET_MARGIN_RATE)
    : null;
  const flags = [];
  if (!currentPrice) flags.push("MISSING_CURRENT_PRICE");
  if (!costs.purchaseNet || !costs.purchaseGross) flags.push("MISSING_PURCHASE_COST");
  if (costs.mismatchRatio !== null && costs.mismatchRatio > 0.03) {
    flags.push("EXPR_INPR_MISMATCH");
  }
  flags.push(
    ...flagsForScenario(
      registered,
      minimum10Registered,
      currentPrice || 0,
      "VAT_REGISTERED",
    ),
  );
  flags.push(
    ...flagsForScenario(
      notRegistered,
      minimum10NotRegistered,
      currentPrice || 0,
      "NOT_VAT_REGISTERED",
    ),
  );

  const primary = PRIMARY_SCENARIO === "vatRegistered" ? registered : notRegistered;
  const primaryMinimum10 =
    PRIMARY_SCENARIO === "vatRegistered"
      ? minimum10Registered
      : minimum10NotRegistered;
  const primaryMinimum15 =
    PRIMARY_SCENARIO === "vatRegistered"
      ? minimum15Registered
      : minimum15NotRegistered;

  return {
    catalogKey: text(product.catalog_key),
    litm: match.row.litm,
    sku: text(product.sku),
    ean: text(product.ean),
    matchMethod: match.method,
    stockQty: number(product.stock_qty),
    currentPrice,
    ...costs,
    registered,
    notRegistered,
    minimum10Registered,
    minimum15Registered,
    minimum10NotRegistered,
    minimum15NotRegistered,
    primaryProfit: primary?.profit ?? null,
    primaryMarginRate: primary?.marginRate ?? null,
    primaryMinimum10,
    primaryMinimum15,
    requiredIncrease10:
      currentPrice && primaryMinimum10
        ? roundMoney(Math.max(0, primaryMinimum10 - currentPrice))
        : null,
    requiredIncrease15:
      currentPrice && primaryMinimum15
        ? roundMoney(Math.max(0, primaryMinimum15 - currentPrice))
        : null,
    flags: [...new Set(flags)],
  };
}

function percentile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return roundRate(sorted[lower]);
  return roundRate(
    sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower),
  );
}

function scenarioSummary(rows, key) {
  const values = rows.map((row) => row[key]).filter(Boolean);
  const margins = values.map((item) => item.marginRate);
  return {
    audited: values.length,
    losses: values.filter((item) => item.profit < 0).length,
    belowMinimumProfit: values.filter(
      (item) => item.profit >= 0 && item.profit < MIN_NET_PROFIT,
    ).length,
    below10PercentMargin: values.filter(
      (item) => item.marginRate < MIN_MARGIN_RATE,
    ).length,
    below15PercentTarget: values.filter(
      (item) => item.marginRate < TARGET_MARGIN_RATE,
    ).length,
    atOrAbove15PercentTarget: values.filter(
      (item) => item.marginRate >= TARGET_MARGIN_RATE,
    ).length,
    marginPercentiles: {
      p10: percentile(margins, 0.1),
      p25: percentile(margins, 0.25),
      median: percentile(margins, 0.5),
      p75: percentile(margins, 0.75),
      p90: percentile(margins, 0.9),
    },
  };
}

function histogram(rows) {
  const counts = {};
  for (const row of rows) {
    for (const flag of row.flags) counts[flag] = (counts[flag] || 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort((left, right) => right[1] - left[1]),
  );
}

function exportCsv(rows) {
  const headers = [
    "flags",
    "catalog_key",
    "litm",
    "sku",
    "ean",
    "match_method",
    "stock_qty",
    "current_price_gross",
    "ecpr_recommended_gross",
    "expr_purchase_net",
    "inpr_purchase_gross",
    "cost_source",
    "vat_rate",
    "registered_profit",
    "registered_margin_rate",
    "registered_minimum_10",
    "registered_minimum_15",
    "not_registered_profit",
    "not_registered_margin_rate",
    "not_registered_minimum_10",
    "not_registered_minimum_15",
    "primary_required_increase_10",
    "primary_required_increase_15",
  ];
  const lines = [
    headers.map(csv).join(";"),
    ...rows.map((row) =>
      [
        row.flags.join("|"),
        row.catalogKey,
        row.litm,
        row.sku,
        row.ean,
        row.matchMethod,
        row.stockQty,
        row.currentPrice,
        row.ecpr,
        row.expr,
        row.inpr,
        row.costSource,
        row.vatRate,
        row.registered?.profit,
        row.registered?.marginRate,
        row.minimum10Registered,
        row.minimum15Registered,
        row.notRegistered?.profit,
        row.notRegistered?.marginRate,
        row.minimum10NotRegistered,
        row.minimum15NotRegistered,
        row.requiredIncrease10,
        row.requiredIncrease15,
      ]
        .map(csv)
        .join(";"),
    ),
  ];
  fs.writeFileSync(REPORT_CSV, `\uFEFF${lines.join("\r\n")}\r\n`, "utf8");
}

async function main() {
  const startedAt = Date.now();
  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "iumatec-profit-audit-"),
  );
  const priceFeedPath = path.join(temporaryDirectory, alltronPriceFile);
  const articleFeedPath = path.join(temporaryDirectory, alltronArticleFile);

  try {
    console.log("Mode: READ-ONLY PROFIT AUDIT (0 external changes)");
    // Keep FTPS downloads sequential: supplier accounts may limit concurrent
    // control sessions and otherwise answer with a misleading 530 login error.
    const priceSource = await copyOrDownload(
      alltronPriceFile,
      priceFeedPath,
      LOCAL_PRICE_SOURCE,
    );
    const articleSource = await copyOrDownload(
      alltronArticleFile,
      articleFeedPath,
      LOCAL_ARTICLE_SOURCE,
    );
    const feed = parseCombinedFeed(priceFeedPath, articleFeedPath);
    console.log(
      `Alltron: ${feed.pricesByLitm.size.toLocaleString("pt-PT")} price/cost rows and ${feed.rows.length.toLocaleString("pt-PT")} article rows parsed`,
    );
    const products = await fetchSupabaseProducts();
    const indexes = buildFeedIndexes(feed.rows);
    const audited = [];
    const unmatched = [];
    const matchMethods = {};

    for (const product of products) {
      const match = matchProduct(product, indexes);
      if (!match) {
        if (unmatched.length < 500) {
          unmatched.push({
            catalogKey: text(product.catalog_key),
            sku: text(product.sku),
            ean: text(product.ean),
          });
        }
        continue;
      }
      matchMethods[match.method] = (matchMethods[match.method] || 0) + 1;
      audited.push(auditProduct(product, match));
    }

    const reviewRows = audited
      .filter((row) => row.flags.length)
      .sort((left, right) => {
        const leftProfit = left.primaryProfit ?? Number.NEGATIVE_INFINITY;
        const rightProfit = right.primaryProfit ?? Number.NEGATIVE_INFINITY;
        return leftProfit - rightProfit || left.catalogKey.localeCompare(right.catalogKey);
      });
    const withCost = audited.filter(
      (row) => row.purchaseNet !== null && row.purchaseGross !== null,
    );
    const failures = [];
    if (!ALLOW_SMALL_FIXTURE) {
      if (products.length < 50_000 || products.length > 60_000) {
        failures.push(`Expected 50,000-60,000 Supabase rows; found ${products.length}`);
      }
      if (feed.pricesByLitm.size < 100_000 || feed.pricesByLitm.size > 300_000) {
        failures.push(
          `Expected 100,000-300,000 Alltron price rows; found ${feed.pricesByLitm.size}`,
        );
      }
      if (audited.length < 40_000) {
        failures.push(`Expected at least 40,000 matched products; found ${audited.length}`);
      }
      if (withCost.length < 40_000) {
        failures.push(`Expected at least 40,000 products with cost; found ${withCost.length}`);
      }
    }

    const report = {
      generatedAt: new Date().toISOString(),
      mode: "READ_ONLY_CURRENT_MARGIN_AUDIT",
      externalWrites: 0,
      assumptions: {
        vatRateFallback: VAT_RATE,
        paymentRate: PAYMENT_RATE,
        paymentFixed: PAYMENT_FIXED,
        supplierShippingGrossReserve: SUPPLIER_SHIPPING_GROSS,
        supplierShippingIncludesVat: SUPPLIER_SHIPPING_INCLUDES_VAT,
        customerShippingBelowThresholdGross: CUSTOMER_SHIPPING_GROSS,
        freeShippingFromGross: FREE_SHIPPING_FROM,
        minimumMarginRate: MIN_MARGIN_RATE,
        targetMarginRate: TARGET_MARGIN_RATE,
        minimumProfit: MIN_NET_PROFIT,
        primaryScenario: PRIMARY_SCENARIO,
        costRule:
          "EXPR is treated as purchase cost excluding VAT; INPR is the gross fallback.",
        warning:
          "Confirm Alltron field definitions, VAT registration status, Shopify payment fees and real shipping costs before changing prices.",
      },
      source: {
        price: { ...priceSource, xmlItemPath: feed.priceFile.itemPath },
        article: { ...articleSource, xmlItemPath: feed.articleFile.itemPath },
      },
      validation: {
        supabaseRows: products.length,
        alltronPriceRows: feed.pricesByLitm.size,
        alltronArticleRows: feed.rows.length,
        matched: audited.length,
        unmatched: products.length - audited.length,
        productsWithCost: withCost.length,
        missingCost: audited.length - withCost.length,
        duplicatePriceLitms: feed.duplicatePriceLitms,
        matchMethods,
        productsForReview: reviewRows.length,
        priceFlags: histogram(audited),
      },
      scenarios: {
        vatRegistered: scenarioSummary(audited, "registered"),
        notVatRegistered: scenarioSummary(audited, "notRegistered"),
      },
      safetyReady: failures.length === 0,
      safetyFailures: failures,
      samples: {
        worstProfit: reviewRows.slice(0, 500),
        largestRequiredIncrease10: [...reviewRows]
          .filter((row) => row.requiredIncrease10 !== null)
          .sort((left, right) => right.requiredIncrease10 - left.requiredIncrease10)
          .slice(0, 500),
        unmatched,
      },
      outputs: {
        json: REPORT_JSON,
        csv: REPORT_CSV,
      },
      durationSeconds: Math.round((Date.now() - startedAt) / 1_000),
    };

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    writeJson(REPORT_JSON, report);
    exportCsv(reviewRows);

    console.log("\n========== IUMATEC PRICE / PROFIT AUDIT ==========");
    console.log(`Supabase products: ${products.length}`);
    console.log(`Matched to current Alltron feed: ${audited.length}`);
    console.log(`Products with purchase cost: ${withCost.length}`);
    console.log(`Products requiring review: ${reviewRows.length}`);
    console.log(`Primary scenario: ${PRIMARY_SCENARIO}`);
    console.log(
      `Losses (VAT registered): ${report.scenarios.vatRegistered.losses}`,
    );
    console.log(
      `Below 10% margin (VAT registered): ${report.scenarios.vatRegistered.below10PercentMargin}`,
    );
    console.log(
      `Below 15% target (VAT registered): ${report.scenarios.vatRegistered.below15PercentTarget}`,
    );
    console.log(
      `Losses (not VAT registered): ${report.scenarios.notVatRegistered.losses}`,
    );
    console.log(
      `Below 10% margin (not VAT registered): ${report.scenarios.notVatRegistered.below10PercentMargin}`,
    );
    console.log(`safetyReady: ${report.safetyReady}`);
    for (const failure of failures) console.log(`SAFETY: ${failure}`);
    console.log(`JSON report: ${REPORT_JSON}`);
    console.log(`CSV review: ${REPORT_CSV}`);
    console.log("External writes: 0");
    console.log("===================================================\n");
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("FATAL ERROR:", error?.message || error);
  process.exit(1);
});
