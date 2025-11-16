import Image from "next/image";
import Link from "next/link";
import AddToCartButton from "@/components/AddToCartButton";

export const metadata = {
  title: "Produktdetails | IUMATEC Schweiz",
  description:
    "Technik-Angebote zu unschlagbaren Preisen – schnelle Lieferung in der ganzen Schweiz.",
};

type Product = {
  id: string;
  title: string;
  price: number;
  image: string;
  description: string;
  category: string;
  badge?: "Bestseller" | "Aktion" | "Neu";
};

// 🔹 Mock data (depois substituir por Shopify fetch)
const PRODUCTS: Product[] = [
  {
    id: "p1",
    title: "iPhone 15 128GB",
    price: 799,
    image: "/products/iphone15.png",
    description:
      "Das neue iPhone 15 mit A16 Bionic Chip, Dynamic Island und 48 MP Kamera.",
    category: "Smartphones",
    badge: "Bestseller",
  },
  {
    id: "p2",
    title: "Samsung Galaxy S24",
    price: 749,
    image: "/products/galaxy-s24.png",
    description:
      "Leistungsstarkes Galaxy S24 mit KI-Features und Dynamic AMOLED Display.",
    category: "Smartphones",
    badge: "Neu",
  },
  {
    id: "p3",
    title: "LG OLED C3 55” 4K",
    price: 1199,
    image: "/products/lg-oled-c3.png",
    description:
      "Brillante Farben und perfektes Schwarz – OLED evo Technologie von LG.",
    category: "TV & Audio",
    badge: "Aktion",
  },
  {
    id: "p4",
    title: "Sony WH-1000XM5",
    price: 329,
    image: "/products/sony-xm5.png",
    description:
      "Premium Noise Cancelling Kopfhörer mit bis zu 30 h Laufzeit.",
    category: "TV & Audio",
  },
  {
    id: "p5",
    title: "MacBook Air M2 13”",
    price: 1099,
    image: "/products/macbook-air-m2.png",
    description:
      "Ultraleichtes Design, M2 Chip und 18 h Batterielaufzeit.",
    category: "Informatik",
  },
  {
    id: "p7",
    title: "PlayStation 5 Slim",
    price: 499,
    image: "/products/ps5-slim.png",
    description:
      "Die neue, kompakte PS5 Slim mit 1 TB Speicher und 4K-Gaming-Power.",
    category: "Gaming",
  },
  {
    id: "p8",
    title: "Nintendo Switch OLED",
    price: 339,
    image: "/products/switch-oled.png",
    description:
      "Brillantes OLED-Display, verbessertes Audio und vielseitiges Gaming-Erlebnis.",
    category: "Gaming",
  },
];

const hasFreeShipping = (price: number) => price >= 49;

export default function ProductDetail({ params }: { params: { id: string } }) {
  const product = PRODUCTS.find((p) => p.id === params.id);

  if (!product) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-semibold mb-2">
          Produkt nicht gefunden
        </h1>
        <Link href="/produkte" className="text-brand-red hover:underline">
          Zurück zur Übersicht →
        </Link>
      </main>
    );
  }

  // ähnliche Produkte derselben Kategorie (max 4)
  const similar = PRODUCTS.filter(
    (p) => p.category === product.category && p.id !== product.id
  ).slice(0, 4);

  return (
    <main className="max-w-7xl mx-auto px-4 py-10">
      <div className="grid md:grid-cols-2 gap-10">
        {/* Bild */}
        <div className="relative aspect-square rounded-2xl border dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
          <Image
            src={product.image}
            alt={product.title}
            fill
            className="object-contain p-6"
            priority
          />
          {product.badge && (
            <span className="absolute left-4 top-4 text-xs font-semibold bg-black/80 text-white rounded-md px-2 py-1">
              {product.badge}
            </span>
          )}
          {hasFreeShipping(product.price) && (
            <span className="absolute right-4 top-4 text-[10px] font-semibold bg-green-600 text-white rounded-md px-2 py-1">
              Gratis Versand
            </span>
          )}
        </div>

        {/* Beschreibung */}
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-2">
            {product.title}
          </h1>
          <p className="text-gray-500 mb-6">{product.description}</p>

          <div className="flex items-baseline gap-4 mb-4">
            <span className="text-3xl font-bold">
              CHF {product.price.toFixed(2)}
            </span>
            {product.badge && (
              <span className="bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded-md">
                {product.badge}
              </span>
            )}
          </div>

          {hasFreeShipping(product.price) && (
            <div className="text-green-700 dark:text-green-400 text-sm mb-4">
              ✅ Gratis Versand ab CHF 49.– in der ganzen Schweiz
            </div>
          )}

          {/* Botão com evento GA4 add_to_cart */}
          <AddToCartButton
            id={product.id}
            title={product.title}
            price={product.price}
          />

          <p className="text-xs text-gray-500 mt-3">
            Lieferzeit: 1–3 Werktage • Rückgabe innerhalb 14 Tage
          </p>
        </div>
      </div>

      {/* ÄHNLICHE PRODUKTE */}
      {similar.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl md:text-2xl font-semibold mb-4">
            Ähnliche Produkte
          </h2>
          <div className="grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {similar.map((p) => (
              <Link
                key={p.id}
                href={`/produkte/${p.id}`}
                className="group rounded-2xl border dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden hover:shadow-md transition"
              >
                <div className="relative aspect-square bg-white dark:bg-neutral-900">
                  <Image
                    src={p.image}
                    alt={p.title}
                    fill
                    className="object-contain p-4"
                  />
                  {p.badge && (
                    <span className="absolute left-3 top-3 text-xs font-semibold bg-black/80 text-white rounded-md px-2 py-1">
                      {p.badge}
                    </span>
                  )}
                  {hasFreeShipping(p.price) && (
                    <span className="absolute right-3 top-3 text-[10px] font-semibold bg-green-600 text-white rounded-md px-2 py-1">
                      Gratis Versand
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium line-clamp-2 min-h-[2.75rem]">
                    {p.title}
                  </h3>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-base font-semibold">
                      CHF {p.price.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-500 group-hover:text-brand-red transition">
                      Details →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
