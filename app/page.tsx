import { shopifyFetch } from "@/lib/shopify";

async function getLatestProducts(limit = 8): Promise<HomeProduct[]> {
  const query = `
    query Products($first: Int!) {
      products(first: $first, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            handle
            title
            featuredImage {
              url
              altText
            }
            variants(first: 1) {
              edges {
                node {
                  id
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

  const data = await shopifyFetch<any>({
    query,
    variables: { first: limit },
    cache: "no-store",
  });

  return data.products.edges.map((e: any) => {
    const p = e.node;
    const variant = p.variants.edges[0]?.node;

    return {
      id: p.id,
      handle: p.handle,
      title: p.title,
      price: Number(variant?.price?.amount ?? 0),
      currencyCode: variant?.price?.currencyCode ?? "CHF",
      imageUrl: p.featuredImage?.url ?? null,
      imageAlt: p.featuredImage?.altText ?? p.title,
      variantId: variant?.id,
    };
  });
}
