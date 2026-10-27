import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

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
  "also-safe-supplier-overlay.json",
);

function text(value) {
  return String(value ?? "").trim();
}

function mpnKey(value) {
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

console.log("A carregar ALSO index...");

const alsoIndex = JSON.parse(
  fs.readFileSync(ALSO_INDEX_FILE, "utf8"),
);

const masterMpnCounts = new Map();

for (const product of products) {
  const mpn = mpnKey(
    product.internalNumber ??
    product.manufacturerPartNumber ??
    product.mpn ??
    product.partNumber,
  );

  if (!mpn) continue;

  masterMpnCounts.set(
    mpn,
    (masterMpnCounts.get(mpn) || 0) + 1,
  );
}

const byMpn = {};
const byAlsoProductId = {};

let safeMappings = 0;
let masterAmbiguousSkipped = 0;
let alsoAmbiguousSkipped = 0;
let noAlsoMatch = 0;
let duplicateAlsoProductId = 0;

for (const product of products) {
  const mpn = mpnKey(
    product.internalNumber ??
    product.manufacturerPartNumber ??
    product.mpn ??
    product.partNumber,
  );

  if (!mpn) continue;

  if (masterMpnCounts.get(mpn) !== 1) {
    masterAmbiguousSkipped++;
    continue;
  }

  if (alsoIndex.ambiguousMpns?.[mpn]) {
    alsoAmbiguousSkipped++;
    continue;
  }

  const also = alsoIndex.byMpn?.[mpn];

  if (!also) {
    noAlsoMatch++;
    continue;
  }

  const alsoProductId = text(also.productId);

  if (!alsoProductId) {
    continue;
  }

  if (byAlsoProductId[alsoProductId]) {
    duplicateAlsoProductId++;
    continue;
  }

  const mapping = {
    mpn,

    master: {
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
    },

    also: {
      productId: alsoProductId,

      manufacturerPartNumber:
        also.manufacturerPartNumber ??
        mpn,

      stock:
        Number(also.stock ?? 0),

      costNet:
        Number(also.costNet ?? 0),

      available:
        Boolean(also.available),
    },
  };

  byMpn[mpn] = mapping;
  byAlsoProductId[alsoProductId] = mpn;

  safeMappings++;
}

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),

  mode: "SAFE_SUPPLIER_OVERLAY",

  safety: {
    shopifyWrites: false,
    catalogWrites: false,
    supplierWrites: false,
    networkCalls: false,
  },

  summary: {
    masterProducts: products.length,
    safeMappings,
    masterAmbiguousSkipped,
    alsoAmbiguousSkipped,
    noAlsoMatch,
    duplicateAlsoProductId,
  },

  byMpn,
};

fs.mkdirSync(
  path.dirname(OUT_FILE),
  { recursive: true },
);

fs.writeFileSync(
  OUT_FILE,
  `${JSON.stringify(output, null, 2)}\n`,
  "utf8",
);

console.log(
  "\n========== ALSO SAFE OVERLAY ==========",
);

console.log(
  `Master products:            ${products.length}`,
);

console.log(
  `Safe ALSO mappings:         ${safeMappings}`,
);

console.log(
  `Master ambiguous skipped:   ${masterAmbiguousSkipped}`,
);

console.log(
  `ALSO ambiguous skipped:     ${alsoAmbiguousSkipped}`,
);

console.log(
  `Duplicate ALSO ProductID:   ${duplicateAlsoProductId}`,
);

console.log(
  `Output: ${path.relative(ROOT, OUT_FILE)}`,
);

console.log(
  "SHOPIFY/CATALOG WRITES: DISABLED",
);

console.log(
  "=======================================\n",
);
