import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ARGS = process.argv.slice(2);
const APPLY = ARGS.includes("--apply");
const ONLY_LAST_ACTIVATION = ARGS.includes("--only-last-activation");
const HELP = ARGS.includes("--help") || ARGS.includes("-h");
const PAGE_SIZE = 1000;
const SHOPIFY_BATCH_SIZE = 100;
const MAX_APPLY_LIMIT = 1000;
const PRICE_TOLERANCE = 0.009;
const OUT_DIR = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "shopify-price-reconcile",
);
const ACTIVATION_RESULTS = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "shopify-activation",
  "apply-results.json",
);
const REPAIR_DIR = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "shopify-id-repair",
);

function argValue(name) {
  const prefix = `${name}=`;
  const found = ARGS.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length).trim() : "";
}

function fail(message) {
  console.error(`\nERRO: ${message}`);
  process.exit(1);
}

function showHelp() {
  console.log(`
IUMATEC — reconciliação segura de preços Supabase -> Shopify

Auditar apenas os produtos do último teste de ativação:
  node scripts/reconcile-shopify-prices-from-supabase.mjs --only-last-activation

Corrigir um lote explicitamente limitado:
  node scripts/reconcile-shopify-prices-from-supabase.mjs --only-last-activation --apply --limit=25

Auditar todo o catálogo (não altera nada):
  node scripts/reconcile-shopify-prices-from-supabase.mjs

Proteções:
  - o preço exibido no Supabase é a fonte de verdade;
  - exclui os relatórios unmatched e ambiguous;
  - recusa preços ausentes, zero ou ambíguos;
  - --apply exige --limit entre 1 e ${MAX_APPLY_LIMIT};
  - não altera stock, estado, publicação nem elimina produtos.
`);
}

if (HELP) {
  showHelp();
  process.exit(0);
}

const rawLimit = argValue("--limit");
const APPLY_LIMIT = rawLimit ? Number(rawLimit) : 0;
if (APPLY) {
  if (!Number.isInteger(APPLY_LIMIT) || APPLY_LIMIT < 1) {
    fail("--apply exige um limite explícito, por exemplo --limit=25.");
  }
  if (APPLY_LIMIT > MAX_APPLY_LIMIT) {
    fail(`O limite máximo por execução é ${MAX_APPLY_LIMIT}.`);
  }
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const raw of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const pos = line.indexOf("=");
    if (pos < 1) continue;
    const key = line.slice(0, pos).trim();
    let value = line.slice(pos + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv(path.join(ROOT, ".env.local"));
loadEnv(path.join(ROOT, ".env"));

const SHOPIFY_DOMAIN = String(
  process.env.SHOPIFY_STORE_DOMAIN ||
    process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ||
    "",
)
  .trim()
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");
const SHOPIFY_TOKEN = String(
  process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "",
).trim();
const SHOPIFY_VERSION = String(
  process.env.SHOPIFY_ADMIN_API_VERSION ||
    process.env.SHOPIFY_API_VERSION ||
    "2026-07",
).trim();
const SUPABASE_URL = String(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
)
  .trim()
  .replace(/\/$/, "");
const SUPABASE_KEY = String(
  process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "",
).trim();

if (!SHOPIFY_DOMAIN) fail("Falta SHOPIFY_STORE_DOMAIN.");
if (!SHOPIFY_TOKEN) fail("Falta SHOPIFY_ADMIN_ACCESS_TOKEN.");
if (!SUPABASE_URL) fail("Falta SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL.");
if (!SUPABASE_KEY) {
  fail("Falta SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY.");
}

function text(value) {
  return String(value ?? "").trim();
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return Number(number(value).toFixed(2));
}

function variantGid(value) {
  const clean = text(value);
  if (/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(clean)) return clean;
  const numeric = clean.match(/(\d+)$/)?.[1] || "";
  return numeric ? `gid://shopify/ProductVariant/${numeric}` : "";
}

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) fail(`${label} não encontrado: ${filePath}`);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`${label} contém JSON inválido: ${error.message}`);
  }
}

