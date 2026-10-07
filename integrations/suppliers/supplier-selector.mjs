const DEFAULT_POLICY = Object.freeze({
  preferredSupplier: "also",
  maxPreferredCostPremiumRate: 0.02,
  maxPreferredCostPremiumChf: 10.0,
});

function text(value) {
  return String(value ?? "").trim();
}

function number(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(
    String(value)
      .trim()
      .replace(",", "."),
  );

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function positive(value) {
  const parsed = number(value);

  return parsed !== null && parsed > 0
    ? parsed
    : null;
}

function normalizeVatRate(value) {
  const parsed = number(value);

  if (!(parsed > 0)) return 0.081;

  return parsed > 1
    ? parsed / 100
    : parsed;
}

function normalizeStock(value) {
  const parsed = number(value);

  if (parsed === null) return 0;

  return Math.max(
    0,
    Math.trunc(parsed),
  );
}

export function normalizeSupplierOffer(
  input = {},
) {
  const supplier =
    text(input.supplier).toLowerCase();

  const vatRate =
    normalizeVatRate(input.vatRate);

  let costNet = positive(
    input.costNet ??
    input.purchaseCostNet,
  );

  let costGross = positive(
    input.costGross ??
    input.purchaseCostInclVat,
  );

  if (!costNet && costGross) {
    costNet =
      costGross / (1 + vatRate);
  }

  if (!costGross && costNet) {
    costGross =
      costNet * (1 + vatRate);
  }

  const shippingCostNet =
    positive(input.shippingCostNet) || 0;

  const handlingCostNet =
    positive(input.handlingCostNet) || 0;

  const stock =
    normalizeStock(input.stock);

  const effectiveCostNet =
    costNet > 0
      ? costNet +
        shippingCostNet +
        handlingCostNet
      : 0;

  return {
    supplier,

    supplierSku:
      text(input.supplierSku),

    ean:
      text(input.ean),

    mpn:
      text(input.mpn),

    brand:
      text(input.brand),

    vatRate:
      Number(vatRate.toFixed(4)),

    costNet:
      costNet > 0
        ? Number(costNet.toFixed(2))
        : 0,

    costGross:
      costGross > 0
        ? Number(costGross.toFixed(2))
        : 0,

    shippingCostNet:
      Number(
        shippingCostNet.toFixed(2),
      ),

    handlingCostNet:
      Number(
        handlingCostNet.toFixed(2),
      ),

    effectiveCostNet:
      effectiveCostNet > 0
        ? Number(
            effectiveCostNet.toFixed(2),
          )
        : 0,

    stock,

    available:
      stock > 0,

    directShip:
      input.directShip === true,

    deliveryDays:
      number(input.deliveryDays),

    raw:
      input.raw ?? null,
  };
}

function rankStockOffers(
  offers,
  policy,
) {
  return [...offers].sort(
    (a, b) => {
      if (
        a.directShip !== b.directShip
      ) {
        return a.directShip
          ? -1
          : 1;
      }

      if (
        a.supplier ===
          policy.preferredSupplier &&
        b.supplier !==
          policy.preferredSupplier
      ) {
        return -1;
      }

      if (
        b.supplier ===
          policy.preferredSupplier &&
        a.supplier !==
          policy.preferredSupplier
      ) {
        return 1;
      }

      if (a.stock !== b.stock) {
        return b.stock - a.stock;
      }

      return a.supplier.localeCompare(
        b.supplier,
      );
    },
  );
}

export function selectSupplier(
  offers = [],
  policyOverrides = {},
) {
  const policy = {
    ...DEFAULT_POLICY,
    ...policyOverrides,
  };

  /*
   * IMPORTANTE:
   * uma oferta pode ser válida para stock
   * mesmo quando ainda não existe um custo
   * suficientemente seguro para pricing.
   */
  const normalized = offers
    .map(normalizeSupplierOffer)
    .filter(
      (offer) =>
        Boolean(offer.supplier),
    );

  if (!normalized.length) {
    return {
      selectedSupplier: "",
      selectedSupplierSku: "",

      selectedPurchaseCostNet: 0,
      selectedPurchaseCostInclVat: 0,
      selectedEffectiveCostNet: 0,

      selectedStock: 0,
      selectedStockSupplier: "",
      selectedStockSupplierSku: "",

      selectedDirectShip: false,

      selectionReason:
        "no-supplier-offer",

      supplierOffers: [],
    };
  }

  /*
   * STOCK é avaliado independentemente
   * do custo.
   */
  const stockCandidates =
    normalized.filter(
      (offer) =>
        offer.stock > 0,
    );

  const stockSelection =
    rankStockOffers(
      stockCandidates,
      policy,
    )[0] || null;

  /*
   * PRICING exige custo válido.
   */
  const costQualified =
    normalized.filter(
      (offer) =>
        offer.costNet > 0,
    );

  /*
   * Podemos conhecer stock sem conhecer
   * ainda um custo seguro.
   *
   * Nesse caso preservamos a disponibilidade,
   * mas NÃO escolhemos fornecedor de pricing.
   */
  if (!costQualified.length) {
    return {
      selectedSupplier: "",
      selectedSupplierSku: "",

      selectedPurchaseCostNet: 0,
      selectedPurchaseCostInclVat: 0,
      selectedEffectiveCostNet: 0,

      selectedStock:
        stockSelection?.stock || 0,

      selectedStockSupplier:
        stockSelection?.supplier || "",

      selectedStockSupplierSku:
        stockSelection?.supplierSku || "",

      selectedDirectShip: false,

      selectionReason:
        stockSelection
          ? "stock-only-no-valid-cost"
          : "no-valid-supplier-cost",

      supplierOffers:
        normalized.map(
          (offer) => ({
            supplier:
              offer.supplier,

            supplierSku:
              offer.supplierSku,

            costNet:
              offer.costNet,

            costGross:
              offer.costGross,

            effectiveCostNet:
              offer.effectiveCostNet,

            stock:
              offer.stock,

            directShip:
              offer.directShip,

            deliveryDays:
              offer.deliveryDays,
          }),
        ),
    };
  }

  /*
   * Para escolher fornecedor de pricing,
   * se houver algum com stock, fornecedores
   * esgotados ficam fora da seleção.
   */
  const availableCostQualified =
    costQualified.filter(
      (offer) =>
        offer.stock > 0,
    );

  const pool =
    availableCostQualified.length > 0
      ? availableCostQualified
      : costQualified;

  const ranked = [...pool].sort(
    (a, b) => {
      const costDifference =
        a.effectiveCostNet -
        b.effectiveCostNet;

      if (
        Math.abs(costDifference) >
        0.001
      ) {
        return costDifference;
      }

      if (
        a.directShip !== b.directShip
      ) {
        return a.directShip
          ? -1
          : 1;
      }

      if (
        a.supplier ===
          policy.preferredSupplier &&
        b.supplier !==
          policy.preferredSupplier
      ) {
        return -1;
      }

      if (
        b.supplier ===
          policy.preferredSupplier &&
        a.supplier !==
          policy.preferredSupplier
      ) {
        return 1;
      }

      return a.supplier.localeCompare(
        b.supplier,
      );
    },
  );

  const cheapest =
    ranked[0];

  const preferred =
    pool.find(
      (offer) =>
        offer.supplier ===
        policy.preferredSupplier,
    );

  let selected =
    cheapest;

  let selectionReason =
    availableCostQualified.length > 0
      ? "lowest-effective-cost-in-stock"
      : "lowest-effective-cost-out-of-stock";

  if (
    preferred &&
    preferred.supplier !==
      cheapest.supplier
  ) {
    const premium =
      preferred.effectiveCostNet -
      cheapest.effectiveCostNet;

    const premiumRate =
      cheapest.effectiveCostNet > 0
        ? premium /
          cheapest.effectiveCostNet
        : Infinity;

    const withinChfLimit =
      premium <=
      policy.maxPreferredCostPremiumChf;

    const withinRateLimit =
      premiumRate <=
      policy.maxPreferredCostPremiumRate;

    if (
      premium >= 0 &&
      withinChfLimit &&
      withinRateLimit
    ) {
      selected =
        preferred;

      selectionReason =
        "preferred-supplier-within-cost-tolerance";
    }
  }

  if (
    selected.supplier ===
      cheapest.supplier &&
    selected.directShip &&
    selected.effectiveCostNet ===
      cheapest.effectiveCostNet
  ) {
    selectionReason =
      "lowest-cost-direct-ship";
  }

  /*
   * STOCK OWNERSHIP:
   * quando existe fornecedor selecionado para pricing/compra,
   * o stock publicado pertence sempre a esse mesmo fornecedor.
   * Nunca usamos stock de outro fornecedor.
   */
  const finalStockSelection = selected;

  return {
    selectedSupplier:
      selected.supplier,

    selectedSupplierSku:
      selected.supplierSku,

    selectedPurchaseCostNet:
      selected.costNet,

    selectedPurchaseCostInclVat:
      selected.costGross,

    selectedEffectiveCostNet:
      selected.effectiveCostNet,

    selectedStock:
      finalStockSelection?.stock || 0,

    selectedStockSupplier:
      finalStockSelection?.supplier || "",

    selectedStockSupplierSku:
      finalStockSelection?.supplierSku || "",

    selectedDirectShip:
      selected.directShip,

    selectionReason,

    supplierOffers:
      normalized.map(
        (offer) => ({
          supplier:
            offer.supplier,

          supplierSku:
            offer.supplierSku,

          costNet:
            offer.costNet,

          costGross:
            offer.costGross,

          effectiveCostNet:
            offer.effectiveCostNet,

          stock:
            offer.stock,

          directShip:
            offer.directShip,

          deliveryDays:
            offer.deliveryDays,
        }),
      ),
  };
}

export const SUPPLIER_POLICY =
  DEFAULT_POLICY;
