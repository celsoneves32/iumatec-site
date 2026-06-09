import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import HomepageCarousel from "@/components/HomepageCarousel";
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
    title: "Smartphones & Tablets",
    text: "Apple, Samsung, Xiaomi",
    href: "/produkte?category=Mobile",
    image: "/categories/smartphones.png",
  },
  {
    title: "Monitore",
    text: "Homeoffice, Gaming & Setup",
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

function getPrice(product: Product) {
  return Number((product as any).price || 0);
}

function isBuyable(product: Product) {
  const p = product as any;

  return (
    Boolean(getProductSlug(product)) &&
    Boolean(getMerchandiseId(product)) &&
    getPrice(product) > 0 &&
    Boolean(p.image) &&
    getStockQty(product) > 0
  );
}

function productText(product: Product) {
  const p = product as any;

  return `${p.title || ""} ${p.brand || ""} ${p.category || ""} ${
    p.subcategory || ""
  } ${p.description || ""} ${p.description2 || ""}`.toLowerCase();
}

function getFamilyKey(product: Product) {
  const p = product as any;

  return String(p.title || "")
    .toLowerCase()
    .replace(
      /\b(schwarz|black|midnight|mitternacht|sky blue|sky-blue|silber|silver|grau|gray|grey|blau|blue|weiss|white|gold|rose|rot|red|grün|green|starlight|space black|space schwarz)\b/g,
      ""
    )
    .replace(
      /\b(64gb|128gb|256gb|512gb|1tb|2tb|4tb|8gb|16gb|24gb|32gb|64gb|128gb)\b/g,
      ""
    )
    .replace(/\b(wifi|wi-fi|5g|cellular|lte)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueProductFamilies(products: Product[]) {
  const seen = new Set<string>();

  return products.filter((product) => {
    const key = getFamilyKey(product);
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueBySlug(products: Product[]) {
  const seen = new Set<string>();

  return products.filter((product) => {
    const slug = getProductSlug(product);
    if (!slug) return false;
    if (seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });
}

function isLaptop(product: Product) {
  const p = product as any;
  const category = String(p.category || "").toLowerCase().trim();
  const subcategory = String(p.subcategory || "").toLowerCase().trim();
  const text = productText(product);

  return (
    (category === "computer" && subcategory === "laptops") ||
    text.includes("laptop") ||
    text.includes("notebook") ||
    text.includes("macbook") ||
    text.includes("probook") ||
    text.includes("elitebook") ||
    text.includes("thinkpad") ||
    text.includes("latitude") ||
    text.includes("surface laptop")
  );
}

function isSmartphoneOrTablet(product: Product) {
  const p = product as any;
  const category = String(p.category || "").toLowerCase().trim();
  const subcategory = String(p.subcategory || "").toLowerCase().trim();

  return (
    category === "mobile" &&
    (subcategory === "smartphones" || subcategory === "tablets")
  );
}

function isRealMonitor(product: Product) {
  const p = product as any;
  const category = String(p.category || "").toLowerCase().trim();
  const subcategory = String(p.subcategory || "").toLowerCase().trim();
  const text = productText(product);

  const blocked =
    text.includes("tablet") ||
    text.includes("ipad") ||
    text.includes("galaxy tab") ||
    text.includes("smartphone") ||
    text.includes("iphone") ||
    text.includes("laptop") ||
    text.includes("notebook") ||
    text.includes("macbook") ||
    text.includes("elitebook") ||
    text.includes("probook");

  return (
    category === "peripherie" &&
    (subcategory === "monitors" || subcategory === "monitor") &&
    !blocked
  );
}

function isAccessory(product: Product) {
  const p = product as any;
  const category = String(p.category || "").toLowerCase().trim();
  const subcategory = String(p.subcategory || "").toLowerCase().trim();
  const text = productText(product);

  if (
    category === "computer" ||
    category === "pc-komponenten" ||
    subcategory === "laptops" ||
    subcategory === "monitors" ||
    subcategory === "smartphones" ||
    subcategory === "tablets"
  ) {
    return false;
  }

  return (
    text.includes("maus") ||
    text.includes("mouse") ||
    text.includes("tastatur") ||
    text.includes("keyboard") ||
    text.includes("headset") ||
    text.includes("kamera") ||
    text.includes("webcam") ||
    text.includes("dock") ||
    text.includes("adapter") ||
    text.includes("kabel") ||
    text.includes("charger") ||
    text.includes("ladegerät") ||
    text.includes("halter") ||
    text.includes("case") ||
    text.includes("schutz") ||
    text.includes("glas") ||
    text.includes("usb")
  );
}

function ProductCarousel({
  products,
  uniqueFamilies = true,
}: {
  products: Product[];
  uniqueFamilies?: boolean;
}) {
  const buyable = products.filter(isBuyable);
  const items = (
    uniqueFamilies ? uniqueProductFamilies(buyable) : uniqueBySlug(buyable)
  ).slice(0, 16);

  if (!items.length) return null;

  return (
    <HomepageCarousel>
      {items.map((product) => {
        const p = product as any;
        const slug = getProductSlug(product);
        const stockQty = getStockQty(product);

        return (
          <div key={`${p.sku || slug}-${slug}`} className="w-[320px] shrink-0">
            <ProductCard
              product={{
                slug,
                title: p.title,
                brand: p.brand,
                price: getPrice(product),
                image: p.image ?? null,
                inStock: true,
                stockQty,
                merchandiseId: getMerchandiseId(product),
                productHandle: p.shopifyProductHandle ?? slug,
                energyLabel: p.energyLabel,
              }}
            />
          </div>
        );
      })}
    </HomepageCarousel>
  );
}

function SectionHeader({
  title,
  subtitle,
  href,
}: {
  title: string;
  subtitle: string;
  href: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-3xl font-black text-neutral-950">{title}</h2>
        <p className="mt-1 text-neutral-500">{subtitle}</p>
      </div>

      <Link href={href} className="shrink-0 text-sm font-extrabold text-red-600">
        Alle ansehen →
      </Link>
    </div>
  );
}

function HeroProduct({
  product,
  className = "",
}: {
  product?: Product;
  className?: string;
}) {
  if (!product) return null;

  const p = product as any;
  const slug = getProductSlug(product);

  return (
    <Link
      href={`/produkte/${slug}`}
      className={`group relative overflow-hidden rounded-[2rem] border border-white/70 bg-white p-5 shadow-xl transition hover:-translate-y-1 hover:shadow-2xl ${className}`}
    >
      <div className="absolute left-5 top-5 z-10 rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700 ring-1 ring-green-100">
        CH Lager
      </div>

      <div className="flex h-44 items-center justify-center rounded-3xl bg-neutral-50 p-4">
        {p.image ? (
          <img
            src={p.image}
            alt={p.title}
            className="max-h-full max-w-full object-contain transition duration-300 group-hover:scale-105"
          />
        ) : null}
      </div>

      <div className="mt-4 text-xs font-bold uppercase tracking-wide text-neutral-500">
        {p.brand || "IUMATEC"}
      </div>

      <div className="mt-1 line-clamp-2 text-base font-black leading-tight text-neutral-950">
        {p.title}
      </div>

      <div className="mt-3 text-xl font-black text-neutral-950">
        CHF{" "}
        {getPrice(product).toLocaleString("de-CH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
    </Link>
  );
}

export default function HomePage() {
  const winners = readWinningProducts();
  const rawProducts = winners.length > 0 ? winners : getTopProducts(1000);

  const allBuyable = rawProducts.filter(isBuyable);

  const products = uniqueProductFamilies(allBuyable);

  const laptops = products
    .filter((p) => isLaptop(p) && getPrice(p) >= 300)
    .slice(0, 16);

  const smartphonesAndTablets = products
    .filter((p) => isSmartphoneOrTablet(p) && getPrice(p) >= 250)
    .slice(0, 16);

  const monitors = uniqueBySlug(allBuyable)
    .filter((p) => isRealMonitor(p) && getPrice(p) >= 80)
    .slice(0, 16);

  const topDeals = products
    .filter((p) => getPrice(p) >= 300 && !isAccessory(p))
    .sort((a, b) => getPrice(a) - getPrice(b))
    .slice(0, 16);

  const dealsUnder300 = products
    .filter((p) => getPrice(p) > 0 && getPrice(p) <= 300 && isAccessory(p))
    .sort((a, b) => getPrice(a) - getPrice(b))
    .slice(0, 16);

  const sofortLieferbar = products
    .filter((p) => getStockQty(p) >= 2 && getPrice(p) >= 300 && !isAccessory(p))
    .slice(0, 16);

  const heroProducts = [laptops[0], monitors[0], smartphonesAndTablets[0]].filter(
    Boolean
  ) as Product[];

  return (
    <main className="bg-white">
      <section className="relative overflow-hidden border-b border-neutral-200 bg-gradient-to-br from-neutral-50 via-white to-red-50/50">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-red-100 blur-3xl" />
        <div className="absolute -bottom-40 left-0 h-96 w-96 rounded-full bg-neutral-200/70 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:py-20">
          <div>
            <div className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-extrabold text-red-700 shadow-sm">
              🇨🇭 IUMATEC Schweiz · geprüfte Technik · sicherer Checkout
            </div>

            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[0.98] tracking-tight text-neutral-950 md:text-7xl">
              Business-Technik zu starken Preisen.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-600">
              Computer, Monitore, Smartphones und Zubehör mit transparentem Preis,
              Schweizer Lieferung und direktem Checkout.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/produkte"
                className="rounded-2xl bg-red-600 px-8 py-4 text-base font-extrabold text-white shadow-sm transition hover:bg-red-700"
              >
                Jetzt einkaufen
              </Link>

              <Link
                href="/produkte?sort=price-asc"
                className="rounded-2xl border border-neutral-300 bg-white px-8 py-4 text-base font-extrabold text-neutral-950 transition hover:bg-neutral-50"
              >
                Angebote entdecken
              </Link>
            </div>

            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {["CH Versand", "Schnelle Lieferung", "Sicherer Checkout", "MWST inkl."].map(
                (item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-neutral-200 bg-white/80 px-4 py-3 text-sm font-extrabold text-neutral-800 shadow-sm"
                  >
                    ✓ {item}
                  </div>
                )
              )}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <HeroProduct product={heroProducts[0]} className="sm:row-span-2" />
            <HeroProduct product={heroProducts[1]} />
            <HeroProduct product={heroProducts[2]} />
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
        <SectionHeader
          title="Top Deals"
          subtitle="Gute Preise, sofort kaufbar und direkt zum Checkout."
          href="/produkte?sort=price-asc"
        />
        <ProductCarousel products={topDeals} />
      </section>

      {dealsUnder300.length > 0 && (
        <section className="bg-neutral-50">
          <div className="mx-auto max-w-7xl px-4 py-12">
            <SectionHeader
              title="Deals unter CHF 300"
              subtitle="Zubehör und Technik zu kleineren Preisen."
              href="/produkte?price=0-300"
            />
            <ProductCarousel products={dealsUnder300} uniqueFamilies={false} />
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-12">
        <SectionHeader
          title="Business Laptops"
          subtitle="HP, Lenovo, Dell und Apple Geräte für Arbeit & Office."
          href="/produkte?category=Computer&subcategory=Laptops"
        />
        <ProductCarousel products={laptops} />
      </section>

      <section className="bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <SectionHeader
            title="Smartphones & Tablets"
            subtitle="Apple, Samsung, Xiaomi und mobile Technik."
            href="/produkte?category=Mobile"
          />
          <ProductCarousel products={smartphonesAndTablets} />
        </div>
      </section>

      {monitors.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <SectionHeader
            title="Monitore"
            subtitle="Displays für Homeoffice, Gaming und produktive Setups."
            href="/produkte?category=Peripherie&subcategory=Monitors"
          />
          <ProductCarousel products={monitors} uniqueFamilies={false} />
        </section>
      )}

      <section className="bg-neutral-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-[1fr_1.4fr] lg:items-center">
          <div>
            <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white">
              Sofort lieferbar
            </div>

            <h2 className="mt-5 max-w-xl text-4xl font-black">
              Technik, die schnell raus kann.
            </h2>

            <p className="mt-4 max-w-xl text-neutral-300">
              Produkte mit Lagerbestand, transparentem Preis und sicherem
              Schweizer Checkout.
            </p>

            <Link
              href="/produkte?stock=available"
              className="mt-8 inline-flex rounded-2xl bg-red-600 px-7 py-4 font-extrabold text-white hover:bg-red-700"
            >
              Sofort lieferbare Produkte ansehen
            </Link>
          </div>

          <ProductCarousel products={sofortLieferbar} />
        </div>
      </section>
    </main>
  );
}