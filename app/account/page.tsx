"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";

export default function AccountPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?from=/account");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10">
        <p className="text-sm text-neutral-600">Konto wird geladen…</p>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold mb-1">Mein Konto</h1>
        <p className="text-sm text-neutral-600">
          Angemeldet als{" "}
          <span className="font-medium">{user.email}</span>
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/account/orders"
          className="rounded-2xl border border-neutral-200 bg-white p-4 hover:border-red-500 hover:shadow-sm transition"
        >
          <h2 className="text-sm font-semibold mb-1">Bestellungen</h2>
          <p className="text-xs text-neutral-600">
            Übersicht deiner bisherigen Bestellungen.
          </p>
        </Link>

        <Link
          href="/favoriten"
          className="rounded-2xl border border-neutral-200 bg-white p-4 hover:border-red-500 hover:shadow-sm transition"
        >
          <h2 className="text-sm font-semibold mb-1">Favoriten</h2>
          <p className="text-xs text-neutral-600">
            Produkte, die du dir gemerkt hast.
          </p>
        </Link>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold mb-1">Kundendaten</h2>
          <p className="text-xs text-neutral-600">
            Dieser Bereich wird später für Adressen, Rechnungsdaten usw.
            verwendet.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold mb-1">Sicherheit</h2>
          <p className="text-xs text-neutral-600">
            Passwort-Änderung und Kontosicherheit werden hier noch ergänzt.
          </p>
        </div>
      </section>
    </main>
  );
}
