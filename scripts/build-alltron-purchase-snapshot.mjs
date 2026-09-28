import fs from "node:fs";
import path from "node:path";

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

const OUTPUT_FILE = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "alltron-purchase-snapshot.json",
);

function text(value) {
  return String(value ?? "").trim();
}

function number(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

if (!fs.existsSync(MASTER_FILE)) {
  throw new Error(
    `Master não encontrado: ${MASTER_FILE}`,
  );
}

console.log(
  "\n=== ALLTRON PURCHASE SNAPSHOT ===",
);

console.log(
  "A carregar master...",
);

const masterStat =
  fs.statSync(MASTER_FILE);

const master = JSON.parse(
  fs.readFileSync(
    MASTER_FILE,
    "utf8",
  ),
);

if (!Array.isArray(master)) {
  throw new Error(
    "Master catalog não é um array.",
  );
}

const byLitm = {};
const duplicates = [];
let skippedWithoutLitm = 0;
let validOffers = 0;

for (const product of master) {
  const offer =
    buildAlltronOffer(product);

  const litm = text(
    product.litm ||
    product.alltronSku ||
    offer.supplierSku,
  );

  if (!litm) {
    skippedWithoutLitm++;
    continue;
  }

  const record = {
    litm,

    alltronSku: text(
      product.alltronSku ||
      product.litm ||
      offer.supplierSku,
    ),

    ean: text(
      product.ean ||
      offer.ean,
    ),

    costNet:
      number(offer.costNet),

    costGross:
      number(offer.costGross),

    stock:
      Math.max(
        0,
        Math.trunc(
          number(offer.stock),
        ),
      ),

    available:
      Boolean(offer.available),

    masterSellingPrice:
      number(product.price),
  };

  if (
    record.costNet > 0
  ) {
    validOffers++;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      byLitm,
      litm,
    )
  ) {
    duplicates.push({
      litm,
      first: byLitm[litm],
      duplicate: record,
    });

    /*
     * Nunca escolhemos silenciosamente
     * entre dois LITM iguais.
     */
    byLitm[litm] = null;

    continue;
  }

  byLitm[litm] = record;
}

const snapshot = {
  schemaVersion: 1,

  generatedAt:
    new Date().toISOString(),

  source: {
    file:
      path.relative(
        ROOT,
        MASTER_FILE,
      ),

    size:
      masterStat.size,

    mtimeMs:
      masterStat.mtimeMs,
  },

  summary: {
    masterProducts:
      master.length,

    indexedLitm:
      Object.keys(byLitm).length,

    validOffers,

    skippedWithoutLitm,

    duplicateLitm:
      duplicates.length,
  },

  byLitm,

  duplicates,
};

fs.writeFileSync(
  OUTPUT_FILE,
  JSON.stringify(
    snapshot,
    null,
    2,
  ),
  "utf8",
);

console.log(
  "Master products:",
  snapshot.summary.masterProducts,
);

console.log(
  "Indexed LITM:",
  snapshot.summary.indexedLitm,
);

console.log(
  "Valid costs:",
  snapshot.summary.validOffers,
);

console.log(
  "Duplicate LITM:",
  snapshot.summary.duplicateLitm,
);

console.log(
  "\nOutput:",
  path.relative(
    ROOT,
    OUTPUT_FILE,
  ),
);

console.log(
  "\nSNAPSHOT DONE",
);