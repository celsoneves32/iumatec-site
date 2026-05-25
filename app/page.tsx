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

/* 🔥 IMPORTANTE — apenas 1 função */
function getMerchandiseId(product: Product) {
  return product.merchandiseId || product.shopifyVariantId || null;
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
      {/* HERO */}
      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center">
          <div className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-extrabold text-red-700 shadow-sm">
            🇨🇭 IUMATEC Schweiz · geprüfte Produkte · sicherer Checkout
          </div>

          <h1 className="mt-6 text-5xl font-black md:text-6xl">
            Technik zu starken Preisen.
          </h1>

          <p className="mt-4 text-lg text-neutral-600">
            Verfügbare Technikprodukte mit Bild, Preis und Lagerbestand –
            schnell geliefert in der Schweiz.
          </p>

          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/produkte"
              className="rounded-2xl bg-red-600 px-8 py-4 font-extrabold text-white"
            >
              Jetzt einkaufen
            </Link>

            <Link
              href="/produkte?sort=price-asc"
              className="rounded-2xl border px-8 py-4 font-extrabold"
            >
              Beste Preise ansehen
            </Link>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="mb-6 text-3xl font-black">Beliebte Kategorien</h2>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {categories.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="flex items-center gap-5 rounded-3xl border p-5"
            >
              <div className="relative h-20 w-24">
                <Image src={item.image} alt={item.title} fill />
              </div>

              <div>
                <div className="font-extrabold">{item.title}</div>
                <div className="text-sm text-neutral-500">{item.text}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="text-3xl font-black mb-6">Top Smartphones</h2>
        <ProductGrid products={smartphones.length ? smartphones : fallbackTop} />
      </section>

      <section className="bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <h2 className="text-3xl font-black mb-6">Business Laptops</h2>
          <ProductGrid products={laptops.length ? laptops : fallbackTop} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="text-3xl font-black mb-6">Monitor Deals</h2>
        <ProductGrid products={monitors.length ? monitors : fallbackTop} />
      </section>

      {/* BUSINESS */}
      <section className="bg-neutral-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-2">
          <div>
            <h2 className="text-4xl font-black">
              Business-Technik für die Schweiz.
            </h2>
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