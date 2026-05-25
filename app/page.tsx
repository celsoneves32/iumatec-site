import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { getTopProducts, type Product } from "@/lib/productData";

const WINNERS_PATH = path.join(
  process.cwd(),
  "integrations",
  "alltron",
  "out",
  "winning-products.json"
);

const categories = [
  {
    title: "Laptops",
    text: "Business, Office und Alltag",
    href: "/produkte?category=Computer&subcategory=Laptops",
    image: "/categories/laptops.png",
  },
  {
    title: "Smartphones",
    text: "Apple, Samsung, Xiaomi",
    href: "/produkte?category=Mobile&subcategory=Smartphones",
    image: "/categories/smartphones.png",
  },
  {
    title: "Monitore",
    text: "24–27 Zoll für Arbeit & Gaming",
    href: "/produkte?category=Peripherie&subcategory=Monitors",
    image: "/categories/monitors.png",
  },
  {
    title: "Grafikkarten",
    text: "RTX, Radeon und Workstation",
    href: "/produkte?category=PC-Komponenten&subcategory=Grafikkarten",
    image: "/categories/gpus.png",
  },
];

function readWinningProducts(): Product[] {
  try {
    if (!fs.existsSync(WINNERS_PATH)) return [];
    const raw = JSON.parse(fs.readFileSync(WINNERS_PATH, "utf8"));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function getMerchandiseId(product: Product) {
  return (
    product.merchandiseId ||
    product.shopifyVariantId ||
    null
  );
}

function getMerchandiseId(product: Product) {
  return (
    product.merchandiseId ||
    product.shopifyVariantId ||
    null
  );
}

function isBuyable(product: Product) {
  return (
    Boolean(getMerchandiseId(product)) &&
    Number(product.price || 0) > 0 &&
    Boolean(product.image)
  );
}

function productText(product: Product) {
  return `${product.title} ${product.brand} ${product.category} ${product.subcategory}`.toLowerCase();
}

function filterProducts(products: Product[], words: string[], limit = 4) {
  return products
    .filter((product) => {
      const text = productText(product);
      return words.some((word) => text.includes(word.toLowerCase()));
    })
    .filter(isBuyable)
    .slice(0, limit);
}

function ProductGrid({
  products,
  compact = false,
}: {
  products: Product[];
  compact?: boolean;
}) {
  const buyableProducts = products.filter(isBuyable);

  if (!buyableProducts.length) return null;

  return (
    <div
      className={
        compact
          ? "grid gap-4 sm:grid-cols-2"
          : "grid gap-6 sm:grid-cols-2 xl:grid-cols-4"
      }
    >
      {buyableProducts.map((product) => (
        <ProductCard
          key={`${product.sku}-${product.slug}`}
          product={{
            slug: product.slug,
            title: product.title,
            brand: product.brand,
            price: product.price,
            image: product.image ?? null,
            inStock: product.inStock,
            stockQty: product.stockQty,
            merchandiseId: getMerchandiseId(product),
            productHandle: product.shopifyProductHandle ?? product.slug,
            energyLabel: product.energyLabel,
          }}
        />
      ))}
    </div>
  );
}

export default function HomePage() {
  const winners = readWinningProducts();

  const products = (winners.length > 0 ? winners : getTopProducts(200)).filter(
    isBuyable
  );

  const fallbackTop = products.slice(0, 4);

  const smartphones = filterProducts(
    products,
    ["iphone", "galaxy", "xiaomi", "redmi", "smartphone"],
    4
  );

  const laptops = filterProducts(
    products,
    ["laptop", "notebook", "probook", "thinkpad", "latitude", "macbook"],
    4
  );

  const monitors = filterProducts(products, ["monitor", "display"], 4);

  const business = filterProducts(
    products,
    ["hp", "lenovo", "dell", "probook", "thinkpad", "latitude"],
    2
  );

  return (
    <main className="bg-white">
      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center">
          <div className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-extrabold text-red-700 shadow-sm">
            🇨🇭 IUMATEC Schweiz · geprüfte Produkte · sicherer Checkout
          </div>

          <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-black leading-tight text-neutral-950 md:text-6xl">
            Technik zu starken Preisen.
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-600">
            Verfügbare Technikprodukte mit Bild, Preis und Lagerbestand –
            schnell geliefert in der Schweiz.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/produkte"
              className="rounded-2xl bg-red-600 px-8 py-4 text-base font-extrabold text-white shadow-sm hover:bg-red-700"
            >
              Jetzt einkaufen
            </Link>

            <Link
              href="/produkte?sort=price-asc"
              className="rounded-2xl border border-neutral-300 bg-white px-8 py-4 text-base font-extrabold text-neutral-950 hover:bg-neutral-50"
            >
              Beste Preise ansehen
            </Link>
          </div>

          <div className="mt-10 grid gap-4 text-sm font-bold text-neutral-700 md:grid-cols-3">
            <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
              ⚡ Lieferung 1–2 Werktage
            </div>
            <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
              🔒 Sicherer Checkout
            </div>
            <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
              🇨🇭 Preise inkl. MWST
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="mb-6 text-3xl font-black text-neutral-950">
          Beliebte Kategorien
        </h2>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {categories.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group flex items-center gap-5 rounded-3xl border border-neutral-200 bg-white p-5 transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-2xl bg-neutral-50">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-contain p-2 transition group-hover:scale-105"
                />
              </div>

              <div>
                <div className="text-lg font-extrabold text-neutral-950">
                  {item.title}
                </div>
                <div className="mt-1 text-sm text-neutral-500">{item.text}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-neutral-950">
              Top Smartphones
            </h2>
            <p className="mt-1 text-neutral-500">
              Gefragte Modelle mit direktem Checkout.
            </p>
          </div>

          <Link
            href="/produkte?category=Mobile&subcategory=Smartphones"
            className="text-sm font-extrabold text-red-600"
          >
            Alle ansehen →
          </Link>
        </div>

        <ProductGrid products={smartphones.length ? smartphones : fallbackTop} />
      </section>

      <section className="bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black text-neutral-950">
                Business Laptops
              </h2>
              <p className="mt-1 text-neutral-500">
                HP, Lenovo, Dell und starke Geräte für Arbeit & Office.
              </p>
            </div>

            <Link
              href="/produkte?category=Computer&subcategory=Laptops"
              className="text-sm font-extrabold text-red-600"
            >
              Alle ansehen →
            </Link>
          </div>

          <ProductGrid products={laptops.length ? laptops : fallbackTop} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-neutral-950">
              Monitor Deals
            </h2>
            <p className="mt-1 text-neutral-500">
              Monitore für Homeoffice, Gaming und produktive Setups.
            </p>
          </div>

          <Link
            href="/produkte?category=Peripherie&subcategory=Monitors"
            className="text-sm font-extrabold text-red-600"
          >
            Alle ansehen →
          </Link>
        </div>

        <ProductGrid products={monitors.length ? monitors : fallbackTop} />
      </section>

      <section className="bg-neutral-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white">
              Für Unternehmen & Profis
            </div>

            <h2 className="mt-5 max-w-xl text-4xl font-black">
              Business-Technik für die Schweiz.
            </h2>

            <p className="mt-4 max-w-xl text-neutral-300">
              Laptops, Monitore, Zubehör und Hardware mit transparentem Preis,
              Schweizer Checkout und schneller Lieferung.
            </p>

            <Link
              href="/produkte?category=Computer"
              className="mt-8 inline-flex rounded-2xl bg-red-600 px-7 py-4 font-extrabold text-white hover:bg-red-700"
            >
              Business Produkte ansehen
            </Link>
          </div>

          <ProductGrid
            products={(business.length ? business : fallbackTop).slice(0, 2)}
            compact
          />
        </div>
      </section>
    </main>
  );
}