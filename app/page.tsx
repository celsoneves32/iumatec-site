import Image from "next/image";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import {
  getTopProducts,
  getImmediatelyAvailableProducts,
  getBestDealProducts,
} from "@/lib/productData";

const categories = [
  {
    title: "Laptops",
    href: "/produkte?category=Computer&subcategory=Laptops",
    image: "/categories/laptops.png",
  },
  {
    title: "Smartphones",
    href: "/produkte?category=Mobile&subcategory=Smartphones",
    image: "/categories/smartphones.png",
  },
  {
    title: "Monitore",
    href: "/produkte?category=Peripherie&subcategory=Monitors",
    image: "/categories/monitors.png",
  },
  {
    title: "Grafikkarten",
    href: "/produkte?category=PC-Komponenten&subcategory=Grafikkarten",
    image: "/categories/gpus.png",
  },
];

export default function HomePage() {
  const topProducts = getTopProducts(8);
  const availableProducts = getImmediatelyAvailableProducts(8);
  const deals = getBestDealProducts(8);

  return (
    <main className="bg-white">
      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center">
          <div className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-red-600 shadow">
            🇨🇭 IUMATEC Schweiz · Technik direkt bestellbar
          </div>

          <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-extrabold leading-tight text-neutral-950 md:text-6xl">
            Technik zu starken Preisen.
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-600">
            Verfügbare Technikprodukte mit Bild, Preis und Lagerbestand –
            schnell geliefert in der Schweiz.
          </p>

          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/produkte"
              className="rounded-2xl bg-red-600 px-7 py-4 font-extrabold text-white hover:bg-red-700"
            >
              Jetzt einkaufen
            </Link>

            <Link
              href="/produkte?sort=price-asc"
              className="rounded-2xl border border-neutral-300 bg-white px-7 py-4 font-extrabold text-neutral-900 hover:bg-neutral-50"
            >
              Beste Preise ansehen
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm font-semibold text-neutral-600">
            <span>⚡ Lieferung 1–2 Werktage</span>
            <span>🔒 Sicherer Checkout</span>
            <span>🇨🇭 Versand Schweiz</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="mb-6 text-3xl font-extrabold text-neutral-950">
          Kategorien
        </h2>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {categories.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group flex items-center gap-5 rounded-3xl border border-neutral-200 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-2xl bg-neutral-50">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-contain p-2 transition group-hover:scale-105"
                  priority
                />
              </div>

              <div>
                <div className="text-lg font-extrabold text-neutral-950">
                  {item.title}
                </div>
                <div className="mt-1 text-sm font-semibold text-red-600">
                  Jetzt entdecken →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-3xl font-extrabold text-neutral-950">
            Top Produkte
          </h2>
          <Link href="/produkte" className="text-sm font-bold text-red-600">
            Alle ansehen →
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {topProducts.map((product) => (
            <ProductCard
              key={product.slug}
              product={{
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
              }}
            />
          ))}
        </div>
      </section>

      <section className="bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <h2 className="mb-6 text-3xl font-extrabold text-neutral-950">
            Sofort lieferbar ⚡
          </h2>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {availableProducts.map((product) => (
              <ProductCard
                key={product.slug}
                product={{
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
                }}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="mb-6 text-3xl font-extrabold text-neutral-950">
          Beste Deals 💸
        </h2>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {deals.map((product) => (
            <ProductCard
              key={product.slug}
              product={{
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
              }}
            />
          ))}
        </div>
      </section>
    </main>
  );
}