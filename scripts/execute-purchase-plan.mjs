import fs from "node:fs";
import path from "node:path";

import {
  prepareSupplierSubmission,
} from "../integrations/suppliers/supplier-submission.mjs";

import {
  prepareAlltronSubmission,
} from "../integrations/suppliers/alltron-submission.mjs";

import {
  prepareAlsoSubmission,
} from "../integrations/suppliers/also-submission.mjs";

import {
  revalidateAlltronPurchase,
} from "../integrations/suppliers/alltron-revalidation.mjs";

const ROOT = process.cwd();

const ALLTRON_PURCHASE_SNAPSHOT_FILE =
  process.env.ALLTRON_PURCHASE_SNAPSHOT_FILE ||
  path.join(
    ROOT,
    "integrations",
    "alltron",
    "out",
    "alltron-purchase-snapshot.json",
  );

function loadAlltronPurchaseSnapshot() {
  if (!fs.existsSync(ALLTRON_PURCHASE_SNAPSHOT_FILE)) {
    return null;
  }

  try {
    return JSON.parse(
      fs.readFileSync(
        ALLTRON_PURCHASE_SNAPSHOT_FILE,
        "utf8",
      ),
    );
  } catch {
    return null;
  }
}

const alltronPurchaseSnapshot =
  loadAlltronPurchaseSnapshot();

const IDEMPOTENCY_FILE =
  process.env.PURCHASE_SUBMISSION_LEDGER_FILE ||
  path.join(
    ROOT,
    "integrations",
    "orders",
    "state",
    "supplier-submissions.json",
  );

function loadSubmissionLedger() {
  if (!fs.existsSync(IDEMPOTENCY_FILE)) {
    return {
      schemaVersion: 1,
      submissions: [],
    };
  }

  const parsed = JSON.parse(
    fs.readFileSync(
      IDEMPOTENCY_FILE,
      "utf8",
    ),
  );

  return {
    schemaVersion: 1,
    submissions:
      Array.isArray(parsed?.submissions)
        ? parsed.submissions
        : [],
  };
}

const submissionLedger =
  loadSubmissionLedger();

const submittedPurchaseOrderRefs =
  new Set(
    submissionLedger.submissions
      .filter(
        (entry) =>
          String(
            entry?.status ?? "",
          )
            .trim()
            .toUpperCase() ===
          "SUBMITTED",
      )
      .map(
        (entry) =>
          String(
            entry?.purchaseOrderRef ?? "",
          ).trim(),
      )
      .filter(Boolean),
  );

const INPUT_FILE =
  process.env.PURCHASE_PLAN_FILE ||
  path.join(
    ROOT,
    "integrations",
    "orders",
    "out",
    "purchase-plan.json",
  );

const OUTPUT_FILE = path.join(
  ROOT,
  "integrations",
  "orders",
  "out",
  "purchase-execution-plan.json",
);

const MONEY_TOLERANCE = 0.02;

function number(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return Math.round((number(value) + Number.EPSILON) * 100) / 100;
}

function text(value) {
  return String(value ?? "").trim();
}

function moneyEqual(a, b) {
  return Math.abs(money(a) - money(b)) <= MONEY_TOLERANCE;
}

if (!fs.existsSync(INPUT_FILE)) {
  throw new Error(
    `Purchase plan não encontrado: ${INPUT_FILE}`,
  );
}

const purchasePlan = JSON.parse(
  fs.readFileSync(INPUT_FILE, "utf8"),
);

const sourceOrders =
  Array.isArray(purchasePlan.purchaseOrders)
    ? purchasePlan.purchaseOrders
    : [];

const seenRefs = new Set();

const executionOrders = [];
const blockedOrders = [];

