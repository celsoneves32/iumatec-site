"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getOrCreateUserKey } from "@/lib/userKey";

type WishlistItem = {
  sku: string;
  slug?: string;
  title: string;
  price: number;
  brand?: string;
  image?: string | null;
};

type WishlistContextType = {
  items: WishlistItem[];
  loading: boolean;
  toggleWishlist: (item: WishlistItem) => Promise<void>;
  isInWishlist: (sku: string) => boolean;
  clearWishlist: () => Promise<void>;
  refreshWishlist: () => Promise<void>;
};

const WishlistContext = createContext<WishlistContextType | null>(null);

export function WishlistProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshWishlist = async () => {
    const userKey = getOrCreateUserKey();

    if (!userKey) {
      setLoading(false);
      return;
    }

    const res = await fetch(
      `/api/wishlist/get?userKey=${encodeURIComponent(userKey)}`,
      { method: "GET" }
    );

    if (!res.ok) {
      setLoading(false);
      return;
    }

    const data = (await res.json()) as WishlistItem[];
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    refreshWishlist().catch(() => setLoading(false));
  }, []);

  const isInWishlist = (sku: string) => {
    return items.some((i) => i.sku === sku);
  };

  const toggleWishlist = async (item: WishlistItem) => {
    const userKey = getOrCreateUserKey();
    const exists = items.some((i) => i.sku === item.sku);

    if (exists) {
      setItems((prev) => prev.filter((i) => i.sku !== item.sku));

      await fetch("/api/wishlist/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userKey,
          sku: item.sku,
        }),
      });

      return;
    }

    setItems((prev) => [...prev, item]);

    await fetch("/api/wishlist/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userKey,
        sku: item.sku,
        slug: item.slug,
        title: item.title,
        price: item.price,
        brand: item.brand,
        image: item.image,
      }),
    });
  };

  const clearWishlist = async () => {
    const userKey = getOrCreateUserKey();
    setItems([]);

    await fetch("/api/wishlist/clear", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userKey }),
    });
  };

  return (
    <WishlistContext.Provider
      value={{
        items,
        loading,
        toggleWishlist,
        isInWishlist,
        clearWishlist,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);

  if (!ctx) {
    throw new Error("useWishlist must be used inside WishlistProvider");
  }

  return ctx;
}