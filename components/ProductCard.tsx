"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Check,
  GitCompare,
  Heart,
  Package,
  ShoppingCart,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCompare } from "@/context/CompareContext";
import { useWishlist } from "@/context/WishlistContext";

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
    energyLabel?: {
      class?: string | null;
      labelUrl?: string | null;
      productDataSheetUrl?: string | null;
    } | null;
  };
};

function formatPrice(price: number) {
  const safe = Number.isFinite(Number(price)) ? Number(price) : 0;
  const rounded = safe.toFixed(2);
  const [francs, cents] = rounded.split(".");
  return `CHF ${francs.replace(/\B(?=(\d{3})+(?!\d))/g, "'")}.${cents}`;
}


function energyClassColor(value?: string | null) {
  const energyClass = String(value || "").trim().toUpperCase();

  const colors: Record<string, string> = {
    A: "bg-emerald-600",
    B: "bg-lime-600",
    C: "bg-lime-500",
    D: "bg-yellow-400 text-neutral-950",
    E: "bg-amber-500",
    F: "bg-orange-500",
    G: "bg-red-600",
  };

  return colors[energyClass] || "bg-neutral-700";
}

function EnergyLabelBadge({
  energyLabel,
}: {
  energyLabel?: {
    class?: string | null;
    labelUrl?: string | null;
    productDataSheetUrl?: string | null;
  } | null;
}) {
  if (!energyLabel) return null;

  const labelUrl = String(energyLabel.labelUrl || "").trim();
  const energyClass = String(energyLabel.class || "").trim().toUpperCase();

  if (!labelUrl && !energyClass) return null;

  return (
    <div
      className="absolute bottom-3 left-3 z-20"
      title={
        energyClass
          ? `Energieeffizienzklasse ${energyClass}`
          : "Energieetikette"
      }
    >
      {labelUrl ? (
        <div className="flex h-[66px] w-[46px] items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-white p-0.5 shadow-[0_6px_18px_rgba(15,23,42,.12)]">
          <img
            src={labelUrl}
            alt={
              energyClass
                ? `Energieeffizienzklasse ${energyClass}`
                : "Energieetikette"
            }
            loading="lazy"
            decoding="async"
            className="max-h-full max-w-full object-contain"
          />
        </div>
      ) : (
        <div
          className={`inline-flex min-w-[44px] items-center justify-center rounded-md px-2 py-1.5 text-xs font-black text-white shadow-sm ${energyClassColor(
            energyClass,
          )}`}
        >
          {energyClass}
        </div>
      )}
    </div>
  );
}

