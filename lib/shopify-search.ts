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
    tags: ["search-products"],
  });

  return {
    products: data.products.edges.map((edge) => edge.node),
    pageInfo: data.products.pageInfo,
  };
}

export function filterProductsLocally(
  products: SearchProduct[],
  filters: {
    vendor?: string;
    productType?: string;
    minPrice?: number;
    maxPrice?: number;
  }
) {
  return products.filter((product) => {
    const price = Number(product.priceRange.minVariantPrice.amount);

    if (filters.vendor && product.vendor !== filters.vendor) {
      return false;
    }

    if (filters.productType && product.productType !== filters.productType) {
      return false;
    }

    if (typeof filters.minPrice === "number" && price < filters.minPrice) {
      return false;
    }

    if (typeof filters.maxPrice === "number" && price > filters.maxPrice) {
      return false;
    }

    return true;
  });
}

export function extractFilterOptions(products: SearchProduct[]) {
  const vendors = Array.from(
    new Set(products.map((p) => p.vendor).filter(Boolean))
  ).sort() as string[];

  const productTypes = Array.from(
    new Set(products.map((p) => p.productType).filter(Boolean))
  ).sort() as string[];

  return {
    vendors,
    productTypes,
  };
}