function writeJson(name, value) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, name),
    JSON.stringify(value, null, 2),
    "utf8",
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function fetchSupabaseProducts() {
  const rows = [];
  const select = [
    "catalog_key",
    "sku",
    "ean",
    "price",
    "merchandise_id",
    "shopify_variant_id",
  ].join(",");

  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const url =
      `${SUPABASE_URL}/rest/v1/products?select=${select}` +
      "&order=catalog_key.asc";
    const response = await fetch(url, {
      headers: supabaseHeaders({
        Range: `${from}-${to}`,
        Prefer: "count=exact",
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) {
      fail(
        `Supabase (${response.status}): ${(await response.text()).slice(0, 1200)}`,
      );
    }
    const batch = await response.json();
    rows.push(...batch);
    console.log(`Supabase: ${rows.length.toLocaleString("pt-PT")} produtos lidos`);
    if (batch.length < PAGE_SIZE) break;
  }
  return rows;
}

async function shopifyGraphql(query, variables = {}, attempt = 1) {
  let response;
  try {
    response = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": SHOPIFY_TOKEN,
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(60000),
      },
    );
  } catch (error) {
    if (attempt <= 8) {
      const delay = Math.min(30000, 1000 * 2 ** (attempt - 1));
      console.log(`Shopify: ligação falhou; nova tentativa em ${delay / 1000}s...`);
      await sleep(delay);
      return shopifyGraphql(query, variables, attempt + 1);
    }
    throw error;
  }

  const body = await response.text();
  let json;
  try {
    json = JSON.parse(body);
  } catch {
    fail(`Shopify devolveu resposta inválida (${response.status}).`);
  }

  const throttled =
    response.status === 429 ||
    json?.errors?.some((error) => error?.extensions?.code === "THROTTLED");
  if (throttled && attempt <= 8) {
    const delay = Math.min(30000, 1000 * 2 ** (attempt - 1));
    console.log(`Shopify: limite temporário; nova tentativa em ${delay / 1000}s...`);
    await sleep(delay);
    return shopifyGraphql(query, variables, attempt + 1);
  }

  if (!response.ok || json?.errors?.length) {
    fail(`Shopify (${response.status}): ${body.slice(0, 1500)}`);
  }

  return json.data;
}

const VARIANTS_QUERY = `
  query PriceReconcileCandidates($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        price
        sku
        product { id title handle status }
      }
    }
  }
`;

async function fetchShopifyVariants(ids) {
  const rows = [];
  for (let index = 0; index < ids.length; index += SHOPIFY_BATCH_SIZE) {
    const batch = ids.slice(index, index + SHOPIFY_BATCH_SIZE);
    const data = await shopifyGraphql(VARIANTS_QUERY, { ids: batch });
    rows.push(...(data?.nodes || []));
    console.log(
      `Shopify: ${Math.min(index + batch.length, ids.length).toLocaleString("pt-PT")}/${ids.length.toLocaleString("pt-PT")} variantes verificadas`,
    );
  }
  return rows;
}

const UPDATE_PRICE_MUTATION = `
  mutation ReconcileVariantPrice(
    $productId: ID!
    $variants: [ProductVariantsBulkInput!]!
  ) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants { id price }
      userErrors { field message }
    }
  }
`;

async function updateVariantPrice(row) {
  const data = await shopifyGraphql(UPDATE_PRICE_MUTATION, {
    productId: row.productId,
    variants: [{ id: row.variantId, price: row.supabasePrice.toFixed(2) }],
  });
  const errors = data?.productVariantsBulkUpdate?.userErrors || [];
  if (errors.length) throw new Error(JSON.stringify(errors));
  const updated = data?.productVariantsBulkUpdate?.productVariants?.[0];
  if (!updated || Math.abs(number(updated.price) - row.supabasePrice) > PRICE_TOLERANCE) {
    throw new Error("A Shopify não confirmou o preço esperado.");
  }
  return money(updated.price);
}

