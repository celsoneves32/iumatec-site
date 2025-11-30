// app/dashboard/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?from=/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return null;
  }

  if (!session?.user) {
    return null;
  }

  const user = session.user;
  const firstName =
    user.name?.split(" ")[0] || user.email?.split("@")[0] || "Kunde";

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header de conta */}
      <section className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-1">
            Hallo, {firstName}
          </h1>
          <p className="text-sm text-neutral-600">
            Willkommen in deinem IUMATEC-Konto. Hier verwaltest du
            Bestellungen, Adressen und deine persönlichen Daten.
          </p>
        </div>
        <div className="text-xs text-neutral-500">
          Eingeloggt als{" "}
          <span className="font-medium text-neutral-800">
            {user.email}
          </span>
        </div>
      </section>

      {/* 3 Kacheln oben */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold mb-1">Bestellungen</h2>
          <p className="text-xs text-neutral-600 mb-3">
            Noch keine Bestellungen. Sobald du etwas kaufst, erscheinen
            deine Bestellungen hier.
          </p>
          <Link
            href="/produkte"
            className="inline-block px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition"
          >
            Jetzt einkaufen
          </Link>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold mb-1">Rechnungsadresse</h2>
          <p className="text-xs text-neutral-600">
            Hier werden später deine Rechnungs- und Lieferadressen
            angezeigt und können bearbeitet werden.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold mb-1">Konto &amp; Sicherheit</h2>
          <p className="text-xs text-neutral-600 mb-2">
            Verwalte Login-Daten, Sicherheit und Kommunikation.
          </p>
          <ul className="text-xs text-neutral-600 space-y-1">
            <li>
              <span className="font-semibold">E-Mail:&nbsp;</span>
              {user.email}
            </li>
            <li>
              <span className="font-semibold">Name:&nbsp;</span>
              {user.name || "Noch nicht hinterlegt"}
            </li>
          </ul>
        </div>
      </section>

      {/* 2 colunas de informação extra */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3">
          <h2 className="text-sm font-semibold">Persönliche Daten</h2>
          <p className="text-xs text-neutral-600">
            In einem späteren Schritt kannst du hier deine persönlichen
            Daten direkt bearbeiten (Adresse, Telefonnummer, etc.).
          </p>
          <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-xs text-neutral-700">
            <dt className="font-semibold">Name</dt>
            <dd>{user.name || "Noch nicht hinterlegt"}</dd>
            <dt className="font-semibold">E-Mail</dt>
            <dd>{user.email}</dd>
            <dt className="font-semibold">Sprache</dt>
            <dd>Deutsch (Schweiz)</dd>
            <dt className="font-semibold">Newsletter</dt>
            <dd>Noch nicht abonniert</dd>
          </dl>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3">
          <h2 className="text-sm font-semibold">Kommunikation</h2>
          <p className="text-xs text-neutral-600">
            Hier kannst du später auswählen, welche Informationen du von
            IUMATEC erhalten möchtest (Angebote, Aktionen, Bestellstatus).
          </p>

          <ul className="text-xs text-neutral-700 space-y-2">
            <li>• E-Mail-Benachrichtigungen zu Bestellungen</li>
            <li>• Exklusive Aktionen &amp; Rabatte</li>
            <li>• Produktempfehlungen passend zu deinen Käufen</li>
          </ul>

          <button
            type="button"
            className="mt-2 inline-block px-4 py-2 rounded-xl border border-neutral-300 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 transition"
          >
            Einstellungen später bearbeiten
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold mb-2">Bestellhistorie</h2>
        <p className="text-xs text-neutral-600 mb-3">
          Hier wird künftig eine Übersicht deiner letzten Bestellungen
          angezeigt – inklusive Rechnungen und Sendungsverfolgung.
        </p>
        <p className="text-xs text-neutral-500 italic">
          Aktuell sind noch keine Bestellungen vorhanden.
        </p>
      </section>
    </main>
  );
}
