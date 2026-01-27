"use client";

import CheckoutButton from "@/components/CheckoutButton";
import { useCart } from "@/context/CartContext";

export default function CheckoutClient() {
  const { items, totalPrice } = useCart();

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Checkout</h1>
        <p className="text-sm text-neutral-600">
          Prüfe deine Artikel und gehe zur Kasse.
        </p>
      </header>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="flex justify-between text-sm">
              <span>
                {it.title} <span className="text-neutral-500">× {it.quantity}</span>
              </span>
              <span>CHF {(it.price * it.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 border-t border-neutral-200 pt-3 flex justify-between font-semibold">
          <span>Total</span>
          <span>CHF {totalPrice.toFixed(2)}</span>
        </div>
      </div>

      <CheckoutButton items={items} />
    </main>
  );
}
