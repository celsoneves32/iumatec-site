"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const { cart, loading, error, totalQuantity, updateLine, removeLine, goToCheckout } =
    useCart();

  const lines = cart?.lines ?? [];
  const total = cart?.cost?.totalAmount;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Warenkorb</h1>
          <p className="text-sm text-neutral-600 mt-1">
            {totalQuantity > 0 ? `${totalQuantity} Artikel` : "Dein Warenkorb ist leer."}
          </p>
        </div>

        <Link href="/products" className="text-sm underline">
          Weiter einkaufen
        </Link>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {lines.length === 0 ? (
        <div className="mt-8 rounded-2xl border p-8 text-center bg-white">
          <div className="text-base font-medium">Noch keine Produkte im Warenkorb.</div>
          <div className="text-sm text-neutral-600 mt-2">
            Geh zu den Produkten und füge etwas hinzu.
          </div>
          <Link
            href="/products"
            className="inline-flex mt-5 items-center justify-center rounded-lg bg-black px-4 py-2 text-white"
          >
            Produkte ansehen
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Lines */}
          <section className="lg:col-span-2 space-y-4">
            {lines.map((line) => (
              <div
                key={line.id}
                className="rounded-2xl border bg-white p-4 flex gap-4 items-start"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium line-clamp-2">
                    {line.merchandise?.productTitle ?? "Produkt"}
                  </div>
                  <div className="text-sm text-neutral-600 line-clamp-1">
                    {line.merchandise?.title ?? ""}
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <label className="text-sm text-neutral-600">Menge</label>
                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => updateLine(line.id, Number(e.target.value))}
                      className="w-20 rounded-lg border px-3 py-2 text-sm"
                      disabled={loading}
                    />

                    <button
                      onClick={() => removeLine(line.id)}
                      className="text-sm underline text-neutral-700 hover:text-black"
                      disabled={loading}
                    >
                      Entfernen
                    </button>
                  </div>
                </div>

                <div className="text-right whitespace-nowrap">
                  <div className="text-sm text-neutral-600">Preis</div>
                  <div className="font-semibold">
                    {line.cost?.totalAmount
                      ? `${line.cost.totalAmount.amount} ${line.cost.totalAmount.currencyCode}`
                      : "—"}
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Summary */}
          <aside className="rounded-2xl border bg-white p-5 h-fit">
            <h2 className="text-lg font-semibold">Zusammenfassung</h2>

            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-neutral-600">Artikel</span>
              <span className="font-medium">{totalQuantity}</span>
            </div>

            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-neutral-600">Total</span>
              <span className="font-semibold">
                {total ? `${total.amount} ${total.currencyCode}` : "—"}
              </span>
            </div>

            <button
              onClick={goToCheckout}
              disabled={!cart?.checkoutUrl || loading}
              className="mt-5 w-full rounded-lg bg-black px-4 py-3 text-white disabled:opacity-50"
            >
              {loading ? "Bitte warten…" : "Zur Kasse"}
            </button>

            <p className="mt-3 text-xs text-neutral-500">
              Checkout wird sicher über Shopify abgewickelt.
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}
