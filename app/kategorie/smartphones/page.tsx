// app/kategorie/smartphones/page.tsx
import Image from "next/image";
import Link from "next/link";
import AddToCartButton from "@/components/AddToCartButton";

export const metadata = {
  title: "Smartphones & Handys | IUMATEC Schweiz",
  description:
    "Entdecke aktuelle Smartphones zu unschlagbaren Preisen – iPhone, Samsung Galaxy, Xiaomi und mehr bei IUMATEC.",
};

type Product = {
  id: string;
  title: string;
  price: number;
  image: string;
  badge?: "Bestseller" | "Aktion" | "Neu";
};

const SMARTPHONES: Product[] = [
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
];

export default function SmartphonesCategoryPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Titel + Beschreibung */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">
          Smartphones & Handys
        </h1>
        <p className="text-sm text-neutral-600 max-w-2xl">
          Entdecke unsere Auswahl an aktuellen Smartphones – von Apple iPhone
          über Samsung Galaxy bis hin zu preiswerten Modellen von Xiaomi und
          mehr. Technik zu unschlagbaren Preisen, direkt aus der Schweiz.
        </p>
      </div>

      {/* Filter/Sortier-Leiste (nur Optik, später podemos ligar a lógica) */}
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
          <span>ca. {SMARTPHONES.length} Artikel</span>
        </div>
      </div>

      {/* Grid de produtos */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SMARTPHONES.map((product) => (
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
