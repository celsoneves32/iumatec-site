import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const INPUT_PATH = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "shopify-price-reconcile",
  "invalid-486-variant-audit.json"
);

const OUT_DIR = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "shopify-price-reconcile"
);

const OUTPUT_JSON = path.join(
  OUT_DIR,
  "invalid-486-shopify-audit.json"
);

const OUTPUT_CSV = path.join(
  OUT_DIR,
  "invalid-486-shopify-audit.csv"
);

const API_VERSION =
  process.env.SHOPIFY_API_VERSION ||
  "2025-04";

const SHOP =
  process.env.SHOPIFY_STORE_DOMAIN ||
  process.env.SHOPIFY_SHOP_DOMAIN ||
  process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ||
  "iumatec-2.myshopify.com";

const TOKEN =
  process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ||
  process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN ||
  process.env.SHOPIFY_ACCESS_TOKEN ||
  "";

function text(value) {
  return value === null || value === undefined
    ? ""
    : String(value).trim();
}

function normalizeSku(value) {
  return text(value)
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function csvValue(value) {
  const s = text(value);
  return `"${s.replaceAll('"', '""')}"`;
}

function saveCsv(rows, filePath) {

  const columns = [
    "result",
    "originalClassification",
    "litm",
    "supabaseSku",
    "currentSku",
    "alltronPrice",
    "alltronStock",

    "currentSkuShopifyMatches",
    "oldSkuShopifyMatches",

    "shopifyVariantId",
    "shopifySku",
    "shopifyBarcode",
    "shopifyPrice",
    "shopifyInventory",

    "shopifyProductId",
    "shopifyTitle",
    "shopifyHandle",
    "shopifyStatus",

    "actionCandidate"
  ];

  const lines = [
    columns.join(",")
  ];

  for (const row of rows) {

    lines.push(
      columns
        .map(
          column =>
            csvValue(row[column])
        )
        .join(",")
    );
  }

  fs.writeFileSync(
    filePath,
    lines.join("\n"),
    "utf8"
  );
}

if (!fs.existsSync(INPUT_PATH)) {
  throw new Error(
    `Ficheiro nao encontrado: ${INPUT_PATH}`
  );
}

if (!TOKEN) {
  throw new Error(
    "Token Shopify Admin nao encontrado no .env.local."
  );
}

console.log("");
console.log(
  "============================================="
);
console.log(
  "===== AUDITORIA 486 -> SHOPIFY =============="
);
console.log(
  "============================================="
);
console.log("");

console.log(
  `Shop: ${SHOP}`
);

console.log(
  `API: ${API_VERSION}`
);

const audit486 =
  JSON.parse(
    fs.readFileSync(
      INPUT_PATH,
      "utf8"
    )
  );

if (!Array.isArray(audit486)) {
  throw new Error(
    "invalid-486-variant-audit.json nao contem array."
  );
}

console.log(
  `Registos a verificar: ${audit486.length}`
);

if (audit486.length !== 486) {
  console.log(
    "ATENCAO: quantidade diferente de 486."
  );
}

const endpoint =
  `https://${SHOP}/admin/api/${API_VERSION}/graphql.json`;

async function shopifyGraphql(query, variables = {}) {

  const response =
    await fetch(
      endpoint,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "X-Shopify-Access-Token":
            TOKEN
        },

        body:
          JSON.stringify({
            query,
            variables
          }),

        signal:
          AbortSignal.timeout(60000)
      }
    );

  const body =
    await response.json();

  if (!response.ok) {

    throw new Error(
      `Shopify HTTP ${response.status}: ` +
      JSON.stringify(body).slice(0, 1500)
    );
  }

  if (body.errors?.length) {

    throw new Error(
      `Shopify GraphQL: ` +
      JSON.stringify(body.errors).slice(0, 2000)
    );
  }

  return body.data;
}

const QUERY = `
query AuditVariants(
  $first: Int!,
  $after: String
) {
  productVariants(
    first: $first,
    after: $after
  ) {
    nodes {
      id
      sku
      barcode
      price
      inventoryQuantity

      product {
        id
        title
        handle
        status
      }
    }

    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
`;

console.log("");
console.log(
  "A carregar variantes Shopify..."
);
console.log(
  "Isto pode demorar alguns minutos."
);
console.log("");

const shopifyVariants = [];

let after = null;
let page = 0;

while (true) {

  page += 1;

  const data =
    await shopifyGraphql(
      QUERY,
      {
        first: 250,
        after
      }
    );

  const connection =
    data.productVariants;

  const nodes =
    connection?.nodes || [];

  shopifyVariants.push(
    ...nodes
  );

  console.log(
    `Shopify: ${shopifyVariants.length.toLocaleString("pt-PT")} variantes lidas`
  );

  if (
    !connection?.pageInfo?.hasNextPage
  ) {
    break;
  }

  after =
    connection.pageInfo.endCursor;

  if (!after) {
    throw new Error(
      "Shopify indicou nova pagina mas nao forneceu cursor."
    );
  }

  await new Promise(
    resolve =>
      setTimeout(resolve, 120)
  );
}

