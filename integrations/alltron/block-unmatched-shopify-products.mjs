import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const APPLY = process.argv.includes("--apply");
const REPORT = path.join(ROOT, "integrations", "alltron", "out", "shopify-id-repair", "unmatched.json");
const BATCH_SIZE = 250;

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const pos = line.indexOf("=");
    if (pos < 1) continue;
    const key = line.slice(0, pos).trim();
    let value = line.slice(pos + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv(path.join(ROOT, ".env.local"));
loadEnv(path.join(ROOT, ".env"));

const url = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const key = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "");

function fail(message) { console.error(`\nERRO: ${message}`); process.exit(1); }
if (!fs.existsSync(REPORT)) fail(`Relatório não encontrado: ${REPORT}`);
if (!url) fail("Falta SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL.");
if (!key) fail("Falta SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY.");

const report = JSON.parse(fs.readFileSync(REPORT, "utf8"));
if (!Array.isArray(report)) fail("unmatched.json não contém uma lista.");
const catalogKeys = [...new Set(report.map((row) => String(row?.catalogKey || "").trim()).filter(Boolean))];

console.log(`\nProdutos sem correspondência no relatório: ${catalogKeys.length}`);
if (!APPLY) {
  console.log("Modo AUDITORIA: nada foi alterado.");
  console.log("Para aplicar, execute novamente com --apply.");
  process.exit(0);
}
if (catalogKeys.length === 0) fail("O relatório não contém catalogKeys.");
if (catalogKeys.length > 2000) fail(`Bloqueio de segurança: quantidade inesperada (${catalogKeys.length}).`);

let affected = 0;
for (let i = 0; i < catalogKeys.length; i += BATCH_SIZE) {
  const batch = catalogKeys.slice(i, i + BATCH_SIZE);
  const response = await fetch(`${url}/rest/v1/rpc/block_unmatched_shopify_products`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_catalog_keys: batch }),
  });
  if (!response.ok) fail(`Lote ${i / BATCH_SIZE + 1} falhou (${response.status}): ${(await response.text()).slice(0, 1000)}`);
  const count = Number(await response.json());
  affected += Number.isFinite(count) ? count : 0;
  console.log(`Lote ${i / BATCH_SIZE + 1}: ${count} produtos bloqueados`);
}

console.log(`\nCONCLUÍDO: ${affected} produtos marcados como indisponíveis.`);
console.log("Produtos apagados: 0");