function loadInvalidCatalogKeys() {
  const keys = new Set();
  for (const name of ["unmatched.json", "ambiguous.json"]) {
    const filePath = path.join(REPAIR_DIR, name);
    if (!fs.existsSync(filePath)) continue;
    const rows = readJson(filePath, name);
    if (!Array.isArray(rows)) fail(`${name} não contém uma lista.`);
    for (const row of rows) {
      const key = text(row?.catalogKey);
      if (key) keys.add(key);
    }
  }
  return keys;
}

function loadLastActivationVariantIds() {
  if (!ONLY_LAST_ACTIVATION) return null;
  const rows = readJson(ACTIVATION_RESULTS, "apply-results.json");
  if (!Array.isArray(rows) || !rows.length) {
    fail("apply-results.json não contém o último lote de ativação.");
  }
  if (rows.length > MAX_APPLY_LIMIT) {
    fail(`O último lote contém mais de ${MAX_APPLY_LIMIT} produtos.`);
  }
  const ids = new Set();
  for (const row of rows) {
    if (row?.error) continue;
    for (const value of row?.variantIds || []) {
      const id = variantGid(value);
      if (id) ids.add(id);
    }
  }
  if (!ids.size) fail("O último lote não contém variantes válidas.");
  return ids;
}

function buildSupabaseCandidates(products, invalidKeys, targetVariantIds) {
  const byVariant = new Map();
  const rejected = {
    invalidReport: 0,
    invalidPrice: 0,
    invalidVariantId: 0,
    outsideLastActivation: 0,
  };

  for (const product of products) {
    const catalogKey = text(product.catalog_key);
    if (invalidKeys.has(catalogKey)) {
      rejected.invalidReport += 1;
      continue;
    }
    const price = money(product.price);
    if (!(price > 0)) {
      rejected.invalidPrice += 1;
      continue;
    }
    const variantId = variantGid(
      product.merchandise_id || product.shopify_variant_id,
    );
    if (!variantId) {
      rejected.invalidVariantId += 1;
      continue;
    }
    if (targetVariantIds && !targetVariantIds.has(variantId)) {
      rejected.outsideLastActivation += 1;
      continue;
    }
    const rows = byVariant.get(variantId) || [];
    rows.push({
      catalogKey,
      sku: text(product.sku),
      ean: text(product.ean),
      price,
    });
    byVariant.set(variantId, rows);
  }

  const candidates = [];
  const ambiguous = [];
  for (const [variantId, rows] of byVariant) {
    const prices = [...new Set(rows.map((row) => row.price.toFixed(2)))];
    if (prices.length !== 1) {
      ambiguous.push({ variantId, prices, rows });
      continue;
    }
    candidates.push({
      variantId,
      supabasePrice: money(prices[0]),
      catalogKeys: rows.map((row) => row.catalogKey),
      skus: [...new Set(rows.map((row) => row.sku).filter(Boolean))],
    });
  }
  return { candidates, ambiguous, rejected };
}

function comparePrices(candidates, shopifyNodes) {
  const byId = new Map(
    shopifyNodes.filter((node) => node?.id).map((node) => [node.id, node]),
  );
  const exact = [];
  const mismatches = [];
  const missing = [];

  for (const candidate of candidates) {
    const node = byId.get(candidate.variantId);
    if (!node?.product?.id) {
      missing.push(candidate);
      continue;
    }
    const row = {
      ...candidate,
      productId: node.product.id,
      title: node.product.title,
      handle: node.product.handle,
      status: node.product.status,
      shopifyPrice: money(node.price),
      difference: money(candidate.supabasePrice - number(node.price)),
    };
    if (Math.abs(row.difference) <= PRICE_TOLERANCE) exact.push(row);
    else mismatches.push(row);
  }
  return { exact, mismatches, missing };
}

