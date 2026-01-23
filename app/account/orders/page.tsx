// app/account/orders/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

type OrderRow = {
  id: string;
  stripe_session_id: string | null;
  shopify_order_id: string | null;
  customer_email: string | null;
  total_amount: number | null;
  currency: string | null;
  items: any;
  created_at: string;
};

export default async function MyOrdersPage() {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.auth.getUser();
  const user = data?.user;

  if (error || !user) {
    redirect("/login?from=/account/orders");
  }

  // Importante: com RLS + policy (auth.uid() = user_id),
  // mesmo sem filtro extra, só vêm as do próprio user.
  // Ainda assim, eu gosto de filtrar explicitamente.
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select(
      "id,stripe_session_id,shopify_order_id,customer_email,total_amount,currency,items,created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (ordersError) {
    // Se preferires, podes mostrar UI bonita. Aqui mantemos simples.
    return (
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Meine Bestellungen</h1>
            <p className="text-sm text-neutral-600">
              Für Konto: <span className="font-medium">{user.email}</span>
            </p>
          </div>
          <Link href="/account" className="text-xs text-red-600 hover:underline">
            ← Zurück zum Konto
          </Link>
        </header>
        <p className="text-sm text-red-600">
          Fehler beim Laden der Bestellungen: {ordersError.message}
        </p>
      </main>
    );
  }

  const safeOrders = (orders ?? []) as OrderRow[];

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Meine Bestellungen</h1>
          <p className="text-sm text-neutral-600">
            Für Konto: <span className="font-medium">{user.email}</span>
          </p>
        </div>
        <Link href="/account" className="text-xs text-red-600 hover:underline">
          ← Zurück zum Konto
        </Link>
      </header>

      {safeOrders.length === 0 ? (
        <p className="text-sm text-neutral-600">
          Sie haben noch keine Bestellungen.
        </p>
      ) : (
        <div className="space-y-4">
          {safeOrders.map((order) => {
            const items: any[] = Array.isArray(order.items) ? order.items : [];

            return (
              <div
                key={order.id}
                className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-2 mb-2">
                  <div>
                    <div className="font-semibold">
                      {order.currency?.toUpperCase() ?? "CHF"}{" "}
                      {order.total_amount?.toFixed(2) ?? "-"}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {new Date(order.created_at).toLocaleString("de-CH")}
                    </div>
                  </div>

                  <div className="text-xs text-neutral-500 space-y-1 text-right">
                    {order.stripe_session_id && (
                      <div className="break-all">
                        Stripe: {order.stripe_session_id}
                      </div>
                    )}
                    {order.shopify_order_id && (
                      <div className="break-all">
                        Shopify: {order.shopify_order_id}
                      </div>
                    )}
                  </div>
                </div>

                <ul className="space-y-1">
                  {items.map((item, idx) => (
                    <li key={idx}>
                      <span className="font-medium">
                        {item.title ?? "Artikel"}
                      </span>
                      {typeof item.quantity === "number" &&
                        typeof item.price === "number" && (
                          <span className="text-neutral-600">
                            {` – ${item.quantity} × CHF ${item.price.toFixed(
                              2
                            )}`}
                          </span>
                        )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
