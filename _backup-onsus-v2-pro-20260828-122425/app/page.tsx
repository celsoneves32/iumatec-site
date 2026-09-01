import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  Cpu,
  HardDrive,
  Laptop,
  Monitor,
  ShieldCheck,
  Smartphone,
  Truck,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import ProductCard from "@/components/ProductCard";
import HomepageCarousel from "@/components/HomepageCarousel";
import {
  queryCatalogProducts,
  type CatalogQuery,
  type CatalogResponse,
  type Product,
} from "@/lib/supabaseCatalog";

export const revalidate = 300;

const EMPTY: CatalogResponse = {
  products: [],
  total: 0,
  catalogTotal: 0,
  offset: 0,
  limit: 0,
  hasMore: false,
  facets: {
    categories: [],
    subcategories: [],
    brands: [],
    available: 0,
    minPrice: 0,
    maxPrice: 0,
  },
};

async function safeCatalog(query: CatalogQuery): Promise<CatalogResponse> {
  try {
    return await queryCatalogProducts(query);
  } catch (error) {
    console.error("Homepage catalog query failed:", query, error);
    return EMPTY;
  }
}

function uniqueProducts(products: Product[]) {
  const seen = new Set<string>();

  return products.filter((product) => {
    const key = String(product.slug || product.sku || "").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isCardReady(product?: Product | null): product is Product {
  return Boolean(
    product?.slug &&
      product?.title &&
      Number(product?.price || 0) > 0 &&
      product?.image,
  );
}

function cardProduct(product: Product) {
  return {
    sku: product.sku,
    slug: product.slug,
    title: product.title,
    brand: product.brand,
    price: Number(product.price || 0),
    image: product.image ?? null,
    category: product.category,
    subcategory: product.subcategory,
    inStock: product.inStock,
    stockQty: product.stockQty,
    merchandiseId: product.merchandiseId || product.shopifyVariantId || null,
    productHandle: product.shopifyProductHandle || product.slug,
    energyLabel: product.energyLabel,
  };
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
  }).format(Number(price || 0));
}

type CategoryTile = {
  title: string;
  subtitle: string;
  href: string;
  icon: LucideIcon;
  product?: Product;
};

function CategoryTile({
  title,
  subtitle,
  href,
  icon: Icon,
  product,
}: CategoryTile) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 transition duration-300 hover:border-neutral-300 hover:shadow-[0_16px_40px_rgba(0,0,0,0.07)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800 transition group-hover:bg-red-50 group-hover:text-red-600">
            <Icon size={20} strokeWidth={1.8} />
          </div>
          <h3 className="mt-4 text-lg font-black tracking-tight text-neutral-950">
            {title}
          </h3>
          <p className="mt-1.5 max-w-[220px] text-sm leading-5 text-neutral-500">
            {subtitle}
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-black text-neutral-900 transition group-hover:text-red-600">
            Entdecken <ArrowRight size={15} />
          </span>
        </div>

        <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-neutral-50 p-3 sm:h-32 sm:w-32">
          {product?.image ? (
            <img
              src={product.image}
              alt={product.title}
              loading="lazy"
              decoding="async"
              className="max-h-full max-w-full object-contain transition duration-300 group-hover:scale-105"
            />
          ) : (
            <Icon size={38} className="text-neutral-200" strokeWidth={1.3} />
          )}
        </div>
      </div>
    </Link>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  href,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  href: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <div className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
          {eyebrow}
        </div>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-neutral-950 md:text-3xl">
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500 md:text-base">
          {subtitle}
        </p>
      </div>

      <Link
        href={href}
        className="hidden shrink-0 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-black text-neutral-800 transition hover:border-neutral-300 hover:bg-neutral-50 sm:inline-flex"
      >
        Alle ansehen <ArrowRight size={15} />
      </Link>
    </div>
  );
}

