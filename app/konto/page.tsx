export default function KontoPage() {
  const ACCOUNT_URL =
    process.env.NEXT_PUBLIC_SHOPIFY_CUSTOMER_ACCOUNTS_URL;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">Mein Konto</h1>

      <div className="grid gap-4">
        <a
          href={ACCOUNT_URL}
          className="rounded-xl border p-4 hover:bg-neutral-50"
        >
          Konto Übersicht
        </a>

        <a
          href={`${ACCOUNT_URL}/orders`}
          className="rounded-xl border p-4 hover:bg-neutral-50"
        >
          Bestellungen
        </a>

        <a
          href={`${ACCOUNT_URL}/addresses`}
          className="rounded-xl border p-4 hover:bg-neutral-50"
        >
          Adressen
        </a>
      </div>
    </main>
  );
}