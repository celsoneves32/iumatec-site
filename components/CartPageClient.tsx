"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { useCart } from "@/context/CartContext";

type AnyLine = any;

function normalizeLines(cart: any): AnyLine[] {
  const raw = cart?.lines;

  // Case A: Storefront API shape: { edges: [{ node: ... }] }
  if (raw?.edges && Array.isArray(raw.edges)) {
    return raw.edges.map((e: any) => e?.node).filter(Boolean);
  }

  // Case B: App shape: lines already an array
  if (Array.isArray(raw)) {
    return raw;
  }

  return [];
}

export default function CartPageClient() {
  // ✅ o teu CartContextValue (pelo que já vimos) expõe isto:
  const { cart, loading, error, totalQuantity, updateLine, removeLine, goToCheckout } =
    useCart() as any;

  const lines = useMemo(() => normalizeLines(cart), [cart]);
  const currency = cart?.cost?.totalAmount?.currencyCode ?? "CHF";
  const totalAmount = cart?.cost?.totalAmount?.amount ?? null;

  const hasItems = lines.length > 0;

  function formatMoney(amount: string | number | null, curr: string) {
    if (amount == null) return "";
    const value = typeof amount === "string" ? Number(amount) : amount;
    if (Number.isNaN(value)) return "";
    return new Intl.NumberFormat("de-CH", { style: "currency", currency: curr }).format(value);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold">Warenkorb</h1>
        <Link href="/products" className="text-sm underline">
          Weiter shoppen
        </Link>
      </div>

      {loading ? (
        <div className="rounded-xl border p-6">Lade Warenkorb…</div>
      ) : error ? (
        <div className="rounded-xl border p-6 text-red-600">{String(error)}</div>
      ) : !hasItems ? (
        <div className="rounded-xl border p-6">
          <div className="font-medium">Dein Warenkorb ist leer.</div>
          <div className="text-sm text-neutral-600 mt-1">
            Füge Produkte hinzu und komm dann zurück.
          </div>
          <div className="mt-4">
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2 text-white"
            >
              Produkte ansehen
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border overflow-hidden">
            <div className="divide-y">
              {lines.map((line: AnyLine) => {
                const lineId = line?.id;
                const qty = Number(line?.quantity ?? 1);

                const merchandise = line?.merchandise;
                const productTitle =
                  merchandise?.product?.title ?? merchandise?.title ?? "Produkt";
                const productHandle = merchandise?.product?.handle ?? null;

                const img =
                  merchandise?.image ??
                  merchandise?.product?.featuredImage ??
                  merchandise?.featuredImage ??
                  null;

                const priceAmount =
                  line?.cost?.totalAmount?.amount ??
                  line?.cost?.amountPerQuantity?.amount ??
                  line?.merchandise?.price?.amount ??
                  null;

                const href = productHandle ? `/products/${productHandle}` : "/products";

                return (
                  <div key={lineId ?? productTitle} className="p-4 flex gap-4">
                    <Link href={href} className="relative h-20 w-20 shrink-0 rounded-xl bg-neutral-100 overflow-hidden">
                      {img?.url ? (
                        <Image src={img.url} alt={img?.altText ?? productTitle} fill className="object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs text-neutral-500">
                          No image
                        </div>
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <Link href={href} className="min-w-0">
                          <div className="font-medium line-clamp-2">{productTitle}</div>
                        </Link>
                        <div className="text-sm text-neutral-700">
                          {formatMoney(priceAmount, currency)}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="inline-flex items-center rounded-lg border overflow-hidden">
                          <button
                            className="px-3 py-1.5 text-sm hover:bg-neutral-50"
                            onClick={() => updateLine?.(lineId, Math.max(1, qty - 1))}
                            disabled={!lineId || !updateLine}
                            aria-label="Menge reduzieren"
                          >
                            −
                          </button>
                          <div className="px-3 py-1.5 text-sm border-x bg-white">{qty}</div>
                          <button
                            className="px-3 py-1.5 text-sm hover:bg-neutral-50"
                            onClick={() => updateLine?.(lineId, qty + 1)}
                            disabled={!lineId || !updateLine}
                            aria-label="Menge erhöhen"
                          >
                            +
                          </button>
                        </div>

                        <button
                          className="text-sm underline text-neutral-700 hover:text-black"
                          onClick={() => removeLine?.(lineId)}
                          disabled={!lineId || !removeLine}
                        >
                          Entfernen
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border p-5 flex items-center justify-between gap-4">
            <div className="text-sm text-neutral-600">
              <div>{totalQuantity ?? 0} Artikel</div>
              {totalAmount != null && (
                <div className="text-base font-semibold text-black">
                  Total: {formatMoney(totalAmount, currency)}
                </div>
              )}
            </div>

            <button
              onClick={() => goToCheckout?.()}
              className="inline-flex items-center justify-center rounded-lg bg-black px-5 py-2.5 text-white"
              disabled={!goToCheckout}
            >
              Zur Kasse
            </button>
          </div>
        </>
      )}
    </div>
  );
}
