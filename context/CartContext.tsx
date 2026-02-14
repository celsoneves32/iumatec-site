"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Money = { amount: string; currencyCode: string };

type CartLine = {
  id: string;
  quantity: number;
  cost?: { totalAmount?: Money };
  merchandise?: {
    id: string; // variant id
    title?: string;
    productTitle?: string;
  };
};

type ShopifyCart = {
  id: string;
  checkoutUrl?: string;
  cost?: { totalAmount?: Money };
  lines?: CartLine[];
};

type CartContextValue = {
  cart: ShopifyCart | null;
  loading: boolean;
  error: string | null;
  totalQuantity: number;

  addItem: (variantId: string, quantity?: number) => Promise<void>;
  updateLine: (lineId: string, quantity: number) => Promise<void>;
  removeLine: (lineId: string) => Promise<void>;
  goToCheckout: () => void;

  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "iumatec_cart_id_v1";

function getStorefrontEndpoint() {
  const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
  if (!domain) throw new Error("Missing NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN");
  return `https://${domain}/api/2024-04/graphql.json`;
}

function getStorefrontToken() {
  const token = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  if (!token) throw new Error("Missing NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN");
  return token;
}

async function storefrontFetch<T>(query: string, variables?: Record<string, any>): Promise<T> {
  const res = await fetch(getStorefrontEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": getStorefrontToken(),
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (!res.ok || json.errors) {
    const msg =
      json?.errors?.[0]?.message ||
      (typeof json === "string" ? json : "Storefront request failed");
    throw new Error(msg);
  }
  return json.data as T;
}

function mapCart(cart: any): ShopifyCart {
  return {
    id: cart.id,
    checkoutUrl: cart.checkoutUrl,
    cost: cart.cost?.totalAmount ? { totalAmount: cart.cost.totalAmount } : cart.cost,
    lines: (cart.lines?.edges ?? []).map((e: any) => {
      const line = e.node;
      return {
        id: line.id,
        quantity: line.quantity,
        cost: line.cost,
        merchandise: {
          id: line.merchandise?.id,
          title: line.merchandise?.title,
          productTitle: line.merchandise?.product?.title,
        },
      } as CartLine;
    }),
  };
}

const CART_FRAGMENT = `
  fragment CartFragment on Cart {
    id
    checkoutUrl
    cost {
      totalAmount { amount currencyCode }
    }
    lines(first: 100) {
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
            product { title }
          }
        }
      }
    }
  }
`;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<ShopifyCart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalQuantity = useMemo(() => {
    const lines = cart?.lines ?? [];
    return lines.reduce((acc, l) => acc + (l.quantity || 0), 0);
  }, [cart]);

  function saveCartId(id: string) {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {}
  }

  function loadCartId(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function clearCart() {
    setCart(null);
    setError(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  async function fetchCart(cartId: string) {
    const QUERY = `
      ${CART_FRAGMENT}
      query GetCart($id: ID!) {
        cart(id: $id) { ...CartFragment }
      }
    `;

    const data = await storefrontFetch<{ cart: any }>(QUERY, { id: cartId });
    if (!data.cart) {
      clearCart();
      return;
    }
    setCart(mapCart(data.cart));
  }

  // init: load cartId and fetch cart
  useEffect(() => {
    const id = loadCartId();
    if (!id) return;
    setLoading(true);
    fetchCart(id)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ensureCart(): Promise<string> {
    const existingId = loadCartId();
    if (existingId) return existingId;

    const MUTATION = `
      ${CART_FRAGMENT}
      mutation CreateCart {
        cartCreate {
          cart { ...CartFragment }
          userErrors { message }
        }
      }
    `;

    const data = await storefrontFetch<any>(MUTATION);
    const err = data?.cartCreate?.userErrors?.[0]?.message;
    if (err) throw new Error(err);

    const newCart = data.cartCreate.cart;
    const mapped = mapCart(newCart);
    setCart(mapped);
    saveCartId(mapped.id);
    return mapped.id;
  }

  async function addItem(variantId: string, quantity = 1) {
    if (!variantId) return;
    setError(null);
    setLoading(true);

    try {
      const cartId = await ensureCart();

      const MUTATION = `
        ${CART_FRAGMENT}
        mutation AddLines($cartId: ID!, $lines: [CartLineInput!]!) {
          cartLinesAdd(cartId: $cartId, lines: $lines) {
            cart { ...CartFragment }
            userErrors { message }
          }
        }
      `;

      const data = await storefrontFetch<any>(MUTATION, {
        cartId,
        lines: [{ merchandiseId: variantId, quantity }],
      });

      const err = data?.cartLinesAdd?.userErrors?.[0]?.message;
      if (err) throw new Error(err);

      setCart(mapCart(data.cartLinesAdd.cart));
    } catch (e: any) {
      setError(e.message || "Fehler beim Hinzufügen.");
    } finally {
      setLoading(false);
    }
  }

  async function updateLine(lineId: string, quantity: number) {
    if (!lineId || quantity < 1) return;
    setError(null);
    setLoading(true);

    try {
      const cartId = loadCartId();
      if (!cartId) throw new Error("Kein Warenkorb gefunden.");

      const MUTATION = `
        ${CART_FRAGMENT}
        mutation UpdateLines($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
          cartLinesUpdate(cartId: $cartId, lines: $lines) {
            cart { ...CartFragment }
            userErrors { message }
          }
        }
      `;

      const data = await storefrontFetch<any>(MUTATION, {
        cartId,
        lines: [{ id: lineId, quantity }],
      });

      const err = data?.cartLinesUpdate?.userErrors?.[0]?.message;
      if (err) throw new Error(err);

      setCart(mapCart(data.cartLinesUpdate.cart));
    } catch (e: any) {
      setError(e.message || "Fehler beim Aktualisieren.");
    } finally {
      setLoading(false);
    }
  }

  async function removeLine(lineId: string) {
    if (!lineId) return;
    setError(null);
    setLoading(true);

    try {
      const cartId = loadCartId();
      if (!cartId) throw new Error("Kein Warenkorb gefunden.");

      const MUTATION = `
        ${CART_FRAGMENT}
        mutation RemoveLines($cartId: ID!, $lineIds: [ID!]!) {
          cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
            cart { ...CartFragment }
            userErrors { message }
          }
        }
      `;

      const data = await storefrontFetch<any>(MUTATION, {
        cartId,
        lineIds: [lineId],
      });

      const err = data?.cartLinesRemove?.userErrors?.[0]?.message;
      if (err) throw new Error(err);

      setCart(mapCart(data.cartLinesRemove.cart));
    } catch (e: any) {
      setError(e.message || "Fehler beim Entfernen.");
    } finally {
      setLoading(false);
    }
  }

  function goToCheckout() {
    if (cart?.checkoutUrl) {
      window.location.href = cart.checkoutUrl;
      return;
    }
    setError("Checkout-Link ist nicht verfügbar.");
  }

  const value: CartContextValue = {
    cart,
    loading,
    error,
    totalQuantity,
    addItem,
    updateLine,
    removeLine,
    goToCheckout,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
