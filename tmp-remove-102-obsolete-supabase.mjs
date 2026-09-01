import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL nao encontrada.");
}

if (!SERVICE_KEY) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY nao encontrada. Cancelado por seguranca."
  );
}

const PLAN_PATH = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "shopify-price-reconcile",
  "invalid-486-action-plan.csv"
);

if (!fs.existsSync(PLAN_PATH)) {
  throw new Error(`Plano nao encontrado: ${PLAN_PATH}`);
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function readCsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8")
    .replace(/^\uFEFF/, "")
    .trim();

  const lines = text.split(/\r?\n/);

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);

    return Object.fromEntries(
      headers.map((header, index) => [
        header,
        values[index] ?? ""
      ])
    );
  });
}

const plan = readCsv(PLAN_PATH);

const obsolete = plan.filter(
  (row) => row.action === "REMOVE_SUPABASE_CANDIDATE"
);

console.log("");
console.log("===== PLANO =====");
console.log(`Total action plan: ${plan.length}`);
console.log(`Obsoletos previstos: ${obsolete.length}`);

if (plan.length !== 486) {
  throw new Error(
    `Action plan devia ter 486 registos. Tem ${plan.length}. CANCELADO.`
  );
}

if (obsolete.length !== 102) {
  throw new Error(
    `Esperava 102 obsoletos. Encontrei ${obsolete.length}. CANCELADO.`
  );
}

const catalogKeys = obsolete.map((row) => {
  const litm = String(row.litm ?? "").trim();

  if (!litm) {
    throw new Error("Existe obsoleto sem LITM. CANCELADO.");
  }

  return `litm:${litm}`;
});

const uniqueKeys = [...new Set(catalogKeys)];

if (uniqueKeys.length !== 102) {
  throw new Error(
    `Os 102 obsoletos nao possuem 102 catalog_keys unicos. CANCELADO.`
  );
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function fetchOne(catalogKey) {
  const url =
    `${SUPABASE_URL}/rest/v1/products` +
    `?catalog_key=eq.${encodeURIComponent(catalogKey)}` +
    `&select=*`;

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(
      `GET ${catalogKey} falhou: ${response.status} ${await response.text()}`
    );
  }

  return await response.json();
}

console.log("");
console.log("===== PRE-VALIDACAO DOS 102 =====");

const backupRows = [];

let checked = 0;

for (const catalogKey of uniqueKeys) {
  const rows = await fetchOne(catalogKey);

  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error(
      `${catalogKey}: esperado exatamente 1 registo Supabase, encontrados ${rows?.length ?? "?"}. CANCELADO.`
    );
  }

  const row = rows[0];

  const merchandiseId =
    String(row.merchandise_id ?? "").trim();

  const shopifyVariantId =
    String(row.shopify_variant_id ?? "").trim();

  if (merchandiseId || shopifyVariantId) {
    throw new Error(
      `${catalogKey}: possui Variant ID. CANCELADO POR SEGURANCA.\n` +
      `merchandise_id=${merchandiseId}\n` +
      `shopify_variant_id=${shopifyVariantId}`
    );
  }

  backupRows.push(row);

  checked++;

  if (
    checked % 20 === 0 ||
    checked === uniqueKeys.length
  ) {
    console.log(
      `Validados: ${checked}/${uniqueKeys.length}`
    );
  }
}

if (backupRows.length !== 102) {
  throw new Error(
    `Backup deveria conter 102 linhas. Tem ${backupRows.length}. CANCELADO.`
  );
}

console.log("");
console.log("102/102 confirmados:");
console.log("- existem no Supabase");
console.log("- sem merchandise_id");
console.log("- sem shopify_variant_id");

const backupDir = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "shopify-price-reconcile",
  "obsolete-backups"
);

fs.mkdirSync(backupDir, {
  recursive: true,
});

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-");

const backupPath = path.join(
  backupDir,
  `before-delete-102-${timestamp}.json`
);

fs.writeFileSync(
  backupPath,
  JSON.stringify(backupRows, null, 2),
  "utf8"
);

console.log("");
console.log("===== BACKUP =====");
console.log(backupPath);

console.log("");
console.log("===== APAGAR 102 =====");

let deleted = 0;

for (const catalogKey of uniqueKeys) {
  const url =
    `${SUPABASE_URL}/rest/v1/products` +
    `?catalog_key=eq.${encodeURIComponent(catalogKey)}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      ...headers,
      Prefer: "return=representation",
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(
      `DELETE ${catalogKey} falhou: ` +
      `${response.status} ${await response.text()}`
    );
  }

  const rows = await response.json();

  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error(
      `${catalogKey}: DELETE nao confirmou exatamente 1 registo.`
    );
  }

  deleted++;

  if (
    deleted % 20 === 0 ||
    deleted === uniqueKeys.length
  ) {
    console.log(
      `Eliminados: ${deleted}/${uniqueKeys.length}`
    );
  }
}

console.log("");
console.log("===== VERIFICAR QUE OS 102 SAIRAM =====");

let remaining = 0;

for (const catalogKey of uniqueKeys) {
  const rows = await fetchOne(catalogKey);

  if (Array.isArray(rows) && rows.length > 0) {
    remaining += rows.length;
    console.log(`AINDA EXISTE: ${catalogKey}`);
  }
}

console.log(`Restantes dos 102: ${remaining}`);

if (remaining !== 0) {
  throw new Error(
    "Ainda existem registos obsoletos. NAO CONTINUAR."
  );
}

console.log("");
console.log("===== CONTAR SUPABASE =====");

const countUrl =
  `${SUPABASE_URL}/rest/v1/products?select=catalog_key`;

const countResponse = await fetch(countUrl, {
  headers: {
    ...headers,
    Prefer: "count=exact",
    Range: "0-0",
  },
  signal: AbortSignal.timeout(30000),
});

if (!countResponse.ok) {
  throw new Error(
    `Contagem Supabase falhou: ${countResponse.status}`
  );
}

const contentRange =
  countResponse.headers.get("content-range") || "";

const match =
  contentRange.match(/\/(\d+)$/);

if (!match) {
  throw new Error(
    `Nao consegui interpretar Content-Range: ${contentRange}`
  );
}

const total = Number(match[1]);

console.log(`Supabase total agora: ${total}`);
console.log(`Esperado: 52146`);

if (total !== 52146) {
  throw new Error(
    `TOTAL INESPERADO: ${total}. Esperado 52146. NAO CONTINUAR.`
  );
}

console.log("");
console.log("========================================");
console.log("===== 102 OBSOLETOS REMOVIDOS OK =====");
console.log("========================================");
console.log(`Backup: ${backupPath}`);
console.log("Supabase: 52146 produtos");
console.log("Shopify nao foi alterada.");
console.log("Nao foi executado --apply.");
