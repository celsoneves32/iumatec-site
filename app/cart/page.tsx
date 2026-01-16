// app/cart/page.tsx
"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import CheckoutButton from "@/components/CheckoutButton";

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart } = useCart();

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // ✅ Garantir formato que o CheckoutButton espera
  const checkoutItems = items.map((i) => ({
    id: String(i.id),
    title: String(i.title),
    price: Number(i.price),
    quantity: Number(i.quantity),
  }));

  // Warenkorb leer
  if (items.length === 0) {
    return (
      <main className="min-h-[70vh] bg-neutral-50">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center">
            <h1 className="text-2xl font-semibold mb-2">Dein Warenkorb ist leer</h1>
            <p className="text-sm text-neutral-600 mb-6">
              Füge Produkte zu deinem Warenkorb hinzu, um mit der Bestellung fortzufahren.
            </p>
            <Link
              href="/produkte"
              className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
            >
              Jetzt Produkte entdecken
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Warenkorb mit Artikeln
  return (
    <main className="min-h-[70vh] bg-neutral-50">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold tracking-tight">Warenkorb</h1>
          <button
            type="button"
            onClick={clearCart}
            className="text-xs text-neutral-500 hover:text-neutral-800 underline underline-offset-2"
          >
            Warenkorb leeren
          </button>
        </div>

        <p className="text-sm text-neutral-600 mb-6">
          Überprüfe deine ausgewählten Artikel und gehe anschliessend zur Kasse, um deine
          Bestellung abzuschliessen.
        </p>

        <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
          {/* Artikel-Liste */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-neutral-800 mb-4">Deine Artikel</h2>

            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-4 border-b last:border-b-0 border-neutral-100 pb-4 last:pb-0"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-neutral-900">{item.title}</div>

                    <div className="mt-2 inline-flex items-center gap-2">
                      <span className="text-xs text-neutral-500">Menge:</span>

                      <div className="inline-flex items-center gap-1 border border-neutral-300 rounded-md px-1 py-0.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 rounded"
                        >
                          −
                        </button>

                        <span className="min-w-[2rem] text-center text-xs">{item.quantity}</span>

                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 rounded"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="mt-2 text-[11px] text-red-600 hover:text-red-700"
                    >
                      Entfernen
                    </button>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-neutral-900">
                      {(item.price * item.quantity).toFixed(2)} CHF
                    </div>
                    <div className="text-xs text-neutral-500">
                      Einzelpreis: {item.price.toFixed(2)} CHF
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Zusammenfassung & Kasse */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-neutral-800 mb-4">Zusammenfassung</h2>

            <div className="flex justify-between text-sm mb-2">
              <span>Zwischensumme</span>
              <span>{total.toFixed(2)} CHF</span>
            </div>

            <div className="flex justify-between text-xs text-neutral-500 mb-4">
              <span>inkl. MwSt.</span>
              <span>Versand wird im nächsten Schritt berechnet</span>
            </div>

            {/* ✅ Checkout direto via Stripe */}
            <CheckoutButton items={checkoutItems} />

            <Link
              href="/produkte"
              className="mt-3 inline-flex w-full items-center justify-center rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            >
              Weiter einkaufen
            </Link>

            <p className="mt-3 text-[11px] leading-snug text-neutral-500">
              Im nächsten Schritt kannst du deine Liefer- und Zahlungsdaten eingeben und
              die Bestellung endgültig bestätigen.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
