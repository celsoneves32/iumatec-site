import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const INPUT_FILE = path.join(
  ROOT,
  "integrations",
  "also",
  "out",
  "also-purchase-snapshot.json",
);

const OUTPUT_FILE = path.join(
  ROOT,
  "integrations",
  "also",
  "out",
  "also-mpn-index.json",
);

function normalizeMpn(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

const snapshot = JSON.parse(
  fs.readFileSync(INPUT_FILE, "utf8"),
);

const candidates = {};

for (const product of Object.values(
  snapshot.byProductId ?? {},
)) {
  const mpn = normalizeMpn(
    product.manufacturerPartNumber,
  );

  if (!mpn) {
    continue;
  }

  if (!candidates[mpn]) {
    candidates[mpn] = [];
  }

  candidates[mpn].push({
    productId: product.productId,
    manufacturerPartNumber:
      product.manufacturerPartNumber,
    stock: product.stock,
    costNet: product.costNet,
    available: product.available,
  });
}

const byMpn = {};
const ambiguousMpns = {};

for (const [mpn, products] of Object.entries(
  candidates,
)) {
  if (products.length === 1) {
    byMpn[mpn] = products[0];
  } else {
    ambiguousMpns[mpn] = products;
  }
}

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  supplier: "also",

  summary: {
    uniqueMpns: Object.keys(byMpn).length,
    ambiguousMpns:
      Object.keys(ambiguousMpns).length,
    ambiguousProducts:
      Object.values(ambiguousMpns)
        .reduce(
          (sum, products) =>
            sum + products.length,
          0,
        ),
  },

  byMpn,
  ambiguousMpns,
};

fs.writeFileSync(
  OUTPUT_FILE,
  `${JSON.stringify(output, null, 2)}\n`,
  "utf8",
);

console.log(
  "\n========== ALSO MPN INDEX ==========",
);
console.log(
  `Unique MPN: ${output.summary.uniqueMpns}`,
);
console.log(
  `Ambiguous MPN: ${output.summary.ambiguousMpns}`,
);
console.log(
  `Ambiguous products: ${output.summary.ambiguousProducts}`,
);
console.log(
  `Output: ${path.relative(ROOT, OUTPUT_FILE)}`,
);
console.log(
  "====================================\n",
);
