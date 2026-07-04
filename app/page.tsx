import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import HomepageCarousel from "@/components/HomepageCarousel";
import {
  getPurchasableProducts,
  getTopProducts,
  type Product,
} from "@/lib/productData";

const mainCategories = [
  {
    title: "Computer",
    subtitle: "Laptops, Desktop-PCs und Mini-PCs",
    href: "/produkte?category=Computer",
    icon: "💻",
  },
  {
    title: "PC-Komponenten",
    subtitle: "Grafikkarten, RAM, SSD, Mainboards",
    href: "/produkte?category=PC-Komponenten",
    icon: "⚙️",
  },
  {
    title: "Peripherie",
    subtitle: "Monitore, Tastaturen, Mäuse, Headsets",
    href: "/produkte?category=Peripherie",
    icon: "🖥️",
  },
  {
    title: "Netzwerk",
    subtitle: "Router, Switches, WLAN Mesh",
    href: "/produkte?category=Netzwerk",
    icon: "🌐",
  },
  {
    title: "Mobile",
    subtitle: "Smartphones, Tablets und Zubehör",
    href: "/produkte?category=Mobile",
    icon: "📱",
  },
  {
    title: "Datenspeicher",
    subtitle: "SSD, HDD, NAS und externe Speicher",
    href: "/produkte?category=Datenspeicher",
    icon: "💾",
  },
];

const quickLinks = [
  { label: "Laptops", href: "/produkte?category=Computer&subcategory=Laptops" },
  { label: "Monitore", href: "/produkte?category=Peripherie&subcategory=Monitore" },
  { label: "Smartphones", href: "/produkte?category=Mobile&subcategory=Smartphones" },
  { label: "Grafikkarten", href: "/produkte?category=PC-Komponenten&subcategory=Grafikkarten" },
  { label: "SSD", href: "/produkte?category=Datenspeicher&subcategory=SSD" },
  { label: "Zubehör", href: "/produkte?category=Zubehör" },
];

function getProductSlug(product: Product) {
  const p = product as any;
  return String(p.slug || p.shopifyProductHandle || p.productHandle || "").trim();
}

function getMerchandiseId(product: Product) {
  const p = product as any;
  return p.merchandiseId || p.shopifyVariantId || null;
}

function getStockQty(product: Product) {
  const p = product as any;
  return Number(p.stockQty ?? p.stock ?? 0);
}

function getPrice(product: Product) {
  return Number((product as any).price || 0);
}

function getCategory(product: Product) {
  return String((product as any).category || "").trim();
}

function getSubcategory(product: Product) {
  return String((product as any).subcategory || "").trim();
}

function normalize(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .trim();
}

function productText(product: Product) {
  const p = product as any;

  return normalize(
    `${p.title || ""} ${p.brand || ""} ${p.category || ""} ${
      p.subcategory || ""
    } ${p.description || ""} ${p.description2 || ""}`
  );
}

function isBuyable(product: Product) {
  const p = product as any;

  return (
    Boolean(getProductSlug(product)) &&
    Boolean(getMerchandiseId(product)) &&
    Boolean(p.image) &&
    getPrice(product) > 0 &&
    getStockQty(product) > 0
  );
}

