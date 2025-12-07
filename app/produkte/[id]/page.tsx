// app/produkte/[id]/page.tsx
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import AddToCartButton from "@/components/AddToCartButton";
import FavoriteButton from "@/components/FavoriteButton";

type Product = {
  id: string;
  title: string;
  price: number;
  image: string;
  badge?: "Bestseller" | "Aktion" | "Neu";
  shortDescription: string;
  highlights: string[];
};

// 🔹 Mock-Produktdaten (depois podes trocar por Shopify/DB)
const PRODUCTS: Product[] = [
  {
    id: "iphone-15-128",
    title: "Apple iPhone 15 128GB",
    price: 799,
    image: "/products/iphone15.png",
    badge: "Bestseller",
    shortDescription:
      "Das iPhone 15 mit brillantem Super Retina XDR Display, A16 Bionic Chip und 48 MP Kamera.",
    highlights: [
      '6.1" Super Retina XDR Display',
      "A16 Bionic Chip",
      "48 MP Hauptkamera",
      "5G Unterstützung",
      "Dual-SIM (Nano-SIM + eSIM)",
    ],
  },
  {
    id: "s24-128",
    title: "Samsung Galaxy S24 128GB",
    price: 749,
    image: "/products/galaxy-s24.png",
    badge: "Neu",
    shortDescription:
      "Leistungsstarkes Android-Smartphone mit hellem AMOLED Display und vielseitiger Triple-Kamera.",
    highlights: [
      "Dynamic AMOLED 2X Display",
      "Triple-Kamera mit Nachtmodus",
      "Schneller Prozessor der neuesten Generation",
      "5G Unterstützung",
      "Schnellladen und Wireless Charging",
    ],
  },
  {
    id: "xiaomi-13-lite",
    title: "Xiaomi 13 Lite 256GB",
    price: 499,
    image: "/products/xiaomi-13-lite.png",
    badge: "Aktion",
    shortDescription:
      "Starkes Preis-Leistungs-Verhältnis mit grossem Speicher und langer Akkulaufzeit.",
    highlights: [
      '6.55" AMOLED Display',
      "256 GB interner Speicher",
      "Schnelles Laden",
      "Leichtes und schlankes Design",
      "Dual-SIM",
    ],
  },
  {
    id: "iphone-15-pro-256",
    title: "Apple iPhone 15 Pro 256GB",
    price: 1199,
    image: "/products/iphone15-pro.png",
    shortDescription:
      "Das Pro-Modell mit Titan-Gehäuse, ProMotion Display und professionellen Kamera-Features.",
    highlights: [
      '6.1" ProMotion Display (120 Hz)',
      "Titan-Gehäuse",
      "Telekamera mit 3x optischem Zoom",
      "USB-C Anschluss",
      "Pro-Level Video-Features",
    ],
  },
];

function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

type ProductPageProps = {
  params: {
    id: string;
  };
};

export default function ProductDetailPage({ params }: ProductPageProps) {
  const product = getProductById(params.id);

  if (!product) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-xs text-neutral-500">
        <Link href="/" className="hover:text-red-600">
          Startseite
        </Link>{" "}
        <span className="mx-1">/</span>
        <Link href="/kategorie/smartphones" className="hover:text-red-600">
          Smartphones & Handys
        </Link>{" "}
        <span className="mx-1">/</span>
        <span className="text-neutral-700">{product.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr),minmax(0,1fr)]">
        {/* Bild / Hero */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col items-center justify-center">
          <div className="relative w-full max-w-md aspect-[4/5]">
            <Image
              src={product.image}
              alt={product.title}
              fill
              className="object-contain p-4"
            />
            {product.badge && (
              <span className="absolute left-4 top-4 rounded-full bg-red-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                {product.badge}
              </span>
            )}
          </div>
        </div>

        {/* Infos / Preis / Kaufen */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">
              {product.title}
            </h1>
            <p className="text-sm text-neutral-600 mb-3">
              {product.shortDescription}
            </p>
          </div>

          {/* 🔹 Caixa de preço + comprar + favoritos (atualizada) */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <div className="text-2xl font-semibold text-neutral-900">
                {product.price.toFixed(2)} CHF
              </div>
            </div>
            <p className="text-xs text-neutral-500 mb-4">
              inkl. MwSt., zzgl. Versand. Lieferung nur innerhalb der Schweiz
              und Liechtenstein.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <AddToCartButton
                  id={product.id}
                  title={product.title}
                  price={product.price}
                />
              </div>
              <FavoriteButton
                id={product.id}
                title={product.title}
                price={product.price}
                image={product.image}
              />
            </div>

            <p className="mt-3 text-[11px] text-neutral-500 leading-snug">
              Die tatsächlichen Lieferzeiten können je nach Verfügbarkeit und
              Region leicht variieren. Alle Angaben ohne Gewähr.
            </p>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-neutral-800 mb-3">
              Produkt-Highlights
            </h2>
            <ul className="space-y-1.5 text-xs text-neutral-700">
              {product.highlights.map((h) => (
                <li key={h} className="flex gap-2">
                  <span className="mt-[3px] h-[5px] w-[5px] rounded-full bg-neutral-400" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
