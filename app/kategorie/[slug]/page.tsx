// app/kategorie/[slug]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCartButton from "@/components/AddToCartButton";

type Product = {
  id: string;
  title: string;
  price: number;
  image: string;
  badge?: "Bestseller" | "Aktion" | "Neu";
};

type CategoryConfig = {
  title: string;
  description: string;
  approxCount: number;
};

// Configuração das categorias (texto + contagem aproximada)
const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  smartphones: {
    title: "Smartphones & Handys",
    description:
      "Entdecke unsere Auswahl an aktuellen Smartphones – von Apple iPhone über Samsung Galaxy bis hin zu preiswerten Modellen von Xiaomi und mehr.",
    approxCount: 4,
  },
  "tv-audio": {
    title: "TV & Audio",
    description:
      "Fernseher, Soundbars und Heimkino-Systeme für dein Wohnzimmer – gestochen scharfes Bild und satter Sound.",
    approxCount: 3,
  },
  "computer-tablets": {
    title: "Computer & Tablets",
    description:
      "Notebooks, PCs und Tablets für Arbeit, Studium und Freizeit – leistungsstark und zuverlässig.",
    approxCount: 3,
  },
  "gaming-vr": {
    title: "Gaming & VR",
    description:
      "Konsolen, Gaming-Zubehör und VR-Headsets für dein ultimatives Spielerlebnis.",
    approxCount: 2,
  },
};

// Mock de produtos por categoria (podes ligar depois ao Shopify/DB)
const CATEGORY_PRODUCTS: Record<string, Product[]> = {
  smartphones: [
    {
      id: "iphone-15-128",
      title: "Apple iPhone 15 128GB",
      price: 799,
      image: "/products/iphone15.png",
      badge: "Bestseller",
    },
    {
      id: "s24-128",
      title: "Samsung Galaxy S24 128GB",
      price: 749,
      image: "/products/galaxy-s24.png",
      badge: "Neu",
    },
    {
      id: "xiaomi-13-lite",
      title: "Xiaomi 13 Lite 256GB",
      price: 499,
      image: "/products/xiaomi-13-lite.png",
      badge: "Aktion",
    },
    {
      id: "iphone-15-pro-256",
      title: "Apple iPhone 15 Pro 256GB",
      price: 1199,
      image: "/products/iphone15-pro.png",
    },
  ],
  "tv-audio": [
    {
      id: "lg-oled-55",
      title: "LG 55\" OLED 4K Smart TV",
      price: 999,
      image: "/products/lg-oled-55.png",
      badge: "Bestseller",
    },
    {
      id: "samsung-qled-65",
      title: "Samsung 65\" QLED 4K Smart TV",
      price: 1299,
      image: "/products/samsung-qled-65.png",
      badge: "Aktion",
    },
    {
      id: "sony-soundbar-21",
      title: "Sony 2.1 Soundbar mit Subwoofer",
      price: 299,
      image: "/products/sony-soundbar-21.png",
    },
  ],
  "computer-tablets": [
    {
      id: "macbook-air-m2",
      title: "Apple MacBook Air 13\" M2",
      price: 1299,
      image: "/products/macbook-air-m2.png",
      badge: "Bestseller",
    },
    {
      id: "dell-xps-13",
      title: "Dell XPS 13",
      price: 1399,
      image: "/products/dell-xps-13.png",
    },
    {
      id: "ipad-10gen",
      title: "Apple iPad 10. Generation",
      price: 449,
      image: "/products/ipad-10gen.png",
      badge: "Neu",
    },
  ],
  "gaming-vr": [
    {
      id: "ps5-standard",
      title: "Sony PlayStation 5",
      price: 549,
      image: "/products/ps5-standard.png",
      badge: "Bestseller",
    },
    {
      id: "meta-quest-3",
      title: "Meta Quest 3 VR-Headset",
      price: 579,
      image: "/products/meta-quest-3.png",
      badge: "Neu",
    },
  ],
};

type CategoryPageProps = {
  params: {
    slug: string;
  };
};

export default function CategoryPage({ params }: CategoryPageProps) {
  const slug = params.slug;
  const config = CATEGORY_CONFIG[slug];
  const products = CATEGORY_PRODUCTS[slug];

  if (!config || !products) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Titel + Beschreibung */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">
          {config.title}
        </h1>
        <p className="text-sm text-neutral-600 max-w-2xl">
          {config.description}
        </p>
      </div>

      {/* Filter/Sortier-Leiste (optisch) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 text-xs">
        <div className="inline-flex items-center gap-2">
          <span className="text-neutral-600">Sortieren nach:</span>
          <select className="rounded-md border border-neutral-300 bg-white px-2 py-1">
            <option>Beliebtheit</option>
            <option>Preis aufsteigend</option>
            <option>Preis absteigend</option>
            <option>Neuheiten</option>
          </select>
        </div>
        <div className="inline-flex items-center gap-3 text-neutral-500">
          <span>ca. {config.approxCount} Artikel</span>
        </div>
      </div>

      {/* Grid de produtos */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <article
            key={product.id}
            className="group bg-white border border-neutral-200 rounded-2xl p-3 flex flex-col hover:shadow-sm transition-shadow"
          >
            <Link
              href={`/produkte/${product.id}`}
              className="flex-1 flex flex-col"
            >
              <div className="relative w-full aspect-[4/5] mb-3">
                <Image
                  src={product.image}
                  alt={product.title}
                  fill
                  className="object-contain p-2"
                />
                {product.badge && (
                  <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    {product.badge}
                  </span>
                )}
              </div>

              <h2 className="text-xs font-medium text-neutral-900 mb-1 line-clamp-2">
                {product.title}
              </h2>

              <div className="mt-auto">
                <div className="text-lg font-semibold text-neutral-900">
                  {product.price.toFixed(2)} CHF
                </div>
                <p className="text-[11px] text-neutral-500">
                  inkl. MwSt., zzgl. Versand
                </p>
              </div>
            </Link>

            <div className="mt-3">
              <AddToCartButton
                id={product.id}
                title={product.title}
                price={product.price}
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
