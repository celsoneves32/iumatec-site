// app/cart/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

function money(amount: string, currency: string) {
  const n = Number(amount || "0");
  return new Intl.NumberFormat("de-CH", { style: "currency", currency }).format(n);
}

export default function CartPage() {
  const { cart, loading, error, updateLine, removeLine, goToCheckout } = useCart();

  const lines = cart?.lines?.edges?.map((e) => e.node) ?? [];
  const currency = cart?.cost?.totalAmount?.currencyCode ?? "CHF";

  const subtotal = cart?.cost?.subtotalAmount?.amount ?? "0";
  const total = cart?.cost?.totalAmount?.amount ?? "0";

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Warenkorb</h1>
          <p className="text-sm text-neutral-600">Deine Auswahl für den Checkout.</p>
        </div>

        <Link href="/products" className="text-sm underline">
          Weiter einkaufen
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {!cart || lines.length === 0 ? (
        <div className="rounded-2xl border p-6">
          <div className="font-medium">Dein Warenkorb ist leer.</div>
          <Link href="/products" className="inline-block mt-3 underline text-sm">
            Produkte ansehen
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-[1fr_320px]">
          {/* LINES */}
          <div className="space-y-3">
            {lines.map((line) => {
              const img = line.merchandise.image?.url ?? null;
              const title = line.merchandise.product.title;
              const handle = line.merchandise.product.handle;

              const linePrice = money(
                line.merchandise.price.amount,
                line.merchandise.price.currencyCode
              );

              return (
                <div key={line.id} className="rounded-2xl border p-4 flex gap-4">
                  <div className="relative h-20 w-20 overflow-hidden rounded-lg bg-neutral-100 shrink-0">
                    {img ? (
                      <Image src={img} alt={title} fill className="object-cover" />
                    ) : (
                      <div className="h-full w-full grid place-items-center text-xs text-neutral-500">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/products/${handle}`}
                      className="font-medium hover:underline line-clamp-2"
                    >
                      {title}
                    </Link>

                    <div className="text-sm text-neutral-600 mt-1">{linePrice}</div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        className="rounded-md border px-2 py-1 disabled:opacity-50"
                        onClick={() => updateLine(line.id, Math.max(1, line.quantity - 1))}
                        disabled={loading}
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>

                      <div className="min-w-8 text-center">{line.quantity}</div>

                      <button
                        className="rounded-md border px-2 py-1 disabled:opacity-50"
                        onClick={() => updateLine(line.id, line.quantity + 1)}
                        disabled={loading}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>

                      <button
                        className="ml-auto text-sm underline disabled:opacity-50"
                        onClick={() => removeLine(line.id)}
                        disabled={loading}
                      >
                        Entfernen
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SUMMARY */}
          <aside className="rounded-2xl border p-4 h-fit space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Zwischensumme</span>
              <span className="font-medium">{money(subtotal, currency)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Total</span>
              <span className="font-semibold">{money(total, currency)}</span>
            </div>

            <button
              onClick={goToCheckout}
              disabled={loading || !cart?.checkoutUrl}
              className="w-full rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
            >
              {loading ? "Bitte warten..." : "Zur Kasse"}
            </button>

            <div className="text-xs text-neutral-500">
              Checkout abre no Shopify (NEW) em{" "}
              <span className="font-medium">shop.iumatec.ch</span>.
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
