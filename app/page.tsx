import Image from "next/image";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { getStorefrontProducts } from "@/lib/shopifyStorefront";

const quickCategories = [
  {
    title: "Laptops",
    href: "/produkte?q=laptop",
    image: "/categories/laptops.png",
  },
  {
    title: "Monitore",
    href: "/produkte?q=monitor",
    image: "/categories/monitors.png",
  },
  {
    title: "Smartphones",
    href: "/produkte?q=smartphone",
    image: "/categories/smartphones.png",
  },
  {
    title: "Zubehör",
    href: "/produkte?q=zubehör",
    image: "/categories/keyboards.png",
  },
];

export default async function HomePage() {
  const products = await getStorefrontProducts(16);

  return (
    <main className="bg-white">
      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center md:py-16">
          <div className="mx-auto inline-flex items-center rounded-full border border-red-100 bg-white px-4 py-2 text-sm font-bold text-red-700 shadow-sm">
            <span className="mr-2 h-2 w-2 rounded-full bg-red-600" />
            IUMATEC Schweiz
          </div>

          <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-extrabold leading-[0.95] tracking-tight text-neutral-950 md:text-7xl">
            Technik schnell und sicher kaufen.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-neutral-600">
            Verfügbare Produkte, transparente Preise inkl. MWST und sicherer
            Checkout für die Schweiz.
          </p>

          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/produkte"
              className="rounded-2xl bg-red-600 px-8 py-4 text-base font-extrabold text-white shadow-sm transition hover:bg-red-700"
            >
              Jetzt einkaufen
            </Link>

            <Link
              href="#top-deals"
              className="rounded-2xl border border-neutral-300 bg-white px-8 py-4 text-base font-bold text-neutral-900 transition hover:bg-neutral-50"
            >
              Angebote ansehen
            </Link>
          </div>

          <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-4 text-sm font-bold text-neutral-800 shadow-sm">
              🇨🇭 Schweizer Lieferung
            </div>
            <div className="rounded-2xl bg-white p-4 text-sm font-bold text-neutral-800 shadow-sm">
              🔒 Sicherer Checkout
            </div>
            <div className="rounded-2xl bg-white p-4 text-sm font-bold text-neutral-800 shadow-sm">
              💰 Preise inkl. MWST
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-neutral-950">
                Schnell einkaufen nach Kategorie
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Die beliebtesten Bereiche direkt öffnen.
              </p>
            </div>

            <Link
              href="/produkte"
              className="text-sm font-bold text-red-600 hover:underline"
            >
              Alle Produkte
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickCategories.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group flex items-center gap-4 rounded-3xl border border-neutral-200 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-neutral-50">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-contain p-2 transition group-hover:scale-105"
                  />
                </div>

                <div>
                  <div className="font-extrabold text-neutral-950">
                    {item.title}
                  </div>
                  <div className="text-sm text-neutral-500 group-hover:text-red-600">
                    Jetzt entdecken →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="top-deals" className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="inline-flex rounded-full bg-red-50 px-4 py-2 text-sm font-extrabold text-red-700">
              🔥 Aktuelle Angebote
            </div>
            <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-neutral-950">
              Sofort verfügbare Produkte
            </h2>
            <p className="mt-2 text-neutral-600">
              Direkt bestellbar mit sicherem Shopify Checkout.
            </p>
          </div>

          <Link
            href="/produkte"
            className="hidden text-sm font-bold text-red-600 underline-offset-4 hover:underline sm:block"
          >
            Alle Produkte ansehen
          </Link>
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
                  merchandiseId: product.merchandiseId,
                  productHandle: product.handle,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center">
            <h3 className="text-2xl font-bold tracking-tight text-neutral-950">
              Keine Shopify Produkte gefunden
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