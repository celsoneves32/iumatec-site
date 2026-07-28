const ACCOUNT_URL =
  process.env.NEXT_PUBLIC_SHOPIFY_CUSTOMER_ACCOUNTS_URL || "";

export default function KontoPage() {
  if (!ACCOUNT_URL) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-bold text-neutral-950">
          Mein Konto
        </h1>

        <p className="mt-4 text-neutral-600">
          Der Kundenkonto-Link ist aktuell nicht konfiguriert.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold text-neutral-950">
        Mein Konto
      </h1>

      <div className="grid gap-4">
        <a
          href={ACCOUNT_URL}
          className="rounded-xl border p-4 font-semibold hover:bg-neutral-50"
        >
          Konto Übersicht
        </a>

        <a
          href={`${ACCOUNT_URL.replace(/\/$/, "")}/orders`}
          className="rounded-xl border p-4 font-semibold hover:bg-neutral-50"
        >
          Bestellungen
        </a>

        <a
          href={`${ACCOUNT_URL.replace(/\/$/, "")}/addresses`}
          className="rounded-xl border p-4 font-semibold hover:bg-neutral-50"
        >
          Adressen
        </a>
      </div>
    </main>
  );
}