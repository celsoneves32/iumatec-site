// lib/shopify.ts
type ShopifyFetchOptions = {
  query: string;
  variables?: Record<string, any>;
  tags?: string[];
};

function getRequiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function shopifyFetch<T>({
  query,
  variables,
}: ShopifyFetchOptions): Promise<T> {
  const domain = getRequiredEnv("NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN");
  const token = getRequiredEnv("NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN");
  const apiVersion = process.env.NEXT_PUBLIC_SHOPIFY_API_VERSION || "2024-04";

  const res = await fetch(`https://${domain}/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();

  if (!res.ok || json?.errors) {
    const msg =
      json?.errors?.[0]?.message ||
      `Shopify request failed (${res.status})`;
    throw new Error(msg);
  }

  return json.data as T;
}
