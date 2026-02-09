// lib/cart.ts
import { shopifyFetch } from "@/lib/shopify";

export type Money = { amount: string; currencyCode: string };

export type CartLine = {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    product: { title: string; handle: string };
    image?: { url: string; altText?: string | null } | null;
    price: Money;
  };
  cost: {
    totalAmount: Money;
  };
};

export type Cart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  lines: { edges: Array<{ node: CartLine }> };
  cost: {
    subtotalAmount: Money;
    totalAmount: Money;
  };
};

const CART_FRAGMENT = `
fragment CartFragment on Cart {
  id
  checkoutUrl
  totalQuantity
  lines(first: 50) {
    edges {
      node {
        id
        quantity
        cost {
          totalAmount { amount currencyCode }
        }
        merchandise ... on ProductVariant {
          id
          title
          price { amount currencyCode }
          image { url altText }
          product { title handle }
        }
      }
    }
  }
  cost {
    subtotalAmount { amount currencyCode }
    totalAmount { amount currencyCode }
  }
}
`;

export async function cartCreate() {
  const query = `
    ${CART_FRAGMENT}
    mutation CartCreate {
      cartCreate {
        cart { ...CartFragment }
        userErrors { field message }
      }
    }
  `;

  const data = await shopifyFetch<{
    cartCreate: { cart: Cart | null; userErrors: Array<{ message: string }> };
  }>({ query, cache: "no-store" });

  const errors = data.cartCreate.userErrors;
  if (errors?.length) throw new Error(errors[0].message);

  if (!data.cartCreate.cart) throw new Error("cartCreate: no cart returned");
  return data.cartCreate.cart;
}

export async function cartGet(cartId: string) {
  const query = `
    ${CART_FRAGMENT}
    query Cart($id: ID!) {
      cart(id: $id) { ...CartFragment }
    }
  `;

  const data = await shopifyFetch<{ cart: Cart | null }>({
    query,
    variables: { id: cartId },
    cache: "no-store",
  });

  return data.cart;
}

export async function cartLinesAdd(cartId: string, variantId: string, quantity = 1) {
  const query = `
    ${CART_FRAGMENT}
    mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart { ...CartFragment }
        userErrors { field message }
      }
    }
  `;

  const data = await shopifyFetch<{
    cartLinesAdd: { cart: Cart | null; userErrors: Array<{ message: string }> };
  }>({
    query,
    variables: {
      cartId,
      lines: [{ merchandiseId: variantId, quantity }],
    },
    cache: "no-store",
  });

  const errors = data.cartLinesAdd.userErrors;
  if (errors?.length) throw new Error(errors[0].message);

  if (!data.cartLinesAdd.cart) throw new Error("cartLinesAdd: no cart returned");
  return data.cartLinesAdd.cart;
}

export async function cartLinesUpdate(cartId: string, lineId: string, quantity: number) {
  const query = `
    ${CART_FRAGMENT}
    mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart { ...CartFragment }
        userErrors { field message }
      }
    }
  `;

  const data = await shopifyFetch<{
    cartLinesUpdate: { cart: Cart | null; userErrors: Array<{ message: string }> };
  }>({
    query,
    variables: {
      cartId,
      lines: [{ id: lineId, quantity }],
    },
    cache: "no-store",
  });

  const errors = data.cartLinesUpdate.userErrors;
  if (errors?.length) throw new Error(errors[0].message);

  if (!data.cartLinesUpdate.cart) throw new Error("cartLinesUpdate: no cart returned");
  return data.cartLinesUpdate.cart;
}

export async function cartLinesRemove(cartId: string, lineId: string) {
  const query = `
    ${CART_FRAGMENT}
    mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart { ...CartFragment }
        userErrors { field message }
      }
    }
  `;

  const data = await shopifyFetch<{
    cartLinesRemove: { cart: Cart | null; userErrors: Array<{ message: string }> };
  }>({
    query,
    variables: { cartId, lineIds: [lineId] },
    cache: "no-store",
  });

  const errors = data.cartLinesRemove.userErrors;
  if (errors?.length) throw new Error(errors[0].message);

  if (!data.cartLinesRemove.cart) throw new Error("cartLinesRemove: no cart returned");
  return data.cartLinesRemove.cart;
}
