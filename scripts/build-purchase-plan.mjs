import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const INPUT_FILE =
  process.env.PURCHASE_PLAN_INPUT
    ? path.resolve(
        ROOT,
        process.env.PURCHASE_PLAN_INPUT,
      )
    : path.join(
        ROOT,
        "integrations",
        "orders",
        "out",
        "paid-orders-audit.json",
      );

const OUTPUT_FILE =
  process.env.PURCHASE_PLAN_OUTPUT
    ? path.resolve(
        ROOT,
        process.env.PURCHASE_PLAN_OUTPUT,
      )
    : path.join(
        ROOT,
        "integrations",
        "orders",
        "out",
        "purchase-plan.json",
      );

function readJson(file) {
  return JSON.parse(
    fs.readFileSync(file, "utf8"),
  );
}

function text(value) {
  return String(value ?? "").trim();
}

function number(value) {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function money(value) {
  return Math.round(
    (number(value) + Number.EPSILON) * 100,
  ) / 100;
}

function safeRef(value) {
  return text(value)
    .replace(/^#/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-");
}

if (!fs.existsSync(INPUT_FILE)) {
  throw new Error(
    `Order audit não encontrado: ${INPUT_FILE}`,
  );
}

const audit = readJson(INPUT_FILE);

const orders = Array.isArray(audit.orders)
  ? audit.orders
  : [];

const readyOrders = orders.filter(
  (order) =>
    text(order?.queue).toUpperCase() === "READY",
);

const reviewOrders = orders.filter(
  (order) =>
    text(order?.queue).toUpperCase() === "REVIEW",
);

const doneOrders = orders.filter(
  (order) =>
    text(order?.queue).toUpperCase() === "DONE",
);

const purchaseOrders = [];
const blocked = [];

for (const order of readyOrders) {
  const items = Array.isArray(order?.items)
    ? order.items
    : [];

  if (!items.length) {
    blocked.push({
      shopifyOrderId: text(order?.id),
      shopifyOrderName: text(order?.name),
      reason: "ready-order-without-items",
    });

    continue;
  }

  /*
   * Defesa adicional:
   * um pedido READY só pode entrar no plano se
   * TODOS os artigos continuarem válidos.
   */
  const invalidItems = items.filter((item) => {
    const supplier =
      text(item?.supplier?.selected).toLowerCase();

    const quantity =
      Math.max(
        0,
        Math.trunc(number(item?.quantity)),
      );

    return (
      item?.matched !== true ||
      item?.ambiguous === true ||
      !supplier ||
      quantity <= 0 ||
      number(item?.supplier?.costNet) <= 0
    );
  });

  if (invalidItems.length) {
    blocked.push({
      shopifyOrderId: text(order?.id),
      shopifyOrderName: text(order?.name),
      reason: "ready-order-has-invalid-items",
      invalidItems: invalidItems.map((item) => ({
        title: text(item?.title),
        shopifySku: text(item?.shopifySku),
        matched: Boolean(item?.matched),
        ambiguous: Boolean(item?.ambiguous),
        supplier: text(
          item?.supplier?.selected,
        ),
        quantity: number(item?.quantity),
        costNet: number(
          item?.supplier?.costNet,
        ),
      })),
    });

    continue;
  }

  /*
   * Um pedido Shopify pode futuramente usar
   * mais de um fornecedor.
   *
   * Criamos uma ordem interna por fornecedor.
   */
  const supplierGroups = new Map();

  for (const item of items) {
    const supplier =
      text(
        item?.supplier?.selected,
      ).toLowerCase();

    if (!supplierGroups.has(supplier)) {
      supplierGroups.set(supplier, []);
    }

    supplierGroups.get(supplier).push(item);
  }

  for (const [supplier, supplierItems] of supplierGroups) {
    const normalizedItems =
      supplierItems.map((item) => {
        const quantity =
          Math.max(
            0,
            Math.trunc(number(item?.quantity)),
          );

        const costNetUnit =
          money(item?.supplier?.costNet);

        const costGrossUnit =
          money(item?.supplier?.costGross);

        const directShip =
          Boolean(item?.supplier?.directShip);

        return {
          lineItemId:
            text(item?.lineItemId),

          title:
            text(item?.title),

          quantity,

          shopifySku:
            text(item?.shopifySku),

          shopifyVariantId:
            text(item?.shopifyVariantId),

          supplier,

          supplierSku:
            text(
              item?.supplier?.supplierSku ||
              item?.master?.litm ||
              item?.shopifySku,
            ),

          litm:
            text(item?.master?.litm),

          ean:
            text(
              item?.master?.ean ||
              item?.barcode,
            ),

          costNetUnit,

          costGrossUnit,

          lineCostNet:
            money(costNetUnit * quantity),

          lineCostGross:
            money(costGrossUnit * quantity),

          supplierStock:
            Math.max(
              0,
              Math.trunc(
                number(item?.supplier?.stock),
              ),
            ),

          directShip,

          selectionReason:
            text(item?.supplier?.reason),

          matchedBy:
            text(item?.matchedBy),
        };
      });

    const directShip =
      normalizedItems.some(
        (item) => item.directShip,
      );

    /*
     * Quando tivermos ALSO Direct Ship:
     * sem endereço do cliente não permitimos
     * que o PO fique READY_FOR_PURCHASE.
     */
    const destinationAvailable =
      Boolean(order?.destination);

    const purchaseStatus =
      directShip && !destinationAvailable
        ? "BLOCKED_ADDRESS_REQUIRED"
        : "READY_FOR_PURCHASE";

    const purchaseCostNet =
      money(
        normalizedItems.reduce(
          (sum, item) =>
            sum + item.lineCostNet,
          0,
        ),
      );

    const purchaseCostGross =
      money(
        normalizedItems.reduce(
          (sum, item) =>
            sum + item.lineCostGross,
          0,
        ),
      );

    purchaseOrders.push({
      purchaseOrderRef:
        `IUMATEC-${safeRef(order?.name)}-${supplier.toUpperCase()}`,

      status:
        purchaseStatus,

      supplier,

      directShip,

      dispatchMode:
        directShip
          ? "DIRECT_TO_CUSTOMER"
          : "STANDARD_SUPPLIER_FLOW",

      sourceOrder: {
        id:
          text(order?.id),

        legacyResourceId:
          text(order?.legacyResourceId),

        name:
          text(order?.name),

        createdAt:
          text(order?.createdAt),

        financialStatus:
          text(order?.financialStatus),

        fulfillmentStatus:
          text(order?.fulfillmentStatus),

        queue:
          text(order?.queue),

        total:
          order?.total ?? null,

        destination:
          order?.destination ?? null,
      },

      itemCount:
        normalizedItems.reduce(
          (sum, item) =>
            sum + item.quantity,
          0,
        ),

      purchaseCostNet,

      purchaseCostGross,

      items:
        normalizedItems,
    });
  }
}

const supplierSummary = {};

for (const po of purchaseOrders) {
  if (!supplierSummary[po.supplier]) {
    supplierSummary[po.supplier] = {
      purchaseOrders: 0,
      items: 0,
      purchaseCostNet: 0,
      purchaseCostGross: 0,
      readyForPurchase: 0,
      blocked: 0,
    };
  }

  const summary =
    supplierSummary[po.supplier];

  summary.purchaseOrders++;

  summary.items +=
    po.itemCount;

  summary.purchaseCostNet =
    money(
      summary.purchaseCostNet +
      po.purchaseCostNet,
    );

  summary.purchaseCostGross =
    money(
      summary.purchaseCostGross +
      po.purchaseCostGross,
    );

  if (
    po.status === "READY_FOR_PURCHASE"
  ) {
    summary.readyForPurchase++;
  } else {
    summary.blocked++;
  }
}

const report = {
  generatedAt:
    new Date().toISOString(),

  mode:
    "READ_ONLY_PURCHASE_PLAN",

  source:
    path.relative(
      ROOT,
      INPUT_FILE,
    ),

  rules: {
    acceptedQueue:
      "READY",

    reviewExcluded:
      true,

    doneExcluded:
      true,

    requiresMatchedItems:
      true,

    rejectsAmbiguousItems:
      true,

    requiresSupplier:
      true,

    requiresPositivePurchaseCost:
      true,

    directShipRequiresDestination:
      true,

    externalPurchaseExecuted:
      false,

    shopifyModified:
      false,

    stockModified:
      false,

    fulfillmentModified:
      false,
  },

  summary: {
    sourceOrders:
      orders.length,

    readyOrders:
      readyOrders.length,

    reviewOrders:
      reviewOrders.length,

    doneOrders:
      doneOrders.length,

    purchaseOrders:
      purchaseOrders.length,

    readyForPurchase:
      purchaseOrders.filter(
        (po) =>
          po.status ===
          "READY_FOR_PURCHASE",
      ).length,

    blockedPurchaseOrders:
      purchaseOrders.filter(
        (po) =>
          po.status !==
          "READY_FOR_PURCHASE",
      ).length,

    blockedSourceOrders:
      blocked.length,

    suppliers:
      supplierSummary,
  },

  blocked,

  purchaseOrders,
};

fs.mkdirSync(
  path.dirname(OUTPUT_FILE),
  {
    recursive: true,
  },
);

fs.writeFileSync(
  OUTPUT_FILE,
  JSON.stringify(
    report,
    null,
    2,
  ),
  "utf8",
);

console.log(
  "\n========== IUMATEC PURCHASE PLAN ==========",
);

console.log(
  "MODE: READ ONLY",
);

console.log(
  `Pedidos auditados: ${orders.length}`,
);

console.log(
  `READY: ${readyOrders.length}`,
);

console.log(
  `REVIEW excluídos: ${reviewOrders.length}`,
);

console.log(
  `DONE excluídos: ${doneOrders.length}`,
);

console.log(
  `Purchase Orders geradas: ${purchaseOrders.length}`,
);

console.log(
  `READY_FOR_PURCHASE: ${
    report.summary.readyForPurchase
  }`,
);

console.log(
  `Bloqueadas: ${
    report.summary.blockedPurchaseOrders +
    report.summary.blockedSourceOrders
  }`,
);

console.log(
  "\nFornecedores:",
  supplierSummary,
);

console.log(
  `\nReport: ${path.relative(
    ROOT,
    OUTPUT_FILE,
  )}`,
);

console.log(
  "\nREAD ONLY: nenhuma compra foi efetuada.",
);

console.log(
  "============================================\n",
);
