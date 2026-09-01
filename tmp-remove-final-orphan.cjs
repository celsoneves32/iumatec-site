const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const CLASS_FILE = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "shopify-price-reconcile",
  "invalid-final-classification.json"
);

const OUT_DIR = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "remove-final-orphan"
);

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

function text(v) {
  return String(v ?? "").trim();
}

function readJson(file) {
  return JSON.parse(
    fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")
  );
}

function fail(message) {
  throw new Error(message);
}

function headers(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extra
  };
}

async function find(field, value) {
  if (!text(value)) return [];

  const url = new URL(
    `${SUPABASE_URL}/rest/v1/products`
  );

  url.searchParams.set(
    "select",
    [
      "catalog_key",
      "sku",
      "ean",
      "merchandise_id",
      "shopify_variant_id",
      "shopify_product_id",
      "shopify_product_handle",
      "shopify_sync_status"
    ].join(",")
  );

  url.searchParams.set(
    field,
    `eq.${text(value)}`
  );

  const response = await fetch(
    url,
    { headers: headers() }
  );

  if (!response.ok) {
    fail(
      `READ ${field} ${response.status}: ` +
      (await response.text()).slice(0, 1200)
    );
  }

  return await response.json();
}

async function removeByCatalogKey(catalogKey) {
  const url = new URL(
    `${SUPABASE_URL}/rest/v1/products`
  );

  url.searchParams.set(
    "catalog_key",
    `eq.${catalogKey}`
  );

  const response = await fetch(
    url,
    {
      method: "DELETE",
      headers: headers({
        Prefer: "return=representation"
      })
    }
  );

  if (!response.ok) {
    fail(
      `DELETE ${response.status}: ` +
      (await response.text()).slice(0, 1500)
    );
  }

  return await response.json();
}

(async () => {

  console.log("");
  console.log("==============================================");
  console.log(" FECHAR O ULTIMO ORFAO");
  console.log("==============================================");
  console.log("");

  if (!SUPABASE_URL) {
    fail("SUPABASE_URL em falta.");
  }

  if (!SUPABASE_KEY) {
    fail("SUPABASE KEY em falta.");
  }

  if (!fs.existsSync(CLASS_FILE)) {
    fail("Relatorio invalid-final-classification.json nao encontrado.");
  }

  const report = readJson(CLASS_FILE);

  const rows =
    Array.isArray(report.result)
      ? report.result
      : [];

  const orphans = rows.filter(
    r => r.decision === "ORFAO_REMOVER_SUPABASE"
  );

  console.log(
    "Orfaos classificados :",
    orphans.length
  );

  if (orphans.length !== 1) {
    fail(
      `PARAR: esperava exatamente 1 orfao; encontrei ${orphans.length}.`
    );
  }

  const orphan = orphans[0];

  console.log("");
  console.log("===== ORFAO =====");
  console.log("SKU      :", text(orphan.sku));
  console.log("EAN      :", text(orphan.ean));
  console.log("LITM     :", text(orphan.litm));
  console.log("Preco    :", orphan.price);
  console.log("Sellable :", orphan.sellable);
  console.log("Decision :", orphan.decision);

  const skuRows =
    text(orphan.sku)
      ? await find("sku", orphan.sku)
      : [];

  const eanRows =
    text(orphan.ean)
      ? await find("ean", orphan.ean)
      : [];

  const union = new Map();

  for (const row of [
    ...skuRows,
    ...eanRows
  ]) {
    union.set(
      text(row.catalog_key),
      row
    );
  }

  const current = [...union.values()];

  console.log("");
  console.log(
    "Linhas atuais Supabase :",
    current.length
  );

  if (current.length !== 1) {
    fail(
      `PARAR: esperava exatamente 1 linha Supabase; encontrei ${current.length}.`
    );
  }

  const row = current[0];

  console.table([row]);

  const hasVariant =
    /^gid:\/\/shopify\/ProductVariant\/\d+$/.test(
      text(row.shopify_variant_id)
    );

  const hasProduct =
    /^gid:\/\/shopify\/Product\/\d+$/.test(
      text(row.shopify_product_id)
    );

  if (hasVariant || hasProduct) {
    fail(
      "PARAR: esta linha possui IDs Shopify validos. NAO APAGAR."
    );
  }

  if (
    text(orphan.decision) !==
    "ORFAO_REMOVER_SUPABASE"
  ) {
    fail(
      "PARAR: classificacao nao autoriza remocao."
    );
  }

  if (Number(orphan.price || 0) > 0) {
    fail(
      `PARAR: produto agora possui preco ${orphan.price}.`
    );
  }

  if (orphan.sellable === true) {
    fail(
      "PARAR: produto esta marcado como vendavel."
    );
  }

  const catalogKey =
    text(row.catalog_key);

  if (!catalogKey) {
    fail(
      "PARAR: catalog_key vazio."
    );
  }

  fs.mkdirSync(
    OUT_DIR,
    { recursive: true }
  );

  const stamp =
    new Date()
      .toISOString()
      .replace(/[:.]/g, "-");

  const backup = path.join(
    OUT_DIR,
    `orphan-before-delete-${stamp}.json`
  );

  fs.writeFileSync(
    backup,
    JSON.stringify(
      {
        classification: orphan,
        supabaseRow: row
      },
      null,
      2
    ),
    "utf8"
  );

  console.log("");
  console.log("==============================================");
  console.log(" VALIDACAO 100% OK");
  console.log("==============================================");
  console.log("");
  console.log("Backup:", backup);
  console.log("");
  console.log("A remover SOMENTE esta linha...");
  console.log("");

  const deleted =
    await removeByCatalogKey(catalogKey);

  if (
    !Array.isArray(deleted) ||
    deleted.length !== 1
  ) {
    fail(
      `DELETE inesperado: ${
        Array.isArray(deleted)
          ? deleted.length
          : "nao-array"
      } linha(s).`
    );
  }

  console.log(
    "Linha removida:",
    catalogKey
  );

  console.log("");
  console.log("===== VERIFICACAO FINAL =====");

  const verifySku =
    text(orphan.sku)
      ? await find("sku", orphan.sku)
      : [];

  const verifyEan =
    text(orphan.ean)
      ? await find("ean", orphan.ean)
      : [];

  const verify = new Map();

  for (const r of [
    ...verifySku,
    ...verifyEan
  ]) {
    verify.set(
      text(r.catalog_key),
      r
    );
  }

  if (verify.size !== 0) {
    fail(
      `A verificacao final ainda encontrou ${verify.size} linha(s).`
    );
  }

  console.log("");
  console.log("==============================================");
  console.log(" ULTIMO ORFAO REMOVIDO COM SUCESSO");
  console.log("==============================================");
  console.log("");
  console.log("Linhas removidas : 1");
  console.log("Linhas restantes : 0");
  console.log("Shopify alterada : NAO");
  console.log("29 anteriores    : NAO ALTERADOS");
  console.log("Backup criado    : SIM");
  console.log("");

})().catch(error => {
  console.error("");
  console.error("==============================================");
  console.error(" PARADO");
  console.error("==============================================");
  console.error(error.message);
  process.exitCode = 1;
});
