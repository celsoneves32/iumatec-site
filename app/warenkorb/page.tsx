// app/warenkorb/page.tsx
"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

function formatMoney(amount?: string, currency?: string) {
  if (!amount) return "";
  const n = Number(amount);
  if (Number.isNaN(n)) return `${amount} ${currency || ""}`.trim();
  return `${n.toFixed(2)} ${currency || "CHF"}`.trim();
}

export default function WarenkorbPage() {
  const { cart, loading, error, totalQuantity, updateLine, removeLine, goToCheckout, clearCart } =
    useCart();

  const totalAmount = cart?.cost?.totalAmount?.amount;
  const currency = cart?.cost?.totalAmount?.currencyCode;

  const lines = cart?.lines ?? [];

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <header className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Warenkorb</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {totalQuantity > 0 ? `${totalQuantity} Artikel` : "Dein Warenkorb ist leer."}
          </p>
        </div>

        <Link
          href="/produkte"
          className="text-sm underline underline-offset-4 hover:opacity-80"
        >
          Weiter einkaufen →
        </Link>
      </header>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),360px]">
        {/* Lines */}
        <section className="rounded-2xl border border-neutral-200 bg-white">
          <div className="p-4 border-b border-neutral-200">
            <h2 className="text-sm font-semibold text-neutral-800">Artikel</h2>
          </div>

          {loading && (
            <div className="p-4 text-sm text-neutral-500">Lade Warenkorb…</div>
          )}

          {!loading && lines.length === 0 && (
            <div className="p-6 text-sm text-neutral-500">
              Dein Warenkorb ist leer.{" "}
              <Link href="/produkte" className="underline underline-offset-4">
                Produkte ansehen
              </Link>
              .
            </div>
          )}

          {!loading && lines.length > 0 && (
            <ul className="divide-y divide-neutral-200">
              {lines.map((line) => {
                const title =
                  line.merchandise?.productTitle ||
                  line.merchandise?.title ||
                  "Produkt";

                const lineAmount = line.cost?.totalAmount?.amount;
                const lineCurrency = line.cost?.totalAmount?.currencyCode;

                return (
                  <li key={line.id} className="p-4 flex gap-4 items-start">
                    <div className="flex-1">
                      <div className="font-medium text-neutral-900">{title}</div>
                      {line.merchandise?.title && (
                        <div className="text-xs text-neutral-500 mt-1">
                          Variante: {line.merchandise.title}
                        </div>
                      )}

                      <div className="text-sm text-neutral-700 mt-2">
                        {formatMoney(lineAmount, lineCurrency)}
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          className="h-9 w-9 rounded-lg border hover:bg-neutral-50 disabled:opacity-50"
                          onClick={() => updateLine(line.id, Math.max(1, line.quantity - 1))}
                          disabled={loading || line.quantity <= 1}
                          aria-label="Menge reduzieren"
                        >
                          –
                        </button>

                        <div className="min-w-10 text-center text-sm">{line.quantity}</div>

                        <button
                          className="h-9 w-9 rounded-lg border hover:bg-neutral-50 disabled:opacity-50"
                          onClick={() => updateLine(line.id, line.quantity + 1)}
                          disabled={loading}
                          aria-label="Menge erhöhen"
                        >
                          +
                        </button>

                        <button
                          className="ml-3 text-sm text-red-600 hover:underline underline-offset-4 disabled:opacity-50"
                          onClick={() => removeLine(line.id)}
                          disabled={loading}
                        >
                          Entfernen
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Summary */}
        <aside className="rounded-2xl border border-neutral-200 bg-white p-5 h-fit">
          <h2 className="text-sm font-semibold text-neutral-800 mb-4">Übersicht</h2>

          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-neutral-600">Zwischensumme</span>
            <span className="font-medium text-neutral-900">
              {formatMoney(totalAmount, currency)}
            </span>
          </div>

          <div className="text-xs text-neutral-500 mb-4">
            Versand und Rabatte werden im Checkout berechnet.
          </div>

          <button
            onClick={goToCheckout}
            disabled={loading || lines.length === 0}
            className="w-full rounded-xl bg-black px-4 py-3 text-sm text-white hover:opacity-90 disabled:opacity-50"
          >
            Zur Kasse
          </button>

          {lines.length > 0 && (
            <button
              onClick={clearCart}
              disabled={loading}
              className="mt-3 w-full rounded-xl border px-4 py-3 text-sm hover:bg-neutral-50 disabled:opacity-50"
            >
              Warenkorb leeren
            </button>
          )}

          <div className="mt-4 text-[11px] text-neutral-500 leading-snug">
            Sichere Bezahlung via Shopify Checkout. Unterstützung:{" "}
            <a className="underline underline-offset-4" href="mailto:support@iumatec.ch">
              support@iumatec.ch
            </a>
          </div>
        </aside>
      </div>
    </main>
  );
}
