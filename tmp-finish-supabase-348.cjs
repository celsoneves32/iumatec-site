const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function loadEnv(file) {
  if (!fs.existsSync(file)) return;

  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
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

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnv(path.join(ROOT, ".env.local"));
loadEnv(path.join(ROOT, ".env"));

const SUPABASE_URL = String(
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ""
).trim().replace(/\/$/, "");

const SUPABASE_KEY = String(
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  ""
).trim();

const STATE_PATH = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "shopify-master-sync-348",
  "state.json"
);

const BACKUP_DIR = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "shopify-price-reconcile",
  "supabase-348-final-backup"
);

const PAGE_SIZE = 1000;
const RPC_BATCH = 250;

function fail(message) {
  console.error("");
  console.error("==========================================");
  console.error(" PARADO");
  console.error("==========================================");
  console.error(message);
  process.exit(1);
}

function norm(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function headers(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extra
  };
}

async function fetchProducts() {
  const rows = [];

  for (let from = 0; ; from += PAGE_SIZE) {

    const to = from + PAGE_SIZE - 1;

    const url =
      `${SUPABASE_URL}/rest/v1/products` +
      `?select=catalog_key,sku,merchandise_id,shopify_variant_id,shopify_product_id,shopify_product_handle,shopify_sync_status` +
      `&order=catalog_key.asc`;

    const response = await fetch(
      url,
      {
        headers: headers({
          Range: `${from}-${to}`,
          Prefer: "count=exact"
        })
      }
    );

    if (!response.ok) {
      fail(
        `Supabase leitura falhou (${response.status}): ` +
        (await response.text()).slice(0, 1000)
      );
    }

    const batch = await response.json();

    rows.push(...batch);

    console.log(
      `Supabase lido: ${rows.length}`
    );

    if (batch.length < PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

async function applyBatch(rows, number, total) {

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/apply_shopify_id_repairs`,
    {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        p_repairs: rows
      })
    }
  );

  if (!response.ok) {
    fail(
      `Lote ${number}/${total} falhou (${response.status}): ` +
      (await response.text()).slice(0, 1500)
    );
  }

  const result = await response.json();

  console.log(
    `Aplicado lote ${number}/${total}: ${result}`
  );
}

(async () => {

  console.log("");
  console.log("==========================================");
  console.log(" FECHAR SUPABASE DOS 348");
  console.log("==========================================");

  if (!SUPABASE_URL) {
    fail("SUPABASE_URL nao encontrado.");
  }

  if (!SUPABASE_KEY) {
    fail("SUPABASE_SECRET_KEY nao encontrado.");
  }

  if (!fs.existsSync(STATE_PATH)) {
    fail("state.json dos 348 nao encontrado.");
  }

  const state = JSON.parse(
    fs.readFileSync(STATE_PATH, "utf8")
      .replace(/^\uFEFF/, "")
  );

  const successes =
    Object.entries(state.success || {})
      .map(([sku, data]) => ({
        sku,
        ...data
      }));

  console.log(
    "Shopify successes:",
    successes.length
  );

  if (successes.length !== 348) {
    fail(
      `Esperado 348 successes; encontrado ${successes.length}.`
    );
  }

  for (const x of successes) {

    if (
      !x.sku ||
      !x.productId ||
      !x.variantId ||
      !x.handle
    ) {
      fail(
        `Dados Shopify incompletos: ${x.sku}`
      );
    }
  }

  console.log("");
  console.log("A carregar Supabase...");

  const before = await fetchProducts();

  console.log("");
  console.log(
    "Supabase total:",
    before.length
  );

  const bySku = new Map();

  for (const row of before) {

    const key = norm(row.sku);

    if (!key) continue;

    const list =
      bySku.get(key) || [];

    list.push(row);

    bySku.set(key, list);
  }

  const updates = [];
  const missing = [];
  const ambiguous = [];

  for (const item of successes) {

    const matches =
      bySku.get(norm(item.sku)) || [];

    if (matches.length === 0) {

      missing.push(item.sku);
      continue;

    }

    if (matches.length > 1) {

      ambiguous.push({
        sku: item.sku,
        count: matches.length
      });

      continue;
    }

    const row = matches[0];

    updates.push({
      catalog_key: row.catalog_key,
      merchandise_id: item.variantId,
      shopify_variant_id: item.variantId,
      shopify_product_id: item.productId,
      shopify_product_handle: item.handle,
      shopify_sync_status: "reconciled"
    });
  }

  console.log("");
  console.log("==========================================");
  console.log(" PRE-VALIDACAO");
  console.log("==========================================");

  console.log(
    "Preparados    :",
    updates.length
  );

  console.log(
    "Nao encontrados:",
    missing.length
  );

  console.log(
    "Ambiguos      :",
    ambiguous.length
  );

  if (missing.length) {

    console.log("");
    console.log("NAO ENCONTRADOS:");
    console.log(missing);

  }

  if (ambiguous.length) {

    console.log("");
    console.log("AMBIGUOS:");
    console.table(ambiguous);

  }

  if (
    updates.length !== 348 ||
    missing.length !== 0 ||
    ambiguous.length !== 0
  ) {
    fail(
      "Pre-validacao nao ficou 348/348. Nada foi aplicado."
    );
  }

  fs.mkdirSync(
    BACKUP_DIR,
    { recursive: true }
  );

  const stamp =
    new Date()
      .toISOString()
      .replace(/[:.]/g, "-");

  const backupRows =
    successes.map(item => {

      const row =
        bySku.get(norm(item.sku))[0];

      return row;
    });

  fs.writeFileSync(
    path.join(
      BACKUP_DIR,
      `before-348-${stamp}.json`
    ),
    JSON.stringify(
      backupRows,
      null,
      2
    ),
    "utf8"
  );

  fs.writeFileSync(
    path.join(
      BACKUP_DIR,
      `apply-348-${stamp}.json`
    ),
    JSON.stringify(
      updates,
      null,
      2
    ),
    "utf8"
  );

  console.log("");
  console.log(
    "Backup dos valores anteriores criado."
  );

  const batches = [];

  for (
    let i = 0;
    i < updates.length;
    i += RPC_BATCH
  ) {
    batches.push(
      updates.slice(
        i,
        i + RPC_BATCH
      )
    );
  }

  console.log("");
  console.log("==========================================");
  console.log(" APLICAR 348 NO SUPABASE");
  console.log("==========================================");

  for (
    let i = 0;
    i < batches.length;
    i++
  ) {

    await applyBatch(
      batches[i],
      i + 1,
      batches.length
    );
  }

  console.log("");
  console.log("==========================================");
  console.log(" VERIFICACAO FINAL");
  console.log("==========================================");

  const after =
    await fetchProducts();

  const afterBySku =
    new Map();

  for (const row of after) {

    const key = norm(row.sku);

    if (!key) continue;

    const list =
      afterBySku.get(key) || [];

    list.push(row);

    afterBySku.set(
      key,
      list
    );
  }

  let exact = 0;

  const problems = [];

  for (const item of successes) {

    const matches =
      afterBySku.get(
        norm(item.sku)
      ) || [];

    if (matches.length !== 1) {

      problems.push(
        `${item.sku}: matches=${matches.length}`
      );

      continue;
    }

    const row =
      matches[0];

    const ok =
      row.merchandise_id === item.variantId &&
      row.shopify_variant_id === item.variantId &&
      row.shopify_product_id === item.productId &&
      row.shopify_product_handle === item.handle &&
      row.shopify_sync_status === "reconciled";

    if (ok) {

      exact++;

    }
    else {

      problems.push(
        `${item.sku}: IDs nao coincidem`
      );
    }
  }

  console.log("");
  console.log(
    "Corretos:",
    `${exact}/348`
  );

  console.log(
    "Problemas:",
    problems.length
  );

  if (
    exact !== 348 ||
    problems.length !== 0
  ) {

    console.log(
      problems.slice(0, 20)
    );

    fail(
      "Verificacao final Supabase falhou."
    );
  }

  console.log("");
  console.log("==========================================");
  console.log("       348 / 348 SUPABASE OK");
  console.log("==========================================");
  console.log("");
  console.log("Shopify       : 348/348 OK");
  console.log("Supabase IDs  : 348/348 OK");
  console.log("Variant IDs   : OK");
  console.log("Product IDs   : OK");
  console.log("Handles       : OK");
  console.log("Sync status   : reconciled");
  console.log("Problemas     : 0");
  console.log("");
  console.log("==========================================");
  console.log(" ASSUNTO DOS 486 FINALIZADO");
  console.log("==========================================");

})().catch(error => {

  fail(
    error instanceof Error
      ? error.message
      : String(error)
  );

});
