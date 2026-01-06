// app/account/orders/OrdersClient.tsx
"use client";

import Link from "next/link";
import type { OrderRow } from "./page";

export default function OrdersClient({
  orders,
  userEmail,
}: {
  orders: OrderRow[];
  userEmail: string | null;
}) {
  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Meine Bestellungen</h1>
          {userEmail && (
            <p className="text-sm text-neutral-600">
              Für Konto: <span className="font-medium">{userEmail}</span>
            </p>
          )}
        </div>
        <Link href="/account" className="text-xs text-red-600 hover:underline">
          ← Zurück zum Konto
        </Link>
      </header>

      {orders.length === 0 ? (
        <p className="text-sm text-neutral-600">
          Sie haben noch keine Bestellungen.
        </p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            // compatibilidade: aceita items (antigo) ou line_items (novo)
            const rawItems = order.items ?? order.line_items ?? [];
            const items: any[] = Array.isArray(rawItems) ? rawItems : [];

            const total =
              typeof order.total_amount === "number"
                ? order.total_amount
                : null;

            const currency = order.currency ?? "CHF";

            const ref =
              order.shopify_order_id
                ? `Shopify: ${order.shopify_order_id}`
                : order.stripe_session_id
                ? `Session: ${order.stripe_session_id}`
                : null;

            return (
              <div
                key={order.id}
                className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-2 mb-2">
                  <div>
                    <div className="font-semibold">
                      {currency} {total !== null ? total.toFixed(2) : "-"}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {new Date(order.created_at).toLocaleString("de-CH")}
                    </div>
                  </div>

                  {ref && (
                    <div className="text-xs text-neutral-500 break-all">
                      {ref}
                    </div>
                  )}
                </div>

                {items.length === 0 ? (
                  <p className="text-xs text-neutral-600">
                    Keine Artikelinformationen verfügbar.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {items.map((item, idx) => (
                      <li key={idx}>
                        <span className="font-medium">
                          {item.title ?? item.name ?? "Artikel"}
                        </span>
                        {typeof item.quantity === "number" &&
                          typeof item.price === "number" && (
                            <span className="text-neutral-600">
                              {` – ${item.quantity} × ${currency} ${item.price.toFixed(
                                2
                              )}`}
                            </span>
                          )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
