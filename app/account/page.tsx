"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseClient";

type SupabaseUser = {
  id: string;
  email?: string;
};

export default function AccountPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabaseBrowser.auth.getUser();
      setUser(data.user as SupabaseUser | null);
      setLoading(false);
    }
    loadUser();
  }, []);

  async function handleLogout() {
    await supabaseBrowser.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <main className="max-w-md mx-auto px-4 py-10">
        <p className="text-sm text-neutral-600">Lade Konto...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="max-w-md mx-auto px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold">Mein Konto</h1>
        <p className="text-sm text-neutral-600">
          Sie sind nicht angemeldet. Bitte melden Sie sich an oder erstellen
          Sie ein Konto.
        </p>
        <div className="flex gap-3">
          <Link
            href="/login?redirectTo=/account"
            className="flex-1 text-center rounded-full bg-red-600 text-white text-sm font-semibold py-2.5 hover:bg-red-700"
          >
            Anmelden
          </Link>
          <Link
            href="/register"
            className="flex-1 text-center rounded-full border border-red-600 text-red-600 text-sm font-semibold py-2.5 hover:bg-red-50"
          >
            Registrieren
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Mein Konto</h1>
          <p className="text-sm text-neutral-600">
            Angemeldet als <span className="font-medium">{user.email}</span>
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:border-red-600 hover:text-red-600"
        >
          Abmelden
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/account/orders"
          className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm hover:border-red-600 hover:shadow-sm"
        >
          <h2 className="font-semibold mb-1">Meine Bestellungen</h2>
          <p className="text-neutral-600">
            Übersicht über alle Online-Bestellungen bei IUMATEC.
          </p>
        </Link>
      </section>
    </main>
  );
}
