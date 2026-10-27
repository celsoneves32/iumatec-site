import fs from "fs";
import readline from "readline";

const MASTER =
  "./integrations/alltron/out/iumatec-master-catalog.json";

const OVERLAY =
  "./integrations/also/out/also-safe-supplier-overlay.json";

const overlay =
  JSON.parse(fs.readFileSync(OVERLAY, "utf8"));

const expectedMpns = new Set(
  Object.keys(overlay.byMpn || {}).map((x) =>
    String(x).trim().toUpperCase()
  )
);

const seenOverlayMpns = new Set();
const alsoProductIds = new Set();

const counts = {
  total: 0,
  selectedAlso: 0,
  selectedAlltron: 0,
  selectedNull: 0,
  selectedOther: 0,

  withAlsoProductId: 0,
  duplicateAlsoProductId: 0,

  supplierStockMismatch: 0,
  alsoSelectedWithoutProductId: 0,
};

const input = fs.createReadStream(MASTER);

const rl = readline.createInterface({
  input,
  crlfDelay: Infinity,
});

for await (const rawLine of rl) {
  let line = rawLine.trim();

  if (
    !line ||
    line === "[" ||
    line === "]"
  ) {
    continue;
  }

  if (line.endsWith(",")) {
    line = line.slice(0, -1);
  }

  const p = JSON.parse(line);

  counts.total++;

  const supplier =
    p.selectedSupplier || null;

  const stockSupplier =
    p.selectedStockSupplier || null;

  if (supplier === "also") {
    counts.selectedAlso++;
  } else if (supplier === "alltron") {
    counts.selectedAlltron++;
  } else if (!supplier) {
    counts.selectedNull++;
  } else {
    counts.selectedOther++;
  }

  if (supplier !== stockSupplier) {
    counts.supplierStockMismatch++;
  }

  if (
    supplier === "also" &&
    !p.alsoProductId
  ) {
    counts.alsoSelectedWithoutProductId++;
  }

  if (p.alsoProductId) {
    counts.withAlsoProductId++;

    const id = String(p.alsoProductId);

    if (alsoProductIds.has(id)) {
      counts.duplicateAlsoProductId++;
    }

    alsoProductIds.add(id);
  }

  const mpn = String(
    p.internalNumber ||
    p.mpn ||
    p.manufacturerPartNumber ||
    ""
  )
    .trim()
    .toUpperCase();

  if (
    mpn &&
    expectedMpns.has(mpn)
  ) {
    seenOverlayMpns.add(mpn);
  }
}

const missingOverlayMpns =
  [...expectedMpns].filter(
    (mpn) => !seenOverlayMpns.has(mpn)
  );

console.log(
  "\n========== MASTER + ALSO FINAL AUDIT =========="
);

console.log(counts);

console.log(
  "\nExpected ALSO mappings:",
  expectedMpns.size
);

console.log(
  "Seen ALSO mappings:",
  seenOverlayMpns.size
);

console.log(
  "Missing ALSO mappings:",
  missingOverlayMpns.length
);

console.log(
  "Missing MPN:",
  missingOverlayMpns
);

console.log(
  "\nSHOPIFY/SUPPLIER WRITES: DISABLED"
);

console.log(
  "==============================================\n"
);
