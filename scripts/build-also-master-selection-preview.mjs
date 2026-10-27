import fs from "node:fs";
import path from "node:path";

import {
  selectSupplier,
} from "../integrations/suppliers/supplier-selector.mjs";

import {
  buildAlltronOffer,
} from "../integrations/suppliers/alltron-offer.mjs";

const ROOT = process.cwd();

const MASTER_FILE = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "iumatec-master-catalog.json",
);

const OVERLAY_FILE = path.join(
  ROOT,
  "integrations",
  "also",
  "out",
  "also-safe-supplier-overlay.json",
);

const OUT_FILE = path.join(
  ROOT,
  "integrations",
  "also",
  "out",
  "also-master-selection-preview.json",
);

function text(value) {
  return String(value ?? "").trim();
}

function num(value) {
  const n = Number(
    String(value ?? "")
      .trim()
      .replace(",", "."),
  );

  return Number.isFinite(n) ? n : 0;
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

console.log("A carregar ALSO safe overlay...");

const overlay = JSON.parse(
  fs.readFileSync(OVERLAY_FILE, "utf8"),
);

const summary = {
  masterProducts: products.length,
  safeAlsoOffersAttached: 0,

  selectedAlso: 0,
  selectedAlltron: 0,
  selectedNone: 0,

  selectedAlsoInStock: 0,
  selectedAlsoOutOfStock: 0,

  selectedAlltronInStock: 0,
  selectedAlltronOutOfStock: 0,

  stockSupplierMatchesSelectedSupplier: 0,
  stockSupplierDiffersFromSelectedSupplier: 0,
};

const reasonCounts = {};
const affectedProducts = [];

for (const product of products) {
  const mpn = normalizeMpn(
    product.internalNumber ??
    product.manufacturerPartNumber ??
    product.mpn ??
    product.partNumber,
  );

  if (!mpn) continue;

  const mapping =
    overlay.byMpn?.[mpn];

  if (!mapping) {
    continue;
  }

  summary.safeAlsoOffersAttached++;

  const alltronOffer =
    buildAlltronOffer(product);

  const alsoOffer = {
    supplier: "also",

    supplierSku:
      text(mapping.also.productId),

    ean:
      text(
        mapping.master?.ean ??
        product.ean ??
        product.barcode,
      ),

    mpn,

    brand:
      text(product.brand),

    vatRate:
      num(product.vat || 8.1),

    costNet:
      num(mapping.also.costNet),

    stock:
      Math.max(
        0,
        Math.trunc(
          num(mapping.also.stock),
        ),
      ),

    directShip: true,

    raw: {
      source:
        "also-safe-supplier-overlay",

      matchedBy:
        "unique-mpn",
    },
  };

  const selection =
    selectSupplier([
      alltronOffer,
      alsoOffer,
    ]);

  const selectedSupplier =
    text(
      selection.selectedSupplier,
    ).toLowerCase();

  const stockSupplier =
    text(
      selection.selectedStockSupplier,
    ).toLowerCase();

  const selectedStock =
    num(
      selection.selectedStock,
    );

  if (selectedSupplier === "also") {
    summary.selectedAlso++;

    if (selectedStock > 0) {
      summary.selectedAlsoInStock++;
    } else {
      summary.selectedAlsoOutOfStock++;
    }
  }
  else if (
    selectedSupplier === "alltron"
  ) {
    summary.selectedAlltron++;

    if (selectedStock > 0) {
      summary.selectedAlltronInStock++;
    } else {
      summary.selectedAlltronOutOfStock++;
    }
  }
  else {
    summary.selectedNone++;
  }

  if (
    selectedSupplier &&
    stockSupplier === selectedSupplier
  ) {
    summary
      .stockSupplierMatchesSelectedSupplier++;
  }
  else if (
    selectedSupplier &&
    stockSupplier &&
    stockSupplier !== selectedSupplier
  ) {
    summary
      .stockSupplierDiffersFromSelectedSupplier++;
  }

  const reason =
    selection.selectionReason ??
    "unknown";

  reasonCounts[reason] =
    (reasonCounts[reason] ?? 0) + 1;

  affectedProducts.push({
    mpn,

    master: {
      litm:
        product.litm ??
        product.alltronSku ??
        null,

      sku:
        product.sku ??
        null,

      title:
        product.fullTitle ??
        product.title ??
        null,

      ean:
        product.ean ??
        product.barcode ??
        null,
    },

    alltron: {
      supplierSku:
        alltronOffer.supplierSku,

      costNet:
        alltronOffer.costNet,

      stock:
        alltronOffer.stock,

      directShip:
        alltronOffer.directShip,
    },

    also: {
      productId:
        mapping.also.productId,

      costNet:
        mapping.also.costNet,

      stock:
        mapping.also.stock,

      available:
        mapping.also.available,

      directShip: true,
    },

    selection: {
      selectedSupplier:
        selection.selectedSupplier,

      selectedSupplierSku:
        selection.selectedSupplierSku,

      selectedPurchaseCostNet:
        selection.selectedPurchaseCostNet,

      selectedPurchaseCostInclVat:
        selection.selectedPurchaseCostInclVat,

      selectedStock:
        selection.selectedStock,

      selectedStockSupplier:
        selection.selectedStockSupplier,

      selectedStockSupplierSku:
        selection.selectedStockSupplierSku,

      selectedDirectShip:
        selection.selectedDirectShip,

      selectionReason:
        selection.selectionReason,
    },
  });
}

const expected =
  Number(
    overlay.summary?.safeMappings ?? 0,
  );

if (
  summary.safeAlsoOffersAttached !==
  expected
) {
  throw new Error(
    `Overlay mismatch: ${summary.safeAlsoOffersAttached} != ${expected}`,
  );
}

const output = {
  schemaVersion: 1,
  generatedAt:
    new Date().toISOString(),

  mode:
    "ALLTRON_ALSO_MASTER_SELECTION_PREVIEW",

  safety: {
    masterWrites: false,
    shopifyWrites: false,
    catalogWrites: false,
    supplierWrites: false,
    networkCalls: false,
  },

  summary,
  reasonCounts,
  affectedProducts,
};

fs.writeFileSync(
  OUT_FILE,
  `${JSON.stringify(output, null, 2)}\n`,
  "utf8",
);

console.log(
  "\n========== ALLTRON + ALSO MASTER PREVIEW ==========",
);

console.log(
  `Master products:                 ${summary.masterProducts}`,
);

console.log(
  `Safe ALSO offers attached:       ${summary.safeAlsoOffersAttached}`,
);

console.log(
  `Selected ALSO:                   ${summary.selectedAlso}`,
);

console.log(
  `Selected Alltron:                ${summary.selectedAlltron}`,
);

console.log(
  `Selected none:                   ${summary.selectedNone}`,
);

console.log(
  `ALSO selected in stock:          ${summary.selectedAlsoInStock}`,
);

console.log(
  `ALSO selected out of stock:      ${summary.selectedAlsoOutOfStock}`,
);

console.log(
  `Alltron selected in stock:       ${summary.selectedAlltronInStock}`,
);

console.log(
  `Alltron selected out of stock:   ${summary.selectedAlltronOutOfStock}`,
);

console.log(
  `Stock supplier = selected:       ${summary.stockSupplierMatchesSelectedSupplier}`,
);

console.log(
  `Stock supplier != selected:      ${summary.stockSupplierDiffersFromSelectedSupplier}`,
);

console.log("\nSelection reasons:");

for (
  const [reason, count]
  of Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
) {
  console.log(
    `- ${reason}: ${count}`,
  );
}

console.log(
  `\nOutput: ${path.relative(ROOT, OUT_FILE)}`,
);

console.log(
  "MASTER/SHOPIFY/SUPPLIER WRITES: DISABLED",
);

console.log(
  "===================================================\n",
);
