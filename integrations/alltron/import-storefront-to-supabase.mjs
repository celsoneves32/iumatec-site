import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.resolve(process.cwd(), "integrations/alltron/out");
const CATALOG_PATHS = [
  path.join(OUT_DIR, "iumatec-storefront-clean-1.json"),
  path.join(OUT_DIR, "iumatec-storefront-clean-2.json"),
];
const CHECKPOINT_PATH = path.join(
  OUT_DIR,
  "supabase-storefront-import-checkpoint.json",
);
const IMPORT_MODE = process.argv.includes("--import");
const EXPECTED_TOTAL = 52_248;
const MAX_ROWS_PER_BATCH = 75;
const MAX_BATCH_BYTES = 3_500_000;
const MAX_RETRIES = 7;

const SUPABASE_URL = String(process.env.SUPABASE_URL || "")
  .trim()
  .replace(/\/$/, "");
const SUPABASE_SECRET_KEY = String(
  process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "",
).trim();

function fail(message) {
  console.error(`\nERRO: ${message}`);
  process.exit(1);
}

function text(value) {
  return String(value ?? "").trim();
}

function nullableText(value) {
  return text(value) || null;
}

function number(value) {
  const parsed = Number(
    String(value ?? "").trim().replace(/\s/g, "").replace(",", "."),
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

function integer(value) {
  return Math.max(0, Math.trunc(number(value)));
}

function object(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function stringArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(text).filter(Boolean))];
}

function productImages(product) {
  return [
    product.image,
    ...(Array.isArray(product.images) ? product.images : []),
    ...(Array.isArray(product.imageUrls) ? product.imageUrls : []),
  ]
    .map(text)
    .filter(
      (url, index, all) =>
        /^https?:\/\//i.test(url) && all.indexOf(url) === index,
    );
}

function makeCatalogKey(product) {
  const litm = text(product.litm || product.alltronSku).toLowerCase();
  if (!litm) fail(`Produto sem litm: ${text(product.title) || "sem título"}`);
  return `litm:${litm}`;
}

function mapProduct(product) {
  const images = productImages(product);
  const stockQty = integer(
    product.stockQty ?? product.stock ?? product.quantity ?? 0,
  );

  return {
    catalog_key: makeCatalogKey(product),
    slug: nullableText(product.slug || product.shopifyProductHandle),
    litm: nullableText(product.litm || product.alltronSku),
    alltron_sku: nullableText(product.alltronSku || product.litm),
    sku: nullableText(product.sku),
    internal_number: nullableText(product.internalNumber),
    ean: nullableText(product.ean),
    title: text(product.title),
    title2: text(product.title2),
    full_title: text(product.fullTitle || product.title),
    brand: text(product.brand),
    description: text(product.description),
    description2: text(product.description2),
    category: text(product.category),
    subcategory: text(product.subcategory),
    raw_category: object(product.rawCategory),
    iumatec_category: object(product.iumatecCategory),
    price: number(product.price),
    original_price: number(product.originalPrice),
    purchase_cost_incl_vat: number(product.purchaseCostInclVat),
    minimum_safe_price: number(product.minimumSafePrice),
    price_safety_status: text(product.priceSafetyStatus),
    price_rule: text(product.priceRule),
    pack_unit_review_required: Boolean(product.packUnitReviewRequired),
    stock_qty: stockQty,
    in_stock: Boolean(product.inStock) || stockQty > 0,
    image: images[0] || "",
    images,
    merchandise_id: nullableText(product.merchandiseId),
    shopify_variant_id: nullableText(product.shopifyVariantId),
    shopify_product_id: nullableText(product.shopifyProductId),
    shopify_product_handle: nullableText(product.shopifyProductHandle),
    shopify_sync_status: nullableText(product.shopifySyncStatus),
    shopify_match_status: nullableText(product.shopifyMatchStatus),
    delivery_date: nullableText(product.deliveryDate),
    warranty_months: integer(product.warrantyMonths),
    weight: number(product.weight),
    vat: number(product.vat),
    ecpr: number(product.ecpr),
    expr: number(product.expr),
    inpr: number(product.inpr),
    sources: stringArray(product._sources || product.sources),
    raw_product: {},
    updated_at: new Date().toISOString(),
  };
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    else seen.add(value);
  }
  return duplicates;
}

function readCatalogs() {
  const parts = CATALOG_PATHS.map((catalogPath) => {
    if (!fs.existsSync(catalogPath)) {
      fail(`Ficheiro não encontrado: ${catalogPath}`);
    }
    const parsed = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
    if (!Array.isArray(parsed)) {
      fail(`${path.basename(catalogPath)} não contém uma lista JSON.`);
    }
    console.log(
      `${path.basename(catalogPath)}: ${parsed.length.toLocaleString("pt-PT")} produtos`,
    );
    return parsed;
  });
  return parts.flat();
}

function validate(products, rows) {
  if (products.length !== EXPECTED_TOTAL) {
    fail(
      `Esperados ${EXPECTED_TOTAL.toLocaleString("pt-PT")} produtos, encontrados ${products.length.toLocaleString("pt-PT")}.`,
    );
  }

  const missingSlugs = rows.filter((row) => !row.slug);
  const duplicateSlugs = findDuplicates(rows.map((row) => row.slug));
  const duplicateKeys = findDuplicates(rows.map((row) => row.catalog_key));
  const invalidPrices = rows.filter((row) => row.price <= 0);
  const missingImages = rows.filter((row) => !row.image);

  console.log("\n========== VALIDAÇÃO ==========");
  console.log(`Total: ${rows.length.toLocaleString("pt-PT")}`);
  console.log(`Sem slug: ${missingSlugs.length.toLocaleString("pt-PT")}`);
  console.log(`Slugs duplicados: ${duplicateSlugs.size.toLocaleString("pt-PT")}`);
  console.log(`catalog_key duplicados: ${duplicateKeys.size.toLocaleString("pt-PT")}`);
  console.log(`Preço inválido: ${invalidPrices.length.toLocaleString("pt-PT")}`);
  console.log(`Sem imagem: ${missingImages.length.toLocaleString("pt-PT")}`);
  console.log("===============================");

  if (missingSlugs.length || duplicateSlugs.size || duplicateKeys.size) {
    fail("A validação encontrou identificadores em falta ou duplicados.");
  }
}

