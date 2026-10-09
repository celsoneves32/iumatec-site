import fs from "fs";
import path from "path";

const root = process.cwd();

const candidatesFile = path.join(
  root,
  "integrations",
  "alltron",
  "out",
  "iumatec-master-candidates.json",
);

const stateFile = path.join(
  root,
  "integrations",
  "alltron",
  "out",
  "shopify-master-sync",
  "state.json",
);

const outputFile = path.join(
  root,
  "integrations",
  "alltron",
  "out",
  "also-shopify-dryrun-5.json",
);

const candidates = JSON.parse(
  fs.readFileSync(candidatesFile, "utf8"),
);

let state = { success: {} };

if (fs.existsSync(stateFile)) {
  state = JSON.parse(
    fs.readFileSync(stateFile, "utf8"),
  );
}

const success = state?.success || {};

const selected = candidates
  .filter((p) => {
    const sku = String(p?.sku || "")
      .trim()
      .toUpperCase();

    return (
      p?.selectedSupplier === "also" &&
      p?.alreadyLinkedToShopify !== true &&
      !success[sku] &&
      String(p?.alsoProductId || "").trim() &&
      Number(p?.stock || 0) > 0 &&
      Number(p?.price || 0) > 0
    );
  })
  .slice(0, 5);

if (selected.length !== 5) {
  throw new Error(
    `Esperava 5 produtos ALSO seguros; encontrei ${selected.length}.`,
  );
}

fs.writeFileSync(
  outputFile,
  JSON.stringify(selected, null, 2),
  "utf8",
);

console.log("========== ALSO DRY-RUN SAMPLE ==========");
console.table(
  selected.map((p) => ({
    sku: p.sku,
    title: p.fullTitle || p.title,
    supplier: p.selectedSupplier,
    alsoProductId: p.alsoProductId,
    stock: p.stock,
    price: p.price,
    costNet: p.purchaseCostNet,
    linked: p.alreadyLinkedToShopify,
  })),
);

console.log("Output:", outputFile);
console.log("SHOPIFY WRITES: DISABLED");
