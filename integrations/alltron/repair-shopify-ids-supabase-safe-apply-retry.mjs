import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "integrations", "alltron", "out", "shopify-id-repair");
const APPLY = process.argv.includes("--apply");
const PAGE_SIZE = 1000;
const RPC_BATCH = 250;
const SHOPIFY_CHECKPOINT = path.join(OUT_DIR, "shopify-variants-checkpoint.json");
const MAX_NETWORK_RETRIES = 20;

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const pos = line.indexOf("=");
    if (pos < 1) continue;
    const key = line.slice(0, pos).trim();
    let value = line.slice(pos + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv(path.join(ROOT, ".env.local"));
loadEnv(path.join(ROOT, ".env"));

const SHOPIFY_DOMAIN = String(process.env.SHOPIFY_STORE_DOMAIN || process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || "").trim();
const SHOPIFY_TOKEN = String(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "").trim();
const SHOPIFY_VERSION = String(process.env.SHOPIFY_ADMIN_API_VERSION || process.env.SHOPIFY_API_VERSION || "2025-04").trim();
const SUPABASE_URL = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/$/, "");
const SUPABASE_KEY = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

function fail(message) { console.error(`\nERRO: ${message}`); process.exit(1); }
function text(value) { return String(value ?? "").trim(); }
function norm(value) { return text(value).toUpperCase().replace(/\s+/g, " "); }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function writeJson(name, value) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, name), JSON.stringify(value, null, 2), "utf8");
}

if (!SHOPIFY_DOMAIN) fail("Falta SHOPIFY_STORE_DOMAIN.");
if (!SHOPIFY_TOKEN) fail("Falta SHOPIFY_ADMIN_ACCESS_TOKEN.");
if (!SUPABASE_URL) fail("Falta SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL.");
if (!SUPABASE_KEY) fail("Falta SUPABASE_SECRET_KEY (Secret key do Supabase).");

async function shopifyGraphql(query, variables, attempt = 1) {
  let response;
  try {
    response = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_VERSION}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": SHOPIFY_TOKEN },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(60000),
    });
  } catch (error) {
    if (attempt <= MAX_NETWORK_RETRIES) {
      const delay = Math.min(60000, 2000 * 2 ** Math.min(attempt - 1, 5));
      console.log(`Shopify: ligação falhou; nova tentativa ${attempt}/${MAX_NETWORK_RETRIES} em ${Math.round(delay / 1000)}s...`);
      await sleep(delay);
      return shopifyGraphql(query, variables, attempt + 1);
    }
    throw error;
  }
  const body = await response.text();
  let json;
  try { json = JSON.parse(body); } catch { fail(`Shopify devolveu resposta inválida (${response.status}).`); }
  const throttled = response.status === 429 || json?.errors?.some((e) => e?.extensions?.code === "THROTTLED");
  if (throttled && attempt <= 8) {
    await sleep(Math.min(30000, 1000 * 2 ** (attempt - 1)));
    return shopifyGraphql(query, variables, attempt + 1);
  }
  if (!response.ok || json?.errors?.length) fail(`Shopify: ${body.slice(0, 1500)}`);
  return json.data;
}

const SHOPIFY_QUERY = `
  query ProductsForRepair($after: String) {
    products(first: 100, after: $after, sortKey: ID) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id handle title
        variants(first: 100) { nodes { id sku barcode title } }
      }
    }
  }
`;

async function fetchShopifyVariants() {
  let rows = [];
  let after = null;
  let page = 0;
  if (fs.existsSync(SHOPIFY_CHECKPOINT)) {
    try {
      const saved = JSON.parse(fs.readFileSync(SHOPIFY_CHECKPOINT, "utf8"));
      if (saved?.domain === SHOPIFY_DOMAIN && saved?.version === SHOPIFY_VERSION && Array.isArray(saved?.rows)) {
        rows = saved.rows;
        after = saved.after || null;
        page = Number(saved.page) || 0;
        console.log(`Shopify: retomando checkpoint na página ${page}, com ${rows.length.toLocaleString("pt-PT")} variantes já lidas`);
      }
    } catch {
      console.log("Shopify: checkpoint inválido; a leitura começará do início.");
    }
  }
  while (true) {
    const data = await shopifyGraphql(SHOPIFY_QUERY, { after });
    const connection = data?.products;
    if (!connection) fail("Shopify não devolveu products.");
    for (const product of connection.nodes || []) {
      for (const variant of product.variants?.nodes || []) {
        rows.push({
          productId: product.id,
          productHandle: product.handle,
          productTitle: product.title,
          variantId: variant.id,
          variantTitle: variant.title,
          sku: text(variant.sku),
          barcode: text(variant.barcode),
        });
      }
    }
    page += 1;
    console.log(`Shopify: página ${page}, ${rows.length.toLocaleString("pt-PT")} variantes lidas`);
    if (!connection.pageInfo?.hasNextPage) {
      if (fs.existsSync(SHOPIFY_CHECKPOINT)) fs.unlinkSync(SHOPIFY_CHECKPOINT);
      break;
    }
    after = connection.pageInfo.endCursor;
    if (page % 25 === 0) {
      fs.mkdirSync(OUT_DIR, { recursive: true });
      const temporary = `${SHOPIFY_CHECKPOINT}.tmp`;
      fs.writeFileSync(temporary, JSON.stringify({ domain: SHOPIFY_DOMAIN, version: SHOPIFY_VERSION, page, after, rows }), "utf8");
      fs.renameSync(temporary, SHOPIFY_CHECKPOINT);
    }
  }
  return rows;
}

