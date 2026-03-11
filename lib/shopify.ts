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
  tags = [],
}: ShopifyFetchOptions): Promise<T> {
  const domain = getRequiredEnv("NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN");
  const token = getRequiredEnv("NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN");
  const apiVersion = process.env.SHOPIFY_API_VERSION || "2024-04";

  const res = await fetch(`https://${domain}/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
    next: {
      revalidate: 300,
      tags,
    },
  });

  const json = await res.json();

  if (!res.ok || json?.errors) {
    const msg =
      json?.errors?.[0]?.message || `Shopify request failed (${res.status})`;
    throw new Error(msg);
  }

  return json.data as T;
}

/* =========================
   TYPES
========================= */

export type ShopifyMoney = {
  amount: string;
  currencyCode: string;
};

export type ShopifyImage = {
  url: string;
  altText: string | null;
};

export type ShopifyProduct = {
  id: string;
  handle: string;
  title: string;
  description?: string;
  descriptionHtml?: string;
  featuredImage: ShopifyImage | null;
  images?: {
    edges: Array<{
      node: ShopifyImage;
    }>;
  };
  priceRange: {
    minVariantPrice: ShopifyMoney;
    maxVariantPrice?: ShopifyMoney;
  };
  variants?: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        availableForSale?: boolean;
        price: ShopifyMoney;
      };
    }>;
  };
  vendor?: string;
  productType?: string;
  tags?: string[];
};

export type ShopifyCollection = {
  id: string;
  handle: string;
  title: string;
  description?: string;
  image?: ShopifyImage | null;
};

/* =========================
   QUERIES
========================= */

const PRODUCTS_QUERY = /* GraphQL */ `
  query Products($first: Int!) {
    products(first: $first, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          handle
          title
          vendor
          productType
          tags
          featuredImage {
            url
            altText
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          variants(first: 1) {
            edges {
              node {
                id
                title
                availableForSale
                price {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    }
  }
`;

const COLLECTIONS_QUERY = /* GraphQL */ `
  query Collections($first: Int!) {
    collections(first: $first) {
      edges {
        node {
          id
          handle
          title
          description
          image {
            url
            altText
          }
        }
      }
    }
  }
`;

const COLLECTION_BY_HANDLE_QUERY = /* GraphQL */ `
  query CollectionByHandle($handle: String!) {
    collectionByHandle(handle: $handle) {
      id
      handle
      title
      description
      image {
        url
        altText
      }
      products(first: 24) {
        edges {
          node {
            id
            handle
            title
            vendor
            productType
            tags
            featuredImage {
              url
              altText
            }
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            variants(first: 1) {
              edges {
                node {
                  id
                  title
                  availableForSale
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

const PRODUCT_BY_HANDLE_QUERY = /* GraphQL */ `
  query ProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
      handle
      title
      description
      descriptionHtml
      vendor
      productType
      tags
      featuredImage {
        url
        altText
      }
      images(first: 10) {
        edges {
          node {
            url
            altText
          }
        }
      }
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
        maxVariantPrice {
          amount
          currencyCode
        }
      }
      variants(first: 20) {
        edges {
          node {
            id
            title
            availableForSale
            price {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`;

/* =========================
   HELPERS
========================= */

export async function getProducts(first = 12): Promise<ShopifyProduct[]> {
  const data = await shopifyFetch<{
    products: { edges: Array<{ node: ShopifyProduct }> };
  }>({
    query: PRODUCTS_QUERY,
    variables: { first },
    tags: ["products"],
  });

  return data.products.edges.map((edge) => edge.node);
}

export async function getCollections(first = 20): Promise<ShopifyCollection[]> {
  const data = await shopifyFetch<{
    collections: { edges: Array<{ node: ShopifyCollection }> };
  }>({
    query: COLLECTIONS_QUERY,
    variables: { first },
    tags: ["collections"],
  });

  return data.collections.edges.map((edge) => edge.node);
}

export async function getCollectionByHandle(handle: string): Promise<{
  collection: ShopifyCollection | null;
  products: ShopifyProduct[];
}> {
  const data = await shopifyFetch<{
    collectionByHandle:
      | (ShopifyCollection & {
          products: { edges: Array<{ node: ShopifyProduct }> };
        })
      | null;
  }>({
    query: COLLECTION_BY_HANDLE_QUERY,
    variables: { handle },
    tags: [`collection-${handle}`],
  });

  const collection = data.collectionByHandle;

  if (!collection) {
    return { collection: null, products: [] };
  }

  return {
    collection: {
      id: collection.id,
      handle: collection.handle,
      title: collection.title,
      description: collection.description,
      image: collection.image ?? null,
    },
    products: collection.products.edges.map((edge) => edge.node),
  };
}

export async function getProductByHandle(
  handle: string
): Promise<ShopifyProduct | null> {
  const data = await shopifyFetch<{
    productByHandle: ShopifyProduct | null;
  }>({
    query: PRODUCT_BY_HANDLE_QUERY,
    variables: { handle },
    tags: [`product-${handle}`],
  });

  return data.productByHandle;
}
