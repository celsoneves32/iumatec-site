import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MASTER = path.resolve(ROOT, "integrations/alltron/out/iumatec-master-catalog.json");
const OUT_DIR = path.resolve(ROOT, "integrations/alltron/out");
const AUDIT_JSON = path.join(OUT_DIR, "iumatec-pro-catalog-audit.json");
const ICECAT_CSV = path.join(OUT_DIR, "icecat-enrichment-input.csv");
const TARGET_IMAGES = Math.max(2, Number(process.env.TARGET_IMAGES || 6));

function text(value) {
  return String(value ?? "").trim();
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function images(product) {
  return [...new Set([
    product?.image,
    ...(Array.isArray(product?.images) ? product.images : []),
    ...(Array.isArray(product?.imageUrls) ? product.imageUrls : []),
  ].map(text).filter((url) => /^https?:\/\//i.test(url)))];
}

function category(product) {
  const main = text(product?.category || product?.iumatecCategory?.main || product?.rawCategory?.cat1 || "Ohne Kategorie");
  const sub = text(product?.subcategory || product?.iumatecCategory?.sub || product?.rawCategory?.cat2 || "Ohne Unterkategorie");
  return { main, sub };
}

function add(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function csv(value) {
  const s = text(value);
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

if (!fs.existsSync(MASTER)) {
  console.error(`ERRO: catálogo não encontrado: ${MASTER}`);
  process.exit(1);
}

console.log("A analisar catálogo mestre...");
const products = JSON.parse(fs.readFileSync(MASTER, "utf8"));
if (!Array.isArray(products)) throw new Error("O catálogo mestre não é um array JSON.");

const categoryCounts = new Map();
const subcategoryCounts = new Map();
const imageBuckets = { zero: 0, one: 0, two: 0, threeToFive: 0, sixPlus: 0 };
let sellable = 0;
let enrichmentCandidates = 0;
let identifiableCandidates = 0;
const rows = [];

for (const product of products) {
  const { main, sub } = category(product);
  add(categoryCounts, main);
  add(subcategoryCounts, `${main} > ${sub}`);

  const img = images(product);
  if (img.length === 0) imageBuckets.zero++;
  else if (img.length === 1) imageBuckets.one++;
  else if (img.length === 2) imageBuckets.two++;
  else if (img.length <= 5) imageBuckets.threeToFive++;
  else imageBuckets.sixPlus++;

  const stock = num(product.stockQty ?? product.stock);
  const price = num(product.price);
  const isSellable = price > 0 && stock > 0;
  if (isSellable) sellable++;

  if (!isSellable || img.length >= TARGET_IMAGES) continue;
  enrichmentCandidates++;

  const ean = text(product.ean).replace(/\D/g, "");
  const brand = text(product.brand);
  const mpn = text(product.internalNumber || product.mpn || product.manufacturerPartNumber);
  if (!(ean.length >= 8 || (brand && mpn))) continue;
  identifiableCandidates++;

  rows.push({
    litm: text(product.litm || product.alltronSku),
    sku: text(product.sku),
    ean,
    brand,
    mpn,
    title: text(product.fullTitle || product.title),
    category: main,
    subcategory: sub,
    currentImageCount: img.length,
    targetImageCount: TARGET_IMAGES,
  });
}

const sortMap = (map) => [...map.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([name, count]) => ({ name, count }));

const audit = {
  generatedAt: new Date().toISOString(),
  masterFile: MASTER,
  totalProducts: products.length,
  sellableProducts: sellable,
  targetImagesPerProduct: TARGET_IMAGES,
  imageBuckets,
  enrichmentCandidates,
  identifiableEnrichmentCandidates: identifiableCandidates,
  categories: sortMap(categoryCounts),
  subcategories: sortMap(subcategoryCounts),
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(AUDIT_JSON, JSON.stringify(audit, null, 2), "utf8");

const header = [
  "litm", "sku", "ean", "brand", "mpn", "title", "category", "subcategory",
  "currentImageCount", "targetImageCount",
];
const csvLines = [header.join(";")];
for (const row of rows) {
  csvLines.push(header.map((key) => csv(row[key])).join(";"));
}
fs.writeFileSync(ICECAT_CSV, csvLines.join("\n") + "\n", "utf8");

console.log("");
console.log("========== IUMATEC PRO CATALOG AUDIT ==========");
console.log(`Produtos totais: ${products.length.toLocaleString("pt-PT")}`);
console.log(`Vendáveis (stock + preço): ${sellable.toLocaleString("pt-PT")}`);
console.log(`0 imagens: ${imageBuckets.zero.toLocaleString("pt-PT")}`);
console.log(`1 imagem: ${imageBuckets.one.toLocaleString("pt-PT")}`);
console.log(`2 imagens: ${imageBuckets.two.toLocaleString("pt-PT")}`);
console.log(`3-5 imagens: ${imageBuckets.threeToFive.toLocaleString("pt-PT")}`);
console.log(`6+ imagens: ${imageBuckets.sixPlus.toLocaleString("pt-PT")}`);
console.log(`Candidatos a enriquecimento (< ${TARGET_IMAGES} imagens): ${enrichmentCandidates.toLocaleString("pt-PT")}`);
console.log(`Candidatos com EAN ou Brand+MPN: ${identifiableCandidates.toLocaleString("pt-PT")}`);
console.log("");
console.log("Top 15 categorias atuais:");
for (const item of audit.categories.slice(0, 15)) {
  console.log(`- ${item.name}: ${item.count.toLocaleString("pt-PT")}`);
}
console.log("");
console.log(`Audit JSON: ${AUDIT_JSON}`);
console.log(`Icecat input CSV: ${ICECAT_CSV}`);
console.log("================================================");
