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
  "also-merge-readiness-audit.json",
);

function text(value) {
  return String(value ?? "").trim();
}

function normalizeMpn(value) {
  return text(value).toUpperCase();
}

console.log("A carregar master...");
const masterRaw = JSON.parse(
  fs.readFileSync(MASTER_FILE, "utf8"),
);

const products = Array.isArray(masterRaw)
  ? masterRaw
  : Array.isArray(masterRaw.products)
    ? masterRaw.products
    : [];

console.log("A carregar ALSO MPN index...");
const alsoIndex = JSON.parse(
  fs.readFileSync(ALSO_INDEX_FILE, "utf8"),
);

const masterByMpn = {};

let masterWithMpn = 0;
let masterWithoutMpn = 0;

for (const product of products) {
  const mpn = normalizeMpn(
    product.internalNumber ??
    product.manufacturerPartNumber ??
    product.mpn ??
    product.partNumber,
  );

  if (!mpn) {
    masterWithoutMpn++;
    continue;
  }

  masterWithMpn++;

  if (!masterByMpn[mpn]) {
    masterByMpn[mpn] = [];
  }

  masterByMpn[mpn].push({
    litm:
      product.litm ??
      product.alltronSku ??
      null,

    sku:
      product.sku ??
      null,

    ean:
      product.ean ??
      product.barcode ??
      null,

    title:
      product.fullTitle ??
      product.title ??
      null,
  });
}

let masterUniqueMpns = 0;
let masterDuplicateMpns = 0;
let masterProductsInsideDuplicateMpns = 0;

let safeOneToOneMatches = 0;
let blockedMasterAmbiguousMatches = 0;
let noAlsoMatch = 0;

const duplicateExamples = [];
const blockedExamples = [];

for (const [mpn, masterMatches] of Object.entries(
  masterByMpn,
)) {
  if (masterMatches.length === 1) {
    masterUniqueMpns++;

    if (alsoIndex.byMpn?.[mpn]) {
      safeOneToOneMatches++;
    } else {
      noAlsoMatch++;
    }

    continue;
  }

  masterDuplicateMpns++;
  masterProductsInsideDuplicateMpns +=
    masterMatches.length;

  if (duplicateExamples.length < 30) {
    duplicateExamples.push({
      mpn,
      count: masterMatches.length,
      products: masterMatches,
    });
  }

  if (alsoIndex.byMpn?.[mpn]) {
    blockedMasterAmbiguousMatches++;

    if (blockedExamples.length < 30) {
      blockedExamples.push({
        mpn,
        alsoProduct:
          alsoIndex.byMpn[mpn],
        masterProducts:
          masterMatches,
      });
    }
  }
}

let alsoOnlyUniqueMpns = 0;

for (const mpn of Object.keys(
  alsoIndex.byMpn ?? {},
)) {
  if (!masterByMpn[mpn]) {
    alsoOnlyUniqueMpns++;
  }
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),

  mode: "READ_ONLY_MERGE_READINESS",

  safety: {
    shopifyWrites: false,
    supplierWrites: false,
    catalogWrites: false,
    priceWrites: false,
    stockWrites: false,
    networkCalls: false,
  },

  summary: {
    masterProducts: products.length,

    masterWithMpn,
    masterWithoutMpn,

    masterUniqueMpns,
    masterDuplicateMpns,
    masterProductsInsideDuplicateMpns,

    safeOneToOneMatches,
    blockedMasterAmbiguousMatches,

    noAlsoMatch,
    alsoOnlyUniqueMpns,

    alsoAmbiguousMpns:
      Object.keys(
        alsoIndex.ambiguousMpns ?? {},
      ).length,
  },

  duplicateExamples,
  blockedExamples,
};

fs.writeFileSync(
  OUT_FILE,
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(
  "\n========== MERGE READINESS AUDIT ==========",
);

console.log(
  `Master products:                 ${report.summary.masterProducts}`,
);

console.log(
  `Master with MPN:                 ${report.summary.masterWithMpn}`,
);

console.log(
  `Master without MPN:              ${report.summary.masterWithoutMpn}`,
);

console.log(
  `Master unique MPN:               ${report.summary.masterUniqueMpns}`,
);

console.log(
  `Master duplicate MPN:            ${report.summary.masterDuplicateMpns}`,
);

console.log(
  `Products inside duplicate MPN:   ${report.summary.masterProductsInsideDuplicateMpns}`,
);

console.log(
  `SAFE 1:1 ALSO matches:           ${report.summary.safeOneToOneMatches}`,
);

console.log(
  `BLOCKED ambiguous master match:  ${report.summary.blockedMasterAmbiguousMatches}`,
);

console.log(
  `ALSO-only unique MPN:            ${report.summary.alsoOnlyUniqueMpns}`,
);

console.log(
  `ALSO ambiguous MPN:              ${report.summary.alsoAmbiguousMpns}`,
);

console.log(
  `\nReport: ${path.relative(ROOT, OUT_FILE)}`,
);

console.log(
  "SHOPIFY/CATALOG WRITES: DISABLED",
);

console.log(
  "===========================================\n",
);
