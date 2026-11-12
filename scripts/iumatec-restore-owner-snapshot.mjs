// IUMATEC: restore an owner-only, PRIVATE Supabase snapshot in the GitHub Actions runner.
// This file is ephemeral, gitignored and used only to validate stock ownership.
import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
const BUCKET = 'iumatec-private-audit';
const OBJECT = 'stock-owner-map-v1.json.gz';
const URL = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const KEY = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '');
if (!URL.startsWith('https://') || !KEY || KEY.startsWith('sb_publishable_')) throw new Error('Missing server-only Supabase storage credentials.');
const auth = { apikey: KEY, ...(KEY.startsWith('eyJ') ? { Authorization: `Bearer ${KEY}` } : {}) };
const res = await fetch(`${URL}/storage/v1/object/authenticated/${BUCKET}/${OBJECT}`, { headers: { ...auth, 'cache-control': 'no-cache' } });
if (!res.ok) throw new Error('Private owner map fetch failed HTTP ' + res.status + ': ' + (await res.text()).slice(0, 450));
const gz = Buffer.from(await res.arrayBuffer());
if (gz.length > 20 * 1024 * 1024) throw new Error('Owner snapshot exceeds compressed size limit.');
const raw = gunzipSync(gz, { maxOutputLength: 80 * 1024 * 1024 });
const document = JSON.parse(raw.toString('utf8'));
if (document.schemaVersion !== 1 || !Array.isArray(document.rows) || document.rows.length < 200_000) throw new Error('Invalid owner snapshot schema/row count.');
const modifiedTime = Date.parse(document.masterModifiedAt || '');
if (!Number.isFinite(modifiedTime) || modifiedTime > Date.now() + 3600_000) throw new Error('Owner snapshot timestamp invalid.');
const ageDays = (Date.now() - modifiedTime) / 86400_000;
if (ageDays > 30) throw new Error(`Owner snapshot too old (${ageDays.toFixed(1)} days); refresh from trusted master.`);
let count = 0;
for (const row of document.rows) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Invalid owner row');
  if (typeof row.selectedStockSupplier !== 'string' || typeof row.litm !== 'string' || typeof row.sku !== 'string') throw new Error('Malformed owner data');
  if (row.selectedStockSupplier === 'alltron') count++;
}
if (count < 100_000 || count !== document.alltronOwners || document.rows.length !== document.masterRows) throw new Error('Owner snapshot quality controls failed.');
const target = path.join(process.cwd(), 'integrations', 'alltron', 'out', 'iumatec-master-catalog.json');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(document.rows));
console.log(`PRIVATE owner snapshot restored: ${document.rows.length} records, ${count} Alltron owners, age ${ageDays.toFixed(1)} days.`);
console.log('Audit-only owner map contains NO prices, stock values, descriptions or customer data.');