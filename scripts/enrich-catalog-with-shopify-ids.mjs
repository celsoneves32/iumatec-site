import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || "2025-04";

if (!domain) {
  throw new Error("Missing SHOPIFY_STORE_DOMAIN");
}

if (!token) {
  throw new Error("Missing SHOPIFY_ADMIN_ACCESS_TOKEN");
}

const catalogPath = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "out",
  "iumatec-catalog-filtered.json"
);

if (!fs.existsSync(catalogPath)) {
  throw new Error(`Catalog file not found: ${catalogPath}`);
}

async function shopifyAdminFetch(query, variables = {}) {
  const res = await fetch(`https://${domain}/admin/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Shopify Admin HTTP ${res.status}: ${txt}`);
  }

  const json = await res.json();

  if (json.errors?.length) {
    throw new Error(JSON.stringify(json.errors, null, 2));
  }

  return json.data;
}

async function findVariantBySku(sku) {
  const query = `
    query FindVariantBySku($query: String!) {
      productVariants(first: 10, query: $query) {
        edges {
          node {
            id
            sku
            title
            product {
              id
              title
              handle
            }
          }
        }
      }
    }
  `;

  const data = await shopifyAdminFetch(query, {
    query: `sku:${sku}`,
  });

  const edges = data?.productVariants?.edges || [];
  const exact = edges.find((edge) => edge?.node?.sku === sku);

  return exact?.node || null;
}

async function run() {
  console.log("Shopify domain:", domain);
  console.log("Catalog path:", catalogPath);

  const raw = fs.readFileSync(catalogPath, "utf-8");
  const products = JSON.parse(raw);

  if (!Array.isArray(products)) {
    throw new Error("Catalog JSON is not an array");
  }

  const TEST_LIMIT = 20; // muda para null para correr tudo
  const sourceProducts =
    typeof TEST_LIMIT === "number" ? products.slice(0, TEST_LIMIT) : products;

  console.log(`Products to process: ${sourceProducts.length}`);

  let matched = 0;
  let notMatched = 0;
  let errors = 0;
  let index = 0;

  for (const product of sourceProducts) {
    index++;
    const sku = String(product.sku || "").trim();

    console.log(
      `[${index}/${sourceProducts.length}] Checking SKU: ${sku || "(empty)"}`
    );

    if (!sku) {
      product.merchandiseId = "";
      product.shopifyMatchStatus = "missing-sku";
      notMatched++;
      continue;
    }

    try {
      const variant = await findVariantBySku(sku);

      if (variant?.id) {
        product.merchandiseId = variant.id;
        product.shopifyVariantId = String(variant.id).split("/").pop();
        product.shopifyProductHandle = variant.product?.handle || "";
        product.shopifyProductTitle = variant.product?.title || "";
        product.shopifyVariantTitle = variant.title || "";
        product.shopifyMatchStatus = "matched";
        matched++;

        console.log(`   ✓ MATCHED → ${variant.id}`);
      } else {
        product.merchandiseId = "";
        product.shopifyMatchStatus = "not-found";
        notMatched++;

        console.log(`   - NOT FOUND`);
      }
    } catch (error) {
      product.merchandiseId = "";
      product.shopifyMatchStatus = "error";
      product.shopifyMatchError =
        error instanceof Error ? error.message : String(error);
      notMatched++;
      errors++;

      console.log(
        `   x ERROR → ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  if (typeof TEST_LIMIT === "number") {
    for (let i = 0; i < sourceProducts.length; i++) {
      products[i] = sourceProducts[i];
    }
  }

  fs.writeFileSync(catalogPath, JSON.stringify(products, null, 2), "utf-8");

  console.log("");
  console.log("========== DONE ==========");
  console.log(`Matched: ${matched}`);
  console.log(`Not matched: ${notMatched}`);
  console.log(`Errors: ${errors}`);
  console.log("==========================");
}

run().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});