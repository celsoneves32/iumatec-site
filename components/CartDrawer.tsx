"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

function money(amount: string, currency: string) {
  const n = Number(amount || "0");
  return new Intl.NumberFormat("de-CH", { style: "currency", currency }).format(n);
}

export default function CartDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { cart, loading, error, totalQuantity, updateLine, removeLine, goToCheckout } = useCart();

  const lines = cart?.lines?.edges?.map((e) => e.node) ?? [];
  const currency = cart?.cost?.totalAmount?.currencyCode ?? "CHF";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <button
        aria-label="Close cart"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      {/* Panel */}
      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl border-l">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b">
            <div className="flex items-center gap-2">
              <span className="text-lg">🛒</span>
              <h2 className="font-semibold">Warenkorb</h2>
              {totalQuantity > 0 && (
                <span className="text-xs text-neutral-500">({totalQuantity})</span>
              )}
            </div>

            <button
              onClick={onClose}
              className="rounded-lg border px-3 py-2 hover:bg-neutral-50"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto px-4 py-4">
            {error && (
              <div className="mb-3 rounded-xl border p-3 text-sm text-neutral-700">
                {error}
              </div>
            )}

            {!cart || lines.length === 0 ? (
              <div className="rounded-2xl border p-6">
                <div className="font-medium">Dein Warenkorb ist leer.</div>
                <Link href="/products" onClick={onClose} className="inline-block mt-3 underline text-sm">
                  Produkte ansehen
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {lines.map((line) => {
                  const img = line.merchandise.image?.url;
                  const title = line.merchandise.product.title;
                  const handle = line.merchandise.product.handle;

                  return (
                    <div key={line.id} className="rounded-2xl border p-3 flex gap-3">
                      <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-neutral-100 shrink-0">
                        {img ? (
                          <Image src={img} alt={title} fill className="object-cover" />
                        ) : null}
                      </div>

                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/products/${handle}`}
                          onClick={onClose}
                          className="font-medium hover:underline line-clamp-1"
                        >
                          {title}
                        </Link>

                        <div className="text-sm text-neutral-600">
                          {money(line.merchandise.price.amount, line.merchandise.price.currencyCode)}
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          <button
                            className="rounded-lg border px-2 py-1 hover:bg-neutral-50"
                            onClick={() => updateLine(line.id, Math.max(1, line.quantity - 1))}
                            disabled={loading}
                          >
                            -
                          </button>
                          <div className="min-w-8 text-center text-sm">{line.quantity}</div>
                          <button
                            className="rounded-lg border px-2 py-1 hover:bg-neutral-50"
                            onClick={() => updateLine(line.id, line.quantity + 1)}
                            disabled={loading}
                          >
                            +
                          </button>

                          <button
                            className="ml-auto text-sm underline text-neutral-700"
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
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-4 py-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-600">Zwischensumme</span>
              <span className="font-medium">
                {cart ? money(cart.cost.subtotalAmount.amount, currency) : money("0", currency)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral-600 text-sm">Total</span>
              <span className="font-semibold">
                {cart ? money(cart.cost.totalAmount.amount, currency) : money("0", currency)}
              </span>
            </div>

            <button
              onClick={async () => {
                await goToCheckout();
              }}
              disabled={loading || !cart || lines.length === 0}
              className="w-full rounded-xl bg-black px-4 py-3 text-white disabled:opacity-50"
            >
              Zur Kasse
            </button>

            <div className="flex gap-2">
              <Link
                href="/cart"
                onClick={onClose}
                className="w-full text-center rounded-xl border px-4 py-3 hover:bg-neutral-50"
              >
                Warenkorb ansehen
              </Link>
            </div>

            <div className="text-[11px] text-neutral-500">
              Checkout abre no Shopify (NEW).
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
