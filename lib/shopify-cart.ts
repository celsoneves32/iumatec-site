type ShopifyCartMoney = {
  amount: string;
  currencyCode: string;
};

type ShopifyCartImage = {
  url: string;
  altText?: string | null;
};

type ShopifyCartNode = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: {
    subtotalAmount: ShopifyCartMoney;
    totalAmount: ShopifyCartMoney;
  };
  lines: {
    edges: Array<{
      node: {
        id: string;
        quantity: number;
        cost: {
          totalAmount: ShopifyCartMoney;
        };
        merchandise: {
          id: string;
          title: string;
          product: {
            title: string;
            handle: string;
            featuredImage?: ShopifyCartImage | null;
          };
          image?: ShopifyCartImage | null;
          price?: ShopifyCartMoney | null;
        };
      };
    }>;
  };
};

export type NormalizedCartItem = {
  lineId: string;
  merchandiseId: string;
  productSlug: string;
  title: string;
  variantTitle: string;
  imageUrl: string | null;
  imageAlt: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  currencyCode: string;
};

export type NormalizedCart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  subtotal: string;
  total: string;
  currencyCode: string;
  items: NormalizedCartItem[];
};

export function normalizeShopifyCart(cart: ShopifyCartNode): NormalizedCart {
  const currencyCode = cart.cost.subtotalAmount.currencyCode;

  return {
    id: cart.id,
    checkoutUrl: cart.checkoutUrl,
    totalQuantity: cart.totalQuantity,
    subtotal: cart.cost.subtotalAmount.amount,
    total: cart.cost.totalAmount.amount,
    currencyCode,
    items: cart.lines.edges.map(({ node }) => {
      const merchandise = node.merchandise;
      const product = merchandise.product;
      const image = merchandise.image ?? product.featuredImage ?? null;
      const unitPrice = merchandise.price?.amount ?? "0";

      return {
        lineId: node.id,
        merchandiseId: merchandise.id,
        productSlug: product.handle,
        title: product.title,
        variantTitle: merchandise.title,
        imageUrl: image?.url ?? null,
        imageAlt: image?.altText ?? product.title,
        quantity: node.quantity,
        unitPrice,
        totalPrice: node.cost.totalAmount.amount,
        currencyCode,
      };
    }),
  };
}

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
        cost {
          totalAmount {
            amount
            currencyCode
          }
        }
        merchandise {
          ... on ProductVariant {
            id
            title
            image {
              url
              altText
            }
            price {
              amount
              currencyCode
            }
            product {
              title
              handle
              featuredImage {
                url
                altText
              }
            }
          }
        }
      }
    }
  }
`;