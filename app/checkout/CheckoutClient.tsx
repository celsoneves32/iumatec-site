// app/checkout/CheckoutClient.tsx
"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import CheckoutButton from "@/components/CheckoutButton";

export default function CheckoutClient() {
  const { items } = useCart(); // ⬅️ usa os items reais do carrinho

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (items.length === 0) {
    return (
      <main className="min-h-[60vh] bg-neutral-50">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center">
            <h1 className="text-2xl font-semibold mb-2">Dein Warenkorb ist leer</h1>
            <p className="text-sm text-neutral-600 mb-6">
              Füge zuerst Produkte zu deinem Warenkorb hinzu, bevor du zur Kasse gehst.
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

  return (
    <main className="min-h-[70vh] bg-neutral-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Kasse</h1>
        <p className="text-sm text-neutral-600 mb-6">
          Überprüfe deine Bestellung und schliesse den Einkauf ab.
        </p>

        {/* Bestellübersicht */}
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
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <div className="font-medium text-neutral-900">
                      {item.title}
                    </div>
                    <div className="text-xs text-neutral-500">
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

          {/* Zusammenfassung / Stripe Button */}
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

            <CheckoutButton items={items} />

            <p className="mt-3 text-[11px] leading-snug text-neutral-500">
              Mit Klick auf &quot;Zur Kasse&quot; wirst du zum sicheren Stripe
              Checkout weitergeleitet, um deine Zahlung abzuschliessen.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
