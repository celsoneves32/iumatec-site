"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function CartPageClient() {
  const {
    items,
    totalItems,
    totalPrice,
    removeItem,
    updateQuantity,
    clearCart,
  } = useCart();

  if (items.length === 0) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold mb-4">Warenkorb</h1>
        <p>Dein Warenkorb ist leer.</p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm text-red-600 hover:underline"
        >
          Zurück zur Startseite
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Warenkorb</h1>
        <button
          onClick={clearCart}
          className="text-sm text-red-600 hover:underline"
        >
          Warenkorb leeren
        </button>
      </div>

      <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between py-3"
          >
            <div>
              <div className="font-medium">{item.title}</div>
              <div className="text-sm text-neutral-500">
                {item.quantity} × CHF {item.price.toFixed(2)}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    updateQuantity(item.id, Math.max(1, item.quantity - 1))
                  }
                  className="px-2 py-1 text-xs border rounded"
                >
                  -
                </button>
                <span className="text-sm">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="px-2 py-1 text-xs border rounded"
                >
                  +
                </button>
              </div>
              <span className="font-semibold">
                CHF {(item.price * item.quantity).toFixed(2)}
              </span>
              <button
                onClick={() => removeItem(item.id)}
                className="text-xs text-neutral-500 hover:text-red-600"
              >
                Entfernen
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between border-t pt-4 mt-4">
        <span className="text-sm text-neutral-500">
          {totalItems} Artikel gesamt
        </span>
        <span className="text-lg font-semibold">
          Total: CHF {totalPrice.toFixed(2)}
        </span>
      </div>

      <div className="flex justify-end">
        <Link
          href="/checkout"
          className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
        >
          Zur Kasse
        </Link>
      </div>
    </main>
  );
}
