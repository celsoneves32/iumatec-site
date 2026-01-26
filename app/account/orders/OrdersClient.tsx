// app/account/orders/OrdersClient.tsx
"use client";

import Link from "next/link";
import type { OrderRow } from "./types";

function formatMoney(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return value.toFixed(2);
}

function toCHFfromCents(cents: number | null | undefined) {
  if (typeof cents !== "number" || Number.isNaN(cents)) return null;
  return cents / 100;
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
            const currency = (order.currency ?? "CHF").toUpperCase();

            // Total compat:
            // - legacy: total_amount (CHF)
            // - novo Stripe: amount_total (cents)
            const legacyTotal = (order as any).total_amount as number | undefined;
            const stripeAmountTotal = (order as any).amount_total as number | undefined;

            const totalCHF =
              typeof legacyTotal === "number"
                ? legacyTotal
                : toCHFfromCents(stripeAmountTotal);

            const shippingCHF = toCHFfromCents((order as any).shipping_cost);

            const status =
              (order as any).status || (order as any).payment_status || null;

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
                : `Versand: ${currency} ${formatMoney(shippingCHF)}`;

            // Items compat:
            // - novo: line_items (Stripe) => array com description, quantity, amount_total (cents)
            // - antigo: items => array com title/name, quantity, price (CHF)
            const stripeLineItems = (order as any).line_items;
            const legacyItems = (order as any).items;

            const hasStripeLineItems =
              Array.isArray(stripeLineItems) && stripeLineItems.length > 0;
            const hasLegacyItems =
              Array.isArray(legacyItems) && legacyItems.length > 0;

            return (
              <div
                key={order.id}
                className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-2 mb-2">
                  <div className="space-y-0.5">
                    <div className="font-semibold">
                      {currency} {formatMoney(totalCHF)}
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
                    <div className="text-xs text-neutral-500 break-all">{ref}</div>
                  )}
                </div>

                {hasStripeLineItems ? (
                  <ul className="space-y-1">
                    {(stripeLineItems as any[]).map((li, idx) => {
                      const title = li?.description ?? "Artikel";
                      const qty = typeof li?.quantity === "number" ? li.quantity : null;

                      const lineTotalCHF = toCHFfromCents(li?.amount_total);
                      const unitAmountCents = li?.price?.unit_amount;
                      const unitCHF = toCHFfromCents(
                        typeof unitAmountCents === "number" ? unitAmountCents : null
                      );

                      return (
                        <li key={idx}>
                          <span className="font-medium">{title}</span>

                          {qty !== null && unitCHF !== null ? (
                            <span className="text-neutral-600">
                              {` – ${qty} × ${currency} ${formatMoney(unitCHF)}`}
                            </span>
                          ) : qty !== null ? (
                            <span className="text-neutral-600">{` – Menge: ${qty}`}</span>
                          ) : null}

                          {lineTotalCHF !== null ? (
                            <span className="text-neutral-500">
                              {` (Total: ${currency} ${formatMoney(lineTotalCHF)})`}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : hasLegacyItems ? (
                  <ul className="space-y-1">
                    {(legacyItems as any[]).map((item, idx) => {
                      const title = item.title ?? item.name ?? "Artikel";
                      const qty = typeof item.quantity === "number" ? item.quantity : null;
                      const price = typeof item.price === "number" ? item.price : null;

                      return (
                        <li key={idx}>
                          <span className="font-medium">{title}</span>
                          {qty !== null && price !== null ? (
                            <span className="text-neutral-600">
                              {` – ${qty} × ${currency} ${formatMoney(price)}`}
                            </span>
                          ) : qty !== null ? (
                            <span className="text-neutral-600">{` – Menge: ${qty}`}</span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-neutral-600">
                    Keine Artikelinformationen verfügbar.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
