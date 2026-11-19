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
  const actualEan = ean(actual.barcode || actual.ean || actual.gtin);
  if (expectedVariant && expectedVariant !== actualVariant) return { ok: false, reason: 'variant-id-conflict' };
  if (expectedSku && expectedSku !== actualSku) return { ok: false, reason: 'sku-missing-or-conflict' };
  if (expectedEan && expectedEan !== actualEan) return { ok: false, reason: 'ean-missing-or-conflict' };
  const evidence = [
    expectedSku && actualSku && expectedSku === actualSku ? 'sku' : '',
    expectedEan && actualEan && expectedEan === actualEan ? 'ean' : '',
  ].filter(Boolean);
  // An ID alone is not enough: stale Shopify variant links caused previous cross-item matches.
  if (evidence.length === 0) return { ok: false, reason: 'no-secondary-identity-evidence' };
  return { ok: true, reason: 'confirmed', evidence };
}
