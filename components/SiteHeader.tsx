"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import type { Session } from "@supabase/supabase-js";

type OrderRow = {
  id: string;
  created_at: string;
  total_amount: number | null;
  currency: string | null;
  items: any;
};

export default function AccountPage() {
  const supabase = getSupabaseBrowserClient();

  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Carregar sessão
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoadingSession(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // Carregar encomendas do utilizador
  useEffect(() => {
    if (!session?.user?.email) {
      setOrders([]);
      return;
    }

    const loadOrders = async () => {
      setOrdersLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("id, created_at, total_amount, currency, items")
        .eq("customer_email", session.user.email)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro a carregar encomendas:", error);
        setErrorMsg("Fehler beim Laden der Bestellungen.");
      } else {
        setOrders((data as OrderRow[]) ?? []);
      }
      setOrdersLoading(false);
    };

    loadOrders();
  }, [session, supabase]);

  async function handleSignUp() {
    setErrorMsg(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setErrorMsg(error.message);
    }
  }

  async function handleSignIn() {
    setErrorMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorMsg(error.message);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setOrders([]);
  }

  if (loadingSession) {
    return (
      <main className="max-w-md mx-auto px-4 py-16">
        <p>Wird geladen…</p>
      </main>
    );
  }

  // Se não está logado → mostrar login/registro simples
  if (!session) {
    return (
      <main className="max-w-md mx-auto px-4 py-16 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Mein Konto</h1>
          <p className="text-sm text-neutral-500">
            Melden Sie sich an, um Ihre Bestellungen zu sehen.
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="space-y-3">
          <label className="block text-sm font-medium">
            E-Mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm font-medium">
            Passwort
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
          </label>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleSignIn}
              className="flex-1 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Login
            </button>
            <button
              type="button"
              onClick={handleSignUp}
              className="flex-1 rounded-full border border-red-600 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              Registrieren
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Utilizador logado → mostrar encomendas
  return (
    <main className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Mein Konto</h1>
          <p className="text-sm text-neutral-500">
            Eingeloggt als <span className="font-medium">{session.user.email}</span>
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-medium hover:bg-neutral-100"
        >
          Logout
        </button>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Meine Bestellungen</h2>

        {ordersLoading ? (
          <p className="text-sm text-neutral-500">Bestellungen werden geladen…</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Sie haben noch keine Bestellungen.
          </p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const date = new Date(order.created_at);
              const items: any[] = Array.isArray(order.items) ? order.items : [];

              return (
                <div
                  key={order.id}
                  className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">
                      {date.toLocaleDateString("de-CH")}{" "}
                      {date.toLocaleTimeString("de-CH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="font-semibold">
                      {order.total_amount != null
                        ? `CHF ${order.total_amount.toFixed(2)}`
                        : ""}
                    </span>
                  </div>
                  <ul className="text-sm text-neutral-700 list-disc pl-5 space-y-1">
                    {items.map((item, i) => (
                      <li key={i}>
                        {item.title ?? "Artikel"}{" "}
                        {item.quantity && item.price && (
                          <span className="text-neutral-500">
                            – {item.quantity} × CHF {item.price.toFixed(2)}
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
      </section>
    </main>
  );
}
