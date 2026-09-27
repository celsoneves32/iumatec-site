const EXPECTED_SUPPLIER = "alltron";
const EXPECTED_STATUS = "READY_FOR_SUPPLIER_ADAPTER";

function text(value) {
  return String(value ?? "").trim();
}

function number(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function integer(value) {
  return Math.max(
    0,
    Math.trunc(number(value)),
  );
}

function money(value) {
  return Math.round(
    (number(value) + Number.EPSILON) * 100,
  ) / 100;
}

export function prepareAlltronSubmission(
  submission = {},
) {
  const validationErrors = [];

  const purchaseOrderRef =
    text(submission.purchaseOrderRef);

  const supplier =
    text(submission.supplier).toLowerCase();

  const sourceStatus =
    text(submission.status);

  const sourceItems =
    Array.isArray(submission.items)
      ? submission.items
      : [];

  if (!purchaseOrderRef) {
    validationErrors.push(
      "missing-purchase-order-ref",
    );
  }

  if (supplier !== EXPECTED_SUPPLIER) {
    validationErrors.push(
      `supplier-must-be-${EXPECTED_SUPPLIER}`,
    );
  }

  if (sourceStatus !== EXPECTED_STATUS) {
    validationErrors.push(
      `status-must-be-${EXPECTED_STATUS}`,
    );
  }

  if (!sourceItems.length) {
    validationErrors.push(
      "purchase-order-has-no-items",
    );
  }

  const items = sourceItems.map(
    (item, index) => {
      const lineNumber = index + 1;

      const quantity =
        integer(item.quantity);

      const supplierSku =
        text(
          item.supplierSku ||
          item.litm,
        );

      const litm =
        text(
          item.litm ||
          item.supplierSku,
        );

      const ean =
        text(item.ean);

      const supplierStock =
        integer(item.supplierStock);

      const costNetUnit =
        money(item.costNetUnit);

      const costGrossUnit =
        money(item.costGrossUnit);

      if (quantity <= 0) {
        validationErrors.push(
          `item-${lineNumber}:invalid-quantity`,
        );
      }

      if (!supplierSku) {
        validationErrors.push(
          `item-${lineNumber}:missing-alltron-sku`,
        );
      }

      if (supplierStock < quantity) {
        validationErrors.push(
          `item-${lineNumber}:insufficient-alltron-stock`,
        );
      }

      if (costNetUnit <= 0) {
        validationErrors.push(
          `item-${lineNumber}:invalid-cost-net`,
        );
      }

      return {
        lineNumber,

        articleNumber:
          supplierSku,

        litm,

        ean,

        description:
          text(item.title),

        quantity,

        availableStock:
          supplierStock,

        directShip:
          Boolean(item.directShip),

        costNetUnit,

        costGrossUnit,

        lineCostNet:
          money(
            costNetUnit *
            quantity,
          ),

        lineCostGross:
          money(
            costGrossUnit *
            quantity,
          ),

        sourceSelectionReason:
          text(
            item.selectionReason,
          ),
      };
    },
  );

  const calculatedNet =
    money(
      items.reduce(
        (sum, item) =>
          sum + item.lineCostNet,
        0,
      ),
    );

  const calculatedGross =
    money(
      items.reduce(
        (sum, item) =>
          sum + item.lineCostGross,
        0,
      ),
    );

  const declaredNet =
    money(
      submission.purchaseCostNet,
    );

  const declaredGross =
    money(
      submission.purchaseCostGross,
    );

  if (
    declaredNet > 0 &&
    Math.abs(
      declaredNet -
      calculatedNet,
    ) > 0.011
  ) {
    validationErrors.push(
      "purchase-cost-net-mismatch",
    );
  }

  if (
    declaredGross > 0 &&
    Math.abs(
      declaredGross -
      calculatedGross,
    ) > 0.011
  ) {
    validationErrors.push(
      "purchase-cost-gross-mismatch",
    );
  }

  const ready =
    validationErrors.length === 0;

  return {
    schemaVersion: 1,

    adapter:
      "alltron",

    purchaseOrderRef,

    supplier,

    sourceStatus,

    status:
      ready
        ? "READY_FOR_ALLTRON_DRY_RUN"
        : "BLOCKED",

    dispatchMode:
      text(
        submission.dispatchMode,
      ),

    directShip:
      Boolean(
        submission.directShip,
      ),

    itemCount:
      items.length,

    unitCount:
      items.reduce(
        (sum, item) =>
          sum + item.quantity,
        0,
      ),

    purchaseCostNet:
      calculatedNet,

    purchaseCostGross:
      calculatedGross,

    items,

    validationErrors,

    safety: {
      alltronSubmission: false,
      networkCalls: false,
      ftpWrites: false,
      apiWrites: false,
      shopifyWrites: false,
      stockWrites: false,
      fulfillmentWrites: false,
      paymentActions: false,
    },
  };
}

export const ALLTRON_ADAPTER_POLICY =
  Object.freeze({
    enabled: false,

    supplier:
      EXPECTED_SUPPLIER,

    requiredSourceStatus:
      EXPECTED_STATUS,

    outputStatus:
      "READY_FOR_ALLTRON_DRY_RUN",

    networkCalls: false,
    supplierSubmission: false,
    shopifyWrites: false,
  });
