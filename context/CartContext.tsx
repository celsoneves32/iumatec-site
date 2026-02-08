// context/CartContext.tsx
"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type CartLineUI = {
  id: string; // lineId
  quantity: number;
  variantId: string;
  title: string;
  productTitle: string;
  amount: number;
  currency: string;
};

type CartUI = {
  cartId: string | null;
  checkoutUrl: string | null;
  totalQuantity: number;
  currency: string;
  subtotal: number;
  total: number;
  lines: CartLineUI[];
};

type CartCtx = CartUI & {
  ready: boolean;
  add: (variantId: string, quantity?: number) => Promise<void>;
  update: (lineId: string, quantity: number) => Promise<void>;
  remove: (lineId: string) => Promise<void>;
  checkout: () => void;
};

const Ctx = createContext<CartCtx | null>(null);

function moneyToNumber(v?: string) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

function mapCart(apiCart: any, cartId: string | null): CartUI {
  const edges = apiCart?.lines?.edges || [];
  const lines: CartLineUI[] = edges.map((e: any) => {
    const n = e.node;
    const amt = moneyToNumber(n?.cost?.totalAmount?.amount);
    const cur = n?.cost?.totalAmount?.currencyCode || "CHF";
    return {
      id: n.id,
      quantity: n.quantity,
      variantId: n?.merchandise?.id,
      title: n?.merchandise?.title || "",
      productTitle: n?.merchandise?.product?.title || "",
      amount: amt,
      currency: cur,
    };
  });

  const currency =
    apiCart?.cost?.totalAmount?.currencyCode ||
    apiCart?.cost?.subtotalAmount?.currencyCode ||
    lines?.[0]?.currency ||
    "CHF";

  return {
    cartId,
    checkoutUrl: apiCart?.checkoutUrl || null,
    totalQuantity: apiCart?.totalQuantity || 0,
    currency,
    subtotal: moneyToNumber(apiCart?.cost?.subtotalAmount?.amount),
    total: moneyToNumber(apiCart?.cost?.totalAmount?.amount),
    lines,
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [cartId, setCartId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartUI>({
    cartId: null,
    checkoutUrl: null,
    totalQuantity: 0,
    currency: "CHF",
    subtotal: 0,
    total: 0,
    lines: [],
  });

  // carrega cartId do localStorage
  useEffect(() => {
    const existing = window.localStorage.getItem("iumatec_cart_id");
    if (existing) setCartId(existing);
    setReady(true);
  }, []);

  // se tiver cartId, tenta buscar o carrinho
  useEffect(() => {
    (async () => {
      if (!ready) return;
      if (!cartId) return;

      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get", cartId }),
        });

        if (!res.ok) throw new Error("Failed to load cart");
        const apiCart = await res.json();
        setCart(mapCart(apiCart, cartId));
      } catch {
        // se falhar, limpa e recomeça
        window.localStorage.removeItem("iumatec_cart_id");
        setCartId(null);
        setCart({
          cartId: null,
          checkoutUrl: null,
          totalQuantity: 0,
          currency: "CHF",
          subtotal: 0,
          total: 0,
          lines: [],
        });
      }
    })();
  }, [ready, cartId]);

  async function ensureCartId(): Promise<string> {
    if (cartId) return cartId;

    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create" }),
    });
    if (!res.ok) throw new Error("Failed to create cart");
    const apiCart = await res.json();

    const newId = apiCart.id as string;
    window.localStorage.setItem("iumatec_cart_id", newId);
    setCartId(newId);
    setCart(mapCart(apiCart, newId));
    return newId;
  }

  async function add(variantId: string, quantity = 1) {
    const id = await ensureCartId();
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", cartId: id, variantId, quantity }),
    });
    if (!res.ok) throw new Error("Failed to add to cart");
    const apiCart = await res.json();
    setCart(mapCart(apiCart, id));
  }

  async function update(lineId: string, quantity: number) {
    if (!cartId) return;
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", cartId, lineId, quantity }),
    });
    if (!res.ok) throw new Error("Failed to update cart");
    const apiCart = await res.json();
    setCart(mapCart(apiCart, cartId));
  }

  async function remove(lineId: string) {
    if (!cartId) return;
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", cartId, lineId }),
    });
    if (!res.ok) throw new Error("Failed to remove from cart");
    const apiCart = await res.json();
    setCart(mapCart(apiCart, cartId));
  }

  function checkout() {
    if (cart.checkoutUrl) window.location.href = cart.checkoutUrl;
  }

  const value: CartCtx = useMemo(
    () => ({
      ready,
      ...cart,
      add,
      update,
      remove,
      checkout,
    }),
    [ready, cart]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
