// IUMATEC: read-only monitor for the PRIVATE supplier ownership map.
// NEVER updates the snapshot, product catalog, inventory or prices.
// A new master must be reconstructed from verified Alltron + ALSO sources.
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';

const BUCKET = 'iumatec-private-audit';
const OBJECT = 'stock-owner-map-v1.json.gz';
const ISSUE_TITLE = '[IUMATEC] Renovar mapa privado de fornecedores';
const WARN_DAYS = 14;
const ISSUE_DAYS = 20;
const EXPIRE_DAYS = 30;
const DAY = 86_400_000;
const SUPABASE_URL = String(process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
const SUPABASE_SECRET_KEY = String(process.env.SUPABASE_SECRET_KEY || '').trim();
const GH_TOKEN = String(process.env.GH_TOKEN || '').trim();
const REPO = String(process.env.GITHUB_REPOSITORY || '').trim();

if (!SUPABASE_URL.startsWith('https://') || !SUPABASE_SECRET_KEY || SUPABASE_SECRET_KEY.startsWith('sb_publishable_')) {
  throw new Error('Faltam credenciais servidor Supabase vÃ¡lidas; nenhuma alteraÃ§Ã£o efetuada.');
}
if (!GH_TOKEN || !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(REPO)) {
  throw new Error('GitHub token/repositÃ³rio em falta; nenhuma alteraÃ§Ã£o efetuada.');
}

const supabaseHeaders = {
  apikey: SUPABASE_SECRET_KEY,
  ...(SUPABASE_SECRET_KEY.startsWith('eyJ') ? { Authorization: `Bearer ${SUPABASE_SECRET_KEY}` } : {}),
  'cache-control': 'no-cache',
};
const storageUrl = `${SUPABASE_URL}/storage/v1/object/authenticated/${BUCKET}/${OBJECT}`;
const response = await fetch(storageUrl, { headers: supabaseHeaders });
if (!response.ok) throw new Error(`Mapa privado nÃ£o disponÃ­vel: HTTP ${response.status}`);
const gz = Buffer.from(await response.arrayBuffer());
if (gz.length > 20 * 1024 * 1024) throw new Error('Mapa privado comprimido excede 20 MB.');
const raw = gunzipSync(gz, { maxOutputLength: 80 * 1024 * 1024 });
const data = JSON.parse(raw.toString('utf8'));
if (data.schemaVersion !== 1 || !Array.isArray(data.rows) || data.rows.length < 200_000) {
  throw new Error('Mapa privado invÃ¡lido: formato ou nÃºmero de produtos inesperado.');
}
let alltronOwners = 0;
for (const row of data.rows) {
  if (!row || typeof row.litm !== 'string' || typeof row.sku !== 'string' || typeof row.selectedStockSupplier !== 'string') {
    throw new Error('Mapa privado invÃ¡lido: linha incompleta.');
  }
  if (row.selectedStockSupplier === 'alltron') alltronOwners++;
}
if (data.masterRows !== data.rows.length || data.alltronOwners !== alltronOwners || alltronOwners < 100_000) {
  throw new Error('Mapa privado invÃ¡lido: dados de controlo inconsistentes.');
}
const sourceTime = Date.parse(String(data.masterModifiedAt || ''));
if (!Number.isFinite(sourceTime) || sourceTime > Date.now() + 60 * 60 * 1000) {
  throw new Error('Data da origem do mapa invÃ¡lida.');
}
const ageDays = (Date.now() - sourceTime) / DAY;
const sourceDate = new Date(sourceTime).toISOString().slice(0, 10);
const age = ageDays.toFixed(1);
const msg = `Mapa IUMATEC: ${data.masterRows} produtos, ${alltronOwners} Alltron; catÃ¡logo fonte de ${sourceDate}; ${age} dias de idade.`;
console.log(msg);

const ghHeaders = {
  Authorization: `Bearer ${GH_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
};
const api = `https://api.github.com/repos/${REPO}`;
async function github(path, options = {}) {
  const r = await fetch(api + path, { ...options, headers: ghHeaders });
  if (!r.ok) throw new Error(`GitHub API ${path}: HTTP ${r.status}; ${(await r.text()).slice(0, 250)}`);
  return r.json();
}
// Avoid duplicates. The endpoint includes both issues and PRs; filter pull_request out.
const existing = await github('/issues?state=all&per_page=100');
const issue = existing.find(v => !v.pull_request && v.title === ISSUE_TITLE);
if (ageDays >= ISSUE_DAYS) {
  const body = [
    '## Mapa de fornecedores a renovar',
    '',
    `A fonte do mapa privado da IUMATEC foi atualizada pela Ãºltima vez em **${sourceDate}** (${age} dias).`,
    `A auditoria bloqueia mapas com mais de ${EXPIRE_DAYS} dias.`,
    '',
    '**NÃ£o renovar apenas a data do mapa antigo.** Ã‰ necessÃ¡rio reconstruir o catÃ¡logo mestre com dados atuais da Alltron e da ALSO, validar os fornecedores selecionados, e depois executar o uploader privado `scripts/iumatec-upload-owner-snapshot.mjs` com credenciais locais.',
    '',
    'A rotina automÃ¡tica de preÃ§os e stock deve permanecer desativada atÃ© essa validaÃ§Ã£o.',
    '',
    `RelatÃ³rio: ${data.masterRows} registos / ${alltronOwners} fornecedores Alltron.`,
  ].join('\n');
  if (!issue) {
    const created = await github('/issues', { method: 'POST', body: JSON.stringify({ title: ISSUE_TITLE, body }) });
    console.log(`AVISO: issue #${created.number} criado para renovar mapa privado.`);
  } else if (issue.state === 'closed') {
    await github(`/issues/${issue.number}`, { method: 'PATCH', body: JSON.stringify({ state: 'open', body }) });
    console.log(`AVISO: issue #${issue.number} reaberto (mapa desatualizado).`);
  } else {
    console.log(`AVISO: issue #${issue.number} jÃ¡ estÃ¡ aberto, sem duplicar.`);
  }
  console.log(`::warning::Mapa privado precisa de renovaÃ§Ã£o: ${age} dias.`);
} else {
  if (issue && issue.state === 'open') {
    await github(`/issues/${issue.number}`, { method: 'PATCH', body: JSON.stringify({ state: 'closed', state_reason: 'completed' }) });
    console.log(`Issue #${issue.number} fechado: fonte do mapa dentro do prazo.`);
  }
  if (ageDays >= WARN_DAYS) console.log(`::warning::Mapa privado com ${age} dias: preparar renovaÃ§Ã£o a partir de dados atuais.`);
  else console.log('Mapa privado dentro do prazo de seguranÃ§a.');
}
const summary = process.env.GITHUB_STEP_SUMMARY;
if (summary) {
  fs.appendFileSync(summary, `## IUMATEC â€” validade do mapa privado\n\n${msg}\n\n**Estado:** ${ageDays >= ISSUE_DAYS ? 'RenovaÃ§Ã£o necessÃ¡ria' : 'Dentro do prazo'}\n\nNenhum preÃ§o, stock ou produto foi alterado.\n`);
}
if (ageDays > EXPIRE_DAYS) throw new Error(`Mapa privado expirado (${age} dias). Manter sincronizaÃ§Ã£o real BLOQUEADA.`);