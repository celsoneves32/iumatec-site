import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold mb-4">Checkout abgebrochen</h1>
      <p className="mb-6 text-neutral-600">
        Deine Zahlung wurde nicht abgeschlossen. Du kannst es jederzeit erneut versuchen.
      </p>
      <Link
        href="/cart"
        className="inline-flex items-center px-4 py-2 rounded-md bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
      >
        Zurück zum Warenkorb
      </Link>
    </main>
  );
}
