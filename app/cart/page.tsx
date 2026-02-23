// app/cart/page.tsx
"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const { cart, loading, error, updateLine, removeLine, goToCheckout } = useCart();
  const lines = cart?.lines ?? [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Warenkorb</h1>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="mt-6 text-sm text-neutral-600">Lade…</p>
      ) : lines.length === 0 ? (
        <div className="mt-6 rounded-2xl border bg-white p-6">
          <p className="text-sm text-neutral-700">Dein Warenkorb ist leer.</p>
          <Link
            href="/products"
            className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark transition"
          >
            Weiter einkaufen
          </Link>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border bg-white overflow-hidden">
          <ul className="divide-y">
            {lines.map((l) => (
              <li key={l.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{l.merchandise?.productTitle ?? "Produkt"}</div>
                  <div className="text-xs text-neutral-600">{l.merchandise?.title ?? ""}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="rounded-lg border px-3 py-1"
                    onClick={() => updateLine(l.id, Math.max(1, l.quantity - 1))}
                  >
                    −
                  </button>
                  <span className="min-w-[24px] text-center">{l.quantity}</span>
                  <button
                    className="rounded-lg border px-3 py-1"
                    onClick={() => updateLine(l.id, l.quantity + 1)}
                  >
                    +
                  </button>
                  <button
                    className="ml-2 rounded-lg border px-3 py-1 text-red-600"
                    onClick={() => removeLine(l.id)}
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="p-4 bg-neutral-50 flex items-center justify-between">
            <span className="text-sm text-neutral-700">Checkout</span>
            <button
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark transition"
              onClick={goToCheckout}
            >
              Checkout
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