function familyKey(product: Product) {
  return productText(product)
    .replace(
      /\b(schwarz|black|midnight|mitternacht|sky blue|sky-blue|silber|silver|grau|gray|grey|blau|blue|weiss|white|gold|rose|rot|red|grun|green|starlight|space black|space schwarz)\b/g,
      ""
    )
    .replace(
      /\b(64gb|128gb|256gb|512gb|1tb|2tb|4tb|8gb|16gb|24gb|32gb|64 gb|128 gb|256 gb|512 gb|1 tb|2 tb|4 tb|8 gb|16 gb|24 gb|32 gb)\b/g,
      ""
    )
    .replace(/\b(wifi|wi fi|wi-fi|5g|cellular|lte)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueBySlug(products: Product[]) {
  const seen = new Set<string>();

  return products.filter((product) => {
    const slug = getProductSlug(product);
    if (!slug || seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });
}

function uniqueFamilies(products: Product[]) {
  const seen = new Set<string>();

  return products.filter((product) => {
    const key = familyKey(product);
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function productNameText(product: Product) {
  const p = product as any;

  return normalize(
    `${p.title || ""} ${p.fullTitle || ""} ${p.shopifyProductTitle || ""} ${p.brand || ""}`
  );
}

function hasProductWords(product: Product, words: string[]) {
  const text = productNameText(product);
  return words.some((word) => text.includes(normalize(word)));
}

function hasBlockedWords(product: Product, words: string[]) {
  const text = productNameText(product);
  return words.some((word) => text.includes(normalize(word)));
}

const nonComputerWords = [
  "rucksack",
  "backpack",
  "tasche",
  "sleeve",
  "adapter",
  "akku",
  "battery",
  "netzteil",
  "charger",
  "dock",
  "docking",
  "privacy",
  "schutz",
  "filter",
  "ssd",
  "hdd",
  "kabel",
  "cable",
];

const nonMonitorWords = [
  "lautsprecher",
  "speaker",
  "soundbar",
  "m-audio",
  "vonyx",
  "headset",
  "webcam",
  "tablet",
  "ipad",
  "smartphone",
  "iphone",
  "galaxy tab",
  "roboter",
  "robot",
  "staubsauger",
  "vacuum",
];

const nonSmartphoneWords = [
  "clear glass",
  "panzerglass",
  "schutzglas",
  "screen protector",
  "schutzfolie",
  "case",
  "cover",
  "hulle",
  "hülle",
  "adapter",
  "charger",
  "ladegerät",
  "ladegerat",
  "kabel",
  "cable",
  "monitor",
  "display",
  "tablet",
  "galaxy tab",
  "ipad",
  "roboter",
  "robot",
  "staubsauger",
  "vacuum",
  "notepad",
  "reader",
];

const nonTabletWords = [
  "case",
  "cover",
  "keyboard",
  "tastatur",
  "akku",
  "battery",
  "adapter",
  "notepad",
  "reader",
  "monitor",
  "display",
  "roboter",
  "robot",
  "staubsauger",
  "vacuum",
];

const nonStorageWords = [
  "adapter",
  "charger",
  "ladegerät",
  "ladegerat",
  "netzteil",
  "usb-c",
  "usb c",
  "kitchen",
  "küche",
  "kuche",
  "kitchenaid",
  "mixer",
  "maschine",
  "printer",
  "drucker",
  "toner",
];

function isLaptop(product: Product) {
  return (
    hasProductWords(product, [
      "notebook",
      "laptop",
      "thinkpad",
      "elitebook",
      "latitude",
      "probook",
      "macbook",
      "aspire",
      "vivobook",
      "zenbook",
      "travelmate",
      "chromebook",
      "surface laptop",
    ]) && !hasBlockedWords(product, nonComputerWords)
  );
}

function isMonitor(product: Product) {
  return (
    hasProductWords(product, [
      "monitor",
      "display",
      "27\"",
      "32\"",
      "34\"",
      "qhd",
      "uhd",
      "4k",
      "wqhd",
      "ultrawide",
    ]) && !hasBlockedWords(product, nonMonitorWords)
  );
}

function isSmartphone(product: Product) {
  return (
    hasProductWords(product, [
      "iphone",
      "samsung galaxy s",
      "samsung galaxy a",
      "samsung galaxy z",
      "galaxy s",
      "galaxy a",
      "galaxy z",
      "pixel",
      "redmi",
      "xiaomi",
      "realme",
      "motorola",
      "honor",
      "oppo",
      "smartphone",
    ]) && !hasBlockedWords(product, nonSmartphoneWords)
  );
}

function isTablet(product: Product) {
  return (
    hasProductWords(product, [
      "ipad",
      "galaxy tab",
      "lenovo tab",
      "xiaomi pad",
      "tablet",
    ]) && !hasBlockedWords(product, nonTabletWords)
  );
}

function isGpu(product: Product) {
  return hasProductWords(product, [
    "rtx",
    "geforce",
    "radeon",
    "grafikkarte",
    "graphics card",
    "nvidia",
  ]);
}

function isNetwork(product: Product) {
  return hasProductWords(product, [
    "router",
    "switch",
    "unifi",
    "access point",
    "accesspoint",
    "mesh",
    "wlan",
    "wifi",
  ]);
}

function isStorage(product: Product) {
  return (
    hasProductWords(product, [
      "ssd",
      "nvme",
      "m.2",
      "m 2",
      "ironwolf",
      "wd black",
      "crucial",
      "kingston",
      "samsung 990",
      "samsung 980",
      "external ssd",
      "portable ssd",
      "solid state",
    ]) && !hasBlockedWords(product, nonStorageWords)
  );
}

function isAccessory(product: Product) {
  return hasProductWords(product, [
    "maus",
    "mouse",
    "tastatur",
    "keyboard",
    "headset",
    "webcam",
    "dock",
    "docking",
    "usb hub",
  ]);
}

function scoreShowcaseProduct(product: Product) {
  const text = productNameText(product);
  let score = 0;

  score += Math.min(getStockQty(product), 20) * 10;

  if (getPrice(product) >= 100) score += 100;
  if (getPrice(product) >= 250) score += 120;
  if (getPrice(product) >= 500) score += 80;

  if (
    [
      "apple",
      "samsung",
      "lenovo",
      "hp",
      "dell",
      "asus",
      "acer",
      "msi",
      "lg",
      "philips",
      "ubiquiti",
      "tp-link",
      "kingston",
      "crucial",
      "western digital",
      "wd",
    ].some((brand) => text.includes(brand))
  ) {
    score += 180;
  }

  if (text.includes("rtx")) score += 160;
  if (text.includes("iphone")) score += 160;
  if (text.includes("galaxy")) score += 140;
  if (text.includes("thinkpad") || text.includes("elitebook") || text.includes("latitude")) score += 120;
  if (text.includes('27"') || text.includes('32"') || text.includes("qhd") || text.includes("uhd")) score += 120;
  if (text.includes("nvme") || text.includes("m.2") || text.includes("ssd")) score += 120;

  return score;
}

function pickShowcaseProduct(products: Product[], matcher: (product: Product) => boolean) {
  return products
    .filter((product) => isBuyable(product) && matcher(product))
    .sort((a, b) => scoreShowcaseProduct(b) - scoreShowcaseProduct(a))[0];
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
  }).format(price || 0);
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  href,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  href: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <div className="mb-2 text-sm font-black uppercase tracking-wide text-red-600">
            {eyebrow}
          </div>
        ) : null}

        <h2 className="text-3xl font-black tracking-tight text-neutral-950 md:text-4xl">
          {title}
        </h2>

        <p className="mt-2 max-w-2xl text-neutral-500">{subtitle}</p>
      </div>

      <Link
        href={href}
        className="hidden shrink-0 rounded-full border border-neutral-300 px-5 py-3 text-sm font-black text-neutral-900 transition hover:bg-neutral-50 sm:inline-flex"
      >
        Alle ansehen →
      </Link>
    </div>
  );
}

function ProductCarousel({
  products,
  uniqueFamily = true,
}: {
  products: Product[];
  uniqueFamily?: boolean;
}) {
  const items = (uniqueFamily ? uniqueFamilies(products) : uniqueBySlug(products))
    .filter(isBuyable)
    .slice(0, 16);

  if (!items.length) return null;

  return (
    <HomepageCarousel>
      {items.map((product) => {
        const p = product as any;
        const slug = getProductSlug(product);

        return (
          <div key={`${p.sku || slug}-${slug}`} className="w-[320px] shrink-0">
            <ProductCard
              product={{
                sku: p.sku,
                slug,
                title: p.title,
                brand: p.brand,
                price: getPrice(product),
                image: p.image ?? null,
                category: p.category,
                subcategory: p.subcategory,
                inStock: true,
                stockQty: getStockQty(product),
                merchandiseId: getMerchandiseId(product),
                productHandle: p.shopifyProductHandle ?? p.productHandle ?? slug,
                energyLabel: p.energyLabel,
              }}
            />
          </div>
        );
      })}
    </HomepageCarousel>
  );
}

function HeroProduct({ product }: { product?: Product }) {
  if (!product) return null;

  const p = product as any;
  const slug = getProductSlug(product);

  return (
    <Link
      href={`/produkte/${slug}`}
      className="group relative overflow-hidden rounded-[2rem] border border-white/70 bg-white p-5 shadow-xl transition hover:-translate-y-1 hover:shadow-2xl"
    >
      <div className="absolute left-5 top-5 z-10 rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700 ring-1 ring-green-100">
        CH Lager
      </div>

      <div className="flex h-48 items-center justify-center rounded-3xl bg-neutral-50 p-5">
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
        {formatPrice(getPrice(product))}
      </div>
    </Link>
  );
}

function CategoryCard({
  title,
  subtitle,
  href,
  icon,
  product,
}: {
  title: string;
  subtitle: string;
  href: string;
  icon: string;
  product?: Product;
}) {
  const productData = product as any;
  const image = productData?.image || null;
  const alt = productData?.title || title;

  return (
    <Link
      href={href}
      className="group overflow-hidden rounded-[2rem] border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="flex h-48 items-center justify-center bg-neutral-50 p-6">
        {image ? (
          <img
            src={image}
            alt={alt}
            className="max-h-full max-w-full object-contain transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-neutral-100 text-3xl transition group-hover:bg-red-50">
            {icon}
          </div>
        )}
      </div>

      <div className="p-6">
        <h3 className="text-xl font-black text-neutral-950">{title}</h3>

        <p className="mt-2 min-h-[48px] text-sm leading-6 text-neutral-500">
          {subtitle}
        </p>

        <div className="mt-5 text-sm font-black text-red-600">
          Jetzt entdecken →
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const purchasable = getPurchasableProducts(6000);
  const fallback = getTopProducts(1000);
  const rawProducts = purchasable.length ? purchasable : fallback;

  const allBuyable = uniqueBySlug(rawProducts.filter(isBuyable));

  const laptops = allBuyable
    .filter((p) => isLaptop(p) && getPrice(p) >= 300)
    .sort((a, b) => getPrice(a) - getPrice(b));

  const monitors = allBuyable
    .filter((p) => isMonitor(p) && getPrice(p) >= 80)
    .sort((a, b) => getPrice(a) - getPrice(b));

  const smartphones = allBuyable
    .filter((p) => isSmartphone(p) && getPrice(p) >= 250)
    .sort((a, b) => getPrice(a) - getPrice(b));

  const tablets = allBuyable
    .filter((p) => isTablet(p) && getPrice(p) >= 200)
    .sort((a, b) => getPrice(a) - getPrice(b));

  const gpus = allBuyable
    .filter((p) => isGpu(p) && getPrice(p) >= 150)
    .sort((a, b) => getPrice(a) - getPrice(b));

  const network = allBuyable
    .filter((p) => isNetwork(p) && getPrice(p) >= 30)
    .sort((a, b) => getPrice(a) - getPrice(b));

  const storage = allBuyable
    .filter((p) => isStorage(p) && getPrice(p) >= 30)
    .sort((a, b) => getPrice(a) - getPrice(b));

  const topDeals = uniqueFamilies(allBuyable)
    .filter((p) => getPrice(p) >= 250 && !isAccessory(p))
    .sort((a, b) => getPrice(a) - getPrice(b));

  const accessories = allBuyable
    .filter((p) => isAccessory(p) && getPrice(p) <= 300)
    .sort((a, b) => getPrice(a) - getPrice(b));

  const immediatelyAvailable = uniqueFamilies(allBuyable)
    .filter((p) => getStockQty(p) >= 2 && getPrice(p) >= 250)
    .sort((a, b) => getStockQty(b) - getStockQty(a));

  const heroProducts = [
    laptops[0],
    monitors[0],
    smartphones[0],
    gpus[0],
  ].filter(Boolean) as Product[];

  const categoryShowcase: Record<string, Product | undefined> = {
    Computer: pickShowcaseProduct(allBuyable, isLaptop),
    "PC-Komponenten": pickShowcaseProduct(allBuyable, isGpu),
    Peripherie: pickShowcaseProduct(allBuyable, isMonitor),
    Netzwerk: pickShowcaseProduct(allBuyable, isNetwork),
    Mobile: pickShowcaseProduct(allBuyable, isSmartphone),
    Datenspeicher: pickShowcaseProduct(allBuyable, isStorage),
  };

  return (
    <main className="bg-white">
      <section className="relative overflow-hidden border-b border-neutral-200 bg-gradient-to-br from-neutral-50 via-white to-red-50">
        <div className="absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-red-100 blur-3xl" />
        <div className="absolute -bottom-48 left-0 h-[30rem] w-[30rem] rounded-full bg-neutral-200/80 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:py-20">
          <div>
            <div className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-black text-red-700 shadow-sm ring-1 ring-red-100">
              🇨🇭 IUMATEC Schweiz · über {allBuyable.length.toLocaleString("de-CH")} Produkte
            </div>

            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[0.95] tracking-tight text-neutral-950 md:text-7xl">
              Technik für Business, Gaming und Alltag.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-600">
              Computer, Komponenten, Monitore, Smartphones, Netzwerk und Zubehör.
              Schnell verfügbar, transparent kalkuliert und mit sicherem Shopify Checkout.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/produkte"
                className="rounded-2xl bg-red-600 px-8 py-4 text-base font-black text-white shadow-sm transition hover:bg-red-700"
              >
                Jetzt einkaufen
              </Link>

              <Link
                href="/produkte?sort=price-asc"
                className="rounded-2xl border border-neutral-300 bg-white px-8 py-4 text-base font-black text-neutral-950 transition hover:bg-neutral-50"
              >
                Angebote entdecken
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {quickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-black text-neutral-800 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {["CH Versand", "MWST inklusive", "Sicherer Checkout", "Support innerhalb 24h"].map(
                (item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-neutral-200 bg-white/90 px-4 py-3 text-sm font-black text-neutral-800 shadow-sm"
                  >
                    ✓ {item}
                  </div>
                )
              )}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {heroProducts.slice(0, 4).map((product) => (
              <HeroProduct key={getProductSlug(product)} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <SectionHeader
          eyebrow="Kategorien"
          title="Alles für dein Setup"
          subtitle="Schnell zu den wichtigsten Produktwelten der IUMATEC."
          href="/produkte"
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {mainCategories.map((item) => (
            <CategoryCard
              key={item.title}
              {...item}
              product={categoryShowcase[item.title]}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <SectionHeader
          eyebrow="Top Auswahl"
          title="Aktuelle Angebote"
          subtitle="Sofort kaufbare Produkte mit starken Preisen."
          href="/produkte?sort=price-asc"
        />
        <ProductCarousel products={topDeals} />
      </section>

      <section className="bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <SectionHeader
            eyebrow="Computer"
            title="Business Laptops"
            subtitle="HP, Dell, Lenovo, Apple und weitere Geräte für Arbeit und Office."
            href="/produkte?category=Computer&subcategory=Laptops"
          />
          <ProductCarousel products={laptops} />
        </div>
      </section>

      {monitors.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <SectionHeader
            eyebrow="Peripherie"
            title="Monitore"
            subtitle="Displays für Homeoffice, Gaming und produktive Arbeitsplätze."
            href="/produkte?category=Peripherie&subcategory=Monitore"
          />
          <ProductCarousel products={monitors} uniqueFamily={false} />
        </section>
      )}

      <section className="bg-neutral-50">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <SectionHeader
            eyebrow="Mobile"
            title="Smartphones"
            subtitle="Apple, Samsung, Xiaomi und weitere mobile Geräte."
            href="/produkte?category=Mobile&subcategory=Smartphones"
          />
          <ProductCarousel products={smartphones} />
        </div>
      </section>

      {tablets.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <SectionHeader
            eyebrow="Mobile"
            title="Tablets"
            subtitle="iPad, Galaxy Tab und Tablets für Arbeit, Schule und Freizeit."
            href="/produkte?category=Mobile&subcategory=Tablets"
          />
          <ProductCarousel products={tablets} />
        </section>
      )}

      {gpus.length > 0 && (
        <section className="bg-neutral-50">
          <div className="mx-auto max-w-7xl px-4 py-12">
            <SectionHeader
              eyebrow="PC-Komponenten"
              title="Grafikkarten"
              subtitle="GPUs für Gaming, Workstation und professionelle Anwendungen."
              href="/produkte?category=PC-Komponenten&subcategory=Grafikkarten"
            />
            <ProductCarousel products={gpus} uniqueFamily={false} />
          </div>
        </section>
      )}

      {network.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <SectionHeader
            eyebrow="Netzwerk"
            title="Netzwerk & WLAN"
            subtitle="Router, Switches und WLAN Mesh für stabile Verbindungen."
            href="/produkte?category=Netzwerk"
          />
          <ProductCarousel products={network} />
        </section>
      )}

      {storage.length > 0 && (
        <section className="bg-neutral-50">
          <div className="mx-auto max-w-7xl px-4 py-12">
            <SectionHeader
              eyebrow="Datenspeicher"
              title="SSD, HDD & NAS"
              subtitle="Speicherlösungen für PCs, Server, Backups und Daten."
              href="/produkte?category=Datenspeicher"
            />
            <ProductCarousel products={storage} />
          </div>
        </section>
      )}

      {accessories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <SectionHeader
            eyebrow="Zubehör"
            title="Zubehör unter CHF 300"
            subtitle="Adapter, Kabel, Dockingstationen, Tastaturen, Mäuse und mehr."
            href="/produkte?category=Zubehör"
          />
          <ProductCarousel products={accessories} uniqueFamily={false} />
        </section>
      )}

      <section className="bg-neutral-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-[1fr_1.4fr] lg:items-center">
          <div>
            <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white">
              Sofort lieferbar
            </div>

            <h2 className="mt-5 max-w-xl text-4xl font-black">
              Technik mit Lagerbestand.
            </h2>

            <p className="mt-4 max-w-xl text-neutral-300">
              Produkte mit verfügbarem Bestand, transparenter Preisstruktur und
              sicherem Checkout.
            </p>

            <Link
              href="/produkte?stock=available"
              className="mt-8 inline-flex rounded-2xl bg-red-600 px-7 py-4 font-black text-white transition hover:bg-red-700"
            >
              Sofort verfügbare Produkte ansehen
            </Link>
          </div>

          <ProductCarousel products={immediatelyAvailable} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <SectionHeader
          eyebrow="Warum IUMATEC?"
          title="Schweizer Shop. Klare Preise. Sicherer Checkout."
          subtitle="Die wichtigsten Punkte für Vertrauen und saubere Bestellung."
          href="/versand"
        />

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            ["🇨🇭", "CH Versand", "Lieferung in der Schweiz mit klaren Konditionen."],
            ["🔒", "Sichere Zahlung", "Checkout über Shopify mit Kreditkarte, TWINT und mehr."],
            ["✅", "Originalware", "Produkte von offiziellen Distributoren und Marken."],
            ["💬", "Support", "Persönlicher Support innerhalb von 24 Stunden."],
          ].map(([icon, title, text]) => (
            <div
              key={title}
              className="rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-sm"
            >
              <div className="text-4xl">{icon}</div>
              <div className="mt-4 text-xl font-black text-neutral-950">
                {title}
              </div>
              <p className="mt-2 text-sm leading-6 text-neutral-500">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}