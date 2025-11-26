import Link from "next/link";

export const metadata = {
  title: "Bestellung erfolgreich | IUMATEC",
  description: "Vielen Dank für Ihre Bestellung bei IUMATEC.",
};

export default function CheckoutSuccessPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <div className="rounded-3xl border border-green-200 bg-green-50 px-6 py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-green-800">
          Vielen Dank für Ihre Bestellung!
        </h1>
        <p className="mt-3 text-sm md:text-base text-green-900/80">
          Ihre Zahlung wurde erfolgreich verarbeitet. Sie erhalten in Kürze eine
          Bestätigungs-E-Mail von Stripe / IUMATEC.
        </p>

        <ul className="mt-4 text-sm text-green-900/80 list-disc list-inside space-y-1">
          <li>
            Die Bestellung wird in unserem System gespeichert und verarbeitet.
          </li>
          <li>
            Bei Fragen können Sie uns jederzeit unter{" "}
            <a
              href="mailto:support@iumatec.ch"
              className="underline font-medium"
            >
              support@iumatec.ch
            </a>{" "}
            kontaktieren.
          </li>
        </ul>

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
      </div>
    </main>
  );
}