function makeBatches(rows) {
  const batches = [];
  let current = [];
  let currentBytes = 2;
  for (const row of rows) {
    const rowBytes = Buffer.byteLength(JSON.stringify(row), "utf8") + 1;
    if (rowBytes > MAX_BATCH_BYTES) {
      fail(`Produto demasiado grande: ${row.catalog_key}`);
    }
    if (
      current.length &&
      (current.length >= MAX_ROWS_PER_BATCH ||
        currentBytes + rowBytes > MAX_BATCH_BYTES)
    ) {
      batches.push(current);
      current = [];
      currentBytes = 2;
    }
    current.push(row);
    currentBytes += rowBytes;
  }
  if (current.length) batches.push(current);
  return batches;
}

function headers(extra = {}) {
  const result = {
    apikey: SUPABASE_SECRET_KEY,
    "Content-Type": "application/json",
    ...extra,
  };
  if (SUPABASE_SECRET_KEY.startsWith("eyJ")) {
    result.Authorization = `Bearer ${SUPABASE_SECRET_KEY}`;
  }
  return result;
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function upsertBatch(batch, batchNumber, totalBatches) {
  const endpoint =
    `${SUPABASE_URL}/rest/v1/products` +
    "?on_conflict=catalog_key&columns=" +
    encodeURIComponent(Object.keys(batch[0]).join(","));
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: headers({
          Prefer: "resolution=merge-duplicates,return=minimal",
        }),
        body: JSON.stringify(batch),
      });
      if (response.ok) return;
      const body = await response.text();
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === MAX_RETRIES) {
        fail(
          `Bloco ${batchNumber}/${totalBatches} recusado (${response.status}): ${body}`,
        );
      }
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        fail(`Falha de rede no bloco ${batchNumber}: ${error.message}`);
      }
    }
    const delay = Math.min(30_000, 1_000 * 2 ** (attempt - 1));
    console.log(`Nova tentativa do bloco ${batchNumber} em ${delay / 1000}s...`);
    await wait(delay);
  }
}

async function exactRemoteCount() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/products?select=catalog_key&limit=1`,
    { headers: headers({ Prefer: "count=exact" }) },
  );
  if (!response.ok) return null;
  const match = (response.headers.get("content-range") || "").match(/\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

console.log("A ler as duas partes do catálogo vendável...");
const products = readCatalogs();
console.log("A preparar e validar os produtos...");
const rows = products.map(mapProduct);
validate(products, rows);

if (!IMPORT_MODE) {
  console.log("\nMODO DE VALIDAÇÃO: nenhum dado foi enviado ou apagado.");
  console.log("Aguarda o próximo passo antes de usar --import.");
  process.exit(0);
}

if (!SUPABASE_URL || !/^https:\/\/.+\.supabase\.co$/i.test(SUPABASE_URL)) {
  fail("Define SUPABASE_URL com o Project URL do Supabase.");
}
if (!SUPABASE_SECRET_KEY) {
  fail("Define SUPABASE_SECRET_KEY com a Secret key.");
}

const signature = CATALOG_PATHS.map((catalogPath) => {
  const stat = fs.statSync(catalogPath);
  return `${stat.size}:${Math.trunc(stat.mtimeMs)}`;
}).join("|");
const batches = makeBatches(rows);
let startBatch = 0;

if (fs.existsSync(CHECKPOINT_PATH)) {
  try {
    const checkpoint = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, "utf8"));
    if (
      checkpoint.catalogSignature === signature &&
      Number.isInteger(checkpoint.nextBatch) &&
      checkpoint.nextBatch >= 0 &&
      checkpoint.nextBatch <= batches.length
    ) {
      startBatch = checkpoint.nextBatch;
      if (startBatch) {
        console.log(`A retomar no bloco ${startBatch + 1}/${batches.length}.`);
      }
    }
  } catch {
    console.log("Checkpoint inválido ignorado.");
  }
}

let completedRows = batches
  .slice(0, startBatch)
  .reduce((sum, batch) => sum + batch.length, 0);
for (let index = startBatch; index < batches.length; index++) {
  await upsertBatch(batches[index], index + 1, batches.length);
  completedRows += batches[index].length;
  fs.writeFileSync(
    CHECKPOINT_PATH,
    JSON.stringify(
      {
        catalogSignature: signature,
        nextBatch: index + 1,
        totalBatches: batches.length,
        importedRows: completedRows,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  if ((index + 1) % 10 === 0 || index + 1 === batches.length) {
    const percent = ((completedRows / rows.length) * 100).toFixed(1);
    console.log(
      `Bloco ${index + 1}/${batches.length} — ${completedRows}/${rows.length} (${percent}%)`,
    );
  }
}

const remoteCount = await exactRemoteCount();
console.log("\n========== IMPORTAÇÃO CONCLUÍDA ==========");
console.log(`Produtos enviados: ${rows.length.toLocaleString("pt-PT")}`);
console.log(
  `Registos atuais no Supabase: ${remoteCount === null ? "não foi possível confirmar" : remoteCount.toLocaleString("pt-PT")}`,
);
console.log("A chave secreta não foi guardada em nenhum ficheiro.");
console.log("==========================================");
