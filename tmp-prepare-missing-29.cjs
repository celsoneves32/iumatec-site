const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const CLASSIFICATION = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "shopify-price-reconcile",
  "invalid-final-classification.json"
);

const MASTER = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "iumatec-master-catalog.json"
);

const OUT = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "iumatec-missing-29-candidates.json"
);

function text(v) {
  return String(v ?? "").trim();
}

const classification = JSON.parse(
  fs.readFileSync(CLASSIFICATION, "utf8").replace(/^\uFEFF/, "")
);

const master = JSON.parse(
  fs.readFileSync(MASTER, "utf8").replace(/^\uFEFF/, "")
);

if (!Array.isArray(master)) {
  throw new Error("Master nao e array.");
}

const wanted = classification.result.filter(
  r => r.decision === "CRIAR_NA_SHOPIFY"
);

if (wanted.length !== 29) {
  throw new Error(
    `Esperava exatamente 29 produtos. Encontrados: ${wanted.length}`
  );
}

const byLitm = new Map();

for (const p of master) {
  const litm = text(
    p.litm ??
    p.internalNumber ??
    p.merchandiseId
  );

  if (litm) {
    byLitm.set(litm, p);
  }
}

const selected = [];
const missing = [];

for (const item of wanted) {
  const litm = text(item.litm);
  const product = byLitm.get(litm);

  if (!product) {
    missing.push({
      litm,
      sku: item.sku,
      ean: item.ean
    });

    continue;
  }

  selected.push(product);
}

const uniqueSkus = new Set(
  selected
    .map(p => text(p.sku).toUpperCase())
    .filter(Boolean)
);

console.log("");
console.log("==============================================");
console.log(" PREPARAR OS 29 PRODUTOS EM FALTA");
console.log("==============================================");
console.log("");

console.log("Classificados para criar :", wanted.length);
console.log("Encontrados no Master    :", selected.length);
console.log("SKUs unicos              :", uniqueSkus.size);
console.log("Ausentes                 :", missing.length);

if (missing.length) {
  console.table(missing);
  throw new Error("Existem produtos que nao foram encontrados no Master.");
}

if (selected.length !== 29 || uniqueSkus.size !== 29) {
  throw new Error(
    `Validacao falhou. Produtos=${selected.length}, SKUs=${uniqueSkus.size}`
  );
}

fs.writeFileSync(
  OUT,
  JSON.stringify(selected, null, 2),
  "utf8"
);

const verify = JSON.parse(
  fs.readFileSync(OUT, "utf8").replace(/^\uFEFF/, "")
);

if (!Array.isArray(verify) || verify.length !== 29) {
  throw new Error("Ficheiro final dos 29 nao passou a validacao.");
}

console.log("");
console.log("==============================================");
console.log(" 29 / 29 PREPARADOS COM SUCESSO");
console.log("==============================================");
console.log("");
console.log("Ficheiro:");
console.log(OUT);
console.log("");
console.log("SHOPIFY NAO FOI ALTERADA.");
console.log("SUPABASE NAO FOI ALTERADO.");
