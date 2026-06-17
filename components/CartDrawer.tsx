"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/context/CartContext";

function formatMoney(value: string | number, currencyCode = "CHF") {
  const numberValue = Number(value || 0);

  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: currencyCode || "CHF",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numberValue) ? numberValue : 0);
}

export default function CartDrawer() {
  const {
    items,
    loading,
    totalQuantity,
    subtotal,
    total,
    currencyCode,
    checkoutUrl,
    isDrawerOpen,
    toast,
    closeDrawer,
    clearToast,
    updateQuantity,
    removeItem,
    resetCart,
  } = useCart();

  useEffect(() => {
    if (!isDrawerOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrawer();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isDrawerOpen, closeDrawer]);

  const freeShipping = total >= 0;
  const mwstAmount = total > 0 ? total - total / 1.081 : 0;

  return (
    <>
      <div
        className={`fixed inset-0 z-[90] bg-black/50 backdrop-blur-[2px] transition duration-300 ${
          isDrawerOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      <aside
        className={`fixed right-0 top-0 z-[95] flex h-full w-full max-w-lg flex-col border-l border-neutral-200 bg-white shadow-2xl transition-transform duration-300 ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Warenkorb"
        aria-hidden={!isDrawerOpen}
      >
        <div className="border-b border-neutral-200 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-neutral-950">
                Warenkorb
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                {totalQuantity} Artikel · Sicherer Checkout
              </p>
            </div>

            <button
              type="button"
              onClick={closeDrawer}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 transition hover:bg-neutral-50"
              aria-label="Warenkorb schließen"
            >
              ✕
            </button>
          </div>

          {items.length > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-semibold text-neutral-700">
              <div className="rounded-2xl bg-green-50 px-3 py-2 text-green-700">
                🇨🇭 CH-Versand
              </div>
              <div className="rounded-2xl bg-neutral-50 px-3 py-2">
                🔒 Sicher zahlen
              </div>
              <div className="rounded-2xl bg-neutral-50 px-3 py-2">
                ↩️ Rückgabe
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-10 text-center">
              <p className="text-lg font-extrabold text-neutral-950">
                Dein Warenkorb ist leer
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                Füge Produkte hinzu und gehe direkt zur sicheren Kasse.
              </p>

              <Link
                href="/produkte"
                onClick={closeDrawer}
                className="mt-6 inline-flex rounded-2xl bg-red-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700"
              >
                Produkte ansehen
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.lineId}
                  className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex gap-4">
                    <Link
                      href={
                        item.productHandle ? `/produkte/${item.productHandle}` : "#"
                      }
                      onClick={closeDrawer}
                      className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-neutral-100 bg-neutral-50"
                    >
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.imageAlt || item.title}
                          fill
                          className="object-contain p-2"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                          Kein Bild
                        </div>
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-bold text-neutral-950">
                        {item.title}
                      </p>

                      {item.variantTitle &&
                      item.variantTitle !== "Default Title" ? (
                        <p className="mt-1 text-xs text-neutral-500">
                          {item.variantTitle}
                        </p>
                      ) : null}

                      <div className="mt-2 inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                        Auf Lager · lieferbar
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="flex items-center rounded-2xl border border-neutral-300 bg-white">
                          <button
                            type="button"
                            onClick={() =>
                              void updateQuantity(item.lineId, item.quantity - 1)
                            }
                            className="px-3 py-2 text-sm font-bold text-neutral-700 hover:text-red-600"
                            aria-label="Menge verringern"
                          >
                            −
                          </button>

                          <span className="min-w-[36px] text-center text-sm font-bold text-neutral-900">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              void updateQuantity(item.lineId, item.quantity + 1)
                            }
                            className="px-3 py-2 text-sm font-bold text-neutral-700 hover:text-red-600"
                            aria-label="Menge erhöhen"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="text-base font-extrabold text-neutral-950">
                            {formatMoney(item.totalPrice, currencyCode)}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {formatMoney(item.unitPrice, currencyCode)} / Stück
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => void removeItem(item.lineId)}
                        className="mt-3 text-xs font-semibold text-neutral-500 transition hover:text-red-600"
                      >
                        Entfernen
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={resetCart}
                className="w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                Warenkorb zurücksetzen
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-neutral-200 bg-white px-5 py-4 shadow-[0_-10px_30px_rgba(0,0,0,0.04)]">
          <div className="mb-3 rounded-3xl border border-green-100 bg-green-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-extrabold text-green-800">
                {freeShipping ? "Gratis Versand aktiviert" : "Fast geschafft"}
              </p>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-green-700">
                Schweiz
              </span>
            </div>
            <p className="mt-1 text-xs font-medium text-green-700">
              Sichere Zahlung · schnelle Lieferung · transparente MWST
            </p>
          </div>

          <div className="space-y-2 rounded-3xl bg-neutral-50 p-4">
            <div className="flex items-center justify-between text-sm text-neutral-600">
              <span>Zwischensumme</span>
              <span>{formatMoney(subtotal, currencyCode)}</span>
            </div>

            <div className="flex items-center justify-between text-sm text-neutral-600">
              <span>Lieferung</span>
              <span className="font-semibold text-green-700">GRATIS</span>
            </div>

            <div className="flex items-center justify-between text-sm text-neutral-600">
              <span>MWST 8.1%</span>
              <span>inkl. {formatMoney(mwstAmount, currencyCode)}</span>
            </div>

            <div className="flex items-center justify-between border-t border-neutral-200 pt-3 text-lg font-extrabold text-neutral-950">
              <span>Total</span>
              <span>{formatMoney(total, currencyCode)}</span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {checkoutUrl ? (
              <a
                href={checkoutUrl}
                className="block w-full rounded-2xl bg-red-600 px-5 py-4 text-center text-base font-extrabold text-white shadow-sm transition hover:bg-red-700"
              >
                Sicher zur Kasse
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="block w-full rounded-2xl bg-neutral-200 px-5 py-4 text-center text-base font-bold text-neutral-500"
              >
                Zur Kasse
              </button>
            )}

            <Link
              href="/produkte"
              onClick={closeDrawer}
              className="block w-full rounded-2xl border border-neutral-300 px-5 py-3 text-center text-sm font-bold text-neutral-900 transition hover:bg-neutral-50"
            >
              Weiter einkaufen
            </Link>

            {loading ? (
              <p className="text-center text-xs text-neutral-500">
                Warenkorb wird aktualisiert...
              </p>
            ) : null}
          </div>
        </div>
      </aside>

      <div
        className={`fixed bottom-5 left-5 z-[110] transition duration-300 ${
          toast
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        {toast ? (
          <div
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 shadow-xl ${
              toast.type === "success"
                ? "bg-neutral-950 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            <span className="text-sm font-semibold">{toast.message}</span>
            <button
              type="button"
              onClick={clearToast}
              className="text-sm opacity-80 transition hover:opacity-100"
              aria-label="Meldung schließen"
            >
              ✕
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}