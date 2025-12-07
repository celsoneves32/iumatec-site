// components/CartPageClient.tsx
"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function CartPageClient() {
  const { items, totalItems, totalPrice, removeItem, updateQuantity } =
    useCart();

  const hasItems = items.length > 0;

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-1">
            Warenkorb
          </h1>
          <p className="text-sm text-neutral-600">
            {hasItems
              ? `Du hast ${totalItems} Artikel im Warenkorb.`
              : "Dein Warenkorb ist noch leer."}
          </p>
        </div>
        {hasItems && (
          <Link
            href="/produkte"
            className="text-xs font-semibold text-red-600 hover:text-red-700"
          >
            Weiter einkaufen
          </Link>
        )}
      </header>

      {!hasItems ? (
        <div className="border border-dashed border-neutral-300 rounded-2xl p-8 text-center text-sm text-neutral-600 bg-neutral-50">
          In deinem Warenkorb befinden sich noch keine Produkte.
          <br />
          <span className="text-xs text-neutral-500">
            Füge Produkte über die Produktseite hinzu.
          </span>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)] items-start">
          {/* Lista de itens */}
          <section className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 border border-neutral-200 rounded-2xl px-4 py-3 bg-white"
              >
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/produkte/${item.id}`}
                    className="text-sm font-medium text-neutral-900 hover:text-red-600 line-clamp-2"
                  >
                    {item.title}
                  </Link>
                  <div className="mt-1 text-xs text-neutral-500">
                    Einzelpreis: {item.price.toFixed(2)} CHF
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    Zwischensumme:{" "}
                    <span className="font-semibold text-neutral-900">
                      {(item.price * item.quantity).toFixed(2)} CHF
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.id, item.quantity - 1)
                      }
                      className="h-7 w-7 rounded-full border border-neutral-300 text-xs flex items-center justify-center hover:border-red-500 hover:text-red-600"
                    >
                      -
                    </button>
                    <span className="min-w-[2rem] text-center text-sm">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.id, item.quantity + 1)
                      }
                      className="h-7 w-7 rounded-full border border-neutral-300 text-xs flex items-center justify-center hover:border-red-500 hover:text-red-600"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-[11px] text-neutral-500 hover:text-red-600"
                  >
                    Entfernen
                  </button>
                </div>
              </div>
            ))}
          </section>

          {/* Resumo / Totais */}
          <aside className="bg-white border border-neutral-200 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-neutral-900 mb-3">
              Bestellübersicht
            </h2>
            <dl className="space-y-1 text-sm text-neutral-700">
              <div className="flex justify-between">
                <dt>Zwischensumme</dt>
                <dd>{totalPrice.toFixed(2)} CHF</dd>
              </div>
              <div className="flex justify-between text-xs text-neutral-500">
                <dt>inkl. MwSt.</dt>
                <dd>bereits enthalten</dd>
              </div>
            </dl>

            <button
              type="button"
              className="mt-4 w-full rounded-md bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
            >
              Zur Kasse
            </button>

            <p className="mt-2 text-[11px] text-neutral-500 leading-snug">
              Die endgültigen Versandkosten und Steuern werden im nächsten
              Schritt berechnet.
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}
