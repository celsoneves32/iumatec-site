"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function CartDrawer({ open, onClose }: Props) {
  const { cart, loading, error, totalQuantity, updateLine, removeLine, goToCheckout } =
    useCart();

  // ✅ Aceita os 2 formatos: array (CartLine[]) OU GraphQL connection (edges/node)
  const rawLines: any = (cart as any)?.lines;
  const lines: any[] = Array.isArray(rawLines)
    ? rawLines
    : rawLines?.edges?.map((e: any) => e.node) ?? [];

  const currency =
    (cart as any)?.cost?.totalAmount?.currencyCode ??
    (cart as any)?.currencyCode ??
    "CHF";

  const total =
    Number((cart as any)?.cost?.totalAmount?.amount ?? 0) || 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-semibold">Warenkorb ({totalQuantity ?? 0})</div>
          <button
            onClick={onClose}
            className="rounded-lg border px-3 py-1 text-sm hover:bg-neutral-50"
          >
            Schließen
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3">
          {loading && (
            <div className="text-sm text-neutral-600">Laden...</div>
          )}

          {error && (
            <div className="text-sm text-red-600">{String(error)}</div>
          )}

          {!loading && lines.length === 0 && (
            <div className="text-sm text-neutral-700">
              Dein Warenkorb ist leer.
            </div>
          )}

          {lines.map((line: any) => {
            const id = line.id;
            const qty = line.quantity ?? 1;
            const title = line.merchandise?.product?.title ?? "Produkt";
            const variantTitle = line.merchandise?.title ?? "";
            const img = line.merchandise?.product?.featuredImage?.url ?? null;

            const linePrice =
              Number(line.cost?.totalAmount?.amount ?? 0) ||
              Number(line.merchandise?.price?.amount ?? 0) * qty ||
              0;

            return (
              <div key={id} className="border rounded-xl p-3 flex gap-3">
                <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-neutral-100 shrink-0">
                  {img ? (
                    <Image src={img} alt={title} fill className="object-cover" />
                  ) : null}
                </div>

                <div className="flex-1">
                  <div className="font-medium text-sm">{title}</div>
                  {variantTitle ? (
                    <div className="text-xs text-neutral-600">{variantTitle}</div>
                  ) : null}

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        className="h-8 w-8 rounded-lg border hover:bg-neutral-50"
                        onClick={() => updateLine(id, Math.max(1, qty - 1))}
                        aria-label="minus"
                      >
                        −
                      </button>
                      <div className="min-w-8 text-center text-sm">{qty}</div>
                      <button
                        className="h-8 w-8 rounded-lg border hover:bg-neutral-50"
                        onClick={() => updateLine(id, qty + 1)}
                        aria-label="plus"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-sm text-neutral-800">
                      {new Intl.NumberFormat("de-CH", {
                        style: "currency",
                        currency,
                      }).format(linePrice)}
                    </div>
                  </div>

                  <button
                    className="mt-2 text-xs underline text-neutral-600"
                    onClick={() => removeLine(id)}
                  >
                    Entfernen
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-600">Total</div>
            <div className="font-semibold">
              {new Intl.NumberFormat("de-CH", {
                style: "currency",
                currency,
              }).format(total)}
            </div>
          </div>

          <button
            onClick={goToCheckout}
            className="w-full rounded-xl bg-black text-white py-3 font-medium disabled:opacity-50"
            disabled={loading || lines.length === 0}
          >
            Zur Kasse
          </button>

          <Link
            href="/warenkorb"
            className="block text-center text-sm underline text-neutral-700"
            onClick={onClose}
          >
            Warenkorb ansehen
          </Link>
        </div>
      </div>
    </div>
  );
}
