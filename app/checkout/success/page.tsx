import Link from "next/link";

export const metadata = {
  title: "Bestellung erfolgreich | IUMATEC",
  description: "Vielen Dank für Ihre Bestellung bei IUMATEC.",
};

export default function CheckoutSuccessPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <div className="rounded-3xl border border-green-200 bg-gradient-to-br from-green-50 to-green-100 px-6 py-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white text-xl">
            ✓
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-green-900">
              Vielen Dank für Ihre Bestellung!
            </h1>
            <p className="mt-1 text-sm md:text-base text-green-900/80">
              Ihre Zahlung wurde erfolgreich verarbeitet.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2 text-sm md:text-base text-green-950/80">
          <p>
            Sie erhalten in Kürze eine Bestätigungs-E-Mail mit allen Details zu
            Ihrer Bestellung.
          </p>
          <p>
            Bei Fragen erreichen Sie uns unter{" "}
            <a
              href="mailto:support@iumatec.ch"
              className="underline font-medium"
            >
              support@iumatec.ch
            </a>
            .
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/produkte"
            className="inline-flex items-center rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            Weiter einkaufen
          </Link>
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-red-600 px-5 py-2.5 text-sm font-semibold text-red-700 bg-white hover:bg-red-50"
          >
            Zur Startseite
          </Link>
        </div>

        <p className="mt-4 text-xs text-green-900/70">
          Hinweis: Diese Seite kann als Bestellbestätigung für Ihre Kunden
          verwendet werden. Die Details der Bestellung werden im internen
          Admin-Bereich gespeichert.
        </p>
      </div>
    </main>
  );
}