function supabaseHeaders(extra = {}) {
  return { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", ...extra };
}

async function fetchSupabaseProducts() {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const url = `${SUPABASE_URL}/rest/v1/products?select=catalog_key,sku,ean,merchandise_id,shopify_variant_id,shopify_product_id,shopify_product_handle&order=catalog_key.asc`;
    const response = await fetch(url, { headers: supabaseHeaders({ Range: `${from}-${to}`, Prefer: "count=exact" }) });
    if (!response.ok) fail(`Supabase (${response.status}): ${(await response.text()).slice(0, 1500)}`);
    const batch = await response.json();
    rows.push(...batch);
    console.log(`Supabase: ${rows.length.toLocaleString("pt-PT")} produtos lidos`);
    if (batch.length < PAGE_SIZE) break;
  }
  return rows;
}

function add(map, key, row) {
  if (!key) return;
  const list = map.get(key) || [];
  list.push(row);
  map.set(key, list);
}

function uniqueByVariant(rows) {
  return [...new Map(rows.map((row) => [row.variantId, row])).values()];
}

function buildRepair(catalog, variants) {
  const bySku = new Map();
  const byBarcode = new Map();
  for (const variant of variants) {
    add(bySku, norm(variant.sku), variant);
    add(byBarcode, norm(variant.barcode), variant);
  }

  const updates = [];
  const unchanged = [];
  const unmatched = [];
  const ambiguous = [];

  for (const product of catalog) {
    const skuMatches = uniqueByVariant(bySku.get(norm(product.sku)) || []);
    const eanMatches = uniqueByVariant(byBarcode.get(norm(product.ean)) || []);
    let match = null;
    let method = "";

    if (skuMatches.length === 1) {
      match = skuMatches[0];
      method = "unique-sku";
    } else if (skuMatches.length > 1 && eanMatches.length) {
      const eanIds = new Set(eanMatches.map((x) => x.variantId));
      const intersection = skuMatches.filter((x) => eanIds.has(x.variantId));
      if (intersection.length === 1) { match = intersection[0]; method = "sku+ean"; }
    } else if (!skuMatches.length && eanMatches.length === 1) {
      match = eanMatches[0];
      method = "unique-ean";
    }

    if (!match) {
      const item = { catalogKey: product.catalog_key, sku: product.sku, ean: product.ean };
      if (skuMatches.length > 1 || eanMatches.length > 1) ambiguous.push({ ...item, skuMatches: skuMatches.length, eanMatches: eanMatches.length });
      else unmatched.push(item);
      continue;
    }

    const next = {
      catalog_key: product.catalog_key,
      merchandise_id: match.variantId,
      shopify_variant_id: match.variantId,
      shopify_product_id: match.productId,
      shopify_product_handle: match.productHandle,
      shopify_sync_status: "reconciled",
    };
    const same = product.merchandise_id === next.merchandise_id &&
      product.shopify_variant_id === next.shopify_variant_id &&
      product.shopify_product_id === next.shopify_product_id &&
      product.shopify_product_handle === next.shopify_product_handle;
    const detail = { ...next, old_merchandise_id: product.merchandise_id, sku: product.sku, method };
    (same ? unchanged : updates).push(detail);
  }
  return { updates, unchanged, unmatched, ambiguous };
}

async function applyBatch(rows, number, total) {
  const payload = rows.map(({ old_merchandise_id, sku, method, ...row }) => row);
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/apply_shopify_id_repairs`, {
    method: "POST", headers: supabaseHeaders(), body: JSON.stringify({ p_repairs: payload }),
  });
  if (!response.ok) fail(`Aplicação do lote ${number}/${total} falhou (${response.status}): ${(await response.text()).slice(0, 1500)}`);
  const result = await response.json();
  console.log(`Aplicado lote ${number}/${total}: ${result} produtos`);
}

async function main() {
  console.log(`\nModo: ${APPLY ? "APLICAR ALTERAÇÕES" : "AUDITORIA (não altera dados)"}`);
  const [variants, catalog] = await Promise.all([fetchShopifyVariants(), fetchSupabaseProducts()]);
  const result = buildRepair(catalog, variants);
  const summary = {
    generatedAt: new Date().toISOString(), mode: APPLY ? "apply" : "audit",
    shopifyVariants: variants.length, supabaseProducts: catalog.length,
    toRepair: result.updates.length, alreadyCorrect: result.unchanged.length,
    unmatched: result.unmatched.length, ambiguous: result.ambiguous.length,
  };
  writeJson("summary.json", summary);
  writeJson("updates-preview.json", result.updates);
  writeJson("unmatched.json", result.unmatched);
  writeJson("ambiguous.json", result.ambiguous);
  console.log("\n========== RESULTADO ==========");
  for (const [key, value] of Object.entries(summary)) console.log(`${key}: ${value}`);
  console.log(`Relatórios: ${OUT_DIR}`);

  if (!APPLY) {
    console.log("\nNada foi alterado. Depois de rever a auditoria, execute novamente com --apply.");
    return;
  }
  if (result.ambiguous.length) {
    console.log(`\nATENÇÃO: ${result.ambiguous.length} correspondências ambíguas serão ignoradas e permanecerão inalteradas.`);
  }
  const batches = [];
  for (let i = 0; i < result.updates.length; i += RPC_BATCH) batches.push(result.updates.slice(i, i + RPC_BATCH));
  for (let i = 0; i < batches.length; i += 1) await applyBatch(batches[i], i + 1, batches.length);
  console.log(`\nCONCLUÍDO: ${result.updates.length.toLocaleString("pt-PT")} identificadores reparados.`);
}

main().catch((error) => { console.error(error instanceof Error ? error.stack : error); process.exit(1); });
