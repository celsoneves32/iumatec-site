function text(value) {
  return String(value ?? "").trim();
}

function number(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return Number(number(value).toFixed(2));
}

export const ALLTRON_REVALIDATION_POLICY = {
  enabled: true,

  /*
   * Segurança:
   * qualquer aumento real do custo líquido
   * bloqueia a Purchase Order.
   *
   * CHF 0.005 serve apenas para ignorar
   * diferenças de representação/rounding.
   */
  maxCostIncrease: 0.005,

  networkCalls: false,
  supplierWrites: false,
  shopifyWrites: false,
  stockWrites: false,
  paymentActions: false,
};

export function revalidateAlltronPurchase(
  supplierAdapter,
  snapshot,
) {
  const validationErrors = [];
  const itemResults = [];

  if (!supplierAdapter) {
    return {
      status: "BLOCKED",
      validationErrors: [
        "missing-supplier-adapter",
      ],
      items: [],
    };
  }

  if (
    supplierAdapter.supplier !== "alltron"
  ) {
    validationErrors.push(
      `invalid-supplier:${
        supplierAdapter.supplier || "none"
      }`,
    );
  }

  if (
    supplierAdapter.status !==
    "READY_FOR_ALLTRON_DRY_RUN"
  ) {
    validationErrors.push(
      `invalid-source-status:${
        supplierAdapter.status || "none"
      }`,
    );
  }

  if (
    !snapshot ||
    snapshot.schemaVersion !== 1 ||
    !snapshot.byLitm ||
    typeof snapshot.byLitm !== "object"
  ) {
    validationErrors.push(
      "invalid-alltron-purchase-snapshot",
    );
  }

  const adapterItems =
    Array.isArray(supplierAdapter.items)
      ? supplierAdapter.items
      : [];

  if (!adapterItems.length) {
    validationErrors.push(
      "missing-items",
    );
  }

  for (const item of adapterItems) {
    const itemErrors = [];

    const litm = text(
      item.litm ||
      item.articleNumber,
    );

    const quantity =
      Math.trunc(number(item.quantity));

    const expectedEan =
      text(item.ean);

    const plannedCostNet =
      money(item.costNetUnit);

    if (!litm) {
      itemErrors.push(
        "missing-litm",
      );
    }

    if (!(quantity > 0)) {
      itemErrors.push(
        "invalid-quantity",
      );
    }

    if (!(plannedCostNet > 0)) {
      itemErrors.push(
        "invalid-planned-cost-net",
      );
    }

    const current =
      litm &&
      snapshot?.byLitm
        ? snapshot.byLitm[litm]
        : null;

    if (!current) {
      itemErrors.push(
        "product-not-found-in-current-snapshot",
      );
    }

    const currentEan =
      text(current?.ean);

    const currentStock =
      Math.max(
        0,
        Math.trunc(
          number(current?.stock),
        ),
      );

    const currentCostNet =
      money(current?.costNet);

    const currentCostGross =
      money(current?.costGross);

    if (
      current &&
      expectedEan &&
      currentEan &&
      expectedEan !== currentEan
    ) {
      itemErrors.push(
        `ean-mismatch:${expectedEan}->${currentEan}`,
      );
    }

    if (
      current &&
      current?.available !== true
    ) {
      itemErrors.push(
        "supplier-not-available",
      );
    }

    if (
      current &&
      currentStock < quantity
    ) {
      itemErrors.push(
        `insufficient-current-stock:${currentStock}<${quantity}`,
      );
    }

    if (
      current &&
      !(currentCostNet > 0)
    ) {
      itemErrors.push(
        "invalid-current-cost-net",
      );
    }

    const costIncrease =
      currentCostNet > 0 &&
      plannedCostNet > 0
        ? money(
            currentCostNet -
            plannedCostNet,
          )
        : 0;

    if (
      current &&
      currentCostNet >
        plannedCostNet +
          ALLTRON_REVALIDATION_POLICY
            .maxCostIncrease
    ) {
      itemErrors.push(
        `current-cost-increased:${plannedCostNet}->${currentCostNet}`,
      );
    }

    itemResults.push({
      lineNumber:
        item.lineNumber ?? null,

      litm,
      ean: expectedEan,

      quantity,

      planned: {
        costNetUnit:
          plannedCostNet,

        costGrossUnit:
          money(
            item.costGrossUnit,
          ),

        previousStock:
          Math.max(
            0,
            Math.trunc(
              number(
                item.availableStock,
              ),
            ),
          ),
      },

      current: current
        ? {
            ean: currentEan,
            costNetUnit:
              currentCostNet,
            costGrossUnit:
              currentCostGross,
            stock:
              currentStock,
            available:
              current.available === true,
          }
        : null,

      costDifference:
        costIncrease,

      status:
        itemErrors.length
          ? "BLOCKED"
          : "REVALIDATED",

      validationErrors:
        itemErrors,
    });

    for (const error of itemErrors) {
      validationErrors.push(
        `item=${item.lineNumber ?? "?"}:${error}`,
      );
    }
  }

  const status =
    validationErrors.length
      ? "BLOCKED"
      : "REVALIDATED_FOR_ALLTRON_DRY_RUN";

  return {
    schemaVersion: 1,

    purchaseOrderRef:
      supplierAdapter.purchaseOrderRef,

    supplier: "alltron",

    sourceStatus:
      supplierAdapter.status,

    status,

    snapshot: {
      generatedAt:
        snapshot?.generatedAt ?? null,

      source:
        snapshot?.source ?? null,
    },

    itemCount:
      itemResults.length,

    items:
      itemResults,

    validationErrors,

    safety: {
      networkCalls: false,
      supplierWrites: false,
      shopifyWrites: false,
      stockWrites: false,
      fulfillmentWrites: false,
      paymentActions: false,
    },
  };
}