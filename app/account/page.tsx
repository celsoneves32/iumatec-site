// app/account/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { prisma } from "@/lib/prisma"; // (assumindo que tens prisma client)

export const dynamic = "force-dynamic";

export default async function AccountPage() {
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
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Mein Konto</h1>

      <div className="mt-4 rounded-lg border p-4">
        <p className="text-sm text-gray-500">Eingeloggt als:</p>
        <p className="mt-1 font-medium">{user.email}</p>
        <p className="mt-2 text-xs text-gray-500">User ID: {user.id}</p>
      </div>

      <h2 className="mt-8 text-xl font-semibold">Meine Bestellungen</h2>

      {orders.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">Noch keine Bestellungen.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="rounded-lg border p-4">
              <div className="flex justify-between text-sm">
                <span>#{o.id}</span>
                <span>{new Date(o.createdAt).toLocaleString("de-CH")}</span>
              </div>
              <div className="mt-2 text-sm">
                Status: <b>{o.status}</b> — Total: <b>{o.total / 100} {o.currency}</b>
              </div>
              <ul className="mt-2 text-sm text-gray-600">
                {o.items.map((it) => (
                  <li key={it.id}>
                    {it.quantity}× {it.title} ({it.price / 100} {o.currency})
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
