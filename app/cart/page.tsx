// app/cart/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const { items, clearCart, removeItem, updateQuantity } = useCart();

  const hasItems = items.length > 0;

  // 👉 calcular total aqui, em vez de vir do contexto
  const total = items.reduce(
    (sum: number, item: any) => sum + item.price * item.quantity,
    0
  );

  const handleDecrease = (id: string, currentQty: number) => {
    if (currentQty <= 1) return;
    updateQuantity(id, currentQty - 1);
  };

  const handleIncrease = (id: string, currentQty: number) => {
    updateQuantity(id, currentQty + 1);
  };

  const handleCheckout = async () => {
    // 👉 obrigar login antes de ir para Stripe
    if (!session?.user) {
      router.push("/login?from=/cart");
      return;
    }

    if (!hasItems) {
      return;
    }

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (!res.ok) {
        throw new Error("Fehler beim Erzeugen der Zahlungssitzung.");
      }

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Keine Weiterleitungs-URL erhalten.");
      }
    } catch (error) {
      console.error(error);
      alert("Die Weiterleitung zur Zahlung ist fehlgeschlagen.");
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">Warenkorb</h1>

      {!hasItems && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          Dein Warenkorb ist leer.
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
          {/* Lista de items */}
          <section className="space-y-4 mb-6">
            {items.map((item: any) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-neutral-500">
                    1 × CHF {item.price.toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {/* Quantidade */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleDecrease(item.id, item.quantity)
                      }
                      className="h-8 w-8 rounded-full border border-neutral-300 flex items-center justify-center text-sm font-semibold hover:bg-neutral-100"
                    >
                      –
                    </button>
                    <span className="min-w-[2rem] text-center text-sm">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleIncrease(item.id, item.quantity)
                      }
                      className="h-8 w-8 rounded-full border border-neutral-300 flex items-center justify-center text-sm font-semibold hover:bg-neutral-100"
                    >
                      +
                    </button>
                  </div>

                  {/* Preço total do item */}
                  <p className="text-sm font-semibold">
                    CHF {(item.price * item.quantity).toFixed(2)}
                  </p>

                  {/* Remover item */}
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="inline-flex items-center px-4 py-1.5 rounded-full border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    Entfernen
                  </button>
                </div>
              </div>
            ))}
          </section>

          {/* Resumo + ações */}
          <section className="flex flex-col items-start gap-4 border-t border-neutral-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-neutral-700">
              <p>
                <span className="font-semibold">Total:</span>{" "}
                CHF {total.toFixed(2)}
              </p>
              <p className="text-xs text-neutral-500">
                Preise inklusive gesetzlicher MwSt. – exklusive Versandkosten.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={clearCart}
                className="px-4 py-2 rounded-full border border-neutral-300 text-sm font-semibold text-neutral-800 hover:bg-neutral-100"
              >
                Warenkorb leeren
              </button>

              <button
                type="button"
                onClick={handleCheckout}
                className="px-5 py-2 rounded-full bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
              >
                Zur Kasse
              </button>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
