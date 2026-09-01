import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const CATALOG_PATH = path.resolve(
  process.cwd(),
  "integrations/alltron/out/iumatec-master-catalog.json",
);
const CHECKPOINT_PATH = path.resolve(
  process.cwd(),
  "integrations/alltron/out/supabase-products-import-checkpoint.json",
);

const SUPABASE_URL = String(process.env.SUPABASE_URL || "")
  .trim()
  .replace(/\/$/, "");
const SUPABASE_SECRET_KEY = String(
  process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "",
).trim();

const MAX_ROWS_PER_BATCH = 75;
const MAX_BATCH_BYTES = 3_500_000;
const MAX_RETRIES = 7;

function fail(message) {
  console.error(`\nERRO: ${message}`);
  process.exit(1);
}

function text(value) {
  return String(value ?? "").trim();
}

function nullableText(value) {
  const result = text(value);
  return result || null;
}

function number(value) {
  const parsed = Number(
    String(value ?? "")
      .trim()
      .replace(/\s/g, "")
      .replace(",", "."),
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
    .filter((url, index, all) =>
      /^https?:\/\//i.test(url) && all.indexOf(url) === index,
    );
}

function makeCatalogKey(product, index) {
  const candidates = [
    ["litm", product.litm || product.alltronSku],
    ["ean", product.ean],
    ["internal", product.internalNumber],
    ["sku", product.sku],
    ["slug", product.slug || product.shopifyProductHandle],
  ];

  for (const [prefix, rawValue] of candidates) {
    const value = text(rawValue).toLowerCase();
    if (value) return `${prefix}:${value}`;
  }

  const fallback = JSON.stringify({
    title: text(product.fullTitle || product.title),
    brand: text(product.brand),
    index,
  });
  return `generated:${crypto.createHash("sha256").update(fallback).digest("hex")}`;
}

function mapProduct(product, index) {
  const images = productImages(product);
  const stockQty = integer(
    product.stockQty ?? product.stock ?? product.quantity ?? 0,
  );

  return {
    catalog_key: makeCatalogKey(product, index),
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

    // O catálogo local de 379 MB continua a ser o arquivo integral. Duplicá-lo
    // aqui faria o projeto Free aproximar-se perigosamente do limite de 500 MB.
    raw_product: {},
    updated_at: new Date().toISOString(),
  };
}

function makeBatches(rows) {
  const batches = [];
  let current = [];
  let currentBytes = 2;

  for (const row of rows) {
    const rowBytes = Buffer.byteLength(JSON.stringify(row), "utf8") + 1;
    if (rowBytes > MAX_BATCH_BYTES) {
      fail(`Um produto isolado excede ${MAX_BATCH_BYTES} bytes: ${row.catalog_key}`);
    }

    if (
      current.length > 0 &&
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
  const base = {
    apikey: SUPABASE_SECRET_KEY,
    "Content-Type": "application/json",
    ...extra,
  };

  // As chaves legacy service_role são JWT. As novas sb_secret_* funcionam
  // diretamente no cabeçalho apikey e não devem ser expostas no navegador.
  if (SUPABASE_SECRET_KEY.startsWith("eyJ")) {
    base.Authorization = `Bearer ${SUPABASE_SECRET_KEY}`;
  }

  return base;
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
    {
      headers: headers({ Prefer: "count=exact" }),
    },
  );

  if (!response.ok) return null;
  const range = response.headers.get("content-range") || "";
  const match = range.match(/\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

if (!SUPABASE_URL || !/^https:\/\/.+\.supabase\.co$/i.test(SUPABASE_URL)) {
  fail("Define SUPABASE_URL com o Project URL do Supabase.");
}

if (!SUPABASE_SECRET_KEY) {
  fail("Define SUPABASE_SECRET_KEY com uma Secret key ou service_role key.");
}

if (!fs.existsSync(CATALOG_PATH)) {
  fail(`Catálogo não encontrado em: ${CATALOG_PATH}`);
}

const stat = fs.statSync(CATALOG_PATH);
const signature = `${stat.size}:${Math.trunc(stat.mtimeMs)}`;

console.log("A ler o catálogo mestre...");
const parsed = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
if (!Array.isArray(parsed)) fail("O catálogo mestre não contém uma lista JSON.");

console.log(`Produtos encontrados: ${parsed.length.toLocaleString("pt-PT")}`);
console.log("A preparar os campos para a base de dados...");
const rows = parsed.map(mapProduct);
const uniqueKeys = new Set(rows.map((row) => row.catalog_key));
if (uniqueKeys.size !== rows.length) {
  fail(
    `Foram encontradas ${rows.length - uniqueKeys.size} chaves catalog_key duplicadas.`,
  );
}

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
      if (startBatch > 0) {
        console.log(`A retomar no bloco ${startBatch + 1}/${batches.length}.`);
      }
    }
  } catch {
    console.log("Checkpoint inválido ignorado; a importação começa do início.");
  }
}

for (let index = startBatch; index < batches.length; index++) {
  await upsertBatch(batches[index], index + 1, batches.length);

  fs.writeFileSync(
    CHECKPOINT_PATH,
    JSON.stringify(
      {
        catalogSignature: signature,
        nextBatch: index + 1,
        totalBatches: batches.length,
        importedRows: batches
          .slice(0, index + 1)
          .reduce((sum, batch) => sum + batch.length, 0),
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  if ((index + 1) % 10 === 0 || index + 1 === batches.length) {
    const completedRows = batches
      .slice(0, index + 1)
      .reduce((sum, batch) => sum + batch.length, 0);
    const percent = ((completedRows / rows.length) * 100).toFixed(1);
    console.log(
      `Bloco ${index + 1}/${batches.length} — ${completedRows}/${rows.length} (${percent}%)`,
    );
  }
}

const remoteCount = await exactRemoteCount();
console.log("\n========== IMPORTAÇÃO CONCLUÍDA ==========");
console.log(`Produtos do catálogo local: ${rows.length}`);
console.log(
  `Registos atuais no Supabase: ${remoteCount === null ? "não foi possível confirmar" : remoteCount}`,
);
console.log(`Checkpoint: ${CHECKPOINT_PATH}`);
console.log("A chave secreta não foi guardada em nenhum ficheiro.");
console.log("==========================================");

