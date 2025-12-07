// app/cart/page.tsx
"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const { items } = useCart();

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Warenkorb leer
  if (items.length === 0) {
    return (
      <main className="min-h-[70vh] bg-neutral-50">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center">
            <h1 className="text-2xl font-semibold mb-2">
              Dein Warenkorb ist leer
            </h1>
            <p className="text-sm text-neutral-600 mb-6">
              Füge Produkte zu deinem Warenkorb hinzu, um mit der Bestellung
              fortzufahren.
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
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          Warenkorb
        </h1>
        <p className="text-sm text-neutral-600 mb-6">
          Überprüfe deine ausgewählten Artikel und gehe anschliessend zur
          Kasse, um deine Bestellung abzuschliessen.
        </p>

        <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
          {/* Artikel-Liste */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-neutral-800 mb-4">
              Deine Artikel
            </h2>

            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-4 border-b last:border-b-0 border-neutral-100 pb-4 last:pb-0"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-neutral-900">
                      {item.title}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      Menge: {item.quantity}
                    </div>
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
            <h2 className="text-sm font-semibold text-neutral-800 mb-4">
              Zusammenfassung
            </h2>

            <div className="flex justify-between text-sm mb-2">
              <span>Zwischensumme</span>
              <span>{total.toFixed(2)} CHF</span>
            </div>
            <div className="flex justify-between text-xs text-neutral-500 mb-4">
              <span>inkl. MwSt.</span>
              <span>Versand wird im nächsten Schritt berechnet</span>
            </div>

            <Link
              href="/checkout"
              className="inline-flex w-full items-center justify-center rounded-md bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
            >
              Zur Kasse
            </Link>

            <Link
              href="/produkte"
              className="mt-3 inline-flex w-full items-center justify-center rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            >
              Weiter einkaufen
            </Link>

            <p className="mt-3 text-[11px] leading-snug text-neutral-500">
              Im nächsten Schritt kannst du deine Liefer- und Zahlungsdaten
              eingeben und die Bestellung endgültig bestätigen.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
