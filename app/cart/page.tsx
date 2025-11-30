// app/cart/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const { items, clearCart, removeItem, updateQuantity } = useCart();
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  const hasItems = items.length > 0;

  const total = items.reduce(
    (sum: number, item: any) => sum + item.price * item.quantity,
    0
  );

  const handleCheckout = async () => {
    if (!hasItems || loadingCheckout) return;

    try {
      setLoadingCheckout(true);

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (!res.ok) {
        console.error("Checkout error", await res.text());
        alert("Es gab ein Problem beim Weiterleiten zur Bezahlung.");
        setLoadingCheckout(false);
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Kein Checkout-Link erhalten.");
        setLoadingCheckout(false);
      }
    } catch (err) {
      console.error(err);
      alert("Es gab ein Problem beim Weiterleiten zur Bezahlung.");
      setLoadingCheckout(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">Warenkorb</h1>

      {!hasItems && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          Dein Warenkorb ist noch leer.
          <div className="mt-4">
            <Link
              href="/produkte"
              className="inline-block px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition"
            >
              Jetzt einkaufen
            </Link>
          </div>
        </div>
      )}

      {hasItems && (
        <>
          {/* Lista de itens */}
          <section className="rounded-2xl border border-neutral-200 bg-white divide-y divide-neutral-200">
            {items.map((item: any) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Infos do produto */}
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-neutral-500">
                    {item.quantity} × CHF {item.price.toFixed(2)}
                  </p>
                </div>

                {/* Controles à direita */}
                <div className="flex items-center gap-4">
                  {/* Quantidade */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(
                          item.id,
                          Math.max(1, item.quantity - 1)
                        )
                      }
                      className="px-3 py-1 rounded-lg bg-neutral-200 hover:bg-neutral-300 transition text-sm font-semibold"
                    >
                      –
                    </button>
                    <span className="min-w-[32px] text-center text-sm font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.id, item.quantity + 1)
                      }
                      className="px-3 py-1 rounded-lg bg-neutral-200 hover:bg-neutral-300 transition text-sm font-semibold"
                    >
                      +
                    </button>
                  </div>

                  {/* Preço da linha */}
                  <div className="min-w-[110px] text-right text-sm font-semibold">
                    CHF {(item.price * item.quantity).toFixed(2)}
                  </div>

                  {/* Entfernen – pequeno e vermelho */}
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition"
                  >
                    Entfernen
                  </button>
                </div>
              </div>
            ))}
          </section>

          {/* Total + ações */}
          <section className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 text-sm text-neutral-700">
              <p>
                <span className="font-semibold">Total:&nbsp;</span>
                CHF {total.toFixed(2)}
              </p>
              <p className="text-xs text-neutral-500">
                Preise inklusive gesetzlicher MwSt. – exklusive Versandkosten.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              {/* Warenkorb leeren – cinza, secundário */}
              <button
                type="button"
                onClick={clearCart}
                className="px-6 py-2 rounded-xl bg-neutral-200 text-neutral-800 text-sm font-semibold hover:bg-neutral-300 transition"
              >
                Warenkorb leeren
              </button>

              {/* Zur Kasse – botão principal vermelho */}
              <button
                type="button"
                onClick={handleCheckout}
                disabled={!hasItems || loadingCheckout}
                className="px-6 py-2 rounded-xl bg-red-600 disabled:bg-red-300 text-white text-sm font-semibold hover:bg-red-700 disabled:cursor-not-allowed transition"
              >
                {loadingCheckout ? "Weiter zur Kasse..." : "Zur Kasse"}
              </button>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
