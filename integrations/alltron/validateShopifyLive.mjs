import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const domain =
  process.env.SHOPIFY_STORE_DOMAIN ||
  process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;

const token =
  process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ||
  process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

const apiVersion =
  process.env.SHOPIFY_API_VERSION ||
  process.env.NEXT_PUBLIC_SHOPIFY_API_VERSION ||
  "2025-04";

if (!domain || !token) {
  throw new Error("Faltam SHOPIFY_STORE_DOMAIN ou SHOPIFY_STOREFRONT_ACCESS_TOKEN");
}

const SHOPIFY_URL = `https://${domain}/api/${apiVersion}/graphql.json`;

const INPUT_PATH = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "out",
  "iumatec-catalog-sellable.json"
);

const OUTPUT_PATH = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "out",
  "iumatec-catalog-live.json"
);

async function shopifyFetch(query, variables) {
  const res = await fetch(SHOPIFY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  return json;
}

// 🔥 VALIDA SÓ VARIANTES (RÁPIDO)
async function validateVariant(id) {
  try {
    const query = `
      query ($id: ID!) {
        node(id: $id) {
          ... on ProductVariant {
            id
            title
          }
        }
      }
    `;

    const res = await shopifyFetch(query, { id });

    return !!res?.data?.node;
  } catch {
    return false;
  }
}

async function run() {
  const raw = fs.readFileSync(INPUT_PATH, "utf-8");
  const products = JSON.parse(raw);

  console.log(`📦 Total produtos: ${products.length}`);

  // 🔥 FILTRO INTELIGENTE (CRÍTICO)
  const candidates = products.filter(
    (p) =>
      p.merchandiseId &&
      typeof p.merchandiseId === "string" &&
      p.merchandiseId.includes("ProductVariant")
  );

  console.log(`🎯 Produtos com Shopify: ${candidates.length}`);

  const valid = [];
  let removed = 0;

  // 🔥 LOOP OTIMIZADO
  for (let i = 0; i < candidates.length; i++) {
    const p = candidates[i];

    const ok = await validateVariant(p.merchandiseId);

    if (ok) {
      valid.push(p);
    } else {
      removed++;
      console.log(`❌ Removido: ${p.slug}`);
    }

    // 🔥 RATE LIMIT SAFE
    if (i % 20 === 0) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(valid, null, 2));

  console.log("\n✅ FINAL:");
  console.log(`✔ Válidos: ${valid.length}`);
  console.log(`❌ Removidos: ${removed}`);
  console.log(`📁 Guardado em: ${OUTPUT_PATH}`);
}

run();