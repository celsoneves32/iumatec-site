"use client";

import Link from "next/link";
import { useCart } from "./CartContext";

export default function CartPageClient() {
  const { items, totalAmount, totalItems, removeItem, setQuantity, clear } =
    useCart();

  const handleCheckout = async () => {
    if (items.length === 0) return;

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        console.error(data);
        alert("Fehler beim Weiterleiten zu Stripe.");
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      alert("Verbindungsfehler. Bitte versuche es erneut.");
    }
  };

  if (items.length === 0) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl md:text-3xl font-semibold mb-4">
          Warenkorb
        </h1>
        <p className="text-gray-500 mb-4">
          Dein Warenkorb ist derzeit leer.
        </p>
        <Link
          href="/produkte"
          className="inline-flex items-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Produkte ansehen →
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl md:text-3xl font-semibold mb-4">Warenkorb</h1>

      <div className="space-y-4 mb-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-xl border dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3"
          >
            <div className="flex-1">
              <div className="font-medium">{item.title}</div>
              <div className="text-xs text-gray-500">
                CHF {item.price.toFixed(2)} / Stk.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity(item.id, item.quantity - 1)}
                className="h-8 w-8 rounded-md border flex items-center justify-center text-sm"
              >
                -
              </button>
              <span className="w-8 text-center text-sm">
                {item.quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(item.id, item.quantity + 1)}
                className="h-8 w-8 rounded-md border flex items-center justify-center text-sm"
              >
                +
              </button>
            </div>

            <div className="w-24 text-right text-sm font-semibold">
              CHF {(item.price * item.quantity).toFixed(2)}
            </div>

            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="text-xs text-red-600 hover:underline"
            >
              Entfernen
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t pt-4">
        <div className="text-sm text-gray-600">
          Artikel insgesamt: <span className="font-semibold">{totalItems}</span>
          <br />
          Zwischensumme:{" "}
          <span className="font-semibold">
            CHF {totalAmount.toFixed(2)}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={clear}
            className="rounded-md border px-4 py-2 text-sm"
          >
            Warenkorb leeren
          </button>
          <button
            type="button"
            onClick={handleCheckout}
            className="rounded-md bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            Zur Kasse (Stripe)
          </button>
        </div>
      </div>
    </main>
  );
}
