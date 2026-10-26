import fs from "fs";
import readline from "readline";

const MASTER =
  "./integrations/alltron/out/iumatec-master-catalog.json";

const groups = new Map();
const examples = [];

const rl = readline.createInterface({
  input: fs.createReadStream(MASTER),
  crlfDelay: Infinity,
});

for await (const raw of rl) {
  let line = raw.trim();

  if (!line || line === "[" || line === "]") {
    continue;
  }

  if (line.endsWith(",")) {
    line = line.slice(0, -1);
  }

  const p = JSON.parse(line);

  const selected =
    p.selectedSupplier || "(none)";

  const stock =
    p.selectedStockSupplier || "(none)";

  if (selected === stock) {
    continue;
  }

  const key = `${selected} -> ${stock}`;

  groups.set(
    key,
    (groups.get(key) || 0) + 1,
  );

  if (examples.length < 25) {
    examples.push({
      litm: p.litm || null,
      mpn:
        p.internalNumber ||
        p.mpn ||
        p.manufacturerPartNumber ||
        null,
      title: p.title || p.fullTitle || null,
      selectedSupplier:
        p.selectedSupplier || null,
      selectedStockSupplier:
        p.selectedStockSupplier || null,
      stock: p.stock || 0,
      price: p.price || 0,
      purchaseCostNet:
        p.purchaseCostNet || 0,
      reason:
        p.supplierSelectionReason || null,
    });
  }
}

console.log(
  "\n========== STOCK OWNERSHIP MISMATCH =========="
);

for (
  const [name, count] of
  [...groups.entries()]
    .sort((a, b) => b[1] - a[1])
) {
  console.log(
    String(count).padStart(6),
    name,
  );
}

console.log("\nExamples:");
console.table(examples);

console.log(
  "=============================================\n",
);
