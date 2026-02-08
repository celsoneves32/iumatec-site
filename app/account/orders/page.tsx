// app/account/orders/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

function centsToCHF(cents: number) {
  const value = (cents / 100).toFixed(2);
  return new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF" }).format(
    Number(value)
  );
}

export default async function OrdersPage() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  if (!user) redirect("/login");

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Meine Bestellungen</h1>
        <Link className="text-sm underline" href="/account">
          Zurück
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-lg border p-4 text-sm text-neutral-700">
          Noch keine Bestellungen.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="rounded-xl border p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-neutral-600">
                  {new Date(o.createdAt).toLocaleString("de-CH")}
                </div>
                <div className="text-sm font-medium">{o.status}</div>
              </div>

              <div className="text-lg font-semibold">{centsToCHF(o.total)}</div>

              <div className="text-sm text-neutral-700">
                {o.items.map((it) => (
                  <div key={it.id} className="flex justify-between">
                    <span>
                      {it.quantity}× {it.title}
                    </span>
                    <span>{centsToCHF(it.unitPrice * it.quantity)}</span>
                  </div>
                ))}
              </div>

              {(o.shopifyOrderId || o.shopifyCheckoutId) && (
                <div className="text-xs text-neutral-500">
                  Shopify: {o.shopifyOrderId ?? o.shopifyCheckoutId}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
