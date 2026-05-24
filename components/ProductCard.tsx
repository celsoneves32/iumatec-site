"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/context/CartContext";

type Props = {
  product: {
    slug: string;
    title: string;
    brand?: string;
    price: number;
    image?: string | null;
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

export default function ProductCard({ product }: Props) {
  const { addItem, loading } = useCart();
  const [imageFailed, setImageFailed] = useState(false);

  const stockQty = product.stockQty ?? 0;
  const inStock = stockQty > 0 || Boolean(product.inStock);
  const canBuy = Boolean(inStock && product.merchandiseId);

  const stockLabel =
    !inStock
      ? "Nicht verfügbar"
      : stockQty <= 3
        ? `Nur noch ${Math.max(stockQty, 1)} Stück`
        : "Sofort lieferbar";

  const stockColor =
    !inStock
      ? "text-neutral-400"
      : stockQty <= 3
        ? "text-orange-600"
        : "text-green-600";

  const imageSrc =
    product.image && product.image.trim() && !imageFailed
      ? product.image.trim()
      : null;

  return (
    <article className="group overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <Link href={`/produkte/${product.slug}`} className="block">
        <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-neutral-50 p-6">
          {imageSrc ? (
            // img é intencional aqui para evitar bloqueios de domínio do Next/Image
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

      <div className="p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {product.brand || "IUMATEC"}
        </div>

        <Link href={`/produkte/${product.slug}`}>
          <h3 className="mt-1 line-clamp-2 min-h-[42px] text-base font-extrabold leading-snug text-neutral-950 transition hover:text-red-600">
            {product.title}
          </h3>
        </Link>

        <div className={`mt-3 text-sm font-extrabold ${stockColor}`}>
          {stockLabel}
        </div>

        <div className="mt-4 text-2xl font-extrabold text-neutral-950">
          {formatPrice(product.price)}
        </div>

        <div className="text-xs text-neutral-500">
          inkl. MWST · Lieferung Schweiz
        </div>

        <div className="mt-5 flex gap-3">
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