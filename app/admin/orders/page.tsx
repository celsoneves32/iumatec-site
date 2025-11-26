import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: number;
  stripe_session_id: string;
  customer_email: string | null;
  total_amount: number | null;
  currency: string | null;
  items: any; // [{ id, title, price, quantity }, ...]
  created_at: string;
};

function getSupabaseServerClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlen.");
  }

  return createClient(url, serviceKey);
}

async function fetchOrders(): Promise<OrderRow[]> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Fehler beim Laden der Bestellungen:", error);
    return [];
  }

  return (data as OrderRow[]) ?? [];
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const requiredToken = process.env.ADMIN_DASHBOARD_TOKEN;

  if (requiredToken && searchParams.token !== requiredToken) {
    return (
      <main className="max-w-xl mx-auto px-4 py-16">
        <h1 className="text-2xl font-semibold mb-4">Admin Login</h1>
        <p className="text-sm text-neutral-600 mb-2">
          Zugriff verweigert. Fügen Sie den korrekten{" "}
          <code className="bg-neutral-100 px-1 rounded">
            ?token=...
          </code>{" "}
          Parameter zur URL hinzu.
        </p>
        <p className="text-xs text-neutral-500">
          Beispiel:{" "}
          <code className="bg-neutral-100 px-1 rounded">
            /admin/orders?token=IHR_ADMIN_TOKEN
          </code>
        </p>
      </main>
    );
  }

  const orders = await fetchOrders();

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-6">Bestellungen (intern)</h1>

      {orders.length === 0 ? (
        <p className="text-sm text-neutral-600">
          Noch keine Bestellungen vorhanden.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-neutral-200">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Datum</th>
                <th className="px-3 py-2 text-left font-semibold">E-Mail</th>
                <th className="px-3 py-2 text-left font-semibold">Betrag</th>
                <th className="px-3 py-2 text-left font-semibold">Artikel</th>
                <th className="px-3 py-2 text-left font-semibold">Stripe-Session</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const items: any[] = Array.isArray(order.items)
                  ? order.items
                  : [];

                return (
                  <tr
                    key={order.id}
                    className="border-t border-neutral-200 hover:bg-neutral-50/60"
                  >
                    <td className="px-3 py-2 align-top">
                      {new Date(order.created_at).toLocaleString("de-CH")}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {order.customer_email ?? "-"}
                    </td>
                    <td className="px-3 py-2 align-top whitespace-nowrap">
                      {order.total_amount != null ? (
                        <>
                          CHF{" "}
                          {order.total_amount.toFixed(2)}
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <ul className="space-y-1">
                        {items.map((item, idx) => (
                          <li key={idx}>
                            <span className="font-medium">
                              {item.title ?? "Unbekannter Artikel"}
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
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-neutral-500">
                      {order.stripe_session_id}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-neutral-500">
        Zeigt die letzten 50 Bestellungen aus der <code>orders</code>-Tabelle
        (Supabase).
      </p>
    </main>
  );
}
