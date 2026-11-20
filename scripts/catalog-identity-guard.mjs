// IUMATEC: fail-closed identity checks for Shopify/Alltron/ALSO joins.
// Intentionally pure; no tokens, network access or writes.
export const QUARANTINED_PRODUCT_IDS = new Set([
  '15839516557696', '15841795211648', '15842680799616',
  '15842680439168', '15839405080960', '15841368113536',
  '15842034614656', '15637232157056', '15638027305344',
  '15637499707776', '15637984248192', '15842901655936',
  '15844318183808', '15844344496512', '15841447608704',
  '15841549386112', '15841796424064',
]);
const txt = value => String(value ?? '').trim();
const sku = value => txt(value).toUpperCase().replace(/\s+/g, ' ');
const ean = value => txt(value).replace(/\D/g, '');
// 12-digit UPC and equivalent 13-digit EAN with a leading zero represent the same GTIN.
export function gtinEquivalent(a, b) {
  const x = ean(a);
  const y = ean(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const lengths = new Set([8, 12, 13, 14]);
  return lengths.has(x.length) && lengths.has(y.length) &&
    x.padStart(14, '0') === y.padStart(14, '0');
}
const gid = value => txt(value).match(/(\d+)$/)?.[1] || '';

export function isQuarantinedShopifyProduct(id) {
  return QUARANTINED_PRODUCT_IDS.has(gid(id));
}

export function validateCatalogIdentity(expected, actual) {
  if (!expected || !actual) return { ok: false, reason: 'missing-record' };
  const productId = actual.productId || actual.shopifyProductId || actual?.product?.id;
  if (isQuarantinedShopifyProduct(productId)) {
    return { ok: false, reason: 'product-in-manual-quarantine' };
  }
  const expectedVariant = gid(expected.merchandiseId || expected.shopifyVariantId || expected.variantId || expected.shopify_variant_id || expected.merchandise_id);
  const actualVariant = gid(actual.variantId || actual.merchandiseId || actual.shopifyVariantId || actual.shopify_variant_id || actual.merchandise_id || actual.id);
  const expectedSku = sku(expected.sku);
  const actualSku = sku(actual.sku);
  const expectedEan = ean(expected.ean || expected.barcode || expected.gtin);
  const actualEans = [
    actual.barcode, actual.ean, actual.gtin,
    ...(Array.isArray(actual.barcodes?.nodes) ? actual.barcodes.nodes.map(b => b?.value) : []),
    ...(Array.isArray(actual.barcodes) ? actual.barcodes.map(b => typeof b === 'string' ? b : b?.value) : []),
  ].filter(Boolean);
  const eanMatched = Boolean(expectedEan) &&
    actualEans.some(value => gtinEquivalent(expectedEan, value));
  if (expectedVariant && expectedVariant !== actualVariant) return { ok: false, reason: 'variant-id-conflict' };
  if (expectedSku && expectedSku !== actualSku) return { ok: false, reason: 'sku-missing-or-conflict' };
  if (expectedEan && !eanMatched) return { ok: false, reason: 'ean-missing-or-conflict' };
  const evidence = [
    expectedSku && actualSku && expectedSku === actualSku ? 'sku' : '',
    eanMatched ? 'ean' : '',
  ].filter(Boolean);
  // An ID alone is not enough: stale Shopify variant links caused previous cross-item matches.
  if (evidence.length === 0) return { ok: false, reason: 'no-secondary-identity-evidence' };
  return { ok: true, reason: 'confirmed', evidence };
}
