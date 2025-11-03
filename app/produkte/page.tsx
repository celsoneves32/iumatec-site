import Image from "next/image";

export const metadata = {
  title: "Produkte | IUMATEC Schweiz",
  description:
    "Entdecke unsere Technik-Angebote: Smartphones, TV & Audio, Informatik, Gaming – schnelle Lieferung in der ganzen Schweiz.",
};

type Product = {
  id: string;
  title: string;
  price: number; // CHF
  image: string;
  category: "Smartphones" | "TV & Audio" | "Informatik" | "Gaming";
  badge?: "Neu" | "Aktion" | "Bestseller";
};

// 🔹 MOCK: substitui por dados reais quando ligares ao Shopify
const ALL_PRODUCTS: Product[] = [
  { id: "p1", title: "iPhone 15 128GB", price: 799, image: "/products/iphone15.png", category: "Smartphones", badge: "Bestseller" },
  { id: "p2", title: "Samsung Galaxy S24", price: 749, image: "/products/galaxy-s24.png", category: "Smartphones", badge: "Neu" },
  { id: "p3", title: "LG OLED C3 55” 4K", price: 1199, image: "/products/lg-oled-c3.png", category: "TV & Audio", badge: "Aktion" },
  { id: "p4", title: "Sony WH-1000XM5", price: 329, image: "/products/sony-xm5.png", category: "TV & Audio" },
  { id: "p5", title: "MacBook Air M2 13”", price: 1099, image: "/products/macbook-air-m2.png", category: "Informatik" },
  { id: "p6", title: "Logitech MX Master 3S", price: 89, image: "/products/mx-master-3s.png", category: "Informatik" },
  { id: "p7", title: "PlayStation 5 Slim", price: 499, image: "/products/ps5-slim.png", category: "Gaming" },
  { id: "p8", title: "Nintendo Switch OLED", price: 339, image: "/products/switch-oled.png", category: "Gaming" },
];

// ✅ regra: Versand gratis a partir de CHF 49.–
const hasFreeShipping = (price: number) => price >= 49;

function applyQuery(
  products: Product[],
  opts: { q?: string; cat?: string; sort?: string }
) {
  let list = [...products];

  if (opts.cat && opts.cat !== "Alle") {
    list = list.filter((p) => p.category === opts.cat);
  }

  if (opts.q) {
    const s = opts.q.toLowerCase();
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(s) ||
        p.category.toLowerCase().includes(s)
    );
  }

  switch (opts.sort) {
    case "preis_auf":
      list.sort((a, b) => a.price - b.price);
      break;
    case "preis_ab":
      list.sort((a, b) => b.price - a.price);
      break;
    case "name":
      list.sort((a, b) => a.title.localeCompare(b.title));
      break;
    default:
      list.sort((a, b) => {
        const score = (p: Product) =>
          (p.badge === "Bestseller" ? 3 : 0) +
          (p.badge === "Neu" ? 2 : 0) +
          (p.badge === "Aktion" ? 1 : 0);
        return score(b) - score(a);
      });
  }

  return list;
}

export default function ProduktePage({
  searchParams,
}: {
  searchParams?: { q?: string; cat?: string; sort?: string };
}) {
  const q = searchParams?.q ?? "";
  const cat = (searchParams?.cat as Product["category"]) ?? "Alle";
  const sort = searchParams?.sort ?? "relevanz";

  const filtered = applyQuery(ALL_PRODUCTS, { q, cat, sort });

  const categories: Array<Product["category"] | "Alle"> = [
    "Alle",
    "Smartphones",
    "TV & Audio",
    "Informatik",
    "Gaming",
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      {/* Título + Contador */}
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold">Produkte</h1>
          <p className="text-gray-500">
            {filtered.length} Ergebnis{filtered.length !== 1 ? "se" : ""}{" "}
            {q ? <>für <span className="font-medium">“{q}”</span></> : null}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <form className="grid md:flex gap-3 md:items-center md:justify-between bg-gray-50 dark:bg-neutral-900 border dark:border-neutral-800 rounded-xl p-3 md:p-4 mb-6">
        <div className="flex gap-3">
          <select
            name="cat"
            defaultValue={cat}
            className="rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            name="sort"
            defaultValue={sort}
            className="rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
          >
            <option value="relevanz">Relevanz</option>
            <option value="preis_auf">Preis: aufsteigend</option>
            <option value="preis_ab">Preis: absteigend</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>

        <div className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Suchen (z. B. iPhone, OLED, PS5)…"
            className="w-full md:w-80 rounded-lg border dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="bg-brand-red text-white rounded-lg px-4 py-2 text-sm hover:bg-brand-blue transition"
          >
            Suchen
          </button>
        </div>
      </form>

      {/* Grid de Produtos */}
      <section className="grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filtered.map((p) => (
          <a
            key={p.id}
            href={`/produkte/${p.id}`}
            className="group rounded-2xl border dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden hover:shadow-md transition"
          >
            <div className="relative aspect-square bg-white dark:bg-neutral-900">
              <Image src={p.image} alt={p.title} fill className="object-contain p-4" />
              {/* Badge de produto (Bestseller / Neu / Aktion) */}
              {p.badge && (
                <span className="absolute left-3 top-3 text-xs font-semibold bg-black/80 text-white rounded-md px-2 py-1">
                  {p.badge}
                </span>
              )}
              {/* ✅ Badge de Versand gratis se preço ≥ 49 */}
              {hasFreeShipping(p.price) && (
                <span className="absolute right-3 top-3 text-[10px] font-semibold bg-green-600 text-white rounded-md px-2 py-1">
                  Gratis&nbsp;Versand
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
              {/* ✅ Texto auxiliar abaixo do preço (opcional) */}
              {hasFreeShipping(p.price) && (
                <div className="mt-1 text-[11px] text-green-700 dark:text-green-400">
                  Versand ab CHF 49.– kostenlos
                </div>
              )}
            </div>
          </a>
        ))}
      </section>

      {/* Nota de demonstração */}
      <p className="mt-8 text-xs text-gray-500">
        Hinweis: Dies ist eine Demo-Liste. Später wird sie automatisch aus Shopify geladen.
      </p>
    </main>
  );
}
