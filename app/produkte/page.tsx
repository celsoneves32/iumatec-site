import ProductCard from "@/components/ProductCard";
import { getStorefrontProducts } from "@/lib/shopifyStorefront";

type ProduktePageProps = {
  searchParams?: {
    q?: string;
  };
};

export default async function ProduktePage({ searchParams }: ProduktePageProps) {
  const q = searchParams?.q?.trim().toLowerCase() || "";
  const allProducts = await getStorefrontProducts(60);

  const products = q
    ? allProducts.filter((product) => {
        return (
          product.title.toLowerCase().includes(q) ||
          (product.vendor || "").toLowerCase().includes(q) ||
          product.handle.toLowerCase().includes(q)
        );
      })
    : allProducts;

  return (
    <main className="bg-white">
      <section className="border-b border-neutral-200">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-neutral-950 md:text-5xl">
            Alle Produkte
          </h1>
          <p className="mt-3 max-w-3xl text-lg text-neutral-600">
            Direkt aus Shopify Storefront geladen und real kaufbar.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8">
        <form className="grid gap-4 rounded-3xl border border-neutral-200 bg-white p-5 md:grid-cols-4">
          <div className="md:col-span-3">
            <label className="mb-2 block text-sm font-semibold text-neutral-900">
              Suche
            </label>
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Produkt, Marke oder Handle"
              className="w-full rounded-2xl border border-neutral-300 px-4 py-3 text-sm outline-none transition focus:border-neutral-900"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-2xl bg-neutral-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Filter anwenden
            </button>
          </div>
        </form>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-950">
            {products.length} Produkte gefunden
          </h2>
        </div>

        {products.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={{
                  slug: product.handle,
                  title: product.title,
                  brand: product.vendor,
                  price: product.price,
                  image: product.image ?? null,
                  inStock: product.availableForSale,
                  stockQty: product.stockQty ?? 999,
                  deliveryDate: product.deliveryDate ?? null,
                  merchandiseId: product.merchandiseId,
                  productHandle: product.handle,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center">
            <h3 className="text-2xl font-bold tracking-tight text-neutral-950">
              Keine Produkte gefunden
            </h3>
            <p className="mt-3 text-neutral-600">
              Der Shopify Storefront liefert aktuell keine verkaufbaren Produkte.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}