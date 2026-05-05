"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useCompare } from "@/context/CompareContext";

type ProductActionsProps = {
  product: {
    merchandiseId?: string | null;
    productHandle?: string | null;
    sku: string;
    slug: string;
    title: string;
    price: number;
    image?: string | null;
    brand?: string;
    inStock?: boolean;
    stockQty?: number;
  };
};

function isValidMerchandiseId(value?: string | null) {
  return typeof value === "string" && value.trim().startsWith("gid://shopify/ProductVariant/");
}

export default function ProductActions({ product }: ProductActionsProps) {
  const { addItem, loading } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { toggleCompare, isInCompare } = useCompare();
  const [adding, setAdding] = useState(false);

  const canTryCart = Boolean(
    isValidMerchandiseId(product.merchandiseId) || product.productHandle?.trim()
  );

  const hasStock = (product.stockQty ?? 0) > 0 || Boolean(product.inStock);

  const wishlistActive = isInWishlist(product.sku);
  const compareActive = isInCompare(product.sku);

  async function handleAddToCart() {
    if (!canTryCart || !hasStock) return;

    try {
      setAdding(true);
      await addItem({
        merchandiseId: product.merchandiseId?.trim() || null,
        productHandle: product.productHandle?.trim() || product.slug,
        quantity: 1,
      });
    } catch (error) {
      console.error("ProductActions addItem error:", error);
    } finally {
      setAdding(false);
    }
  }

  async function handleWishlist() {
    try {
      await toggleWishlist({
        sku: product.sku,
        slug: product.slug,
        title: product.title,
        price: product.price || 0,
        brand: product.brand,
        image: product.image,
      });
    } catch (error) {
      console.error("ProductActions wishlist error:", error);
    }
  }

  async function handleCompare() {
    try {
      await toggleCompare({
        sku: product.sku,
        slug: product.slug,
        title: product.title,
        price: product.price || 0,
        brand: product.brand,
        image: product.image,
      });
    } catch (error) {
      console.error("ProductActions compare error:", error);
    }
  }

  return (
    <div className="space-y-4">
      {canTryCart && hasStock ? (
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={loading || adding}
          className="w-full rounded-2xl bg-brand px-6 py-4 text-base font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {adding ? "Wird hinzugefügt..." : "In den Warenkorb"}
        </button>
      ) : (
        <button
          type="button"
          disabled
          className="w-full rounded-2xl bg-neutral-200 px-6 py-4 text-base font-semibold text-neutral-500"
        >
          {!hasStock ? "Momentan nicht verfügbar" : "Aktuell nicht direkt bestellbar"}
        </button>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleWishlist}
          className={`rounded-2xl border px-5 py-3 text-sm font-semibold transition ${
            wishlistActive
              ? "border-red-500 bg-red-500 text-white"
              : "border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50"
          }`}
        >
          {wishlistActive ? "Gespeichert" : "Merken"}
        </button>

        <button
          type="button"
          onClick={handleCompare}
          className={`rounded-2xl border px-5 py-3 text-sm font-semibold transition ${
            compareActive
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50"
          }`}
        >
          {compareActive ? "Verglichen" : "Vergleichen"}
        </button>
      </div>

      {!canTryCart ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-800">
          Dieses Produkt ist sichtbar, aber noch nicht mit einer kaufbaren Shopify-Variante verbunden.
        </div>
      ) : null}

      <Link
        href={`/produkte/${product.slug}`}
        className="block w-full rounded-2xl border border-neutral-300 px-5 py-3 text-center text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
      >
        Details ansehen
      </Link>
    </div>
  );
}