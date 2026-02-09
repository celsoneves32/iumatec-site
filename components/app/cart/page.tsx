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

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-semibold">Warenkorb</h1>

      {error && <div className="rounded-lg border p-3 text-sm">{error}</div>}

      {!cart || lines.length === 0 ? (
        <div className="rounded-2xl border p-6">
          <div className="font-medium">Dein Warenkorb ist leer.</div>
          <Link href="/products" className="inline-block mt-3 underline text-sm">
            Produkte ansehen
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            {lines.map((line) => {
              const img = line.merchandise.image?.url;
              const title = line.merchandise.product.title;
              const handle = line.merchandise.product.handle;

              return (
                <div key={line.id} className="rounded-2xl border p-4 flex gap-4">
                  <div className="relative h-20 w-20 overflow-hidden rounded-lg bg-neutral-100">
                    {img ? (
                      <Image src={img} alt={title} fill className="object-cover" />
                    ) : null}
                  </div>

                  <div className="flex-1">
                    <Link href={`/products/${handle}`} className="font-medium hover:underline">
                      {title}
                    </Link>

                    <div className="text-sm text-neutral-600">
                      {money(line.merchandise.price.amount, line.merchandise.price.currencyCode)}
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <button
                        className="rounded-md border px-2 py-1"
                        onClick={() => updateLine(line.id, Math.max(1, line.quantity - 1))}
                        disabled={loading}
                      >
                        -
                      </button>
                      <div className="min-w-8 text-center">{line.quantity}</div>
                      <button
                        className="rounded-md border px-2 py-1"
                        onClick={() => updateLine(line.id, line.quantity + 1)}
                        disabled={loading}
                      >
                        +
                      </button>

                      <button
                        className="ml-auto text-sm underline"
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

          <aside className="rounded-2xl border p-4 h-fit space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Zwischensumme</span>
              <span className="font-medium">
                {money(cart.cost.subtotalAmount.amount, currency)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Total</span>
              <span className="font-semibold">
                {money(cart.cost.totalAmount.amount, currency)}
              </span>
            </div>

            <button
              onClick={goToCheckout}
              disabled={loading}
              className="w-full rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
            >
              Zur Kasse
            </button>

            <div className="text-xs text-neutral-500">
              Checkout abre no Shopify (NEW).
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
