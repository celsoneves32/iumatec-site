"use client";

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  ReactNode,
} from "react";

export type CartItem = {
  id: string;
  title: string;
  price: number;
  quantity: number;
};

export type CartContextValue = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  updateQuantity: (id: string, quantity: number) => void;
  totalItems: number;
  totalPrice: number;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

// 🔑 chave usada no localStorage
const STORAGE_KEY = "iumatec_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // 1️⃣ Ler carrinho do localStorage na primeira montagem
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as CartItem[];

      // filtra dados estranhos
      if (Array.isArray(parsed)) {
        setItems(
          parsed
            .filter(
              (i) =>
                i &&
                typeof i.id === "string" &&
                typeof i.title === "string" &&
                typeof i.price === "number" &&
                typeof i.quantity === "number"
            )
            .map((i) => ({
              ...i,
              quantity: Math.max(1, i.quantity),
            }))
        );
      }
    } catch (err) {
      console.error("Fehler beim Laden des Warenkorbs aus localStorage:", err);
    }
  }, []);

  // 2️⃣ Sempre que o carrinho mudar, guardar no localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.error("Fehler beim Speichern des Warenkorbs in localStorage:", err);
    }
  }, [items]);

  // ➕ adicionar item
  const addItem = (item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) {
        return prev.map((p) =>
          p.id === item.id
            ? { ...p, quantity: p.quantity + item.quantity }
            : p
        );
      }
      return [...prev, item];
    });
  };

  // ❌ remover item
  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // 🧹 limpar carrinho
  const clearCart = () => setItems([]);

  // 🔄 atualizar quantidade
  const updateQuantity = (id: string, quantity: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, quantity) }
          : item
      )
    );
  };

  // 📊 totais
  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const value: CartContextValue = {
    items,
    addItem,
    removeItem,
    clearCart,
    updateQuantity,
    totalItems,
    totalPrice,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
