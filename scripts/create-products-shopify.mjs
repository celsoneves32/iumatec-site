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

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function shopifyFetch(query, variables = {}) {
  const res = await fetch(`https://${domain}/admin/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(json, null, 2)}`);
  }

  if (json.errors?.length) {
    throw new Error(JSON.stringify(json.errors, null, 2));
  }

  return json.data;
}

async function findProductByHandle(handle) {
  const query = `
    query FindProductByHandle($query: String!) {
      products(first: 1, query: $query) {
        edges {
          node {
            id
            title
            handle
            variants(first: 10) {
              edges {
                node {
                  id
                  sku
                  inventoryItem {
                    id
                    sku
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await shopifyFetch(query, {
    query: `handle:${handle}`,
  });

  return data?.products?.edges?.[0]?.node || null;
}

async function createProduct(product) {
  const mutation = `
    mutation productCreate($input: ProductCreateInput!) {
      productCreate(product: $input) {
        product {
          id
          title
          handle
          variants(first: 1) {
            edges {
              node {
                id
                inventoryItem {
                  id
                  sku
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const title = product.fullTitle || product.title || product.name || product.sku;
  const handle = product.slug || slugify(title);

  const data = await shopifyFetch(mutation, {
    input: {
      title,
      handle,
      descriptionHtml: product.description || "",
      productType: product.category || "Tech",
      vendor: product.brand || "IUMATEC",
      status: "ACTIVE",
      tags: ["alltron", "iumatec"],
    },
  });

  const userErrors = data?.productCreate?.userErrors || [];
  if (userErrors.length) {
    throw new Error(JSON.stringify(userErrors, null, 2));
  }

  return data?.productCreate?.product || null;
}

async function updateVariantPrice(productId, variantId, price) {
  const mutation = `
    mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyFetch(mutation, {
    productId,
    variants: [
      {
        id: variantId,
        price: String(price ?? 0),
      },
    ],
  });

  const userErrors = data?.productVariantsBulkUpdate?.userErrors || [];
  if (userErrors.length) {
    throw new Error(JSON.stringify(userErrors, null, 2));
  }

  return data?.productVariantsBulkUpdate?.productVariants?.[0] || null;
}

async function updateInventoryItemSku(inventoryItemId, sku) {
  const mutation = `
    mutation inventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
      inventoryItemUpdate(id: $id, input: $input) {
        inventoryItem {
          id
          sku
          tracked
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyFetch(mutation, {
    id: inventoryItemId,
    input: {
      sku: String(sku || ""),
      tracked: true,
    },
  });

  const userErrors = data?.inventoryItemUpdate?.userErrors || [];
  if (userErrors.length) {
    throw new Error(JSON.stringify(userErrors, null, 2));
  }

  return data?.inventoryItemUpdate?.inventoryItem || null;
}

async function run() {
  const raw = fs.readFileSync(catalogPath, "utf-8");
  const products = JSON.parse(raw);

  if (!Array.isArray(products)) {
    throw new Error("Catalog JSON is not an array");
  }

  const TEST_LIMIT = null; // muda para null quando quiseres correr tudo
  const sourceProducts =
    typeof TEST_LIMIT === "number" ? products.slice(0, TEST_LIMIT) : products;

  console.log(`Shopify domain: ${domain}`);
  console.log(`Catalog path: ${catalogPath}`);
  console.log(`Products to process: ${sourceProducts.length}`);

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let index = 0;

  for (const product of sourceProducts) {
    index++;

    const title = product.fullTitle || product.title || product.name || product.sku;
    const handle = product.slug || slugify(title);
    const sku = String(product.sku || "").trim();
    const price = Number(product.price ?? 0);

    console.log("");
    console.log(`[${index}/${sourceProducts.length}] ${title}`);
    console.log(`Handle: ${handle}`);
    console.log(`SKU: ${sku || "(empty)"}`);

    if (!sku) {
      console.log(`- SKIPPED: missing SKU`);
      product.shopifyCreateStatus = "missing-sku";
      skippedCount++;
      continue;
    }

    try {
      let shopifyProduct = await findProductByHandle(handle);

      if (!shopifyProduct?.id) {
        shopifyProduct = await createProduct(product);

        if (!shopifyProduct?.id) {
          console.log(`- ERROR: product not created`);
          product.shopifyCreateStatus = "create-failed";
          errorCount++;
          continue;
        }

        console.log(`- Product created: ${shopifyProduct.id}`);
      } else {
        console.log(`- Product already exists: ${shopifyProduct.id}`);
      }

      const firstVariant = shopifyProduct?.variants?.edges?.[0]?.node || null;
      const variantId = firstVariant?.id || "";
      const inventoryItemId = firstVariant?.inventoryItem?.id || "";

      if (!variantId || !inventoryItemId) {
        console.log(`- ERROR: missing default variant or inventory item`);
        product.shopifyCreateStatus = "missing-default-variant";
        errorCount++;
        continue;
      }

      const updatedVariant = await updateVariantPrice(
        shopifyProduct.id,
        variantId,
        price
      );

      console.log(`- Variant price updated: ${updatedVariant?.id || variantId}`);

      const updatedInventoryItem = await updateInventoryItemSku(
        inventoryItemId,
        sku
      );

      console.log(`- Inventory SKU updated: ${updatedInventoryItem?.sku || sku}`);

      product.shopifyProductId = shopifyProduct.id;
      product.shopifyVariantId = String(variantId).split("/").pop();
      product.merchandiseId = variantId;
      product.shopifyProductHandle = shopifyProduct.handle || handle;
      product.shopifyProductTitle = shopifyProduct.title || title;
      product.shopifyCreateStatus = shopifyProduct?.variants ? "updated-existing" : "created";

      if (shopifyProduct?.variants) {
        updatedCount++;
      } else {
        createdCount++;
      }
    } catch (error) {
      product.shopifyCreateStatus = "error";
      product.shopifyCreateError =
        error instanceof Error ? error.message : String(error);

      console.log(
        `- ERROR: ${error instanceof Error ? error.message : String(error)}`
      );

      errorCount++;
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
  console.log(`Created: ${createdCount}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log("==========================");
}

run().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});