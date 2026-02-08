// lib/shopify.ts
type ShopifyResponse<T> = { data?: T; errors?: any };

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
const version = process.env.SHOPIFY_API_VERSION || "2024-10";

if (!domain || !token) {
  throw new Error(
    "Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_STOREFRONT_ACCESS_TOKEN"
  );
}

export async function shopifyFetch<T>(params: {
  query: string;
  variables?: Record<string, any>;
  cache?: RequestCache;
}): Promise<T> {
  const { query, variables, cache = "no-store" } = params;

  const res = await fetch(`https://${domain}/api/${version}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
    cache,
  });

  const json = (await res.json()) as ShopifyResponse<T>;

  if (!res.ok || json.errors) {
    console.error("Shopify fetch error:", json.errors);
    throw new Error("Shopify API error");
  }

  if (!json.data) throw new Error("No data returned from Shopify");
  return json.data;
}
