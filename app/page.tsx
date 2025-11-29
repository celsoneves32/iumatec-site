// app/page.tsx
import Link from "next/link";
import Image from "next/image";
import PaymentMethodsBar from "@/components/PaymentMethodsBar";

export const metadata = {
  title: "IUMATEC – Technik zu unschlagbaren Preisen",
  description:
    "Smartphones, TV & Audio, Informatik, Gaming – schnelle Lieferung in der ganzen Schweiz.",
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950">
      {/* Hero */}
      <section className="border-b border-neutral-200/80 dark:border-neutral-800 bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 lg:flex-row lg:items-center lg:py-14">
          {/* Texto */}
          <div className="flex-1 space-y-5">
            <span className="inline-flex items-center rounded-full border border-red-600/20 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 dark:bg-red-900/20 dark:text-red-200">
              🔥 Technik-Deals für die ganze Schweiz
            </span>

            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl lg:text-5xl">
              IUMATEC – Technik zu{" "}
              <span className="text-red-600">unschlagbaren Preisen</span>
            </h1>

            <p className="max-w-xl text-sm sm:text-base text-neutral-600 dark:text-neutral-300">
              Smartphones, Laptops, TV &amp; Audio, Gaming und mehr – direkt aus
              der Schweiz mit schneller Lieferung und persönlichem Support.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/produkte"
                className="inline-flex items-center justify-center rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Jetzt Angebote entdecken
              </Link>
              <Link
                href="/kontakt"
                className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
              >
                Kontakt &amp; Beratung
              </Link>
            </div>

            {/* Pequenas “trust badges” */}
            <div className="flex flex-wrap gap-4 text-xs text-neutral-500 dark:text-neutral-400">
              <div className="flex items-center gap-2">
                <span>🚚</span>
                <span>Schnelle Lieferung in der ganzen Schweiz</span>
              </div>
              <div className="flex items-center gap-2">
                <span>✅</span>
                <span>Geprüfte Markenprodukte</span>
              </div>
              <div className="flex items-center gap-2">
                <span>📍</span>
                <span>Schweizer Online-Shop</span>
              </div>
            </div>
          </div>

          {/* Imagem / banner */}
          <div className="flex-1">
            <div className="relative mx-auto max-w-md overflow-hidden rounded-2xl border border-neutral-200/80 bg-black shadow-xl dark:border-neutral-700">
              <Image
                src="/hero-tech.jpg"
                alt="Elektronik-Produkte bei IUMATEC"
                width={800}
                height={600}
                className="h-full w-full object-cover opacity-90"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 space-y-1 text-xs sm:text-sm text-white">
                <p className="font-semibold">
                  Top-Deals: Smartphones, TV, Laptops &amp; Gaming
                </p>
                <p className="text-white/80">
                  Täglich neue Angebote – solange Vorrat reicht.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Barra de métodos de pagamento */}
      <div className="mx-auto max-w-7xl px-4">
        <PaymentMethodsBar />
      </div>

      {/* Categorias principais */}
      <section className="mx-auto mt-10 max-w-7xl px-4 pb-14">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            Beliebte Kategorien
          </h2>
          <Link
            href="/produkte"
            className="text-xs font-medium text-red-600 hover:text-red-700"
          >
            Alle Produkte ansehen →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={cat.href}
              className="group flex flex-col justify-between rounded-xl border border-neutral-200/80 bg-white p-4 text-sm shadow-sm transition hover:-translate-y-0.5 hover:border-red-500/60 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="font-semibold text-neutral-900 dark:text-neutral-50">
                  {cat.title}
                </div>
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600 group-hover:bg-red-600 group-hover:text-white dark:bg-red-900/30">
                  {cat.badge}
                </span>
              </div>
              <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
                {cat.description}
              </p>
              <span className="mt-auto text-xs font-medium text-red-600 group-hover:text-red-700">
                Jetzt ansehen →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

const CATEGORIES = [
  {
    slug: "smartphones",
    title: "Smartphones & Tablets",
    href: "/produkte?kat=smartphones",
    badge: "Top Seller",
    description: "Apple, Samsung, Xiaomi und mehr – neu & refurbished.",
  },
  {
    slug: "tv-audio",
    title: "TV & Audio",
    href: "/produkte?kat=tv-audio",
    badge: "Heimkino",
    description: "4K-TVs, Soundbars, Kopfhörer für dein Zuhause.",
  },
  {
    slug: "informatik",
    title: "Informatik",
    href: "/produkte?kat=informatik",
    badge: "Office & Home",
    description: "Laptops, PCs, Monitore und Zubehör für Alltag & Büro.",
  },
  {
    slug: "gaming",
    title: "Gaming",
    href: "/produkte?kat=gaming",
    badge: "Hot",
    description: "Konsolen, Games und Zubehör für dein Setup.",
  },
];
