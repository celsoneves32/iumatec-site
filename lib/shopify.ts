const domain =
  process.env.SHOPIFY_STORE_DOMAIN ||
  process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;

const storefrontAccessToken =
  process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ||
  process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

const apiVersion =
  process.env.SHOPIFY_API_VERSION ||
  process.env.NEXT_PUBLIC_SHOPIFY_API_VERSION ||
  "2024-04";

if (!domain) {
  throw new Error("Missing env var: SHOPIFY_STORE_DOMAIN");
}

if (!storefrontAccessToken) {
  throw new Error("Missing env var: SHOPIFY_STOREFRONT_ACCESS_TOKEN");
}

const endpoint = `https://${domain}/api/${apiVersion}/graphql.json`;

type ShopifyFetchParams<TVariables = Record<string, unknown>> = {
  query: string;
  variables?: TVariables;
  cache?: RequestCache;
};

type ShopifyErrorItem = {
  message: string;
  locations?: { line: number; column: number }[];
  path?: string[];
  extensions?: Record<string, unknown>;
};

type ShopifyResponse<TData> = {
  data?: TData;
  errors?: ShopifyErrorItem[];
};

export async function shopifyFetch<TData, TVariables = Record<string, unknown>>({
  query,
  variables,
  cache = "no-store",
}: ShopifyFetchParams<TVariables>): Promise<TData> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": storefrontAccessToken,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
    cache,
  });

  const text = await res.text();

  let json: ShopifyResponse<TData>;
  try {
    json = JSON.parse(text);
  } catch {
    console.error("Shopify non-JSON response:", text);
    throw new Error(`Shopify returned invalid JSON (${res.status})`);
  }

  if (!res.ok) {
    console.error("Shopify HTTP error:", {
      status: res.status,
      statusText: res.statusText,
      body: json,
    });

    throw new Error(`Shopify HTTP error ${res.status}: ${res.statusText}`);
  }

  if (json.errors?.length) {
    console.error("Shopify GraphQL errors:", json.errors);

    throw new Error(
      `Shopify GraphQL error: ${json.errors.map((e) => e.message).join(" | ")}`
    );
  }

  if (!json.data) {
    console.error("Shopify missing data:", json);
    throw new Error("Shopify response missing data");
  }

  return json.data;
}

type ShopifyImage = {
  url: string;
  altText?: string | null;
};

export type ShopifyCollectionCard = {
  id: string;
  title: string;
  handle: string;
  image: ShopifyImage | null;
};

export async function getCollectionByHandle(handle: string): Promise<ShopifyCollectionCard | null> {
  const data = await shopifyFetch<{
    collection: {
      id: string;
      title: string;
      handle: string;
      image?: ShopifyImage | null;
    } | null;
  }>({
    query: `
      query GetCollectionByHandle($handle: String!) {
        collection(handle: $handle) {
          id
          title
          handle
          image {
            url
            altText
          }
        }
      }
    `,
    variables: { handle },
  });

  if (!data.collection) return null;

  return {
    id: data.collection.id,
    title: data.collection.title,
    handle: data.collection.handle,
    image: data.collection.image ?? null,
  };
}

export async function getFeaturedCollections(handles: string[]): Promise<ShopifyCollectionCard[]> {
  const results = await Promise.allSettled(
    handles.map((handle) => getCollectionByHandle(handle))
  );

  return results
    .filter(
      (
        result
      ): result is PromiseFulfilledResult<ShopifyCollectionCard | null> =>
        result.status === "fulfilled"
    )
    .map((result) => result.value)
    .filter((collection): collection is ShopifyCollectionCard => Boolean(collection));
}