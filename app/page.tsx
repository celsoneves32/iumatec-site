import Image from "next/image";
import Link from "next/link";
import PromoBanner from "@/components/PromoBanner"; // ✅ caminho absoluto correto

export const metadata = {
  title: "IUMATEC – Technik zu unschlagbaren Preisen",
  description:
    "Smartphones, TV & Audio, Informatik, Gaming – schnelle Lieferung in der ganzen Schweiz.",
};

type Card = { href: string; title: string; subtitle: string; emoji: string };

const CATEGORIES: Card[] = [
  { href: "/produkte?cat=Smartphones", title: "Smartphones", subtitle: "Apple • Samsung u.v.m.", emoji: "📱" },
  { href: "/produkte?cat=TV & Audio", title: "TV & Audio", subtitle: "OLED • Sound • Kino", emoji: "📺" },
  { href: "/produkte?cat=Informatik", title: "Informatik", subtitle: "Laptops • Zubehör", emoji: "💻" },
  { href: "/produkte?cat=Gaming", title: "Gaming", subtitle: "Konsolen • Zubehör", emoji: "🎮" },
];

const BESTSELLER = [
  { id: "p1", title: "iPhone 15 128GB", price: 799, image: "/products/iphone15.png", href: "/produkte/p1", badge: "Bestseller" },
  { id: "p3", title: "LG OLED C3 55” 4K", price: 1199, image: "/products/lg-oled-c3.png", href: "/produkte/p3", badge: "Aktion" },
  { id: "p5", title: "MacBook Air M2 13”", price: 1099, image: "/products/macbook-air-m2.png", href: "/produkte/p5" },
  { id: "p7", title: "PlayStation 5 Slim", price: 499, image: "/products/ps5-slim.png", href: "/produkte/p7" },
];

export default function Home() {
  return (
    <main className="max-w-7xl mx-auto px-4 pb-12">
      {/* PROMO BANNER */}
      <PromoBanner
        title="Black Friday: bis zu 30% Rabatt auf ausgewählte Produkte"
        subtitle="Nur bis Sonntag – solange Vorrat reicht."
        href="/produkte?sort=relevanz"
        ctaLabel="Deals ansehen"
        variant="red"
        startAt="2025-11-01T00:00:00Z"
        endAt="2025-11-30T23:59:59Z"
        storageKey="promo-blackfriday-2025"
        icon="🛒"
      />

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl mt-6 bg-gradient-to-br from-red-600 via-red-500 to-brand-blue text-white">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(1000px_500px_at_10%_-10%,#fff,transparent)]" />
        <div className="relative grid md:grid-cols-2 gap-6 p-8 md:p-12">
          <div className="flex flex-col justify-center">
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">
              Technik zu unschlagbaren Preisen
            </h1>
            <p className="mt-3 md:mt-4 text-white/85 text-sm md:text-base">
              Smartphones, TV & Audio, Informatik, Gaming – schnelle Lieferung in der ganzen Schweiz.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/produkte?sort=relevanz"
                className="inline-flex items-center rounded-xl bg-white text-black px-4 py-2 font-semibold hover:opacity-90"
              >
                Angebote ansehen
              </Link>
              <Link
                href="/produkte?cat=Smartphones"
                className="inline-flex items-center rounded-xl bg-white/10 backdrop-blur px-4 py-2 font-semibold hover:bg-white/15"
              >
                Smartphones
              </Link>
            </div>
          </div>

          <div className="relative h-56 md:h-72 lg:h-80">
            <Image
              src="/products/iphone15.png"
              alt="Hero Produkt"
              fill
              className="object-contain drop-shadow-xl"
              priority
            />
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-semibold">Kategorien</h2>
          <Link href="/produkte" className="text-brand-red hover:underline font-medium">
            Alle Produkte →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CATEGORIES.map((c) => (
            <Link
              key={c.title}
              href={c.href}
              className="group rounded-2xl border dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 hover:shadow-md transition"
            >
              <div className="text-2xl">{c.emoji}</div>
              <div className="mt-2 font-semibold">{c.title}</div>
              <div className="text-sm text-gray-500">{c.subtitle}</div>
              <div className="mt-2 text-xs text-brand-red opacity-0 group-hover:opacity-100 transition">
                Jetzt entdecken →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* BESTSELLER */}
      <section className="mt-10">
        <h2 className="text-xl md:text-2xl font-semibold mb-4">Bestseller</h2>
        <div className="grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {BESTSELLER.map((p) => (
            <Link
              key={p.id}
              href={p.href}
              className="group rounded-2xl border dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden hover:shadow-md transition"
            >
              <div className="relative aspect-square bg-white dark:bg-neutral-900">
                <Image src={p.image} alt={p.title} fill className="object-contain p-4" />
                {p.badge && (
                  <span className="absolute left-3 top-3 text-xs font-semibold bg-black/80 text-white rounded-md px-2 py-1">
                    {p.badge}
                  </span>
                )}
              </div>
              <div className="p-3">
                <h3 className="text-sm font-medium line-clamp-2 min-h-[2.75rem]">{p.title}</h3>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-base font-semibold">CHF {p.price.toFixed(2)}</span>
                  <span className="text-xs text-gray-500 group-hover:text-brand-red transition">Details →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* USP BAR */}
      <section className="mt-12 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 text-sm">
          🚚 Schnelle Lieferung in der ganzen Schweiz
        </div>
        <div className="rounded-xl border dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 text-sm">
          🔒 Sicheres Bezahlen: Kreditkarte, TWINT, PostFinance
        </div>
        <div className="rounded-xl border dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 text-sm">
          🇨🇭 Schweizer Support – Antwort innert 24h
        </div>
      </section>
    </main>
  );
}
