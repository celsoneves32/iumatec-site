const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = process.cwd();

const CANDIDATES = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "iumatec-348-candidates.json"
);

const STATE = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "shopify-master-sync-348",
  "state.json"
);

const SYNC = path.join(
  ROOT,
  "scripts",
  "sync-master-shopify-348.mjs"
);

const DOMAIN =
  process.env.SHOPIFY_STORE_DOMAIN ||
  process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;

const TOKEN =
  process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

const API_VERSION =
  process.env.SHOPIFY_ADMIN_API_VERSION ||
  "2026-04";

function readJson(file) {
  const raw = fs
    .readFileSync(file, "utf8")
    .replace(/^\uFEFF/, "");

  return JSON.parse(raw);
}

function norm(v) {
  return String(v ?? "")
    .trim()
    .toUpperCase();
}

function number(v) {
  if (v === null || v === undefined || v === "") {
    return NaN;
  }

  return Number(
    String(v)
      .replace(",", ".")
      .trim()
  );
}

async function gql(query, variables = {}) {
  const response = await fetch(
    `https://${DOMAIN}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": TOKEN
      },
      body: JSON.stringify({
        query,
        variables
      })
    }
  );

  const json = await response.json();

  if (!response.ok) {
    throw new Error(
      `Shopify HTTP ${response.status}: ${JSON.stringify(json)}`
    );
  }

  if (json.errors?.length) {
    throw new Error(
      `Shopify GraphQL: ${JSON.stringify(json.errors)}`
    );
  }

  return json.data;
}

const VARIANTS_QUERY = `
  query CheckVariants($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        sku
        price
        inventoryQuantity
        product {
          id
          title
          handle
          status
        }
      }
    }
  }
