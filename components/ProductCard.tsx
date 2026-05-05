"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { useCart } from "@/context/CartContext";

type ProductCardProps = {
  product: {
    slug?: string | null;
    title: string;
    brand?: string | null;
    price?: number | null;
    image?: string | null;
    inStock?: boolean | null;
    stockQty?: number | null;
    merchandiseId?: string | null;
    productHandle?: string | null;
    rating?: number | null;
    reviewsCount?: number | null;
  };
};

function formatPrice(price?: number | null) {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
  }).format(typeof price === "number" ? price : 0);
}

function getBadge(product: ProductCardProps["product"]) {
  const stockQty = product.stockQty ?? 0;
  const price = product.price ?? 0;

  if (!product.inStock || stockQty <= 0) {
    return {
      label: "Nicht verfügbar",
      className: "bg-neutral-200 text-neutral-600",
    };
  }

  if (stockQty <= 5) {
    return {
      label: "Nur wenige",
      className: "bg-amber-500 text-white",
    };
  }

  if (price > 0 && price < 200) {
    return {
      label: "Top Preis",
      className: "bg-red-600 text-white",
    };
  }

  return {
    label: "Auf Lager",
    className: "bg-green-50 text-green-700",
  };
}

function getStockText(product: ProductCardProps["product"]) {
  const stockQty = product.stockQty ?? 0;

  if (!product.inStock || stockQty <= 0) {
    return {
      label: "Aktuell nicht verfügbar",
      detail: "Derzeit nicht bestellbar",
      className: "text-neutral-400",
      dot: "bg-neutral-300",
    };
  }

  if (stockQty <= 5) {
    return {
      label: `Nur noch ${stockQty} Stück verfügbar`,
      detail: "Lieferung in 3–5 Werktagen",
      className: "text-amber-700",
      dot: "bg-amber-500",
    };
  }

  return {
    label: "Sofort lieferbar",
    detail: "Lieferung morgen / 1–2 Werktage",
    className: "text-green-700",
    dot: "bg-green-500",
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem, loading } = useCart();

  const href = useMemo(() => {
    if (product.slug && product.slug.trim()) return `/produkte/${product.slug}`;
    return "/produkte";
  }, [product.slug]);

  const canBuy = Boolean(
    product.inStock &&
      (product.stockQty ?? 0) > 0 &&
      product.merchandiseId?.trim()
  );

  const badge = getBadge(product);
  const stock = getStockText(product);

  const hasRating =
    typeof product.rating === "number" &&
    product.rating > 0 &&
    typeof product.reviewsCount === "number" &&
    product.reviewsCount > 0;

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="absolute left-4 top-4 z-10">
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      <Link href={href} className="block">
        <div className="relative flex h-64 items-center justify-center overflow-hidden bg-neutral-50 p-6">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.title}
              fill
              className="object-contain p-6 transition duration-300 group-hover:scale-110"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
              Kein Bild verfügbar
            </div>
          )}
        </div>
      </Link>

      <div className="p-5">
        {product.brand ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {product.brand}
          </p>
        ) : null}

        <Link href={href}>
          <h3 className="mt-1 line-clamp-2 text-base font-bold text-neutral-950 transition group-hover:text-red-600">
            {product.title}
          </h3>
        </Link>

        {hasRating ? (
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="text-amber-500">
              {"★".repeat(Math.round(product.rating || 0))}
            </span>
            <span className="font-bold text-neutral-900">
              {product.rating?.toFixed(1)}
            </span>
            <span className="text-neutral-500">({product.reviewsCount})</span>
          </div>
        ) : (
          <div className="mt-2 text-xs text-neutral-400">
            Noch keine Bewertungen
          </div>
        )}

        <div className="mt-3 rounded-2xl bg-neutral-50 p-3">
          <div
            className={`flex items-center gap-2 text-sm font-bold ${stock.className}`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${stock.dot}`} />
            {stock.label}
          </div>
          <div className="mt-1 text-xs text-neutral-500">{stock.detail}</div>
        </div>

        <div className="mt-4 text-2xl font-extrabold text-neutral-950">
          {formatPrice(product.price)}
        </div>

        <div className="text-xs text-neutral-500">
          inkl. MWST · Lieferung Schweiz
        </div>

        <div className="mt-5 flex gap-3">
          <Link
            href={href}
            className="flex-1 rounded-2xl border border-neutral-300 px-4 py-3 text-center text-sm font-semibold transition hover:bg-neutral-50"
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
                  })
                : undefined
            }
            className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold transition ${
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