import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

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

const changes = [
  {
    catalogKey: "litm:1955306",
    oldSku: "TKMMT AP 17 512GB BLA DEP",
    newSku: "TKMMT AP 17 512GB BLA",
  },
  {
    catalogKey: "litm:1955343",
    oldSku: "TKMMT AP 17 PRO M 2TB BLU DEP",
    newSku: "TKMMT AP 17 PRO MAX 2TB BLU",
  },
  {
    catalogKey: "litm:2033170",
    oldSku: "TC AP IPP11 M5 256 SG CEL SV",
    newSku: "TC AP IPP11 M5 256 SG CEL DEP.",
  },
];

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

function endpointForCatalogKey(catalogKey) {
  return (
    `${SUPABASE_URL}/rest/v1/products` +
    `?catalog_key=eq.${encodeURIComponent(catalogKey)}`
  );
}

async function readRow(catalogKey) {
  const url =
    endpointForCatalogKey(catalogKey) +
    "&select=catalog_key,sku,ean,price,merchandise_id,shopify_variant_id";

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(
      `GET ${catalogKey} falhou: ${response.status} ${await response.text()}`
    );
  }

  const rows = await response.json();

  if (!Array.isArray(rows)) {
    throw new Error(`${catalogKey}: resposta Supabase invalida.`);
  }

  return rows;
}

console.log("");
console.log("===== PRE-VALIDACAO =====");

const backup = [];

for (const change of changes) {
  const rows = await readRow(change.catalogKey);

  if (rows.length !== 1) {
    throw new Error(
      `${change.catalogKey}: esperado 1 registo, encontrados ${rows.length}. NADA ALTERADO.`
    );
  }

  const row = rows[0];

  if ((row.sku ?? "").trim() !== change.oldSku) {
    throw new Error(
      `${change.catalogKey}: SKU atual diferente do esperado.\n` +
      `Esperado: ${change.oldSku}\n` +
      `Encontrado: ${row.sku}\n` +
      `NADA ALTERADO.`
    );
  }

  backup.push(row);

  console.log(
    `${change.catalogKey}: OK | ${change.oldSku} -> ${change.newSku}`
  );
}

const backupDir = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "shopify-price-reconcile",
  "sku-fix-backups"
);

fs.mkdirSync(backupDir, { recursive: true });

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-");

const backupPath = path.join(
  backupDir,
  `before-3-sku-fix-${timestamp}.json`
);

fs.writeFileSync(
  backupPath,
  JSON.stringify(backup, null, 2),
  "utf8"
);

console.log("");
console.log("Backup criado:");
console.log(backupPath);

console.log("");
console.log("===== APLICAR =====");

for (const change of changes) {
  const url = endpointForCatalogKey(change.catalogKey);

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      ...headers,
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      sku: change.newSku,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(
      `PATCH ${change.catalogKey} falhou: ` +
      `${response.status} ${await response.text()}`
    );
  }

  const updated = await response.json();

  if (!Array.isArray(updated) || updated.length !== 1) {
    throw new Error(
      `${change.catalogKey}: Supabase nao confirmou exatamente 1 registo atualizado.`
    );
  }

  console.log(
    `${change.catalogKey}: ${updated[0].sku}`
  );
}

console.log("");
console.log("===== VERIFICACAO FINAL =====");

let ok = 0;

for (const change of changes) {
  const rows = await readRow(change.catalogKey);

  if (
    rows.length === 1 &&
    (rows[0].sku ?? "").trim() === change.newSku
  ) {
    ok += 1;
    console.log(
      `OK ${change.catalogKey} | ${rows[0].sku}`
    );
  } else {
    console.log(
      `ERRO ${change.catalogKey}`
    );
  }
}

console.log("");
console.log(`Confirmados: ${ok}/3`);

if (ok !== 3) {
  throw new Error(
    "VERIFICACAO FINAL FALHOU. NAO CONTINUAR."
  );
}

console.log("");
console.log("===== 3 SKU CORRIGIDOS COM SUCESSO =====");
console.log("Shopify nao foi alterada.");
console.log("Precos nao foram alterados.");
console.log("Variant IDs nao foram alterados.");
