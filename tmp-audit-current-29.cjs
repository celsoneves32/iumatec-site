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

if (!SUPABASE_URL) throw new Error("SUPABASE_URL em falta.");
if (!SUPABASE_KEY) throw new Error("SUPABASE KEY em falta.");

function text(v) {
  return String(v ?? "").trim();
}

function readJson(file) {
  return JSON.parse(
    fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")
  );
}

function headers() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`
  };
}

async function find(field, value) {
  if (!text(value)) return [];

  const u = new URL(
    `${SUPABASE_URL}/rest/v1/products`
  );

  u.searchParams.set(
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

  u.searchParams.set(
    field,
    `eq.${text(value)}`
  );

  const r = await fetch(
    u,
    { headers: headers() }
  );

  if (!r.ok) {
    throw new Error(
      `${field} READ ${r.status}: ` +
      (await r.text()).slice(0, 1000)
    );
  }

  return await r.json();
}

(async () => {

  console.log("");
  console.log("==============================================");
  console.log(" AUDITORIA ATUAL DOS 29 NO SUPABASE");
  console.log("==============================================");
  console.log("");
  console.log("READ ONLY - NADA SERA ALTERADO");
  console.log("");

  const classification = readJson(CLASS_FILE);

  const targets = (
    Array.isArray(classification.result)
      ? classification.result
      : []
  ).filter(
    r => r.decision === "CRIAR_NA_SHOPIFY"
  );

  if (targets.length !== 29) {
    throw new Error(
      `Esperava 29 targets; encontrei ${targets.length}`
    );
  }

  const results = [];

  const globalRows = new Map();
  const rowOwners = new Map();

  for (let i = 0; i < targets.length; i++) {

    const t = targets[i];

    const skuRows = await find(
      "sku",
      t.sku
    );

    const eanRows = await find(
      "ean",
      t.ean
    );

    const union = new Map();

    for (const row of [
      ...skuRows,
      ...eanRows
    ]) {

      const key =
        text(row.catalog_key) ||
        JSON.stringify(row);

      union.set(key, row);
      globalRows.set(key, row);

      if (!rowOwners.has(key)) {
        rowOwners.set(key, new Set());
      }

      rowOwners.get(key).add(
        text(t.sku)
      );
    }

    const rows = [...union.values()];

    const withValidVariant =
      rows.filter(r =>
        /^gid:\/\/shopify\/ProductVariant\/\d+$/.test(
          text(r.shopify_variant_id)
        )
      ).length;

    results.push({
      sku: text(t.sku),
      ean: text(t.ean),
      oldExpected: Number(t.invalidRows || 0),
      viaSku: skuRows.length,
      viaEan: eanRows.length,
      currentRows: rows.length,
      withValidVariant
    });

    console.log(
      `[${i + 1}/29]`,
      text(t.sku),
      "=>",
      rows.length,
      "linha(s)"
    );
  }

  const noRows =
    results.filter(r => r.currentRows === 0);

  const found =
    results.filter(r => r.currentRows > 0);

  const conflicts = [];

  for (const [key, owners] of rowOwners) {
    if (owners.size > 1) {
      conflicts.push({
        catalog_key: key,
        targets: [...owners]
      });
    }
  }

  console.log("");
  console.log("==============================================");
  console.log(" RESULTADO ATUAL");
  console.log("==============================================");
  console.log("");

  console.log("Produtos alvo          :", targets.length);
  console.log("Com linhas Supabase    :", found.length);
  console.log("Sem linhas Supabase    :", noRows.length);
  console.log("Linhas unicas atuais   :", globalRows.size);
  console.log("Conflitos entre targets:", conflicts.length);

  console.log("");
  console.table(results);

  if (noRows.length) {
    console.log("");
    console.log("===== SEM LINHAS =====");
    console.table(noRows);
  }

  if (conflicts.length) {
    console.log("");
    console.log("===== CONFLITOS =====");
    console.table(conflicts);
  }

  const OUT = path.join(
    ROOT,
    "integrations",
    "alltron",
    "out",
    "shopify-price-reconcile",
    "current-29-supabase-audit.json"
  );

  fs.writeFileSync(
    OUT,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        summary: {
          targets: targets.length,
          targetsFound: found.length,
          targetsMissing: noRows.length,
          currentUniqueRows: globalRows.size,
          conflicts: conflicts.length
        },
        results,
        conflicts
      },
      null,
      2
    ),
    "utf8"
  );

  console.log("");
  console.log("Relatorio:", OUT);
  console.log("");
  console.log("NADA FOI ALTERADO.");

})().catch(error => {
  console.error("");
  console.error("ERRO:", error.message);
  process.exit(1);
});
