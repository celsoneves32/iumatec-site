// app/warenkorb/page.tsx
"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const { cart, loading, error, updateLine, removeLine, goToCheckout, clearCart } = useCart();

  const lines = cart?.lines ?? [];
  const total =
    cart?.cost?.totalAmount?.amount && cart?.cost?.totalAmount?.currencyCode
      ? `${Number(cart.cost.totalAmount.amount).toFixed(2)} ${cart.cost.totalAmount.currencyCode}`
      : null;

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <header className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Warenkorb</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Prüfe deine Artikel und gehe sicher zur Kasse.
          </p>
        </div>

        <Link href="/produkte" className="text-sm underline underline-offset-4">
          Weiter einkaufen
        </Link>
      </header>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr),320px]">
        {/* Lista */}
        <section className="bg-white border border-neutral-200 rounded-2xl p-4">
          {loading && (
            <div className="text-sm text-neutral-500 py-6">Lade Warenkorb…</div>
          )}

          {!loading && lines.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-sm text-neutral-600">Dein Warenkorb ist leer.</p>
              <Link
                href="/produkte"
                className="inline-block mt-4 rounded-xl bg-black px-5 py-2 text-sm text-white"
              >
                Produkte ansehen
              </Link>
            </div>
          )}

          {!loading && lines.length > 0 && (
            <ul className="divide-y">
              {lines.map((line) => {
                const title =
                  line.merchandise?.productTitle
                    ? `${line.merchandise.productTitle}${
                        line.merchandise?.title ? ` – ${line.merchandise.title}` : ""
                      }`
                    : line.merchandise?.title || "Artikel";

                const lineTotal =
                  line.cost?.totalAmount?.amount && line.cost?.totalAmount?.currencyCode
                    ? `${Number(line.cost.totalAmount.amount).toFixed(2)} ${line.cost.totalAmount.currencyCode}`
                    : null;

                return (
                  <li key={line.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-medium text-neutral-900 truncate">{title}</div>
                      {lineTotal && <div className="text-xs text-neutral-500 mt-1">{lineTotal}</div>}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center rounded-xl border overflow-hidden">
                        <button
                          className="px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-40"
                          disabled={loading || line.quantity <= 1}
                          onClick={() => updateLine(line.id, line.quantity - 1)}
                          aria-label="Menge reduzieren"
                        >
                          −
                        </button>
                        <div className="px-3 py-2 text-sm min-w-[44px] text-center">
                          {line.quantity}
                        </div>
                        <button
                          className="px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-40"
                          disabled={loading}
                          onClick={() => updateLine(line.id, line.quantity + 1)}
                          aria-label="Menge erhöhen"
                        >
                          +
                        </button>
                      </div>

                      <button
                        className="text-sm underline underline-offset-4 text-neutral-600 hover:text-neutral-900 disabled:opacity-40"
                        disabled={loading}
                        onClick={() => removeLine(line.id)}
                      >
                        Entfernen
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Resumo */}
        <aside className="bg-white border border-neutral-200 rounded-2xl p-4 h-fit">
          <h2 className="text-sm font-semibold text-neutral-900">Zusammenfassung</h2>

          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-neutral-600">Total</span>
            <span className="font-semibold text-neutral-900">{total ?? "—"}</span>
          </div>

          <button
            className="mt-4 w-full rounded-xl bg-black px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-40"
            disabled={loading || !cart?.checkoutUrl || lines.length === 0}
            onClick={goToCheckout}
          >
            Zur Kasse
          </button>

          <button
            className="mt-2 w-full rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-40"
            disabled={loading || lines.length === 0}
            onClick={clearCart}
          >
            Warenkorb leeren
          </button>

          <p className="mt-3 text-[11px] text-neutral-500 leading-snug">
            Sichere Shopify-Kasse. Versand & Steuern werden im Checkout berechnet.
          </p>
        </aside>
      </div>
    </main>
  );
}
