// app/not-found.tsx
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="min-h-[70vh] bg-neutral-50">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-neutral-400 uppercase mb-3">
            Fehler 404
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold mb-3">
            Seite nicht gefunden
          </h1>
          <p className="text-sm text-neutral-600 mb-6">
            Die gesuchte Seite ist nicht verfügbar oder wurde verschoben. Bitte
            überprüfe die Adresse oder gehe zurück zur Startseite.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
            >
              Zur Startseite
            </Link>
            <Link
              href="/produkte"
              className="inline-flex items-center justify-center rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
            >
              Alle Produkte anzeigen
            </Link>
          </div>

          <p className="mt-6 text-[11px] text-neutral-500">
            Wenn du glaubst, dass es sich um einen Fehler handelt, kontaktiere
            uns bitte mit einer kurzen Beschreibung des Problems.
          </p>
        </div>
      </div>
    </main>
  );
}
