import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ARGS = process.argv.slice(2);
const APPLY = ARGS.includes("--apply");
const HELP = ARGS.includes("--help") || ARGS.includes("-h");
const PAGE_SIZE = 1000;
const SHOPIFY_BATCH_SIZE = 100;
const MAX_APPLY_LIMIT = 50000;
const MAX_REPORT_AGE_HOURS = 6;
const PRICE_TOLERANCE = 0.009;
const OUT_DIR = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "shopify-activation",
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

function showHelp() {
  console.log(`
IUMATEC — auditoria e ativação segura de produtos Shopify

Auditoria (não altera nada):
  node scripts/audit-activate-shopify-products.mjs

Aplicação limitada (apenas depois de rever a auditoria):
  node scripts/audit-activate-shopify-products.mjs --apply --limit=25

Escolher explicitamente a publicação, se necessário:
  --publication="iumatec-storefront"
  --publication-id="gid://shopify/Publication/123"

Proteções:
  - exclui unmatched e ambiguous;
  - exige stock e preço positivos no Supabase e na Shopify;
  - exige que o preço visível no Supabase coincida com a variante Shopify;
  - nunca reativa produtos ARCHIVED;
  - auditoria é o modo por defeito;
  - --apply exige --limit entre 1 e ${MAX_APPLY_LIMIT};
  - não apaga produtos.
`);
}

if (HELP) {
  showHelp();
  process.exit(0);
}

