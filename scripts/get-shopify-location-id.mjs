import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || "2025-04";

if (!domain) {
  throw new Error("Missing SHOPIFY_STORE_DOMAIN");
}

if (!token) {
  throw new Error("Missing SHOPIFY_ADMIN_ACCESS_TOKEN");
}

async function shopifyFetch(query, variables = {}) {
  const res = await fetch(`https://${domain}/admin/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token
    },
    body: JSON.stringify({ query, variables })
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

async function run() {
  const query = `
    query GetLocations {
      locations(first: 20) {
        edges {
          node {
            id
            name
            fulfillsOnlineOrders
            isActive
          }
        }
      }
    }
  `;

  const data = await shopifyFetch(query);
  const locations = data?.locations?.edges?.map((edge) => edge.node) || [];

  console.log("Shopify Locations:");
  for (const loc of locations) {
    console.log(
      `- ${loc.name} | ${loc.id} | active=${loc.isActive} | online=${loc.fulfillsOnlineOrders}`
    );
  }
}

run().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});