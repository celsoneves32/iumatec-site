import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_KEY =
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("Variaveis Supabase nao encontradas.");
}

const repairDir = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "shopify-id-repair"
);

function readArray(name) {
  const file = path.join(repairDir, name);

  if (!fs.existsSync(file)) {
    return [];
  }

  const value = JSON.parse(fs.readFileSync(file, "utf8"));

  return Array.isArray(value) ? value : [];
}

const unmatched = readArray("unmatched.json");
const ambiguous = readArray("ambiguous.json");

const invalidKeys = new Set();

for (const row of [...unmatched, ...ambiguous]) {
  const key = String(row?.catalogKey || "").trim();

  if (key) {
    invalidKeys.add(key);
  }
}

console.log("Unmatched rows :", unmatched.length);
console.log("Ambiguous rows :", ambiguous.length);
console.log("Invalid unique :", invalidKeys.size);

const rows = [];
const PAGE = 1000;

for (let from = 0; ; from += PAGE) {

  const to = from + PAGE - 1;

  const endpoint =
    `${SUPABASE_URL.replace(/\/$/, "")}` +
    `/rest/v1/products` +
    `?select=catalog_key,sku,ean,price,merchandise_id,shopify_variant_id` +
    `&order=catalog_key.asc`;

  const response = await fetch(endpoint, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Range: `${from}-${to}`,
      Prefer: "count=exact"
    }
  });

  if (!response.ok) {
    throw new Error(
      `Supabase HTTP ${response.status}: ${await response.text()}`
    );
  }

  const batch = await response.json();

  rows.push(...batch);

  console.log(
    `Supabase lidos: ${rows.length}`
  );

  if (batch.length < PAGE) {
    break;
  }
}

const byCatalogKey = new Map();

for (const row of rows) {

  const key = String(row.catalog_key || "").trim();

  if (key) {
    byCatalogKey.set(key, row);
  }
}

const found = [];
const missing = [];

for (const key of invalidKeys) {

  const product = byCatalogKey.get(key);

  if (product) {

    found.push({
      catalogKey: key,
      sku: product.sku || "",
      ean: product.ean || "",
      price: product.price ?? "",
      merchandiseId: product.merchandise_id || "",
      shopifyVariantId: product.shopify_variant_id || ""
    });

  } else {

    missing.push({
      catalogKey: key
    });
  }
}

console.log("");
console.log("===== RESULTADO =====");
console.log("Supabase total :", rows.length);
console.log("Invalid keys   :", invalidKeys.size);
console.log("Encontrados    :", found.length);
console.log("Ausentes       :", missing.length);
console.log(
  "Soma           :",
  found.length + missing.length
);

const outDir = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "shopify-price-reconcile"
);

fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(
  path.join(outDir, "invalid-488-found-supabase.json"),
  JSON.stringify(found, null, 2),
  "utf8"
);

fs.writeFileSync(
  path.join(outDir, "invalid-488-missing-supabase.json"),
  JSON.stringify(missing, null, 2),
  "utf8"
);

console.log("");
console.log("Relatorios criados.");
console.log("NADA FOI ALTERADO.");
