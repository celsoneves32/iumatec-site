import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const INPUT = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "alltron-profit-audit",
  "products-to-review.csv"
);

const OUT_DIR = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "alltron-profit-audit"
);

const OUT_CSV = path.join(OUT_DIR, "pilot-25-preview.csv");
const OUT_JSON = path.join(OUT_DIR, "pilot-25-preview.json");

const PILOT_SIZE = 25;

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

function number(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function money(value) {
  if (!Number.isFinite(value)) return "";
  return value.toFixed(2);
}

function percent(value) {
  if (!Number.isFinite(value)) return "";
  return (value * 100).toFixed(2);
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }

      continue;
    }

    if (char === ";" && !quoted) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);

  return result;
}

function escapeCsv(value) {
  const text =
    value === null || value === undefined ? "" : String(value);

  return `"${text.replaceAll('"', '""')}"`;
}

function writeCsv(filePath, rows) {
  if (!rows.length) {
    throw new Error("No rows to write.");
  }

  const headers = Object.keys(rows[0]);

  const lines = [
    headers.map(escapeCsv).join(";"),
    ...rows.map((row) =>
      headers.map((header) => escapeCsv(row[header])).join(";")
    ),
  ];

  fs.writeFileSync(filePath, "\uFEFF" + lines.join("\n"), "utf8");
}

// ---------------------------------------------------------
// Safety
// ---------------------------------------------------------

console.log("");
console.log("==============================================");
console.log(" IUMATEC PROFIT PILOT - PREVIEW ONLY");
console.log("==============================================");
console.log("");

console.log("MODE: PREVIEW");
console.log("External writes: 0");
console.log("Supabase writes: 0");
console.log("Shopify writes: 0");
console.log("");

if (!fs.existsSync(INPUT)) {
  throw new Error(`Input file not found:\n${INPUT}`);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

// ---------------------------------------------------------
// Read CSV
// ---------------------------------------------------------

const raw = fs.readFileSync(INPUT, "utf8").replace(/^\uFEFF/, "");

const lines = raw
  .split(/\r?\n/)
  .filter((line) => line.trim().length > 0);

if (lines.length < 2) {
  throw new Error("CSV is empty.");
}

const headers = parseCsvLine(lines[0]);

const rows = [];

for (let i = 1; i < lines.length; i++) {
  const values = parseCsvLine(lines[i]);

  if (values.length !== headers.length) {
    console.warn(
      `Skipping malformed CSV row ${i + 1}: expected ${headers.length} columns, got ${values.length}`
    );
    continue;
  }

  const row = {};

  for (let j = 0; j < headers.length; j++) {
    row[headers[j]] = values[j];
  }

  rows.push(row);
}

console.log(`CSV rows read: ${rows.length}`);

// ---------------------------------------------------------
// Select safe VAT-registered loss candidates
// ---------------------------------------------------------

const candidates = [];

for (const row of rows) {
  const flags = row.flags || "";

  const stock = number(row.stock_qty);
  const currentPrice = number(row.current_price_gross);
  const purchaseNet = number(row.expr_purchase_net);
  const purchaseGross = number(row.inpr_purchase_gross);
  const registeredProfit = number(row.registered_profit);
  const registeredMargin = number(row.registered_margin_rate);
  const minimum10 = number(row.registered_minimum_10);
  const minimum15 = number(row.registered_minimum_15);
  const recommended = number(row.ecpr_recommended_gross);
  const vatRate = number(row.vat_rate);

  if (!flags.includes("LOSS_VAT_REGISTERED")) {
    continue;
  }

  if (!Number.isFinite(stock) || stock <= 0) {
    continue;
  }

  if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
    continue;
  }

  if (!Number.isFinite(registeredProfit) || registeredProfit >= 0) {
    continue;
  }

  if (!Number.isFinite(minimum10) || minimum10 <= currentPrice) {
    continue;
  }

  if (
    row.cost_source !== "EXPR" &&
    row.cost_source !== "INPR"
  ) {
    continue;
  }

  candidates.push({
    catalogKey: row.catalog_key,
    litm: row.litm,
    sku: row.sku,
    ean: row.ean,
    matchMethod: row.match_method,

    stockQty: stock,

    currentPriceGross: currentPrice,
    alltronRecommendedGross: recommended,

    purchaseNet,
    purchaseGross,
    costSource: row.cost_source,

    vatRate,

    currentRegisteredProfit: registeredProfit,
    currentRegisteredMargin: registeredMargin,

    minimum10,
    minimum15,

    requiredIncrease10: minimum10 - currentPrice,

    raw: row,
  });
}

