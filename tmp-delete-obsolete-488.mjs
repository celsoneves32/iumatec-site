import fs from "node:fs";

const INPUT =
  "./integrations/alltron/out/shopify-price-reconcile/invalid-488-found-supabase.json";

const REPORT =
  process.env.DELETE_REPORT_PATH;

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL nao encontrada.");
}

if (!SUPABASE_KEY) {
  throw new Error("SUPABASE_KEY nao encontrada.");
}

function text(value) {
  return String(value ?? "").trim();
}

function getCatalogKey(row) {
  return text(row.catalog_key || row.catalogKey);
}

function getMerchandiseId(row) {
  return text(row.merchandise_id || row.merchandiseId);
}

function getShopifyVariantId(row) {
  return text(row.shopify_variant_id || row.shopifyVariantId);
}

function flattenRows(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flat(Infinity)
    .filter(
      (row) =>
        row &&
        typeof row === "object" &&
        !Array.isArray(row),
    );
}

function headers(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function getCurrentRow(catalogKey) {

  const url =
    `${SUPABASE_URL}/rest/v1/products` +
    `?select=catalog_key,sku,ean,price,merchandise_id,shopify_variant_id` +
    `&catalog_key=eq.${encodeURIComponent(catalogKey)}`;

  const response = await fetch(url, {
    headers: headers(),
  });

  if (!response.ok) {
    throw new Error(
      `GET ${catalogKey}: HTTP ${response.status} ${await response.text()}`,
    );
  }

  return await response.json();
}

async function deleteRow(catalogKey) {

  const url =
    `${SUPABASE_URL}/rest/v1/products` +
    `?catalog_key=eq.${encodeURIComponent(catalogKey)}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: headers({
      Prefer: "return=representation",
    }),
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `DELETE ${catalogKey}: HTTP ${response.status} ${body}`,
    );
  }

  const deleted = body ? JSON.parse(body) : [];

  if (!Array.isArray(deleted) || deleted.length !== 1) {
    throw new Error(
      `DELETE ${catalogKey}: esperado 1 registo removido, recebido ${deleted.length}.`,
    );
  }

  return deleted[0];
}

async function getTotalCount() {

  const url =
    `${SUPABASE_URL}/rest/v1/products?select=catalog_key&limit=1`;

  const response = await fetch(url, {
    headers: headers({
      Prefer: "count=exact",
      Range: "0-0",
    }),
  });

  if (!response.ok) {
    throw new Error(
      `COUNT: HTTP ${response.status} ${await response.text()}`,
    );
  }

  const range = response.headers.get("content-range") || "";

  const match = range.match(/\/(\d+)$/);

  if (!match) {
    throw new Error(
      `Nao foi possivel interpretar Content-Range: ${range}`,
    );
  }

  return Number(match[1]);
}

const raw = JSON.parse(
  fs.readFileSync(INPUT, "utf8"),
);

const rows = flattenRows(raw);

if (rows.length !== 488) {
  throw new Error(
    `Esperado 488 registos no backup; encontrado ${rows.length}.`,
  );
}

const keys = rows.map(getCatalogKey);

const uniqueKeys = [...new Set(keys)];

if (uniqueKeys.length !== 488) {
  throw new Error(
    `Esperado 488 catalogKeys unicos; encontrado ${uniqueKeys.length}.`,
  );
}

if (uniqueKeys.some((key) => !key.startsWith("litm:"))) {
  throw new Error(
    "Foi encontrada uma catalogKey que nao comeca por litm:.",
  );
}

if (
  rows.some(
    (row) =>
      getMerchandiseId(row) ||
      getShopifyVariantId(row),
  )
) {
  throw new Error(
    "Backup contem Variant ID. Cancelado.",
  );
}

console.log("");
console.log("===== PRE-DELETE VERIFICATION =====");

const verified = [];

for (let i = 0; i < rows.length; i += 1) {

  const backup = rows[i];

  const catalogKey = getCatalogKey(backup);

  const current = await getCurrentRow(catalogKey);

  if (current.length !== 1) {
    throw new Error(
      `${catalogKey}: esperado exatamente 1 registo no Supabase; encontrado ${current.length}.`,
    );
  }

  const row = current[0];

  if (
    getMerchandiseId(row) ||
    getShopifyVariantId(row)
  ) {
    throw new Error(
      `${catalogKey}: agora possui Variant ID. CANCELADO.`,
    );
  }

  if (
    text(backup.sku) &&
    text(row.sku) !== text(backup.sku)
  ) {
    throw new Error(
      `${catalogKey}: SKU mudou. Backup=${backup.sku} Supabase=${row.sku}. CANCELADO.`,
    );
  }

  verified.push(row);

  if (
    (i + 1) % 25 === 0 ||
    i + 1 === rows.length
  ) {
    console.log(
      `Verificados: ${i + 1}/488`,
    );
  }
}

if (verified.length !== 488) {
  throw new Error(
    "A verificacao nao chegou aos 488. CANCELADO.",
  );
}

console.log("");
console.log("488/488 VERIFICADOS.");
console.log("INICIO DA REMOCAO.");

const deleted = [];

for (let i = 0; i < uniqueKeys.length; i += 1) {

  const catalogKey = uniqueKeys[i];

  const result =
    await deleteRow(catalogKey);

  deleted.push(result);

  if (
    (i + 1) % 25 === 0 ||
    i + 1 === uniqueKeys.length
  ) {
    console.log(
      `Removidos: ${i + 1}/488`,
    );
  }
}

console.log("");
console.log("===== POS-DELETE =====");

let remaining = 0;

for (const catalogKey of uniqueKeys) {

  const current =
    await getCurrentRow(catalogKey);

  remaining += current.length;
}

if (remaining !== 0) {
  throw new Error(
    `Ainda existem ${remaining} dos 488 no Supabase.`,
  );
}

const total = await getTotalCount();

const report = {
  generatedAt: new Date().toISOString(),
  requested: 488,
  verified: verified.length,
  deleted: deleted.length,
  remaining,
  supabaseTotalAfterDelete: total,
  expectedTotalAfterDelete: 51760,
  success:
    deleted.length === 488 &&
    remaining === 0 &&
    total === 51760,
  deletedRows: deleted,
};

fs.writeFileSync(
  REPORT,
  JSON.stringify(report, null, 2),
  "utf8",
);

console.log(`Removidos             : ${deleted.length}`);
console.log(`Ainda encontrados     : ${remaining}`);
console.log(`Supabase total        : ${total}`);
console.log(`Total esperado        : 51760`);

if (!report.success) {
  throw new Error(
    "A verificacao final nao corresponde ao esperado. Consultar relatorio.",
  );
}

console.log("");
console.log("======================================");
console.log("LIMPEZA DOS 488 CONCLUIDA COM SUCESSO");
console.log("SUPABASE FINAL: 51760");
console.log("======================================");
console.log("");
console.log(`Relatorio: ${REPORT}`);
