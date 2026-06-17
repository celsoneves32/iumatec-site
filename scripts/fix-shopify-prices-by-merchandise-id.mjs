import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || "2025-04";

if (!domain) throw new Error("Missing SHOPIFY_STORE_DOMAIN");
if (!token) throw new Error("Missing SHOPIFY_ADMIN_ACCESS_TOKEN");

const files = [
  "integrations/alltron/out/iumatec-catalog-live.json",
  "integrations/alltron/out/winning-products.json",
  "integrations/alltron/out/iumatec-catalog-sellable.json",
  "integrations/alltron/out/iumatec-catalog-filtered.json",
  "integrations/alltron/out/iumatec-catalog-enriched.json",
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function shopifyFetch(query, variables) {
  const res = await fetch(`https://${domain}/admin/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();

  if (!res.ok || json.errors) {
    throw new Error(JSON.stringify(json.errors || json, null, 2));
  }

  return json.data;
}

function variantGid(product) {
  const id = product.merchandiseId || product.shopifyVariantId;
  if (!id) return null;
  if (String(id).startsWith("gid://shopify/ProductVariant/")) return String(id);
  return `gid://shopify/ProductVariant/${String(id).replace(/[^\d]/g, "")}`;
}

async function updatePrice(productId, variantId, price) {
  const mutation = `
    mutation UpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        userErrors { field message }
      }
    }
  `;

  const data = await shopifyFetch(mutation, {
    productId,
    variants: [{ id: variantId, price: Number(price).toFixed(2) }],
  });

  const errors = data.productVariantsBulkUpdate.userErrors || [];
  if (errors.length) throw new Error(JSON.stringify(errors));
}

async function getVariant(variantId) {
  const query = `
    query GetVariant($id: ID!) {
      productVariant(id: $id) {
        id
        price
        product { id title handle }
      }
    }
  `;

  return (await shopifyFetch(query, { id: variantId })).productVariant;
}

async function run() {
  const map = new Map();

  for (const file of files) {
    const full = path.join(process.cwd(), file);
    if (!fs.existsSync(full)) continue;

    const items = JSON.parse(fs.readFileSync(full, "utf8"));
    if (!Array.isArray(items)) continue;

    for (const p of items) {
      const id = variantGid(p);
      const price = Number(p.price || 0);

      if (!id || !price || p.shopifySyncStatus === "not-found" || p.shopifySyncStatus === "error") {
        continue;
      }

      map.set(id, {
        variantId: id,
        price,
        title: p.title,
        sku: p.sku,
      });
    }
  }

  console.log(`Variants to sync: ${map.size}`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const item of map.values()) {
    try {
      const variant = await getVariant(item.variantId);

      if (!variant?.product?.id) {
        skipped++;
        continue;
      }

      const oldPrice = Number(variant.price);
      const newPrice = Number(item.price);

      if (oldPrice === newPrice) {
        skipped++;
        continue;
      }

      await updatePrice(variant.product.id, item.variantId, newPrice);

      console.log(`${item.sku || ""} | ${item.title}`);
      console.log(`- Shopify: ${oldPrice} -> ${newPrice}`);

      updated++;
      await sleep(250);
    } catch (e) {
      console.log(`ERROR ${item.sku || item.variantId}:`, e.message);
      errors++;
    }
  }

  console.log("DONE");
  console.log({ updated, skipped, errors });
}

run();