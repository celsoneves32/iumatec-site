// IUMATEC: conservatively classify shipping for new Shopify catalogue imports.
// This module does not write prices, inventory, delivery profiles, or orders.
export const freightTag = 'IUMATEC-SPERRGUT';
export const FREIGHT_KG = 30;
export const FREIGHT_M3 = 0.55;

function positiveNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(typeof value === 'string' ? value.trim().replace(',', '.') : value);
  return Number.isFinite(n) && n > 0 && n <= 5000 ? n : null;
}
function packagedWeight(p) {
  for (const k of [
    'shippingWeightKg', 'shipping_weight_kg', 'packagedWeightKg',
    'packageWeightKg', 'packagingWeightKg', 'grossWeightKg', 'transportWeightKg',
  ]) {
    const n = positiveNumber(p?.[k]);
    if (n !== null) return n;
  }
  return null;
}
function packageVolume(p) {
  const sets = [
    ['packageLengthCm', 'packageWidthCm', 'packageHeightCm'],
    ['packagingLengthCm', 'packagingWidthCm', 'packagingHeightCm'],
    ['shippingLengthCm', 'shippingWidthCm', 'shippingHeightCm'],
  ];
  for (const keys of sets) {
    const values = keys.map(k => positiveNumber(p?.[k]));
    if (values.every(x => x !== null)) return values[0] * values[1] * values[2] / 1e6;
  }
  const obj = p?.packageDimensionsCm || p?.packagingDimensionsCm;
  if (obj && typeof obj === 'object') {
    const values = [obj.length, obj.width, obj.height].map(positiveNumber);
    if (values.every(x => x !== null)) return values[0] * values[1] * values[2] / 1e6;
  }
  return null;
}
function suspiciousOversize(p) {
  const title = String(p?.fullTitle || p?.title || '');
  const category = String(p?.iumatecCategory?.sub || p?.category?.sub || p?.subcategory || p?.productType || '');
  const hay = `${title} ${category}`;
  const television = /\b(?:TV|fernseher|televisor|oled|qled|mini.?led|led-tv)\b/i.test(hay);
  const size = hay.match(/\b(\d{2,3})\s*(?:["”″]|zoll\b|inch(?:es)?\b)/i);
  if (television && size && Number(size[1]) >= 65) return true;
  return /(?:waschmaschine|waeschetrockner|wäschetrockner|geschirrspüler|kühlschrank|kuehlschrank|gefrierschrank|tiefkühler|laufband|kraftstation|fitnessgerät|klimaanlage|wärmepumpe|waermepumpe|sofa|matratze|schreibtisch|kleiderschrank|grossgerät|großgerät)/i.test(hay);
}
export function assessShipping(p) {
  const packed = packagedWeight(p);
  const catalogWeight = positiveNumber(p?.weight);
  const volume = packageVolume(p);
  const mass = packed ?? catalogWeight;
  if (!mass) return {status:'REVIEW', freight:false, reason:'missing-or-invalid-weight', weightKg:null, volumeM3:volume};
  if (packed !== null && catalogWeight !== null && packed + 0.01 < catalogWeight)
    return {status:'REVIEW', freight:false, reason:'packaged-weight-below-product-weight', weightKg:packed, volumeM3:volume};
  if (volume !== null && (volume <= 0 || volume > 50))
    return {status:'REVIEW', freight:false, reason:'implausible-package-volume', weightKg:mass, volumeM3:volume};
  if (mass >= FREIGHT_KG || (volume !== null && volume > FREIGHT_M3))
    return {status:'SAFE', freight:true, reason:mass >= FREIGHT_KG ? 'weight-at-least-30kg' : 'packaged-volume-over-0.55m3', weightKg:mass, volumeM3:volume};
  if (suspiciousOversize(p) && volume === null)
    return {status:'REVIEW', freight:false, reason:'oversize-without-packaged-data', weightKg:mass, volumeM3:volume};
  return {status:'SAFE',freight:false,reason:'standard-eligible',weightKg:mass,volumeM3:volume};
}
export function weightForShopify(p) {
  const result = assessShipping(p);
  if (result.status !== 'SAFE') throw new Error(`Shipping safety gate: ${result.reason}`);
  return result.weightKg;
}
