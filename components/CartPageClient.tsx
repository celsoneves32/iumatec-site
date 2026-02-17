// components/CartPageClient.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency,
  }).format(amount);
}

export default function CartPageClient() {
  const { cart, loading, error, totalQuantity, updateLine, removeLine, goToCheckout } =
    useCart();

  const lines: any[] = (cart as any)?.lines ?? [];
  const currency: string = (cart as any)?.cost?.totalAmount?.currencyCode ?? "CHF";
  const totalAmountRaw = (cart as any)?.cost?.totalAmount?.amount;
  const totalAmount = totalAmountRaw ? Number(totalAmountRaw) : 0;

  const hasItems = lines.length > 0;

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-2xl border p-6">Lade Warenkorb...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-2xl border p-6 text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-semibold">Warenkorb</h1>
        <div className="text-sm text-neutral-600">
          {totalQuantity ?? 0} Artikel
        </div>
      </div>

      {!hasItems ? (
        <div className="rounded-2xl border p-8 text-center space-y-3">
          <div className="text-lg font-medium">Dein Warenkorb ist leer.</div>
          <Link href="/products" className="inline-flex underline">
            Produkte ansehen
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* LINES */}
          <div className="space-y-4">
            {lines.map((line) => {
              const id = line?.id as string;

              const qty = Number(line?.quantity ?? 1);

              const merchandise = line?.merchandise;
              const productTitle =
                merchandise?.product?.title ?? merchandise?.title ?? "Produkt";
              const handle = merchandise?.product?.handle ?? "";
              const imageUrl = merchandise?.image?.url ?? null;
              const imageAlt = merchandise?.image?.altText ?? productTitle;

              const lineAmountRaw = line?.cost?.totalAmount?.amount;
              const lineAmount = lineAmountRaw ? Number(lineAmountRaw) : 0;

              return (
                <div
                  key={id}
                  className="rounded-2xl border p-4 flex gap-4 items-center"
                >
                  <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-neutral-100 shrink-0">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={imageAlt}
                        fill
                        className="object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    {handle ? (
                      <Link
                        href={`/products/${handle}`}
                        className="font-medium hover:underline line-clamp-2"
                      >
                        {productTitle}
                      </Link>
                    ) : (
                      <div className="font-medium line-clamp-2">{productTitle}</div>
                    )}

                    <div className="text-sm text-neutral-600 mt-1">
                      {formatMoney(lineAmount, currency)}
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        className="h-9 w-9 rounded-lg border hover:bg-neutral-50"
                        onClick={() => updateLine(id, Math.max(1, qty - 1))}
                        aria-label="Minus"
                      >
                        −
                      </button>

                      <div className="min-w-10 text-center text-sm">{qty}</div>

                      <button
                        type="button"
                        className="h-9 w-9 rounded-lg border hover:bg-neutral-50"
                        onClick={() => updateLine(id, qty + 1)}
                        aria-label="Plus"
                      >
                        +
                      </button>

                      <button
                        type="button"
                        className="ml-3 text-sm underline text-neutral-700 hover:text-black"
                        onClick={() => removeLine(id)}
                      >
                        Entfernen
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SUMMARY */}
          <div className="rounded-2xl border p-5 h-fit space-y-4">
            <div className="text-lg font-semibold">Zusammenfassung</div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-600">Total</span>
              <span className="font-medium">
                {formatMoney(totalAmount, currency)}
              </span>
            </div>

            <button
              type="button"
              className="w-full rounded-xl bg-black px-4 py-3 text-white hover:opacity-90"
              onClick={goToCheckout}
            >
              Zur Kasse
            </button>

            <Link
              href="/products"
              className="block text-center text-sm underline text-neutral-700 hover:text-black"
            >
              Weiter einkaufen
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
