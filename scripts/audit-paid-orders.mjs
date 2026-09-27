import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

import {
  selectSupplier,
} from "../integrations/suppliers/supplier-selector.mjs";

import {
  buildAlltronOffer,
} from "../integrations/suppliers/alltron-offer.mjs";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const ROOT = process.cwd();

const DOMAIN = String(
  process.env.SHOPIFY_STORE_DOMAIN ||
    process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ||
    "",
)
  .trim()
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");

const TOKEN = String(
  process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "",
).trim();

const API_VERSION = String(
  process.env.SHOPIFY_ADMIN_API_VERSION ||
    process.env.SHOPIFY_API_VERSION ||
    "2025-04",
).trim();

const MASTER_FILE = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "iumatec-master-catalog.json",
);

const OUT_DIR = path.join(
  ROOT,
  "integrations",
  "orders",
  "out",
);

const REPORT_FILE = path.join(
  OUT_DIR,
  "paid-orders-audit.json",
);

if (!DOMAIN) {
  throw new Error("Missing SHOPIFY_STORE_DOMAIN");
}

if (!TOKEN) {
  throw new Error("Missing SHOPIFY_ADMIN_ACCESS_TOKEN");
}

if (!fs.existsSync(MASTER_FILE)) {
  throw new Error(
    `Master catalog não encontrado: ${MASTER_FILE}`,
  );
}

function txt(value) {
  return String(value ?? "").trim();
}

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSku(value) {
  return txt(value).toUpperCase();
}

function normalizeEan(value) {
  return txt(value).replace(/\D/g, "");
}

function normalizeGid(value) {
  const text = txt(value);

  if (!text) return "";

  const match = text.match(/(\d+)$/);

  return match ? match[1] : text;
}

function addIndex(map, key, product) {
  if (!key) return;

  const current = map.get(key) || [];
  current.push(product);
  map.set(key, current);
}

