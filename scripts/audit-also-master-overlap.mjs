import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const MASTER_FILE = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "iumatec-master-catalog.json",
);

const ALSO_INDEX_FILE = path.join(
  ROOT,
  "integrations",
  "also",
  "out",
  "also-mpn-index.json",
);

const OUT_FILE = path.join(
  ROOT,
  "integrations",
  "also",
  "out",
  "also-master-overlap-report.json",
);

function text(value) {
  return String(value ?? "").trim();
}

function normalizeMpn(value) {
  return text(value).toUpperCase();
}

function money(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

console.log("A carregar ALSO index...");
const alsoIndex = JSON.parse(
  fs.readFileSync(ALSO_INDEX_FILE, "utf8"),
);

console.log("A carregar master catalog...");
const masterRaw = JSON.parse(
  fs.readFileSync(MASTER_FILE, "utf8"),
);

const products = Array.isArray(masterRaw)
  ? masterRaw
  : Array.isArray(masterRaw.products)
    ? masterRaw.products
    : [];

let masterProducts = 0;
let masterWithMpn = 0;
let matchedAlso = 0;
let matchedAlsoAvailable = 0;
let matchedAlsoUnavailable = 0;
let ambiguousAlso = 0;
let noAlsoMatch = 0;

let bothAvailableWithCost = 0;
let alsoCheaper = 0;
let alltronCheaper = 0;
let equalCost = 0;

let totalPotentialSavingNet = 0;

const examples = [];

for (const product of products) {
  masterProducts++;

  const mpn = normalizeMpn(
    product.internalNumber ??
    product.mpn ??
    product.manufacturerPartNumber ??
    product.partNumber,
  );

  if (!mpn) {
    continue;
  }

  masterWithMpn++;

  if (alsoIndex.ambiguousMpns?.[mpn]) {
    ambiguousAlso++;
    continue;
  }

  const also = alsoIndex.byMpn?.[mpn];

  if (!also) {
    noAlsoMatch++;
    continue;
  }

  matchedAlso++;

  if (also.available) {
    matchedAlsoAvailable++;
  } else {
    matchedAlsoUnavailable++;
  }

  const alltronStock = Math.max(
    0,
    Number(product.stockQty ?? product.stock ?? 0),
  );

  const alltronCostNet = money(
    product.purchaseCostNet ??
    product.expr ??
    0,
  );

  const alsoCostNet = money(also.costNet);

  const alltronAvailable =
    alltronStock > 0 &&
    alltronCostNet > 0;

  const alsoAvailable =
    Boolean(also.available) &&
    Number(also.stock) > 0 &&
    alsoCostNet > 0;

  if (
    alltronAvailable &&
    alsoAvailable
  ) {
    bothAvailableWithCost++;

    const diff =
      Math.round(
        (alltronCostNet - alsoCostNet) * 100,
      ) / 100;

    if (diff > 0.005) {
      alsoCheaper++;
      totalPotentialSavingNet += diff;
    } else if (diff < -0.005) {
      alltronCheaper++;
    } else {
      equalCost++;
    }

    if (examples.length < 20) {
      examples.push({
        mpn,
        title:
          product.title ??
          product.fullTitle ??
          null,
        alltron: {
          litm:
            product.litm ??
            product.alltronSku ??
            null,
          stock: alltronStock,
          costNet: alltronCostNet,
        },
        also: {
          productId: also.productId,
          stock: also.stock,
          costNet: alsoCostNet,
        },
        differenceNet: diff,
        cheaperSupplier:
          diff > 0.005
            ? "also"
            : diff < -0.005
              ? "alltron"
              : "equal",
      });
    }
  }
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),

  summary: {
    masterProducts,
    masterWithMpn,
    matchedAlso,
    matchedAlsoAvailable,
    matchedAlsoUnavailable,
    ambiguousAlso,
    noAlsoMatch,

    bothAvailableWithCost,
    alsoCheaper,
    alltronCheaper,
    equalCost,

    totalPotentialSavingNet:
      Math.round(totalPotentialSavingNet * 100) / 100,
  },

  examples,
};

fs.writeFileSync(
  OUT_FILE,
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log("\n========== ALSO x ALLTRON ==========");
console.log(`Master products:          ${masterProducts}`);
console.log(`Master with MPN:          ${masterWithMpn}`);
console.log(`Matched ALSO:             ${matchedAlso}`);
console.log(`ALSO available:           ${matchedAlsoAvailable}`);
console.log(`ALSO unavailable:         ${matchedAlsoUnavailable}`);
console.log(`Ambiguous ALSO MPN:       ${ambiguousAlso}`);
console.log(`No ALSO match:            ${noAlsoMatch}`);
console.log("------------------------------------");
console.log(`Both available + cost:    ${bothAvailableWithCost}`);
console.log(`ALSO cheaper:             ${alsoCheaper}`);
console.log(`Alltron cheaper:          ${alltronCheaper}`);
console.log(`Equal cost:               ${equalCost}`);
console.log(`Potential saving net CHF: ${report.summary.totalPotentialSavingNet}`);
console.log(`Report: ${path.relative(ROOT, OUT_FILE)}`);
console.log("====================================\n");
