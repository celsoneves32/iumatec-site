import fs from "fs";
import readline from "readline";

const MASTER =
  "./integrations/alltron/out/iumatec-master-catalog.json";

const OVERLAY =
  "./integrations/also/out/also-safe-supplier-overlay.json";

const MISSING = [
  "21NU0023MZ",
  "21U2001SMZ",
  "90MB1FV0-M0EAY0",
  "881457-B21",
  "IOT P5500PA",
  "90LM08S5-B01A70",
  "4873B005",
];

const text = (v) =>
  String(v ?? "").trim();

const upper = (v) =>
  text(v).toUpperCase();

const overlay =
  JSON.parse(fs.readFileSync(OVERLAY, "utf8"));

const overlayByNormalizedMpn =
  new Map(
    Object.entries(overlay.byMpn || {}).map(
      ([mpn, value]) => [
        upper(mpn),
        value,
      ],
    ),
  );

const targets = MISSING.map((mpn) => {
  const mapping =
    overlayByNormalizedMpn.get(upper(mpn));

  return {
    mpn: upper(mpn),

    litm:
      text(mapping?.master?.litm),

    sku:
      upper(mapping?.master?.sku),

    ean:
      text(mapping?.master?.ean),

    title:
      text(
        mapping?.master?.title ||
        mapping?.master?.fullTitle,
      ),

    alsoProductId:
      text(mapping?.also?.productId),

    matches: [],
  };
});

const rl = readline.createInterface({
  input: fs.createReadStream(MASTER),
  crlfDelay: Infinity,
});

for await (const raw of rl) {
  let line = raw.trim();

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

  const pMpn = upper(
    p.internalNumber ||
    p.mpn ||
    p.manufacturerPartNumber,
  );

  const pLitm = text(
    p.litm ||
    p.alltronSku,
  );

  const pSku = upper(p.sku);
  const pEan = text(p.ean);

  for (const target of targets) {
    const matchedBy = [];

    if (
      target.mpn &&
      pMpn === target.mpn
    ) {
      matchedBy.push("MPN");
    }

    if (
      target.litm &&
      pLitm === target.litm
    ) {
      matchedBy.push("LITM");
    }

    if (
      target.ean &&
      pEan === target.ean
    ) {
      matchedBy.push("EAN");
    }

    if (
      target.sku &&
      pSku === target.sku
    ) {
      matchedBy.push("SKU");
    }

    if (matchedBy.length) {
      target.matches.push({
        matchedBy,
        masterMpn: pMpn || null,
        litm: pLitm || null,
        sku: p.sku || null,
        ean: pEan || null,
        title:
          p.title ||
          p.fullTitle ||
          null,
        selectedSupplier:
          p.selectedSupplier || null,
        alsoProductId:
          p.alsoProductId || null,
      });
    }
  }
}

console.log(
  "\n========== 7 ALSO MAPPINGS DIAGNOSTIC =========="
);

for (const target of targets) {
  console.log("\n-----------------------------------");
  console.log("Overlay MPN:", target.mpn);
  console.log("LITM:", target.litm || null);
  console.log("EAN:", target.ean || null);
  console.log("SKU:", target.sku || null);
  console.log(
    "ALSO ProductID:",
    target.alsoProductId || null,
  );
  console.log(
    "Overlay title:",
    target.title || null,
  );

  console.log(
    "Master matches:",
    target.matches.length,
  );

  console.dir(
    target.matches,
    { depth: null },
  );
}

console.log(
  "\nSHOPIFY/CATALOG WRITES: DISABLED"
);

console.log(
  "===============================================\n"
);
