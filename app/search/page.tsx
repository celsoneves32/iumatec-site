// app/search/page.tsx
import Link from "next/link";
import Image from "next/image";
import { searchProducts } from "@/lib/shopify-search";

type SearchPageProps = {
  searchParams?: {
    q?: string;
  };
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const q = searchParams?.q?.trim() || "";
  const { products, filters } = await searchProducts({ q, first: 24 });

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          Suche
        </h1>
        <p className="mt-2 text-neutral-600">
          Ergebnisse für: <span className="font-semibold">{q || "alle Produkte"}</span>
        </p>
      </div>

      <form action="/search" className="mb-8 flex gap-3">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="MacBook, ASUS, SSD, Logitech..."
          className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-neutral-500"
        />
        <button
          type="submit"
          className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-dark transition"
        >
          Suchen
        </button>
      </form>

      {filters.length > 0 ? (
        <div className="mb-8 flex flex-wrap gap-2">
          {filters.slice(0, 8).map((filter) => (
            <div
              key={filter.id}
              className="rounded-full border border-neutral-300 px-3 py-1 text-xs text-neutral-700"
            >
              {filter.label}
            </div>
          ))}
        </div>
      ) : null}

      {products.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-neutral-600">
          Keine Produkte gefunden.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => {
            const price = product.priceRange.minVariantPrice;

            return (
              <Link
                key={product.id}
                href={`/products/${product.handle}`}
                className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white transition hover:shadow-md"
              >
                <div className="relative aspect-square bg-neutral-100">
                  {product.featuredImage?.url ? (
                    <Image
                      src={product.featuredImage.url}
                      alt={product.featuredImage.altText || product.title}
                      fill
                      className="object-contain p-4 transition duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                      Kein Bild
                    </div>
                  )}
                </div>

                <div className="p-4">
                  {product.vendor ? (
                    <div className="mb-1 text-xs text-neutral-500">
                      {product.vendor}
                    </div>
                  ) : null}

                  <h2 className="line-clamp-2 text-sm font-medium text-neutral-900">
                    {product.title}
                  </h2>

                  <div className="mt-3 text-base font-semibold text-neutral-900">
                    {Number(price.amount).toFixed(2)} {price.currencyCode}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
