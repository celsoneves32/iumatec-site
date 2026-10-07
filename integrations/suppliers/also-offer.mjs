import {
  normalizeSupplierOffer,
} from "./supplier-selector.mjs";

export function buildAlsoOffer(
  also = {},
  product = {},
) {
  return normalizeSupplierOffer({
    supplier: "also",

    supplierSku:
      also.productId || "",

    ean:
      product.ean || "",

    mpn:
      also.manufacturerPartNumber ||
      product.internalNumber ||
      product.mpn ||
      product.manufacturerPartNumber ||
      "",

    brand:
      product.brand || "",

    vatRate:
      product.vat,

    costNet:
      also.costNet,

    stock:
      also.stock,

    directShip: true,

    raw: {
      source: "also-safe-supplier-overlay",
      available:
        also.available === true,
      also,
    },
  });
}
