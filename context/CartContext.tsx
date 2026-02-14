"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type CartItem = {
  variantId: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  loading: boolean;
  addItem: (variantId: string, quantity?: number) => void;
  removeItem: (variantId: string) => void;
  setQty: (variantId: string, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "iumatec_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  // carregar do localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CartItem[];
      if (Array.isArray(parsed)) setItems(parsed);
    } catch {
      // ignore
    }
  }, []);

  // guardar no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  const totalItems = useMemo(
    () => items.reduce((acc, it) => acc + (it.quantity || 0), 0),
    [items]
  );

  function addItem(variantId: string, quantity = 1) {
    if (!variantId) return;
    setLoading(true);
    setItems((prev) => {
      const idx = prev.findIndex((p) => p.variantId === variantId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + quantity };
        return copy;
      }
      return [...prev, { variantId, quantity }];
    });
    setTimeout(() => setLoading(false), 150);
  }

  function removeItem(variantId: string) {
    setItems((prev) => prev.filter((p) => p.variantId !== variantId));
  }

  function setQty(variantId: string, quantity: number) {
    if (quantity <= 0) return removeItem(variantId);
    setItems((prev) =>
      prev.map((p) => (p.variantId === variantId ? { ...p, quantity } : p))
    );
  }

  function clear() {
    setItems([]);
  }

  const value: CartContextValue = {
    items,
    totalItems,
    loading,
    addItem,
    removeItem,
    setQty,
    clear,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
