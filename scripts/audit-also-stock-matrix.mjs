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
  "also-stock-matrix-audit.json",
);

function text(value) {
  return String(value ?? "").trim();
}

function normalizeMpn(value) {
  return text(value).toUpperCase();
}

console.log("Loading ALSO index...");

const alsoIndex = JSON.parse(
  fs.readFileSync(ALSO_INDEX_FILE, "utf8"),
);

console.log("Loading master catalog...");

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
  ambiguousSkipped: 0,

  bothInStock: 0,
  onlyAlsoInStock: 0,
  onlyAlltronInStock: 0,
  neitherInStock: 0,

  selectedAlso: 0,
  selectedAlsoOwnStock: 0,
  selectedAlsoNoOwnStockAlltronHasStock: 0,
  selectedAlsoNoStockAnywhere: 0,

  selectedAlltron: 0,
  selectedAlltronOwnStock: 0,
  selectedAlltronNoOwnStockAlsoHasStock: 0,
  selectedAlltronNoStockAnywhere: 0,

  selectedNone: 0,
};

const problemReasons = {};
const examples = [];

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
    summary.ambiguousSkipped++;
    continue;
  }

  const also = alsoIndex.byMpn?.[mpn];

  if (!also) {
    continue;
  }

  summary.safeAlsoMatches++;

  const alltronOffer = buildAlltronOffer(product);

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

  const alsoHasStock =
    Boolean(also.available) &&
    Number(alsoOffer.stock) > 0;

  const alltronHasStock =
    Number(alltronOffer.stock ?? 0) > 0;

  if (alsoHasStock && alltronHasStock) {
    summary.bothInStock++;
  } else if (alsoHasStock) {
    summary.onlyAlsoInStock++;
  } else if (alltronHasStock) {
    summary.onlyAlltronInStock++;
  } else {
    summary.neitherInStock++;
  }

  const selection = selectSupplier([
    alltronOffer,
    alsoOffer,
  ]);

  const supplier =
    String(
      selection.selectedSupplier ?? "",
    ).toLowerCase();

  const reason =
    selection.selectionReason ?? "unknown";

  if (supplier === "also") {
    summary.selectedAlso++;

    if (alsoHasStock) {
      summary.selectedAlsoOwnStock++;
    } else if (alltronHasStock) {
      summary.selectedAlsoNoOwnStockAlltronHasStock++;

      problemReasons[reason] =
        (problemReasons[reason] ?? 0) + 1;

      if (examples.length < 30) {
        examples.push({
          type:
            "ALSO_SELECTED_WITHOUT_ALSO_STOCK",
          mpn,
          title:
            product.fullTitle ??
            product.title ??
            null,
          reason,
          also: {
            productId: also.productId,
            stock: alsoOffer.stock,
            costNet: alsoOffer.costNet,
          },
          alltron: {
            litm:
              product.litm ??
              product.alltronSku ??
              null,
            stock: alltronOffer.stock,
            costNet: alltronOffer.costNet,
          },
        });
      }
    } else {
      summary.selectedAlsoNoStockAnywhere++;
    }
  } else if (supplier === "alltron") {
    summary.selectedAlltron++;

    if (alltronHasStock) {
      summary.selectedAlltronOwnStock++;
    } else if (alsoHasStock) {
      summary.selectedAlltronNoOwnStockAlsoHasStock++;

      problemReasons[reason] =
        (problemReasons[reason] ?? 0) + 1;

      if (examples.length < 30) {
        examples.push({
          type:
            "ALLTRON_SELECTED_WITHOUT_ALLTRON_STOCK",
          mpn,
          title:
            product.fullTitle ??
            product.title ??
            null,
          reason,
          also: {
            productId: also.productId,
            stock: alsoOffer.stock,
            costNet: alsoOffer.costNet,
          },
          alltron: {
            litm:
              product.litm ??
              product.alltronSku ??
              null,
            stock: alltronOffer.stock,
            costNet: alltronOffer.costNet,
          },
        });
      }
    } else {
      summary.selectedAlltronNoStockAnywhere++;
    }
  } else {
    summary.selectedNone++;
  }
}

const alsoCheck =
  summary.selectedAlsoOwnStock +
  summary.selectedAlsoNoOwnStockAlltronHasStock +
  summary.selectedAlsoNoStockAnywhere;

const alltronCheck =
  summary.selectedAlltronOwnStock +
  summary.selectedAlltronNoOwnStockAlsoHasStock +
  summary.selectedAlltronNoStockAnywhere;

if (alsoCheck !== summary.selectedAlso) {
  throw new Error(
    `ALSO matrix mismatch: ${alsoCheck} != ${summary.selectedAlso}`,
  );
}

if (alltronCheck !== summary.selectedAlltron) {
  throw new Error(
    `Alltron matrix mismatch: ${alltronCheck} != ${summary.selectedAlltron}`,
  );
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),

  mode: "READ_ONLY_STOCK_MATRIX",

  safety: {
    networkCalls: false,
    supplierWrites: false,
    shopifyWrites: false,
    stockWrites: false,
    priceWrites: false,
  },

  summary,
  problemReasons,
  examples,
};

fs.writeFileSync(
  OUT_FILE,
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(
  "\n========== ALSO / ALLTRON STOCK MATRIX ==========",
);

console.log(`Safe ALSO matches: ${summary.safeAlsoMatches}`);

console.log("\nStock availability:");
console.log(`Both in stock:       ${summary.bothInStock}`);
console.log(`Only ALSO:           ${summary.onlyAlsoInStock}`);
console.log(`Only Alltron:        ${summary.onlyAlltronInStock}`);
console.log(`Neither:             ${summary.neitherInStock}`);

console.log("\nALSO selected:");
console.log(`Total:                         ${summary.selectedAlso}`);
console.log(`Own ALSO stock:                ${summary.selectedAlsoOwnStock}`);
console.log(`No ALSO stock, Alltron has:    ${summary.selectedAlsoNoOwnStockAlltronHasStock}`);
console.log(`No stock anywhere:             ${summary.selectedAlsoNoStockAnywhere}`);

console.log("\nAlltron selected:");
console.log(`Total:                         ${summary.selectedAlltron}`);
console.log(`Own Alltron stock:             ${summary.selectedAlltronOwnStock}`);
console.log(`No Alltron stock, ALSO has:    ${summary.selectedAlltronNoOwnStockAlsoHasStock}`);
console.log(`No stock anywhere:             ${summary.selectedAlltronNoStockAnywhere}`);

console.log("\nProblem reasons:");

for (const [reason, count] of Object.entries(
  problemReasons,
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
  "=================================================\n",
);
