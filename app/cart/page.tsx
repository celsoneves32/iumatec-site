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

export default function CartPage() {
  const {
    items,
    loading,
    totalQuantity,
    subtotal,
    total,
    currencyCode,
    updateQuantity,
    removeItem,
    checkoutUrl,
  } = useCart();

  const mwstRate = 0.081;
  const mwstIncluded = total - total / (1 + mwstRate);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-950">
          Warenkorb
        </h1>
        <p className="mt-2 text-neutral-600">
          {totalQuantity} Artikel in deinem Warenkorb.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border bg-white p-8">
          <p className="text-neutral-600">Dein Warenkorb ist leer.</p>
          <Link
            href="/produkte"
            className="mt-4 inline-flex rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white"
          >
            Weiter einkaufen
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.lineId} className="rounded-3xl border bg-white p-4">
                <div className="flex gap-4">
                  <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-neutral-50">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.imageAlt ?? item.title}
                        fill
                        className="object-contain p-3"
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={item.productHandle ? `/produkte/${item.productHandle}` : "/produkte"}
                      className="line-clamp-2 text-lg font-semibold text-neutral-900 hover:text-brand"
                    >
                      {item.title}
                    </Link>

                    <div className="mt-1 text-sm text-neutral-500">
                      {item.variantTitle}
                    </div>

                    <div className="mt-3 text-lg font-bold text-neutral-950">
                      {formatMoney(Number(item.totalPrice), item.currencyCode)}
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
                        disabled={loading}
                        className="rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-50"
                      >
                        -
                      </button>

                      <span className="min-w-10 text-center text-sm font-semibold">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
                        disabled={loading}
                        className="rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-50"
                      >
                        +
                      </button>

                      <button
                        type="button"
                        onClick={() => removeItem(item.lineId)}
                        disabled={loading}
                        className="ml-auto text-sm font-medium text-red-600 hover:underline"
                      >
                        Entfernen
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="h-fit rounded-3xl border bg-white p-6 shadow-sm lg:sticky lg:top-28">
            <h2 className="text-xl font-bold text-neutral-900">Zusammenfassung</h2>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">Zwischensumme</span>
                <span className="font-semibold">
                  {formatMoney(subtotal, currencyCode)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-neutral-600">inkl. MWST (8.1%)</span>
                <span className="font-semibold">
                  {formatMoney(mwstIncluded, currencyCode)}
                </span>
              </div>

              <div className="border-t pt-3">
                <div className="flex items-center justify-between text-base">
                  <span className="font-semibold text-neutral-900">Total</span>
                  <span className="font-bold text-neutral-950">
                    {formatMoney(total, currencyCode)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 text-xs text-neutral-500">
              Preise inkl. gesetzlicher MWST.
            </div>

            {checkoutUrl ? (
              <a
                href={checkoutUrl}
                className="mt-6 block w-full rounded-2xl bg-brand px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-dark"
              >
                Zur Kasse
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="mt-6 w-full rounded-2xl bg-neutral-200 px-5 py-3 text-sm font-semibold text-neutral-500"
              >
                Checkout nicht verfügbar
              </button>
            )}

            <Link
              href="/produkte"
              className="mt-3 block w-full rounded-2xl border border-neutral-300 px-5 py-3 text-center text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
            >
              Weiter einkaufen
            </Link>
          </aside>
        </div>
      )}
    </main>
  );
}