function fail(message) {
  console.error(`\nERRO: ${message}`);
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

const REQUESTED_PUBLICATION_ID =
  argValue("--publication-id") ||
  String(process.env.SHOPIFY_PUBLICATION_ID || "").trim();
const REQUESTED_PUBLICATION_NAME =
  argValue("--publication") ||
  String(process.env.SHOPIFY_PUBLICATION_NAME || "").trim();

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

if (!SHOPIFY_DOMAIN) fail("Falta SHOPIFY_STORE_DOMAIN.");
if (!SHOPIFY_TOKEN) fail("Falta SHOPIFY_ADMIN_ACCESS_TOKEN.");
if (!SUPABASE_URL) fail("Falta SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL.");
if (!SUPABASE_KEY) {
  fail("Falta SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY.");
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

function text(value) {
  return String(value ?? "").trim();
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function variantGid(value) {
  const clean = text(value);
  if (/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(clean)) return clean;
  const numeric = clean.match(/(\d+)$/)?.[1] || "";
  return numeric ? `gid://shopify/ProductVariant/${numeric}` : "";
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
    "in_stock",
    "stock_qty",
    "merchandise_id",
    "shopify_variant_id",
    "shopify_product_id",
    "shopify_product_handle",
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
      console.log(
        `Shopify: ligação falhou; tentativa ${attempt}/8 em ${Math.round(delay / 1000)}s...`,
      );
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

  const throttle = json?.extensions?.cost?.throttleStatus;
  if (throttle) {
    const available = number(throttle.currentlyAvailable);
    const restoreRate = Math.max(1, number(throttle.restoreRate));
    if (available < 150) {
      await sleep(Math.ceil(((150 - available) / restoreRate) * 1000));
    }
  }

  return json.data;
}

const PUBLICATIONS_QUERY = `
  query PublicationsForIumatec {
    publications(first: 100) {
      nodes { id name autoPublish }
    }
  }
`;

async function selectPublication() {
  const data = await shopifyGraphql(PUBLICATIONS_QUERY);
  const publications = data?.publications?.nodes || [];
  if (!publications.length) {
    fail("A Shopify não devolveu publicações. Confirma a permissão read_publications.");
  }

  if (REQUESTED_PUBLICATION_ID) {
    const match = publications.find((item) => item.id === REQUESTED_PUBLICATION_ID);
    if (!match) fail(`Publicação não encontrada: ${REQUESTED_PUBLICATION_ID}`);
    return match;
  }

  if (REQUESTED_PUBLICATION_NAME) {
    const requested = REQUESTED_PUBLICATION_NAME.toLowerCase();
    const exact = publications.filter(
      (item) => text(item.name).toLowerCase() === requested,
    );
    if (exact.length === 1) return exact[0];
    const partial = publications.filter((item) =>
      text(item.name).toLowerCase().includes(requested),
    );
    if (partial.length === 1) return partial[0];
    fail(
      `A publicação "${REQUESTED_PUBLICATION_NAME}" não é única. Opções: ` +
        publications.map((item) => `${item.name} (${item.id})`).join(", "),
    );
  }

  const preferred = publications.filter((item) =>
    /(iumatec|storefront|online store|loja virtual)/i.test(text(item.name)),
  );
  if (preferred.length === 1) return preferred[0];

  fail(
    "Não foi possível escolher uma única publicação com segurança. " +
      "Repete com --publication=\"NOME EXATO\". Opções: " +
      publications.map((item) => `${item.name} (${item.id})`).join(", "),
  );
}

const VARIANTS_QUERY = `
  query ActivationCandidates($ids: [ID!]!, $publicationId: ID!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        sku
        barcode
        price
        inventoryQuantity
        inventoryItem { tracked }
        product {
          id
          handle
          title
          status
          publishedOnPublication(publicationId: $publicationId)
        }
      }
    }
  }
`;

async function fetchShopifyCandidates(ids, publicationId) {
  const rows = [];
  for (let index = 0; index < ids.length; index += SHOPIFY_BATCH_SIZE) {
    const batch = ids.slice(index, index + SHOPIFY_BATCH_SIZE);
    const data = await shopifyGraphql(VARIANTS_QUERY, {
      ids: batch,
      publicationId,
    });
    rows.push(...(data?.nodes || []));
    console.log(
      `Shopify: ${Math.min(index + batch.length, ids.length).toLocaleString("pt-PT")}/${ids.length.toLocaleString("pt-PT")} variantes verificadas`,
    );
  }
  return rows;
}

const ACTIVATE_MUTATION = `
  mutation ActivateProduct($input: ProductInput!) {
    productUpdate(input: $input) {
      product { id status }
      userErrors { field message }
    }
  }
`;

async function activateProduct(productId) {
  const data = await shopifyGraphql(ACTIVATE_MUTATION, {
    input: { id: productId, status: "ACTIVE" },
  });
  const errors = data?.productUpdate?.userErrors || [];
  if (errors.length) throw new Error(JSON.stringify(errors));
  if (data?.productUpdate?.product?.status !== "ACTIVE") {
    throw new Error("A Shopify não confirmou o estado ACTIVE.");
  }
}

const PUBLISH_MUTATION = `
  mutation PublishProduct(
    $id: ID!
    $input: [PublicationInput!]!
    $publicationId: ID!
  ) {
    publishablePublish(id: $id, input: $input) {
      publishable { publishedOnPublication(publicationId: $publicationId) }
      userErrors { field message }
    }
  }
`;

async function publishProduct(productId, publicationId) {
  const data = await shopifyGraphql(PUBLISH_MUTATION, {
    id: productId,
    input: [{ publicationId }],
    publicationId,
  });
  const errors = data?.publishablePublish?.userErrors || [];
  if (errors.length) throw new Error(JSON.stringify(errors));
  if (!data?.publishablePublish?.publishable?.publishedOnPublication) {
    throw new Error("A Shopify não confirmou a publicação.");
  }
}

function validateRepairReports() {
  const summaryPath = path.join(REPAIR_DIR, "summary.json");
  const unmatchedPath = path.join(REPAIR_DIR, "unmatched.json");
  const ambiguousPath = path.join(REPAIR_DIR, "ambiguous.json");
  const summary = readJson(summaryPath, "summary.json da reconciliação");
  const unmatched = readJson(unmatchedPath, "unmatched.json");
  const ambiguous = readJson(ambiguousPath, "ambiguous.json");

  if (!Array.isArray(unmatched) || !Array.isArray(ambiguous)) {
    fail("Os relatórios unmatched/ambiguous não contêm listas.");
  }
  if (
    number(summary.unmatched) !== unmatched.length ||
    number(summary.ambiguous) !== ambiguous.length
  ) {
    fail("As contagens dos relatórios de reconciliação não coincidem.");
  }

  const generatedAt = Date.parse(summary.generatedAt || "");
  const ageHours = Number.isFinite(generatedAt)
    ? (Date.now() - generatedAt) / 3_600_000
    : Number.POSITIVE_INFINITY;
  if (APPLY && ageHours > MAX_REPORT_AGE_HOURS) {
    fail(
      `A reconciliação tem mais de ${MAX_REPORT_AGE_HOURS} horas. ` +
        "Executa primeiro repair-shopify-ids-supabase-safe-apply-retry.mjs.",
    );
  }

  return { summary, unmatched, ambiguous, ageHours };
}

function buildCatalogCandidates(products, invalidKeys) {
  const candidates = [];
  const rejected = {
    invalidReport: 0,
    noStock: 0,
    invalidPrice: 0,
    invalidVariantId: 0,
  };

  for (const product of products) {
    const catalogKey = text(product.catalog_key);
    if (invalidKeys.has(catalogKey)) {
      rejected.invalidReport += 1;
      continue;
    }
    if (!(product.in_stock === true || number(product.stock_qty) > 0)) {
      rejected.noStock += 1;
      continue;
    }
    if (number(product.price) <= 0) {
      rejected.invalidPrice += 1;
      continue;
    }
    const id = variantGid(product.merchandise_id || product.shopify_variant_id);
    if (!id) {
      rejected.invalidVariantId += 1;
      continue;
    }
    candidates.push({
      catalogKey,
      sku: text(product.sku),
      ean: text(product.ean),
      price: number(product.price),
      stockQty: number(product.stock_qty),
      variantId: id,
    });
  }

  return { candidates, rejected };
}

function buildActivationPlan(catalogCandidates, shopifyNodes) {
  const catalogByVariant = new Map();
  for (const row of catalogCandidates) {
    const list = catalogByVariant.get(row.variantId) || [];
    list.push(row);
    catalogByVariant.set(row.variantId, list);
  }

  const products = new Map();
  const skipped = {
    variantMissingInShopify: 0,
    shopifyPriceInvalid: 0,
    shopifyPriceMismatch: 0,
    supabasePriceAmbiguous: 0,
    shopifyStockUnavailable: 0,
    archivedProducts: 0,
  };
  const returnedVariantIds = new Set();
  const priceMismatches = [];
  const blockedProductIds = new Set();

  for (const node of shopifyNodes) {
    if (!node?.id || !node?.product?.id) continue;
    returnedVariantIds.add(node.id);
    const catalogRows = catalogByVariant.get(node.id) || [];
    if (!catalogRows.length) continue;
    if (number(node.price) <= 0) {
      skipped.shopifyPriceInvalid += catalogRows.length;
      continue;
    }
    const expectedPrices = [
      ...new Set(catalogRows.map((row) => number(row.price).toFixed(2))),
    ];
    if (expectedPrices.length !== 1) {
      skipped.supabasePriceAmbiguous += catalogRows.length;
      blockedProductIds.add(node.product.id);
      priceMismatches.push({
        reason: "supabase-price-ambiguous",
        productId: node.product.id,
        variantId: node.id,
        title: node.product.title,
        supabasePrices: expectedPrices,
        shopifyPrice: Number(number(node.price).toFixed(2)),
        catalogKeys: catalogRows.map((row) => row.catalogKey),
      });
      continue;
    }
    const expectedPrice = number(expectedPrices[0]);
    const shopifyPrice = number(node.price);
    if (Math.abs(expectedPrice - shopifyPrice) > PRICE_TOLERANCE) {
      skipped.shopifyPriceMismatch += catalogRows.length;
      blockedProductIds.add(node.product.id);
      priceMismatches.push({
        reason: "shopify-price-differs-from-supabase",
        productId: node.product.id,
        variantId: node.id,
        title: node.product.title,
        supabasePrice: Number(expectedPrice.toFixed(2)),
        shopifyPrice: Number(shopifyPrice.toFixed(2)),
        difference: Number((expectedPrice - shopifyPrice).toFixed(2)),
        catalogKeys: catalogRows.map((row) => row.catalogKey),
      });
      continue;
    }
    const tracked = node.inventoryItem?.tracked !== false;
    if (tracked && number(node.inventoryQuantity) <= 0) {
      skipped.shopifyStockUnavailable += catalogRows.length;
      continue;
    }
    if (node.product.status === "ARCHIVED") {
      skipped.archivedProducts += catalogRows.length;
      continue;
    }

    const current = products.get(node.product.id) || {
      productId: node.product.id,
      title: node.product.title,
      handle: node.product.handle,
      status: node.product.status,
      published: Boolean(node.product.publishedOnPublication),
      variantIds: [],
      catalogKeys: [],
    };
    current.variantIds.push(node.id);
    current.catalogKeys.push(...catalogRows.map((row) => row.catalogKey));
    products.set(node.product.id, current);
  }

  for (const variantId of catalogByVariant.keys()) {
    if (!returnedVariantIds.has(variantId)) skipped.variantMissingInShopify += 1;
  }

  for (const productId of blockedProductIds) products.delete(productId);

  const rows = [...products.values()]
    .map((product) => ({
      ...product,
      variantIds: [...new Set(product.variantIds)],
      catalogKeys: [...new Set(product.catalogKeys)],
      needsActivation: product.status === "DRAFT",
      needsPublication: !product.published,
    }))
    .sort((a, b) => a.productId.localeCompare(b.productId));

  return {
    ready: rows.filter(
      (product) => !product.needsActivation && !product.needsPublication,
    ),
    planned: rows.filter(
      (product) => product.needsActivation || product.needsPublication,
    ),
    skipped,
    priceMismatches,
  };
}

async function applyPlan(planned, publicationId) {
  const selected = planned.slice(0, APPLY_LIMIT);
  const results = [];

  for (let index = 0; index < selected.length; index += 1) {
    const product = selected[index];
    const result = {
      ...product,
      activation: product.needsActivation ? "pending" : "not-needed",
      publication: product.needsPublication ? "pending" : "not-needed",
      error: "",
    };

    try {
      if (product.needsActivation) {
        await activateProduct(product.productId);
        result.activation = "activated";
      }
      if (product.needsPublication) {
        await publishProduct(product.productId, publicationId);
        result.publication = "published";
      }
      console.log(
        `Aplicado ${index + 1}/${selected.length}: ${product.title} (${product.productId})`,
      );
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      console.error(
        `Falhou ${index + 1}/${selected.length}: ${product.title}: ${result.error}`,
      );
    }

    results.push(result);
    if ((index + 1) % 500 === 0 || index + 1 === selected.length) {
      writeJson("apply-results.json", results);
    }
    await sleep(200);
  }

  return results;
}

async function main() {
  console.log(`\nModo: ${APPLY ? `APLICAR (máximo ${APPLY_LIMIT})` : "AUDITORIA"}`);
  console.log("Produtos apagados: 0");

  const repair = validateRepairReports();
  const invalidKeys = new Set(
    [...repair.unmatched, ...repair.ambiguous]
      .map((row) => text(row?.catalogKey))
      .filter(Boolean),
  );
  console.log(
    `Reconciliação: ${repair.unmatched.length} unmatched + ${repair.ambiguous.length} ambiguous excluídos`,
  );

  const publication = await selectPublication();
  console.log(`Publicação escolhida: ${publication.name} (${publication.id})`);

  const supabaseProducts = await fetchSupabaseProducts();
  const catalog = buildCatalogCandidates(supabaseProducts, invalidKeys);
  const uniqueVariantIds = [...new Set(catalog.candidates.map((row) => row.variantId))];
  console.log(
    `Candidatos com stock, preço e ID: ${catalog.candidates.length.toLocaleString("pt-PT")}`,
  );

  const shopifyNodes = await fetchShopifyCandidates(
    uniqueVariantIds,
    publication.id,
  );
  const plan = buildActivationPlan(catalog.candidates, shopifyNodes);

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? "apply" : "audit",
    publication: { id: publication.id, name: publication.name },
    reconciliationAgeHours: Number.isFinite(repair.ageHours)
      ? Number(repair.ageHours.toFixed(2))
      : null,
    supabaseProducts: supabaseProducts.length,
    excludedUnmatched: repair.unmatched.length,
    excludedAmbiguous: repair.ambiguous.length,
    catalogCandidates: catalog.candidates.length,
    uniqueCandidateVariants: uniqueVariantIds.length,
    readyActiveAndPublished: plan.ready.length,
    needsActivationOrPublication: plan.planned.length,
    needsActivation: plan.planned.filter((row) => row.needsActivation).length,
    needsPublication: plan.planned.filter((row) => row.needsPublication).length,
    priceMismatchVariants: plan.priceMismatches.length,
    priceMismatchProducts: new Set(
      plan.priceMismatches.map((row) => row.productId),
    ).size,
    rejectedCatalog: catalog.rejected,
    skippedShopify: plan.skipped,
    applyLimit: APPLY ? APPLY_LIMIT : 0,
  };

  writeJson("summary.json", summary);
  writeJson("activation-preview.json", plan.planned);
  writeJson("ready.json", plan.ready);
  writeJson("price-mismatches.json", plan.priceMismatches);

  console.log("\n========== AUDITORIA ==========");
  for (const [key, value] of Object.entries(summary)) {
    if (value && typeof value === "object") {
      console.log(`${key}: ${JSON.stringify(value)}`);
    } else {
      console.log(`${key}: ${value}`);
    }
  }
  console.log(`Relatórios: ${OUT_DIR}`);

  if (!APPLY) {
    console.log("\nNada foi alterado.");
    console.log(
      "Depois de rever as contagens, aplica primeiro um lote pequeno com --apply --limit=25.",
    );
    return;
  }

  if (!plan.planned.length) {
    console.log("\nNão existem produtos elegíveis para alterar.");
    return;
  }

  const results = await applyPlan(plan.planned, publication.id);
  const failed = results.filter((row) => row.error).length;
  const applied = results.length - failed;
  console.log("\n========== APLICAÇÃO ==========");
  console.log(`Selecionados: ${results.length}`);
  console.log(`Concluídos sem erro: ${applied}`);
  console.log(`Com erro: ${failed}`);
  console.log(`Restantes no plano: ${Math.max(0, plan.planned.length - results.length)}`);
  console.log("Produtos apagados: 0");
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error("\nERRO FATAL:", error instanceof Error ? error.message : error);
  process.exit(1);
});
