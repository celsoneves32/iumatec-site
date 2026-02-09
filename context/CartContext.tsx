// context/CartContext.tsx
"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Cart } from "@/lib/cart";
import { cartCreate, cartGet, cartLinesAdd, cartLinesRemove, cartLinesUpdate } from "@/lib/cart";

type CartState = {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  totalQuantity: number;
  ensureCart: () => Promise<Cart>;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  updateLine: (lineId: string, quantity: number) => Promise<void>;
  removeLine: (lineId: string) => Promise<void>;
  goToCheckout: () => void;
};

const CartContext = createContext<CartState | null>(null);

const CART_ID_KEY = "iumatec_cart_id";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ensureCart(): Promise<Cart> {
    setError(null);
    setLoading(true);

    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem(CART_ID_KEY) : null;

      if (saved) {
        const existing = await cartGet(saved);
        if (existing) {
          setCart(existing);
          return existing;
        }
        localStorage.removeItem(CART_ID_KEY);
      }

      const created = await cartCreate();
      localStorage.setItem(CART_ID_KEY, created.id);
      setCart(created);
      return created;
    } catch (e: any) {
      setError(e?.message || "Cart error");
      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function addItem(variantId: string, quantity = 1) {
    setError(null);
    setLoading(true);
    try {
      const c = cart ?? (await ensureCart());
      const updated = await cartLinesAdd(c.id, variantId, quantity);
      setCart(updated);
    } catch (e: any) {
      setError(e?.message || "Add to cart failed");
    } finally {
      setLoading(false);
    }
  }

  async function updateLine(lineId: string, quantity: number) {
    if (!cart) return;
    setError(null);
    setLoading(true);
    try {
      const updated = await cartLinesUpdate(cart.id, lineId, quantity);
      setCart(updated);
    } catch (e: any) {
      setError(e?.message || "Update cart failed");
    } finally {
      setLoading(false);
    }
  }

  async function removeLine(lineId: string) {
    if (!cart) return;
    setError(null);
    setLoading(true);
    try {
      const updated = await cartLinesRemove(cart.id, lineId);
      setCart(updated);
    } catch (e: any) {
      setError(e?.message || "Remove item failed");
    } finally {
      setLoading(false);
    }
  }

  function goToCheckout() {
    if (!cart?.checkoutUrl) return;
    window.location.href = cart.checkoutUrl;
  }

  // load cart once (best-effort)
  useEffect(() => {
    (async () => {
      const saved = localStorage.getItem(CART_ID_KEY);
      if (!saved) return;
      try {
        const existing = await cartGet(saved);
        if (existing) setCart(existing);
      } catch {
        localStorage.removeItem(CART_ID_KEY);
      }
    })();
  }, []);

  const totalQuantity = cart?.totalQuantity ?? 0;

  const value = useMemo<CartState>(
    () => ({
      cart,
      loading,
      error,
      totalQuantity,
      ensureCart,
      addItem,
      updateLine,
      removeLine,
      goToCheckout,
    }),
    [cart, loading, error, totalQuantity]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
