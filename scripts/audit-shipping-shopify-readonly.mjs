// Read-only IUMATEC audit. Never modifies Shopify products, stock, price or delivery settings.
import fs from 'node:fs';
import path from 'node:path';

const domain = String(process.env.SHOPIFY_STORE_DOMAIN || '').replace(/^https?:\/\//i, '').replace(/\/$/, '');
const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const api = process.env.SHOPIFY_ADMIN_API_VERSION || '2026-10';
const reportDir = path.resolve('integrations/alltron/out/shipping-audit');
if (!domain || !token) throw new Error('Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN. Audit stopped; no changes made.');
if (!/^[a-z0-9.-]+$/i.test(domain)) throw new Error('Invalid Shopify domain');

const query = `query ShippingAudit($after: String) {
  products(first: 100, after: $after, query: "product_type:'TV & Home Cinema'") {
    pageInfo { hasNextPage endCursor }
    nodes {
      id title status productType
      variants(first: 20) {
        nodes { id sku inventoryItem { measurement { weight { value unit } } } }
      }
    }
  }
}`;

function potentiallyLargeTV(title) {
  const t = String(title || '');
  const isTV = /(?:\bTV\b|\bFernseher\b|\bOLED\b|\bQLED\b|\bLED-TV\b|\bMini-LED\b)/i.test(t);
  const m = t.match(/(?:^|\D)(\d{2,3})\s*(?:["”″]|Zoll\b|inch(?:es)?\b)/i);
  return isTV && Boolean(m) && Number(m[1]) >= 65 && Number(m[1]) <= 120;
}
function escapeCsv(x) { return `"${String(x ?? '').replace(/"/g, '""')}"`; }

async function getPage(cursor) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(`https://${domain}/admin/api/${api}/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({query, variables: {after: cursor}}),
    });
    if ([429, 500, 502, 503].includes(response.status) && attempt < 3) {
      await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1200));
      continue;
    }
    if (!response.ok) throw new Error(`Shopify GraphQL HTTP ${response.status}`);
    const json = await response.json();
    if (json.errors?.length) throw new Error(json.errors.map(e => e.message).join(' | '));
    if (!json.data?.products) throw new Error('Shopify products result missing');
    return json.data.products;
  }
  throw new Error('Shopify retries exceeded');
}

let cursor = null, pageCount = 0;
const products = [];
while (true) {
  const page = await getPage(cursor);
  products.push(...page.nodes);
  pageCount++;
  if (!page.pageInfo.hasNextPage) break;
  if (!page.pageInfo.endCursor || pageCount >= 100) throw new Error('Pagination safety stop');
  cursor = page.pageInfo.endCursor;
}

const zero = products.filter(p => p.variants.nodes.length === 0 || p.variants.nodes.every(v => Number(v.inventoryItem?.measurement?.weight?.value ?? 0) <= 0));
const risky = zero.filter(p => potentiallyLargeTV(p.title));
const report = {
  generatedAt: new Date().toISOString(),
  scope: "Shopify product_type:'TV & Home Cinema' (not full-store audit)",
  auditedProducts: products.length,
  productsWithoutPositiveWeight: zero.length,
  potentiallyOversizeWithoutWeight: risky.length,
  note: 'Potentially oversized is only a REVIEW signal. Gross transport weights and dimensions must be verified with supplier; this audit never changes product visibility.',
  needsReview: risky.map(p => ({id: p.id, title: p.title, status: p.status})),
};
fs.mkdirSync(reportDir, {recursive: true});
fs.writeFileSync(path.join(reportDir, 'latest.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(reportDir, 'review.csv'), 'shopify_product_id,title,status,reason\n' + risky.map(p => [p.id, p.title, p.status, 'large-tv-missing-shipping-weight'].map(escapeCsv).join(',')).join('\n') + '\n');
console.log(JSON.stringify({auditedProducts: products.length, zeroWeight: zero.length, potentialLargeTVs: risky.length, reportDir}, null, 2));
if (risky.length) console.log(`::warning::${risky.length} TVs may require Sperrgut but have no positive Shopify weight. Read report. No changes were made.`);