export default function ProductCard({ product }: Props) {
  const { addItem, loading } = useCart();
  const { toggleCompare, isInCompare } = useCompare();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [imageFailed, setImageFailed] = useState(false);

  const sku = product.sku || product.slug;
  const compared = isInCompare(sku);
  const wished = isInWishlist(sku);
  const stockQty = Number(product.stockQty || 0);
  const inStock = stockQty > 0 || Boolean(product.inStock);
  const canBuy = Boolean(inStock && product.merchandiseId);
  const lowStock = inStock && stockQty > 0 && stockQty <= 3;
  const imageSrc =
    product.image && product.image.trim() && !imageFailed
      ? product.image.trim()
      : null;

  const hasEnergyLabel = Boolean(
    product.energyLabel?.labelUrl || product.energyLabel?.class,
  );
  const energyClass = String(product.energyLabel?.class || "")
    .trim()
    .toUpperCase();

  return (
    <article className="group relative flex h-full min-h-[455px] flex-col overflow-hidden rounded-[20px] border border-neutral-200 bg-white transition duration-300 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-[0_18px_45px_rgba(15,23,42,0.09)]">
      <div className="absolute left-3 top-3 z-20">
        {inStock ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-100">
            <Check size={11} strokeWidth={2.6} />
            CH Lager
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-black text-neutral-500">
            Nicht verfügbar
          </span>
        )}
      </div>

      <div className="absolute right-3 top-3 z-20 flex flex-col gap-2 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
        <button
          type="button"
          onClick={() =>
            void toggleWishlist({
              sku,
              slug: product.slug,
              title: product.title,
              price: product.price,
              brand: product.brand,
              image: product.image ?? null,
            })
          }
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white shadow-sm transition hover:border-red-200 hover:text-red-600 ${
            wished
              ? "border-red-200 text-red-600"
              : "border-neutral-200 text-neutral-700"
          }`}
          aria-label={wished ? "Aus Merkliste entfernen" : "Zur Merkliste"}
          title="Merkliste"
        >
          <Heart size={16} fill={wished ? "currentColor" : "none"} />
        </button>

        <button
          type="button"
          onClick={() =>
            toggleCompare({
              sku,
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
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition ${
            compared
              ? "border-neutral-950 bg-neutral-950 text-white"
              : "border-neutral-200 bg-white text-neutral-700 hover:border-red-200 hover:text-red-600"
          }`}
          aria-label={compared ? "Aus Vergleich entfernen" : "Vergleichen"}
          title="Vergleichen"
        >
          <GitCompare size={16} />
        </button>
      </div>

      <Link href={`/produkte/${product.slug}`} className="block">
        <div className="relative flex h-[235px] items-center justify-center overflow-hidden bg-white px-6 pb-4 pt-11 sm:h-[250px]">
          <div className="absolute inset-x-5 bottom-0 h-px bg-neutral-100" />

          <EnergyLabelBadge energyLabel={product.energyLabel} />

          {imageSrc ? (
            <img
              src={imageSrc}
              alt={product.title}
              loading="lazy"
              decoding="async"
              width={320}
              height={260}
              onError={() => setImageFailed(true)}
              className="max-h-full max-w-full object-contain transition duration-500 group-hover:scale-[1.045]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-xl bg-neutral-50 text-neutral-300">
              <Package size={42} strokeWidth={1.4} />
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="truncate text-[10px] font-black uppercase tracking-[0.09em] text-neutral-400">
            {product.brand || "IUMATEC"}
          </div>
          {product.subcategory ? (
            <div className="max-w-[48%] truncate text-[10px] font-semibold text-neutral-400">
              {product.subcategory}
            </div>
          ) : null}
        </div>

        <Link href={`/produkte/${product.slug}`}>
          <h3 className="mt-2 line-clamp-2 min-h-[43px] text-[15px] font-bold leading-[1.42] text-neutral-900 transition group-hover:text-red-600">
            {product.title}
          </h3>
        </Link>

        <div className="mt-3 text-[11px] font-bold">
          <span
            className={
              !inStock
                ? "text-neutral-400"
                : lowStock
                  ? "text-orange-600"
                  : "text-emerald-600"
            }
          >
            {!inStock
              ? "Nicht verfügbar"
              : lowStock
                ? `Nur noch ${Math.max(stockQty, 1)} Stück`
                : "Sofort lieferbar"}
          </span>
        </div>

        {hasEnergyLabel ? (
          <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-neutral-500">
            <span>Energieeffizienz</span>
            {energyClass ? (
              <span
                className={`inline-flex min-w-6 items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-black text-white ${energyClassColor(
                  energyClass,
                )}`}
              >
                {energyClass}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <div className="text-[21px] font-black tracking-[-0.025em] text-neutral-950">
              {formatPrice(product.price)}
            </div>
            <div className="mt-0.5 text-[10px] text-neutral-400">
              inkl. MWST · Lieferung Schweiz
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4">
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
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-black transition ${
              canBuy
                ? "bg-red-600 text-white hover:bg-neutral-950"
                : "cursor-not-allowed bg-neutral-100 text-neutral-400"
            }`}
          >
            <ShoppingCart size={16} />
            {loading
              ? "Wird hinzugefügt …"
              : canBuy
                ? "In den Warenkorb"
                : "Nicht verfügbar"}
          </button>
        </div>
      </div>
    </article>
  );
}
