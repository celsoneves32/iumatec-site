import Link from "next/link"
import { getIumatecCategories, searchIumatecProducts } from "@/lib/iumatec"

type ProduktePageProps = {
  searchParams?: {
    q?: string
    category?: string
    subcategory?: string
  }
}

export default function ProduktePage({ searchParams }: ProduktePageProps) {
  const q = searchParams?.q || ""
  const category = searchParams?.category || ""
  const subcategory = searchParams?.subcategory || ""

  const products = searchIumatecProducts({
    q,
    category,
    subcategory,
    limit: 120
  })

  const categories = getIumatecCategories()

  const activeCategory = categories.find((c) => c.name === category)

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Produkte</h1>
        <p className="mt-2 text-neutral-600">
          {products.length} Produkte gefunden
        </p>
      </div>

      <form className="mb-8 grid gap-3 md:grid-cols-4">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Suche nach Produkt, Marke oder SKU"
          className="rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-brand"
        />

        <select
          name="category"
          defaultValue={category}
          className="rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-brand"
        >
          <option value="">Alle Kategorien</option>
          {categories.map((cat) => (
            <option key={cat.name} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>

        <select
          name="subcategory"
          defaultValue={subcategory}
          className="rounded-xl border border-neutral-300 px-4 py-3 text-sm outline-none focus:border-brand"
        >
          <option value="">Alle Unterkategorien</option>
          {(activeCategory?.subcategories || []).map((sub) => (
            <option key={sub} value={sub}>
              {sub}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
        >
          Suchen
        </button>
      </form>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <Link
            key={product.sku}
            href={`/produkte/${product.slug}`}
            className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="aspect-square overflow-hidden rounded-xl bg-neutral-100">
              {product.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image}
                  alt={product.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                  Kein Bild
                </div>
              )}
            </div>

            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-brand">
                {product.brand}
              </p>

              <h2 className="mt-1 line-clamp-2 min-h-[3rem] text-sm font-semibold text-neutral-900">
                {product.title}
              </h2>

              <p className="mt-2 text-xs text-neutral-500">
                {product.category} / {product.subcategory}
              </p>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-lg font-bold text-neutral-900">
                  CHF {product.price.toFixed(2)}
                </span>

                <span
                  className={`text-xs font-medium ${
                    product.stock > 0 ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {product.stock > 0 ? `Lager: ${product.stock}` : "Ausverkauft"}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}