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

const STATE_FILE = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "shopify-master-sync-missing-29",
  "state.json"
);

const OUT_DIR = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "link-missing-29-supabase"
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

function fail(message) {
  throw new Error(message);
}

function text(v) {
  return String(v ?? "").trim();
}

function norm(v) {
  return text(v)
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function readJson(file) {
  return JSON.parse(
    fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")
  );
}

function headers(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extra
  };
}

async function getRows(target) {
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

  if (text(target.ean)) {
    url.searchParams.set(
      "ean",
      `eq.${text(target.ean)}`
    );
  } else {
    url.searchParams.set(
      "sku",
      `eq.${text(target.sku)}`
    );
  }

  const response = await fetch(
    url,
    { headers: headers() }
  );

  if (!response.ok) {
    fail(
      `Supabase READ ${response.status}: ` +
      (await response.text()).slice(0, 1000)
    );
  }

  return await response.json();
}

(async () => {
  console.log("");
  console.log("===============================================");
  console.log(" LIGAR 29 PRODUTOS AO SUPABASE");
  console.log("===============================================");
  console.log("");

  if (!SUPABASE_URL) {
    fail("SUPABASE_URL em falta.");
  }

  if (!SUPABASE_KEY) {
    fail("SUPABASE_SECRET_KEY em falta.");
  }

  const classification = readJson(CLASS_FILE);
  const state = readJson(STATE_FILE);

  const targets = (
    Array.isArray(classification.result)
      ? classification.result
      : []
  ).filter(
    row => row.decision === "CRIAR_NA_SHOPIFY"
  );

  if (targets.length !== 29) {
    fail(
      `Esperava 29 produtos. Encontrados: ${targets.length}`
    );
  }

  const successEntries =
    Object.entries(state.success || {});

  if (successEntries.length !== 29) {
    fail(
      `State deveria ter 29 sucessos. Tem: ${successEntries.length}`
    );
  }

  const shopifyBySku = new Map();

  for (const [sku, value] of successEntries) {
    const productId = text(value.productId);
    const variantId = text(value.variantId);
    const handle = text(value.handle);

    if (
      !/^gid:\/\/shopify\/Product\/\d+$/.test(productId)
    ) {
      fail(`Product ID invalido para ${sku}`);
    }

    if (
      !/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(
        variantId
      )
    ) {
      fail(`Variant ID invalido para ${sku}`);
    }

    if (!handle) {
      fail(`Handle vazio para ${sku}`);
    }

    shopifyBySku.set(
      norm(sku),
      {
        productId,
        variantId,
        handle
      }
    );
  }

  const expectedRows = targets.reduce(
    (sum, row) =>
      sum + Number(row.invalidRows || 0),
    0
  );

  console.log("Produtos alvo       :", targets.length);
  console.log("Linhas esperadas     :", expectedRows);
  console.log("");

  const currentRows = [];
  const repairs = [];

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];

    const match =
      shopifyBySku.get(norm(target.sku));

    if (!match) {
      fail(
        `Sem IDs Shopify para SKU: ${target.sku}`
      );
    }

    const rows = await getRows(target);

    const expected =
      Number(target.invalidRows || 0);

    if (rows.length !== expected) {
      fail(
        `PARAR ${target.sku}: ` +
        `Supabase tem ${rows.length} linhas; ` +
        `esperadas ${expected}.`
      );
    }

    for (const row of rows) {
      const oldVariant =
        text(row.shopify_variant_id);

      const oldIsValid =
        /^gid:\/\/shopify\/ProductVariant\/\d+$/.test(
          oldVariant
        );

      if (
        oldIsValid &&
        oldVariant !== match.variantId
      ) {
        fail(
          `PARAR ${target.sku}: ` +
          `ja existe Variant ID valido diferente: ` +
          oldVariant
        );
      }

      currentRows.push({
        ...row,
        targetSku: target.sku,
        expectedProductId: match.productId,
        expectedVariantId: match.variantId,
        expectedHandle: match.handle
      });

      repairs.push({
        catalog_key: row.catalog_key,
        merchandise_id: match.variantId,
        shopify_variant_id: match.variantId,
        shopify_product_id: match.productId,
        shopify_product_handle: match.handle,
        shopify_sync_status: "reconciled"
      });
    }

    console.log(
      `[${i + 1}/29] OK`,
      target.sku,
      `(${rows.length} linhas)`
    );
  }

  if (repairs.length !== expectedRows) {
    fail(
      `Preparadas ${repairs.length} linhas, ` +
      `esperadas ${expectedRows}.`
    );
  }

  const uniqueCatalogKeys = new Set(
    repairs.map(r => String(r.catalog_key))
  );

  if (uniqueCatalogKeys.size !== repairs.length) {
    fail("Existem catalog_key duplicados no payload.");
  }

  fs.mkdirSync(
    OUT_DIR,
    { recursive: true }
  );

  const stamp =
    new Date()
      .toISOString()
      .replace(/[:.]/g, "-");

  const backupFile = path.join(
    OUT_DIR,
    `before-link-29-${stamp}.json`
  );

  fs.writeFileSync(
    backupFile,
    JSON.stringify(currentRows, null, 2),
    "utf8"
  );

  console.log("");
  console.log("===============================================");
  console.log(" PRE-VALIDACAO OK");
  console.log("===============================================");
  console.log("29 produtos          : OK");
  console.log(
    `${repairs.length} linhas Supabase : OK`
  );
  console.log("IDs Shopify           : OK");
  console.log("Conflitos              : 0");
  console.log("Backup                 :", backupFile);
  console.log("");

  console.log("A APLICAR NO SUPABASE...");
  console.log("");

  const applyResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/apply_shopify_id_repairs`,
    {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        p_repairs: repairs
      })
    }
  );

  if (!applyResponse.ok) {
    fail(
      `APPLY falhou ${applyResponse.status}: ` +
      (await applyResponse.text()).slice(0, 1500)
    );
  }

  const applyText =
    await applyResponse.text();

  console.log(
    "Resposta RPC:",
    applyText || "(sem corpo)"
  );

  console.log("");
  console.log("A verificar resultado final...");
  console.log("");

  let verifiedRows = 0;
  let problems = 0;

  for (const target of targets) {
    const expected =
      shopifyBySku.get(norm(target.sku));

    const rows = await getRows(target);

    for (const row of rows) {
      const ok =
        text(row.merchandise_id) ===
          expected.variantId &&
        text(row.shopify_variant_id) ===
          expected.variantId &&
        text(row.shopify_product_id) ===
          expected.productId &&
        text(row.shopify_product_handle) ===
          expected.handle &&
        text(row.shopify_sync_status) ===
          "reconciled";

      if (ok) {
        verifiedRows++;
      } else {
        problems++;

        console.log(
          "PROBLEMA:",
          target.sku,
          row.catalog_key
        );
      }
    }
  }

  if (
    verifiedRows !== expectedRows ||
    problems !== 0
  ) {
    fail(
      `Verificacao final falhou: ` +
      `${verifiedRows}/${expectedRows} OK, ` +
      `${problems} problemas.`
    );
  }

  console.log("");
  console.log("===============================================");
  console.log(" 29 / 29 PRODUTOS LIGADOS");
  console.log("===============================================");
  console.log("");
  console.log("Produtos Shopify : 29/29 OK");
  console.log(
    `Linhas Supabase  : ${verifiedRows}/${expectedRows} OK`
  );
  console.log("Variant IDs      : OK");
  console.log("Product IDs      : OK");
  console.log("Handles          : OK");
  console.log("Sync status      : reconciled");
  console.log("Problemas        : 0");
  console.log("");
  console.log("PRECO NAO FOI ALTERADO.");
  console.log("STOCK NAO FOI ALTERADO.");
  console.log("SHOPIFY NAO FOI ALTERADA.");
  console.log("");
  console.log("NAO EXECUTAR ESTE BLOCO NOVAMENTE.");
})().catch(error => {
  console.error("");
  console.error("===============================================");
  console.error(" PARADO");
  console.error("===============================================");
  console.error(error.message);
  process.exit(1);
});