async function shopifyAdmin(query, variables = {}) {
  const response = await fetch(
    `https://${DOMAIN}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": TOKEN,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
      signal: AbortSignal.timeout(60_000),
    },
  );

  const raw = await response.text();

  let json;

  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(
      `Shopify devolveu resposta não JSON (${response.status}): ${raw.slice(
        0,
        500,
      )}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Shopify HTTP ${response.status}: ${JSON.stringify(
        json,
        null,
        2,
      )}`,
    );
  }

  if (json.errors?.length) {
    throw new Error(
      `Shopify GraphQL: ${JSON.stringify(
        json.errors,
        null,
        2,
      )}`,
    );
  }

  return json.data;
}

console.log("\n========== IUMATEC ORDER ENGINE ==========");
console.log("MODE: READ ONLY");
console.log(`Shopify API: ${API_VERSION}`);
console.log("==========================================\n");

console.log("A carregar master catalog...");

const products = JSON.parse(
  fs.readFileSync(MASTER_FILE, "utf8"),
);

if (!Array.isArray(products)) {
  throw new Error(
    "iumatec-master-catalog.json não contém um array.",
  );
}

console.log(`Master products: ${products.length}`);

const byVariant = new Map();
const bySku = new Map();
const byEan = new Map();

for (const product of products) {
  const variantKeys = [
    product.merchandiseId,
    product.shopifyVariantId,
    product.variantId,
  ]
    .map(normalizeGid)
    .filter(Boolean);

  for (const key of new Set(variantKeys)) {
    addIndex(byVariant, key, product);
  }

  const skuKeys = [
    product.sku,
    product.litm,
    product.alltronSku,
  ]
    .map(normalizeSku)
    .filter(Boolean);

  for (const key of new Set(skuKeys)) {
    addIndex(bySku, key, product);
  }

  const ean = normalizeEan(product.ean);

  if (ean) {
    addIndex(byEan, ean, product);
  }
}

function resolveProduct(line) {
  const variantId = normalizeGid(
    line.variant?.id,
  );

  const sku = normalizeSku(
    line.sku || line.variant?.sku,
  );

  const barcode = normalizeEan(
    line.variant?.barcode,
  );

  const attempts = [
    {
      type: "shopifyVariantId",
      key: variantId,
      map: byVariant,
    },
    {
      type: "sku",
      key: sku,
      map: bySku,
    },
    {
      type: "ean",
      key: barcode,
      map: byEan,
    },
  ];

  for (const attempt of attempts) {
    if (!attempt.key) continue;

    const candidates =
      attempt.map.get(attempt.key) || [];

    if (candidates.length === 1) {
      return {
        product: candidates[0],
        matchedBy: attempt.type,
        ambiguous: false,
      };
    }

    if (candidates.length > 1) {
      let refined = candidates;

      if (sku) {
        const skuMatched = refined.filter(
          (product) =>
            [
              product.sku,
              product.litm,
              product.alltronSku,
            ]
              .map(normalizeSku)
              .includes(sku),
        );

        if (skuMatched.length === 1) {
          return {
            product: skuMatched[0],
            matchedBy: `${attempt.type}+sku`,
            ambiguous: false,
          };
        }

        if (skuMatched.length) {
          refined = skuMatched;
        }
      }

      if (barcode) {
        const eanMatched = refined.filter(
          (product) =>
            normalizeEan(product.ean) === barcode,
        );

        if (eanMatched.length === 1) {
          return {
            product: eanMatched[0],
            matchedBy: `${attempt.type}+ean`,
            ambiguous: false,
          };
        }
      }

      return {
        product: null,
        matchedBy: attempt.type,
        ambiguous: true,
        candidates: candidates.length,
      };
    }
  }

  return {
    product: null,
    matchedBy: "",
    ambiguous: false,
  };
}

const ORDERS_QUERY = `
  query PaidOrders(
    $first: Int!
    $query: String!
  ) {
    orders(
      first: $first
      query: $query
      sortKey: CREATED_AT
      reverse: true
    ) {
      nodes {
        id
        legacyResourceId
        name
        createdAt
        cancelledAt
        displayFinancialStatus
        displayFulfillmentStatus

        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        lineItems(first: 100) {
          nodes {
            id
            title
            quantity
            sku

            variant {
              id
              sku
              barcode

              product {
                id
                title
                handle
              }
            }
          }
        }
      }
    }
  }
`;

console.log("\nA ler encomendas pagas da Shopify...");

const data = await shopifyAdmin(
  ORDERS_QUERY,
  {
    first: 50,
    query: "financial_status:paid",
  },
);

const orders = data?.orders?.nodes || [];

/*
 * S? consideramos automaticamente process?veis pedidos:
 * - pagos (a query Shopify j? garante isso);
 * - n?o cancelados;
 * - ainda n?o fulfilled;
 * - que N?O estejam ON_HOLD.
 *
 * ON_HOLD exige sempre revis?o manual.
 */

function classifyOrder(order) {
  if (order.cancelledAt) {
    return "DONE";
  }

  if (
    order.displayFulfillmentStatus === "FULFILLED"
  ) {
    return "DONE";
  }

  /*
   * S? UNFULFILLED entra automaticamente.
   *
   * ON_HOLD, PARTIAL, SCHEDULED ou qualquer
   * estado desconhecido exige revis?o manual.
   */
  if (
    order.displayFulfillmentStatus === "UNFULFILLED"
  ) {
    return "READY";
  }

  return "REVIEW";
}

const readyOrders = orders.filter(
  (order) => classifyOrder(order) === "READY",
);

const reviewOrders = orders.filter(
  (order) => classifyOrder(order) === "REVIEW",
);

const doneOrders = orders.filter(
  (order) => classifyOrder(order) === "DONE",
);

const report = {
  generatedAt: new Date().toISOString(),
  mode: "read-only",
  shopifyApiVersion: API_VERSION,

  summary: {
    paidOrdersRead: orders.length,
    readyOrders:
      readyOrders.length,
    reviewOrders:
      reviewOrders.length,
    doneOrders:
      doneOrders.length,
    lineItems: 0,
    matchedProducts: 0,
    unmatchedProducts: 0,
    ambiguousProducts: 0,
    selectedAlltron: 0,
    selectedNone: 0,
  },

  orders: [],
};

console.log(
  `Pagas encontradas: ${orders.length}`,
);

console.log(
  `READY:  ${readyOrders.length}`,
);

console.log(
  `REVIEW: ${reviewOrders.length}`,
);

console.log(
  `DONE:   ${doneOrders.length}`,
);

/*
 * READY e REVIEW s?o analisadas.
 *
 * REVIEW nunca significa autoriza??o
 * para encomendar ao fornecedor.
 */
for (const order of [
  ...readyOrders,
  ...reviewOrders,
]) {
  const money =
    order.totalPriceSet?.shopMoney || {};

  console.log(
    "\n----------------------------------------",
  );

  console.log(
    `${order.name} | ${order.displayFinancialStatus} | ${order.displayFulfillmentStatus}`,
  );

  console.log(
    `Criada: ${order.createdAt}`,
  );

  console.log(
    `Total: ${money.amount || "?"} ${
      money.currencyCode || ""
    }`,
  );

  if (order.shippingAddress) {
    console.log(
      `Destino: ${
        order.shippingAddress.zip || ""
      } ${
        order.shippingAddress.city || ""
      } | ${
        order.shippingAddress.countryCodeV2 ||
        order.shippingAddress.country ||
        ""
      }`,
    );
  }

  const orderReport = {
    id: order.id,
    legacyResourceId:
      order.legacyResourceId,
    name: order.name,
    queue: classifyOrder(order),
    createdAt: order.createdAt,
    financialStatus:
      order.displayFinancialStatus,
    fulfillmentStatus:
      order.displayFulfillmentStatus,
    total: {
      amount: money.amount || null,
      currency:
        money.currencyCode || null,
    },
    destination: order.shippingAddress
      ? {
          zip:
            order.shippingAddress.zip ||
            null,
          city:
            order.shippingAddress.city ||
            null,
          country:
            order.shippingAddress
              .countryCodeV2 ||
            order.shippingAddress.country ||
            null,
        }
      : null,
    items: [],
  };

  for (
    const line of order.lineItems?.nodes || []
  ) {
    report.summary.lineItems++;

    const resolution =
      resolveProduct(line);

    console.log(
      `\n${line.quantity}x ${line.title}`,
    );

    console.log(
      `Shopify SKU: ${
        line.sku ||
        line.variant?.sku ||
        "-"
      }`,
    );

    console.log(
      `Variant: ${
        line.variant?.id || "-"
      }`,
    );

    let itemReport = {
      lineItemId: line.id,
      title: line.title,
      quantity: line.quantity,
      shopifySku:
        line.sku ||
        line.variant?.sku ||
        null,
      shopifyVariantId:
        line.variant?.id || null,
      barcode:
        line.variant?.barcode || null,
      matched: false,
      ambiguous:
        Boolean(resolution.ambiguous),
      matchedBy:
        resolution.matchedBy || null,
      supplier: null,
    };

    if (!resolution.product) {
      if (resolution.ambiguous) {
        report.summary.ambiguousProducts++;

        console.log(
          `MASTER: AMBIGUO (${resolution.candidates} candidatos)`,
        );
      } else {
        report.summary.unmatchedProducts++;

        console.log(
          "MASTER: NÃO ENCONTRADO",
        );
      }

      orderReport.items.push(
        itemReport,
      );

      continue;
    }

    report.summary.matchedProducts++;

    const product =
      resolution.product;

    console.log(
      `MASTER: OK via ${resolution.matchedBy}`,
    );

    console.log(
      `LITM: ${
        product.litm ||
        product.alltronSku ||
        "-"
      }`,
    );

    console.log(
      `EAN: ${product.ean || "-"}`,
    );

    const selection = selectSupplier([
      buildAlltronOffer(product),
    ]);

    const supplier =
      selection.selectedSupplier || "";

    if (supplier === "alltron") {
      report.summary.selectedAlltron++;
    } else {
      report.summary.selectedNone++;
    }

    console.log(
      `Fornecedor: ${
        supplier || "NENHUM"
      }`,
    );

    console.log(
      `Custo líquido: CHF ${num(
        selection.selectedPurchaseCostNet,
      ).toFixed(2)}`,
    );

    console.log(
      `Stock fornecedor: ${num(
        selection.selectedStock,
      )}`,
    );

    console.log(
      `Direct ship: ${
        selection.selectedDirectShip
          ? "sim"
          : "não"
      }`,
    );

    console.log(
      `Motivo: ${
        selection.selectionReason || "-"
      }`,
    );

    itemReport = {
      ...itemReport,
      matched: true,
      master: {
        litm:
          product.litm ||
          product.alltronSku ||
          null,
        sku: product.sku || null,
        ean: product.ean || null,
        masterPrice:
          num(product.price),
      },
      supplier: {
        selected:
          supplier || null,
        costNet:
          num(
            selection.selectedPurchaseCostNet,
          ),
        costGross:
          num(
            selection
              .selectedPurchaseCostInclVat,
          ),
        stock:
          num(selection.selectedStock),
        directShip:
          Boolean(
            selection.selectedDirectShip,
          ),
        reason:
          selection.selectionReason ||
          null,
      },
    };

    orderReport.items.push(
      itemReport,
    );
  }

  report.orders.push(
    orderReport,
  );
}

fs.mkdirSync(
  OUT_DIR,
  {
    recursive: true,
  },
);

fs.writeFileSync(
  REPORT_FILE,
  JSON.stringify(
    report,
    null,
    2,
  ),
  "utf8",
);

console.log(
  "\n==========================================",
);

console.log(
  "ORDER ENGINE AUDIT DONE",
);

console.log(
  "==========================================",
);

console.log(report.summary);

console.log(
  `\nReport: ${path.relative(
    ROOT,
    REPORT_FILE,
  )}`,
);

console.log(
  "\nREAD ONLY: nenhuma encomenda, stock ou fulfillment foi alterado.",
);
