import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  selectSupplier,
} from "../integrations/suppliers/supplier-selector.mjs";

import {
  buildAlltronOffer,
} from "../integrations/suppliers/alltron-offer.mjs";

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
  "also-supplier-shadow-audit.json",
);

function text(value) {
  return String(value ?? "").trim();
}

function normalizeMpn(value) {
  return text(value).toUpperCase();
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

const summary = {
  masterProducts: products.length,
  safeAlsoMatches: 0,

  selectedAlso: 0,
  selectedAlltron: 0,
  selectedNone: 0,

  alsoSelectedWithStock: 0,
  alltronSelectedWithStock: 0,

  ambiguousAlsoSkipped: 0,
};

const reasonCounts = {};
const examplesAlso = [];
const examplesAlltron = [];

for (const product of products) {
  const mpn = normalizeMpn(
    product.internalNumber ??
    product.mpn ??
    product.manufacturerPartNumber ??
    product.partNumber,
  );

  if (!mpn) {
    continue;
  }

  if (alsoIndex.ambiguousMpns?.[mpn]) {
    summary.ambiguousAlsoSkipped++;
    continue;
  }

  const also = alsoIndex.byMpn?.[mpn];

  if (!also) {
    continue;
  }

  summary.safeAlsoMatches++;

  const alltronOffer =
    buildAlltronOffer(product);

  const alsoOffer = {
    supplier: "also",

    supplierSku:
      String(also.productId ?? ""),

    mpn:
      also.manufacturerPartNumber ?? mpn,

    vatRate: 8.1,

    costNet:
      Number(also.costNet ?? 0),

    stock:
      Math.max(
        0,
        Number(also.stock ?? 0),
      ),

    directShip: true,

    raw: {
      source: "also-mpn-index",
      matchedBy: "mpn",
      available: Boolean(also.available),
    },
  };

  const selection = selectSupplier([
    alltronOffer,
    alsoOffer,
  ]);

  const supplier =
    selection.selectedSupplier || "";

  const reason =
    selection.selectionReason || "unknown";

  reasonCounts[reason] =
    (reasonCounts[reason] || 0) + 1;

  if (supplier === "also") {
    summary.selectedAlso++;

    if (selection.selectedStock > 0) {
      summary.alsoSelectedWithStock++;
    }

    if (examplesAlso.length < 20) {
      examplesAlso.push({
        mpn,
        title:
          product.fullTitle ??
          product.title ??
          null,

        alltronSku:
          product.litm ??
          product.alltronSku ??
          null,

        alsoProductId:
          also.productId,

        alltronCostNet:
          alltronOffer.costNet,

        alsoCostNet:
          alsoOffer.costNet,

        alltronStock:
          alltronOffer.stock,

        alsoStock:
          alsoOffer.stock,

        reason,
      });
    }
  } else if (supplier === "alltron") {
    summary.selectedAlltron++;

    if (selection.selectedStock > 0) {
      summary.alltronSelectedWithStock++;
    }

    if (examplesAlltron.length < 20) {
      examplesAlltron.push({
        mpn,
        title:
          product.fullTitle ??
          product.title ??
          null,

        alltronSku:
          product.litm ??
          product.alltronSku ??
          null,

        alsoProductId:
          also.productId,

        alltronCostNet:
          alltronOffer.costNet,

        alsoCostNet:
          alsoOffer.costNet,

        alltronStock:
          alltronOffer.stock,

        alsoStock:
          alsoOffer.stock,

        reason,
      });
    }
  } else {
    summary.selectedNone++;
  }
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),

  mode: "SHADOW_ONLY",

  safety: {
    shopifyWrites: false,
    supplierSubmission: false,
    stockWrites: false,
    priceWrites: false,
    networkCalls: false,
  },

  summary,
  reasonCounts,
  examplesAlso,
  examplesAlltron,
};

fs.writeFileSync(
  OUT_FILE,
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(
  "\n========== SUPPLIER SHADOW AUDIT ==========",
);

console.log(
  `Master products:            ${summary.masterProducts}`,
);

console.log(
  `Safe ALSO matches:          ${summary.safeAlsoMatches}`,
);

console.log(
  `Selected ALSO:              ${summary.selectedAlso}`,
);

console.log(
  `Selected Alltron:           ${summary.selectedAlltron}`,
);

console.log(
  `Selected none:              ${summary.selectedNone}`,
);

console.log(
  `Ambiguous ALSO skipped:     ${summary.ambiguousAlsoSkipped}`,
);

console.log("\nSelection reasons:");

for (const [reason, count] of Object.entries(
  reasonCounts,
).sort((a, b) => b[1] - a[1])) {
  console.log(`- ${reason}: ${count}`);
}

console.log(
  `\nReport: ${path.relative(ROOT, OUT_FILE)}`,
);

console.log(
  "SHOPIFY/SUPPLIER WRITES: DISABLED",
);

console.log(
  "===========================================\n",
);
