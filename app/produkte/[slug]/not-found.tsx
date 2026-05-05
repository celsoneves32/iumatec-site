import Link from "next/link";

export default function ProductNotFound() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-20 text-center">
      <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900">
        Produkt nicht gefunden
      </h1>
      <p className="mt-4 text-neutral-600">
        Dieses Produkt existiert nicht oder wurde entfernt.
      </p>

      <div className="mt-8">
        <Link
          href="/produkte"
          className="rounded-2xl bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          Zurück zu den Produkten
        </Link>
      </div>
    </main>
  );
}