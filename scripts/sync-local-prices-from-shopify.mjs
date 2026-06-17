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

function variantGid(p) {
  const id = p.merchandiseId || p.shopifyVariantId;
  if (!id) return null;
  if (String(id).startsWith("gid://shopify/ProductVariant/")) return String(id);
  return `gid://shopify/ProductVariant/${String(id).replace(/[^\d]/g, "")}`;
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

async function getVariantPrices(ids) {
  const query = `
    query GetVariantPrices($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on ProductVariant {
          id
          price
        }
      }
    }
  `;

  const data = await shopifyFetch(query, { ids });
  const map = new Map();

  for (const node of data.nodes || []) {
    if (node?.id && node?.price) {
      map.set(node.id, Number(node.price));
    }
  }

  return map;
}

async function run() {
  const allIds = new Set();

  for (const file of files) {
    const full = path.join(process.cwd(), file);
    if (!fs.existsSync(full)) continue;

    const items = JSON.parse(fs.readFileSync(full, "utf8"));
    if (!Array.isArray(items)) continue;

    for (const p of items) {
      const id = variantGid(p);
      if (id) allIds.add(id);
    }
  }

  const ids = [...allIds];
  console.log("Variants found:", ids.length);

  const priceMap = new Map();

  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const result = await getVariantPrices(batch);

    for (const [id, price] of result.entries()) {
      priceMap.set(id, price);
    }

    console.log(`Loaded prices: ${Math.min(i + 100, ids.length)}/${ids.length}`);
  }

  let changed = 0;

  for (const file of files) {
    const full = path.join(process.cwd(), file);
    if (!fs.existsSync(full)) continue;

    const items = JSON.parse(fs.readFileSync(full, "utf8"));
    if (!Array.isArray(items)) continue;

    let fileChanged = 0;

    for (const p of items) {
      const id = variantGid(p);
      if (!id) continue;

      const shopifyPrice = priceMap.get(id);
      if (!shopifyPrice) continue;

      const oldPrice = Number(p.price || 0);

      if (oldPrice !== shopifyPrice) {
        p.price = shopifyPrice;
        fileChanged++;
        changed++;
      }
    }

    fs.writeFileSync(full, JSON.stringify(items, null, 2), "utf8");
    console.log(`${file}: ${fileChanged} prices updated`);
  }

  console.log("DONE. Total changed:", changed);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});