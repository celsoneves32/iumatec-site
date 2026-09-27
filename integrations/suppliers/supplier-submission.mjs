const VALIDATED_STATUS =
  "VALIDATED_FOR_SUBMISSION";

const SUPPORTED_SUPPLIERS =
  new Set([
    "alltron",
    "also",
  ]);

function text(value) {
  return String(value ?? "").trim();
}

function number(value) {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
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

function normalizeSupplier(value) {
  return text(value).toLowerCase();
}

export function prepareSupplierSubmission(
  purchaseOrder = {},
) {
  const purchaseOrderRef =
    text(purchaseOrder.purchaseOrderRef);

  const supplier =
    normalizeSupplier(
      purchaseOrder.supplier,
    );

  const status =
    text(purchaseOrder.status);

  const sourceItems =
    Array.isArray(purchaseOrder.items)
      ? purchaseOrder.items
      : [];

  const validationErrors = [];

  if (!purchaseOrderRef) {
    validationErrors.push(
      "missing-purchase-order-ref",
    );
  }

  if (
    status !== VALIDATED_STATUS
  ) {
    validationErrors.push(
      `status-must-be-${VALIDATED_STATUS}`,
    );
  }

  if (
    !SUPPORTED_SUPPLIERS.has(supplier)
  ) {
    validationErrors.push(
      `unsupported-supplier:${supplier || "none"}`,
    );
  }

  if (!sourceItems.length) {
    validationErrors.push(
      "purchase-order-has-no-items",
    );
  }

  const items = sourceItems.map(
    (item, index) => {
      const quantity =
        integer(item.quantity);

      const supplierStock =
        integer(item.supplierStock);

      const itemSupplier =
        normalizeSupplier(
          item.supplier,
        );

      const supplierSku =
        text(
          item.supplierSku ||
          item.litm,
        );

      const litm =
        text(item.litm);

      const ean =
        text(item.ean);

      const costNetUnit =
        money(item.costNetUnit);

      const costGrossUnit =
        money(item.costGrossUnit);

      const itemNumber = index + 1;

      if (quantity <= 0) {
        validationErrors.push(
          `item-${itemNumber}:invalid-quantity`,
        );
      }

      if (!supplierSku) {
        validationErrors.push(
          `item-${itemNumber}:missing-supplier-sku`,
        );
      }

      if (
        itemSupplier &&
        itemSupplier !== supplier
      ) {
        validationErrors.push(
          `item-${itemNumber}:supplier-mismatch`,
        );
      }

      if (
        supplierStock < quantity
      ) {
        validationErrors.push(
          `item-${itemNumber}:insufficient-supplier-stock`,
        );
      }

      if (costNetUnit <= 0) {
        validationErrors.push(
          `item-${itemNumber}:invalid-cost-net`,
        );
      }

      return {
        lineNumber: itemNumber,

        title:
          text(item.title),

        quantity,

        supplier,
        supplierSku,

        litm,
        ean,

        costNetUnit,
        costGrossUnit,

        lineCostNet:
          money(
            costNetUnit * quantity,
          ),

        lineCostGross:
          money(
            costGrossUnit * quantity,
          ),

        supplierStock,

        directShip:
          Boolean(item.directShip),

        selectionReason:
          text(
            item.selectionReason,
          ),
      };
    },
  );

  const calculatedCostNet =
    money(
      items.reduce(
        (sum, item) =>
          sum + item.lineCostNet,
        0,
      ),
    );

  const calculatedCostGross =
    money(
      items.reduce(
        (sum, item) =>
          sum + item.lineCostGross,
        0,
      ),
    );

  const declaredCostNet =
    money(
      purchaseOrder.purchaseCostNet,
    );

  const declaredCostGross =
    money(
      purchaseOrder.purchaseCostGross,
    );

  if (
    declaredCostNet > 0 &&
    Math.abs(
      declaredCostNet -
      calculatedCostNet
    ) > 0.011
  ) {
    validationErrors.push(
      "purchase-cost-net-mismatch",
    );
  }

  if (
    declaredCostGross > 0 &&
    Math.abs(
      declaredCostGross -
      calculatedCostGross
    ) > 0.011
  ) {
    validationErrors.push(
      "purchase-cost-gross-mismatch",
    );
  }

  const readyForSupplierAdapter =
    validationErrors.length === 0;

  return {
    schemaVersion: 1,

    purchaseOrderRef,

    supplier,

    sourceStatus: status,

    status:
      readyForSupplierAdapter
        ? "READY_FOR_SUPPLIER_ADAPTER"
        : "BLOCKED",

    dispatchMode:
      text(
        purchaseOrder.dispatchMode,
      ),

    directShip:
      Boolean(
        purchaseOrder.directShip,
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
      calculatedCostNet,

    purchaseCostGross:
      calculatedCostGross,

    items,

    validationErrors,

    safety: {
      supplierSubmission: false,
      networkCalls: false,
      shopifyWrites: false,
      stockWrites: false,
      fulfillmentWrites: false,
      paymentActions: false,
    },
  };
}

export const SUPPLIER_SUBMISSION_POLICY =
  Object.freeze({
    enabled: false,

    supportedSuppliers: [
      "alltron",
      "also",
    ],

    requiredSourceStatus:
      VALIDATED_STATUS,

    networkCalls: false,
    shopifyWrites: false,
  });