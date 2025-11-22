// app/cart/page.tsx
"use client";

import { useCart } from "../../components/CartContext";

export default function CartPage() {
  const { items, totalItems, totalPrice, removeItem, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold mb-4">Warenkorb</h1>
        <p>Dein Warenkorb ist leer.</p>
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
    </main>
  );
}
