// app/checkout/success/page.tsx
import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <main className="min-h-[70vh] bg-neutral-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white border border-emerald-200 rounded-2xl p-8">
          <h1 className="text-2xl font-semibold text-emerald-700 mb-2">
            Vielen Dank für deine Bestellung!
          </h1>
          <p className="text-sm text-neutral-700 mb-4">
            Deine Zahlung wurde erfolgreich abgeschlossen. Du erhältst in Kürze
            eine Bestellbestätigung per E-Mail.
          </p>
          <p className="text-xs text-neutral-500 mb-6">
            Falls du Fragen zu deiner Bestellung hast, kannst du uns jederzeit
            kontaktieren. Bitte halte dazu deine Bestellnummer bereit.
          </p>

          <div className="flex flex-wrap gap-3">
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
              Weiter einkaufen
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
