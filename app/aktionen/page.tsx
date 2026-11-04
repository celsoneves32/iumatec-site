import type { Metadata } from "next";
import Link from "next/link";
import BlackNovemberProducts from "@/components/BlackNovemberProducts";

export const metadata: Metadata = {
  title: "Black November 2026 | IUMATEC Schweiz",
  description:
    "Entdecke Gaming, Laptops, Monitore und weitere Technik bei IUMATEC Schweiz.",
};

const BLACK_NOVEMBER_IMAGES: Record<string, string> = {
  GAMING: "/images/campaigns/iumatec-bn-gaming.webp",
  LAPTOPS: "/images/campaigns/iumatec-bn-laptops.webp",
  MONITORE: "/images/campaigns/iumatec-bn-monitore.webp",
  MOBILE: "/images/campaigns/iumatec-bn-smartphones.webp",
};
const categories = [
  {
    title: "Gaming & Grafikkarten",
    description: "Performance fuer dein Gaming-Setup.",
    href: "/grafikkarten",
    label: "GAMING",
  },
  {
    title: "Laptops",
    description: "Notebooks fuer Arbeit, Studium und Freizeit.",
    href: "/laptops",
    label: "LAPTOPS",
  },
  {
    title: "Monitore",
    description: "Displays fuer Gaming, Office und Multimedia.",
    href: "/monitors",
    label: "MONITORE",
  },
  {
    title: "Smartphones",
    description: "Mobile Technik und aktuelle Smartphones.",
    href: "/smartphones",
    label: "MOBILE",
  },
];

export default function AktionenPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        <section className="relative overflow-hidden rounded-3xl border border-amber-400/25 bg-neutral-950 px-6 py-14 sm:px-12 sm:py-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/images/campaigns/iumatec-black-november-hero.webp')" }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-black/5"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl"
          />

          <div className="relative max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-300">
              IUMATEC SCHWEIZ
            </p>

            <h1 className="mt-6 text-5xl font-black uppercase leading-none tracking-tight sm:text-7xl">
              BLACK
              <span className="block text-amber-300">
                NOVEMBER
              </span>
            </h1>

            <p className="mt-5 text-lg font-semibold text-neutral-200">
              TECH DEALS 2026
            </p>

            <p className="mt-4 max-w-xl text-sm leading-7 text-neutral-400 sm:text-base">
              Starke Technik. Attraktive Auswahl.
              Entdecke Gaming, Laptops, Monitore,
              Smartphones und mehr.
            </p>

            <p className="mt-5 text-sm font-bold text-amber-200">
              02. - 30. November 2026
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="#produkte"
                className="rounded-xl bg-amber-300 px-6 py-3.5 text-sm font-black text-neutral-950 transition hover:bg-amber-200"
              >
                Technik entdecken
              </Link>

              <Link
                href="/produkte"
                className="rounded-xl border border-white/25 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Alle Produkte
              </Link>
            </div>
          </div>
        </section>

        <BlackNovemberProducts />

        <section id="kategorien" className="py-14">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
              IUMATEC SPECIALS
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">
              Entdecke unsere Technikwelten
            </h2>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.href}
                href={category.href}
                className="group block overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 transition duration-300 hover:-translate-y-1 hover:border-amber-300/60"
              >
                <div className="relative h-44 overflow-hidden bg-neutral-950">
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-cover transition-transform duration-500 group-hover:scale-105"
                    style={{
                      backgroundImage: `url(${BLACK_NOVEMBER_IMAGES[category.label]})`,
                      backgroundPosition: "70% center",
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-neutral-950/20" />
                  <span className="absolute left-4 top-4 rounded-full border border-amber-300/30 bg-black/70 px-3 py-1.5 text-[10px] font-black tracking-[0.15em] text-amber-200">
                    {category.label}
                  </span>
                </div>
                <div className="flex min-h-[180px] flex-col p-5">
                  <h3 className="text-xl font-black text-white">
                    {category.title}
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-6 text-neutral-400">
                    {category.description}
                  </p>
                  <span className="mt-5 inline-block text-sm font-bold text-amber-300">
                    Produkte ansehen &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

                <section className="relative overflow-hidden rounded-2xl border border-amber-300/20 bg-neutral-950 p-7 sm:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/images/campaigns/iumatec-bn-black-friday.webp')" }}
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/95 via-black/75 to-black/20" />
          <div className="relative z-10 max-w-2xl">

          <p className="text-xs font-black uppercase tracking-widest text-amber-300">
            BLACK FRIDAY
          </p>

          <h2 className="mt-3 text-3xl font-black">
            27. November 2026
          </h2>

          <p className="mt-4 max-w-2xl text-neutral-300">
            Der Black Friday ist das Highlight
            unseres Black November.
            Entdecke unser Techniksortiment.
          </p>

          <Link
            href="/produkte"
            className="mt-6 inline-flex rounded-xl border border-amber-300 px-5 py-3 text-sm font-bold text-amber-300 transition hover:bg-amber-300 hover:text-neutral-950"
          >
            Sortiment entdecken
          </Link>
          </div>
        </section>

        <p className="mt-8 text-xs leading-6 text-neutral-500">
          Hinweis: Die gezeigten Kategorien stellen
          noch keine bestaetigten Preisreduktionen dar.
          Massgebend sind die Preise und die
          Verfuegbarkeit beim jeweiligen Produkt.
        </p>
      </div>
    </main>
  );
}
