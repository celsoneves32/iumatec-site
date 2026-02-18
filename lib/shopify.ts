// lib/shopify.ts
type ShopifyFetchParams<T> = {
  query: string;
  variables?: Record<string, any>;
  cache?: RequestCache;
  tags?: string[];
};

const endpoint = () => {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  if (!domain) return null;
  return `https://${domain}/api/2024-04/graphql.json`;
};

export async function shopifyFetch<T>({
  query,
  variables,
  cache = "no-store",
}: ShopifyFetchParams<T>): Promise<T | null> {
  const url = endpoint();
  const token = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

  // ✅ NÃO rebenta build/SSR — só devolve null
  if (!url || !token) {
    console.warn("Shopify env vars missing. Returning null data.");
    return null;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
    cache,
  });

  if (!res.ok) {
    console.warn("Shopify fetch failed:", res.status, res.statusText);
    return null;
  }

  const json = (await res.json()) as { data?: T; errors?: any };
  if (json.errors) {
    console.warn("Shopify graphql errors:", json.errors);
    return null;
  }

  return json.data ?? null;
}
