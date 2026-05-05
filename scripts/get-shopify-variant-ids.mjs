const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || "2025-04";

if (!domain) {
  throw new Error("Missing SHOPIFY_STORE_DOMAIN");
}

if (!token) {
  throw new Error("Missing SHOPIFY_ADMIN_ACCESS_TOKEN");
}

const query = `
  query ProductsWithVariants($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          handle
          variants(first: 50) {
            edges {
              node {
                id
                sku
                title
              }
            }
          }
        }
      }
    }
  }
`;

async function fetchGraphQL(variables = {}) {
  const res = await fetch(`https://${domain}/admin/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token
    },
    body: JSON.stringify({
      query,
      variables
    })
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status} - ${txt}`);
  }

  const json = await res.json();

  if (json.errors?.length) {
    throw new Error(JSON.stringify(json.errors, null, 2));
  }

  return json.data;
}

async function run() {
  let after = null;
  let hasNextPage = true;
  const rows = [];

  while (hasNextPage) {
    const data = await fetchGraphQL({ first: 50, after });

    const products = data.products.edges;

    for (const edge of products) {
      const product = edge.node;

      for (const variantEdge of product.variants.edges) {
        const variant = variantEdge.node;

        const numericId = String(variant.id).split("/").pop();

        rows.push({
          handle: product.handle,
          productTitle: product.title,
          variantTitle: variant.title,
          sku: variant.sku || "",
          variantIdNumeric: numericId,
          merchandiseId: variant.id
        });
      }
    }

    hasNextPage = data.products.pageInfo.hasNextPage;
    after = data.products.pageInfo.endCursor;
  }

  console.log(JSON.stringify(rows, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});