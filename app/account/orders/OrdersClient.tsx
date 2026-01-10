// app/account/orders/OrdersClient.tsx
"use client";

import Link from "next/link";
import type { OrderRow } from "./page";

function formatCHF(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return value.toFixed(2);
}

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
            // compat: aceita items (antigo) ou line_items (novo)
            const rawItems = (order as any).items ?? (order as any).line_items ?? [];
            const items: any[] = Array.isArray(rawItems) ? rawItems : [];

            const currency = (order.currency ?? "CHF").toUpperCase();

            // Total compat:
            // - legacy: total_amount (CHF)
            // - novo Stripe: amount_total (cents)
            const legacyTotal = (order as any).total_amount;
            const stripeAmountTotal = (order as any).amount_total;

            const totalCHF =
              typeof legacyTotal === "number"
                ? legacyTotal
                : typeof stripeAmountTotal === "number"
                ? stripeAmountTotal / 100
                : null;

            const shippingCents =
              typeof (order as any).shipping_cost === "number"
                ? (order as any).shipping_cost
                : null;

            const shippingCHF =
              typeof shippingCents === "number" ? shippingCents / 100 : null;

            const status =
              (order as any).status ||
              (order as any).payment_status ||
              null;

            const ref =
              (order as any).shopify_order_id
                ? `Shopify: ${(order as any).shopify_order_id}`
                : order.stripe_session_id
                ? `Session: ${order.stripe_session_id}`
                : null;

            const shippingLine =
              shippingCHF === null
                ? null
                : shippingCHF === 0
                ? "Gratis Versand"
                : `Versand: ${currency} ${formatCHF(shippingCHF)}`;

            return (
              <div
                key={order.id}
                className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-2 mb-2">
                  <div className="space-y-0.5">
                    <div className="font-semibold">
                      {currency} {formatCHF(totalCHF)}
                    </div>

                    <div className="text-xs text-neutral-500">
                      {new Date(order.created_at).toLocaleString("de-CH")}
                      {status ? (
                        <span className="ml-2 inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-700">
                          {String(status)}
                        </span>
                      ) : null}
                    </div>

                    {shippingLine ? (
                      <div className="text-xs text-neutral-600">{shippingLine}</div>
                    ) : null}
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
                    {items.map((item, idx) => {
                      const title = item.title ?? item.name ?? "Artikel";
                      const qty =
                        typeof item.quantity === "number" ? item.quantity : null;

                      // item.price pode estar:
                      // - legacy: number (CHF)
                      // - novo: nem sempre vem (se ainda não guardas line_items)
                      const price =
                        typeof item.price === "number" ? item.price : null;

                      return (
                        <li key={idx}>
                          <span className="font-medium">{title}</span>
                          {qty !== null && price !== null ? (
                            <span className="text-neutral-600">
                              {` – ${qty} × ${currency} ${formatCHF(price)}`}
                            </span>
                          ) : qty !== null ? (
                            <span className="text-neutral-600">
                              {` – Menge: ${qty}`}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
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
