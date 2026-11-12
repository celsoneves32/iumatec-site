// IUMATEC: publish a minimal supplier-ownership snapshot to PRIVATE Supabase Storage.
// Writes only to Supabase Storage; never changes products, inventory or prices.
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const ROOT = process.cwd();
const MASTER = path.join(ROOT, 'integrations', 'alltron', 'out', 'iumatec-master-catalog.json');
const BUCKET = 'iumatec-private-audit';
const OBJECT = 'stock-owner-map-v1.json.gz';
const URL = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const KEY = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '');
if (!URL.startsWith('https://') || !KEY || KEY.startsWith('sb_publishable_')) {
  throw new Error('SUPABASE_URL and a server-only Supabase secret key are required.');
}
if (!fs.existsSync(MASTER)) throw new Error('Master catalog missing: ' + MASTER);
const stats = fs.statSync(MASTER);
if (Date.now() - stats.mtimeMs > 30 * 86400_000) throw new Error('Master catalog is older than 30 days: refresh locally before upload.');
console.log('Reading master locally (no upload of prices or descriptions)...');
const master = JSON.parse(fs.readFileSync(MASTER, 'utf8'));
if (!Array.isArray(master) || master.length < 200_000) throw new Error('Master catalog is missing or unexpectedly small.');
let alltronOwners = 0;
let knownOwners = 0;
const rows = master.map((r) => {
  if (!r || typeof r !== 'object' || Array.isArray(r)) throw new Error('Invalid master product row.');
  const selectedStockSupplier = String(r.selectedStockSupplier ?? '').trim().toLowerCase();
  const litm = String(r.litm ?? '').trim();
  const sku = String(r.sku ?? '').trim();
  if (selectedStockSupplier) knownOwners++;
  if (selectedStockSupplier === 'alltron') alltronOwners++;
  return { litm, sku, selectedStockSupplier };
});
if (alltronOwners < 100_000 || knownOwners < 200_000) throw new Error('Supplier ownership quality gate failed.');
const snapshot = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  masterModifiedAt: stats.mtime.toISOString(),
  masterRows: rows.length,
  alltronOwners,
  rows,
};
const compressed = gzipSync(Buffer.from(JSON.stringify(snapshot)), { level: 6 });
if (compressed.length > 18 * 1024 * 1024) throw new Error('Ownership snapshot unexpectedly large; refused upload.');
const auth = { apikey: KEY, ...(KEY.startsWith('eyJ') ? { Authorization: `Bearer ${KEY}` } : {}) };
const bucketEndpoint = `${URL}/storage/v1/bucket/${BUCKET}`;
async function check(res, label) {
  if (res.ok) return;
  const detail = (await res.text()).slice(0, 700);
  throw new Error(`${label} HTTP ${res.status}: ${detail}`);
}
let b = await fetch(bucketEndpoint, { headers: auth });
if (!b.ok) {
  // Supabase Storage can return HTTP 400 with a JSON statusCode of "404"
  // instead of HTTP 404 when the named bucket has not yet been created.
  const responseText = await b.clone().text();
  let body = {};
  try { body = JSON.parse(responseText); } catch {}
  const bucketMissing = b.status === 404 ||
    (b.status === 400 && String(body.statusCode ?? body.status ?? '') === '404'
      && String(body.message ?? '').toLowerCase().includes('bucket not found'));
  if (!bucketMissing) {
    throw new Error(`Check private bucket HTTP ${b.status}: ${responseText.slice(0, 700)}`);
  }
  console.log('Private bucket not found. Creating PRIVATE Supabase Storage bucket...');
  const created = await fetch(`${URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false, file_size_limit: 20 * 1024 * 1024 }),
  });
  await check(created, 'Create private bucket');
  b = await fetch(bucketEndpoint, { headers: auth });
}
await check(b, 'Check private bucket');
const bucket = await b.json();
if (bucket.public !== false) throw new Error('SECURITY: Storage bucket is not private. Upload refused.');
console.log(`Supplier rows: ${rows.length}; Alltron owners: ${alltronOwners}; payload: ${(compressed.length / 1024 / 1024).toFixed(2)} MB`);
const upload = await fetch(`${URL}/storage/v1/object/${BUCKET}/${OBJECT}`, {
  method: 'POST',
  headers: { ...auth, 'Content-Type': 'application/gzip', 'x-upsert': 'true', 'cache-control': 'no-cache' },
  body: compressed,
});
await check(upload, 'Upload private ownership map');
const download = await fetch(`${URL}/storage/v1/object/authenticated/${BUCKET}/${OBJECT}`, { headers: { ...auth, 'cache-control': 'no-cache' } });
await check(download, 'Verify private ownership map');
const roundtrip = Buffer.from(await download.arrayBuffer());
const hash = (b) => createHash('sha256').update(b).digest('hex');
if (hash(roundtrip) !== hash(compressed)) throw new Error('Ownership map upload verification failed (hash mismatch).');
console.log('SUCCESS: supplier ownership index verified in PRIVATE Supabase Storage; products and stock unchanged.');