function ProductRail({ products }: { products: Product[] }) {
  const items = uniqueProducts(products).filter(isCardReady).slice(0, 16);
  if (!items.length) return null;

  return (
    <HomepageCarousel>
      {items.map((product) => (
        <div key={product.slug} className="w-[270px] shrink-0 sm:w-[285px]">
          <ProductCard product={cardProduct(product)} />
        </div>
      ))}
    </HomepageCarousel>
  );
}

function HeroProduct({ product }: { product?: Product }) {
  if (!isCardReady(product)) {
    return (
      <div className="flex h-full min-h-[380px] items-center justify-center rounded-3xl bg-neutral-100 text-neutral-300">
        <Laptop size={90} strokeWidth={1} />
      </div>
    );
  }

  return (
    <Link
      href={`/produkte/${product.slug}`}
      className="group relative flex min-h-[390px] overflow-hidden rounded-3xl bg-[#f3f5f7] p-7 sm:p-9"
    >
      <div className="relative z-10 flex max-w-[52%] flex-col justify-center">
        <span className="w-fit rounded-md bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-red-600 shadow-sm">
          IUMATEC Empfehlung
        </span>
        <div className="mt-5 text-xs font-extrabold uppercase tracking-[0.12em] text-neutral-500">
          {product.brand || "IUMATEC"}
        </div>
        <h1 className="mt-2 line-clamp-4 text-3xl font-black leading-[1.04] tracking-tight text-neutral-950 sm:text-4xl lg:text-5xl">
          {product.title}
        </h1>
        <div className="mt-5 text-2xl font-black text-neutral-950">
          {formatPrice(product.price)}
        </div>
        <div className="mt-1 text-xs text-neutral-500">inkl. MWST</div>
        <span className="mt-6 inline-flex w-fit items-center gap-2 rounded-xl bg-neutral-950 px-5 py-3 text-sm font-black text-white transition group-hover:bg-red-600">
          Produkt ansehen <ArrowRight size={16} />
        </span>
      </div>

      <div className="absolute bottom-4 right-2 top-4 flex w-[50%] items-center justify-center p-5 sm:right-6 sm:w-[48%]">
        <img
          src={product.image!}
          alt={product.title}
          className="max-h-full max-w-full object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.08)] transition duration-500 group-hover:scale-105"
        />
      </div>
    </Link>
  );
}

