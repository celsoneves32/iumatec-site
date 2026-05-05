type ProductLike = {
  inStock?: boolean;
  stockQty?: number;
};

export function getStockStatus(product: ProductLike) {
  const qty = product.stockQty ?? 0;
  const inStock = Boolean(product.inStock) || qty > 0;

  if (!inStock || qty <= 0) {
    return {
      label: "Nicht verfügbar",
      shortLabel: "Nicht verfügbar",
      color: "text-red-600",
      badgeClass: "bg-red-50 text-red-700 ring-1 ring-red-200",
    };
  }

  if (qty <= 3) {
    return {
      label: `${qty} Stück verfügbar`,
      shortLabel: "Knapp verfügbar",
      color: "text-amber-600",
      badgeClass: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    };
  }

  return {
    label: `${qty} Stück verfügbar`,
    shortLabel: "Sofort verfügbar",
    color: "text-green-600",
    badgeClass: "bg-green-50 text-green-700 ring-1 ring-green-200",
  };
}