console.log("");
console.log(
  `Total variantes Shopify: ${shopifyVariants.length}`
);

console.log("");
console.log(
  "A indexar Shopify por SKU..."
);

const bySku =
  new Map();

for (const variant of shopifyVariants) {

  const sku =
    normalizeSku(
      variant?.sku
    );

  if (!sku) {
    continue;
  }

  const rows =
    bySku.get(sku) || [];

  rows.push(variant);

  bySku.set(
    sku,
    rows
  );
}

console.log(
  `SKUs Shopify indexados: ${bySku.size}`
);

function matchesForSku(value) {

  const sku =
    normalizeSku(value);

  if (!sku) {
    return [];
  }

  return bySku.get(sku) || [];
}

function selectBest(matches) {

  if (!matches.length) {
    return null;
  }

  return matches[0];
}

console.log("");
console.log(
  "A cruzar os 486..."
);

const results = [];

for (const row of audit486) {

  const originalClassification =
    text(row.classification);

  const supabaseSku =
    text(row.supabaseSku);

  const currentSku =
    text(row.currentSku);

  const currentMatches =
    matchesForSku(currentSku);

  const oldMatches =
    matchesForSku(supabaseSku);

  let result = "";
  let selected = null;
  let actionCandidate = "";

  // ---------------------------------------------------------
  // 1. PRODUTO EXISTE ALLTRON E SKU E IGUAL
  // ---------------------------------------------------------

  if (
    originalClassification ===
    "PRESENT_EXACT_SKU_NO_VARIANT_ID"
  ) {

    if (currentMatches.length === 1) {

      result =
        "RECOVERABLE_EXACT_SKU";

      selected =
        currentMatches[0];

      actionCandidate =
        "BACKFILL_VARIANT_ID";

    }
    else if (
      currentMatches.length === 0
    ) {

      result =
        "PRESENT_ALLTRON_NOT_FOUND_SHOPIFY";

      actionCandidate =
        "INVESTIGATE";

    }
    else {

      result =
        "PRESENT_ALLTRON_DUPLICATE_SKU_SHOPIFY";

      selected =
        currentMatches[0];

      actionCandidate =
        "INVESTIGATE_DUPLICATE";
    }
  }

  // ---------------------------------------------------------
  // 2. PRODUTO EXISTE ALLTRON MAS SKU MUDOU
  // ---------------------------------------------------------

  else if (
    originalClassification ===
    "PRESENT_LITM_SKU_CHANGED_NO_VARIANT_ID"
  ) {

    if (currentMatches.length === 1) {

      result =
        "RECOVERABLE_CHANGED_SKU_CURRENT_FOUND";

      selected =
        currentMatches[0];

      actionCandidate =
        "UPDATE_SKU_AND_BACKFILL_VARIANT_ID";

    }
    else if (
      currentMatches.length === 0 &&
      oldMatches.length === 1
    ) {

      result =
        "CHANGED_SKU_OLD_SHOPIFY_ONLY";

      selected =
        oldMatches[0];

      actionCandidate =
        "INVESTIGATE_BEFORE_UPDATE";

    }
    else if (
      currentMatches.length === 0 &&
      oldMatches.length === 0
    ) {

      result =
        "CHANGED_SKU_NOT_FOUND_SHOPIFY";

      actionCandidate =
        "INVESTIGATE";

    }
    else {

      result =
        "CHANGED_SKU_AMBIGUOUS_SHOPIFY";

      selected =
        currentMatches[0] ||
        oldMatches[0] ||
        null;

      actionCandidate =
        "INVESTIGATE_DUPLICATE";
    }
  }

  // ---------------------------------------------------------
  // 3. PRODUTO JA NAO EXISTE NA ALLTRON
  // ---------------------------------------------------------

  else if (
    originalClassification ===
    "ABSENT_FROM_CURRENT_ALLTRON"
  ) {

    if (oldMatches.length === 0) {

      result =
        "OBSOLETE_NOT_IN_SHOPIFY";

      actionCandidate =
        "REMOVE_FROM_SUPABASE_CANDIDATE";

    }
    else if (
      oldMatches.length === 1
    ) {

      result =
        "OBSOLETE_STILL_IN_SHOPIFY";

      selected =
        oldMatches[0];

      actionCandidate =
        "DEACTIVATE_OR_REMOVE_CANDIDATE";

    }
    else {

      result =
        "OBSOLETE_DUPLICATE_SKU_SHOPIFY";

      selected =
        oldMatches[0];

      actionCandidate =
        "INVESTIGATE_DUPLICATE";
    }
  }

  // ---------------------------------------------------------
  // OUTROS
  // ---------------------------------------------------------

  else {

    result =
      "UNEXPECTED_CLASSIFICATION";

    actionCandidate =
      "INVESTIGATE";
  }

  results.push({

    result,

    originalClassification,

    litm:
      text(row.litm),

    supabaseSku,

    currentSku,

    alltronPrice:
      row.alltronPrice ?? "",

    alltronStock:
      row.stock ?? "",

    currentSkuShopifyMatches:
      currentMatches.length,

    oldSkuShopifyMatches:
      oldMatches.length,

    shopifyVariantId:
      selected?.id || "",

    shopifySku:
      selected?.sku || "",

    shopifyBarcode:
      selected?.barcode || "",

    shopifyPrice:
      selected?.price || "",

    shopifyInventory:
      selected?.inventoryQuantity ?? "",

    shopifyProductId:
      selected?.product?.id || "",

    shopifyTitle:
      selected?.product?.title || "",

    shopifyHandle:
      selected?.product?.handle || "",

    shopifyStatus:
      selected?.product?.status || "",

    actionCandidate
  });
}

