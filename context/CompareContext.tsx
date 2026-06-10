"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type CompareItem = {
  sku: string;
  slug: string;
  title: string;
  price: number;
  brand?: string;
  image?: string | null;
  category?: string;
  subcategory?: string;
  stockQty?: number;
  inStock?: boolean;
};

type CompareContextType = {
  items: CompareItem[];
  toggleCompare: (item: CompareItem) => void;
  removeCompare: (sku: string) => void;
  isInCompare: (sku: string) => boolean;
  clearCompare: () => void;
};

const CompareContext = createContext<CompareContextType | null>(null);
const STORAGE_KEY = "iumatec_compare";

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  function isInCompare(sku: string) {
    return items.some((item) => item.sku === sku);
  }

  function toggleCompare(item: CompareItem) {
    setItems((prev) => {
      const exists = prev.some((i) => i.sku === item.sku);

      if (exists) return prev.filter((i) => i.sku !== item.sku);
      if (prev.length >= 4) return [...prev.slice(1), item];

      return [...prev, item];
    });
  }

  function removeCompare(sku: string) {
    setItems((prev) => prev.filter((item) => item.sku !== sku));
  }

  function clearCompare() {
    setItems([]);
  }

  return (
    <CompareContext.Provider
      value={{ items, toggleCompare, removeCompare, isInCompare, clearCompare }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used inside CompareProvider");
  return ctx;
}