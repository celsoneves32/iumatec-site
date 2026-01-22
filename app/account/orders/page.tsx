import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

type OrderRow = {
  id: string;
  stripe_session_id: string;
  customer_email: string | null;
  total_amount: number | null;
  currency: string | null;
  items: any;
  created_at: string;
};

export default async function MyOrdersPage() {
  const supabase = createSupabaseServerClient();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData?.user;

  if (authError || !user) {
    redirect("/login?from=/account/orders");
  }

  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    // opcional: podes logar/mostrar mensagem amigável
  }

  const list = (orders ?? []) as OrderRow[];

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

      {list.length === 0 ? (
        <p className="text-sm text-neutral-600">
          Sie haben noch keine Bestellungen.
        </p>
      ) : (
        <div className="space-y-4">
          {list.map((order) => {
            const items: any[] = Array.isArray(order.items) ? order.items : [];

            return (
              <div
                key={order.id}
                className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-2 mb-2">
                  <div>
                    <div className="font-semibold">
                      CHF {order.total_amount?.toFixed(2) ?? "-"}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {new Date(order.created_at).toLocaleString("de-CH")}
                    </div>
                  </div>
                  <div className="text-xs text-neutral-500 break-all">
                    Session: {order.stripe_session_id}
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
                            {` – ${item.quantity} × CHF ${item.price.toFixed(2)}`}
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
