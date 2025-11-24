import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold mb-4">
        Vielen Dank für deine Bestellung! 🎉
      </h1>
      <p className="mb-6 text-neutral-600">
        Deine Zahlung war erfolgreich. Du erhältst in Kürze eine Bestellbestätigung per E-Mail.
      </p>
      <Link
        href="/"
        className="inline-flex items-center px-4 py-2 rounded-md bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
      >
        Zurück zur Startseite
      </Link>
    </main>
  );
}
