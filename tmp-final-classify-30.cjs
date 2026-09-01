const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const LOOKUP = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "shopify-price-reconcile",
  "invalid-variant-shopify-lookup.json"
);

const MASTER = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "iumatec-master-catalog.json"
);

function text(v) {
  return String(v ?? "").trim();
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getStock(p) {
  return num(
    p.stock ??
    p.quantity ??
    p.inventory ??
    p.available ??
    0
  );
}

function getPrice(p) {
  return num(
    p.price ??
    p.ecpr ??
    p.protectedPrice ??
    p.sellingPrice ??
    0
  );
}

function getLitm(p) {
  return text(
    p.litm ??
    p.internalNumber ??
    p.merchandiseId ??
    ""
  );
}

const lookup = JSON.parse(
  fs.readFileSync(LOOKUP, "utf8").replace(/^\uFEFF/, "")
);

const master = JSON.parse(
  fs.readFileSync(MASTER, "utf8").replace(/^\uFEFF/, "")
);

if (!Array.isArray(master)) {
  throw new Error("Master nao e array.");
}

const targets = Array.isArray(lookup.results)
  ? lookup.results
  : [];

const bySku = new Map();
const byEan = new Map();

for (const p of master) {
  const sku = text(p.sku).toUpperCase();
  const ean = text(p.ean);

  if (sku) {
    if (!bySku.has(sku)) bySku.set(sku, []);
    bySku.get(sku).push(p);
  }

  if (ean) {
    if (!byEan.has(ean)) byEan.set(ean, []);
    byEan.get(ean).push(p);
  }
}

const result = [];

for (const t of targets) {
  const sku = text(t.sku);
  const ean = text(t.ean);

  const candidates = [
    ...(sku ? bySku.get(sku.toUpperCase()) || [] : []),
    ...(ean ? byEan.get(ean) || [] : [])
  ];

  const unique = [
    ...new Map(
      candidates.map(p => [
        `${getLitm(p)}|${text(p.sku)}|${text(p.ean)}`,
        p
      ])
    ).values()
  ];

  if (!unique.length) {
    result.push({
      sku,
      ean,
      masterMatches: 0,
      litm: "",
      stock: 0,
      price: 0,
      sellable: false,
      decision: "ORFAO_REMOVER_SUPABASE"
    });

    continue;
  }

  const best = unique
    .slice()
    .sort((a, b) => {
      const aGood = getStock(a) > 0 && getPrice(a) > 0 ? 1 : 0;
      const bGood = getStock(b) > 0 && getPrice(b) > 0 ? 1 : 0;
      return bGood - aGood;
    })[0];

  const stock = getStock(best);
  const price = getPrice(best);

  const sellable =
    stock > 0 &&
    price > 0;

  result.push({
    sku,
    ean,
    masterMatches: unique.length,
    litm: getLitm(best),
    stock,
    price,
    sellable,
    decision: sellable
      ? "CRIAR_NA_SHOPIFY"
      : "ORFAO_REMOVER_SUPABASE"
  });
}

const create = result.filter(
  r => r.decision === "CRIAR_NA_SHOPIFY"
);

const orphan = result.filter(
  r => r.decision === "ORFAO_REMOVER_SUPABASE"
);

console.log("");
console.log("==============================================");
console.log(" CLASSIFICACAO FINAL DOS 30");
console.log("==============================================");
console.log("");
console.log("Produtos analisados :", result.length);
console.log("Criar na Shopify    :", create.length);
console.log("Orfaos / remover    :", orphan.length);
console.log("");

console.table(result);

const OUT = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "shopify-price-reconcile",
  "invalid-final-classification.json"
);

fs.writeFileSync(
  OUT,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      counts: {
        total: result.length,
        createShopify: create.length,
        orphanSupabase: orphan.length
      },
      result
    },
    null,
    2
  ),
  "utf8"
);

console.log("");
console.log("Relatorio:", OUT);
console.log("");
console.log("NADA FOI ALTERADO.");
