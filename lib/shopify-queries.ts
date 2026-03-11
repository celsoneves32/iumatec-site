// lib/shopify-queries.ts

export const PRODUCTS_QUERY = `
query Products($first: Int!) {
  products(first: $first) {
    edges {
      node {
        id
        title
        handle
        vendor
        featuredImage {
          url
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
`;

export const COLLECTIONS_QUERY = `
query Collections {
  collections(first: 20) {
    edges {
      node {
        id
        title
        handle
        image {
          url
        }
      }
    }
  }
}
`;

export const COLLECTION_PRODUCTS_QUERY = `
query CollectionProducts($handle: String!) {
  collectionByHandle(handle: $handle) {
    title
    products(first: 24) {
      edges {
        node {
          id
          title
          handle
          featuredImage {
            url
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
