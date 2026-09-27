import { normalizeSupplierOffer } from "./supplier-selector.mjs";

export function buildAlltronOffer(product = {}) {
  return normalizeSupplierOffer({
    supplier: "alltron",

    supplierSku:
      product.litm ||
      product.alltronSku ||
      product.sku ||
      "",

    ean: product.ean || "",
    mpn:
      product.mpn ||
      product.manufacturerPartNumber ||
      product.partNumber ||
      "",

    brand: product.brand || "",

    vatRate: product.vat,

    // Mantemos exatamente a semântica financeira atual:
    // EXPR = custo líquido
    // INPR = custo incluindo IVA
    costNet: product.expr,
    costGross: product.inpr,

    stock:
      product.stockQty ??
      product.stock ??
      product.quantity ??
      0,

    directShip: false,

    raw: null,
  });
}
