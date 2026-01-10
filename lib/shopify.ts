// lib/shopify.ts
const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const SHOPIFY_STOREFRONT_ACCESS_TOKEN =
  process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || "2024-04";

if (!SHOPIFY_DOMAIN || !SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
  console.warn("⚠️ Shopify env vars fehlen. Bitte .env.local prüfen.");
}

async function shopifyFetch<T>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  const res = await fetch(
    `https://${SHOPIFY_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: 0 },
    }
  );

  const json = await res.json();

  if (!res.ok || json.errors) {
    console.error("Shopify Fehler:", json.errors || json);
    throw new Error("Shopify Anfrage fehlgeschlagen");
  }

  return json.data;
}

/** Produkte einer Kollektion nach Handle holen (z.B. "smartphones") */
export async function getCollectionProductsByHandle(handle: string) {
  const query = /* GraphQL */ `
    query CollectionByHandle($handle: String!) {
      collectionByHandle(handle: $handle) {
        id
        title
        description
        products(first: 24) {
          edges {
            node {
              id
              handle
              title
              description
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
            }
          }
        }
      }
    }
  `;

  const data = await shopifyFetch<{
    collectionByHandle: {
      id: string;
      title: string;
      description: string;
      products: {
        edges: {
          node: {
            id: string;
            handle: string;
            title: string;
            description: string;
            featuredImage: { url: string; altText: string | null } | null;
            priceRange: {
              minVariantPrice: { amount: string; currencyCode: string };
            };
          };
        }[];
      };
    } | null;
  }>(query, { handle });

  return data.collectionByHandle;
}

/** Einzelnes Produkt nach Handle holen (für /produkte/[handle]) */
export async function getProductByHandle(handle: string) {
  const query = /* GraphQL */ `
    query ProductByHandle($handle: String!) {
      product(handle: $handle) {
        id
        handle
        title
        description
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
      }
    }
  `;

  const data = await shopifyFetch<{
    product: {
      id: string;
      handle: string;
      title: string;
      description: string;
      featuredImage: { url: string; altText: string | null } | null;
      priceRange: {
        minVariantPrice: { amount: string; currencyCode: string };
      };
    } | null;
  }>(query, { handle });

  return data.product;
}

/**
 * Preise server-side validieren für Checkout:
 * - Aceita ids que sejam ProductVariant GIDs ou Product GIDs
 * - Para Product, pega o 1º variant como fallback (MVP)
 */
export async function getCheckoutItemsByIds(ids: string[]) {
  const query = /* GraphQL */ `
    query NodesForCheckout($ids: [ID!]!) {
      nodes(ids: $ids) {
        __typename
        ... on ProductVariant {
          id
          title
          product {
            title
          }
          price {
            amount
            currencyCode
          }
        }
        ... on Product {
          id
          title
          variants(first: 1) {
            edges {
              node {
                id
                title
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
  `;

  const data = await shopifyFetch<{
    nodes: Array<
      | {
          __typename: "ProductVariant";
          id: string;
          title: string;
          product: { title: string };
          price: { amount: string; currencyCode: string };
        }
      | {
          __typename: "Product";
          id: string;
          title: string;
          variants: {
            edges: Array<{
              node: {
                id: string;
                title: string;
                price: { amount: string; currencyCode: string };
              };
            }>;
          };
        }
      | null
    >;
  }>(query, { ids });

  // Normaliza para um formato único (sempre retorna variantId + title + amount)
  const result = new Map<
    string,
    { variantId: string; title: string; amount: number; currencyCode: string }
  >();

  for (const node of data.nodes) {
    if (!node) continue;

    if (node.__typename === "ProductVariant") {
      result.set(node.id, {
        variantId: node.id,
        title: `${node.product.title}${node.title ? ` - ${node.title}` : ""}`,
        amount: Number(node.price.amount),
        currencyCode: node.price.currencyCode,
      });
    }

    if (node.__typename === "Product") {
      const first = node.variants.edges?.[0]?.node;
      if (!first) continue;

      result.set(node.id, {
        variantId: first.id,
        title: node.title,
        amount: Number(first.price.amount),
        currencyCode: first.price.currencyCode,
      });
    }
  }

  return result;
}
