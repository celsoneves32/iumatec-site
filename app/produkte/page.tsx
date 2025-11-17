import Image from "next/image";
import Link from "next/link";
import AddToCartButton from "@/components/AddToCartButton";

export const metadata = {
  title: "Produkte | IUMATEC Schweiz",
  description:
    "Entdecke unsere Technik-Angebote zu unschlagbaren Preisen – schnelle Lieferung in der ganzen Schweiz.",
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

// 🔹 Mock data (pode ser igual ao do [id]/page.tsx)
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

export default function ProductsPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">
          Produkte
        </h1>
        <p className="text-gray-500">
          Technik zu unschlagbaren Preisen – schnelle Lieferung in der ganzen Schweiz.
        </p>
      </header>

      <section
        aria-label="Produktübersicht"
        className="grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      >
        {PRODUCTS.map((product) => (
          <article
            key={product.id}
            className="group rounded-2xl border dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden hover:shadow-md transition flex flex-col"
          >
            <Link
              href={`/produkte/${product.id}`}
              className="relative aspect-square bg-white dark:bg-neutral-900 block"
            >
              <Image
                src={product.image}
                alt={product.title}
                fill
                className="object-contain p-4"
              />
              {product.badge && (
                <span className="absolute left-3 top-3 text-xs font-semibold bg-black/80 text-white rounded-md px-2 py-1">
                  {product.badge}
                </span>
              )}
              {hasFreeShipping(product.price) && (
                <span className="absolute right-3 top-3 text-[10px] font-semibold bg-green-600 text-white rounded-md px-2 py-1">
                  Gratis Versand
                </span>
              )}
            </Link>

            <div className="p-3 flex flex-col gap-2 flex-1">
              <Link href={`/produkte/${product.id}`}>
                <h2 className="text-sm font-medium line-clamp-2 min-h-[2.75rem]">
                  {product.title}
                </h2>
              </Link>

              <p className="text-xs text-gray-500 line-clamp-2 min-h-[2.25rem]">
                {product.description}
              </p>

              <div className="mt-1 flex items-center justify-between">
                <span className="text-base font-semibold">
                  CHF {product.price.toFixed(2)}
                </span>
                <Link
                  href={`/produkte/${product.id}`}
                  className="text-xs text-gray-500 group-hover:text-brand-red transition"
                >
                  Details →
                </Link>
              </div>

              {/* 👉 Botão com evento GA4 usando o novo AddToCartButton */}
              <div className="mt-2">
                <AddToCartButton
                  id={product.id}
                  title={product.title}
                  price={product.price}
                />
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
