const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const SOURCE = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "iumatec-master-candidates.json"
);

const PLAN = path.join(ROOT, "tmp-348-plan.json");

const TARGET = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "iumatec-348-candidates.json"
);

function readJson(file) {
  const raw = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

function norm(v) {
  return String(v ?? "").trim().toUpperCase();
}

console.log("");
console.log("===== CARREGAR =====");

const source = readJson(SOURCE);
const plan = readJson(PLAN);

console.log("Candidates origem:", source.length);
console.log("Plano:", plan.length);

if (!Array.isArray(source)) {
  throw new Error("SOURCE nao e array.");
}

if (!Array.isArray(plan) || plan.length !== 348) {
  throw new Error(`Plano invalido: ${plan.length}`);
}

// ----------------------------------------------------
// INDEXAR CANDIDATOS PELO SKU
// ----------------------------------------------------

const bySku = new Map();

for (const product of source) {
  const sku = norm(product.sku);

  if (!sku) continue;

  if (!bySku.has(sku)) {
    bySku.set(sku, []);
  }

  bySku.get(sku).push(product);
}

console.log("SKUs indexados:", bySku.size);

// ----------------------------------------------------
// RESOLVER OS 348
// ----------------------------------------------------

const selected = [];
const recoveredOldSku = [];
const missing = [];
const ambiguous = [];

for (const row of plan) {
  const litm = String(row.litm ?? "").trim();

  const currentSku =
    String(row.currentSku ?? "").trim() ||
    String(row.supabaseSku ?? "").trim();

  const oldSku = String(row.supabaseSku ?? "").trim();

  const currentMatches = bySku.get(norm(currentSku)) || [];

  if (currentMatches.length === 1) {
    selected.push(structuredClone(currentMatches[0]));
    continue;
  }

  if (currentMatches.length > 1) {
    ambiguous.push({
      litm,
      sku: currentSku,
      searched: "currentSku",
      matches: currentMatches.length
    });
    continue;
  }

  // SKU atual não existe no ficheiro antigo:
  // procurar pelo SKU anterior.
  const oldMatches = oldSku
    ? (bySku.get(norm(oldSku)) || [])
    : [];

  if (oldMatches.length === 1) {
    const product = structuredClone(oldMatches[0]);

    recoveredOldSku.push({
      litm,
      oldSku: product.sku,
      currentSku
    });

    product.sku = currentSku;

    selected.push(product);
    continue;
  }

  if (oldMatches.length > 1) {
    ambiguous.push({
      litm,
      sku: oldSku,
      searched: "supabaseSku",
      matches: oldMatches.length
    });
    continue;
  }

  missing.push({
    litm,
    oldSku,
    currentSku
  });
}

console.log("");
console.log("===== RESULTADO =====");
console.log("Selecionados       :", selected.length);
console.log("Via SKU antigo     :", recoveredOldSku.length);
console.log("Nao encontrados    :", missing.length);
console.log("Ambiguos           :", ambiguous.length);

if (recoveredOldSku.length) {
  console.log("");
  console.log("===== SKUs RECUPERADOS =====");
  console.table(recoveredOldSku);
}

if (missing.length) {
  console.log("");
  console.log("===== NAO ENCONTRADOS =====");
  console.table(missing);
}

if (ambiguous.length) {
  console.log("");
  console.log("===== AMBIGUOS =====");
  console.table(ambiguous);
}

if (
  selected.length !== 348 ||
  missing.length !== 0 ||
  ambiguous.length !== 0
) {
  throw new Error(
    `PARAR: selected=${selected.length}, missing=${missing.length}, ambiguous=${ambiguous.length}`
  );
}

// ----------------------------------------------------
// EVITAR DUPLICADOS
// ----------------------------------------------------

const finalSkus = selected.map(p => norm(p.sku));
const uniqueSkus = new Set(finalSkus);

console.log("SKUs finais unicos :", uniqueSkus.size);

if (uniqueSkus.size !== 348) {
  throw new Error("PARAR: existem SKUs duplicados no resultado.");
}

// ----------------------------------------------------
// BACKUP DO [] ATUAL
// ----------------------------------------------------

if (fs.existsSync(TARGET)) {
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  fs.copyFileSync(
    TARGET,
    `${TARGET}.empty-backup-${stamp}`
  );
}

// ----------------------------------------------------
// ESCREVER E RELER
// ----------------------------------------------------

fs.writeFileSync(
  TARGET,
  JSON.stringify(selected, null, 2),
  "utf8"
);

const verify = readJson(TARGET);

console.log("");
console.log("===== VALIDACAO FINAL =====");
console.log("Array:", Array.isArray(verify));
console.log("Count:", verify.length);
console.log("Primeiro SKU:", verify[0]?.sku ?? "");

if (!Array.isArray(verify) || verify.length !== 348) {
  throw new Error("VALIDACAO FINAL FALHOU.");
}

console.log("");
console.log("======================================");
console.log(" FICHEIRO 348 RECUPERADO COM SUCESSO");
console.log("======================================");
console.log("SHOPIFY NAO FOI ALTERADA.");
console.log("SUPABASE NAO FOI ALTERADO.");
