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
  const p = product as any;
  return p.merchandiseId || p.shopifyVariantId || null;
}

function getProductSlug(product: Product) {
  const p = product as any;
  return p.slug || p.shopifyProductHandle || "";
}

function getStockQty(product: Product) {
  const p = product as any;
  return Number(p.stockQty ?? p.stock ?? 0);
}

function isBuyable(product: Product) {
  return (
    Boolean(getProductSlug(product)) &&
    Boolean(getMerchandiseId(product)) &&
    Number((product as any).price || 0) > 0 &&
    Boolean((product as any).image) &&
    getStockQty(product) > 0
  );
}

function productText(product: Product) {
  const p = product as any;

  return `${p.title || ""} ${p.brand || ""} ${p.category || ""} ${
    p.subcategory || ""
  } ${p.description || ""} ${p.description2 || ""}`.toLowerCase();
}

function filterProducts(products: Product[], words: string[], limit = 4) {
  return products
    .filter((product) =>
      words.some((word) => productText(product).includes(word.toLowerCase()))
    )
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
          ? "grid gap-5 sm:grid-cols-2"
          : "grid gap-6 sm:grid-cols-2 xl:grid-cols-4"
      }
    >
      {buyableProducts.map((product) => {
        const p = product as any;
        const slug = getProductSlug(product);
        const stockQty = getStockQty(product);

        return (
          <ProductCard
            key={`${p.sku || slug}-${slug}`}
            product={{
              slug,
              title: p.title,
              brand: p.brand,
              price: Number(p.price || 0),
              image: p.image ?? null,
              inStock: true,
              stockQty,
              merchandiseId: getMerchandiseId(product),
              productHandle: p.shopifyProductHandle ?? slug,
              energyLabel: p.energyLabel,
            }}
          />
        );
      })}
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
    ["iphone", "galaxy", "xiaomi", "redmi", "smartphone", "ipad", "tab"],
    4
  );

  const laptops = filterProducts(
    products,
    [
      "laptop",
      "notebook",
      "macbook",
      "probook",
      "elitebook",
      "thinkpad",
      "latitude",
      "surface laptop",
    ],
    4
  );

  const monitors = filterProducts(products, ["monitor", "display"], 4);

  const business = filterProducts(
    products,
    [
      "hp",
      "lenovo",
      "dell",
      "probook",
      "elitebook",
      "thinkpad",
      "latitude",
      "prodesk",
      "surface",
    ],
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
                <div className="mt-1 text-sm text-neutral-500">
                  {item.text}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="mb-6 text-3xl font-black text-neutral-950">
          Top Smartphones & Tablets
        </h2>
        <ProductGrid products={smartphones.length ? smartphones : fallbackTop} />
      </section>

      <section className="bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <h2 className="mb-6 text-3xl font-black text-neutral-950">
            Business Laptops
          </h2>
          <ProductGrid products={laptops.length ? laptops : fallbackTop} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="mb-6 text-3xl font-black text-neutral-950">
          Monitor Deals
        </h2>
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