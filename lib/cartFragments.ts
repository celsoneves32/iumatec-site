export const CART_FRAGMENT = `
  id
  checkoutUrl
  totalQuantity
  cost {
    subtotalAmount {
      amount
      currencyCode
    }
    totalAmount {
      amount
      currencyCode
    }
  }
  lines(first: 100) {
    edges {
      node {
        id
        quantity
        merchandise {
          ... on ProductVariant {
            id
            sku
            title
            image {
              url
              altText
            }
            product {
              title
              vendor
              handle
            }
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