// app/search/page.tsx
import Link from "next/link";
import Image from "next/image";
import {
  extractFilterOptions,
  filterProductsLocally,
  searchProducts,
} from "@/lib/shopify-search";

type SearchPageProps = {
  searchParams?: {
    q?: string;
    vendor?: string;
    productType?: string;
    minPrice?: string;
    maxPrice?: string;
  };
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const q = searchParams?.q?.trim() || "";
  const vendor = searchParams?.vendor?.trim() || "";
  const productType = searchParams?.productType?.trim() || "";
  const minPrice = searchParams?.minPrice ? Number(searchParams.minPrice) : undefined;
  const maxPrice = searchParams?.maxPrice ? Number(searchParams.maxPrice) : undefined;

  const { products } = await searchProducts({ q, first: 50 });

  const filteredProducts = filterProductsLocally(products, {
    vendor: vendor || undefined,
    productType: productType || undefined,
    minPrice,
    maxPrice,
  });

  const { vendors, productTypes } = extractFilterOptions(products);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          Suche
        </h1>
        <p className="mt-2 text-neutral-600">
          Ergebnisse für:{" "}
          <span className="font-semibold">{q || "alle Produkte"}</span>
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

      <div className="grid gap-8 lg:grid-cols-[280px,minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className="rounded-2xl border border-neutral-200 bg-white p-5 h-fit">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-neutral-900">Filter</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Verfeinere deine Suche
            </p>
          </div>

          <form action="/search" className="space-y-5">
            <input type="hidden" name="q" value={q} />

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-800">
                Marke
              </label>
              <select
                name="vendor"
                defaultValue={vendor}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
              >
                <option value="">Alle Marken</option>
                {vendors.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-800">
                Produkttyp
              </label>
              <select
                name="productType"
                defaultValue={productType}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
              >
                <option value="">Alle Typen</option>
                {productTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-800">
                Mindestpreis
              </label>
              <input
                type="number"
                name="minPrice"
                defaultValue={searchParams?.minPrice || ""}
                placeholder="z.B. 100"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-800">
                Höchstpreis
              </label>
              <input
                type="number"
                name="maxPrice"
                defaultValue={searchParams?.maxPrice || ""}
                placeholder="z.B. 1500"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="submit"
                className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark transition"
              >
                Anwenden
              </button>

              <Link
                href={q ? `/search?q=${encodeURIComponent(q)}` : "/search"}
                className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-center hover:bg-neutral-50 transition"
              >
                Reset
              </Link>
            </div>
          </form>
        </aside>

        {/* Results */}
        <section>
          <div className="mb-5 flex items-center justify-between">
            <div className="text-sm text-neutral-600">
              {filteredProducts.length} Produkte gefunden
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-neutral-600">
              Keine Produkte gefunden.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => {
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

                      {product.productType ? (
                        <div className="mt-2 text-xs text-neutral-500">
                          {product.productType}
                        </div>
                      ) : null}

                      <div className="mt-3 text-base font-semibold text-neutral-900">
                        {Number(price.amount).toFixed(2)} {price.currencyCode}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