fs.writeFileSync(
  OUTPUT_JSON,
  JSON.stringify(
    results,
    null,
    2
  ),
  "utf8"
);

saveCsv(
  results,
  OUTPUT_CSV
);

const counts =
  new Map();

for (const row of results) {

  counts.set(
    row.result,
    (counts.get(row.result) || 0) + 1
  );
}

const names = [
  "RECOVERABLE_EXACT_SKU",

  "RECOVERABLE_CHANGED_SKU_CURRENT_FOUND",
  "CHANGED_SKU_OLD_SHOPIFY_ONLY",
  "CHANGED_SKU_NOT_FOUND_SHOPIFY",
  "CHANGED_SKU_AMBIGUOUS_SHOPIFY",

  "PRESENT_ALLTRON_NOT_FOUND_SHOPIFY",
  "PRESENT_ALLTRON_DUPLICATE_SKU_SHOPIFY",

  "OBSOLETE_NOT_IN_SHOPIFY",
  "OBSOLETE_STILL_IN_SHOPIFY",
  "OBSOLETE_DUPLICATE_SKU_SHOPIFY",

  "UNEXPECTED_CLASSIFICATION"
];

console.log("");
console.log(
  "============================================="
);
console.log(
  "===== RESULTADO FINAL SHOPIFY ==============="
);
console.log(
  "============================================="
);
console.log("");

for (const name of names) {

  console.log(
    `${name.padEnd(45)}: ${counts.get(name) || 0}`
  );
}

const total =
  [...counts.values()]
    .reduce(
      (sum, value) =>
        sum + value,
      0
    );

console.log("");
console.log(
  `TOTAL CLASSIFICADO                            : ${total}`
);

console.log("");

if (total === 486) {

  console.log(
    "CONTAGEM FECHA 100%."
  );

}
else {

  console.log(
    "ERRO: CONTAGEM NAO FECHA 486."
  );
}

const recoverable =
  results.filter(
    row =>
      row.result ===
        "RECOVERABLE_EXACT_SKU" ||
      row.result ===
        "RECOVERABLE_CHANGED_SKU_CURRENT_FOUND"
  );

const investigate =
  results.filter(
    row =>
      row.actionCandidate.includes(
        "INVESTIGATE"
      )
  );

const obsolete =
  results.filter(
    row =>
      row.result.startsWith(
        "OBSOLETE_"
      )
  );

console.log("");
console.log(
  "===== RESUMO OPERACIONAL ====="
);

console.log(
  `Variant IDs recuperaveis automaticamente : ${recoverable.length}`
);

console.log(
  `Casos para investigar                    : ${investigate.length}`
);

console.log(
  `Casos obsoletos                          : ${obsolete.length}`
);

console.log("");
console.log(
  "===== AMOSTRA RECUPERAVEIS ====="
);

console.table(
  recoverable
    .slice(0, 15)
    .map(
      row => ({
        litm:
          row.litm,

        sku:
          row.currentSku ||
          row.supabaseSku,

        variantId:
          row.shopifyVariantId,

        shopifyPrice:
          row.shopifyPrice,

        status:
          row.shopifyStatus
      })
    )
);

console.log("");
console.log(
  "===== AMOSTRA A INVESTIGAR ====="
);

console.table(
  investigate
    .slice(0, 15)
    .map(
      row => ({
        result:
          row.result,

        litm:
          row.litm,

        oldSku:
          row.supabaseSku,

        currentSku:
          row.currentSku,

        shopifyMatches:
          row.currentSkuShopifyMatches +
          row.oldSkuShopifyMatches
      })
    )
);

console.log("");
console.log(
  "===== AMOSTRA OBSOLETOS ====="
);

console.table(
  obsolete
    .slice(0, 15)
    .map(
      row => ({
        result:
          row.result,

        litm:
          row.litm,

        sku:
          row.supabaseSku,

        shopifyVariant:
          row.shopifyVariantId,

        shopifyStatus:
          row.shopifyStatus
      })
    )
);

console.log("");
console.log(
  `JSON: ${OUTPUT_JSON}`
);

console.log(
  `CSV : ${OUTPUT_CSV}`
);

console.log("");
console.log(
  "NADA FOI ALTERADO NO SHOPIFY."
);

console.log(
  "NADA FOI ALTERADO NO SUPABASE."
);

console.log(
  "NAO EXECUTAR --apply AINDA."
);
