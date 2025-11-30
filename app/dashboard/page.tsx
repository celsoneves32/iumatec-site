"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Se não estiver logado, redireciona para login
  useEffect(() => {
    if (!user) {
      router.replace("/login?from=/dashboard");
    }
  }, [user, router]);

  if (!user) {
    // enquanto redireciona, não mostra nada
    return null;
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-1">
        Hallo, {user.name || "Kunde"}
      </h1>
      <p className="text-sm text-neutral-600 mb-8">
        Willkommen in deinem IUMATEC-Konto. Hier werden später Bestellungen,
        Rechnungen und Lieferadressen erscheinen.
      </p>

      <div className="grid gap-6 md:grid-cols-3">
        <section className="rounded-2xl border border-neutral-200 p-4">
          <h2 className="text-sm font-semibold mb-1">Bestellungen</h2>
          <p className="text-xs text-neutral-500 mb-3">
            Noch keine Bestellungen. Später siehst du hier deine Käufe.
          </p>
          <button className="text-xs font-semibold text-red-600 hover:underline">
            Jetzt einkaufen
          </button>
        </section>

        <section className="rounded-2xl border border-neutral-200 p-4">
          <h2 className="text-sm font-semibold mb-1">Rechnungsadresse</h2>
          <p className="text-xs text-neutral-500">
            Placeholder-Inhalt – wird mit echten Daten aus dem Shop befüllt.
          </p>
        </section>

        <section className="rounded-2xl border border-neutral-200 p-4">
          <h2 className="text-sm font-semibold mb-1">Konto &amp; Sicherheit</h2>
          <p className="text-xs text-neutral-500">E-Mail: {user.email}</p>
        </section>
      </div>
    </main>
  );
}
