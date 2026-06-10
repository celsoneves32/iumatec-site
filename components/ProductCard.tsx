"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useCompare } from "@/context/CompareContext";

type Props = {
  product: {
    sku?: string;
    slug: string;
    title: string;
    brand?: string;
    price: number;
    image?: string | null;
    category?: string;
    subcategory?: string;
    inStock?: boolean;
    stockQty?: number;
    merchandiseId?: string | null;
    productHandle: string;
    energyLabel?: any;
  };
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
  }).format(price || 0);
}

function isTopDeal(product: Props["product"]) {
  const price = Number(product.price || 0);
  const title = product.title.toLowerCase();

  return (
    price > 0 &&
    (price <= 300 ||
      title.includes("deal") ||
      title.includes("monitor") ||
      title.includes("ssd") ||
      title.includes("keyboard") ||
      title.includes("maus") ||
      title.includes("mouse"))
  );
}

export default function ProductCard({ product }: Props) {
  const { addItem, loading } = useCart();
  const { toggleCompare, isInCompare } = useCompare();
  const [imageFailed, setImageFailed] = useState(false);

  const compareSku = product.sku || product.slug;
  const compared = isInCompare(compareSku);

  const stockQty = product.stockQty ?? 0;
  const inStock = stockQty > 0 || Boolean(product.inStock);
  const canBuy = Boolean(inStock && product.merchandiseId);

  const lowStock = inStock && stockQty > 0 && stockQty <= 3;
  const topDeal = isTopDeal(product);

  const stockLabel = !inStock
    ? "Nicht verfügbar"
    : lowStock
      ? `Nur noch ${Math.max(stockQty, 1)} Stück`
      : "Sofort lieferbar";

  const stockColor = !inStock
    ? "text-neutral-400"
    : lowStock
      ? "text-orange-600"
      : "text-green-600";

  const imageSrc =
    product.image && product.image.trim() && !imageFailed
      ? product.image.trim()
      : null;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="absolute left-4 top-4 z-10 flex max-w-[calc(100%-2rem)] flex-wrap gap-2">
        {topDeal ? (
          <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white shadow-sm">
            Top Deal
          </span>
        ) : null}

        {inStock ? (
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700 ring-1 ring-green-100">
            CH Lager
          </span>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() =>
          toggleCompare({
            sku: compareSku,
            slug: product.slug,
            title: product.title,
            price: product.price,
            brand: product.brand,
            image: product.image ?? null,
            category: product.category,
            subcategory: product.subcategory,
            stockQty: product.stockQty,
            inStock: product.inStock,
          })
        }
        className={`absolute right-4 top-4 z-20 rounded-full px-3 py-1 text-xs font-black shadow-sm transition ${
          compared
            ? "bg-neutral-950 text-white"
            : "bg-white text-neutral-700 ring-1 ring-neutral-200 hover:bg-neutral-100"
        }`}
      >
        {compared ? "✓ Vergleich" : "+ Vergleich"}
      </button>

      <Link href={`/produkte/${product.slug}`} className="block">
        <div className="flex h-72 items-center justify-center overflow-hidden bg-neutral-50 px-7 pb-7 pt-14">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={product.title}
              onError={() => setImageFailed(true)}
              className="max-h-full max-w-full object-contain transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white text-center">
              <div>
                <div className="text-3xl">📦</div>
                <div className="mt-2 text-xs font-semibold text-neutral-400">
                  Bild folgt
                </div>
              </div>
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {product.brand || "IUMATEC"}
        </div>

        <Link href={`/produkte/${product.slug}`}>
          <h3 className="mt-1 line-clamp-2 min-h-[44px] text-base font-extrabold leading-snug text-neutral-950 transition hover:text-red-600">
            {product.title}
          </h3>
        </Link>

        <div className={`mt-3 text-sm font-extrabold ${stockColor}`}>
          {stockLabel}
        </div>

        <div className="mt-4 text-2xl font-black text-neutral-950">
          {formatPrice(product.price)}
        </div>

        <div className="text-xs text-neutral-500">
          inkl. MWST · Lieferung Schweiz
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-neutral-500">
          <span className="rounded-full bg-neutral-100 px-3 py-1">
            Sicherer Checkout
          </span>
          <span className="rounded-full bg-neutral-100 px-3 py-1">
            Versand CH
          </span>
        </div>

        <div className="mt-auto flex gap-3 pt-5">
          <Link
            href={`/produkte/${product.slug}`}
            className="flex-1 rounded-2xl border border-neutral-300 px-4 py-3 text-center text-sm font-bold transition hover:bg-neutral-50"
          >
            Details
          </Link>

          <button
            type="button"
            disabled={!canBuy || loading}
            onClick={() =>
              canBuy
                ? void addItem({
                    merchandiseId: product.merchandiseId,
                    productHandle: product.productHandle,
                    quantity: 1,
                    imageUrl: product.image ?? null,
                  })
                : undefined
            }
            className={`flex-1 rounded-2xl px-4 py-3 text-sm font-extrabold transition ${
              canBuy
                ? "bg-red-600 text-white hover:bg-red-700"
                : "cursor-not-allowed bg-neutral-200 text-neutral-500"
            }`}
          >
            {loading ? "..." : canBuy ? "In den Warenkorb" : "Nicht verfügbar"}
          </button>
        </div>
      </div>
    </article>
  );
}