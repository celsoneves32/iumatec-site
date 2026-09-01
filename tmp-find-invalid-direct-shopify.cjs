const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const DOMAIN = String(
  process.env.SHOPIFY_STORE_DOMAIN ||
  process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ||
  ""
)
  .replace(/^https?:\/\//, "")
  .replace(/\/+$/, "");

const TOKEN = String(
  process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || ""
).trim();

const API_VERSION =
  process.env.SHOPIFY_ADMIN_API_VERSION ||
  "2026-04";

if (!DOMAIN) throw new Error("SHOPIFY_STORE_DOMAIN em falta.");
if (!TOKEN) throw new Error("SHOPIFY_ADMIN_ACCESS_TOKEN em falta.");

const REPORT = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "shopify-price-reconcile",
  "invalid-variant-classification.json"
);

const OUT = path.join(
  ROOT,
  "integrations",
  "alltron",
  "out",
  "shopify-price-reconcile",
  "invalid-variant-shopify-lookup.json"
);

const data = JSON.parse(
  fs.readFileSync(REPORT, "utf8").replace(/^\uFEFF/, "")
);

const items = Array.isArray(data.result)
  ? data.result
  : [];

const gqlText = `
query FindVariants($query: String!) {
  productVariants(first: 20, query: $query) {
    nodes {
      id
      sku
      barcode
      price
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

function text(v) {
  return String(v ?? "").trim();
}

function escapeSearch(v) {
  return text(v)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
}

async function gql(query, variables) {
  const res = await fetch(
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

  const body = await res.json();

  if (!res.ok) {
    throw new Error(
      `Shopify HTTP ${res.status}: ${JSON.stringify(body)}`
    );
  }

  if (body.errors?.length) {
    throw new Error(
      `GraphQL: ${JSON.stringify(body.errors)}`
    );
  }

  return body.data;
}

async function search(query) {
  const data = await gql(
    gqlText,
    { query }
  );

  return data.productVariants.nodes || [];
}

function uniqueVariants(rows) {
  const map = new Map();

  for (const row of rows) {
    if (row?.id) {
      map.set(row.id, row);
    }
  }

  return [...map.values()];
}

(async () => {
  console.log("");
  console.log("===============================================");
  console.log(" PROCURAR OS 30 DIRETAMENTE NA SHOPIFY");
  console.log("===============================================");
  console.log("");
  console.log("READ ONLY - NADA SERA ALTERADO");
  console.log("");

  if (!items.length) {
    throw new Error("Relatorio nao contem produtos.");
  }

  console.log("Produtos a procurar:", items.length);
  console.log("");

  const results = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const sku = text(item.sku);
    const ean = text(item.ean);

    let skuRows = [];
    let eanRows = [];

    if (sku) {
      skuRows = await search(
        `sku:"${escapeSearch(sku)}"`
      );
    }

    if (ean) {
      eanRows = await search(
        `barcode:"${escapeSearch(ean)}"`
      );
    }

    const all = uniqueVariants([
      ...skuRows,
      ...eanRows
    ]);

    const exact = all.filter(v => {
      const sameSku =
        sku &&
        text(v.sku).toUpperCase() ===
        sku.toUpperCase();

      const sameEan =
        ean &&
        text(v.barcode) === ean;

      return sameSku || sameEan;
    });

    let status;

    if (exact.length === 1) {
      status = "ENCONTRADO_UNICO";
    } else if (exact.length > 1) {
      status = "AMBIGUO";
    } else {
      status = "NAO_ENCONTRADO";
    }

    const chosen =
      exact.length === 1
        ? exact[0]
        : null;

    results.push({
      sku,
      ean,
      invalidRows: item.invalidRows,
      previousStatus: item.status,

      status,

      matches: exact.length,

      shopifyVariantId:
        chosen?.id || "",

      shopifyProductId:
        chosen?.product?.id || "",

      shopifySku:
        chosen?.sku || "",

      shopifyBarcode:
        chosen?.barcode || "",

      shopifyTitle:
        chosen?.product?.title || "",

      shopifyHandle:
        chosen?.product?.handle || "",

      shopifyStatus:
        chosen?.product?.status || ""
    });

    console.log(
      `[${i + 1}/${items.length}]`,
      status.padEnd(18),
      sku
    );
  }

  const found = results.filter(
    r => r.status === "ENCONTRADO_UNICO"
  );

  const missing = results.filter(
    r => r.status === "NAO_ENCONTRADO"
  );

  const ambiguous = results.filter(
    r => r.status === "AMBIGUO"
  );

  console.log("");
  console.log("===============================================");
  console.log(" RESULTADO FINAL");
  console.log("===============================================");
  console.log("Produtos analisados :", results.length);
  console.log("Encontrados unicos  :", found.length);
  console.log("Nao encontrados     :", missing.length);
  console.log("Ambiguos            :", ambiguous.length);
  console.log("");

  console.table(
    results.map(r => ({
      sku: r.sku,
      ean: r.ean,
      invalidRows: r.invalidRows,
      status: r.status,
      variantId: r.shopifyVariantId,
      productId: r.shopifyProductId,
      shopifyStatus: r.shopifyStatus
    }))
  );

  fs.writeFileSync(
    OUT,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        counts: {
          total: results.length,
          found: found.length,
          missing: missing.length,
          ambiguous: ambiguous.length
        },
        results
      },
      null,
      2
    ),
    "utf8"
  );

  console.log("");
  console.log("Relatorio:");
  console.log(OUT);
  console.log("");
  console.log("NADA FOI ALTERADO.");
})().catch(error => {
  console.error("");
  console.error("ERRO:", error.message);
  process.exit(1);
});