async function applyMismatches(rows) {
  const selected = rows.slice(0, APPLY_LIMIT);
  const results = [];
  for (let index = 0; index < selected.length; index += 1) {
    const row = selected[index];
    const result = { ...row, status: "pending", confirmedPrice: null, error: "" };
    try {
      result.confirmedPrice = await updateVariantPrice(row);
      result.status = "updated";
      console.log(
        `Atualizado ${index + 1}/${selected.length}: ${row.title} — CHF ${row.shopifyPrice.toFixed(2)} -> CHF ${row.supabasePrice.toFixed(2)}`,
      );
    } catch (error) {
      result.status = "error";
      result.error = error instanceof Error ? error.message : String(error);
      console.error(`Falhou ${index + 1}/${selected.length}: ${row.title}: ${result.error}`);
    }
    results.push(result);
    writeJson("apply-results.json", results);
    await sleep(200);
  }
  return results;
}

async function main() {
  console.log(`\nModo: ${APPLY ? `APLICAR (máximo ${APPLY_LIMIT})` : "AUDITORIA"}`);
  console.log(
    `Âmbito: ${ONLY_LAST_ACTIVATION ? "último lote de ativação" : "todo o catálogo"}`,
  );
  console.log("Fonte do preço: Supabase (o valor mostrado na loja)");
  console.log("Stock/estado/publicação/produtos apagados: 0 alterações");

  const targetVariantIds = loadLastActivationVariantIds();
  const invalidKeys = loadInvalidCatalogKeys();
  const products = await fetchSupabaseProducts();
  const catalog = buildSupabaseCandidates(products, invalidKeys, targetVariantIds);
  const variantIds = catalog.candidates.map((row) => row.variantId);
  const shopifyNodes = await fetchShopifyVariants(variantIds);
  const comparison = comparePrices(catalog.candidates, shopifyNodes);

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? "apply" : "audit",
    scope: ONLY_LAST_ACTIVATION ? "last-activation" : "all",
    supabaseProducts: products.length,
    targetVariants: targetVariantIds?.size || null,
    comparableVariants: catalog.candidates.length,
    exactPrice: comparison.exact.length,
    priceMismatches: comparison.mismatches.length,
    missingInShopify: comparison.missing.length,
    ambiguousSupabasePrices: catalog.ambiguous.length,
    rejected: catalog.rejected,
    applyLimit: APPLY ? APPLY_LIMIT : 0,
  };

  writeJson("summary.json", summary);
  writeJson("price-mismatches.json", comparison.mismatches);
  writeJson("exact-prices.json", comparison.exact);
  writeJson("missing-shopify.json", comparison.missing);
  writeJson("ambiguous-supabase-prices.json", catalog.ambiguous);

  console.log("\n========== PREÇOS ==========");
  for (const [key, value] of Object.entries(summary)) {
    console.log(`${key}: ${typeof value === "object" && value !== null ? JSON.stringify(value) : value}`);
  }
  console.log(`Relatórios: ${OUT_DIR}`);

  if (!APPLY) {
    console.log("\nNada foi alterado.");
    return;
  }
  if (!comparison.mismatches.length) {
    console.log("\nNão existem preços divergentes para corrigir.");
    return;
  }

  const results = await applyMismatches(comparison.mismatches);
  const failed = results.filter((row) => row.error).length;
  console.log("\n========== APLICAÇÃO ==========");
  console.log(`Selecionados: ${results.length}`);
  console.log(`Atualizados sem erro: ${results.length - failed}`);
  console.log(`Com erro: ${failed}`);
  console.log(`Restantes: ${Math.max(0, comparison.mismatches.length - results.length)}`);
  console.log("Outras alterações: 0");
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error("\nERRO FATAL:", error instanceof Error ? error.message : error);
  process.exit(1);
});
