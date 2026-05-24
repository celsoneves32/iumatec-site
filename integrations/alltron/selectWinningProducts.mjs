import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

const INPUT_PATH = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "out",
  "iumatec-catalog-live.json"
);

const OUTPUT_PATH = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "out",
  "winning-products.json"
);

// 🔥 palavras que queremos MESMO vender
const PRIORITY_KEYWORDS = [
  "iphone",
  "samsung galaxy",
  "ipad",
  "macbook",
  "laptop",
  "notebook",
  "lenovo",
  "hp",
  "dell",
  "acer",
  "monitor",
  "ssd",
  "router",
  "nas",
];

// ❌ lixo que não queremos
const BLOCKED = [
  "toner",
  "tinte",
  "patrone",
  "etikett",
  "papier",
  "kabel",
  "adapter",
  "case",
  "schutz",
  "cover",
  "folie",
  "halter",
  "mount",
  "toy",
  "spiel",
];

// normalizar texto
function normalize(text) {
  return (text || "").toLowerCase();
}

// score de produto
function scoreProduct(p) {
  let score = 0;
  const text = normalize(`${p.title} ${p.brand}`);

  // prioridade
  if (PRIORITY_KEYWORDS.some(k => text.includes(k))) score += 1000;

  // stock
  if (p.stockQty > 20) score += 300;
  else if (p.stockQty > 5) score += 200;
  else if (p.stockQty > 0) score += 100;

  // preço (sweet spot)
  if (p.price > 100 && p.price < 1500) score += 200;

  // imagem
  if (p.image) score += 150;

  // shopify válido
  if (p.merchandiseId) score += 500;

  return score;
}

// filtro principal
function isGoodProduct(p) {
  const text = normalize(`${p.title} ${p.brand}`);

  if (!p.merchandiseId) return false;
  if (!p.image) return false;
  if (!p.price || p.price <= 0) return false;

  if (BLOCKED.some(k => text.includes(k))) return false;

  return true;
}

// 🚀 MAIN
const raw = fs.readFileSync(INPUT_PATH, "utf-8");
const products = JSON.parse(raw);

console.log("Total:", products.length);

// filtrar
const filtered = products.filter(isGoodProduct);

// ordenar por score
const sorted = filtered
  .map(p => ({ ...p, _score: scoreProduct(p) }))
  .sort((a, b) => b._score - a._score);

// limitar (top produtos)
const final = sorted.slice(0, 200);

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(final, null, 2));

console.log("Selecionados:", final.length);
console.log("Guardado em:", OUTPUT_PATH);