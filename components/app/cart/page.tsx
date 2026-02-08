// app/cart/page.tsx
"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

function Price({ value, currency }: { value: number; currency: string }) {
  return (
    <span>
      {new Intl.NumberFormat("de-CH", {
        style: "currency",
        currency,
      }).format(value)}
    </span>
  );
}

export default function CartPage() {
  const cart = useCart();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-semibold">Warenkorb</h1>
        <Link href="/products" className="text-sm underline">
          Weiter einkaufen
        </Link>
      </div>

      {!cart.ready ? (
        <div className="rounded-xl border p-6">Lade…</div>
      ) : cart.lines.length === 0 ? (
        <div className="rounded-xl border p-6">
          <div className="font-medium">Dein Warenkorb ist leer.</div>
          <div className="text-sm text-neutral-600">
            Füge Produkte hinzu und gehe dann zur Kasse.
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border overflow-hidden">
            <div className="divide-y">
              {cart.lines.map((l) => (
                <div key={l.id} className="p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="font-medium">{l.productTitle}</div>
                    <div className="text-sm text-neutral-600">{l.title}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className="rounded border px-2 py-1"
                      onClick={() => cart.update(l.id, Math.max(1, l.quantity - 1))}
                    >
                      −
                    </button>
                    <div className="w-10 text-center">{l.quantity}</div>
                    <button
                      className="rounded border px-2 py-1"
                      onClick={() => cart.update(l.id, l.quantity + 1)}
                    >
                      +
                    </button>
                  </div>

                  <div className="w-28 text-right">
                    <Price value={l.amount} currency={l.currency} />
                  </div>

                  <button
                    className="text-sm underline"
                    onClick={() => cart.remove(l.id)}
                  >
                    Entfernen
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border p-4 flex items-center justify-between">
            <div className="text-sm text-neutral-600">
              Subtotal:{" "}
              <span className="font-medium text-black">
                <Price value={cart.subtotal} currency={cart.currency} />
              </span>
            </div>

            <button
              onClick={cart.checkout}
              className="rounded-lg bg-black px-4 py-2 text-white"
            >
              Zur Kasse
            </button>
          </div>
        </>
      )}
    </main>
  );
}
