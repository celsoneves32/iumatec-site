import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  ChevronRight,
  Cpu,
  HardDrive,
  Headphones,
  House,
  Laptop,
  Monitor,
  Printer,
  ShieldCheck,
  Smartphone,
  Truck,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";

import ProductCard from "@/components/ProductCard";
import HomepageCarousel from "@/components/HomepageCarousel";
import HomeCategoryGrid from "@/components/HomeCategoryGrid";

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

async function safeCatalog(
  query: CatalogQuery,
): Promise<CatalogResponse> {
  try {
    return await queryCatalogProducts(query);
  } catch (error) {
    console.error(
      "Homepage catalog query failed:",
      query,
      error,
    );

    return EMPTY;
  }
}

function uniqueProducts(products: Product[]) {
  const seen = new Set<string>();

  return products.filter((product) => {
    const key = String(
      product.slug || product.sku || "",
    ).trim();

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}

function isCardReady(
  product?: Product | null,
): product is Product {
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
    merchandiseId:
      product.merchandiseId ||
      product.shopifyVariantId ||
      null,
    productHandle:
      product.shopifyProductHandle ||
      product.slug,
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
  tone?: "neutral" | "red";
};

function CategoryTile({
  title,
  subtitle,
  href,
  icon: Icon,
  product,
  tone = "neutral",
}: CategoryTile) {
  return (
    <Link
      href={href}
      className="
        group
        relative
        min-h-[180px]
        overflow-hidden
        rounded-[22px]
        border
        border-neutral-200
        bg-white
        p-5
        transition
        duration-300
        hover:-translate-y-0.5
        hover:border-neutral-300
        hover:shadow-[0_18px_50px_rgba(15,23,42,0.08)]
      "
    >
      <div
        className={`
          absolute
          inset-x-0
          top-0
          h-1
          ${
            tone === "red"
              ? "bg-red-600"
              : "bg-neutral-950"
          }
        `}
      />

      <div className="relative z-10 max-w-[58%]">
        <div
          className={`
            inline-flex
            h-10
            w-10
            items-center
            justify-center
            rounded-xl
            ${
              tone === "red"
                ? "bg-red-50 text-red-600"
                : "bg-neutral-100 text-neutral-800"
            }
          `}
        >
          <Icon
            size={19}
            strokeWidth={1.9}
          />
        </div>

        <h3 className="mt-4 text-[17px] font-black tracking-tight text-neutral-950">
          {title}
        </h3>

        <p className="mt-1.5 text-xs leading-5 text-neutral-500">
          {subtitle}
        </p>

        <span className="mt-4 inline-flex items-center gap-1 text-xs font-black text-neutral-900 transition group-hover:text-red-600">
          Entdecken

          <ArrowRight size={13} />
        </span>
      </div>

      <div className="absolute bottom-1 right-1 flex h-[118px] w-[118px] items-center justify-center rounded-full bg-neutral-50 p-4 sm:h-[126px] sm:w-[126px]">
        {product?.image ? (
          <img
            src={product.image}
            alt={product.title}
            loading="lazy"
            decoding="async"
            className="max-h-full max-w-full object-contain transition duration-500 group-hover:scale-105"
          />
        ) : (
          <Icon
            size={38}
            className="text-neutral-200"
            strokeWidth={1.3}
          />
        )}
      </div>
    </Link>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  href,
  linkLabel = "Alle ansehen",
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  href: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-5">
      <div>
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-red-600">
          {eyebrow}
        </div>

        <h2 className="mt-2 text-2xl font-black tracking-[-0.025em] text-neutral-950 md:text-[32px]">
          {title}
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500 md:text-[15px]">
          {subtitle}
        </p>
      </div>

      <Link
        href={href}
        className="
          hidden
          shrink-0
          items-center
          gap-2
          rounded-xl
          border
          border-neutral-200
          bg-white
          px-4
          py-2.5
          text-sm
          font-black
          text-neutral-800
          transition
          hover:border-neutral-950
          hover:bg-neutral-950
          hover:text-white
          sm:inline-flex
        "
      >
        {linkLabel}

        <ArrowRight size={15} />
      </Link>
    </div>
  );
}

function ProductRail({
  products,
}: {
  products: Product[];
}) {
  const items = uniqueProducts(products)
    .filter(isCardReady)
    .slice(0, 16);

  if (!items.length) {
    return null;
  }

  return (
    <HomepageCarousel>
      {items.map((product) => (
        <div
          key={product.slug}
          className="w-[246px] shrink-0 snap-start sm:w-[260px] lg:w-[272px]"
        >
          <ProductCard
            product={cardProduct(product)}
          />
        </div>
      ))}
    </HomepageCarousel>
  );
}

/* =========================================================
   HERO PRINCIPAL
   Só o botão "Jetzt entdecken" é clicável
   ========================================================= */

function MarketingHero() {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
      <img
        src="/images/home/iumatec-hero-technik.png"
        alt="IUMATEC Schweiz – Technik. Schnell. Zuverlässig."
        className="block h-auto w-full"
      />

      <Link
        href="/produkte"
        aria-label="Jetzt entdecken"
        title="Jetzt entdecken"
        className="
          absolute
          left-[5.5%]
          top-[62%]
          h-[11%]
          w-[21%]
          cursor-pointer
          rounded-xl
          focus-visible:ring-4
          focus-visible:ring-red-300
        "
      >
        <span className="sr-only">
          Jetzt entdecken
        </span>
      </Link>
    </div>
  );
}

/* =========================================================
   BANNERS PC + SMART HOME
   Só a área do botão desenhado é clicável
   ========================================================= */

function MarketingPromo({
  href,
  image,
  alt,
  buttonLabel,
}: {
  href: string;
  image: string;
  alt: string;
  buttonLabel: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-neutral-200 bg-white shadow-[0_14px_42px_rgba(15,23,42,0.055)]">
      <img
        src={image}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="block h-auto w-full"
      />

      <Link
        href={href}
        aria-label={buttonLabel}
        title={buttonLabel}
        className="
          absolute
          left-[5.5%]
          top-[62%]
          h-[12%]
          w-[21%]
          cursor-pointer
          rounded-xl
          focus-visible:ring-4
          focus-visible:ring-red-300
        "
      >
        <span className="sr-only">
          {buttonLabel}
        </span>
      </Link>
    </div>
  );
}

/* =========================================================
   COMPONENTES EXISTENTES
   ========================================================= */

function HeroProduct({
  product,
}: {
  product?: Product;
}) {
  if (!isCardReady(product)) {
    return (
      <div className="flex min-h-[490px] items-center justify-center rounded-[28px] bg-neutral-100 text-neutral-300">
        <Laptop
          size={92}
          strokeWidth={1}
        />
      </div>
    );
  }

  return (
    <Link
      href={`/produkte/${product.slug}`}
      className="group relative grid min-h-[490px] overflow-hidden rounded-[28px] bg-[#f5f5f3] lg:grid-cols-[1.02fr_.98fr]"
    >
      <div className="relative z-10 flex flex-col justify-center p-7 sm:p-10 lg:p-12">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-red-100 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-red-600 shadow-sm">
          <Zap
            size={12}
            fill="currentColor"
          />

          IUMATEC Empfehlung
        </span>

        <div className="mt-7 text-[11px] font-black uppercase tracking-[0.15em] text-neutral-500">
          {product.brand || "IUMATEC"}
        </div>

        <h1 className="mt-2 line-clamp-4 max-w-[760px] text-[38px] font-black leading-[1.01] tracking-[-0.045em] text-neutral-950 sm:text-[48px] lg:text-[54px]">
          {product.title}
        </h1>

        <div className="mt-6 flex flex-wrap items-end gap-x-4 gap-y-2">
          <div className="text-[30px] font-black tracking-tight text-neutral-950">
            {formatPrice(product.price)}
          </div>

          <div className="pb-1 text-xs font-semibold text-neutral-500">
            inkl. MWST
          </div>
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3.5 text-sm font-black text-white transition group-hover:bg-red-700">
            Produkt ansehen

            <ArrowRight size={16} />
          </span>

          <span className="inline-flex items-center rounded-xl border border-neutral-300 bg-white px-4 py-3.5 text-xs font-black text-neutral-700">
            Schweizer Sortiment
          </span>
        </div>
      </div>

      <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden p-8 sm:p-12">
        <div className="absolute h-[360px] w-[360px] rounded-full bg-white/90 shadow-[0_25px_80px_rgba(15,23,42,.07)] sm:h-[420px] sm:w-[420px]" />

        <img
          src={product.image!}
          alt={product.title}
          className="relative z-10 max-h-[360px] max-w-[86%] object-contain drop-shadow-[0_22px_35px_rgba(15,23,42,.12)] transition duration-500 group-hover:scale-[1.04]"
        />
      </div>
    </Link>
  );
}

function PromoCard({
  product,
  eyebrow,
  title,
  icon: Icon,
}: {
  product?: Product;
  eyebrow: string;
  title: string;
  icon: LucideIcon;
}) {
  const href = product?.slug
    ? `/produkte/${product.slug}`
    : "/produkte";

  return (
    <Link
      href={href}
      className="group relative grid min-h-[235px] overflow-hidden rounded-[24px] border border-neutral-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
    >
      <div className="relative z-10 max-w-[58%]">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800">
          <Icon size={18} />
        </div>

        <div className="mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-red-600">
          {eyebrow}
        </div>

        <div className="mt-2 line-clamp-3 text-xl font-black leading-tight tracking-tight text-neutral-950">
          {product?.title || title}
        </div>

        {product ? (
          <div className="mt-3 text-sm font-black text-neutral-900">
            {formatPrice(product.price)}
          </div>
        ) : null}

        <span className="mt-4 inline-flex items-center gap-1 text-xs font-black text-neutral-600 transition group-hover:text-red-600">
          Mehr erfahren

          <ArrowRight size={13} />
        </span>
      </div>

      <div className="absolute bottom-3 right-3 flex h-[145px] w-[145px] items-center justify-center rounded-full bg-neutral-50 p-4">
        {product?.image ? (
          <img
            src={product.image}
            alt={product.title}
            loading="lazy"
            className="max-h-full max-w-full object-contain transition duration-500 group-hover:scale-105"
          />
        ) : (
          <Icon
            size={42}
            strokeWidth={1.25}
            className="text-neutral-200"
          />
        )}
      </div>
    </Link>
  );
}

function FeatureStrip({
  catalogTotal,
}: {
  catalogTotal: number;
}) {
  const totalLabel =
    catalogTotal > 0
      ? `${catalogTotal.toLocaleString(
          "de-CH",
        )} Produkte`
      : "Grosses Sortiment";

  const features = [
    {
      icon: Truck,
      title: "Versand Schweiz",
      text: "Standardversand ab CHF 49.– gratis",
    },
    {
      icon: ShieldCheck,
      title: "Sicher einkaufen",
      text: "Geschützter Checkout",
    },
    {
      icon: BadgeCheck,
      title: "Transparente Preise",
      text: "Alle Preise inkl. MWST",
    },
    {
      icon: Boxes,
      title: totalLabel,
      text: "Technik für Privat & Business",
    },
  ];

  return (
    <section className="border-y border-neutral-200 bg-white">
      <div className="mx-auto grid max-w-[1440px] grid-cols-2 divide-x divide-y divide-neutral-200 px-4 sm:grid-cols-4 sm:divide-y-0 xl:px-6">
        {features.map(
          ({
            icon: Icon,
            title,
            text,
          }) => (
            <div
              key={title}
              className="flex min-h-[92px] items-center gap-3 px-3 py-5 sm:px-5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <Icon
                  size={20}
                  strokeWidth={1.8}
                />
              </div>

              <div>
                <div className="text-sm font-black text-neutral-900">
                  {title}
                </div>

                <div className="mt-0.5 text-[11px] leading-4 text-neutral-500 sm:text-xs">
                  {text}
                </div>
              </div>
            </div>
          ),
        )}
      </div>
    </section>
  );
}

/* =========================================================
   HOMEPAGE
   ========================================================= */

export default async function HomePage() {
  const [
    all,
    laptops,
    gpus,
    monitors,
    smartphones,
    network,
    storage,
    office,
    smartHome,
    offers,
  ] = await Promise.all([
    safeCatalog({
      limit: 1,
    }),

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
      inStock: true,
      minPrice: 120,
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
      q: "Drucker",
      inStock: true,
      minPrice: 40,
      limit: 16,
      sort: "featured",
    }),

    safeCatalog({
      category: "Smart Home",
      inStock: true,
      minPrice: 20,
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

  const categoryTiles: CategoryTile[] = [
    {
      title: "Computer",
      subtitle:
        "Laptops, Desktop-PCs und Mini PCs",
      href: "/produkte?category=Computer",
      icon: Laptop,
      product:
        laptops.products.find(isCardReady),
      tone: "red",
    },

    {
      title: "PC-Komponenten",
      subtitle:
        "Komponenten, Kabel, Gaming und mehr",
      href:
        "/produkte?category=PC-Komponenten",
      icon: Cpu,
      product:
        gpus.products.find(isCardReady),
    },

    {
      title: "Peripherie",
      subtitle:
        "Monitore, Eingabegeräte und Zubehör",
      href:
        "/produkte?category=Peripherie",
      icon: Monitor,
      product:
        monitors.products.find(isCardReady),
    },

    {
      title: "Mobile",
      subtitle:
        "Smartphones, Tablets und Zubehör",
      href: "/produkte?category=Mobile",
      icon: Smartphone,
      product:
        smartphones.products.find(
          isCardReady,
        ),
      tone: "red",
    },

    {
      title: "Netzwerk",
      subtitle:
        "Router, Switches und Netzwerktechnik",
      href:
        "/produkte?category=Netzwerk",
      icon: Wifi,
      product:
        network.products.find(isCardReady),
    },

    {
      title: "Datenspeicher",
      subtitle:
        "SSD, HDD, NAS und externe Speicher",
      href:
        "/produkte?category=Datenspeicher",
      icon: HardDrive,
      product:
        storage.products.find(isCardReady),
      tone: "red",
    },

    {
      title: "Office & Business",
      subtitle:
        "Drucker, Verbrauchsmaterial und Büro-Technik",
      href: "/produkte?q=Drucker",
      icon: Printer,
      product:
        office.products.find(isCardReady),
    },

    {
      title: "Smart Home",
      subtitle:
        "Sicherheit, Beleuchtung und Gebäudetechnik",
      href:
        "/produkte?category=Smart%20Home",
      icon: House,
      product:
        smartHome.products.find(isCardReady),
    },
  ];

  const topSelection = uniqueProducts([
    ...laptops.products.slice(0, 4),
    ...monitors.products.slice(0, 4),
    ...smartphones.products.slice(0, 4),
    ...gpus.products.slice(0, 4),
  ]);

  const catalogTotal = Number(
    all.catalogTotal ||
      all.total ||
      0,
  );

  return (
    <main className="bg-[#f7f7f6] text-neutral-950">
      {/* ================= HERO ================= */}

      <section className="bg-white">
        <div className="mx-auto max-w-[1440px] px-4 py-5 xl:px-6 xl:py-6">
          <div className="grid gap-4 xl:grid-cols-[242px_minmax(0,1fr)]">
            <aside className="hidden overflow-hidden rounded-[24px] border border-neutral-200 bg-white xl:block">
              <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-red-600">
                    Sortiment
                  </div>

                  <div className="mt-1 text-sm font-black text-neutral-950">
                    Beliebte Kategorien
                  </div>
                </div>

                <Boxes
                  size={18}
                  className="text-neutral-400"
                />
              </div>

              <nav className="p-2.5">
                {categoryTiles.map(
                  ({
                    title,
                    href,
                    icon: Icon,
                  }) => (
                    <Link
                      key={title}
                      href={href}
                      className="group flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-bold text-neutral-700 transition hover:bg-neutral-50 hover:text-red-600"
                    >
                      <Icon
                        size={17}
                        strokeWidth={1.8}
                        className="shrink-0"
                      />

                      <span className="flex-1">
                        {title}
                      </span>

                      <ChevronRight
                        size={14}
                        className="text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-red-500"
                      />
                    </Link>
                  ),
                )}

                <Link
                  href="/produkte"
                  className="mt-2 flex items-center gap-3 rounded-xl bg-neutral-950 px-3 py-3.5 text-[13px] font-black text-white transition hover:bg-red-600"
                >
                  <Boxes size={17} />

                  <span className="flex-1">
                    Alle Produkte
                  </span>

                  <ArrowRight size={14} />
                </Link>
              </nav>
            </aside>

            <MarketingHero />
          </div>
        </div>
      </section>

      {/* ================= TRUST STRIP ================= */}

      <FeatureStrip
        catalogTotal={catalogTotal}
      />

      {/* ================= BANNERS ================= */}

      <section className="bg-[#f7f7f6]">
        <div className="mx-auto grid max-w-[1440px] gap-4 px-4 py-7 lg:grid-cols-2 xl:px-6 xl:py-8">
          <MarketingPromo
            href="/produkte?category=PC-Komponenten"
            image="/images/home/iumatec-pc-performance.png"
            alt="IUMATEC PC-Komponenten – Performance für deinen Build"
            buttonLabel="Jetzt shoppen"
          />

          <MarketingPromo
            href="/produkte?category=Smart%20Home"
            image="/images/home/iumatec-smart-home.png"
            alt="IUMATEC Smart Home – Smarte Technik für dein Zuhause"
            buttonLabel="Mehr entdecken"
          />
        </div>
      </section>

      {/* ================= CATEGORIES ================= */}

      <section className="mx-auto max-w-[1440px] px-4 py-11 xl:px-6">
        <SectionHeading
          eyebrow="Shop by Category"
          title="Alles für dein digitales Setup"
          subtitle="Schneller Einstieg in die wichtigsten Bereiche des IUMATEC Sortiments."
          href="/produkte"
          linkLabel="Alle Kategorien"
        />

        <HomeCategoryGrid />
      </section>

      {/* ================= DEALS ================= */}

      {offers.products.length > 0 ? (
        <section className="border-y border-neutral-200 bg-white">
          <div className="mx-auto max-w-[1440px] px-4 py-11 xl:px-6">
            <SectionHeading
              eyebrow="Deals"
              title="Aktuelle Preisvorteile"
              subtitle="Sofort verfügbare Technik mit attraktiven Preisen."
              href="/produkte?sort=price-asc"
              linkLabel="Alle Angebote"
            />

            <ProductRail
              products={offers.products}
            />
          </div>
        </section>
      ) : null}

      {/* ================= TOP AUSWAHL ================= */}

      {topSelection.length > 0 ? (
        <section className="mx-auto max-w-[1440px] px-4 py-11 xl:px-6">
          <SectionHeading
            eyebrow="Top Auswahl"
            title="Aktuell gefragt"
            subtitle="Eine kompakte Auswahl aus Computer, Mobile, Displays und Komponenten."
            href="/produkte"
          />

          <ProductRail
            products={topSelection}
          />
        </section>
      ) : null}

      {/* ================= LAPTOPS ================= */}

      {laptops.products.length > 0 ? (
        <section className="border-y border-neutral-200 bg-white">
          <div className="mx-auto max-w-[1440px] px-4 py-11 xl:px-6">
            <SectionHeading
              eyebrow="Computer"
              title="Laptops für Arbeit und Alltag"
              subtitle="Leistungsfähige Geräte für Business, Homeoffice und unterwegs."
              href="/produkte?category=Computer&subcategory=Laptops"
            />

            <ProductRail
              products={laptops.products}
            />
          </div>
        </section>
      ) : null}

      {/* ================= PC COMPONENTS ================= */}

      {gpus.products.length > 0 ? (
        <section className="mx-auto max-w-[1440px] px-4 py-11 xl:px-6">
          <SectionHeading
            eyebrow="PC-Komponenten"
            title="Mehr Leistung für deinen PC"
            subtitle="Komponenten, Zubehör und Performance-Upgrades für dein System."
            href="/produkte?category=PC-Komponenten"
          />

          <ProductRail
            products={gpus.products}
          />
        </section>
      ) : null}

      {/* ================= MONITORS ================= */}

      {monitors.products.length > 0 ? (
        <section className="border-y border-neutral-200 bg-white">
          <div className="mx-auto max-w-[1440px] px-4 py-11 xl:px-6">
            <SectionHeading
              eyebrow="Peripherie"
              title="Monitore für jedes Setup"
              subtitle="Displays für produktives Arbeiten, Content und Gaming."
              href="/produkte?category=Peripherie&subcategory=Monitore"
            />

            <ProductRail
              products={monitors.products}
            />
          </div>
        </section>
      ) : null}

      {/* ================= MOBILE ================= */}

      {smartphones.products.length > 0 ? (
        <section className="mx-auto max-w-[1440px] px-4 py-11 xl:px-6">
          <SectionHeading
            eyebrow="Mobile"
            title="Smartphones für jeden Alltag"
            subtitle="Aktuelle Geräte für Kommunikation, Arbeit, Foto und Entertainment."
            href="/produkte?category=Mobile&subcategory=Smartphones"
          />

          <ProductRail
            products={
              smartphones.products
            }
          />
        </section>
      ) : null}

      {/* ================= BOTTOM CTA ================= */}

      <section className="border-t border-neutral-200 bg-neutral-950 text-white">
        <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-10 md:grid-cols-[1fr_auto] md:items-center xl:px-6">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.17em] text-red-400">
              IUMATEC Schweiz
            </div>

            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Technik, die einfach passt.
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
              Computer, Mobile, Netzwerk,
              Smart Home und Business-Technik
              in einem klaren Schweizer
              Sortiment.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/produkte"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-neutral-950 transition hover:bg-red-600 hover:text-white"
            >
              Sortiment entdecken

              <ArrowRight size={15} />
            </Link>

            <Link
              href="/kontakt"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
            >
              <Headphones size={16} />

              Support
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
