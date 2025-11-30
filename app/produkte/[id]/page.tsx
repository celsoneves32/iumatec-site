// app/produkte/page.tsx
import Image from "next/image";
import Link from "next/link";
import AddToCartButton from "@/components/AddToCartButton";

export const metadata = {
  title: "Produkte | IUMATEC Schweiz",
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

// 🔹 Mock-Produkte mit IMAGENS TEMPORÁRIAS (via.placeholder.com)
const PRODUCTS: Product[] = [
  {
    id: "p1",
    title: 'Samsung 65" 4K QLED',
    price: 899,
    image: "https://via.placeholder.com/600x400?text=65%22+4K+TV",
    description:
      "Brillantes 4K-QLED-Display – perfekt für Filme, Sport und Gaming.",
    category: "TV & Audio",
    badge: "Bestseller",
  },
  {
    id: "p2",
    title: "iPhone 15 128GB",
    price: 799,
    image: "https://via.placeholder.com/600x400?text=iPhone+15",
    description:
      "Das neue iPhone 15 mit starkem Chip und 48 MP Kamera.",
    category: "Smartphones",
    badge: "Neu",
  },
  {
    id: "p3",
    title: "Gaming Laptop RTX 4060",
    price: 1299,
    image: "https://via.placeholder.com/600x400?text=Gaming+Laptop",
    description:
      "Leistungsstarker Laptop für Gaming und Arbeit mit RTX 4060.",
    category: "Informatik",
    badge: "Aktion",
  },
  {
    id: "p4",
    title: "PlayStation 5 Bundle",
    price: 599,
    image: "https://via.placeholder.com/600x400?text=PlayStation+5",
    description:
      "Konsole der neuen Generation – inkl. Controller und Spiel.",
    category: "Gaming",
  },
  {
    id: "p5",
    title: "Bluetooth Soundbar",
    price: 199,
    image: "https://via.placeholder.com/600x400?text=Soundbar",
    description:
      "Kompakte Soundbar für besseren TV-Sound und Musik.",
    category: "TV & Audio",
  },
  {
    id: "p6",
    title: "Office Laptop 15\"",
    price: 649,
    image: "https://via.placeholder.com/600x400?text=Office+Laptop",
    description:
      "Zuverlässiger Laptop für Office, E-Mails und Homeoffice.",
    category: "Informatik",
  },
];

export default function ProductsPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Produkte
          </h1>
          <p className="text-sm text-neutral-600">
            Technik zu unschlagbaren Preisen – sofort lieferbar in der
            ganzen Schweiz.
          </p>
        </div>
      </header>

      {/* Grid de produtos */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PRODUCTS.map((product) => (
          <article
            key={product.id}
            className="group rounded-2xl border border-neutral-200 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col"
          >
            <Link
              href={`/produkte/${product.id}`}
              className="block relative w-full aspect-[4/3] overflow-hidden rounded-t-2xl"
            >
              <Image
                src={product.image}
                alt={product.title}
                width={600}
                height={400}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                priority={false}
              />
              {product.badge && (
                <span className="absolute left-3 top-3 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white shadow">
                  {product.badge}
                </span>
              )}
            </Link>

            <div className="flex flex-1 flex-col p-4 gap-2">
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                  {product.category}
                </p>
                <Link
                  href={`/produkte/${product.id}`}
                  className="line-clamp-2 text-sm font-semibold text-neutral-900 group-hover:text-red-600"
                >
                  {product.title}
                </Link>
                <p className="mt-1 line-clamp-2 text-xs text-neutral-600">
                  {product.description}
                </p>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <p className="text-base font-semibold text-neutral-900">
                  CHF {product.price.toFixed(2)}
                </p>
              </div>

              <div className="mt-3">
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
