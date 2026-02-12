// app/search/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Suche – IUMATEC",
  description: "Produkte im Shop durchsuchen.",
};

export default function Page({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const q = (searchParams?.q ?? "").toString().trim();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Suche</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Produkte im Shop durchsuchen.
          </p>
        </div>

        <Link
          href="/products"
          className="hidden sm:inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 transition"
        >
          Alle Produkte
        </Link>
      </div>

      {/* Search box */}
      <form action="/search" method="get" role="search" aria-label="Suche">
        <div className="rounded-2xl border bg-white p-3 flex items-center gap-2">
          <span className="text-lg" aria-hidden>
            🔎
          </span>

          <input
            name="q"
            defaultValue={q}
            placeholder="Produktsuche…"
            className="w-full bg-transparent outline-none text-sm md:text-base"
            autoComplete="off"
          />

          <button
            type="submit"
            className="rounded-xl bg-black px-4 py-2 text-white text-sm hover:opacity-90 transition"
          >
            Suchen
          </button>
        </div>

        {/* Quick links */}
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link
            href="/collections"
            className="rounded-xl border px-3 py-2 hover:bg-neutral-50 transition"
          >
            Kategorien
          </Link>
          <Link
            href="/products"
            className="rounded-xl border px-3 py-2 hover:bg-neutral-50 transition"
          >
            Neuheiten
          </Link>
          <Link
            href="/aktionen"
            className="rounded-xl border px-3 py-2 hover:bg-neutral-50 transition"
          >
            Aktionen
          </Link>
        </div>
      </form>

      {/* Results */}
      <section className="rounded-2xl border bg-white p-5">
        {q ? (
          <div className="space-y-2">
            <p className="text-sm text-neutral-700">
              Ergebnisse für: <span className="font-semibold">{q}</span>
            </p>

            {/* Placeholder: aqui depois ligamos ao Shopify search */}
            <div className="rounded-xl border border-dashed p-4 text-sm text-neutral-600">
              Ultra premium (próximo passo): buscar resultados reais no Shopify Storefront API
              e mostrar grid com AddToCart + quick view.
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-neutral-600">
              Gib oben einen Suchbegriff ein.
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <Link
                href="/collections/smartphones"
                className="rounded-2xl border p-4 hover:bg-neutral-50 transition"
              >
                <div className="font-medium">Smartphones</div>
                <div className="text-sm text-neutral-600">Entdecken</div>
              </Link>
              <Link
                href="/collections/laptops"
                className="rounded-2xl border p-4 hover:bg-neutral-50 transition"
              >
                <div className="font-medium">Laptops</div>
                <div className="text-sm text-neutral-600">Entdecken</div>
              </Link>
              <Link
                href="/collections/accessories"
                className="rounded-2xl border p-4 hover:bg-neutral-50 transition"
              >
                <div className="font-medium">Acessórios</div>
                <div className="text-sm text-neutral-600">Entdecken</div>
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Footer note */}
      <p className="text-xs text-neutral-500">
        Tip: podes escrever e carregar Enter. Em breve: auto-suggest + resultados reais.
      </p>
    </main>
  );
}