for (const purchaseOrder of sourceOrders) {
  const errors = [];

  const purchaseOrderRef =
    text(purchaseOrder.purchaseOrderRef);

  const supplier =
    text(purchaseOrder.supplier).toLowerCase();

  const status =
    text(purchaseOrder.status);

  const items =
    Array.isArray(purchaseOrder.items)
      ? purchaseOrder.items
      : [];

  if (!purchaseOrderRef) {
    errors.push("missing-purchase-order-ref");
  }

  if (
    purchaseOrderRef &&
    seenRefs.has(purchaseOrderRef)
  ) {
    errors.push("duplicate-purchase-order-ref");
  }

  if (purchaseOrderRef) {
    seenRefs.add(purchaseOrderRef);
  }

  if (status !== "READY_FOR_PURCHASE") {
    errors.push(
      `invalid-status:${status || "empty"}`,
    );
  }

  if (!supplier) {
    errors.push("missing-supplier");
  }

  if (!items.length) {
    errors.push("no-items");
  }

  let calculatedNet = 0;
  let calculatedGross = 0;
  let totalUnits = 0;

  const validatedItems = items.map(
    (item, index) => {
      const quantity =
        Math.max(
          0,
          Math.trunc(number(item.quantity)),
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

      const supplierStock =
        Math.max(
          0,
          Math.trunc(number(item.supplierStock)),
        );

      const directShip =
        Boolean(item.directShip);

      const itemErrors = [];

      if (quantity <= 0) {
        itemErrors.push("invalid-quantity");
      }

      if (!supplierSku) {
        itemErrors.push("missing-supplier-sku");
      }

      if (costNetUnit <= 0) {
        itemErrors.push("invalid-net-cost");
      }

      if (costGrossUnit <= 0) {
        itemErrors.push("invalid-gross-cost");
      }

      if (
        !directShip &&
        supplierStock < quantity
      ) {
        itemErrors.push(
          "insufficient-supplier-stock",
        );
      }

      if (itemErrors.length) {
        errors.push(
          `item-${index + 1}:${itemErrors.join(",")}`,
        );
      }

      const lineNet =
        money(costNetUnit * quantity);

      const lineGross =
        money(costGrossUnit * quantity);

      calculatedNet =
        money(calculatedNet + lineNet);

      calculatedGross =
        money(calculatedGross + lineGross);

      totalUnits += quantity;

      return {
        line: index + 1,
        title: text(item.title),
        quantity,
        supplier,
        supplierSku,
        litm,
        ean,
        costNetUnit,
        costGrossUnit,
        lineNet,
        lineGross,
        supplierStock,
        directShip,
        selectionReason:
          text(item.selectionReason),
        status:
          itemErrors.length
            ? "BLOCKED"
            : "VALIDATED",
        errors: itemErrors,
      };
    },
  );

  const declaredNet =
    money(purchaseOrder.purchaseCostNet);

  const declaredGross =
    money(purchaseOrder.purchaseCostGross);

  if (
    !moneyEqual(
      declaredNet,
      calculatedNet,
    )
  ) {
    errors.push(
      `net-total-mismatch:declared=${declaredNet},calculated=${calculatedNet}`,
    );
  }

  if (
    !moneyEqual(
      declaredGross,
      calculatedGross,
    )
  ) {
    errors.push(
      `gross-total-mismatch:declared=${declaredGross},calculated=${calculatedGross}`,
    );
  }

  const result = {
    purchaseOrderRef,
    sourceOrder:
      text(
        purchaseOrder.orderName ||
        purchaseOrder.sourceOrder ||
        "",
      ),
    supplier,
    directShip:
      Boolean(purchaseOrder.directShip),
    dispatchMode:
      text(purchaseOrder.dispatchMode),
    itemCount: items.length,
    totalUnits,
    purchaseCostNet: calculatedNet,
    purchaseCostGross: calculatedGross,
    items: validatedItems,
    validationErrors: errors,
    executionStatus:
      errors.length
        ? "BLOCKED"
        : "VALIDATED_FOR_SUBMISSION",
  };

  if (errors.length) {
    blockedOrders.push(result);
  } else {
    /*
     * Etapa 1:
     * Purchase Order validada ->
     * Supplier Submission normalizada.
     */
    const supplierSubmission =
      prepareSupplierSubmission({
        ...result,
        status:
          result.executionStatus,
      });

    if (
      supplierSubmission.status !==
      "READY_FOR_SUPPLIER_ADAPTER"
    ) {
      const submissionErrors =
        Array.isArray(
          supplierSubmission.validationErrors,
        )
          ? supplierSubmission.validationErrors
          : [];

      blockedOrders.push({
        ...result,

        executionStatus:
          "BLOCKED",

        validationErrors: [
          ...result.validationErrors,

          ...submissionErrors.map(
            (error) =>
              `supplier-submission:${error}`,
          ),

          ...(
            submissionErrors.length
              ? []
              : [
                  "supplier-submission:blocked-without-error",
                ]
          ),
        ],

        supplierSubmission,
      });

      continue;
    }

    /*
     * Etapa 2:
     * Cada fornecedor usa o seu adapter.
     *
     * Continua DRY RUN:
     * - zero network calls
     * - zero supplier writes
     * - zero Shopify writes
     * - zero payments
     */
    const adapterFactory =
      result.supplier === "alltron"
        ? prepareAlltronSubmission
        : result.supplier === "also"
          ? prepareAlsoSubmission
          : null;

    if (!adapterFactory) {
      blockedOrders.push({
        ...result,

        executionStatus:
          "BLOCKED",

        validationErrors: [
          ...result.validationErrors,

          `supplier-adapter-not-implemented:${
            result.supplier ||
            "none"
          }`,
        ],

        supplierSubmission,
      });

      continue;
    }

    /*
     * Etapa 3:
     * Supplier Submission ->
     * supplier-specific DRY-RUN Adapter.
     */
    const supplierAdapter =
      adapterFactory(
        supplierSubmission,
      );

    const expectedAdapterStatus =
      result.supplier === "alltron"
        ? "READY_FOR_ALLTRON_DRY_RUN"
        : "READY_FOR_ALSO_DRY_RUN";

    if (
      supplierAdapter.status !==
      expectedAdapterStatus
    ) {
      const adapterErrors =
        Array.isArray(
          supplierAdapter.validationErrors,
        )
          ? supplierAdapter.validationErrors
          : [];

      const adapterPrefix =
        `${result.supplier || "unknown"}-adapter`;

      blockedOrders.push({
        ...result,

        executionStatus:
          "BLOCKED",

        validationErrors: [
          ...result.validationErrors,

          ...adapterErrors.map(
            (error) =>
              `${adapterPrefix}:${error}`,
          ),

          ...(
            adapterErrors.length
              ? []
              : [
                  `${adapterPrefix}:blocked-without-error`,
                ]
          ),
        ],

        supplierSubmission,
        supplierAdapter,
      });

      continue;
    }

    /*
     * IDEMPOTENCY GATE
     *
     * Mantem-se igual para ALLTRON e ALSO.
     */
    if (
      submittedPurchaseOrderRefs.has(
        result.purchaseOrderRef,
      )
    ) {
      blockedOrders.push({
        ...result,

        executionStatus:
          "BLOCKED",

        validationErrors: [
          ...result.validationErrors,
          "idempotency:purchase-order-already-submitted",
        ],

        supplierSubmission,
        supplierAdapter,

        idempotency: {
          duplicate: true,
          ledgerFile:
            path.relative(
              ROOT,
              IDEMPOTENCY_FILE,
            ),
        },
      });

      continue;
    }

    /*
     * ALSO ainda nao tem feed tecnico ligado.
     *
     * Por isso:
     * - nao existe revalidacao automatica ALSO
     * - nao existe submissao automatica
     * - fica pronto apenas para FastOrder manual
     */
    if (result.supplier === "also") {
      executionOrders.push({
        ...result,

        executionStatus:
          supplierAdapter.status,

        supplierSubmission,
        supplierAdapter,

        supplierRevalidation:
          null,

        manualOrder: {
          mode:
            "ALSO_FASTORDER",

          exportScript:
            "scripts/export-also-fastorder.mjs",

          identifier:
            "EAN",

          supplierSubmission:
            false,
        },

        idempotency: {
          duplicate: false,
          ledgerFile:
            path.relative(
              ROOT,
              IDEMPOTENCY_FILE,
            ),
        },
      });

      continue;
    }

    /*
     * FINAL ALLTRON REVALIDATION GATE
     *
     * Continua DRY RUN:
     * - zero network calls
     * - zero supplier writes
     * - zero Shopify writes
     * - zero payments
     */
    const supplierRevalidation =
      revalidateAlltronPurchase(
        supplierAdapter,
        alltronPurchaseSnapshot,
      );

    if (
      supplierRevalidation.status !==
      "REVALIDATED_FOR_ALLTRON_DRY_RUN"
    ) {
      const revalidationErrors =
        Array.isArray(
          supplierRevalidation.validationErrors,
        )
          ? supplierRevalidation.validationErrors
          : [];

      blockedOrders.push({
        ...result,

        executionStatus: "BLOCKED",

        validationErrors: [
          ...result.validationErrors,

          ...revalidationErrors.map(
            (error) =>
              `alltron-revalidation:${error}`,
          ),

          ...(
            revalidationErrors.length
              ? []
              : [
                  "alltron-revalidation:blocked-without-error",
                ]
          ),
        ],

        supplierSubmission,
        supplierAdapter,

        idempotency: {
          duplicate: false,
          ledgerFile:
            path.relative(
              ROOT,
              IDEMPOTENCY_FILE,
            ),
        },

        supplierRevalidation,
      });

      continue;
    }

    executionOrders.push({
      ...result,

      executionStatus:
        supplierRevalidation.status,

      supplierSubmission,
      supplierAdapter,
      supplierRevalidation,

      idempotency: {
        duplicate: false,
        ledgerFile:
          path.relative(
            ROOT,
            IDEMPOTENCY_FILE,
          ),
      },
    });
  }
}

const report = {
  generatedAt: new Date().toISOString(),

  mode: "DRY_RUN",

  safety: {
    supplierSubmission: false,
    shopifyWrites: false,
    stockWrites: false,
    fulfillmentWrites: false,
    paymentActions: false,
  },

  summary: {
    sourcePurchaseOrders:
      sourceOrders.length,

    validatedForSubmission:
      executionOrders.length,

    blocked:
      blockedOrders.length,

    totalNet:
      money(
        executionOrders.reduce(
          (sum, order) =>
            sum + order.purchaseCostNet,
          0,
        ),
      ),

    totalGross:
      money(
        executionOrders.reduce(
          (sum, order) =>
            sum + order.purchaseCostGross,
          0,
        ),
      ),
  },

  executionOrders,
  blockedOrders,
};

fs.mkdirSync(
  path.dirname(OUTPUT_FILE),
  { recursive: true },
);

fs.writeFileSync(
  OUTPUT_FILE,
  JSON.stringify(report, null, 2),
  "utf8",
);

console.log(
  "\n========== IUMATEC PURCHASE EXECUTOR ==========",
);

console.log("MODE: DRY RUN");
console.log(
  "Supplier submission: DISABLED",
);
console.log(
  "Shopify writes: DISABLED",
);

console.log(
  "\nPurchase Orders recebidas:",
  report.summary.sourcePurchaseOrders,
);

console.log(
  "VALIDATED_FOR_SUBMISSION:",
  report.summary.validatedForSubmission,
);

console.log(
  "BLOCKED:",
  report.summary.blocked,
);

for (const order of executionOrders) {
  console.log(
    `\n${order.purchaseOrderRef}`,
  );
  console.log(
    `Supplier: ${order.supplier}`,
  );
  console.log(
    `Items: ${order.itemCount}`,
  );
  console.log(
    `Units: ${order.totalUnits}`,
  );
  console.log(
    `Total net: CHF ${order.purchaseCostNet.toFixed(2)}`,
  );
  console.log(
    `Total gross: CHF ${order.purchaseCostGross.toFixed(2)}`,
  );
  console.log(
    `Status: ${order.executionStatus}`,
  );
}

if (blockedOrders.length) {
  console.log(
    "\n========== BLOCKED ==========",
  );

  for (const order of blockedOrders) {
    console.log(
      `\n${order.purchaseOrderRef || "(sem referência)"}`,
    );

    for (
      const error of order.validationErrors
    ) {
      console.log(`- ${error}`);
    }
  }
}

console.log(
  `\nReport: ${path.relative(
    ROOT,
    OUTPUT_FILE,
  )}`,
);

console.log(
  "\nDRY RUN: nenhuma compra foi enviada ao fornecedor.",
);

console.log(
  "===============================================\n",
);