`;

async function verifyVariants(entries, expectedBySku) {

  const ids = entries.map(x => x.variantId);

  const data = await gql(
    VARIANTS_QUERY,
    { ids }
  );

  const problems = [];
  const results = [];

  for (const node of data.nodes) {

    if (!node) {
      problems.push("Variant inexistente.");
      continue;
    }

    const sku = norm(node.sku);

    const expected = expectedBySku.get(sku);

    if (!expected) {
      problems.push(
        `SKU Shopify nao existe nos 348: ${node.sku}`
      );
      continue;
    }

    const expectedPrice =
      number(expected.ecpr ?? expected.price);

    const shopifyPrice =
      number(node.price);

    const expectedStock =
      Math.max(
        0,
        Math.trunc(number(expected.stock) || 0)
      );

    const shopifyStock =
      Number(node.inventoryQuantity ?? 0);

    const priceOK =
      Number.isFinite(expectedPrice) &&
      Math.abs(expectedPrice - shopifyPrice) < 0.011;

    const stockOK =
      expectedStock === shopifyStock;

    const statusOK =
      node.product?.status === "ACTIVE";

    results.push({
      sku: node.sku,
      expectedPrice,
      shopifyPrice,
      expectedStock,
      shopifyStock,
      status: node.product?.status,
      priceOK,
      stockOK,
      statusOK
    });

    if (!priceOK) {
      problems.push(
        `${node.sku}: preco ${shopifyPrice}, esperado ${expectedPrice}`
      );
    }

    if (!stockOK) {
      problems.push(
        `${node.sku}: stock ${shopifyStock}, esperado ${expectedStock}`
      );
    }

    if (!statusOK) {
      problems.push(
        `${node.sku}: status ${node.product?.status}`
      );
    }
  }

  return {
    results,
    problems
  };
}

function runSync() {
  return new Promise((resolve, reject) => {

    const child = spawn(
      process.execPath,
      [
        "--env-file=.env.local",
        SYNC
      ],
      {
        cwd: ROOT,

        env: {
          ...process.env,

          SYNC_DRY_RUN: "false",

          // 0 = todos os pendentes.
          SYNC_MAX_PRODUCTS: "0",

          // Mais rapido, mas ainda conservador.
          SYNC_CONCURRENCY: "2"
        },

        stdio: "inherit"
      }
    );

    child.on("error", reject);

    child.on("exit", code => {
      resolve(code);
    });
  });
}

(async () => {

  console.log("");
  console.log("==============================================");
  console.log("        FECHAR OS 348 DEFINITIVAMENTE");
  console.log("==============================================");

  if (!DOMAIN) {
    throw new Error(
      "SHOPIFY_STORE_DOMAIN nao encontrado."
    );
  }

  if (!TOKEN) {
    throw new Error(
      "SHOPIFY_ADMIN_ACCESS_TOKEN nao encontrado."
    );
  }

  const candidates = readJson(CANDIDATES);

  if (!Array.isArray(candidates)) {
    throw new Error(
      "iumatec-348-candidates.json nao e array."
    );
  }

  if (candidates.length !== 348) {
    throw new Error(
      `PARAR: candidatos=${candidates.length}; esperado=348.`
    );
  }

  const expectedBySku = new Map();

  for (const product of candidates) {

    const sku = norm(product.sku);

    if (!sku) {
      throw new Error(
        "Existe candidato sem SKU."
      );
    }

    if (expectedBySku.has(sku)) {
      throw new Error(
        `SKU duplicado: ${sku}`
      );
    }

    expectedBySku.set(
      sku,
      product
    );
  }

  console.log("Candidatos preparados : 348");
  console.log("SKUs unicos           : 348");

  if (!fs.existsSync(STATE)) {
    throw new Error(
      "state.json dos 5 reais nao existe."
    );
  }

  let state = readJson(STATE);

  const successEntries =
    Object.entries(
      state.success || {}
    ).map(([sku, value]) => ({
      sku,
      ...value
    }));

  console.log("");
  console.log(
    "Produtos reais ja no state:",
    successEntries.length
  );

  if (successEntries.length !== 5) {
    throw new Error(
      `PARAR: esperado state com 5 reais; encontrado ${successEntries.length}.`
    );
  }

  for (const item of successEntries) {

    if (!item.productId || !item.variantId) {
      throw new Error(
        `Falta Product/Variant ID em ${item.sku}`
      );
    }
  }

  console.log("");
  console.log("==============================================");
  console.log(" VERIFICAR OS 5 REAIS DIRETAMENTE NA SHOPIFY");
  console.log("==============================================");

  const fiveCheck =
    await verifyVariants(
      successEntries,
      expectedBySku
    );

  console.table(
    fiveCheck.results
  );

  if (fiveCheck.problems.length) {

    console.log("");
    console.log("PROBLEMAS:");

    for (const problem of fiveCheck.problems) {
      console.log("-", problem);
    }

    throw new Error(
      "PARAR: os 5 reais nao passaram a verificacao."
    );
  }

  if (fiveCheck.results.length !== 5) {
    throw new Error(
      `PARAR: Shopify devolveu apenas ${fiveCheck.results.length}/5.`
    );
  }

  console.log("");
  console.log("==============================================");
  console.log("          5 / 5 VERIFICADOS OK");
  console.log("==============================================");
  console.log("");
  console.log("SKU    : OK");
  console.log("Preco  : OK");
  console.log("Stock  : OK");
  console.log("Status : ACTIVE");
  console.log("");
  console.log("A iniciar os 343 restantes...");
  console.log("Concurrency: 2");
  console.log("");

  const code =
    await runSync();

  if (code !== 0) {
    throw new Error(
      `SYNC terminou com EXIT CODE ${code}. NAO REPETIR.`
    );
  }

  console.log("");
  console.log("==============================================");
  console.log("          VERIFICACAO DO STATE FINAL");
  console.log("==============================================");

  state = readJson(STATE);

  const finalEntries =
    Object.entries(
      state.success || {}
    ).map(([sku, value]) => ({
      sku,
      ...value
    }));

  console.log(
    "Success no state:",
    finalEntries.length
  );

  console.log(
    "Errors no state:",
    state.totals?.errors ?? 0
  );

  if (finalEntries.length !== 348) {
    throw new Error(
      `PARAR: state terminou com ${finalEntries.length}/348.`
    );
  }

  if (
    Number(state.totals?.errors ?? 0) !== 0
  ) {
    throw new Error(
      `PARAR: state contém ${state.totals.errors} erros.`
    );
  }

  console.log("");
  console.log("==============================================");
  console.log(" VERIFICAR OS 348 DIRETAMENTE NA SHOPIFY");
  console.log("==============================================");

  let checked = 0;
  const allProblems = [];

  const BATCH = 50;

  for (
    let start = 0;
    start < finalEntries.length;
    start += BATCH
  ) {

    const batch =
      finalEntries.slice(
        start,
        start + BATCH
      );

    const result =
      await verifyVariants(
        batch,
        expectedBySku
      );

    checked += result.results.length;

    allProblems.push(
      ...result.problems
    );

    console.log(
      `Verificados: ${checked}/348`
    );
  }

  console.log("");
  console.log("==============================================");
  console.log("             RESULTADO FINAL");
  console.log("==============================================");

  console.log(
    "Shopify encontrados :",
    checked
  );

  console.log(
    "Problemas           :",
    allProblems.length
  );

  if (
    checked !== 348 ||
    allProblems.length !== 0
  ) {

    if (allProblems.length) {

      console.log("");

      for (
        const problem of
        allProblems.slice(0, 30)
      ) {
        console.log("-", problem);
      }
    }

    throw new Error(
      "PARAR: verificacao final dos 348 nao ficou limpa."
    );
  }

  console.log("");
  console.log("==============================================");
  console.log("          348 / 348 CONCLUIDOS");
  console.log("==============================================");
  console.log("");
  console.log("5 iniciais verificados : OK");
  console.log("343 restantes criados  : OK");
  console.log("348 presentes Shopify  : OK");
  console.log("Precos ECPR            : OK");
  console.log("Stocks                  : OK");
  console.log("Status ACTIVE           : OK");
  console.log("Erros                   : 0");
  console.log("");
  console.log("CRIACAO SHOPIFY TERMINADA.");
  console.log("");
  console.log(
    "NAO EXECUTAR O SYNC 348 NOVAMENTE."
  );

})().catch(error => {

  console.error("");
  console.error("==============================================");
  console.error("                 PARADO");
  console.error("==============================================");
  console.error(error.message);
  console.error("");
  console.error(
    "NAO EXECUTAR NOVAMENTE SEM VERIFICAR O RESULTADO."
  );

  process.exit(1);
});