console.log(
  `Stock + VAT registered loss candidates: ${candidates.length}`
);

// ---------------------------------------------------------
// Sort: worst loss first
// ---------------------------------------------------------

candidates.sort((a, b) => {
  return a.currentRegisteredProfit - b.currentRegisteredProfit;
});

const pilot = candidates.slice(0, PILOT_SIZE);

if (pilot.length !== PILOT_SIZE) {
  throw new Error(
    `Expected ${PILOT_SIZE} pilot products, found ${pilot.length}.`
  );
}

// ---------------------------------------------------------
// Build preview
// ---------------------------------------------------------

const preview = pilot.map((p, index) => {
  const newPrice = p.minimum10;

  const increase = newPrice - p.currentPriceGross;
  const increasePercent =
    p.currentPriceGross > 0
      ? increase / p.currentPriceGross
      : null;

  return {
    position: index + 1,

    catalog_key: p.catalogKey,
    litm: p.litm,
    sku: p.sku,
    ean: p.ean,

    stock_qty: p.stockQty,

    current_price_chf: money(p.currentPriceGross),

    alltron_recommended_gross_chf:
      money(p.alltronRecommendedGross),

    purchase_net_chf: money(p.purchaseNet),
    purchase_gross_chf: money(p.purchaseGross),

    cost_source: p.costSource,

    current_profit_chf:
      money(p.currentRegisteredProfit),

    current_margin_percent:
      percent(p.currentRegisteredMargin),

    minimum_10_price_chf:
      money(p.minimum10),

    minimum_15_price_chf:
      money(p.minimum15),

    proposed_new_price_chf:
      money(newPrice),

    required_increase_chf:
      money(increase),

    required_increase_percent:
      percent(increasePercent),

    action: "PREVIEW_ONLY",
  };
});

// ---------------------------------------------------------
// Console preview
// ---------------------------------------------------------

console.log("");
console.log(
  "--------------------------------------------------------------------------------------------------------------------------------"
);

console.log(
  [
    "#".padEnd(3),
    "LITM".padEnd(10),
    "STOCK".padStart(6),
    "CURRENT".padStart(12),
    "COST NET".padStart(12),
    "PROFIT".padStart(12),
    "NEW 10%".padStart(12),
    "INCREASE".padStart(12),
    "SKU",
  ].join(" | ")
);

console.log(
  "--------------------------------------------------------------------------------------------------------------------------------"
);

for (const row of preview) {
  console.log(
    [
      String(row.position).padEnd(3),
      String(row.litm).padEnd(10),
      String(row.stock_qty).padStart(6),
      String(row.current_price_chf).padStart(12),
      String(row.purchase_net_chf).padStart(12),
      String(row.current_profit_chf).padStart(12),
      String(row.proposed_new_price_chf).padStart(12),
      String(row.required_increase_chf).padStart(12),
      row.sku,
    ].join(" | ")
  );
}

console.log(
  "--------------------------------------------------------------------------------------------------------------------------------"
);

// ---------------------------------------------------------
// Output files
// ---------------------------------------------------------

writeCsv(OUT_CSV, preview);

const jsonReport = {
  generatedAt: new Date().toISOString(),

  mode: "PREVIEW_ONLY",

  safety: {
    externalWrites: 0,
    supabaseWrites: 0,
    shopifyWrites: 0,
    vatScenario: "VAT_REGISTERED",
    targetMinimumMargin: 0.10,
  },

  source: INPUT,

  totals: {
    reviewRows: rows.length,
    eligibleLossCandidates: candidates.length,
    pilotProducts: pilot.length,
  },

  selection: {
    stockRequired: true,
    stockGreaterThan: 0,
    lossFlag: "LOSS_VAT_REGISTERED",
    profitMustBeBelow: 0,
    targetMargin: 0.10,
    order: "largest registered loss first",
  },

  products: preview,
};

fs.writeFileSync(
  OUT_JSON,
  JSON.stringify(jsonReport, null, 2),
  "utf8"
);

// ---------------------------------------------------------
// Finish
// ---------------------------------------------------------

console.log("");
console.log("==============================================");
console.log(" PILOT PREVIEW READY");
console.log("==============================================");

console.log(`Review rows: ${rows.length}`);
console.log(`Eligible candidates: ${candidates.length}`);
console.log(`Pilot products: ${pilot.length}`);

console.log("");
console.log(`CSV:  ${OUT_CSV}`);
console.log(`JSON: ${OUT_JSON}`);

console.log("");
console.log("External writes: 0");
console.log("NO PRICES WERE CHANGED.");
console.log("");