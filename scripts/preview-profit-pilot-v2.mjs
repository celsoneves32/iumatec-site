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

const OUT_CSV = path.join(
  OUT_DIR,
  "pilot-25-commercial-preview.csv"
);

const OUT_JSON = path.join(
  OUT_DIR,
  "pilot-25-commercial-preview.json"
);

const PILOT_SIZE = 25;

// ---------------------------------------------------------
// GUARDRAILS
// ---------------------------------------------------------

// Automatic increases above this percentage are forbidden.
const MAX_AUTO_INCREASE_RATE = 0.25;

// 10% margin price may be at most 10% above Alltron recommended
// to remain a normal SAFE candidate.
const MAX_ABOVE_ECPR_RATE = 0.10;

// If required price is far above ECPR, manual review.
const HARD_MAX_ABOVE_ECPR_RATE = 0.25;

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

function num(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function money(value) {
  return Number.isFinite(value)
    ? Number(value.toFixed(2))
    : null;
}

function pct(value) {
  return Number.isFinite(value)
    ? Number((value * 100).toFixed(2))
    : null;
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
    value === null || value === undefined
      ? ""
      : String(value);

  return `"${text.replaceAll('"', '""')}"`;
}

function writeCsv(filePath, rows) {
  if (!rows.length) {
    throw new Error("No rows to write.");
  }

  const headers = Object.keys(rows[0]);

  const output = [
    headers.map(escapeCsv).join(";"),
    ...rows.map((row) =>
      headers
        .map((header) => escapeCsv(row[header]))
        .join(";")
    ),
  ];

  fs.writeFileSync(
    filePath,
    "\uFEFF" + output.join("\n"),
    "utf8"
  );
}

// ---------------------------------------------------------
// Start
// ---------------------------------------------------------

console.log("");
console.log("====================================================");
console.log(" IUMATEC COMMERCIAL PRICE PILOT V2 - PREVIEW ONLY");
console.log("====================================================");
console.log("");

console.log("External writes: 0");
console.log("Supabase writes: 0");
console.log("Shopify writes: 0");
console.log("");

if (!fs.existsSync(INPUT)) {
  throw new Error(`Missing input:\n${INPUT}`);
}

// ---------------------------------------------------------
// Read CSV
// ---------------------------------------------------------

const raw = fs
  .readFileSync(INPUT, "utf8")
  .replace(/^\uFEFF/, "");

const lines = raw
  .split(/\r?\n/)
  .filter((line) => line.trim());

const headers = parseCsvLine(lines[0]);

const rows = [];

for (let i = 1; i < lines.length; i++) {
  const values = parseCsvLine(lines[i]);

  if (values.length !== headers.length) {
    continue;
  }

  const row = {};

  for (let j = 0; j < headers.length; j++) {
    row[headers[j]] = values[j];
  }

  rows.push(row);
}

console.log(`Review rows read: ${rows.length}`);

// ---------------------------------------------------------
// Eligible loss products
// ---------------------------------------------------------

const candidates = [];

for (const row of rows) {
  const flags = row.flags || "";

  const stock = num(row.stock_qty);
  const current = num(row.current_price_gross);
  const ecpr = num(row.ecpr_recommended_gross);

  const purchaseNet = num(row.expr_purchase_net);
  const purchaseGross = num(row.inpr_purchase_gross);

  const profit = num(row.registered_profit);
  const margin = num(row.registered_margin_rate);

  const minimum10 = num(row.registered_minimum_10);
  const minimum15 = num(row.registered_minimum_15);

  if (!flags.includes("LOSS_VAT_REGISTERED")) {
    continue;
  }

  if (!Number.isFinite(stock) || stock <= 0) {
    continue;
  }

  if (!Number.isFinite(current) || current <= 0) {
    continue;
  }

  if (!Number.isFinite(profit) || profit >= 0) {
    continue;
  }

  if (!Number.isFinite(minimum10)) {
    continue;
  }

  candidates.push({
    catalogKey: row.catalog_key,
    litm: row.litm,
    sku: row.sku,
    ean: row.ean,

    stock,
    current,
    ecpr,

    purchaseNet,
    purchaseGross,
    costSource: row.cost_source,

    profit,
    margin,

    minimum10,
    minimum15,
  });
}

// Worst losses first
candidates.sort((a, b) => a.profit - b.profit);

const pilot = candidates.slice(0, PILOT_SIZE);

console.log(
  `Eligible stock + loss candidates: ${candidates.length}`
);

console.log(`Pilot products: ${pilot.length}`);

// ---------------------------------------------------------
// Commercial classification
// ---------------------------------------------------------

const preview = pilot.map((p, index) => {
  const increase10 = p.minimum10 - p.current;

  const increase10Rate =
    increase10 / p.current;

  const aboveEcprRate =
    Number.isFinite(p.ecpr) && p.ecpr > 0
      ? (p.minimum10 - p.ecpr) / p.ecpr
      : null;

  let classification = "MANUAL_REVIEW";
  let reason = "";
  let proposedPrice = null;

  // -------------------------------------------------------
  // No usable ECPR reference
  // -------------------------------------------------------

  if (!Number.isFinite(p.ecpr) || p.ecpr <= 0) {
    classification = "MANUAL_REVIEW";
    reason = "NO_ECPR_REFERENCE";
  }

  // -------------------------------------------------------
  // Required increase too large
  // -------------------------------------------------------

  else if (increase10Rate > MAX_AUTO_INCREASE_RATE) {
    classification = "MANUAL_REVIEW";
    reason = "PRICE_INCREASE_OVER_25_PERCENT";
  }

  // -------------------------------------------------------
  // Required price dramatically above Alltron reference
  // -------------------------------------------------------

  else if (
    aboveEcprRate !== null &&
    aboveEcprRate > HARD_MAX_ABOVE_ECPR_RATE
  ) {
    classification = "MANUAL_REVIEW";
    reason = "MINIMUM_10_TOO_FAR_ABOVE_ECPR";
  }

  // -------------------------------------------------------
  // Normal 10% candidate
  // -------------------------------------------------------

  else if (
    aboveEcprRate !== null &&
    aboveEcprRate <= MAX_ABOVE_ECPR_RATE
  ) {
    classification = "SAFE_10_MARGIN";
    reason = "10_PERCENT_MARGIN_WITHIN_REFERENCE_RANGE";
    proposedPrice = p.minimum10;
  }

  // -------------------------------------------------------
  // Commercially difficult product
  // -------------------------------------------------------

  else {
    classification = "LOW_MARGIN_REVIEW";
    reason = "10_PERCENT_MARGIN_ABOVE_ECPR_REFERENCE";

    // We deliberately do NOT invent a lower price here.
    // This category needs a separate low-margin policy.
    proposedPrice = null;
  }

  return {
    position: index + 1,

    catalog_key: p.catalogKey,
    litm: p.litm,
    sku: p.sku,
    ean: p.ean,

    stock_qty: p.stock,

    current_price_chf: money(p.current),

    alltron_recommended_gross_chf:
      money(p.ecpr),

    purchase_net_chf:
      money(p.purchaseNet),

    purchase_gross_chf:
      money(p.purchaseGross),

    cost_source: p.costSource,

    current_profit_chf:
      money(p.profit),

    current_margin_percent:
      pct(p.margin),

    minimum_10_chf:
      money(p.minimum10),

    minimum_15_chf:
      money(p.minimum15),

    increase_to_10_chf:
      money(increase10),

    increase_to_10_percent:
      pct(increase10Rate),

    minimum_10_vs_ecpr_percent:
      pct(aboveEcprRate),

    classification,

    reason,

    proposed_price_chf:
      money(proposedPrice),

    action: "PREVIEW_ONLY",
  };
});

// ---------------------------------------------------------
// Stats
// ---------------------------------------------------------

const stats = {};

for (const row of preview) {
  stats[row.classification] =
    (stats[row.classification] || 0) + 1;
}

// ---------------------------------------------------------
// Console
// ---------------------------------------------------------

console.log("");
console.log(
  "------------------------------------------------------------------------------------------------------------"
);

console.log(
  [
    "#".padEnd(3),
    "LITM".padEnd(9),
    "CURRENT".padStart(10),
    "ECPR".padStart(10),
    "MIN10".padStart(10),
    "INC%".padStart(8),
    "CLASSIFICATION".padEnd(22),
    "SKU",
  ].join(" | ")
);

console.log(
  "------------------------------------------------------------------------------------------------------------"
);

for (const row of preview) {
  console.log(
    [
      String(row.position).padEnd(3),
      String(row.litm).padEnd(9),
      String(row.current_price_chf).padStart(10),
      String(row.alltron_recommended_gross_chf ?? "").padStart(10),
      String(row.minimum_10_chf).padStart(10),
      String(row.increase_to_10_percent).padStart(8),
      row.classification.padEnd(22),
      row.sku,
    ].join(" | ")
  );
}

console.log(
  "------------------------------------------------------------------------------------------------------------"
);

console.log("");
console.log("CLASSIFICATION SUMMARY");

for (const [key, value] of Object.entries(stats)) {
  console.log(`${key}: ${value}`);
}

// ---------------------------------------------------------
// Save
// ---------------------------------------------------------

writeCsv(OUT_CSV, preview);

const report = {
  generatedAt: new Date().toISOString(),

  mode: "PREVIEW_ONLY",

  safety: {
    externalWrites: 0,
    supabaseWrites: 0,
    shopifyWrites: 0,
  },

  rules: {
    maxAutomaticIncreaseRate:
      MAX_AUTO_INCREASE_RATE,

    maxMinimum10AboveEcprRate:
      MAX_ABOVE_ECPR_RATE,

    hardMaximumAboveEcprRate:
      HARD_MAX_ABOVE_ECPR_RATE,

    vatScenario:
      "VAT_REGISTERED",
  },

  totals: {
    reviewRows: rows.length,
    eligibleCandidates: candidates.length,
    pilotProducts: pilot.length,
  },

  classifications: stats,

  products: preview,
};

fs.writeFileSync(
  OUT_JSON,
  JSON.stringify(report, null, 2),
  "utf8"
);

console.log("");
console.log("====================================================");
console.log(" COMMERCIAL PILOT V2 READY");
console.log("====================================================");
console.log("");

console.log(`CSV:  ${OUT_CSV}`);
console.log(`JSON: ${OUT_JSON}`);

console.log("");
console.log("External writes: 0");
console.log("NO PRICES WERE CHANGED.");
console.log("");