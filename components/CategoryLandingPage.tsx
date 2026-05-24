import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import {
  getProductsBySubcategory,
  getPurchasableProducts,
  scoreProduct,
  type Product,
} from "@/lib/productData";

type CategoryLandingPageProps = {
  title: string;
  subtitle: string;
  category: string;
  subcategory?: string;
  badge?: string;
};

function productToCard(product: Product) {
  return {
    slug: product.slug,
    title: product.title,
    brand: product.brand,
    price: product.price,
    image: product.image ?? null,
    inStock: product.inStock,
    stockQty: product.stockQty,
    merchandiseId: product.merchandiseId,
    productHandle: product.shopifyProductHandle ?? product.slug,
    energyLabel: product.energyLabel,
  };
}

export default function CategoryLandingPage({
  title,
  subtitle,
  category,
  subcategory,
  badge = "IUMATEC Schweiz",
}: CategoryLandingPageProps) {
  const products = subcategory
    ? getProductsBySubcategory(category, subcategory)
        .filter((product) => product.merchandiseId && product.price > 0 && product.image)
        .sort((a, b) => scoreProduct(b) - scoreProduct(a))
    : getPurchasableProducts()
        .filter((product) => product.category === category)
        .sort((a, b) => scoreProduct(b) - scoreProduct(a));

  return (
    <main className="bg-white">
      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-extrabold text-red-700 shadow-sm">
            {badge}
          </div>

          <h1 className="mt-5 text-5xl font-extrabold tracking-tight text-neutral-950">
            {title}
          </h1>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-600">
            {subtitle}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/produkte"
              className="rounded-2xl border border-neutral-300 bg-white px-5 py-3 text-sm font-bold text-neutral-800 hover:bg-neutral-50"
            >
              Alle Produkte
            </Link>

            <Link
              href={`/produkte?category=${encodeURIComponent(category)}${
                subcategory ? `&subcategory=${encodeURIComponent(subcategory)}` : ""
              }`}
              className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-red-700"
            >
              Filteransicht öffnen
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-neutral-950">
              {products.length} Produkte
            </h2>
            <p className="mt-2 text-neutral-600">
              Direkt bestellbare Produkte mit Bild, Preis und Shopify Checkout.
            </p>
          </div>
        </div>

        {products.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={`${product.sku}-${product.slug}`}
                product={productToCard(product)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center">
            <h3 className="text-2xl font-bold text-neutral-950">
              Keine Produkte gefunden
            </h3>
            <p className="mt-3 text-neutral-600">
              Für diese Kategorie sind aktuell keine direkt bestellbaren Produkte verfügbar.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}