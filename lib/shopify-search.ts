// lib/shopify-search.ts
import { shopifyFetch } from "@/lib/shopify";

export type SearchProduct = {
  id: string;
  title: string;
  handle: string;
  vendor?: string;
  productType?: string;
  tags?: string[];
  featuredImage?: {
    url: string;
    altText?: string | null;
  } | null;
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
};

type SearchProductsResponse = {
  products: {
    edges: Array<{
      node: SearchProduct;
    }>;
    filters?: Array<{
      id: string;
      label: string;
      type: string;
      values?: Array<{
        id: string;
        label: string;
        count: number;
        input?: string;
      }>;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
};

const SEARCH_PRODUCTS_QUERY = `
  query SearchProducts($first: Int!, $query: String) {
    products(first: $first, query: $query, sortKey: RELEVANCE) {
      edges {
        node {
          id
          title
          handle
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
        }
      }
      filters {
        id
        label
        type
        values {
          id
          label
          count
          input
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

export async function searchProducts({
  q,
  first = 24,
}: {
  q?: string;
  first?: number;
}) {
  const data = await shopifyFetch<SearchProductsResponse>({
    query: SEARCH_PRODUCTS_QUERY,
    variables: {
      first,
      query: q || null,
    },
  });

  return {
    products: data.products.edges.map((edge) => edge.node),
    filters: data.products.filters || [],
    pageInfo: data.products.pageInfo,
  };
}
