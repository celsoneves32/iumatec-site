// lib/shopifyCart.ts
import { shopifyFetch } from "@/lib/shopify";

export type CartLine = {
  id: string;
  quantity: number;
  merchandise: {
    id: string; // variantId
    title: string;
    product: { title: string; handle: string };
  };
  cost: {
    totalAmount: { amount: string; currencyCode: string };
  };
};

export type Cart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  lines: { edges: { node: CartLine }[] };
  cost: {
    subtotalAmount: { amount: string; currencyCode: string };
    totalAmount: { amount: string; currencyCode: string };
  };
};

const CART_FRAGMENT = `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      subtotalAmount { amount currencyCode }
      totalAmount { amount currencyCode }
    }
    lines(first: 50) {
      edges {
        node {
          id
          quantity
          merchandise {
            ... on ProductVariant {
              id
              title
              product { title handle }
            }
          }
          cost { totalAmount { amount currencyCode } }
        }
      }
    }
  }
`;

export async function cartCreate(): Promise<Cart> {
  const query = `
    ${CART_FRAGMENT}
    mutation CartCreate {
      cartCreate {
        cart { ...CartFields }
        userErrors { field message }
      }
    }
  `;

  const data = await shopifyFetch<{
    cartCreate: { cart: Cart; userErrors: { message: string }[] };
  }>({ query });

  const errs = data.cartCreate.userErrors;
  if (errs?.length) throw new Error(errs.map((e) => e.message).join(", "));
  return data.cartCreate.cart;
}

export async function cartGet(cartId: string): Promise<Cart> {
  const query = `
    ${CART_FRAGMENT}
    query CartGet($id: ID!) {
      cart(id: $id) { ...CartFields }
    }
  `;

  const data = await shopifyFetch<{ cart: Cart }>({
    query,
    variables: { id: cartId },
  });

  if (!data.cart) throw new Error("Cart not found");
  return data.cart;
}

export async function cartLinesAdd(params: {
  cartId: string;
  variantId: string;
  quantity: number;
}): Promise<Cart> {
  const query = `
    ${CART_FRAGMENT}
    mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart { ...CartFields }
        userErrors { field message }
      }
    }
  `;

  const data = await shopifyFetch<{
    cartLinesAdd: { cart: Cart; userErrors: { message: string }[] };
  }>({
    query,
    variables: {
      cartId: params.cartId,
      lines: [{ merchandiseId: params.variantId, quantity: params.quantity }],
    },
  });

  const errs = data.cartLinesAdd.userErrors;
  if (errs?.length) throw new Error(errs.map((e) => e.message).join(", "));
  return data.cartLinesAdd.cart;
}

export async function cartLinesUpdate(params: {
  cartId: string;
  lineId: string;
  quantity: number;
}): Promise<Cart> {
  const query = `
    ${CART_FRAGMENT}
    mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart { ...CartFields }
        userErrors { field message }
      }
    }
  `;

  const data = await shopifyFetch<{
    cartLinesUpdate: { cart: Cart; userErrors: { message: string }[] };
  }>({
    query,
    variables: {
      cartId: params.cartId,
      lines: [{ id: params.lineId, quantity: params.quantity }],
    },
  });

  const errs = data.cartLinesUpdate.userErrors;
  if (errs?.length) throw new Error(errs.map((e) => e.message).join(", "));
  return data.cartLinesUpdate.cart;
}

export async function cartLinesRemove(params: {
  cartId: string;
  lineId: string;
}): Promise<Cart> {
  const query = `
    ${CART_FRAGMENT}
    mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart { ...CartFields }
        userErrors { field message }
      }
    }
  `;

  const data = await shopifyFetch<{
    cartLinesRemove: { cart: Cart; userErrors: { message: string }[] };
  }>({
    query,
    variables: { cartId: params.cartId, lineIds: [params.lineId] },
  });

  const errs = data.cartLinesRemove.userErrors;
  if (errs?.length) throw new Error(errs.map((e) => e.message).join(", "));
  return data.cartLinesRemove.cart;
}