function SidePromo({
  product,
  eyebrow,
  fallback,
}: {
  product?: Product;
  eyebrow: string;
  fallback: string;
}) {
  if (!isCardReady(product)) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="text-xs font-black uppercase tracking-[0.15em] text-red-600">
          {eyebrow}
        </div>
        <div className="mt-2 text-lg font-black text-neutral-950">{fallback}</div>
      </div>
    );
  }

  return (
    <Link
      href={`/produkte/${product.slug}`}
      className="group grid min-h-[184px] grid-cols-[1fr_118px] gap-3 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-300 hover:shadow-lg"
    >
      <div className="flex min-w-0 flex-col justify-center">
        <div className="text-[10px] font-black uppercase tracking-[0.15em] text-red-600">
          {eyebrow}
        </div>
        <div className="mt-2 line-clamp-3 text-base font-black leading-snug text-neutral-950">
          {product.title}
        </div>
        <div className="mt-3 text-sm font-black text-neutral-900">
          {formatPrice(product.price)}
        </div>
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-black text-neutral-500 transition group-hover:text-red-600">
          Mehr erfahren <ArrowRight size={13} />
        </span>
      </div>

      <div className="flex items-center justify-center rounded-xl bg-neutral-50 p-2">
        <img
          src={product.image!}
          alt={product.title}
          loading="lazy"
          className="max-h-full max-w-full object-contain transition duration-300 group-hover:scale-105"
        />
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const [
    all,
    laptops,
    gpus,
    monitors,
    smartphones,
    network,
    storage,
    offers,
  ] = await Promise.all([
    safeCatalog({ limit: 1 }),
    safeCatalog({
      category: "Computer",
      subcategory: "Laptops",
      inStock: true,
      minPrice: 300,
      limit: 16,
      sort: "featured",
    }),
    safeCatalog({
      category: "PC-Komponenten",
      subcategory: "Grafikkarten",
      inStock: true,
      minPrice: 150,
      limit: 16,
      sort: "featured",
    }),
    safeCatalog({
      category: "Peripherie",
      subcategory: "Monitore",
      inStock: true,
      minPrice: 80,
      limit: 16,
      sort: "featured",
    }),
    safeCatalog({
      category: "Mobile",
      subcategory: "Smartphones",
      inStock: true,
      minPrice: 180,
      limit: 16,
      sort: "featured",
    }),
    safeCatalog({
      category: "Netzwerk",
      inStock: true,
      minPrice: 30,
      limit: 16,
      sort: "featured",
    }),
    safeCatalog({
      category: "Datenspeicher",
      inStock: true,
      minPrice: 30,
      limit: 16,
      sort: "featured",
    }),
    safeCatalog({
      inStock: true,
      minPrice: 50,
      maxPrice: 500,
      limit: 16,
      sort: "price-asc",
    }),
  ]);

  const heroProduct =
    laptops.products.find(isCardReady) ||
    smartphones.products.find(isCardReady) ||
    monitors.products.find(isCardReady) ||
    gpus.products.find(isCardReady);

  const monitorPromo = monitors.products.find(isCardReady);
  const gpuPromo = gpus.products.find(isCardReady);

  const categoryTiles: CategoryTile[] = [
    {
      title: "Computer",
      subtitle: "Laptops, Desktop-PCs und Mini PCs",
      href: "/produkte?category=Computer",
      icon: Laptop,
      product: laptops.products.find(isCardReady),
    },
    {
      title: "PC-Komponenten",
      subtitle: "Grafikkarten, RAM, Mainboards und mehr",
      href: "/produkte?category=PC-Komponenten",
      icon: Cpu,
      product: gpus.products.find(isCardReady),
    },
    {
      title: "Peripherie",
      subtitle: "Monitore, EingabegerÃ¤te und ZubehÃ¶r",
      href: "/produkte?category=Peripherie",
      icon: Monitor,
      product: monitors.products.find(isCardReady),
    },
    {
      title: "Mobile",
      subtitle: "Smartphones, Tablets und ZubehÃ¶r",
      href: "/produkte?category=Mobile",
      icon: Smartphone,
      product: smartphones.products.find(isCardReady),
    },
    {
      title: "Netzwerk",
      subtitle: "Router, Switches und WLAN Mesh",
      href: "/produkte?category=Netzwerk",
      icon: Wifi,
      product: network.products.find(isCardReady),
    },
    {
      title: "Datenspeicher",
      subtitle: "SSD, HDD, NAS und externe Speicher",
      href: "/produkte?category=Datenspeicher",
      icon: HardDrive,
      product: storage.products.find(isCardReady),
    },
  ];

  const topSelection = uniqueProducts([
    ...laptops.products.slice(0, 4),
    ...monitors.products.slice(0, 4),
    ...smartphones.products.slice(0, 4),
    ...gpus.products.slice(0, 4),
  ]);

  return (
    <main className="bg-white text-neutral-950">
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto grid max-w-[1440px] gap-4 px-4 py-5 xl:grid-cols-[245px_minmax(0,1fr)_310px] xl:px-6 xl:py-6">
          <aside className="hidden overflow-hidden rounded-2xl border border-neutral-200 bg-white xl:block">
            <div className="border-b border-neutral-200 px-5 py-4 text-sm font-black text-neutral-950">
              Beliebte Kategorien
            </div>
            <nav className="p-2">
              {categoryTiles.map(({ title, href, icon: Icon }) => (
                <Link
                  key={title}
                  href={href}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-neutral-700 transition hover:bg-neutral-50 hover:text-red-600"
                >
                  <Icon size={18} strokeWidth={1.8} />
                  <span className="flex-1">{title}</span>
                  <ArrowRight size={14} className="text-neutral-300" />
                </Link>
              ))}
              <Link
                href="/produkte"
                className="mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-black text-red-600 transition hover:bg-red-50"
              >
                <Boxes size={18} /> Alle Produkte
              </Link>
            </nav>
          </aside>

          <HeroProduct product={heroProduct} />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <SidePromo
              product={monitorPromo}
              eyebrow="Display & Office"
              fallback="Monitore fÃ¼r Arbeit und Gaming"
            />
            <SidePromo
              product={gpuPromo}
              eyebrow="Gaming & Performance"
              fallback="PC-Komponenten entdecken"
            />
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 divide-x divide-y divide-neutral-200 px-4 sm:grid-cols-4 sm:divide-y-0 xl:px-6">
          {[
            {
              icon: Truck,
              title: "Schneller CH-Versand",
              text: "Standardversand ab CHF 49.â€“ gratis",
            },
            {
              icon: ShieldCheck,
              title: "Sicher einkaufen",
              text: "GeschÃ¼tzter Checkout",
            },
            {
              icon: BadgeCheck,
              title: "Klare Preise",
              text: "Alle Preise inkl. MWST",
            },
            {
              icon: Boxes,
              title:
                Number(all.catalogTotal || all.total || 0) > 0
                  ? `${Number(all.catalogTotal || all.total || 0).toLocaleString("de-CH")} Produkte`
                  : "Grosses Sortiment",
              text: "Technik fÃ¼r Privat & Business",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-center gap-3 px-3 py-5 sm:px-5">
              <Icon size={22} strokeWidth={1.7} className="shrink-0 text-red-600" />
              <div>
                <div className="text-sm font-black text-neutral-900">{title}</div>
                <div className="mt-0.5 text-[11px] leading-4 text-neutral-500 sm:text-xs">
                  {text}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 py-12 xl:px-6">
        <SectionHeading
          eyebrow="Kategorien"
          title="Technik nach deinen BedÃ¼rfnissen"
          subtitle="Direkter Einstieg in die wichtigsten Bereiche der IUMATEC."
          href="/produkte"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categoryTiles.map((tile) => (
            <CategoryTile key={tile.title} {...tile} />
          ))}
        </div>
      </section>

      {topSelection.length > 0 ? (
        <section className="border-y border-neutral-200 bg-neutral-50">
          <div className="mx-auto max-w-[1440px] px-4 py-12 xl:px-6">
            <SectionHeading
              eyebrow="Top Auswahl"
              title="Aktuell gefragt"
              subtitle="Eine kuratierte Auswahl aus Computer, Mobile, Displays und Komponenten."
              href="/produkte"
            />
            <ProductRail products={topSelection} />
          </div>
        </section>
      ) : null}

      {offers.products.length > 0 ? (
        <section className="mx-auto max-w-[1440px] px-4 py-12 xl:px-6">
          <SectionHeading
            eyebrow="Preisvorteile"
            title="Gute Technik. Gute Preise."
            subtitle="Sofort verfÃ¼gbare Produkte mit attraktiven Preisen."
            href="/produkte?sort=price-asc"
          />
          <ProductRail products={offers.products} />
        </section>
      ) : null}

      {laptops.products.length > 0 ? (
        <section className="border-y border-neutral-200 bg-neutral-50">
          <div className="mx-auto max-w-[1440px] px-4 py-12 xl:px-6">
            <SectionHeading
              eyebrow="Computer"
              title="Laptops fÃ¼r Arbeit und Alltag"
              subtitle="LeistungsfÃ¤hige GerÃ¤te fÃ¼r Business, Homeoffice und unterwegs."
              href="/produkte?category=Computer&subcategory=Laptops"
            />
            <ProductRail products={laptops.products} />
          </div>
        </section>
      ) : null}

      {monitors.products.length > 0 ? (
        <section className="mx-auto max-w-[1440px] px-4 py-12 xl:px-6">
          <SectionHeading
            eyebrow="Peripherie"
            title="Monitore fÃ¼r jedes Setup"
            subtitle="Displays fÃ¼r produktives Arbeiten, Content und Gaming."
            href="/produkte?category=Peripherie&subcategory=Monitore"
          />
          <ProductRail products={monitors.products} />
        </section>
      ) : null}
    </main>
  );
}

