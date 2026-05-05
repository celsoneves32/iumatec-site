"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import CheckoutButton from "@/components/CheckoutButton";

export default function CartPage() {
  const {
    items,
    loading,
    subtotal,
    totalQuantity,
    updateQuantity,
    removeItem,
  } = useCart();

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-950">
          Warenkorb
        </h1>
        <p className="mt-2 text-neutral-600">
          Prüfe deine Produkte und gehe danach sicher zur Kasse.
        </p>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 text-center text-neutral-600">
          Laden...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 text-center">
          <h2 className="text-xl font-bold text-neutral-900">
            Dein Warenkorb ist leer
          </h2>
          <p className="mt-2 text-neutral-600">
            Entdecke unsere Produkte und füge Artikel zum Warenkorb hinzu.
          </p>

          <Link
            href="/produkte"
            className="mt-5 inline-flex rounded-2xl bg-black px-6 py-4 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Produkte entdecken
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-4">
            {items.map((item) => {
              const qty = item.quantity ?? 1;
              const linePrice = (item.price || 0) * qty;

              return (
                <div
                  key={item.lineId}
                  className="rounded-3xl border border-neutral-200 bg-white p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-neutral-100">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          className="object-cover"
                        />
                      ) : null}
                    </div>

                    <div className="flex-1">
                      {item.brand ? (
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                          {item.brand}
                        </p>
                      ) : null}

                      <h2 className="mt-1 text-lg font-bold text-neutral-900">
                        {item.title}
                      </h2>

                      {item.slug ? (
                        <Link
                          href={`/produkte/${item.slug}`}
                          className="mt-2 inline-block text-sm font-medium text-neutral-600 underline"
                        >
                          Produkt ansehen
                        </Link>
                      ) : null}

                      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.lineId, Math.max(1, qty - 1))
                            }
                            className="h-10 w-10 rounded-xl border border-neutral-300 text-lg font-semibold text-neutral-900 transition hover:bg-neutral-50"
                            aria-label="Menge reduzieren"
                          >
                            −
                          </button>

                          <div className="min-w-10 text-center text-sm font-semibold text-neutral-900">
                            {qty}
                          </div>

                          <button
                            type="button"
                            onClick={() => updateQuantity(item.lineId, qty + 1)}
                            className="h-10 w-10 rounded-xl border border-neutral-300 text-lg font-semibold text-neutral-900 transition hover:bg-neutral-50"
                            aria-label="Menge erhöhen"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-extrabold text-neutral-950">
                            {new Intl.NumberFormat("de-CH", {
                              style: "currency",
                              currency: "CHF",
                            }).format(linePrice)}
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(item.lineId)}
                            className="mt-2 text-sm font-medium text-neutral-600 underline"
                          >
                            Entfernen
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          <aside>
            <div className="sticky top-24 rounded-3xl border border-neutral-200 bg-white p-6">
              <h2 className="text-xl font-bold text-neutral-900">
                Bestellübersicht
              </h2>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between text-sm text-neutral-600">
                  <span>Artikel</span>
                  <span>{totalQuantity}</span>
                </div>

                <div className="flex items-center justify-between text-sm text-neutral-600">
                  <span>Versand</span>
                  <span>Wird im Checkout berechnet</span>
                </div>

                <div className="border-t border-neutral-200 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-neutral-900">
                      Zwischensumme
                    </span>
                    <span className="text-xl font-extrabold text-neutral-950">
                      {new Intl.NumberFormat("de-CH", {
                        style: "currency",
                        currency: "CHF",
                      }).format(subtotal || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <CheckoutButton />
              </div>

              <Link
                href="/produkte"
                className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-neutral-300 bg-white px-6 py-4 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
              >
                Weiter einkaufen
              </Link>

              <p className="mt-4 text-xs leading-6 text-neutral-500">
                Sicherer Checkout über Shopify. Versand, Zahlungsarten und finale
                Steuern werden im Checkout angezeigt.
              </p>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}